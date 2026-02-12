from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.products import (
    ProductVariantCreate,
    ProductVariantUpdate,
    ProductVariantResponse
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
async def create_product_variant(
    variant_data: ProductVariantCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new product variant"""
    try:
        # Verify product exists and belongs to company
        product_response = supabase.table("products")\
            .select("id")\
            .eq("id", variant_data.product_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not product_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Insert variant
        response = supabase.table("product_variants").insert({
            "company_id": company["id"],
            "product_id": variant_data.product_id,
            "variant_name": variant_data.variant_name,
            "sku": variant_data.sku,
            "buying_price": str(variant_data.buying_price) if variant_data.buying_price else None,
            "selling_price": str(variant_data.selling_price) if variant_data.selling_price else None,
            "min_stock_level": variant_data.min_stock_level,
            "reorder_quantity": variant_data.reorder_quantity
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create variant"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_variant_sku_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Variant with SKU '{variant_data.sku}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[ProductVariantResponse])
async def get_product_variants(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    product_id: Optional[str] = Query(None, description="Filter by product"),
    is_active: Optional[bool] = Query(True, description="Filter by active status")
):
    """Get all product variants for the company"""
    try:
        query = supabase.table("product_variants")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("variant_name")
        
        if product_id:
            query = query.eq("product_id", product_id)
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        response = query.execute()
        
        return response.data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{variant_id}", response_model=ProductVariantResponse)
async def get_product_variant(
    variant_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific product variant"""
    try:
        response = supabase.table("product_variants")\
            .select("*")\
            .eq("id", variant_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{variant_id}", response_model=ProductVariantResponse)
async def update_product_variant(
    variant_id: str,
    variant_data: ProductVariantUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a product variant"""
    try:
        # Build update data
        update_data = {}
        for field, value in variant_data.model_dump(exclude_unset=True).items():
            if value is not None:
                # Convert Decimal to string for database
                if field in ['buying_price', 'selling_price']:
                    update_data[field] = str(value)
                else:
                    update_data[field] = value
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        response = supabase.table("product_variants")\
            .update(update_data)\
            .eq("id", variant_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_variant_sku_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Variant with this SKU already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_variant(
    variant_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a product variant (soft delete)"""
    try:
        response = supabase.table("product_variants")\
            .update({"is_active": False})\
            .eq("id", variant_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variant not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )