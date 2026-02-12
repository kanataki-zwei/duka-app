from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from app.utils.supabase import get_supabase
from app.core.security import verify_token
from supabase import Client

security = HTTPBearer()

async def get_current_user(
    token: str = Depends(security),
    supabase: Client = Depends(get_supabase)
):
    """Get current authenticated user"""
    # Extract the token string
    token_str = token.credentials
    
    # Verify token with Supabase
    try:
        user_response = supabase.auth.get_user(token_str)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_company(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's company"""
    # Get user's company from company_users table
    response = supabase.table("company_users")\
        .select("*, companies(*)")\
        .eq("user_id", current_user.id)\
        .eq("is_active", True)\
        .execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for user"
        )
    
    return response.data[0]["companies"]