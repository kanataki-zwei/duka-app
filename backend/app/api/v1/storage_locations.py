from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.inventory import (
    StorageLocationCreate,
    StorageLocationUpdate,
    StorageLocationResponse,
    LocationType
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=StorageLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_location(
    location_data: StorageLocationCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new storage location"""
    try:
        response = supabase.table("storage_locations").insert({
            "company_id": company["id"],
            "name": location_data.name,
            "location_type": location_data.location_type.value,
            "address": location_data.address,
            "description": location_data.description
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create storage location"
            )
        
        return response.data[0]
    
    except Exception as e:
        if "unique_location_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Storage location '{location_data.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[StorageLocationResponse])
async def get_storage_locations(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    location_type: Optional[LocationType] = Query(None, description="Filter by location type")
):
    """Get all storage locations for the company"""
    try:
        query = supabase.table("storage_locations")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("name")
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        if location_type:
            query = query.eq("location_type", location_type.value)
        
        response = query.execute()
        
        return response.data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{location_id}", response_model=StorageLocationResponse)
async def get_storage_location(
    location_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific storage location"""
    try:
        response = supabase.table("storage_locations")\
            .select("*")\
            .eq("id", location_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Storage location not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{location_id}", response_model=StorageLocationResponse)
async def update_storage_location(
    location_id: str,
    location_data: StorageLocationUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a storage location"""
    try:
        update_data = {}
        for field, value in location_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "location_type" and hasattr(value, 'value'):
                    update_data[field] = value.value
                else:
                    update_data[field] = value
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        response = supabase.table("storage_locations")\
            .update(update_data)\
            .eq("id", location_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Storage location not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        if "unique_location_per_company" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Storage location name already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_location(
    location_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a storage location (soft delete)"""
    try:
        response = supabase.table("storage_locations")\
            .update({"is_active": False})\
            .eq("id", location_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Storage location not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )