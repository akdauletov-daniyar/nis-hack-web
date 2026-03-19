"""Inference service wrapper for the AirQualityHybridModel.

This module is designed to be imported by FastAPI/Flask endpoints or
background consumers that receive new ecological sensor events.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Any

import pandas as pd

from air_quality_modelling import AirQualityHybridModel, aqi_to_category


class AirQualityIntegrationService:
    """Production-style inference service for real-time air-quality prediction."""

    def __init__(
        self,
        model_path: str | Path,
        *,
        history_size: int | None = None,
    ) -> None:
        """Load a pre-trained model artifact and initialize history buffering.

        Args:
            model_path: Path to serialized `AirQualityHybridModel` artifact.
            history_size: Optional history length override. Defaults to model
                window size.
        """

        self.model = AirQualityHybridModel.load_model(model_path)
        min_rows = self.model.config.window_size + self.model.config.horizon
        maxlen = history_size or min_rows
        self._history: deque[dict[str, Any]] = deque(maxlen=maxlen)

    def predict_current_air_quality(self, new_sensor_data: dict[str, Any]) -> dict[str, Any]:
        """Predict current/future air quality from a new incoming sensor sample.

        The method appends the incoming row to a rolling history buffer,
        performs model preprocessing/inference, and returns a JSON-serializable
        dictionary suitable for API responses.

        Args:
            new_sensor_data: Dictionary matching the air-quality input schema.

        Returns:
            Dictionary with predicted CO, C6H6 and AQI category.
        """

        self._history.append(dict(new_sensor_data))

        history_frame = pd.DataFrame(list(self._history))
        if history_frame.empty:
            raise RuntimeError("No sensor history available for prediction.")

        # Ensure we always have enough timesteps for sequence inference.
        min_rows = self.model.config.window_size + self.model.config.horizon
        if history_frame.shape[0] < min_rows:
            pad_count = min_rows - history_frame.shape[0]
            seed_row = history_frame.iloc[[0]].copy()
            padding = pd.concat([seed_row] * pad_count, ignore_index=True)
            history_frame = pd.concat([padding, history_frame], ignore_index=True)

        prediction_frame = self.model.predict(history_frame)
        latest = prediction_frame.iloc[-1]

        predicted_aqi = int(round(float(latest["predicted_aqi"])))

        return {
            "predicted_co_concentration": float(latest["predicted_co_concentration"]),
            "predicted_c6h6_concentration": float(latest["predicted_c6h6_concentration"]),
            "predicted_aqi": predicted_aqi,
            "predicted_aqi_category": aqi_to_category(predicted_aqi),
        }


def build_default_service() -> AirQualityIntegrationService:
    """Construct a service instance from the default artifact location."""

    default_artifact = Path("backend/artifacts/air_quality_hybrid_model.joblib")
    return AirQualityIntegrationService(model_path=default_artifact)


__all__ = [
    "AirQualityIntegrationService",
    "build_default_service",
]
