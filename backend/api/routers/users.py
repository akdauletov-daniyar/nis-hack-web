from fastapi import APIRouter, Depends, HTTPException
from api.deps import get_supabase, get_current_user
from supabase import Client

router = APIRouter()

@router.get("/me")
def read_user_me(current_user = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    """ Returns the profile of the current authenticated user. """
    response = supabase.table("profiles").select("*").eq("id", current_user.id).execute()
    if response.data:
        # Merge auth data with profile data
        return {"auth": current_user, "profile": response.data[0]}
    return {"auth": current_user}

@router.put("/{user_id}/approve_role")
def approve_user_role(user_id: str, new_role: str, current_user = Depends(get_current_user), supabase: Client = Depends(get_supabase)):
    """
    Admin-only endpoint to approve roles like 'emergency', 'government'.
    """
    # Verify current user is an admin
    admin_check = supabase.table("profiles").select("role").eq("id", current_user.id).execute()
    
    if not admin_check.data or admin_check.data[0].get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only 'admin' users can approve roles.")
        
    # Update the target user's role
    response = supabase.table("profiles").update({"role": new_role}).eq("id", user_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User profile not found.")
        
    return {"message": f"Successfully approved role {new_role} for user {user_id}", "profile": response.data[0]}
