from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.customers import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerWithDetails,
    CustomerType,
    CustomerStatus,
    CreditCheckRequest,
    CreditCheckResponse
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new customer"""
    try:
        # Validate payment term if provided
        if customer_data.payment_term_id:
            term_response = supabase.table("payment_terms")\
                .select("id")\
                .eq("id", customer_data.payment_term_id)\
                .eq("company_id", company["id"])\
                .execute()
            
            if not term_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment term not found"
                )
        
        # Validate customer tier if provided
        if customer_data.customer_tier_id:
            tier_response = supabase.table("customer_tiers")\
                .select("id")\
                .eq("id", customer_data.customer_tier_id)\
                .eq("company_id", company["id"])\
                .execute()
            
            if not tier_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Customer tier not found"
                )
        else:
            # If no tier provided, use default tier
            default_tier = supabase.table("customer_tiers")\
                .select("id")\
                .eq("company_id", company["id"])\
                .eq("is_default", True)\
                .execute()
            
            if default_tier.data:
                customer_data.customer_tier_id = default_tier.data[0]["id"]
        
        response = supabase.table("customers").insert({
            "company_id": company["id"],
            "customer_type": customer_data.customer_type.value,
            "name": customer_data.name,
            "email": customer_data.email,
            "phone": customer_data.phone,
            "address": customer_data.address,
            "tax_id": customer_data.tax_id,
            "payment_term_id": customer_data.payment_term_id,
            "customer_tier_id": customer_data.customer_tier_id,
            "credit_limit": customer_data.credit_limit,
            "status": customer_data.status.value,
            "notes": customer_data.notes
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create customer"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[CustomerWithDetails])
async def get_customers(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    customer_type: Optional[CustomerType] = Query(None, description="Filter by customer type"),
    status_filter: Optional[CustomerStatus] = Query(None, description="Filter by status"),
    tier_id: Optional[str] = Query(None, description="Filter by customer tier")
):
    """Get all customers for the company"""
    try:
        query = supabase.table("customers")\
            .select("*, payment_terms(id, name, days), customer_tiers(id, name, discount_percentage)")\
            .eq("company_id", company["id"])\
            .order("is_default", desc=True)\
            .order("name")
        
        if customer_type:
            query = query.eq("customer_type", customer_type.value)
        
        if status_filter:
            query = query.eq("status", status_filter.value)
        
        if tier_id:
            query = query.eq("customer_tier_id", tier_id)
        
        response = query.execute()
        
        customers = []
        for customer in response.data:
            # Extract nested data
            payment_term = customer.pop("payment_terms", None)
            customer_tier = customer.pop("customer_tiers", None)
            
            customer["payment_term"] = payment_term
            customer["customer_tier"] = customer_tier
            
            customers.append(customer)
        
        return customers
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{customer_id}", response_model=CustomerWithDetails)
async def get_customer(
    customer_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific customer"""
    try:
        response = supabase.table("customers")\
            .select("*, payment_terms(id, name, days), customer_tiers(id, name, discount_percentage)")\
            .eq("id", customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        customer = response.data[0]
        
        # Extract nested data
        payment_term = customer.pop("payment_terms", None)
        customer_tier = customer.pop("customer_tiers", None)
        
        customer["payment_term"] = payment_term
        customer["customer_tier"] = customer_tier
        
        return customer
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update a customer"""
    try:
        # Check if customer is default walk-in
        customer_response = supabase.table("customers")\
            .select("is_default")\
            .eq("id", customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not customer_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        # Prevent certain updates to default walk-in customer
        if customer_response.data[0]["is_default"]:
            if customer_data.customer_type and customer_data.customer_type != CustomerType.walk_in:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change customer type of default walk-in customer"
                )
        
        update_data = customer_data.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        # Convert enums to values
        if "customer_type" in update_data:
            update_data["customer_type"] = update_data["customer_type"].value
        if "status" in update_data:
            update_data["status"] = update_data["status"].value
        
        response = supabase.table("customers")\
            .update(update_data)\
            .eq("id", customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Delete a customer (soft delete - set to inactive)"""
    try:
        # Check if customer is default walk-in
        customer_response = supabase.table("customers")\
            .select("is_default")\
            .eq("id", customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not customer_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        if customer_response.data[0]["is_default"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the default walk-in customer"
            )
        
        # Soft delete - set to inactive
        response = supabase.table("customers")\
            .update({"status": "inactive"})\
            .eq("id", customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{customer_id}/balance", response_model=dict)
async def get_customer_balance(
    customer_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get customer's current balance and credit info"""
    try:
        response = supabase.table("customers")\
            .select("id, name, credit_limit, current_balance")\
            .eq("id", customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        customer = response.data[0]
        available_credit = customer["credit_limit"] - customer["current_balance"]
        
        return {
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "credit_limit": customer["credit_limit"],
            "current_balance": customer["current_balance"],
            "available_credit": max(0, available_credit)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{customer_id}/check-credit", response_model=CreditCheckResponse)
async def check_customer_credit(
    customer_id: str,
    credit_check: CreditCheckRequest,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Check if customer has sufficient credit for a sale"""
    try:
        response = supabase.table("customers")\
            .select("id, name, customer_type, credit_limit, current_balance")\
            .eq("id", customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        customer = response.data[0]
        
        # Walk-in customers always have credit (cash sales)
        if customer["customer_type"] == "walk-in":
            return CreditCheckResponse(
                has_credit=True,
                credit_limit=0,
                current_balance=0,
                available_credit=0,
                sale_amount=credit_check.sale_amount,
                message="Walk-in customer - cash sale"
            )
        
        available_credit = customer["credit_limit"] - customer["current_balance"]
        new_balance = customer["current_balance"] + credit_check.sale_amount
        has_credit = new_balance <= customer["credit_limit"]
        
        if has_credit:
            message = f"Credit approved. Available credit after sale: KES {(available_credit - credit_check.sale_amount):,.2f}"
        else:
            message = f"Credit limit exceeded. Available credit: KES {available_credit:,.2f}"
        
        return CreditCheckResponse(
            has_credit=has_credit,
            credit_limit=customer["credit_limit"],
            current_balance=customer["current_balance"],
            available_credit=max(0, available_credit),
            sale_amount=credit_check.sale_amount,
            message=message
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )