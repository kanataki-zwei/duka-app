'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  expensesAPI,
  ExpenseWithDetails,
  ExpensePaymentMethod,
  ExpensePaymentCreateRequest,
  ExpenseUpdateRequest,
  ExpensePaymentStatus,
} from '@/lib/expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  ArrowLeft,
  DollarSign,
  RefreshCw,
  Banknote,
  Smartphone,
  Building2,
  CreditCard,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [expense, setExpense] = useState<ExpenseWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editAmount, setEditAmount] = useState('');

  const [paymentData, setPaymentData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: ExpensePaymentMethod.CASH,
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadExpense();
  }, [user, router, params.id]);

  const loadExpense = async () => {
    try {
      setIsLoading(true);
      const data = await expensesAPI.getById(params.id as string);
      setExpense(data);
      setEditAmount(data.amount.toString());
    } catch (error: any) {
      toast.error('Failed to load expense');
      router.push('/expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > expense.amount_due) {
      toast.error(`Amount cannot exceed amount due (KES ${expense.amount_due.toLocaleString('en-KE')})`);
      return;
    }
    if (['mpesa', 'bank', 'card'].includes(paymentData.payment_method) && !paymentData.reference_number) {
      toast.error('Reference number is required for this payment method');
      return;
    }

    try {
      const payload: ExpensePaymentCreateRequest = {
        expense_id: expense.id,
        payment_date: paymentData.payment_date,
        amount,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || undefined,
        notes: paymentData.notes || undefined,
      };

      await expensesAPI.recordPayment(expense.id, payload);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: ExpensePaymentMethod.CASH,
        reference_number: '',
        notes: '',
      });
      loadExpense();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleUpdateAmount = async () => {
    if (!expense) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      const update: ExpenseUpdateRequest = { amount };
      await expensesAPI.update(expense.id, update);
      toast.success('Amount updated successfully');
      setIsEditingAmount(false);
      loadExpense();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update amount');
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'mpesa': return <Smartphone className="w-4 h-4" />;
      case 'bank': return <Building2 className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
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

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (!expense) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/expenses">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{expense.title}</h1>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(expense.payment_status)}`}>
                    {expense.payment_status.charAt(0).toUpperCase() + expense.payment_status.slice(1)}
                  </span>
                  {expense.is_recurring && !expense.parent_expense_id && (
                    <span className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      <RefreshCw className="w-3 h-3" />
                      <span>{expense.recurrence_frequency}</span>
                    </span>
                  )}
                  {expense.parent_expense_id && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                      Auto-generated
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(expense.expense_date).toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            {expense.payment_status !== ExpensePaymentStatus.PAID && (
              <Button onClick={() => setShowPaymentModal(true)}>
                <DollarSign className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expense Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Category</label>
                  <p className="font-semibold text-gray-900">{expense.category?.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Type</label>
                  <p className="font-semibold text-gray-900 capitalize">{expense.expense_type}</p>
                </div>
                {expense.supplier && (
                  <div>
                    <label className="text-sm text-gray-600">Supplier</label>
                    <p className="font-semibold text-gray-900">{expense.supplier.name}</p>
                  </div>
                )}
                {expense.sale && (
                  <div>
                    <label className="text-sm text-gray-600">Linked Sale</label>
                    <Link href={`/sales/${expense.sale_id}`}>
                      <p className="font-semibold text-blue-600 hover:underline">{expense.sale.sale_number}</p>
                    </Link>
                  </div>
                )}
                {expense.description && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Description</label>
                    <p className="text-gray-900">{expense.description}</p>
                  </div>
                )}
                {expense.notes && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Notes</label>
                    <p className="text-gray-900">{expense.notes}</p>
                  </div>
                )}
                {expense.is_recurring && !expense.parent_expense_id && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Recurring Schedule</label>
                    <p className="font-semibold text-gray-900 capitalize">
                      {expense.recurrence_frequency === 'weekly'
                        ? `Every week on ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][expense.recurrence_day_of_week ?? 0]}`
                        : `Every month on the ${expense.recurrence_day_of_month}${
                            [11,12,13].includes(expense.recurrence_day_of_month ?? 0)
                              ? 'th'
                              : ['st','nd','rd'][(expense.recurrence_day_of_month ?? 0) % 10 - 1] || 'th'
                          }`}
                      {expense.recurrence_end_date && ` until ${new Date(expense.recurrence_end_date).toLocaleDateString('en-KE')}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            {expense.payments.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
                <div className="space-y-3">
                  {expense.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg">
                          {getPaymentMethodIcon(payment.payment_method)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            KES {Number(payment.amount).toLocaleString('en-KE')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString('en-KE')} •{' '}
                            {payment.payment_method.toUpperCase()}
                            {payment.reference_number && ` • ${payment.reference_number}`}
                          </p>
                          {payment.notes && (
                            <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right - Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-gray-700">
                  <span>Amount:</span>
                  {isEditingAmount ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                      />
                      <button onClick={handleUpdateAmount} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsEditingAmount(false)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">KES {Number(expense.amount).toLocaleString('en-KE')}</span>
                      {expense.payment_status !== ExpensePaymentStatus.PAID && (
                        <button
                          onClick={() => setIsEditingAmount(true)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit amount"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-green-600">
                    KES {Number(expense.amount_paid).toLocaleString('en-KE')}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>Amount Due:</span>
                  <span className={expense.amount_due > 0 ? 'text-red-600' : 'text-gray-900'}>
                    KES {Number(expense.amount_due).toLocaleString('en-KE')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Record Payment</h2>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <Input
                  label="Payment Date *"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  required
                />
                <Input
                  label={`Amount (Max: KES ${Number(expense.amount_due).toLocaleString('en-KE')}) *`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={expense.amount_due}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({
                      ...paymentData,
                      payment_method: e.target.value as ExpensePaymentMethod,
                      reference_number: e.target.value === 'cash' ? '' : paymentData.reference_number
                    })}
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={ExpensePaymentMethod.CASH}>Cash</option>
                    <option value={ExpensePaymentMethod.MPESA}>M-Pesa</option>
                    <option value={ExpensePaymentMethod.BANK}>Bank Transfer</option>
                    <option value={ExpensePaymentMethod.CARD}>Card</option>
                  </select>
                </div>
                {['mpesa', 'bank', 'card'].includes(paymentData.payment_method) && (
                  <Input
                    label="Reference Number *"
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                    placeholder="Transaction reference"
                    required
                  />
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    placeholder="Additional notes"
                    rows={2}
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Record Payment</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}