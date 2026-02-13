from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.suppliers import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierWithCategories
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new supplier"""
    try:
        # Verify payment term if provided
        if supplier_data.payment_term_id:
            term_response = supabase.table("payment_terms")\
                .select("id")\
                .eq("id", supplier_data.payment_term_id)\
                .eq("company_id", company["id"])\
                .execute()
            
            if not term_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment term not found"
                )
        
        # Create supplier
        response = supabase.table("suppliers").insert({
            "company_id": company["id"],
            "name": supplier_data.name,
            "contact_person": supplier_data.contact_person,
            "email": supplier_data.email,
            "phone": supplier_data.phone,
            "address": supplier_data.address,
            "payment_term_id": supplier_data.payment_term_id
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create supplier"
            )
        
        supplier = response.data[0]
        
        # Link to product categories if provided
        if supplier_data.product_category_ids:
            for category_id in supplier_data.product_category_ids:
                # Verify category exists
                cat_response = supabase.table("product_categories")\
                    .select("id")\
                    .eq("id", category_id)\
                    .eq("company_id", company["id"])\
                    .execute()
                
                if cat_response.data:
                    supabase.table("supplier_product_categories").insert({
                        "supplier_id": supplier["id"],
                        "product_category_id": category_id
                    }).execute()
        
        return supplier
    
    except HTTPException:
        raise
    except Exception as e:
        if "idx_suppliers_company_id_name" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supplier '{supplier_data.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[SupplierWithCategories])
async def get_suppliers(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name")
):
    """Get all suppliers for the company"""
    try:
        query = supabase.table("suppliers")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("name")
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        if search:
            query = query.ilike("name", f"%{search}%")
        
        response = query.execute()
        
        # Get categories for each supplier
        suppliers = []
        for supplier in response.data:
            # Get linked categories
            cat_response = supabase.table("supplier_product_categories")\
                .select("product_category_id, product_categories(id, name)")\
                .eq("supplier_id", supplier["id"])\
                .execute()
            
            categories = [
                {
                    "id": item["product_categories"]["id"],
                    "name": item["product_categories"]["name"]
                }
                for item in cat_response.data
            ] if cat_response.data else []
            
            supplier["product_categories"] = categories
            suppliers.append(supplier)
        
        return suppliers
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{supplier_id}", response_model=SupplierWithCategories)
async def get_supplier(
    supplier_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific supplier"""
    try:
        response = supabase.table("suppliers")\
            .select("*")\
            .eq("id", supplier_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )
        
        supplier = response.data[0]
        
        # Get linked categories
        cat_response = supabase.table("supplier_product_categories")\
            .select("product_category_id, product_categories(id, name)")\
            .eq("supplier_id", supplier_id)\
            .execute()
        
        categories = [
            {
                "id": item["product_categories"]["id"],
                "name": item["product_categories"]["name"]
            }
            for item in cat_response.data
        ] if cat_response.data else []
        
        supplier["product_categories"] = categories
        
        return supplier
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    supplier_data: SupplierUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a supplier"""
    try:
        # Build update data
        update_data = supplier_data.model_dump(exclude_unset=True, exclude={"product_category_ids"})
        
        # Verify payment term if updating
        if "payment_term_id" in update_data and update_data["payment_term_id"]:
            term_response = supabase.table("payment_terms")\
                .select("id")\
                .eq("id", update_data["payment_term_id"])\
                .eq("company_id", company["id"])\
                .execute()
            
            if not term_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment term not found"
                )
        
        # Update supplier
        if update_data:
            response = supabase.table("suppliers")\
                .update(update_data)\
                .eq("id", supplier_id)\
                .eq("company_id", company["id"])\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supplier not found"
                )
        
        # Update categories if provided
        if supplier_data.product_category_ids is not None:
            # Delete existing links
            supabase.table("supplier_product_categories")\
                .delete()\
                .eq("supplier_id", supplier_id)\
                .execute()
            
            # Add new links
            for category_id in supplier_data.product_category_ids:
                cat_response = supabase.table("product_categories")\
                    .select("id")\
                    .eq("id", category_id)\
                    .eq("company_id", company["id"])\
                    .execute()
                
                if cat_response.data:
                    supabase.table("supplier_product_categories").insert({
                        "supplier_id": supplier_id,
                        "product_category_id": category_id
                    }).execute()
        
        # Get updated supplier
        final_response = supabase.table("suppliers")\
            .select("*")\
            .eq("id", supplier_id)\
            .execute()
        
        return final_response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "idx_suppliers_company_id_name" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supplier name already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a supplier (soft delete)"""
    try:
        response = supabase.table("suppliers")\
            .update({"is_active": False})\
            .eq("id", supplier_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )