from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from app.utils.supabase import get_supabase
from supabase import Client

security = HTTPBearer()


async def get_current_user(
    token: str = Depends(security),
    supabase: Client = Depends(get_supabase)
):
    token_str = token.credentials
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
    request: Request,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's company - uses X-Company-ID header if provided"""
    company_id = request.headers.get("X-Company-ID")

    query = supabase.table("company_users")\
        .select("*, companies(*)")\
        .eq("user_id", current_user.id)\
        .eq("is_active", True)

    if company_id:
        query = query.eq("company_id", company_id)

    response = query.execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for user"
        )

    return response.data[0]["companies"]


async def get_current_company_user(
    request: Request,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current company_user record including role"""
    company_id = request.headers.get("X-Company-ID")

    query = supabase.table("company_users")\
        .select("*, companies(*)")\
        .eq("user_id", current_user.id)\
        .eq("is_active", True)

    if company_id:
        query = query.eq("company_id", company_id)

    response = query.execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for user"
        )

    return response.data[0]


async def get_current_role(
    company_user: dict = Depends(get_current_company_user)
) -> str:
    """Get the role of the current user in their company"""
    return company_user.get("role", "shop_attendant")


async def require_admin(
    role: str = Depends(get_current_role)
):
    """Dependency that enforces admin-only access"""
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return role