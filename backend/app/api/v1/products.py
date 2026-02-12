from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.products import (
    ProductCreate,
    ProductUpdate,
    ProductResponse
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new product"""
    try:
        # Verify category exists and belongs to company
        category_response = supabase.table("product_categories")\
            .select("id")\
            .eq("id", product_data.category_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not category_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Insert product
        response = supabase.table("products").insert({
            "company_id": company["id"],
            "category_id": product_data.category_id,
            "name": product_data.name,
            "description": product_data.description,
            "sku": product_data.sku,
            "avg_buying_price": str(product_data.avg_buying_price) if product_data.avg_buying_price else None,
            "avg_selling_price": str(product_data.avg_selling_price) if product_data.avg_selling_price else None,
            "min_stock_level": product_data.min_stock_level,
            "reorder_quantity": product_data.reorder_quantity
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create product"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_sku_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{product_data.sku}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[ProductResponse])
async def get_products(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or SKU")
):
    """Get all products for the company with optional filters"""
    try:
        query = supabase.table("products")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("name")
        
        if category_id:
            query = query.eq("category_id", category_id)
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        if search:
            query = query.or_(f"name.ilike.%{search}%,sku.ilike.%{search}%")
        
        response = query.execute()
        
        return response.data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific product"""
    try:
        response = supabase.table("products")\
            .select("*")\
            .eq("id", product_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a product"""
    try:
        # Build update data
        update_data = {}
        for field, value in product_data.model_dump(exclude_unset=True).items():
            if value is not None:
                # Convert Decimal to string for database
                if field in ['avg_buying_price', 'avg_selling_price']:
                    update_data[field] = str(value)
                else:
                    update_data[field] = value
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # If updating category, verify it exists
        if "category_id" in update_data:
            category_response = supabase.table("product_categories")\
                .select("id")\
                .eq("id", update_data["category_id"])\
                .eq("company_id", company["id"])\
                .execute()
            
            if not category_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found"
                )
        
        response = supabase.table("products")\
            .update(update_data)\
            .eq("id", product_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_sku_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with this SKU already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a product (soft delete by setting is_active to False)"""
    try:
        response = supabase.table("products")\
            .update({"is_active": False})\
            .eq("id", product_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )