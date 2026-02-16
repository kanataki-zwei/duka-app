from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.customers import (
    CustomerTierCreate,
    CustomerTierUpdate,
    CustomerTierResponse
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=CustomerTierResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_tier(
    tier_data: CustomerTierCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new customer tier"""
    try:
        response = supabase.table("customer_tiers").insert({
            "company_id": company["id"],
            "name": tier_data.name,
            "discount_percentage": tier_data.discount_percentage,
            "description": tier_data.description,
            "is_default": False  # Only the default tier can be is_default=True
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create customer tier"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_tier_name_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A tier with this name already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[CustomerTierResponse])
async def get_customer_tiers(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get all customer tiers for the company"""
    try:
        response = supabase.table("customer_tiers")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("is_default", desc=True)\
            .order("name")\
            .execute()
        
        return response.data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{tier_id}", response_model=CustomerTierResponse)
async def get_customer_tier(
    tier_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific customer tier"""
    try:
        response = supabase.table("customer_tiers")\
            .select("*")\
            .eq("id", tier_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer tier not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{tier_id}", response_model=CustomerTierResponse)
async def update_customer_tier(
    tier_id: str,
    tier_data: CustomerTierUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a customer tier"""
    try:
        update_data = tier_data.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Cannot modify is_default
        update_data.pop("is_default", None)
        
        response = supabase.table("customer_tiers")\
            .update(update_data)\
            .eq("id", tier_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer tier not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{tier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_tier(
    tier_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a customer tier"""
    try:
        # Check if tier is default
        tier_response = supabase.table("customer_tiers")\
            .select("is_default")\
            .eq("id", tier_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not tier_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer tier not found"
            )
        
        if tier_response.data[0]["is_default"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the default tier"
            )
        
        # Check if any customers are using this tier
        customers_response = supabase.table("customers")\
            .select("id")\
            .eq("customer_tier_id", tier_id)\
            .execute()
        
        if customers_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete tier. {len(customers_response.data)} customer(s) are using this tier"
            )
        
        response = supabase.table("customer_tiers")\
            .delete()\
            .eq("id", tier_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer tier not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )