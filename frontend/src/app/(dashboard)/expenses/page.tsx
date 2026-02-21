'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  expensesAPI,
  expenseCategoriesAPI,
  ExpenseWithDetails,
  ExpenseCategory,
  ExpenseType,
  ExpensePaymentStatus,
} from '@/lib/expenses';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Receipt, Eye, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [expensesData, categoriesData] = await Promise.all([
        expensesAPI.getAll({ limit: 200 }),
        expenseCategoriesAPI.getAll(),
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error: any) {
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpenseTypeColor = (type: string) => {
    switch (type) {
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'sales': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filterType && expense.expense_type !== filterType) return false;
    if (filterStatus && expense.payment_status !== filterStatus) return false;
    if (filterCategory && expense.expense_category_id !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !expense.title.toLowerCase().includes(query) &&
        !expense.category?.name.toLowerCase().includes(query) &&
        !expense.supplier?.name.toLowerCase().includes(query)
      ) return false;
    }
    return true;
  });

  // Summary calculations
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPaid = filteredExpenses.reduce((sum, e) => sum + Number(e.amount_paid), 0);
  const totalDue = filteredExpenses.reduce((sum, e) => sum + Number(e.amount_due), 0);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Business Expenses</h1>
                <p className="text-sm text-gray-600">Track and manage all business expenses</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/expenses/categories">
                <Button variant="outline">Manage Categories</Button>
              </Link>
              <Link href="/expenses/create">
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New Expense</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">
              KES {Number(totalAmount).toLocaleString('en-KE')}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              KES {Number(totalPaid).toLocaleString('en-KE')}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">
              KES {Number(totalDue).toLocaleString('en-KE')}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Types</option>
                <option value={ExpenseType.STANDARD}>Standard</option>
                <option value={ExpenseType.SALES}>Sales</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Statuses</option>
                <option value={ExpensePaymentStatus.PAID}>Paid</option>
                <option value={ExpensePaymentStatus.PARTIAL}>Partial</option>
                <option value={ExpensePaymentStatus.UNPAID}>Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchQuery || filterType || filterStatus || filterCategory
                  ? 'No expenses match your filters'
                  : 'No expenses yet. Create your first expense!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className={expense.parent_expense_id ? 'bg-gray-50' : ''}>
                      <TableCell>
                        <div className="font-semibold text-gray-900">{expense.title}</div>
                        {expense.supplier && (
                          <div className="text-xs text-gray-500">{expense.supplier.name}</div>
                        )}
                        {expense.sale && (
                          <div className="text-xs text-purple-600">{expense.sale.sale_number}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getExpenseTypeColor(expense.expense_type)}`}>
                          {expense.expense_type.charAt(0).toUpperCase() + expense.expense_type.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {expense.category?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {new Date(expense.expense_date).toLocaleDateString('en-KE')}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">
                        KES {Number(expense.amount).toLocaleString('en-KE')}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        KES {Number(expense.amount_paid).toLocaleString('en-KE')}
                      </TableCell>
                      <TableCell className={`font-semibold ${expense.amount_due > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        KES {Number(expense.amount_due).toLocaleString('en-KE')}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(expense.payment_status)}`}>
                          {expense.payment_status.charAt(0).toUpperCase() + expense.payment_status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {expense.is_recurring && !expense.parent_expense_id && (
                          <span className="flex items-center space-x-1 text-xs text-blue-600">
                            <RefreshCw className="w-3 h-3" />
                            <span>{expense.recurrence_frequency}</span>
                          </span>
                        )}
                        {expense.parent_expense_id && (
                          <span className="text-xs text-gray-400 italic">Auto-generated</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/expenses/${expense.id}`}>
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}