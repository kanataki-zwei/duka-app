from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.products import (
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCategoryResponse
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_product_category(
    category_data: ProductCategoryCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new product category"""
    try:
        # Insert category
        response = supabase.table("product_categories").insert({
            "company_id": company["id"],
            "name": category_data.name,
            "description": category_data.description
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create category"
            )
        
        return response.data[0]
    
    except Exception as e:
        if "unique_category_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category_data.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[ProductCategoryResponse])
async def get_product_categories(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    is_active: bool = True
):
    """Get all product categories for the company"""
    try:
        query = supabase.table("product_categories")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("name")
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        response = query.execute()
        
        return response.data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{category_id}", response_model=ProductCategoryResponse)
async def get_product_category(
    category_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific product category"""
    try:
        response = supabase.table("product_categories")\
            .select("*")\
            .eq("id", category_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{category_id}", response_model=ProductCategoryResponse)
async def update_product_category(
    category_id: str,
    category_data: ProductCategoryUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a product category"""
    try:
        # Build update data (only include fields that are set)
        update_data = category_data.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        response = supabase.table("product_categories")\
            .update(update_data)\
            .eq("id", category_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_category_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category name already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_category(
    category_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a product category (soft delete by setting is_active to False)"""
    try:
        response = supabase.table("product_categories")\
            .update({"is_active": False})\
            .eq("id", category_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )