from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client, ClientOptions
from core.config import settings

# Supabase Client Setup (Admin / Anon)
try:
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    supabase = None

security = HTTPBearer(auto_error=False)

def get_supabase() -> Client:
    # Use for anon/admin overarching calls (e.g. GET public events)
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    return supabase

def get_user_supabase(credentials: HTTPAuthorizationCredentials = Security(security)) -> Client:
    """
    Returns a fresh Supabase client that sends the user's JWT in the Authorization header.
    This ensures all backend DB queries pass Row-Level Security (RLS) as the user!
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated. Please sign in.")
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY,
        options=ClientOptions(headers={"Authorization": f"Bearer {credentials.credentials}"})
    )

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), supabase: Client = Depends(get_supabase)):
    """
    Validates the Bearer token against Supabase Auth.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated. Please sign in.")
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if hasattr(user_response, 'user'):
            return user_response.user
        else:
             raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def get_current_active_user(user = Depends(get_current_user)):
    # You can add logic here if you want to verify profiles table
    return user
