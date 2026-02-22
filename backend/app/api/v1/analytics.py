from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from decimal import Decimal
from datetime import date, timedelta
from app.schemas.analytics import (
    SalesOverview,
    SalesByPeriod,
    CreditNotesByPeriod,
    DailySalesTrend,
    InventorySummary,
    InventoryPaymentStatus,
    LowStockAlert,
    StockMovementSummary,
    CustomerSalesAnalysis,
    CustomerPaymentAnalysis,
    TopCustomer,
    TopSellingProduct,
    SalesByCategory,
    PaymentCollectionRate,
    ExpenseSummary,
    ExpensesByPeriod,
    ExpensesByCategory,
    OutgoingPaymentsSummary,
    OutgoingExpensePayments,
    CreditNoteRefunds,
    IncomingPaymentsSummary,
    DashboardSummary
)
from app.api.deps import get_current_user, get_current_company, require_admin
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter(dependencies=[Depends(require_admin)])

# ==========================================
# SALES ANALYTICS
# ==========================================

@router.get("/sales/overview", response_model=SalesOverview)
async def get_sales_overview(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("sales_overview")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return SalesOverview(
                company_id=company["id"],
                total_invoices=0,
                total_invoice_amount=Decimal("0"),
                paid_invoices=0,
                paid_invoice_amount=Decimal("0"),
                unpaid_invoices=0,
                unpaid_invoice_amount=Decimal("0"),
                partial_invoices=0,
                partial_invoice_amount=Decimal("0"),
                partial_amount_paid=Decimal("0"),
                partial_amount_due=Decimal("0"),
                total_outstanding=Decimal("0"),
                total_returns=0,
                total_return_amount=Decimal("0"),
                net_sales=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sales/by-period", response_model=SalesByPeriod)
async def get_sales_by_period(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("sales_by_period")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return SalesByPeriod(
                company_id=company["id"],
                today_sales=Decimal("0"),
                today_invoice_count=0,
                week_sales=Decimal("0"),
                week_invoice_count=0,
                month_sales=Decimal("0"),
                month_invoice_count=0,
                year_sales=Decimal("0"),
                year_invoice_count=0
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sales/credit-notes-by-period", response_model=CreditNotesByPeriod)
async def get_credit_notes_by_period(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("credit_notes_by_period")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return CreditNotesByPeriod(
                company_id=company["id"],
                today_returns=Decimal("0"),
                week_returns=Decimal("0"),
                month_returns=Decimal("0"),
                year_returns=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sales/daily-trend", response_model=List[DailySalesTrend])
async def get_daily_sales_trend(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    days: int = Query(30, ge=1, le=365)
):
    try:
        response = supabase.table("daily_sales_trend")\
            .select("*")\
            .eq("company_id", company["id"])\
            .order("sale_date", desc=True)\
            .limit(days)\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# INVENTORY ANALYTICS
# ==========================================

@router.get("/inventory/summary", response_model=InventorySummary)
async def get_inventory_summary(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("inventory_summary")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return InventorySummary(
                company_id=company["id"],
                total_variants=0,
                total_units=0,
                total_inventory_value_cost=Decimal("0"),
                total_inventory_value_retail=Decimal("0"),
                potential_profit=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/inventory/payment-status", response_model=InventoryPaymentStatus)
async def get_inventory_payment_status(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("inventory_payment_status")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return InventoryPaymentStatus(
                company_id=company["id"],
                paid_stock_transactions=0,
                paid_stock_value=Decimal("0"),
                unpaid_stock_transactions=0,
                unpaid_stock_value=Decimal("0"),
                partial_stock_transactions=0,
                partial_stock_value=Decimal("0"),
                partial_amount_paid=Decimal("0"),
                total_outstanding=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/inventory/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("low_stock_alerts")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/inventory/stock-movement", response_model=List[StockMovementSummary])
async def get_stock_movement(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("stock_movement_summary")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# CUSTOMER ANALYTICS
# ==========================================

@router.get("/customers/sales-analysis", response_model=List[CustomerSalesAnalysis])
async def get_customer_sales_analysis(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(100, le=500)
):
    try:
        response = supabase.table("customer_sales_analysis")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/customers/payment-analysis", response_model=List[CustomerPaymentAnalysis])
async def get_customer_payment_analysis(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(100, le=500)
):
    try:
        response = supabase.table("customer_payment_analysis")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/customers/top-customers", response_model=List[TopCustomer])
async def get_top_customers(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(10, le=50)
):
    try:
        response = supabase.table("top_customers_by_sales")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# PRODUCT ANALYTICS
# ==========================================

@router.get("/products/top-selling", response_model=List[TopSellingProduct])
async def get_top_selling_products(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(10, le=50)
):
    try:
        response = supabase.table("top_selling_products")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/products/sales-by-category", response_model=List[SalesByCategory])
async def get_sales_by_category(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("sales_by_category")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# PAYMENT ANALYTICS
# ==========================================

@router.get("/payments/collection-rate", response_model=PaymentCollectionRate)
async def get_payment_collection_rate(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("payment_collection_rate")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return PaymentCollectionRate(
                company_id=company["id"],
                total_invoices=0,
                total_billed=Decimal("0"),
                total_collected=Decimal("0"),
                collection_rate_percentage=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# EXPENSE ANALYTICS
# ==========================================

@router.get("/expenses/summary", response_model=ExpenseSummary)
async def get_expense_summary(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("expense_summary")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return ExpenseSummary(
                company_id=company["id"],
                total_standard_expenses=0,
                total_standard_amount=Decimal("0"),
                total_sales_expenses=0,
                total_sales_amount=Decimal("0"),
                total_expenses=0,
                total_amount=Decimal("0"),
                total_paid=Decimal("0"),
                total_outstanding=Decimal("0"),
                unpaid_count=0,
                unpaid_amount=Decimal("0"),
                partial_count=0,
                partial_outstanding=Decimal("0"),
                paid_count=0,
                paid_amount=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/expenses/by-period", response_model=ExpensesByPeriod)
async def get_expenses_by_period(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("expenses_by_period")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return ExpensesByPeriod(
                company_id=company["id"],
                today_expenses=Decimal("0"),
                today_count=0,
                week_expenses=Decimal("0"),
                week_count=0,
                month_expenses=Decimal("0"),
                month_count=0,
                year_expenses=Decimal("0"),
                year_count=0
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/expenses/by-category", response_model=List[ExpensesByCategory])
async def get_expenses_by_category(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("expenses_by_category")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# OUTGOING PAYMENTS
# ==========================================

@router.get("/payments/outgoing-inventory", response_model=OutgoingPaymentsSummary)
async def get_outgoing_inventory_payments(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("outgoing_payments_summary")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return OutgoingPaymentsSummary(
                company_id=company["id"],
                inventory_outstanding=Decimal("0"),
                inventory_paid_this_month=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/payments/outgoing-expenses", response_model=OutgoingExpensePayments)
async def get_outgoing_expense_payments(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("outgoing_expense_payments")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return OutgoingExpensePayments(
                company_id=company["id"],
                expense_outstanding=Decimal("0"),
                expense_paid_this_month=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/payments/credit-note-refunds", response_model=CreditNoteRefunds)
async def get_credit_note_refunds(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("credit_note_refunds")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return CreditNoteRefunds(
                company_id=company["id"],
                refunds_outstanding=Decimal("0"),
                refunds_paid_this_month=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# INCOMING PAYMENTS
# ==========================================

@router.get("/payments/incoming", response_model=IncomingPaymentsSummary)
async def get_incoming_payments(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        response = supabase.table("incoming_payments_summary")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()

        if not response.data or len(response.data) == 0:
            return IncomingPaymentsSummary(
                company_id=company["id"],
                unpaid_invoice_count=0,
                unpaid_invoice_amount=Decimal("0"),
                partial_invoice_count=0,
                partial_invoice_amount=Decimal("0"),
                total_pending_incoming=Decimal("0")
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# DASHBOARD SUMMARY
# ==========================================

@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    try:
        sales_by_period = await get_sales_by_period(current_user, company, supabase)
        credit_notes_by_period = await get_credit_notes_by_period(current_user, company, supabase)
        expenses_by_period = await get_expenses_by_period(current_user, company, supabase)
        outgoing_inventory = await get_outgoing_inventory_payments(current_user, company, supabase)
        outgoing_expenses = await get_outgoing_expense_payments(current_user, company, supabase)
        outgoing_credit_notes = await get_credit_note_refunds(current_user, company, supabase)
        incoming_payments = await get_incoming_payments(current_user, company, supabase)
        sales_overview = await get_sales_overview(current_user, company, supabase)
        inventory_summary = await get_inventory_summary(current_user, company, supabase)
        low_stock = await get_low_stock_alerts(current_user, company, supabase)
        top_customers = await get_top_customers(current_user, company, supabase, limit=5)
        top_products = await get_top_selling_products(current_user, company, supabase, limit=5)
        collection_rate = await get_payment_collection_rate(current_user, company, supabase)
        expense_summary = await get_expense_summary(current_user, company, supabase)

        return DashboardSummary(
            sales_by_period=sales_by_period,
            credit_notes_by_period=credit_notes_by_period,
            expenses_by_period=expenses_by_period,
            outgoing_inventory=outgoing_inventory,
            outgoing_expenses=outgoing_expenses,
            outgoing_credit_notes=outgoing_credit_notes,
            incoming_payments=incoming_payments,
            sales_overview=sales_overview,
            inventory_summary=inventory_summary,
            low_stock_count=len(low_stock),
            top_customers=top_customers,
            top_products=top_products,
            payment_collection_rate=collection_rate,
            expense_summary=expense_summary
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))