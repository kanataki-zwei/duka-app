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

export interface InventoryPaymentStatus {
  company_id: string;
  paid_stock_transactions: number;
  paid_stock_value: number;
  unpaid_stock_transactions: number;
  unpaid_stock_value: number;
  partial_stock_transactions: number;
  partial_stock_value: number;
  partial_amount_paid: number;
  total_outstanding: number;
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

export interface DashboardSummary {
  sales_overview: SalesOverview | null;
  sales_by_period: SalesByPeriod | null;
  inventory_summary: InventorySummary | null;
  inventory_payment_status: InventoryPaymentStatus | null;
  low_stock_count: number;
  top_customers: TopCustomer[];
  top_products: TopSellingProduct[];
  payment_collection_rate: PaymentCollectionRate | null;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const analyticsAPI = {
  // Dashboard
  getDashboard: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/analytics/dashboard/');
    return response.data;
  },

  // Sales Analytics
  getSalesOverview: async (): Promise<SalesOverview> => {
    const response = await apiClient.get<SalesOverview>('/analytics/sales/overview/');
    return response.data;
  },

  getSalesByPeriod: async (): Promise<SalesByPeriod> => {
    const response = await apiClient.get<SalesByPeriod>('/analytics/sales/by-period/');
    return response.data;
  },

  getDailySalesTrend: async (days: number = 30): Promise<DailySalesTrend[]> => {
    const response = await apiClient.get<DailySalesTrend[]>('/analytics/sales/daily-trend/', {
      params: { days }
    });
    return response.data;
  },

  // Inventory Analytics
  getInventorySummary: async (): Promise<InventorySummary> => {
    const response = await apiClient.get<InventorySummary>('/analytics/inventory/summary/');
    return response.data;
  },

  getInventoryPaymentStatus: async (): Promise<InventoryPaymentStatus> => {
    const response = await apiClient.get<InventoryPaymentStatus>('/analytics/inventory/payment-status/');
    return response.data;
  },

  getLowStockAlerts: async (): Promise<LowStockAlert[]> => {
    const response = await apiClient.get<LowStockAlert[]>('/analytics/inventory/low-stock/');
    return response.data;
  },

  // Customer Analytics
  getTopCustomers: async (limit: number = 10): Promise<TopCustomer[]> => {
    const response = await apiClient.get<TopCustomer[]>('/analytics/customers/top-customers/', {
      params: { limit }
    });
    return response.data;
  },

  // Product Analytics
  getTopProducts: async (limit: number = 10): Promise<TopSellingProduct[]> => {
    const response = await apiClient.get<TopSellingProduct[]>('/analytics/products/top-selling/', {
      params: { limit }
    });
    return response.data;
  },

  // Payment Analytics
  getPaymentCollectionRate: async (): Promise<PaymentCollectionRate> => {
    const response = await apiClient.get<PaymentCollectionRate>('/analytics/payments/collection-rate/');
    return response.data;
  },
};