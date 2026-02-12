from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import (
    UserCreate, UserLogin, Token, CompanyCreate, 
    CompanyResponse, UserResponse
)
from app.utils.supabase import get_supabase
from app.api.deps import get_current_user
from supabase import Client
from datetime import datetime

router = APIRouter()

@router.post("/signup", response_model=Token)
async def signup(
    user_data: UserCreate,
    supabase: Client = Depends(get_supabase)
):
    """Register a new user"""
    try:
        # Sign up user with Supabase Auth
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
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })
        
        # Add detailed logging
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
        
        # Get user's company if exists
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
                "is_active": company_data["is_active"]
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
        # Create company
        company_response = supabase.table("companies").insert({
            "name": company_data.name
        }).execute()
        
        if not company_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create company"
            )
        
        company = company_response.data[0]
        
        # Link user to company as owner
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

@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at
    }