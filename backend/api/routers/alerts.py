from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.deps import get_supabase, get_current_user
from supabase import Client

router = APIRouter()

class AlertCreate(BaseModel):
    title: str
    description: str
    lat: float
    lng: float

@router.post("/")
def create_emergency_alert(alert: AlertCreate, current_user = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    """
    Pushes a new emergency alert to the database.
    Real-time Supabase subscriptions will blast this to Emergency Dashboards.
    """
    data = {
        "reporter_id": current_user.id,
        "title": alert.title,
        "description": alert.description,
        "location_lat": alert.lat,
        "location_lng": alert.lng,
        "status": "active"
    }
    
    response = supabase.table("emergency_alerts").insert(data).execute()
    
    # Error checking pattern for supabase-py
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create alert.")
        
    return {"status": "success", "alert": response.data[0]}

@router.get("/")
def get_active_alerts(supabase: Client = Depends(get_supabase)):
    """
    Fetches a list of currently active emergency alerts.
    """
    response = supabase.table("emergency_alerts").select("*").eq("status", "active").execute()
    return response.data
