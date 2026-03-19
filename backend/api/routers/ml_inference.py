"""ML inference router: CSV/JSON upload endpoints for model predictions."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any, List, Optional

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from core.config import BASE_DIR

router = APIRouter()

# ---------------------------------------------------------------------------
# Air Quality
# ---------------------------------------------------------------------------

_air_quality_model = None


def _get_air_quality_model():
    global _air_quality_model
    if _air_quality_model is not None:
        return _air_quality_model

    from air_quality_modelling import AirQualityHybridModel

    model_path = Path(BASE_DIR) / "artifacts" / "air_quality_hybrid_model.joblib"
    if not model_path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Air quality model artifact not found at {model_path}. Train and save the model first.",
        )
    _air_quality_model = AirQualityHybridModel.load_model(model_path)
    return _air_quality_model


@router.post("/air-quality/predict")
async def predict_air_quality(file: UploadFile = File(...)):
    """Upload a CSV with air-quality sensor data; returns predictions."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {exc}") from exc

    model = _get_air_quality_model()
    try:
        predictions = model.predict(df)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Prediction error: {exc}") from exc

    results = predictions.to_dict(orient="records")
    return {
        "status": "ok",
        "row_count": len(results),
        "predictions": results,
    }


# ---------------------------------------------------------------------------
# Traffic Congestion
# ---------------------------------------------------------------------------

_traffic_model = None


def _get_traffic_model():
    global _traffic_model
    if _traffic_model is not None:
        return _traffic_model

    from traffic_model import TrafficCongestionPredictor

    model_path = Path(BASE_DIR) / "artifacts" / "traffic_congestion_model.joblib"
    if not model_path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Traffic model artifact not found at {model_path}. Train and save the model first.",
        )
    _traffic_model = TrafficCongestionPredictor.load_model(model_path)
    return _traffic_model


@router.post("/traffic/predict")
async def predict_traffic(file: UploadFile = File(...)):
    """Upload a CSV with traffic sensor data; returns congestion predictions."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {exc}") from exc

    model = _get_traffic_model()
    try:
        predictions = model.predict(df)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Prediction error: {exc}") from exc

    results = [{"row": i, "predicted_congestion_level": label} for i, label in enumerate(predictions)]
    return {
        "status": "ok",
        "row_count": len(results),
        "predictions": results,
    }


# ---------------------------------------------------------------------------
# GeoAI Accessibility
# ---------------------------------------------------------------------------

class GeoAIRoutePayload(BaseModel):
    start: str
    destination: str
    nodes: Optional[List[dict[str, Any]]] = None
    edges: Optional[List[dict[str, Any]]] = None


_geoai_service = None


def _get_geoai_service():
    global _geoai_service
    if _geoai_service is not None:
        return _geoai_service

    from geoai_accessibility import GeoAIAccessibilityService

    data_path = Path(BASE_DIR) / "training_data" / "accessibility_4.csv"
    if not data_path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Accessibility data not found at {data_path}.",
        )
    _geoai_service = GeoAIAccessibilityService(node_csv_path=data_path)
    return _geoai_service


@router.post("/geoai/route")
async def predict_geoai_route(payload: GeoAIRoutePayload):
    """Run GeoAI wheelchair-accessible routing."""
    service = _get_geoai_service()
    try:
        result = service.route(
            start=payload.start,
            destination=payload.destination,
            nodes_override=payload.nodes,
            edges_override=payload.edges,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Routing error: {exc}") from exc

    result["distance"] = f"{result['distance_m'] / 1000.0:.2f} km"
    result["estimated_time"] = f"{result['estimated_time_min']:.1f} mins"
    return {"status": "ok", "route": result}
