"""
Events API — CRUD endpoints for crowdsourced city incident reporting.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from api.deps import get_supabase, get_current_user, get_user_supabase
from supabase import Client

router = APIRouter()


# ── Pydantic Models ──────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    category: str = Field(..., pattern=r"^(infrastructure|emergency|urban|events)$")
    media_url: Optional[str] = None
    impact_level: int = Field(1, ge=1, le=3)
    lifecycle: str = Field("active", pattern=r"^(planned|active|resolving)$")
    smart_tags: List[str] = []
    description: Optional[str] = None


class EventUpdate(BaseModel):
    name: Optional[str] = None
    impact_level: Optional[int] = Field(None, ge=1, le=3)
    lifecycle: Optional[str] = Field(None, pattern=r"^(planned|active|resolving)$")
    smart_tags: Optional[List[str]] = None
    description: Optional[str] = None
    media_url: Optional[str] = None


class TrustVote(BaseModel):
    vote: int = Field(..., ge=-1, le=1)  # +1 confirm, -1 deny


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/")
def list_events(
    category: Optional[str] = Query(None),
    lifecycle: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase),
):
    """
    List all events with optional category / lifecycle filters.
    """
    query = supabase.table("events").select("*").order("created_at", desc=True)

    if category:
        query = query.eq("category", category)
    if lifecycle:
        query = query.eq("lifecycle", lifecycle)

    response = query.execute()
    return response.data


@router.get("/{event_id}")
def get_event(event_id: str, supabase: Client = Depends(get_supabase)):
    """
    Get a single event by ID.
    """
    response = (
        supabase.table("events")
        .select("*")
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return response.data


@router.post("/")
def create_event(
    event: EventCreate,
    current_user=Depends(get_current_user),
    user_supabase: Client = Depends(get_user_supabase),
):
    """
    Create a new event report. Requires authentication.
    """
    # Calculate effect radius based on category + impact
    radius_map = {
        "infrastructure": [100, 300, 800],
        "emergency": [200, 500, 2000],
        "urban": [50, 150, 400],
        "events": [100, 300, 1000],
    }
    effect_radius = radius_map.get(event.category, [100, 300, 800])[
        event.impact_level - 1
    ]

    data = {
        "user_id": current_user.id,
        "name": event.name,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "category": event.category,
        "media_url": event.media_url,
        "impact_level": event.impact_level,
        "lifecycle": event.lifecycle,
        "smart_tags": event.smart_tags,
        "description": event.description,
        "trust_score": 0,
        "effect_radius": effect_radius,
    }

    response = user_supabase.table("events").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create event")

    return {"status": "success", "event": response.data[0]}


@router.patch("/{event_id}")
def update_event(
    event_id: str,
    update: EventUpdate,
    current_user=Depends(get_current_user),
    user_supabase: Client = Depends(get_user_supabase),
):
    """
    Update an event. Only the author may update.
    """
    # Verify ownership
    existing = (
        user_supabase.table("events")
        .select("user_id")
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Event not found")
    if existing.data["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    patch = {k: v for k, v in update.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = user_supabase.table("events").update(patch).eq("id", event_id).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update event")

    return {"status": "success", "event": response.data[0]}


@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    current_user=Depends(get_current_user),
    user_supabase: Client = Depends(get_user_supabase),
):
    """
    Delete an event. Only the author may delete.
    """
    existing = (
        user_supabase.table("events")
        .select("user_id")
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Event not found")
    if existing.data["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    user_supabase.table("events").delete().eq("id", event_id).execute()
    return {"status": "success", "message": "Event deleted"}


@router.post("/{event_id}/vote")
def vote_event(
    event_id: str,
    vote: TrustVote,
    current_user=Depends(get_current_user),
    user_supabase: Client = Depends(get_user_supabase),
):
    """
    Upvote (+1) or downvote (-1) an event's trust score.
    """
    existing = (
        user_supabase.table("events")
        .select("trust_score")
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Event not found")

    new_score = existing.data["trust_score"] + vote.vote
    response = (
        user_supabase.table("events")
        .update({"trust_score": new_score})
        .eq("id", event_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update trust score")

    return {"status": "success", "trust_score": new_score}
