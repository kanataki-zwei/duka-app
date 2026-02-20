from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from decimal import Decimal
from app.schemas.products import (
    ProductCreate,
    ProductUpdate,
    ProductResponse
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

def calculate_avg_prices(variants: list) -> tuple:
    """Calculate average buying and selling prices from active variants"""
    active_variants = [v for v in variants if v.get("is_active", True)]
    
    buying_prices = [float(v["buying_price"]) for v in active_variants if v.get("buying_price")]
    selling_prices = [float(v["selling_price"]) for v in active_variants if v.get("selling_price")]
    
    avg_buying = sum(buying_prices) / len(buying_prices) if buying_prices else None
    avg_selling = sum(selling_prices) / len(selling_prices) if selling_prices else None
    
    return avg_buying, avg_selling

def generate_product_sku(supabase: Client, company_id: str) -> str:
    """Generate a serial SKU for a product"""
    response = supabase.table("products")\
        .select("id")\
        .eq("company_id", company_id)\
        .execute()
    count = len(response.data) + 1 if response.data else 1
    return f"PRD-{count:04d}"

def generate_variant_sku(supabase: Client, company_id: str) -> str:
    """Generate a serial SKU for a variant"""
    response = supabase.table("product_variants")\
        .select("id")\
        .eq("company_id", company_id)\
        .execute()
    count = len(response.data) + 1 if response.data else 1
    return f"VAR-{count:04d}"

def enrich_product(product: dict, supabase: Client, company_id: str) -> dict:
    """Add variant_count, avg_buying_price, avg_selling_price to a product"""
    variants_response = supabase.table("product_variants")\
        .select("buying_price, selling_price, is_active")\
        .eq("product_id", product["id"])\
        .eq("company_id", company_id)\
        .execute()
    
    variants = variants_response.data or []
    avg_buying, avg_selling = calculate_avg_prices(variants)
    active_count = len([v for v in variants if v.get("is_active", True)])
    
    return {
        **product,
        "variant_count": active_count,
        "avg_buying_price": avg_buying,
        "avg_selling_price": avg_selling,
    }

@router.get("/generate-sku", response_model=dict)
async def get_generated_product_sku(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Generate a serial SKU for a new product"""
    sku = generate_product_sku(supabase, company["id"])
    return {"sku": sku}

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new product with a default Standard variant"""
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
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create product"
            )
        
        product = response.data[0]

        # Auto-create default "Standard" variant
        variant_sku = generate_variant_sku(supabase, company["id"])
        supabase.table("product_variants").insert({
            "company_id": company["id"],
            "product_id": product["id"],
            "variant_name": "Standard",
            "sku": variant_sku,
        }).execute()

        return enrich_product(product, supabase, company["id"])
    
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
    category_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    search: Optional[str] = Query(None)
):
    """Get all products with real-time avg prices and variant counts"""
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
        
        return [enrich_product(p, supabase, company["id"]) for p in response.data]
    
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
    """Get a specific product with real-time avg prices"""
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
        
        return enrich_product(response.data[0], supabase, company["id"])
    
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
        update_data = product_data.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
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
        
        return enrich_product(response.data[0], supabase, company["id"])
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_sku_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this SKU already exists"
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
    """Soft delete a product"""
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