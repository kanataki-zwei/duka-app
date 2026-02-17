'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { salesAPI, SaleWithDetails, PaymentMethod, SalePaymentCreateRequest } from '@/lib/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Download, 
  DollarSign, 
  FileText, 
  Receipt,
  CreditCard,
  Building2,
  Smartphone,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [sale, setSale] = useState<SaleWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: PaymentMethod.CASH,
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSale();
  }, [user, router, params.id]);

  const loadSale = async () => {
    try {
      setIsLoading(true);
      const data = await salesAPI.getById(params.id as string);
      setSale(data);
    } catch (error: any) {
      toast.error('Failed to load sale details');
      console.error(error);
      router.push('/sales');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!sale) return;
    
    try {
      setIsDownloading(true);
      await salesAPI.downloadPDF(sale.id, sale.sale_number);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download PDF');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sale) return;

    // Validation
    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > sale.amount_due) {
      toast.error(`Amount cannot exceed amount due (KES ${sale.amount_due.toLocaleString()})`);
      return;
    }

    if (['mpesa', 'bank', 'card'].includes(paymentData.payment_method) && !paymentData.reference_number) {
      toast.error('Reference number is required for this payment method');
      return;
    }

    try {
      const payload: SalePaymentCreateRequest = {
        sale_id: sale.id,
        payment_date: paymentData.payment_date,
        amount: amount,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || undefined,
        notes: paymentData.notes || undefined,
      };

      await salesAPI.recordPayment(payload);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: PaymentMethod.CASH,
        reference_number: '',
        notes: '',
      });
      loadSale();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'mpesa':
        return <Smartphone className="w-4 h-4" />;
      case 'bank':
        return <Building2 className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSaleTypeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800';
      case 'credit_note':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <p className="mt-4 text-gray-600">Loading sale details...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/sales">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{sale.sale_number}</h1>
                  <span className={`px-3 py-1 text-sm font-semibold rounded ${getSaleTypeColor(sale.sale_type)}`}>
                    {sale.sale_type === 'invoice' ? 'Invoice' : 'Credit Note'}
                  </span>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(sale.payment_status)}`}>
                    {sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(sale.sale_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {sale.sale_type === 'invoice' && sale.payment_status !== 'paid' && (
                <Button onClick={() => setShowPaymentModal(true)}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              )}
              {sale.sale_type === 'invoice' && (
                <Link href={`/sales/${sale.id}/credit-note`}>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Create Credit Note
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sale Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Location Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sale Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Customer</label>
                  <p className="font-semibold text-gray-900">{sale.customer?.name}</p>
                  {sale.customer?.email && (
                    <p className="text-sm text-gray-600">{sale.customer.email}</p>
                  )}
                  {sale.customer?.phone && (
                    <p className="text-sm text-gray-600">{sale.customer.phone}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Storage Location</label>
                  <p className="font-semibold text-gray-900">{sale.storage_location?.name}</p>
                </div>
                {sale.original_sale && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Original Invoice</label>
                    <Link href={`/sales/${sale.original_sale_id}`}>
                      <p className="font-semibold text-blue-600 hover:underline">
                        {sale.original_sale.sale_number}
                      </p>
                    </Link>
                  </div>
                )}
                {sale.notes && (
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Notes</label>
                    <p className="text-gray-900">{sale.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-semibold">
                          {item.product_variant?.products?.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.product_variant?.variant_name}
                          {item.product_variant?.sku && ` (${item.product_variant.sku})`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        KES {item.unit_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {item.discount_percentage > 0 && (
                          <span>-{item.discount_percentage}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        KES {item.line_total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Payment History */}
            {sale.payments && sale.payments.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
                <div className="space-y-3">
                  {sale.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg">
                          {getPaymentMethodIcon(payment.payment_method)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            KES {payment.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString()} • {' '}
                            {payment.payment_method.toUpperCase()}
                            {payment.reference_number && ` • ${payment.reference_number}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Totals */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">KES {sale.subtotal.toLocaleString()}</span>
                </div>
                {sale.discount_percentage > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({sale.discount_percentage}%):</span>
                    <span className="font-semibold">- KES {sale.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                  <span>Total:</span>
                  <span className={sale.total_amount < 0 ? 'text-red-600' : ''}>
                    KES {sale.total_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700 pt-3 border-t">
                  <span>Amount Paid:</span>
                  <span className="font-semibold text-green-600">
                    KES {sale.amount_paid.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Amount Due:</span>
                  <span className={sale.amount_due > 0 ? 'text-red-600' : 'text-gray-900'}>
                    KES {sale.amount_due.toLocaleString()}
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
                  label={`Amount (Max: KES ${sale.amount_due.toLocaleString()}) *`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={sale.amount_due}
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
                      payment_method: e.target.value as PaymentMethod,
                      reference_number: e.target.value === 'cash' ? '' : paymentData.reference_number
                    })}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={PaymentMethod.CASH}>Cash</option>
                    <option value={PaymentMethod.MPESA}>M-Pesa</option>
                    <option value={PaymentMethod.BANK}>Bank Transfer</option>
                    <option value={PaymentMethod.CARD}>Card</option>
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
                    rows={3}
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Record Payment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}