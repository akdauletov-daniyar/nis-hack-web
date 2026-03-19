"""Integration service for forecasting + anomaly detection in backend APIs."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping, Sequence

import joblib
import pandas as pd

from .anomaly_detection import AnomalyDetector
from .forecasting import LoadForecaster
from .preprocessing import DataProcessor

FORECAST_TARGET = "Global_active_power"
ANOMALY_LABEL = "Anomaly_Label"

# Forecast features intentionally exclude Global_active_power because it is the
# regression target. Timestamp is included and expanded into periodic signals.
DEFAULT_FORECAST_FEATURES: list[str] = [
    "Timestamp",
    "Household_ID",
    "Global_reactive_power",
    "Voltage",
    "Global_intensity",
    "Sub_metering_1",
    "Sub_metering_2",
    "Sub_metering_3",
    "Temperature_C",
    "Humidity",
    "Avg_Past_Consumption",
    "Occupancy",
    "HVAC_Usage_State",
    "Renewable_Energy_kWh",
]

# Anomaly detector uses all telemetry channels including active power itself.
DEFAULT_ANOMALY_FEATURES: list[str] = [
    "Timestamp",
    "Household_ID",
    "Global_active_power",
    "Global_reactive_power",
    "Voltage",
    "Global_intensity",
    "Sub_metering_1",
    "Sub_metering_2",
    "Sub_metering_3",
    "Temperature_C",
    "Humidity",
    "Avg_Past_Consumption",
    "Occupancy",
    "HVAC_Usage_State",
    "Renewable_Energy_kWh",
]

DEFAULT_CATEGORICAL_COLUMNS: list[str] = ["Household_ID"]


class SmartUtilityMLService:
    """High-level ML service for smart utility resource management.

    This wrapper is designed for backend integration (FastAPI/Flask workers):
    - Train both models from one dataset.
    - Serve real-time forecasts and anomaly flags from JSON payloads.
    - Save/load artifacts for deployment.
    """

    def __init__(
        self,
        *,
        forecast_features: Sequence[str] | None = None,
        anomaly_features: Sequence[str] | None = None,
        categorical_columns: Sequence[str] | None = None,
        scaler_type: str = "standard",
    ) -> None:
        """Initialize service and internal model components."""

        self.forecast_features = list(forecast_features or DEFAULT_FORECAST_FEATURES)
        self.anomaly_features = list(anomaly_features or DEFAULT_ANOMALY_FEATURES)
        self.categorical_columns = list(categorical_columns or DEFAULT_CATEGORICAL_COLUMNS)

        forecast_processor = DataProcessor(scaler_type=scaler_type)
        anomaly_processor = DataProcessor(scaler_type=scaler_type)

        self.forecaster = LoadForecaster(
            processor=forecast_processor,
            feature_columns=self.forecast_features,
            target_column=FORECAST_TARGET,
            categorical_columns=self.categorical_columns,
        )
        self.anomaly_detector = AnomalyDetector(
            processor=anomaly_processor,
            feature_columns=self.anomaly_features,
            label_column=ANOMALY_LABEL,
            categorical_columns=self.categorical_columns,
        )

    def train_from_dataframe(
        self,
        dataframe: pd.DataFrame,
        *,
        validation_split: float = 0.2,
        sequence_length: int = 1,
        horizon: int = 1,
        train_anomaly_on_normal_only: bool = True,
    ) -> dict[str, dict[str, float]]:
        """Train both forecasting and anomaly models from one dataframe.

        Returns:
            Nested metric dictionary keyed by task name.
        """

        forecast_metrics = self.forecaster.train(
            dataframe,
            validation_split=validation_split,
            sequence_length=sequence_length,
            horizon=horizon,
        )

        self.anomaly_detector.train(
            dataframe,
            train_on_normal_only=train_anomaly_on_normal_only,
        )

        anomaly_metrics: dict[str, float] = {}
        if ANOMALY_LABEL in dataframe.columns:
            anomaly_metrics = self.anomaly_detector.evaluate(dataframe)

        return {
            "forecasting": forecast_metrics,
            "anomaly_detection": anomaly_metrics,
        }

    def train_from_csv(
        self,
        csv_path: str | Path,
        *,
        validation_split: float = 0.2,
        sequence_length: int = 1,
        horizon: int = 1,
        train_anomaly_on_normal_only: bool = True,
    ) -> dict[str, dict[str, float]]:
        """Load CSV and train all ML components."""

        frame = pd.read_csv(Path(csv_path))
        return self.train_from_dataframe(
            frame,
            validation_split=validation_split,
            sequence_length=sequence_length,
            horizon=horizon,
            train_anomaly_on_normal_only=train_anomaly_on_normal_only,
        )

    def predict_batch(
        self,
        input_data: pd.DataFrame | Sequence[Mapping[str, Any]] | Mapping[str, Any],
    ) -> list[dict[str, float | int]]:
        """Run forecasting + anomaly inference for one or multiple records.

        Returns:
            List of dictionaries containing:
            - forecast_global_active_power (float)
            - anomaly_flag (int, 0 normal / 1 anomaly)
        """

        frame = self._to_dataframe(input_data)
        forecast_values = self.forecaster.predict(frame)
        anomaly_flags = self.anomaly_detector.predict(frame)

        if forecast_values.shape[0] != anomaly_flags.shape[0]:
            # Sequence forecasting can return fewer values than input rows.
            anomaly_flags = anomaly_flags[-forecast_values.shape[0] :]

        response: list[dict[str, float | int]] = []
        for index in range(forecast_values.shape[0]):
            response.append(
                {
                    "forecast_global_active_power": float(forecast_values[index]),
                    "anomaly_flag": int(anomaly_flags[index]),
                }
            )
        return response

    def predict_one(self, payload: Mapping[str, Any]) -> dict[str, float | int]:
        """Convenience wrapper for single-record API calls."""

        results = self.predict_batch(payload)
        if not results:
            raise RuntimeError("No prediction produced for the provided payload.")
        return results[-1]

    def save(self, artifact_path: str | Path) -> Path:
        """Persist full integration service (both models and processors)."""

        path = Path(artifact_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, path)
        return path

    @classmethod
    def load(cls, artifact_path: str | Path) -> "SmartUtilityMLService":
        """Load serialized service artifact for production inference."""

        artifact = joblib.load(Path(artifact_path))
        if not isinstance(artifact, cls):
            raise TypeError("Loaded artifact is not SmartUtilityMLService.")
        return artifact

    @staticmethod
    def _to_dataframe(
        input_data: pd.DataFrame | Sequence[Mapping[str, Any]] | Mapping[str, Any],
    ) -> pd.DataFrame:
        """Normalize API payloads into dataframe format."""

        if isinstance(input_data, pd.DataFrame):
            return input_data.copy()
        if isinstance(input_data, Mapping):
            return pd.DataFrame([dict(input_data)])
        return pd.DataFrame([dict(item) for item in input_data])


def realtime_integration_example() -> None:
    """Demonstrate service usage with a single real-time payload.

    This function can be copied directly into an API endpoint handler.
    """

    service = SmartUtilityMLService.load("backend/artifacts/smart_utility_service.joblib")

    incoming_row: dict[str, Any] = {
        "Timestamp": "2026-03-19 12:30:00",
        "Household_ID": "H_102",
        "Global_active_power": 2.18,
        "Global_reactive_power": 0.21,
        "Voltage": 238.6,
        "Global_intensity": 9.1,
        "Sub_metering_1": 0.0,
        "Sub_metering_2": 1.0,
        "Sub_metering_3": 17.0,
        "Temperature_C": 13.2,
        "Humidity": 62.5,
        "Avg_Past_Consumption": 1.97,
        "Occupancy": 3,
        "HVAC_Usage_State": 1,
        "Renewable_Energy_kWh": 0.36,
        "Anomaly_Label": 0,
    }

    prediction = service.predict_one(incoming_row)
    print(prediction)
