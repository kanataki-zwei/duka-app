'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  expensesAPI,
  expenseCategoriesAPI,
  ExpenseCategory,
  ExpenseType,
  RecurrenceFrequency,
  ExpenseCreateRequest,
} from '@/lib/expenses';
import { suppliersAPI } from '@/lib/suppliers';
import { salesAPI } from '@/lib/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Search, RefreshCw, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CreateExpensePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  // Sale search
  const [saleSearch, setSaleSearch] = useState('');
  const [showSaleDropdown, setShowSaleDropdown] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const saleSearchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    expense_type: ExpenseType.STANDARD,
    expense_category_id: '',
    title: '',
    description: '',
    amount: '',
    supplier_id: '',
    sale_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
    is_recurring: false,
    recurrence_frequency: RecurrenceFrequency.MONTHLY,
    recurrence_day_of_week: 1,
    recurrence_day_of_month: 1,
    recurrence_end_date: '',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadData();
  }, [user, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (saleSearchRef.current && !saleSearchRef.current.contains(e.target as Node)) {
        setShowSaleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, suppliersData, salesData] = await Promise.all([
        expenseCategoriesAPI.getAll({ is_active: true }),
        suppliersAPI.getAll(),
        salesAPI.getAll({ limit: 200 }),
      ]);
      setCategories(categoriesData);
      setSuppliers(suppliersData);
      setSales(salesData);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    c => c.expense_type === formData.expense_type
  );

  const filteredSales = sales.filter(sale => {
    const query = saleSearch.toLowerCase();
    return sale.sale_number.toLowerCase().includes(query) ||
      sale.customer?.name?.toLowerCase().includes(query);
  });

  const handleSaleSelect = (sale: any) => {
    setSelectedSale(sale);
    setSaleSearch(`${sale.sale_number} — ${sale.customer?.name || ''}`);
    setShowSaleDropdown(false);
    setFormData(prev => ({ ...prev, sale_id: sale.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.expense_category_id) {
      toast.error('Please select a category');
      return;
    }

    if (formData.expense_type === ExpenseType.SALES && !formData.sale_id) {
      toast.error('Please select a sale for sales expenses');
      return;
    }

    if (formData.is_recurring) {
      if (!formData.recurrence_frequency) {
        toast.error('Please select a recurrence frequency');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload: ExpenseCreateRequest = {
        expense_category_id: formData.expense_category_id,
        expense_type: formData.expense_type,
        title: formData.title,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        supplier_id: formData.supplier_id || undefined,
        sale_id: formData.sale_id || undefined,
        expense_date: formData.expense_date,
        notes: formData.notes || undefined,
        is_recurring: formData.is_recurring,
      };

      if (formData.is_recurring) {
        payload.recurrence_frequency = formData.recurrence_frequency;
        if (formData.recurrence_frequency === RecurrenceFrequency.WEEKLY) {
          payload.recurrence_day_of_week = formData.recurrence_day_of_week;
        } else {
          payload.recurrence_day_of_month = formData.recurrence_day_of_month;
        }
        if (formData.recurrence_end_date) {
          payload.recurrence_end_date = formData.recurrence_end_date;
        }
      }

      const expense = await expensesAPI.create(payload);
      toast.success(
        formData.is_recurring
          ? 'Recurring expense created with future occurrences generated'
          : 'Expense created successfully'
      );
      router.push(`/expenses/${expense.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Expense</h1>
                <p className="text-sm text-gray-600">Record a new business expense</p>
              </div>
            </div>
            <Link href="/expenses">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Expense Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Type</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expense_type: ExpenseType.STANDARD, expense_category_id: '', sale_id: '' })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.expense_type === ExpenseType.STANDARD
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Standard Expense</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Rent, salaries, travel, repairs, etc.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expense_type: ExpenseType.SALES, expense_category_id: '', sale_id: '' })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.expense_type === ExpenseType.SALES
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-gray-900">Sales Expense</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Delivery, packaging, return costs tied to a sale
                  </div>
                </button>
              </div>
            </div>

            {/* Basic Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.expense_category_id}
                    onChange={(e) => setFormData({ ...formData, expense_category_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select category</option>
                    {filteredCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {filteredCategories.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      No {formData.expense_type} categories found.{' '}
                      <Link href="/expenses/categories" className="underline">Create one first.</Link>
                    </p>
                  )}
                </div>

                <Input
                  label="Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. January Rent, Delivery for INV-001"
                  required
                />

                <Input
                  label="Amount (KES) *"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />

                <Input
                  label="Expense Date *"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Supplier (Optional)
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sale Search - only for sales expenses */}
                {formData.expense_type === ExpenseType.SALES && (
                  <div ref={saleSearchRef}>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Linked Sale *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search by sale number or customer..."
                        value={saleSearch}
                        onChange={(e) => {
                          setSaleSearch(e.target.value);
                          setShowSaleDropdown(true);
                          if (!e.target.value) {
                            setSelectedSale(null);
                            setFormData(prev => ({ ...prev, sale_id: '' }));
                          }
                        }}
                        onFocus={() => setShowSaleDropdown(true)}
                        className="w-full pl-10 pr-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {showSaleDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredSales.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">No sales found</div>
                          ) : (
                            filteredSales.map(sale => (
                              <button
                                key={sale.id}
                                type="button"
                                onClick={() => handleSaleSelect(sale)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                              >
                                <div className="font-semibold text-gray-900 text-sm">{sale.sale_number}</div>
                                <div className="text-xs text-gray-500">
                                  {sale.customer?.name} • {sale.sale_type === 'invoice' ? 'Invoice' : 'Credit Note'} • KES {Number(sale.total_amount).toLocaleString('en-KE')}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {selectedSale && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Linked to {selectedSale.sale_number}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this expense"
                  rows={2}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Recurring Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Recurring Schedule</h2>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="is-recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is-recurring" className="text-sm font-medium text-gray-900 cursor-pointer">
                  This is a recurring expense
                </label>
              </div>

              {formData.is_recurring && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Frequency *
                      </label>
                      <select
                        value={formData.recurrence_frequency}
                        onChange={(e) => setFormData({ ...formData, recurrence_frequency: e.target.value as RecurrenceFrequency })}
                        className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={RecurrenceFrequency.WEEKLY}>Weekly</option>
                        <option value={RecurrenceFrequency.MONTHLY}>Monthly</option>
                      </select>
                    </div>

                    {formData.recurrence_frequency === RecurrenceFrequency.WEEKLY && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Day of Week *
                        </label>
                        <select
                          value={formData.recurrence_day_of_week}
                          onChange={(e) => setFormData({ ...formData, recurrence_day_of_week: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {DAYS_OF_WEEK.map((day, index) => (
                            <option key={index} value={index}>{day}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.recurrence_frequency === RecurrenceFrequency.MONTHLY && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Day of Month *
                        </label>
                        <select
                          value={formData.recurrence_day_of_month}
                          onChange={(e) => setFormData({ ...formData, recurrence_day_of_month: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <Input
                      label="End Date (Optional)"
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    The system will auto-generate up to 12 future occurrences. Each one starts as unpaid and can be updated individually.
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes"
                rows={3}
                className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Link href="/expenses">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Expense'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}