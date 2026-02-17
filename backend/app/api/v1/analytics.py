from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import date, timedelta
from app.schemas.analytics import (
    SalesOverview,
    SalesByPeriod,
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
    DashboardSummary
)
from app.api.deps import get_current_user, get_current_company
from app.utils.supabase import get_supabase
from supabase import Client

router = APIRouter()

# ==========================================
# SALES ANALYTICS
# ==========================================

@router.get("/sales/overview", response_model=SalesOverview)
async def get_sales_overview(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get complete sales overview metrics"""
    try:
        response = supabase.table("sales_overview")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data or len(response.data) == 0:
            # Return zeros if no data
            return SalesOverview(
                company_id=company["id"],
                total_invoices=0,
                total_invoice_amount=0,
                paid_invoices=0,
                paid_invoice_amount=0,
                unpaid_invoices=0,
                unpaid_invoice_amount=0,
                partial_invoices=0,
                partial_invoice_amount=0,
                partial_amount_paid=0,
                partial_amount_due=0,
                total_outstanding=0,
                total_returns=0,
                total_return_amount=0,
                net_sales=0
            )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/sales/by-period", response_model=SalesByPeriod)
async def get_sales_by_period(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get sales aggregated by time periods"""
    try:
        response = supabase.table("sales_by_period")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data or len(response.data) == 0:
            return SalesByPeriod(
                company_id=company["id"],
                today_sales=0,
                today_invoice_count=0,
                week_sales=0,
                week_invoice_count=0,
                month_sales=0,
                month_invoice_count=0,
                year_sales=0,
                year_invoice_count=0
            )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/sales/daily-trend", response_model=List[DailySalesTrend])
async def get_daily_sales_trend(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    days: int = Query(30, ge=1, le=365)
):
    """Get daily sales trend for charts"""
    try:
        response = supabase.table("daily_sales_trend")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(days)\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ==========================================
# INVENTORY ANALYTICS
# ==========================================

@router.get("/inventory/summary", response_model=InventorySummary)
async def get_inventory_summary(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get inventory value and metrics"""
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
                total_inventory_value_cost=0,
                total_inventory_value_retail=0,
                potential_profit=0
            )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/inventory/payment-status", response_model=InventoryPaymentStatus)
async def get_inventory_payment_status(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get inventory payment status"""
    try:
        response = supabase.table("inventory_payment_status")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data or len(response.data) == 0:
            return InventoryPaymentStatus(
                company_id=company["id"],
                paid_stock_transactions=0,
                paid_stock_value=0,
                unpaid_stock_transactions=0,
                unpaid_stock_value=0,
                partial_stock_transactions=0,
                partial_stock_value=0,
                partial_amount_paid=0,
                total_outstanding=0
            )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/inventory/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get products with low stock"""
    try:
        response = supabase.table("low_stock_alerts")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/inventory/stock-movement", response_model=List[StockMovementSummary])
async def get_stock_movement(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get stock movement summary (last 30 days)"""
    try:
        response = supabase.table("stock_movement_summary")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

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
    """Get customer sales analysis"""
    try:
        response = supabase.table("customer_sales_analysis")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/customers/payment-analysis", response_model=List[CustomerPaymentAnalysis])
async def get_customer_payment_analysis(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(100, le=500)
):
    """Get customer payment analysis"""
    try:
        response = supabase.table("customer_payment_analysis")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/customers/top-customers", response_model=List[TopCustomer])
async def get_top_customers(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase),
    limit: int = Query(10, le=50)
):
    """Get top customers by sales"""
    try:
        response = supabase.table("top_customers_by_sales")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

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
    """Get top selling products"""
    try:
        response = supabase.table("top_selling_products")\
            .select("*")\
            .eq("company_id", company["id"])\
            .limit(limit)\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/products/sales-by-category", response_model=List[SalesByCategory])
async def get_sales_by_category(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get sales breakdown by category"""
    try:
        response = supabase.table("sales_by_category")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ==========================================
# PAYMENT ANALYTICS
# ==========================================

@router.get("/payments/collection-rate", response_model=PaymentCollectionRate)
async def get_payment_collection_rate(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get payment collection efficiency"""
    try:
        response = supabase.table("payment_collection_rate")\
            .select("*")\
            .eq("company_id", company["id"])\
            .execute()
        
        if not response.data or len(response.data) == 0:
            return PaymentCollectionRate(
                company_id=company["id"],
                total_invoices=0,
                total_billed=0,
                total_collected=0,
                collection_rate_percentage=0
            )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ==========================================
# DASHBOARD SUMMARY
# ==========================================

@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user = Depends(get_current_user),
    company = Depends(get_current_company),
    supabase: Client = Depends(get_supabase)
):
    """Get complete dashboard summary (all key metrics)"""
    try:
        # Fetch all metrics in parallel
        sales_overview = await get_sales_overview(current_user, company, supabase)
        sales_by_period = await get_sales_by_period(current_user, company, supabase)
        inventory_summary = await get_inventory_summary(current_user, company, supabase)
        inventory_payment = await get_inventory_payment_status(current_user, company, supabase)
        low_stock = await get_low_stock_alerts(current_user, company, supabase)
        top_customers = await get_top_customers(current_user, company, supabase, limit=5)
        top_products = await get_top_selling_products(current_user, company, supabase, limit=5)
        collection_rate = await get_payment_collection_rate(current_user, company, supabase)
        
        return DashboardSummary(
            sales_overview=sales_overview,
            sales_by_period=sales_by_period,
            inventory_summary=inventory_summary,
            inventory_payment_status=inventory_payment,
            low_stock_count=len(low_stock),
            top_customers=top_customers,
            top_products=top_products,
            payment_collection_rate=collection_rate
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )