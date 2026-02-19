from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.schemas.auth import (
    UserCreate, UserLogin, Token, CompanyCreate,
    CompanyResponse, CompanyUpdate, UserResponse
)
from app.utils.supabase import get_supabase
from app.api.deps import get_current_user
from supabase import Client
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/signup", response_model=Token)
async def signup(
    user_data: UserCreate,
    supabase: Client = Depends(get_supabase)
):
    """Register a new user"""
    try:
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        user = auth_response.user
        session = auth_response.session
        
        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    supabase: Client = Depends(get_supabase)
):
    """Login user"""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })
        
        print(f"Auth response: {auth_response}")
        print(f"User: {auth_response.user}")
        print(f"Session: {auth_response.session}")
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        user = auth_response.user
        session = auth_response.session
        
        company_response = supabase.table("company_users")\
            .select("*, companies(*)")\
            .eq("user_id", user.id)\
            .eq("is_active", True)\
            .execute()
        
        company = None
        if company_response.data and len(company_response.data) > 0:
            company_data = company_response.data[0]["companies"]
            company = {
                "id": company_data["id"],
                "name": company_data["name"],
                "created_at": company_data["created_at"],
                "is_active": company_data["is_active"],
                "website": company_data.get("website"),
                "address": company_data.get("address"),
                "kra_number": company_data.get("kra_number"),
                "description": company_data.get("description"),
                "logo_url": company_data.get("logo_url"),
            }
        
        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at
            },
            "company": company
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        print(f"Error type: {type(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials: {str(e)}"
        )

@router.post("/company", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create a new company for the current user"""
    try:
        company_response = supabase.table("companies").insert({
            "name": company_data.name
        }).execute()
        
        if not company_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create company"
            )
        
        company = company_response.data[0]
        
        supabase.table("company_users").insert({
            "company_id": company["id"],
            "user_id": current_user.id,
            "role": "owner"
        }).execute()
        
        return company
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/company/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update company details"""
    try:
        membership = supabase.table("company_users")\
            .select("role")\
            .eq("user_id", current_user.id)\
            .eq("company_id", company_id)\
            .eq("is_active", True)\
            .execute()

        if not membership.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this company"
            )

        update_data = company_data.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        response = supabase.table("companies")\
            .update(update_data)\
            .eq("id", company_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/company/{company_id}/logo", response_model=CompanyResponse)
async def upload_company_logo(
    company_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Upload company logo"""
    try:
        membership = supabase.table("company_users")\
            .select("role")\
            .eq("user_id", current_user.id)\
            .eq("company_id", company_id)\
            .eq("is_active", True)\
            .execute()

        if not membership.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this company"
            )

        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JPEG, PNG, and WebP images are allowed"
            )

        ext = file.filename.split(".")[-1]
        filename = f"{company_id}/{uuid.uuid4()}.{ext}"

        contents = await file.read()
        supabase.storage.from_("company-logos").upload(
            filename,
            contents,
            {"content-type": file.content_type}
        )

        logo_url = supabase.storage.from_("company-logos").get_public_url(filename)

        response = supabase.table("companies")\
            .update({"logo_url": logo_url})\
            .eq("id", company_id)\
            .execute()

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at
    }

@router.get("/companies", response_model=list[CompanyResponse])
async def get_user_companies(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get all companies for the current user"""
    try:
        response = supabase.table("company_users")\
            .select("*, companies(*)")\
            .eq("user_id", current_user.id)\
            .eq("is_active", True)\
            .execute()
        
        companies = []
        if response.data:
            for item in response.data:
                company_data = item["companies"]
                companies.append({
                    "id": company_data["id"],
                    "name": company_data["name"],
                    "created_at": company_data["created_at"],
                    "is_active": company_data["is_active"],
                    "website": company_data.get("website"),
                    "address": company_data.get("address"),
                    "kra_number": company_data.get("kra_number"),
                    "description": company_data.get("description"),
                    "logo_url": company_data.get("logo_url"),
                })
        
        return companies
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )