from __future__ import annotations

from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from core.config import settings
from geoai_accessibility import GeoAIAccessibilityService

router = APIRouter()


DEFAULT_ACCESSIBILITY_DATA_PATH = (
    Path(settings.ACCESSIBILITY_MODEL_PATH).expanduser()
    if settings.ACCESSIBILITY_MODEL_PATH
    else Path(settings.ACCESSIBILITY_DATA_PATH).expanduser()
    if settings.ACCESSIBILITY_DATA_PATH
    else Path(__file__).resolve().parents[2] / "training_data" / "accessibility_4.csv"
)
geoai_accessibility_service = GeoAIAccessibilityService(DEFAULT_ACCESSIBILITY_DATA_PATH)


class GeoAINodePayload(BaseModel):
    geoid: str
    tactile_paving: str
    wheelchair: str
    ramp_kerb: str
    traffic_signals_sound: str = "no"


class GeoAIEdgePayload(BaseModel):
    source_geoid: str
    target_geoid: str
    distance_m: float = 120.0
    slope_pct: float = 2.0


class AccessibleRoutePayload(BaseModel):
    start_geoid: str
    destination_geoid: str
    nodes: Optional[List[GeoAINodePayload]] = None
    edges: Optional[List[GeoAIEdgePayload]] = None


def _model_to_dict(model: BaseModel) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()  # Pydantic v2
    return model.dict()  # pragma: no cover - compatibility fallback


@router.get("/accessible-route")
async def get_accessible_route(start: str, destination: str):
    """
    GeoAI-based wheelchair route prediction over accessibility graph features.

    Query params may be canonical geoids (e.g., `node_24277`) or free-text.
    Free-text values are deterministically resolved to known graph nodes.
    """
    try:
        result = geoai_accessibility_service.route(start=start, destination=destination)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to build accessible route: {exc}",
        ) from exc

    result["distance"] = f"{result['distance_m'] / 1000.0:.2f} km"
    result["estimated_time"] = f"{result['estimated_time_min']:.1f} mins (Wheelchair Pace)"
    return result


@router.post("/accessible-route/geoai")
async def get_accessible_route_geoai(payload: AccessibleRoutePayload):
    """Run GeoAI routing on inline node/edge JSON (for map DB integration)."""
    try:
        nodes_override = (
            [_model_to_dict(node) for node in payload.nodes]
            if payload.nodes is not None
            else None
        )
        edges_override = (
            [_model_to_dict(edge) for edge in payload.edges]
            if payload.edges is not None
            else None
        )
        result = geoai_accessibility_service.route(
            start=payload.start_geoid,
            destination=payload.destination_geoid,
            nodes_override=nodes_override,
            edges_override=edges_override,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"GeoAI routing payload validation/inference error: {exc}",
        ) from exc

    result["distance"] = f"{result['distance_m'] / 1000.0:.2f} km"
    result["estimated_time"] = f"{result['estimated_time_min']:.1f} mins (Wheelchair Pace)"
    return result


@router.get("/accessible-route/geoai-stats")
async def get_accessibility_graph_stats():
    """Expose current GeoAI graph stats for operational checks."""
    try:
        return geoai_accessibility_service.stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"GeoAI stats error: {exc}") from exc

class AudioInput(BaseModel):
    audio_base64: str

@router.post("/speech-to-text")
async def convert_stt(data: AudioInput):
    """
    Takes base64 audio and calls Google Cloud STT to transcribe the text.
    """
    async with httpx.AsyncClient() as client:
        # Simulated Google Cloud Call
        pass
    return {"transcription": "I need assistance reaching the metro station."}

class TextInput(BaseModel):
    text: str

@router.post("/text-to-speech")
async def convert_tts(data: TextInput):
    """
    Takes text and returns readable audio instructions.
    """
    async with httpx.AsyncClient() as client:
        pass
    return {"audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="}

@router.get("/predict-traffic")
async def predict_traffic_jams(city_zone: str):
    """
    Simulated OpenAI prediction based on historical data.
    """
    async with httpx.AsyncClient() as client:
        # Simulated OpenRouter/OpenAI structure
        # await client.post("https://api.openai.com/v1/chat/completions", headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}, json={...})
        pass
        
    return {
        "zone": city_zone,
        "prediction": "Moderate to High traffic density expected.",
        "confidence": 0.88,
        "recommendation": "Divert routing to secondary avenues."
    }
