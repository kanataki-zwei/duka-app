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
  BarChart3,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const fmt = (val: number | undefined | null) =>
  Number(val ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const n = (val: number | undefined | null) => Number(val ?? 0);

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
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

  if (!user) return null;

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

  if (!dashboard) return null;

  const sbp = dashboard.sales_by_period;
  const cnp = dashboard.credit_notes_by_period;
  const ebp = dashboard.expenses_by_period;
  const oi = dashboard.outgoing_inventory;
  const oe = dashboard.outgoing_expenses;
  const ocn = dashboard.outgoing_credit_notes;
  const ip = dashboard.incoming_payments;
  const inv = dashboard.inventory_summary;

  // Net sales per period (sales - returns)
  const netToday = n(sbp?.today_sales) - n(cnp?.today_returns);
  const netWeek = n(sbp?.week_sales) - n(cnp?.week_returns);
  const netMonth = n(sbp?.month_sales) - n(cnp?.month_returns);
  const netYear = n(sbp?.year_sales) - n(cnp?.year_returns);

  // Month gross profit
  const monthGrossProfit = netMonth - n(ebp?.month_expenses);

  // Outgoing totals
  const totalOutstanding = n(oi?.inventory_outstanding) + n(oe?.expense_outstanding) + n(ocn?.refunds_outstanding);
  const totalPaidThisMonth = n(oi?.inventory_paid_this_month) + n(oe?.expense_paid_this_month) + n(ocn?.refunds_paid_this_month);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600">Business insights and metrics</p>
              </div>
            </div>
            <button
              onClick={loadDashboard}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── ROW 1: SALES ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Sales</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Today */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">Today's Sales</p>
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">KES {fmt(netToday)}</p>
              <p className="text-xs text-gray-400 mt-1">{sbp?.today_invoice_count ?? 0} invoices</p>
              {n(cnp?.today_returns) > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  −KES {fmt(cnp?.today_returns)} returns
                </p>
              )}
            </div>

            {/* This Week */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">This Week</p>
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">KES {fmt(netWeek)}</p>
              <p className="text-xs text-gray-400 mt-1">{sbp?.week_invoice_count ?? 0} invoices</p>
              {n(cnp?.week_returns) > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  −KES {fmt(cnp?.week_returns)} returns
                </p>
              )}
            </div>

            {/* This Month */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">This Month</p>
                <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">KES {fmt(netMonth)}</p>
              <p className="text-xs text-gray-400 mt-1">{sbp?.month_invoice_count ?? 0} invoices</p>
              {n(cnp?.month_returns) > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  −KES {fmt(cnp?.month_returns)} returns
                </p>
              )}
            </div>

            {/* This Year */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">This Year</p>
                <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">KES {fmt(netYear)}</p>
              <p className="text-xs text-gray-400 mt-1">{sbp?.year_invoice_count ?? 0} invoices</p>
              {n(cnp?.year_returns) > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  −KES {fmt(cnp?.year_returns)} returns
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── ROW 2: EXPENSES ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <Receipt className="w-4 h-4" />
            <span>Expenses</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Today */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">Today's Expenses</p>
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">KES {fmt(ebp?.today_expenses)}</p>
              <p className="text-xs text-gray-400 mt-1">{ebp?.today_count ?? 0} expenses</p>
            </div>

            {/* This Week */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">This Week</p>
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">KES {fmt(ebp?.week_expenses)}</p>
              <p className="text-xs text-gray-400 mt-1">{ebp?.week_count ?? 0} expenses</p>
            </div>

            {/* This Month */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">This Month</p>
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">KES {fmt(ebp?.month_expenses)}</p>
              <p className="text-xs text-gray-400 mt-1">{ebp?.month_count ?? 0} expenses</p>
            </div>

            {/* Month Gross Profit */}
            <div className={`rounded-xl shadow-sm border p-5 ${monthGrossProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">Month Gross Profit</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${monthGrossProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {monthGrossProfit >= 0
                    ? <TrendingUp className="w-5 h-5 text-green-600" />
                    : <TrendingDown className="w-5 h-5 text-red-600" />
                  }
                </div>
              </div>
              <p className={`text-2xl font-bold ${monthGrossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                KES {fmt(monthGrossProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Net sales − expenses</p>
            </div>
          </div>
        </section>

        {/* ── ROW 3: OUTGOING PAYMENTS ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <ArrowUpCircle className="w-4 h-4" />
            <span>Outgoing Payments</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Outstanding */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">Total Outstanding</p>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-orange-600 mb-4">KES {fmt(totalOutstanding)}</p>
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-2 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    <span>Inventory payments</span>
                  </span>
                  <span className="font-semibold text-gray-900">KES {fmt(oi?.inventory_outstanding)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-2 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                    <span>Expense payments</span>
                  </span>
                  <span className="font-semibold text-gray-900">KES {fmt(oe?.expense_outstanding)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-2 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                    <span>Credit note refunds</span>
                  </span>
                  <span className="font-semibold text-gray-900">KES {fmt(ocn?.refunds_outstanding)}</span>
                </div>
              </div>
            </div>

            {/* Paid This Month */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">Paid This Month</p>
                <CreditCard className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600 mb-4">KES {fmt(totalPaidThisMonth)}</p>
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-2 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    <span>Inventory payments</span>
                  </span>
                  <span className="font-semibold text-gray-900">KES {fmt(oi?.inventory_paid_this_month)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-2 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                    <span>Expense payments</span>
                  </span>
                  <span className="font-semibold text-gray-900">KES {fmt(oe?.expense_paid_this_month)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center space-x-2 text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                    <span>Credit refunds paid</span>
                  </span>
                  <span className="font-semibold text-gray-900">KES {fmt(ocn?.refunds_paid_this_month)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ROW 4: INCOMING PAYMENTS ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <ArrowDownCircle className="w-4 h-4" />
            <span>Incoming Payments</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Pending */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">Total Pending</p>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">KES {fmt(ip?.total_pending_incoming)}</p>
              <p className="text-xs text-gray-400 mt-1">From unpaid invoices</p>
            </div>

            {/* Fully Unpaid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">Fully Unpaid</p>
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">KES {fmt(ip?.unpaid_invoice_amount)}</p>
              <p className="text-xs text-gray-400 mt-1">{ip?.unpaid_invoice_count ?? 0} invoices</p>
            </div>

            {/* Partially Paid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">Partially Paid</p>
                <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">KES {fmt(ip?.partial_invoice_amount)}</p>
              <p className="text-xs text-gray-400 mt-1">{ip?.partial_invoice_count ?? 0} invoices</p>
            </div>
          </div>
        </section>

        {/* ── SUPPORTING: INVENTORY & LOW STOCK ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Inventory</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-medium text-gray-500 mb-3">Stock Value (Cost)</p>
              <p className="text-2xl font-bold text-blue-600">KES {fmt(inv?.total_inventory_value_cost)}</p>
              <p className="text-xs text-gray-400 mt-1">{inv?.total_variants ?? 0} variants · {inv?.total_units ?? 0} units</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-medium text-gray-500 mb-3">Stock Value (Retail)</p>
              <p className="text-2xl font-bold text-gray-900">KES {fmt(inv?.total_inventory_value_retail)}</p>
              <p className="text-xs text-green-600 mt-1">+KES {fmt(inv?.potential_profit)} potential profit</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{dashboard.low_stock_count}</p>
              <p className="text-xs text-gray-400 mt-1">Items need reordering</p>
            </div>
          </div>
        </section>

        {/* ── TOP CUSTOMERS & PRODUCTS ── */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Customers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Top Customers</h3>
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              {dashboard.top_customers.length === 0 ? (
                <p className="text-gray-400 text-center py-6 text-sm">No customer data yet</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.top_customers.map((customer, index) => (
                    <div key={customer.customer_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{customer.customer_name}</p>
                          <p className="text-xs text-gray-400">{customer.invoice_count} invoices</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-900">KES {fmt(customer.total_sales)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Top Products</h3>
                <Package className="w-4 h-4 text-gray-400" />
              </div>
              {dashboard.top_products.length === 0 ? (
                <p className="text-gray-400 text-center py-6 text-sm">No product sales yet</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.top_products.map((product, index) => (
                    <div key={product.variant_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-green-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{product.product_name}</p>
                          <p className="text-xs text-gray-400">{product.total_quantity_sold} units · {product.number_of_sales} sales</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">KES {fmt(product.total_revenue)}</p>
                        <p className="text-xs text-green-600">+KES {fmt(product.gross_profit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── COLLECTION RATE ── */}
        {dashboard.payment_collection_rate && (
          <section>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Payment Collection Rate</h3>
                <CreditCard className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(n(dashboard.payment_collection_rate.collection_rate_percentage), 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right min-w-[100px]">
                  <p className="text-xl font-bold text-green-600">
                    {n(dashboard.payment_collection_rate.collection_rate_percentage).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    KES {fmt(dashboard.payment_collection_rate.total_collected)} of KES {fmt(dashboard.payment_collection_rate.total_billed)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
