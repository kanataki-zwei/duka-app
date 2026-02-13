from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.suppliers import (
    PaymentTermCreate,
    PaymentTermUpdate,
    PaymentTermResponse
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=PaymentTermResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_term(
    term_data: PaymentTermCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new payment term"""
    try:
        response = supabase.table("payment_terms").insert({
            "company_id": company["id"],
            "name": term_data.name,
            "description": term_data.description,
            "days": term_data.days
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create payment term"
            )
        
        return response.data[0]
    
    except Exception as e:
        if "unique_payment_term_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment term '{term_data.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[PaymentTermResponse])
async def get_payment_terms(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get all payment terms for the company"""
    try:
        response = supabase.table("payment_terms")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("name")\
            .execute()
        
        return response.data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{term_id}", response_model=PaymentTermResponse)
async def get_payment_term(
    term_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific payment term"""
    try:
        response = supabase.table("payment_terms")\
            .select("*")\
            .eq("id", term_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment term not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{term_id}", response_model=PaymentTermResponse)
async def update_payment_term(
    term_id: str,
    term_data: PaymentTermUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a payment term"""
    try:
        update_data = term_data.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        response = supabase.table("payment_terms")\
            .update(update_data)\
            .eq("id", term_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment term not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_payment_term_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment term name already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_term(
    term_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a payment term"""
    try:
        response = supabase.table("payment_terms")\
            .delete()\
            .eq("id", term_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment term not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )