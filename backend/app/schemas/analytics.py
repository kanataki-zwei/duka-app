from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

# ==========================================
# SALES METRICS
# ==========================================

class SalesOverview(BaseModel):
    company_id: str
    total_invoices: int
    total_invoice_amount: Decimal
    paid_invoices: int
    paid_invoice_amount: Decimal
    unpaid_invoices: int
    unpaid_invoice_amount: Decimal
    partial_invoices: int
    partial_invoice_amount: Decimal
    partial_amount_paid: Decimal
    partial_amount_due: Decimal
    total_outstanding: Decimal
    total_returns: int
    total_return_amount: Decimal
    net_sales: Decimal

    class Config:
        from_attributes = True

class SalesByPeriod(BaseModel):
    company_id: str
    today_sales: Decimal
    today_invoice_count: int
    week_sales: Decimal
    week_invoice_count: int
    month_sales: Decimal
    month_invoice_count: int
    year_sales: Decimal
    year_invoice_count: int

    class Config:
        from_attributes = True

class CreditNotesByPeriod(BaseModel):
    company_id: str
    today_returns: Decimal
    week_returns: Decimal
    month_returns: Decimal
    year_returns: Decimal

    class Config:
        from_attributes = True

class DailySalesTrend(BaseModel):
    company_id: str
    sale_date: date
    invoice_count: int
    daily_sales: Decimal
    daily_returns: Decimal
    net_daily_sales: Decimal

    class Config:
        from_attributes = True

# ==========================================
# INVENTORY METRICS
# ==========================================

class InventorySummary(BaseModel):
    company_id: str
    total_variants: int
    total_units: int
    total_inventory_value_cost: Decimal
    total_inventory_value_retail: Decimal
    potential_profit: Decimal

    class Config:
        from_attributes = True

class InventoryPaymentStatus(BaseModel):
    company_id: str
    paid_stock_transactions: int
    paid_stock_value: Decimal
    unpaid_stock_transactions: int
    unpaid_stock_value: Decimal
    partial_stock_transactions: int
    partial_stock_value: Decimal
    partial_amount_paid: Decimal
    total_outstanding: Decimal

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
    unit_cost: Decimal
    estimated_reorder_cost: Decimal
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
    discount_percentage: Optional[Decimal]
    total_invoices: int
    total_sales: Decimal
    average_invoice_value: Optional[Decimal]
    total_returns: int
    total_return_amount: Decimal
    net_sales: Decimal
    last_purchase_date: Optional[date]
    current_balance: Decimal
    credit_limit: Decimal
    available_credit: Decimal

    class Config:
        from_attributes = True

class CustomerPaymentAnalysis(BaseModel):
    company_id: str
    customer_id: str
    customer_name: str
    fully_paid_invoices: int
    fully_paid_amount: Decimal
    unpaid_invoices: int
    unpaid_amount: Decimal
    partial_invoices: int
    partial_total_amount: Decimal
    partial_amount_paid: Decimal
    partial_amount_due: Decimal
    total_outstanding: Decimal
    payment_behavior: str

    class Config:
        from_attributes = True

class TopCustomer(BaseModel):
    company_id: str
    customer_id: str
    customer_name: str
    customer_type: str
    total_sales: Decimal
    invoice_count: int
    average_order_value: Optional[Decimal]

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
    total_revenue: Decimal
    number_of_sales: int
    average_selling_price: Decimal
    total_cost: Decimal
    gross_profit: Decimal

    class Config:
        from_attributes = True

class SalesByCategory(BaseModel):
    company_id: str
    category_id: Optional[str]
    category_name: Optional[str]
    transactions: int
    units_sold: int
    total_revenue: Decimal
    average_transaction_value: Decimal

    class Config:
        from_attributes = True

class PaymentCollectionRate(BaseModel):
    company_id: str
    total_invoices: int
    total_billed: Decimal
    total_collected: Decimal
    collection_rate_percentage: Decimal

    class Config:
        from_attributes = True

# ==========================================
# EXPENSE ANALYTICS
# ==========================================

class ExpenseSummary(BaseModel):
    company_id: str
    total_standard_expenses: int
    total_standard_amount: Decimal
    total_sales_expenses: int
    total_sales_amount: Decimal
    total_expenses: int
    total_amount: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    unpaid_count: int
    unpaid_amount: Decimal
    partial_count: int
    partial_outstanding: Decimal
    paid_count: int
    paid_amount: Decimal

    class Config:
        from_attributes = True

class ExpensesByPeriod(BaseModel):
    company_id: str
    today_expenses: Decimal
    today_count: int
    week_expenses: Decimal
    week_count: int
    month_expenses: Decimal
    month_count: int
    year_expenses: Decimal
    year_count: int

    class Config:
        from_attributes = True

class ExpensesByCategory(BaseModel):
    company_id: str
    category_id: str
    category_name: str
    expense_type: str
    expense_count: int
    total_amount: Decimal
    total_paid: Decimal
    total_outstanding: Decimal

    class Config:
        from_attributes = True

# ==========================================
# OUTGOING PAYMENTS
# ==========================================

class OutgoingPaymentsSummary(BaseModel):
    company_id: str
    inventory_outstanding: Decimal
    inventory_paid_this_month: Decimal

    class Config:
        from_attributes = True

class OutgoingExpensePayments(BaseModel):
    company_id: str
    expense_outstanding: Decimal
    expense_paid_this_month: Decimal

    class Config:
        from_attributes = True

class CreditNoteRefunds(BaseModel):
    company_id: str
    refunds_outstanding: Decimal
    refunds_paid_this_month: Decimal

    class Config:
        from_attributes = True

# ==========================================
# INCOMING PAYMENTS
# ==========================================

class IncomingPaymentsSummary(BaseModel):
    company_id: str
    unpaid_invoice_count: int
    unpaid_invoice_amount: Decimal
    partial_invoice_count: int
    partial_invoice_amount: Decimal
    total_pending_incoming: Decimal

    class Config:
        from_attributes = True

# ==========================================
# DASHBOARD SUMMARY
# ==========================================

class DashboardSummary(BaseModel):
    # Row 1 - Sales by period
    sales_by_period: Optional[SalesByPeriod]
    credit_notes_by_period: Optional[CreditNotesByPeriod]
    # Row 2 - Expenses by period
    expenses_by_period: Optional[ExpensesByPeriod]
    # Row 3 - Outgoing payments
    outgoing_inventory: Optional[OutgoingPaymentsSummary]
    outgoing_expenses: Optional[OutgoingExpensePayments]
    outgoing_credit_notes: Optional[CreditNoteRefunds]
    # Row 4 - Incoming payments
    incoming_payments: Optional[IncomingPaymentsSummary]
    # Supporting data
    sales_overview: Optional[SalesOverview]
    inventory_summary: Optional[InventorySummary]
    low_stock_count: int
    top_customers: list[TopCustomer]
    top_products: list[TopSellingProduct]
    payment_collection_rate: Optional[PaymentCollectionRate]
    expense_summary: Optional[ExpenseSummary]