from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    InventoryItemWithDetails
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.get("/", response_model=List[InventoryItemWithDetails])
async def get_inventory_items(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    storage_location_id: Optional[str] = Query(None, description="Filter by storage location"),
    low_stock: Optional[bool] = Query(None, description="Show only low stock items"),
    product_name: Optional[str] = Query(None, description="Search by product name")
):
    """Get all inventory items for the company"""
    try:
        query = supabase.table("inventory_items")\
            .select("*, product_variants(id, variant_name, sku, product_id, products(id, name)), storage_locations(id, name, location_type)")\
            .eq("company_id", company["id"])\
            .order("created_at", desc=True)
        
        if storage_location_id:
            query = query.eq("storage_location_id", storage_location_id)
        
        response = query.execute()
        
        items = []
        for item in response.data:
            variant_data = item.pop("product_variants", None)
            location_data = item.pop("storage_locations", None)
            
            item["product_variant"] = variant_data
            item["storage_location"] = location_data
            
            # Apply product name filter in Python since it's a nested field
            if product_name:
                name = variant_data.get("products", {}).get("name", "") if variant_data else ""
                variant_name = variant_data.get("variant_name", "") if variant_data else ""
                search = product_name.lower()
                if search not in name.lower() and search not in variant_name.lower():
                    continue
            
            if low_stock:
                if item.get("min_stock_level") and item["quantity"] <= item["min_stock_level"]:
                    items.append(item)
            else:
                items.append(item)
        
        return items
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[InventoryItemWithDetails])
async def get_inventory_items(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    storage_location_id: Optional[str] = Query(None, description="Filter by storage location"),
    low_stock: Optional[bool] = Query(None, description="Show only low stock items"),
    product_name: Optional[str] = Query(None, description="Search by product name")
):
    """Get all inventory items for the company"""
    try:
        query = supabase.table("inventory_items")\
            .select("*, product_variants(id, variant_name, sku, product_id, products(id, name)), storage_locations(id, name, location_type)")\
            .eq("company_id", company["id"])\
            .order("created_at", desc=True)
        
        if storage_location_id:
            query = query.eq("storage_location_id", storage_location_id)
        
        response = query.execute()
        
        items = []
        for item in response.data:
            variant_data = item.pop("product_variants", None)
            location_data = item.pop("storage_locations", None)
            
            item["product_variant"] = variant_data
            item["storage_location"] = location_data
            
            # Apply product name filter in Python since it's a nested field
            if product_name:
                name = variant_data.get("products", {}).get("name", "") if variant_data else ""
                variant_name = variant_data.get("variant_name", "") if variant_data else ""
                search = product_name.lower()
                if search not in name.lower() and search not in variant_name.lower():
                    continue
            
            if low_stock:
                if item.get("min_stock_level") and item["quantity"] <= item["min_stock_level"]:
                    items.append(item)
            else:
                items.append(item)
        
        return items
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{item_id}", response_model=InventoryItemWithDetails)
async def get_inventory_item(
    item_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific inventory item"""
    try:
        response = supabase.table("inventory_items")\
            .select("*, product_variants(id, variant_name, sku, product_id, products(id, name)), storage_locations(id, name, location_type)")\
            .eq("id", item_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )
        
        item = response.data[0]
        
        # Extract nested data
        variant_data = item.pop("product_variants", None)
        location_data = item.pop("storage_locations", None)
        
        item["product_variant"] = variant_data
        item["storage_location"] = location_data
        
        return item
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: str,
    item_data: InventoryItemUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update an inventory item (for stock levels, use transactions)"""
    try:
        update_data = item_data.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        response = supabase.table("inventory_items")\
            .update(update_data)\
            .eq("id", item_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    item_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete an inventory item"""
    try:
        response = supabase.table("inventory_items")\
            .delete()\
            .eq("id", item_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )