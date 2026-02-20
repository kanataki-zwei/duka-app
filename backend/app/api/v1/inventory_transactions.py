from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.inventory import (
    InventoryTransactionCreate,
    InventoryTransactionResponse,
    InventoryTransactionWithDetails,
    StockAdjustment,
    TransactionType
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

async def update_inventory_quantity(
    supabase: Client,
    company_id: str,
    variant_id: str,
    location_id: str,
    quantity_change: int
):
    """Helper function to update inventory quantity"""
    # Get or create inventory item
    item_response = supabase.table("inventory_items")\
        .select("*")\
        .eq("product_variant_id", variant_id)\
        .eq("storage_location_id", location_id)\
        .execute()
    
    if item_response.data:
        # Update existing
        current_qty = item_response.data[0]["quantity"]
        new_qty = current_qty + quantity_change
        
        if new_qty < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient stock"
            )
        
        supabase.table("inventory_items")\
            .update({"quantity": new_qty})\
            .eq("id", item_response.data[0]["id"])\
            .execute()
    else:
        # Create new
        if quantity_change < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create negative inventory"
            )
        
        supabase.table("inventory_items").insert({
            "company_id": company_id,
            "product_variant_id": variant_id,
            "storage_location_id": location_id,
            "quantity": quantity_change
        }).execute()

@router.post("/", response_model=InventoryTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_transaction(
    transaction_data: InventoryTransactionCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new inventory transaction and update stock levels"""
    try:
        
        # Verify variant exists
        variant_response = supabase.table("product_variants")\
            .select("id")\
            .eq("id", transaction_data.product_variant_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not variant_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product variant not found"
            )
        
        # Validate supplier if provided
        if transaction_data.supplier_id:
            supplier_response = supabase.table("suppliers")\
                .select("id")\
                .eq("id", transaction_data.supplier_id)\
                .eq("company_id", company["id"])\
                .execute()
            
            if not supplier_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supplier not found"
                )
        
        # Calculate total_cost if unit_cost is provided
        total_cost = None
        if transaction_data.unit_cost:
            total_cost = float(transaction_data.unit_cost) * transaction_data.quantity
        
        # Calculate amount_due
        amount_due = None
        if total_cost and transaction_data.amount_paid is not None:
            amount_due = total_cost - float(transaction_data.amount_paid)
        
        # Validate transaction based on type
        if transaction_data.transaction_type == TransactionType.stock_in:
            if not transaction_data.to_location_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="to_location_id is required for stock in"
                )
            # Update inventory
            await update_inventory_quantity(
                supabase, 
                company["id"], 
                transaction_data.product_variant_id,
                transaction_data.to_location_id,
                transaction_data.quantity
            )
        
        elif transaction_data.transaction_type == TransactionType.stock_out:
            if not transaction_data.from_location_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="from_location_id is required for stock out"
                )
            # Update inventory
            await update_inventory_quantity(
                supabase,
                company["id"],
                transaction_data.product_variant_id,
                transaction_data.from_location_id,
                -transaction_data.quantity
            )
        
        elif transaction_data.transaction_type == TransactionType.transfer:
            if not transaction_data.from_location_id or not transaction_data.to_location_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Both from_location_id and to_location_id are required for transfer"
                )
            # Remove from source
            await update_inventory_quantity(
                supabase,
                company["id"],
                transaction_data.product_variant_id,
                transaction_data.from_location_id,
                -transaction_data.quantity
            )
            # Add to destination
            await update_inventory_quantity(
                supabase,
                company["id"],
                transaction_data.product_variant_id,
                transaction_data.to_location_id,
                transaction_data.quantity
            )
        
        elif transaction_data.transaction_type == TransactionType.adjustment:
            location_id = transaction_data.to_location_id or transaction_data.from_location_id
            if not location_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Either from_location_id or to_location_id is required for adjustment"
                )
            # Adjustment can be positive or negative - handled by update function
            if transaction_data.to_location_id:
                await update_inventory_quantity(
                    supabase,
                    company["id"],
                    transaction_data.product_variant_id,
                    transaction_data.to_location_id,
                    transaction_data.quantity
                )
            else:
                await update_inventory_quantity(
                    supabase,
                    company["id"],
                    transaction_data.product_variant_id,
                    transaction_data.from_location_id,
                    -transaction_data.quantity
                )
        
        # Create transaction record
        response = supabase.table("inventory_transactions").insert({
            "company_id": company["id"],
            "product_variant_id": transaction_data.product_variant_id,
            "transaction_type": transaction_data.transaction_type.value,
            "quantity": transaction_data.quantity,
            "from_location_id": transaction_data.from_location_id,
            "to_location_id": transaction_data.to_location_id,
            "reference_type": transaction_data.reference_type,
            "reference_id": transaction_data.reference_id,
            "notes": transaction_data.notes,
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None,
            # New fields for supplier and payment tracking
            "supplier_id": transaction_data.supplier_id,
            "unit_cost": float(transaction_data.unit_cost) if transaction_data.unit_cost else None,
            "total_cost": total_cost,
            "payment_status": transaction_data.payment_status if transaction_data.payment_status else "unpaid",  # Changed
            "amount_paid": float(transaction_data.amount_paid) if transaction_data.amount_paid is not None else 0,  # Changed
            "amount_due": amount_due
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create transaction"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[InventoryTransactionWithDetails])
async def get_inventory_transactions(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    product_variant_id: Optional[str] = Query(None, description="Filter by variant"),
    storage_location_id: Optional[str] = Query(None, description="Filter by location"),
    transaction_type: Optional[TransactionType] = Query(None, description="Filter by type"),
    limit: int = Query(50, le=100, description="Limit results")
):
    """Get inventory transactions"""
    try:
        query = supabase.table("inventory_transactions")\
            .select("*, product_variants(id, variant_name, sku, products(id, name)), from_location:storage_locations!from_location_id(id, name), to_location:storage_locations!to_location_id(id, name), suppliers(id, name)")\
            .eq("company_id", company["id"])\
            .order("created_at", desc=True)\
            .limit(limit)
        
        if product_variant_id:
            query = query.eq("product_variant_id", product_variant_id)
        
        if storage_location_id:
            query = query.or_(f"from_location_id.eq.{storage_location_id},to_location_id.eq.{storage_location_id}")
        
        if transaction_type:
            query = query.eq("transaction_type", transaction_type.value)
        
        response = query.execute()
        
        transactions = []
        for txn in response.data:
            # Extract nested data
            variant_data = txn.pop("product_variants", None)
            from_loc = txn.pop("from_location", None)
            to_loc = txn.pop("to_location", None)
            supplier_data = txn.pop("suppliers", None)
            
            txn["product_variant"] = variant_data
            txn["from_location"] = from_loc
            txn["to_location"] = to_loc
            txn["supplier"] = supplier_data
            
            transactions.append(txn)
        
        return transactions
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/adjust", response_model=InventoryTransactionResponse)
async def adjust_stock(
    adjustment: StockAdjustment,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Simple stock adjustment endpoint"""
    try:
        # Update inventory
        await update_inventory_quantity(
            supabase,
            company["id"],
            adjustment.product_variant_id,
            adjustment.storage_location_id,
            adjustment.quantity_change
        )
        
        # Create transaction
        response = supabase.table("inventory_transactions").insert({
            "company_id": company["id"],
            "product_variant_id": adjustment.product_variant_id,
            "transaction_type": "adjustment",
            "quantity": abs(adjustment.quantity_change),
            "from_location_id": adjustment.storage_location_id if adjustment.quantity_change < 0 else None,
            "to_location_id": adjustment.storage_location_id if adjustment.quantity_change > 0 else None,
            "notes": adjustment.notes,
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None
        }).execute()
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{transaction_id}/reverse", response_model=InventoryTransactionResponse)
async def reverse_transaction(
    transaction_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Reverse a transaction by creating an opposite transaction"""
    try:
        # Get original transaction
        original_response = supabase.table("inventory_transactions")\
            .select("*")\
            .eq("id", transaction_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not original_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        original = original_response.data[0]
        
        # Check if already reversed
        reversal_check = supabase.table("inventory_transactions")\
            .select("id")\
            .eq("reference_type", "reversal")\
            .eq("reference_id", transaction_id)\
            .execute()
        
        if reversal_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction already reversed"
            )
        
        # Create reverse transaction based on type
        reverse_type = original["transaction_type"]
        reverse_from = original["to_location_id"]
        reverse_to = original["from_location_id"]
        
        # For in/out, flip the type
        if original["transaction_type"] == "in":
            reverse_type = "out"
            reverse_from = original["to_location_id"]
            reverse_to = None
        elif original["transaction_type"] == "out":
            reverse_type = "in"
            reverse_from = None
            reverse_to = original["from_location_id"]
        
        # Update inventory based on reverse type
        if reverse_type == "in":
            await update_inventory_quantity(
                supabase,
                company["id"],
                original["product_variant_id"],
                reverse_to,
                original["quantity"]
            )
        elif reverse_type == "out":
            await update_inventory_quantity(
                supabase,
                company["id"],
                original["product_variant_id"],
                reverse_from,
                -original["quantity"]
            )
        elif reverse_type == "transfer":
            # Reverse transfer
            await update_inventory_quantity(
                supabase,
                company["id"],
                original["product_variant_id"],
                reverse_from,
                original["quantity"]
            )
            await update_inventory_quantity(
                supabase,
                company["id"],
                original["product_variant_id"],
                reverse_to,
                -original["quantity"]
            )
        
        # Create reversal transaction
        response = supabase.table("inventory_transactions").insert({
            "company_id": company["id"],
            "product_variant_id": original["product_variant_id"],
            "transaction_type": reverse_type,
            "quantity": original["quantity"],
            "from_location_id": reverse_from,
            "to_location_id": reverse_to,
            "reference_type": "reversal",
            "reference_id": transaction_id,
            "notes": f"Reversal of transaction {transaction_id[:8]}...",
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create reversal transaction"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )