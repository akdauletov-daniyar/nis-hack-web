from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from core.config import settings

# Supabase Client Setup
try:
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    supabase = None

security = HTTPBearer()

def get_supabase() -> Client:
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    return supabase

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), supabase: Client = Depends(get_supabase)):
    """
    Validates the Bearer token against Supabase Auth.
    """
    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if hasattr(user_response, 'user'):
            return user_response.user
        else:
             raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def get_current_active_user(user = Depends(get_current_user)):
    # You can add logic here if you want to verify profiles table
    return user
