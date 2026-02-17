from pydantic import BaseModel
from typing import Optional
from datetime import date

# ==========================================
# SALES METRICS
# ==========================================

class SalesOverview(BaseModel):
    company_id: str
    total_invoices: int
    total_invoice_amount: float
    paid_invoices: int
    paid_invoice_amount: float
    unpaid_invoices: int
    unpaid_invoice_amount: float
    partial_invoices: int
    partial_invoice_amount: float
    partial_amount_paid: float
    partial_amount_due: float
    total_outstanding: float
    total_returns: int
    total_return_amount: float
    net_sales: float

    class Config:
        from_attributes = True

class SalesByPeriod(BaseModel):
    company_id: str
    today_sales: float
    today_invoice_count: int
    week_sales: float
    week_invoice_count: int
    month_sales: float
    month_invoice_count: int
    year_sales: float
    year_invoice_count: int

    class Config:
        from_attributes = True

class DailySalesTrend(BaseModel):
    company_id: str
    sale_date: date
    invoice_count: int
    daily_sales: float
    daily_returns: float
    net_daily_sales: float

    class Config:
        from_attributes = True

# ==========================================
# INVENTORY METRICS
# ==========================================

class InventorySummary(BaseModel):
    company_id: str
    total_variants: int
    total_units: int
    total_inventory_value_cost: float
    total_inventory_value_retail: float
    potential_profit: float

    class Config:
        from_attributes = True

class InventoryPaymentStatus(BaseModel):
    company_id: str
    paid_stock_transactions: int
    paid_stock_value: float
    unpaid_stock_transactions: int
    unpaid_stock_value: float
    partial_stock_transactions: int
    partial_stock_value: float
    partial_amount_paid: float
    total_outstanding: float

    class Config:
        from_attributes = True

class LowStockAlert(BaseModel):
    company_id: str
    variant_id: str
    product_id: str
    product_name: str
    variant_name: str
    sku: Optional[str]
    location_name: str
    current_stock: int
    reorder_threshold: int
    units_below_threshold: int
    unit_cost: float
    estimated_reorder_cost: float
    stock_status: str

    class Config:
        from_attributes = True

class StockMovementSummary(BaseModel):
    company_id: str
    variant_id: str
    product_name: str
    variant_name: str
    stock_in_transactions: int
    total_stock_in: int
    stock_out_transactions: int
    total_stock_out: int
    net_movement: int

    class Config:
        from_attributes = True

# ==========================================
# CUSTOMER ANALYTICS
# ==========================================

class CustomerSalesAnalysis(BaseModel):
    company_id: str
    customer_id: str
    customer_name: str
    customer_type: str
    tier_name: Optional[str]
    discount_percentage: Optional[float]
    total_invoices: int
    total_sales: float
    average_invoice_value: Optional[float]
    total_returns: int
    total_return_amount: float
    net_sales: float
    last_purchase_date: Optional[date]
    current_balance: float
    credit_limit: float
    available_credit: float

    class Config:
        from_attributes = True

class CustomerPaymentAnalysis(BaseModel):
    company_id: str
    customer_id: str
    customer_name: str
    fully_paid_invoices: int
    fully_paid_amount: float
    unpaid_invoices: int
    unpaid_amount: float
    partial_invoices: int
    partial_total_amount: float
    partial_amount_paid: float
    partial_amount_due: float
    total_outstanding: float
    payment_behavior: str

    class Config:
        from_attributes = True

class TopCustomer(BaseModel):
    company_id: str
    customer_id: str
    customer_name: str
    customer_type: str
    total_sales: float
    invoice_count: int
    average_order_value: Optional[float]

    class Config:
        from_attributes = True

# ==========================================
# PRODUCT ANALYTICS
# ==========================================

class TopSellingProduct(BaseModel):
    company_id: str
    variant_id: str
    product_id: str
    product_name: str
    variant_name: str
    sku: Optional[str]
    category_name: Optional[str]
    total_quantity_sold: int
    total_revenue: float
    number_of_sales: int
    average_selling_price: float
    total_cost: float
    gross_profit: float

    class Config:
        from_attributes = True

class SalesByCategory(BaseModel):
    company_id: str
    category_id: Optional[str]
    category_name: Optional[str]
    transactions: int
    units_sold: int
    total_revenue: float
    average_transaction_value: float

    class Config:
        from_attributes = True

class PaymentCollectionRate(BaseModel):
    company_id: str
    total_invoices: int
    total_billed: float
    total_collected: float
    collection_rate_percentage: float

    class Config:
        from_attributes = True

# ==========================================
# DASHBOARD SUMMARY
# ==========================================

class DashboardSummary(BaseModel):
    sales_overview: Optional[SalesOverview]
    sales_by_period: Optional[SalesByPeriod]
    inventory_summary: Optional[InventorySummary]
    inventory_payment_status: Optional[InventoryPaymentStatus]
    low_stock_count: int
    top_customers: list[TopCustomer]
    top_products: list[TopSellingProduct]
    payment_collection_rate: Optional[PaymentCollectionRate]