from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import date
from app.schemas.sales import (
    SaleCreate,
    SaleResponse,
    SaleWithDetails,
    SaleType,
    PaymentStatus,
    CreditNoteCreate,
    SalePaymentCreate,      
    SalePaymentResponse 
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from app.utils.pdf_generator import generate_invoice_pdf
from supabase import Client

router = APIRouter()

async def check_stock_availability(
    supabase: Client,
    variant_id: str,
    location_id: str,
    required_quantity: int
) -> bool:
    """Check if sufficient stock is available"""
    item_response = supabase.table("inventory_items")\
        .select("quantity")\
        .eq("product_variant_id", variant_id)\
        .eq("storage_location_id", location_id)\
        .execute()
    
    if not item_response.data:
        return False
    
    available = item_response.data[0]["quantity"]
    return available >= required_quantity

async def update_inventory_from_sale(
    supabase: Client,
    company_id: str,
    variant_id: str,
    location_id: str,
    quantity: int,
    sale_id: str,
    sale_number: str,
    is_credit_note: bool = False
):
    """Update inventory and create transaction for sale/credit note"""
    # Get or create inventory item
    item_response = supabase.table("inventory_items")\
        .select("*")\
        .eq("product_variant_id", variant_id)\
        .eq("storage_location_id", location_id)\
        .execute()
    
    if item_response.data:
        # Update existing
        current_qty = item_response.data[0]["quantity"]
        new_qty = current_qty - quantity if not is_credit_note else current_qty + abs(quantity)
        
        supabase.table("inventory_items")\
            .update({"quantity": new_qty})\
            .eq("id", item_response.data[0]["id"])\
            .execute()
    else:
        if is_credit_note:
            # Create new item for returns
            supabase.table("inventory_items").insert({
                "company_id": company_id,
                "product_variant_id": variant_id,
                "storage_location_id": location_id,
                "quantity": abs(quantity)
            }).execute()
    
    # Create inventory transaction
    transaction_type = "in" if is_credit_note else "out"
    transaction_quantity = abs(quantity)
    
    supabase.table("inventory_transactions").insert({
        "company_id": company_id,
        "product_variant_id": variant_id,
        "transaction_type": transaction_type,
        "quantity": transaction_quantity,
        "from_location_id": location_id if not is_credit_note else None,
        "to_location_id": location_id if is_credit_note else None,
        "reference_type": "sale",
        "reference_id": sale_id,
        "notes": f"{'Return from' if is_credit_note else 'Sale'} {sale_number}"
    }).execute()

@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale_data: SaleCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new sale (invoice)"""
    try:
        # Validate customer
        customer_response = supabase.table("customers")\
            .select("*, customer_tiers(discount_percentage)")\
            .eq("id", sale_data.customer_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not customer_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        customer = customer_response.data[0]
        customer_tier = customer.pop("customer_tiers", None)
        tier_discount = customer_tier["discount_percentage"] if customer_tier else 0
        
        # Validate storage location
        location_response = supabase.table("storage_locations")\
            .select("id")\
            .eq("id", sale_data.storage_location_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not location_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Storage location not found"
            )
        
        # Check stock availability for all items
        for item in sale_data.items:
            if item.quantity > 0:  # Only check for regular sales (not credit notes)
                available = await check_stock_availability(
                    supabase,
                    item.product_variant_id,
                    sale_data.storage_location_id,
                    item.quantity
                )
                
                if not available:
                    # Get variant name for error message
                    variant_response = supabase.table("product_variants")\
                        .select("variant_name")\
                        .eq("id", item.product_variant_id)\
                        .execute()
                    
                    variant_name = variant_response.data[0]["variant_name"] if variant_response.data else "Product"
                    
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for {variant_name}"
                    )
        
        # Calculate totals
        subtotal = 0
        for item in sale_data.items:
            item_subtotal = item.quantity * item.unit_price
            subtotal += item_subtotal
        
        discount_percentage = tier_discount
        discount_amount = (subtotal * discount_percentage) / 100
        total_amount = subtotal - discount_amount
        
        # Check credit limit (skip for walk-in customers)
        if customer["customer_type"] != "walk-in":
            new_balance = customer["current_balance"] + total_amount
            if new_balance > customer["credit_limit"]:
                available_credit = customer["credit_limit"] - customer["current_balance"]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Credit limit exceeded. Available credit: KES {available_credit:,.2f}"
                )
        
        # Generate sale number
        sale_number_response = supabase.rpc(
            "generate_sale_number",
            {"p_company_id": company["id"], "p_sale_type": sale_data.sale_type.value}
        ).execute()
        
        sale_number = sale_number_response.data
        
        # Create sale
        sale_response = supabase.table("sales").insert({
            "company_id": company["id"],
            "customer_id": sale_data.customer_id,
            "sale_number": sale_number,
            "sale_type": sale_data.sale_type.value,
            "original_sale_id": sale_data.original_sale_id,
            "sale_date": sale_data.sale_date.isoformat(),
            "storage_location_id": sale_data.storage_location_id,
            "subtotal": subtotal,
            "discount_percentage": discount_percentage,
            "discount_amount": discount_amount,
            "total_amount": total_amount,
            "payment_status": "unpaid",
            "amount_paid": 0,
            "amount_due": total_amount,
            "notes": sale_data.notes,
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None
        }).execute()
        
        if not sale_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create sale"
            )
        
        sale = sale_response.data[0]
        sale_id = sale["id"]
        
        # Create sale items and update inventory
        for item in sale_data.items:
            item_discount_amount = (item.quantity * item.unit_price * discount_percentage) / 100
            line_total = (item.quantity * item.unit_price) - item_discount_amount
            
            supabase.table("sale_items").insert({
                "sale_id": sale_id,
                "product_variant_id": item.product_variant_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "discount_percentage": discount_percentage,
                "discount_amount": item_discount_amount,
                "line_total": line_total
            }).execute()
            
            # Update inventory
            await update_inventory_from_sale(
                supabase,
                company["id"],
                item.product_variant_id,
                sale_data.storage_location_id,
                item.quantity,
                sale_id,
                sale_number
            )
        
        # Update customer balance
        new_customer_balance = customer["current_balance"] + total_amount
        supabase.table("customers")\
            .update({"current_balance": new_customer_balance})\
            .eq("id", sale_data.customer_id)\
            .execute()
        
        return sale
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[SaleWithDetails])
async def get_sales(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    sale_type: Optional[SaleType] = Query(None),
    payment_status: Optional[PaymentStatus] = Query(None),
    customer_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    limit: int = Query(100, le=500)
):
    """Get all sales with filters"""
    try:
        query = supabase.table("sales")\
            .select("*, customers(id, name, customer_type), storage_locations(id, name), original_sale:sales!original_sale_id(sale_number, sale_type)")\
            .eq("company_id", company["id"])\
            .order("created_at", desc=True)\
            .limit(limit)
        
        if sale_type:
            query = query.eq("sale_type", sale_type.value)
        
        if payment_status:
            query = query.eq("payment_status", payment_status.value)
        
        if customer_id:
            query = query.eq("customer_id", customer_id)
        
        if from_date:
            query = query.gte("sale_date", from_date.isoformat())
        
        if to_date:
            query = query.lte("sale_date", to_date.isoformat())
        
        response = query.execute()
        
        sales = []
        for sale in response.data:
            # Extract nested data
            customer = sale.pop("customers", None)
            location = sale.pop("storage_locations", None)
            original = sale.pop("original_sale", None)
            
            sale["customer"] = customer
            sale["storage_location"] = location
            # Supabase returns array - get first item or None
            sale["original_sale"] = original[0] if original and len(original) > 0 else None

            # Get sale items
            items_response = supabase.table("sale_items")\
                .select("*, product_variants(id, variant_name, sku, products(name))")\
                .eq("sale_id", sale["id"])\
                .execute()
            
            items = []
            for item in items_response.data:
                variant = item.pop("product_variants", None)
                item["product_variant"] = variant
                items.append(item)
            
            sale["items"] = items
            
            # Get payments
            payments_response = supabase.table("sale_payments")\
                .select("*")\
                .eq("sale_id", sale["id"])\
                .order("payment_date", desc=True)\
                .execute()
            
            sale["payments"] = payments_response.data
            
            sales.append(sale)
        
        return sales
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
@router.get("/{sale_id}/pdf")
async def download_sale_pdf(
    sale_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Download sale as PDF"""
    try:
        # Get sale data
        response = supabase.table("sales")\
            .select("*, customers(id, name, customer_type, email, phone), storage_locations(id, name), original_sale:sales!original_sale_id(sale_number, sale_type)")\
            .match({"id": sale_id, "company_id": company["id"]})\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale not found"
            )
        
        sale = response.data[0]
        
        # Extract nested data
        customer = sale.pop("customers", None)
        location = sale.pop("storage_locations", None)
        original = sale.pop("original_sale", None)
        
        sale["customer"] = customer
        sale["storage_location"] = location
        sale["original_sale"] = original[0] if original and len(original) > 0 else None

        # Get sale items
        items_response = supabase.table("sale_items")\
            .select("*, product_variants(id, variant_name, sku, products(name))")\
            .eq("sale_id", sale_id)\
            .execute()
        
        items = []
        for item in items_response.data:
            variant = item.pop("product_variants", None)
            item["product_variant"] = variant
            items.append(item)
        
        sale["items"] = items
        
        # Get payments
        payments_response = supabase.table("sale_payments")\
            .select("*")\
            .eq("sale_id", sale_id)\
            .order("payment_date", desc=True)\
            .execute()
        
        sale["payments"] = payments_response.data
        
        # Get company data
        company_data = {
            "name": company.get("name", "Company Name"),
            "address": company.get("address", "")
        }
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(sale, company_data)
        
        # Determine filename
        filename = f"{sale['sale_number']}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR generating PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{sale_id}", response_model=SaleWithDetails)
