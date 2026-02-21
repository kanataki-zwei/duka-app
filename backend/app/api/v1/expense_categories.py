from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.expenses import (
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCategoryResponse,
    ExpenseType
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_expense_category(
    category_data: ExpenseCategoryCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new expense category"""
    try:
        response = supabase.table("expense_categories").insert({
            "company_id": company["id"],
            "name": category_data.name,
            "expense_type": category_data.expense_type.value,
            "description": category_data.description,
        }).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create expense category"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An expense category with this name already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[ExpenseCategoryResponse])
async def get_expense_categories(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    expense_type: Optional[ExpenseType] = Query(None),
    is_active: Optional[bool] = Query(None)
):
    """Get all expense categories"""
    try:
        query = supabase.table("expense_categories")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("name")

        if expense_type:
            query = query.eq("expense_type", expense_type.value)

        if is_active is not None:
            query = query.eq("is_active", is_active)

        response = query.execute()
        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/{category_id}", response_model=ExpenseCategoryResponse)
async def update_expense_category(
    category_id: str,
    category_data: ExpenseCategoryUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update an expense category"""
    try:
        # Verify exists
        existing = supabase.table("expense_categories")\
            .select("id")\
            .eq("id", category_id)\
            .eq("company_id", company["id"])\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense category not found"
            )

        update_data = {k: v for k, v in category_data.model_dump().items() if v is not None}
        if "expense_type" in update_data:
            update_data["expense_type"] = update_data["expense_type"].value

        response = supabase.table("expense_categories")\
            .update(update_data)\
            .eq("id", category_id)\
            .execute()

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An expense category with this name already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )