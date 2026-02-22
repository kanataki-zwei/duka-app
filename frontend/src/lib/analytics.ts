import { apiClient } from './axios';

// ==========================================
// TYPES
// ==========================================

export interface SalesOverview {
  company_id: string;
  total_invoices: number;
  total_invoice_amount: number;
  paid_invoices: number;
  paid_invoice_amount: number;
  unpaid_invoices: number;
  unpaid_invoice_amount: number;
  partial_invoices: number;
  partial_invoice_amount: number;
  partial_amount_paid: number;
  partial_amount_due: number;
  total_outstanding: number;
  total_returns: number;
  total_return_amount: number;
  net_sales: number;
}

export interface SalesByPeriod {
  company_id: string;
  today_sales: number;
  today_invoice_count: number;
  week_sales: number;
  week_invoice_count: number;
  month_sales: number;
  month_invoice_count: number;
  year_sales: number;
  year_invoice_count: number;
}

export interface CreditNotesByPeriod {
  company_id: string;
  today_returns: number;
  week_returns: number;
  month_returns: number;
  year_returns: number;
}

export interface DailySalesTrend {
  company_id: string;
  sale_date: string;
  invoice_count: number;
  daily_sales: number;
  daily_returns: number;
  net_daily_sales: number;
}

export interface InventorySummary {
  company_id: string;
  total_variants: number;
  total_units: number;
  total_inventory_value_cost: number;
  total_inventory_value_retail: number;
  potential_profit: number;
}

export interface LowStockAlert {
  company_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  location_name: string;
  current_stock: number;
  reorder_threshold: number;
  units_below_threshold: number;
  unit_cost: number;
  estimated_reorder_cost: number;
  stock_status: string;
}

export interface TopCustomer {
  company_id: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  total_sales: number;
  invoice_count: number;
  average_order_value: number | null;
}

export interface TopSellingProduct {
  company_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  category_name: string | null;
  total_quantity_sold: number;
  total_revenue: number;
  number_of_sales: number;
  average_selling_price: number;
  total_cost: number;
  gross_profit: number;
}

export interface PaymentCollectionRate {
  company_id: string;
  total_invoices: number;
  total_billed: number;
  total_collected: number;
  collection_rate_percentage: number;
}

export interface ExpenseSummary {
  company_id: string;
  total_standard_expenses: number;
  total_standard_amount: number;
  total_sales_expenses: number;
  total_sales_amount: number;
  total_expenses: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  unpaid_count: number;
  unpaid_amount: number;
  partial_count: number;
  partial_outstanding: number;
  paid_count: number;
  paid_amount: number;
}

export interface ExpensesByPeriod {
  company_id: string;
  today_expenses: number;
  today_count: number;
  week_expenses: number;
  week_count: number;
  month_expenses: number;
  month_count: number;
  year_expenses: number;
  year_count: number;
}

export interface ExpensesByCategory {
  company_id: string;
  category_id: string;
  category_name: string;
  expense_type: string;
  expense_count: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
}

export interface OutgoingPaymentsSummary {
  company_id: string;
  inventory_outstanding: number;
  inventory_paid_this_month: number;
}

export interface OutgoingExpensePayments {
  company_id: string;
  expense_outstanding: number;
  expense_paid_this_month: number;
}

export interface CreditNoteRefunds {
  company_id: string;
  refunds_outstanding: number;
  refunds_paid_this_month: number;
}

export interface IncomingPaymentsSummary {
  company_id: string;
  unpaid_invoice_count: number;
  unpaid_invoice_amount: number;
  partial_invoice_count: number;
  partial_invoice_amount: number;
  total_pending_incoming: number;
}

export interface DashboardSummary {
  // Row 1 - Sales
  sales_by_period: SalesByPeriod | null;
  credit_notes_by_period: CreditNotesByPeriod | null;
  // Row 2 - Expenses
  expenses_by_period: ExpensesByPeriod | null;
  // Row 3 - Outgoing payments
  outgoing_inventory: OutgoingPaymentsSummary | null;
  outgoing_expenses: OutgoingExpensePayments | null;
  outgoing_credit_notes: CreditNoteRefunds | null;
  // Row 4 - Incoming payments
  incoming_payments: IncomingPaymentsSummary | null;
  // Supporting data
  sales_overview: SalesOverview | null;
  inventory_summary: InventorySummary | null;
  low_stock_count: number;
  top_customers: TopCustomer[];
  top_products: TopSellingProduct[];
  payment_collection_rate: PaymentCollectionRate | null;
  expense_summary: ExpenseSummary | null;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const analyticsAPI = {
  getDashboard: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/analytics/dashboard/');
    return response.data;
  },
  getSalesOverview: async (): Promise<SalesOverview> => {
    const response = await apiClient.get<SalesOverview>('/analytics/sales/overview/');
    return response.data;
  },
  getSalesByPeriod: async (): Promise<SalesByPeriod> => {
    const response = await apiClient.get<SalesByPeriod>('/analytics/sales/by-period/');
    return response.data;
  },
  getCreditNotesByPeriod: async (): Promise<CreditNotesByPeriod> => {
    const response = await apiClient.get<CreditNotesByPeriod>('/analytics/sales/credit-notes-by-period/');
    return response.data;
  },
  getDailySalesTrend: async (days: number = 30): Promise<DailySalesTrend[]> => {
    const response = await apiClient.get<DailySalesTrend[]>('/analytics/sales/daily-trend/', { params: { days } });
    return response.data;
  },
  getInventorySummary: async (): Promise<InventorySummary> => {
    const response = await apiClient.get<InventorySummary>('/analytics/inventory/summary/');
    return response.data;
  },
  getLowStockAlerts: async (): Promise<LowStockAlert[]> => {
    const response = await apiClient.get<LowStockAlert[]>('/analytics/inventory/low-stock/');
    return response.data;
  },
  getTopCustomers: async (limit: number = 10): Promise<TopCustomer[]> => {
    const response = await apiClient.get<TopCustomer[]>('/analytics/customers/top-customers/', { params: { limit } });
    return response.data;
  },
  getTopProducts: async (limit: number = 10): Promise<TopSellingProduct[]> => {
    const response = await apiClient.get<TopSellingProduct[]>('/analytics/products/top-selling/', { params: { limit } });
    return response.data;
  },
  getPaymentCollectionRate: async (): Promise<PaymentCollectionRate> => {
    const response = await apiClient.get<PaymentCollectionRate>('/analytics/payments/collection-rate/');
    return response.data;
  },
  getExpenseSummary: async (): Promise<ExpenseSummary> => {
    const response = await apiClient.get<ExpenseSummary>('/analytics/expenses/summary/');
    return response.data;
  },
  getExpensesByPeriod: async (): Promise<ExpensesByPeriod> => {
    const response = await apiClient.get<ExpensesByPeriod>('/analytics/expenses/by-period/');
    return response.data;
  },
  getExpensesByCategory: async (): Promise<ExpensesByCategory[]> => {
    const response = await apiClient.get<ExpensesByCategory[]>('/analytics/expenses/by-category/');
    return response.data;
  },
  getOutgoingInventoryPayments: async (): Promise<OutgoingPaymentsSummary> => {
    const response = await apiClient.get<OutgoingPaymentsSummary>('/analytics/payments/outgoing-inventory/');
    return response.data;
  },
  getOutgoingExpensePayments: async (): Promise<OutgoingExpensePayments> => {
    const response = await apiClient.get<OutgoingExpensePayments>('/analytics/payments/outgoing-expenses/');
    return response.data;
  },
  getCreditNoteRefunds: async (): Promise<CreditNoteRefunds> => {
    const response = await apiClient.get<CreditNoteRefunds>('/analytics/payments/credit-note-refunds/');
    return response.data;
  },
  getIncomingPayments: async (): Promise<IncomingPaymentsSummary> => {
    const response = await apiClient.get<IncomingPaymentsSummary>('/analytics/payments/incoming/');
    return response.data;
  },
};