async def get_sale(
    sale_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific sale"""
    try:
        response = supabase.table("sales")\
            .select("*, customers(id, name, customer_type, email, phone), storage_locations(id, name), original_sale:sales!original_sale_id(sale_number, sale_type)")\
            .match({"id": sale_id, "company_id": company["id"]})\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale not found"
            )
        
        sale = response.data[0]
        
        # Extract nested data
        customer = sale.pop("customers", None)
        location = sale.pop("storage_locations", None)
        original = sale.pop("original_sale", None)
        
        sale["customer"] = customer
        sale["storage_location"] = location
        # Supabase returns array - get first item or None
        sale["original_sale"] = original[0] if original and len(original) > 0 else None

        # Get sale items
        items_response = supabase.table("sale_items")\
            .select("*, product_variants(id, variant_name, sku, products(name))")\
            .eq("sale_id", sale_id)\
            .execute()
        
        items = []
        for item in items_response.data:
            variant = item.pop("product_variants", None)
            item["product_variant"] = variant
            items.append(item)
        
        sale["items"] = items
        
        # Get payments
        payments_response = supabase.table("sale_payments")\
            .select("*")\
            .eq("sale_id", sale_id)\
            .order("payment_date", desc=True)\
            .execute()
        
        sale["payments"] = payments_response.data
        
        return sale
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
@router.post("/credit-notes/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_credit_note(
    credit_note_data: CreditNoteCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a credit note (return) from an original invoice"""
    try:
        # Get original sale
        original_sale_response = supabase.table("sales")\
            .select("*, customers(id, current_balance, customer_tiers(discount_percentage)), storage_locations(id)")\
            .match({"id": credit_note_data.original_sale_id, "company_id": company["id"]})\
            .execute()
        
        if not original_sale_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original sale not found"
            )
        
        original_sale = original_sale_response.data[0]
        
        # Verify original is an invoice (not a credit note)
        if original_sale["sale_type"] != "invoice":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only create credit notes for invoices"
            )
        
        customer = original_sale.pop("customers", None)
        customer_tier = customer.pop("customer_tiers", None)
        tier_discount = customer_tier["discount_percentage"] if customer_tier else 0
        storage_location = original_sale.pop("storage_locations", None)
        
        # Get original sale items
        original_items_response = supabase.table("sale_items")\
            .select("*")\
            .eq("sale_id", credit_note_data.original_sale_id)\
            .execute()
        
        original_items = {item["id"]: item for item in original_items_response.data}
        
        # Validate return quantities
        subtotal = 0
        credit_note_items = []
        
        for return_item in credit_note_data.items:
            if return_item.sale_item_id not in original_items:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Sale item {return_item.sale_item_id} not found in original sale"
                )
            
            original_item = original_items[return_item.sale_item_id]
            
            # Validate return quantity doesn't exceed original
            if return_item.return_quantity > original_item["quantity"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Return quantity ({return_item.return_quantity}) exceeds original quantity ({original_item['quantity']})"
                )
            
            # Calculate amounts (negative for credit notes)
            item_subtotal = -(return_item.return_quantity * original_item["unit_price"])
            subtotal += item_subtotal
            
            credit_note_items.append({
                "product_variant_id": original_item["product_variant_id"],
                "quantity": -return_item.return_quantity,
                "unit_price": original_item["unit_price"],
                "discount_percentage": tier_discount
            })
        
        # Calculate totals (all negative)
        discount_percentage = tier_discount
        discount_amount = (subtotal * discount_percentage) / 100
        total_amount = subtotal - discount_amount
        
        # Generate credit note number
        sale_number_response = supabase.rpc(
            "generate_sale_number",
            {"p_company_id": company["id"], "p_sale_type": "credit_note"}
        ).execute()
        
        sale_number = sale_number_response.data
        
        # Create credit note
        credit_note_response = supabase.table("sales").insert({
            "company_id": company["id"],
            "customer_id": original_sale["customer_id"],
            "sale_number": sale_number,
            "sale_type": "credit_note",
            "original_sale_id": credit_note_data.original_sale_id,
            "sale_date": credit_note_data.sale_date.isoformat(),
            "storage_location_id": original_sale["storage_location_id"],
            "subtotal": subtotal,
            "discount_percentage": discount_percentage,
            "discount_amount": discount_amount,
            "total_amount": total_amount,
            "payment_status": "unpaid",
            "amount_paid": 0,
            "amount_due": total_amount,
            "notes": credit_note_data.notes,
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None
        }).execute()
        
        if not credit_note_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create credit note"
            )
        
        credit_note = credit_note_response.data[0]
        credit_note_id = credit_note["id"]
        
        # Create credit note items and update inventory
        for item in credit_note_items:
            item_discount_amount = (item["quantity"] * item["unit_price"] * discount_percentage) / 100
            line_total = (item["quantity"] * item["unit_price"]) - item_discount_amount
            
            supabase.table("sale_items").insert({
                "sale_id": credit_note_id,
                "product_variant_id": item["product_variant_id"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "discount_percentage": discount_percentage,
                "discount_amount": item_discount_amount,
                "line_total": line_total
            }).execute()
            
            # Update inventory (add stock back)
            await update_inventory_from_sale(
                supabase,
                company["id"],
                item["product_variant_id"],
                original_sale["storage_location_id"],
                item["quantity"],
                credit_note_id,
                sale_number,
                is_credit_note=True
            )
        
        # Update customer balance (decrease by credit note amount - which is negative)
        new_customer_balance = customer["current_balance"] + total_amount
        supabase.table("customers")\
            .update({"current_balance": new_customer_balance})\
            .eq("id", original_sale["customer_id"])\
            .execute()
        
        return credit_note
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/payments/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def record_payment(
    payment_data: SalePaymentCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Record a payment for a sale"""
    try:
        # Validate payment method and reference number
        if payment_data.payment_method in ["mpesa", "bank", "card"] and not payment_data.reference_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reference number is required for {payment_data.payment_method} payments"
            )
        
        if payment_data.payment_method == "cash" and payment_data.reference_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reference number should not be provided for cash payments"
            )
        
        # Get sale
        sale_response = supabase.table("sales")\
            .select("*, customers(id, current_balance)")\
            .eq("id", payment_data.sale_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not sale_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale not found"
            )
        
        sale = sale_response.data[0]
        customer = sale.pop("customers", None)
        
        # Validate payment amount doesn't exceed amount due
        if payment_data.amount > sale["amount_due"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount (KES {payment_data.amount:,.2f}) exceeds amount due (KES {sale['amount_due']:,.2f})"
            )
        
        # Create payment record
        payment_response = supabase.table("sale_payments").insert({
            "sale_id": payment_data.sale_id,
            "payment_date": payment_data.payment_date.isoformat(),
            "amount": payment_data.amount,
            "payment_method": payment_data.payment_method.value,
            "reference_number": payment_data.reference_number,
            "notes": payment_data.notes,
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None
        }).execute()
        
        if not payment_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create payment"
            )
        
        # Update sale payment status
        new_amount_paid = sale["amount_paid"] + payment_data.amount
        new_amount_due = sale["amount_due"] - payment_data.amount
        
        if new_amount_due <= 0:
            new_payment_status = "paid"
        elif new_amount_paid > 0:
            new_payment_status = "partial"
        else:
            new_payment_status = "unpaid"
        
        supabase.table("sales")\
            .update({
                "amount_paid": new_amount_paid,
                "amount_due": new_amount_due,
                "payment_status": new_payment_status
            })\
            .eq("id", payment_data.sale_id)\
            .execute()
        
        # Update customer balance (decrease by payment amount)
        new_customer_balance = customer["current_balance"] - payment_data.amount
        supabase.table("customers")\
            .update({"current_balance": new_customer_balance})\
            .eq("id", sale["customer_id"])\
            .execute()
        
        return {
            "message": "Payment recorded successfully",
            "payment": payment_response.data[0],
            "updated_sale": {
                "payment_status": new_payment_status,
                "amount_paid": new_amount_paid,
                "amount_due": new_amount_due
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/payments/{sale_id}/", response_model=List[SalePaymentResponse])
async def get_sale_payments(
    sale_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get all payments for a sale"""
    try:
        # Verify sale exists and belongs to company
        sale_response = supabase.table("sales")\
            .select("id")\
            .eq("id", sale_id)\
            .eq("company_id", company["id"])\
            .execute()
        
        if not sale_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale not found"
            )
        
        # Get payments
        payments_response = supabase.table("sale_payments")\
            .select("*")\
            .eq("sale_id", sale_id)\
            .order("payment_date", desc=True)\
            .execute()
        
        return payments_response.data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )