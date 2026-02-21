from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal
from app.schemas.expenses import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseWithDetails,
    ExpensePaymentCreate,
    ExpensePaymentResponse,
    ExpenseType,
    ExpensePaymentStatus
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()


def to_float(value) -> float:
    """Convert Decimal to float for Supabase insertion"""
    return float(value) if value is not None else None


def generate_recurring_dates(
    start_date: date,
    frequency: str,
    day_of_week: Optional[int],
    day_of_month: Optional[int],
    end_date: Optional[date],
    max_occurrences: int = 12
) -> List[date]:
    """Generate future dates for recurring expenses"""
    dates = []
    current = start_date

    if end_date:
        boundary = min(end_date, start_date + timedelta(days=365))
    else:
        boundary = start_date + timedelta(days=365)

    if frequency == "weekly":
        days_ahead = day_of_week - current.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        current = current + timedelta(days=days_ahead)

        while current <= boundary and len(dates) < max_occurrences:
            dates.append(current)
            current += timedelta(weeks=1)

    elif frequency == "monthly":
        month = current.month
        year = current.year

        for _ in range(max_occurrences):
            month += 1
            if month > 12:
                month = 1
                year += 1

            import calendar
            last_day = calendar.monthrange(year, month)[1]
            actual_day = min(day_of_month, last_day)

            next_date = date(year, month, actual_day)

            if next_date > boundary:
                break

            dates.append(next_date)

    return dates


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Create a new expense, with optional recurring schedule"""
    try:
        # Validate category exists and matches expense type
        category_response = supabase.table("expense_categories")\
            .select("id, expense_type")\
            .eq("id", expense_data.expense_category_id)\
            .eq("company_id", company["id"])\
            .eq("is_active", True)\
            .execute()

        if not category_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense category not found"
            )

        category = category_response.data[0]
        if category["expense_type"] != expense_data.expense_type.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category is for {category['expense_type']} expenses, not {expense_data.expense_type.value}"
            )

        # Validate sales expense has a sale_id
        if expense_data.expense_type == ExpenseType.sales and not expense_data.sale_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sales expenses must be linked to a sale"
            )

        # Validate supplier if provided
        if expense_data.supplier_id:
            supplier_response = supabase.table("suppliers")\
                .select("id")\
                .eq("id", expense_data.supplier_id)\
                .eq("company_id", company["id"])\
                .execute()

            if not supplier_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supplier not found"
                )

        # Validate sale if provided
        if expense_data.sale_id:
            sale_response = supabase.table("sales")\
                .select("id")\
                .eq("id", expense_data.sale_id)\
                .eq("company_id", company["id"])\
                .execute()

            if not sale_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Sale not found"
                )

        # Validate recurring fields
        if expense_data.is_recurring:
            if not expense_data.recurrence_frequency:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Recurrence frequency is required for recurring expenses"
                )
            if expense_data.recurrence_frequency.value == "weekly" and expense_data.recurrence_day_of_week is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Day of week is required for weekly recurring expenses"
                )
            if expense_data.recurrence_frequency.value == "monthly" and expense_data.recurrence_day_of_month is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Day of month is required for monthly recurring expenses"
                )

        # Build base expense record
        expense_record = {
            "company_id": company["id"],
            "expense_category_id": expense_data.expense_category_id,
            "expense_type": expense_data.expense_type.value,
            "title": expense_data.title,
            "description": expense_data.description,
            "amount": to_float(expense_data.amount),
            "supplier_id": expense_data.supplier_id,
            "sale_id": expense_data.sale_id,
            "payment_status": "unpaid",
            "amount_paid": 0,
            "amount_due": to_float(expense_data.amount),
            "is_recurring": expense_data.is_recurring,
            "recurrence_frequency": expense_data.recurrence_frequency.value if expense_data.recurrence_frequency else None,
            "recurrence_day_of_week": expense_data.recurrence_day_of_week,
            "recurrence_day_of_month": expense_data.recurrence_day_of_month,
            "recurrence_end_date": expense_data.recurrence_end_date.isoformat() if expense_data.recurrence_end_date else None,
            "expense_date": expense_data.expense_date.isoformat(),
            "notes": expense_data.notes,
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None
        }

        # Create the parent expense
        response = supabase.table("expenses").insert(expense_record).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create expense"
            )

        parent_expense = response.data[0]
        parent_id = parent_expense["id"]

        # Generate recurring child expenses
        if expense_data.is_recurring:
            recurring_dates = generate_recurring_dates(
                start_date=expense_data.expense_date,
                frequency=expense_data.recurrence_frequency.value,
                day_of_week=expense_data.recurrence_day_of_week,
                day_of_month=expense_data.recurrence_day_of_month,
                end_date=expense_data.recurrence_end_date,
            )

            for recurring_date in recurring_dates:
                child_record = {
                    **expense_record,
                    "expense_date": recurring_date.isoformat(),
                    "parent_expense_id": parent_id,
                    "payment_status": "unpaid",
                    "amount_paid": 0,
                    "amount_due": to_float(expense_data.amount),
                }
                supabase.table("expenses").insert(child_record).execute()

        return parent_expense

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[ExpenseWithDetails])
async def get_expenses(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    expense_type: Optional[ExpenseType] = Query(None),
    payment_status: Optional[ExpensePaymentStatus] = Query(None),
    category_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    include_recurring_children: bool = Query(True),
    limit: int = Query(100, le=500)
):
    """Get all expenses"""
    try:
        query = supabase.table("expenses")\
            .select("*, expense_categories(id, name, expense_type), suppliers(id, name), sales(id, sale_number, sale_type)")\
            .eq("company_id", company["id"])\
            .order("expense_date", desc=True)\
            .limit(limit)

        if expense_type:
            query = query.eq("expense_type", expense_type.value)

        if payment_status:
            query = query.eq("payment_status", payment_status.value)

        if category_id:
            query = query.eq("expense_category_id", category_id)

        if from_date:
            query = query.gte("expense_date", from_date.isoformat())

        if to_date:
            query = query.lte("expense_date", to_date.isoformat())

        if not include_recurring_children:
            query = query.is_("parent_expense_id", "null")

        response = query.execute()

        expenses = []
        for expense in response.data:
            category = expense.pop("expense_categories", None)
            supplier = expense.pop("suppliers", None)
            sale = expense.pop("sales", None)

            expense["category"] = category
            expense["supplier"] = supplier
            expense["sale"] = sale

            payments_response = supabase.table("expense_payments")\
                .select("*")\
                .eq("expense_id", expense["id"])\
                .order("payment_date", desc=True)\
                .execute()

            expense["payments"] = payments_response.data
            expenses.append(expense)

        return expenses

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{expense_id}", response_model=ExpenseWithDetails)
async def get_expense(
    expense_id: str,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific expense"""
    try:
        response = supabase.table("expenses")\
            .select("*, expense_categories(id, name, expense_type), suppliers(id, name), sales(id, sale_number, sale_type)")\
            .eq("id", expense_id)\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        expense = response.data[0]
        expense["category"] = expense.pop("expense_categories", None)
        expense["supplier"] = expense.pop("suppliers", None)
        expense["sale"] = expense.pop("sales", None)

        payments_response = supabase.table("expense_payments")\
            .select("*")\
            .eq("expense_id", expense_id)\
            .order("payment_date", desc=True)\
            .execute()

        expense["payments"] = payments_response.data

        return expense

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Update an expense"""
    try:
        existing = supabase.table("expenses")\
            .select("*")\
            .eq("id", expense_id)\
            .eq("company_id", company["id"])\
            .execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        update_data = {k: v for k, v in expense_data.model_dump().items() if v is not None}

        if "expense_date" in update_data:
            update_data["expense_date"] = update_data["expense_date"].isoformat()

        if "payment_status" in update_data:
            update_data["payment_status"] = update_data["payment_status"].value

        # Recalculate amount_due if amount changes
        if "amount" in update_data:
            current = existing.data[0]
            update_data["amount"] = to_float(update_data["amount"])
            update_data["amount_due"] = to_float(
                Decimal(str(update_data["amount"])) - Decimal(str(current["amount_paid"]))
            )

        response = supabase.table("expenses")\
            .update(update_data)\
            .eq("id", expense_id)\
            .execute()

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{expense_id}/payments", response_model=dict, status_code=status.HTTP_201_CREATED)
async def record_expense_payment(
    expense_id: str,
    payment_data: ExpensePaymentCreate,
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Record a payment for an expense"""
    try:
        expense_response = supabase.table("expenses")\
            .select("*")\
            .eq("id", expense_id)\
            .eq("company_id", company["id"])\
            .execute()

        if not expense_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        expense = expense_response.data[0]

        if payment_data.amount > Decimal(str(expense["amount_due"])):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount (KES {payment_data.amount:,.2f}) exceeds amount due (KES {expense['amount_due']:,.2f})"
            )

        # Validate reference number for non-cash payments
        if payment_data.payment_method.value in ["mpesa", "bank", "card"] and not payment_data.reference_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reference number is required for {payment_data.payment_method.value} payments"
            )

        # Create payment record
        payment_response = supabase.table("expense_payments").insert({
            "company_id": company["id"],
            "expense_id": expense_id,
            "amount": to_float(payment_data.amount),
            "payment_date": payment_data.payment_date.isoformat(),
            "payment_method": payment_data.payment_method.value,
            "reference_number": payment_data.reference_number,
            "notes": payment_data.notes,
            "created_by": current_user.get("id") if isinstance(current_user, dict) else None
        }).execute()

        if not payment_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to record payment"
            )

        # Update expense payment status
        new_amount_paid = Decimal(str(expense["amount_paid"])) + payment_data.amount
        new_amount_due = Decimal(str(expense["amount_due"])) - payment_data.amount

        if new_amount_due <= 0:
            new_payment_status = "paid"
        elif new_amount_paid > 0:
            new_payment_status = "partial"
        else:
            new_payment_status = "unpaid"

        supabase.table("expenses")\
            .update({
                "amount_paid": to_float(new_amount_paid),
                "amount_due": to_float(new_amount_due),
                "payment_status": new_payment_status
            })\
            .eq("id", expense_id)\
            .execute()

        return {
            "message": "Payment recorded successfully",
            "payment": payment_response.data[0],
            "updated_expense": {
                "payment_status": new_payment_status,
                "amount_paid": to_float(new_amount_paid),
                "amount_due": to_float(new_amount_due),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )