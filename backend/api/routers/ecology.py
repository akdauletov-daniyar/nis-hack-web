"""Ecology router: mock ingestion hook for air-quality sensor events."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from core.config import BASE_DIR
from integration_service import AirQualityIntegrationService

router = APIRouter()

_air_quality_service: AirQualityIntegrationService | None = None


def _get_service() -> AirQualityIntegrationService:
    """Lazily initialize and reuse integration service across requests."""

    global _air_quality_service
    if _air_quality_service is None:
        model_path = Path(BASE_DIR) / "artifacts" / "air_quality_hybrid_model.joblib"
        if not model_path.exists():
            raise HTTPException(
                status_code=500,
                detail=(
                    "Air quality model artifact not found at "
                    f"{model_path}. Train and save the model first."
                ),
            )
        _air_quality_service = AirQualityIntegrationService(model_path=model_path)

    return _air_quality_service


@router.post("/sensor-ingest")
def ingest_sensor_event(payload: dict[str, Any]) -> dict[str, Any]:
    """Receive new ecological sensor data and return air-quality predictions.

    Expected payload mirrors the `air_quality.csv` schema fields:
    DATE_OCC, TIME_OCC, Lat, Lon, PT08.S1(CO), Temperature_C, RH%/RH_%,
    Wind_Speed, C6H6(GT), AQI.
    """

    service = _get_service()

    try:
        prediction = service.predict_current_air_quality(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "status": "ok",
        "message": "Ecological sensor event processed.",
        "prediction": prediction,
    }
