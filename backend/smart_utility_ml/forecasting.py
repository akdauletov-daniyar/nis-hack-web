"""Load forecasting model for smart utility demand prediction."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping, Sequence

import joblib
import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from .preprocessing import DataProcessor

try:
    from xgboost import XGBRegressor
except Exception:  # pragma: no cover - optional dependency fallback.
    XGBRegressor = None  # type: ignore[assignment]

FloatArray = NDArray[np.float64]


class LoadForecaster:
    """Forecasts `Global_active_power` from smart-meter and context signals.

    The default model is XGBoost when installed. If it is unavailable, the
    class falls back to `RandomForestRegressor` to keep backend services
    operational.
    """

    def __init__(
        self,
        *,
        processor: DataProcessor,
        feature_columns: Sequence[str],
        target_column: str = "Global_active_power",
        categorical_columns: Sequence[str] | None = None,
        random_state: int = 42,
        model_params: Mapping[str, Any] | None = None,
    ) -> None:
        """Initialize forecaster.

        Args:
            processor: Shared preprocessing component.
            feature_columns: Raw feature schema used for forecasting.
            target_column: Regression target column.
            categorical_columns: Optional explicit categorical features.
            random_state: Reproducibility seed.
            model_params: Optional model overrides.
        """

        self.processor = processor
        self.feature_columns = list(feature_columns)
        self.target_column = target_column
        self.categorical_columns = list(categorical_columns or [])
        self.random_state = random_state

        self.model = self._build_model(model_params or {})
        self.model_name = type(self.model).__name__

        self.is_trained_ = False
        self.sequence_length_ = 1
        self.horizon_ = 1

    def train(
        self,
        dataframe: pd.DataFrame,
        *,
        validation_split: float = 0.2,
        sequence_length: int = 1,
        horizon: int = 1,
    ) -> dict[str, float]:
        """Train forecasting model and return validation metrics.

        Args:
            dataframe: Input training frame.
            validation_split: Fraction reserved for holdout evaluation.
            sequence_length: Window size for sequence-aware training.
            horizon: Forecast lead in timesteps.

        Returns:
            Dictionary with MAE, RMSE, and R2 on holdout split.
        """

        if not 0.0 < validation_split < 1.0:
            raise ValueError("validation_split must be in (0, 1).")
        if sequence_length < 1:
            raise ValueError("sequence_length must be >= 1.")
        if horizon < 1:
            raise ValueError("horizon must be >= 1.")

        prepared = self.processor.prepare_frame(dataframe)
        if self.target_column not in prepared.columns:
            raise ValueError(f"Missing target column '{self.target_column}'.")

        prepared = prepared.dropna(subset=[self.target_column]).reset_index(drop=True)
        target = prepared[self.target_column].to_numpy(dtype=np.float64)

        feature_matrix = self.processor.fit_transform(
            prepared,
            self.feature_columns,
            categorical_columns=self.categorical_columns,
        )

        if sequence_length > 1 or horizon > 1:
            x_seq, y_seq = self.processor.generate_sequences_from_arrays(
                feature_matrix,
                target,
                window_size=sequence_length,
                horizon=horizon,
                stride=1,
            )
            features = x_seq.reshape(x_seq.shape[0], -1).astype(np.float64)
            labels = y_seq.astype(np.float64)
        else:
            features = feature_matrix
            labels = target

        x_train, x_valid, y_train, y_valid = self._chronological_split(
            features,
            labels,
            validation_split,
        )

        self.model.fit(x_train, y_train)

        self.is_trained_ = True
        self.sequence_length_ = sequence_length
        self.horizon_ = horizon

        predictions = self.model.predict(x_valid)
        return self._regression_metrics(y_valid, predictions)

    def evaluate(self, dataframe: pd.DataFrame) -> dict[str, float]:
        """Evaluate trained forecaster on new labeled data."""

        if not self.is_trained_:
            raise RuntimeError("Forecaster is not trained. Call train() first.")

        prepared = self.processor.prepare_frame(dataframe)
        if self.target_column not in prepared.columns:
            raise ValueError(f"Missing target column '{self.target_column}'.")

        prepared = prepared.dropna(subset=[self.target_column]).reset_index(drop=True)
        y_true = prepared[self.target_column].to_numpy(dtype=np.float64)
        predictions = self.predict(prepared)

        if predictions.shape[0] != y_true.shape[0]:
            y_true = y_true[-predictions.shape[0] :]

        return self._regression_metrics(y_true, predictions)

    def predict(
        self,
        input_data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]],
    ) -> FloatArray:
        """Predict future active power for one row or a batch.

        Args:
            input_data: Single payload mapping, list of mappings, or dataframe.

        Returns:
            Forecast array of `Global_active_power` values.
        """

        if not self.is_trained_:
            raise RuntimeError("Forecaster is not trained. Call train() first.")

        frame = self._to_dataframe(input_data)
        prepared = self.processor.prepare_frame(frame)
        feature_matrix = self.processor.transform(prepared)

        if self.sequence_length_ > 1 or self.horizon_ > 1:
            x_seq, _ = self.processor.generate_sequences_from_arrays(
                feature_matrix,
                np.zeros(feature_matrix.shape[0], dtype=np.float64),
                window_size=self.sequence_length_,
                horizon=self.horizon_,
                stride=1,
            )
            features = x_seq.reshape(x_seq.shape[0], -1).astype(np.float64)
            outputs = self.model.predict(features)
            return np.asarray(outputs, dtype=np.float64)

        outputs = self.model.predict(feature_matrix)
        return np.asarray(outputs, dtype=np.float64)

    def save(self, output_path: str | Path) -> Path:
        """Persist trained forecaster, including fitted preprocessor state."""

        if not self.is_trained_:
            raise RuntimeError("Forecaster is not trained. Train before saving.")

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        joblib.dump(self, path)
        return path

    @classmethod
    def load(cls, model_path: str | Path) -> "LoadForecaster":
        """Load a serialized forecaster artifact."""

        model = joblib.load(Path(model_path))
        if not isinstance(model, cls):
            raise TypeError("Loaded artifact is not a LoadForecaster instance.")
        return model

    def _build_model(self, model_params: Mapping[str, Any]) -> Any:
        """Construct XGBoost regressor or fallback baseline model."""

        if XGBRegressor is not None:
            defaults: dict[str, Any] = {
                "n_estimators": 500,
                "max_depth": 8,
                "learning_rate": 0.05,
                "subsample": 0.9,
                "colsample_bytree": 0.9,
                "objective": "reg:squarederror",
                "random_state": self.random_state,
                "n_jobs": -1,
            }
            defaults.update(model_params)
            return XGBRegressor(**defaults)

        fallback_defaults: dict[str, Any] = {
            "n_estimators": 300,
            "max_depth": 14,
            "random_state": self.random_state,
            "n_jobs": -1,
        }
        fallback_defaults.update(model_params)
        return RandomForestRegressor(**fallback_defaults)

    @staticmethod
    def _chronological_split(
        features: FloatArray,
        targets: FloatArray,
        validation_split: float,
    ) -> tuple[FloatArray, FloatArray, FloatArray, FloatArray]:
        """Split arrays in chronological order for time-series integrity."""

        split_index = int(features.shape[0] * (1.0 - validation_split))
        if split_index <= 0 or split_index >= features.shape[0]:
            raise ValueError("validation_split produces an empty train or validation partition.")

        x_train = features[:split_index]
        x_valid = features[split_index:]
        y_train = targets[:split_index]
        y_valid = targets[split_index:]
        return x_train, x_valid, y_train, y_valid

    @staticmethod
    def _regression_metrics(y_true: FloatArray, y_pred: FloatArray) -> dict[str, float]:
        """Compute common forecasting metrics."""

        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        mae = float(mean_absolute_error(y_true, y_pred))
        r2 = float(r2_score(y_true, y_pred))

        return {
            "mae": mae,
            "rmse": rmse,
            "r2": r2,
        }

    @staticmethod
    def _to_dataframe(
        input_data: pd.DataFrame | Mapping[str, Any] | Sequence[Mapping[str, Any]],
    ) -> pd.DataFrame:
        """Normalize prediction input into dataframe shape."""

        if isinstance(input_data, pd.DataFrame):
            return input_data.copy()
        if isinstance(input_data, Mapping):
            return pd.DataFrame([dict(input_data)])
        return pd.DataFrame([dict(item) for item in input_data])
