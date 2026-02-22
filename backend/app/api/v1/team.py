from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.api.deps import get_current_user, get_current_company, require_admin
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()


class TeamMemberCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "shop_attendant"

    class Config:
        json_schema_extra = {
            "example": {
                "email": "attendant@shop.com",
                "password": "securepassword123",
                "full_name": "Jane Doe",
                "role": "shop_attendant"
            }
        }


class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    company_id: str
    role: str
    is_active: bool
    email: Optional[str] = None
    full_name: Optional[str] = None


class TeamMemberUpdateRole(BaseModel):
    role: str


@router.get("/me", response_model=TeamMemberResponse)
async def get_me(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's company role - called after login to load role into auth store"""
    try:
        response = supabase.table("company_users")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .eq("company_id", company["id"])\
            .eq("is_active", True)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in company"
            )

        cu = response.data[0]
        return TeamMemberResponse(
            id=cu["id"],
            user_id=cu["user_id"],
            company_id=cu["company_id"],
            role=cu.get("role", "shop_attendant"),
            is_active=cu["is_active"],
            email=current_user.email,
            full_name=current_user.user_metadata.get("full_name") if current_user.user_metadata else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def create_team_member(
    member_data: TeamMemberCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    _admin = Depends(require_admin),
    supabase: Client = Depends(get_supabase)
):
    """Admin creates a new team member account"""
    try:
        if member_data.role not in ["admin", "shop_attendant"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role must be 'admin' or 'shop_attendant'"
            )

        # Create user in Supabase Auth using admin API
        auth_response = supabase.auth.admin.create_user({
            "email": member_data.email,
            "password": member_data.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": member_data.full_name or ""
            }
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )

        new_user_id = auth_response.user.id

        # Check if this user is already in the company
        existing = supabase.table("company_users")\
            .select("id")\
            .eq("user_id", new_user_id)\
            .eq("company_id", company["id"])\
            .execute()

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists in this company"
            )

        # Add user to company with role
        company_user_response = supabase.table("company_users").insert({
            "user_id": new_user_id,
            "company_id": company["id"],
            "role": member_data.role,
            "is_active": True
        }).execute()

        if not company_user_response.data:
            # Rollback: delete the created auth user
            supabase.auth.admin.delete_user(new_user_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to add user to company"
            )

        company_user = company_user_response.data[0]

        return TeamMemberResponse(
            id=company_user["id"],
            user_id=new_user_id,
            company_id=company["id"],
            role=company_user["role"],
            is_active=company_user["is_active"],
            email=member_data.email,
            full_name=member_data.full_name
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[TeamMemberResponse])
async def get_team_members(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    _admin = Depends(require_admin),
    supabase: Client = Depends(get_supabase)
):
    """Get all team members for the company (admin only)"""
    try:
        response = supabase.table("company_users")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        members = []
        for cu in response.data:
            # Fetch user details from auth
            try:
                user_response = supabase.auth.admin.get_user_by_id(cu["user_id"])
                email = user_response.user.email if user_response.user else None
                full_name = user_response.user.user_metadata.get("full_name") if user_response.user else None
            except Exception:
                email = None
                full_name = None

            members.append(TeamMemberResponse(
                id=cu["id"],
                user_id=cu["user_id"],
                company_id=cu["company_id"],
                role=cu.get("role", "shop_attendant"),
                is_active=cu["is_active"],
                email=email,
                full_name=full_name
            ))

        return members

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{company_user_id}/role", response_model=TeamMemberResponse)
async def update_team_member_role(
    company_user_id: str,
    role_data: TeamMemberUpdateRole,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    _admin = Depends(require_admin),
    supabase: Client = Depends(get_supabase)
):
    """Update a team member's role (admin only)"""
    try:
        if role_data.role not in ["admin", "shop_attendant"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role must be 'admin' or 'shop_attendant'"
            )

        response = supabase.table("company_users")\
            .update({"role": role_data.role})\
            .eq("id", company_user_id)\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team member not found"
            )

        cu = response.data[0]
        return TeamMemberResponse(
            id=cu["id"],
            user_id=cu["user_id"],
            company_id=cu["company_id"],
            role=cu["role"],
            is_active=cu["is_active"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{company_user_id}/deactivate")
async def deactivate_team_member(
    company_user_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    _admin = Depends(require_admin),
    supabase: Client = Depends(get_supabase)
):
    """Deactivate a team member (admin only)"""
    try:
        # Prevent admin from deactivating themselves
        check = supabase.table("company_users")\
            .select("user_id")\
            .eq("id", company_user_id)\
            .eq("company_id", company["id"])\
            .execute()

        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team member not found"
            )

        if check.data[0]["user_id"] == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )

        supabase.table("company_users")\
            .update({"is_active": False})\
            .eq("id", company_user_id)\
            .eq("company_id", company["id"])\
            .execute()

        return {"message": "Team member deactivated"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )