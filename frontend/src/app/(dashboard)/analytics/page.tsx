'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { analyticsAPI, DashboardSummary } from '@/lib/analytics';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  AlertTriangle,
  ShoppingCart,
  CreditCard,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadDashboard();
  }, [user, router]);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsAPI.getDashboard();
      setDashboard(data);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const salesOverview = dashboard.sales_overview;
  const salesByPeriod = dashboard.sales_by_period;
  const inventory = dashboard.inventory_summary;
  const inventoryPayment = dashboard.inventory_payment_status;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-600">Business insights and metrics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sales Period Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Today */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Sales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  KES {salesByPeriod?.today_sales?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {salesByPeriod?.today_invoice_count || 0} invoices
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* This Week */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  KES {salesByPeriod?.week_sales?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {salesByPeriod?.week_invoice_count || 0} invoices
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  KES {salesByPeriod?.month_sales?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {salesByPeriod?.month_invoice_count || 0} invoices
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* This Year */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Year</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  KES {salesByPeriod?.year_sales?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {salesByPeriod?.year_invoice_count || 0} invoices
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Outstanding Payments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Outstanding Payments</h3>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              KES {salesOverview?.total_outstanding?.toLocaleString() || '0'}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unpaid:</span>
                <span className="font-semibold">
                  KES {salesOverview?.unpaid_invoice_amount?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Partial:</span>
                <span className="font-semibold">
                  KES {salesOverview?.partial_amount_due?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory Value */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Inventory Value</h3>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              KES {inventory?.total_inventory_value_cost?.toLocaleString() || '0'}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Retail Value:</span>
                <span className="font-semibold">
                  KES {inventory?.total_inventory_value_retail?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Potential Profit:</span>
                <span className="font-semibold text-green-600">
                  KES {inventory?.potential_profit?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Low Stock Items</h3>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {dashboard.low_stock_count}
            </p>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Items need reordering
              </p>
            </div>
          </div>
        </div>

        {/* Sales Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {salesOverview?.total_invoices || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                KES {salesOverview?.total_invoice_amount?.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid Invoices</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {salesOverview?.paid_invoices || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                KES {salesOverview?.paid_invoice_amount?.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Returns</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {salesOverview?.total_returns || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                KES {salesOverview?.total_return_amount?.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Sales</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                KES {salesOverview?.net_sales?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                After returns
              </p>
            </div>
          </div>
        </div>

        {/* Top Customers & Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            {dashboard.top_customers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No customer data yet</p>
            ) : (
              <div className="space-y-3">
                {dashboard.top_customers.map((customer, index) => (
                  <div key={customer.customer_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{customer.customer_name}</p>
                        <p className="text-xs text-gray-500">{customer.invoice_count} invoices</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">
                      KES {customer.total_sales.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
              <Package className="w-5 h-5 text-gray-400" />
            </div>
            {dashboard.top_products.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No product sales yet</p>
            ) : (
              <div className="space-y-3">
                {dashboard.top_products.map((product, index) => (
                  <div key={product.variant_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.product_name}</p>
                        <p className="text-xs text-gray-500">
                          {product.total_quantity_sold} units • {product.number_of_sales} sales
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        KES {product.total_revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600">
                        +KES {product.gross_profit.toLocaleString()} profit
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Collection Rate */}
        {dashboard.payment_collection_rate && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Collection Rate</h3>
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${dashboard.payment_collection_rate.collection_rate_percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {dashboard.payment_collection_rate.collection_rate_percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  KES {dashboard.payment_collection_rate.total_collected.toLocaleString()} of{' '}
                  KES {dashboard.payment_collection_rate.total_billed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}