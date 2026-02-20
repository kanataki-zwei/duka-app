'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { salesAPI, SaleWithDetails, SaleType, PaymentStatus } from '@/lib/sales';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Receipt, Eye, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function SalesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSales();
  }, [user, router]);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      const data = await salesAPI.getAll({ limit: 100 });
      setSales(data);
    } catch (error: any) {
      toast.error('Failed to load sales');
    } finally {
      setIsLoading(false);
    }
  };

  const getSaleTypeColor = (type: string) => {
    switch (type) {
      case 'invoice': return 'bg-blue-100 text-blue-800';
      case 'credit_note': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const filteredSales = sales.filter(sale => {
    if (filterType && sale.sale_type !== filterType) return false;
    if (filterStatus && sale.payment_status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSaleNumber = sale.sale_number.toLowerCase().includes(query);
      const matchesCustomer = sale.customer?.name.toLowerCase().includes(query);
      if (!matchesSaleNumber && !matchesCustomer) return false;
    }
    return true;
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
                <p className="text-sm text-gray-600">Manage invoices and credit notes</p>
              </div>
            </div>
            <Link href="/sales/create">
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>New Invoice</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by customer or sale number..."
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
                <option value={SaleType.INVOICE}>Invoices</option>
                <option value={SaleType.CREDIT_NOTE}>Credit Notes</option>
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
                <option value={PaymentStatus.PAID}>Paid</option>
                <option value={PaymentStatus.PARTIAL}>Partial</option>
                <option value={PaymentStatus.UNPAID}>Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading sales...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchQuery || filterType || filterStatus
                  ? 'No sales match your filters'
                  : 'No sales found. Create your first invoice!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-semibold">
                        {sale.sale_number}
                        {sale.original_sale && (
                          <div className="text-xs text-gray-500 mt-1">
                            Ref: {sale.original_sale.sale_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getSaleTypeColor(sale.sale_type)}`}>
                          {sale.sale_type === 'invoice' ? 'Invoice' : 'Credit Note'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {new Date(sale.sale_date).toLocaleDateString('en-KE')}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {sale.customer?.name || '-'}
                      </TableCell>
                      <TableCell className={`font-bold ${sale.total_amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        KES {Number(sale.total_amount).toLocaleString('en-KE')}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        KES {Number(sale.amount_paid).toLocaleString('en-KE')}
                      </TableCell>
                      <TableCell className={`font-semibold ${sale.amount_due > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        KES {Number(sale.amount_due).toLocaleString('en-KE')}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(sale.payment_status)}`}>
                          {sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/sales/${sale.id}`}>
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