'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { customersAPI, CustomerWithDetails } from '@/lib/customers';
import { salesAPI } from '@/lib/sales';
import {
  ArrowLeft, Users, Mail, Phone, MapPin, CreditCard,
  AlertTriangle, Award, FileText, ShoppingCart, Building2,
  User, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const { user } = useAuthStore();

  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, router, customerId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [customerData, salesData] = await Promise.all([
        customersAPI.getById(customerId),
        salesAPI.getAll({ customer_id: customerId, limit: 5 }),
      ]);
      setCustomer(customerData);
      setRecentSales(salesData);
    } catch (error: any) {
      toast.error('Failed to load customer details');
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'business': return <Building2 className="w-5 h-5" />;
      case 'walk-in': return <ShoppingCart className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSaleStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const availableCredit = customer
    ? Math.max(0, customer.credit_limit - customer.current_balance)
    : 0;

  const isOverLimit = customer
    ? customer.current_balance > customer.credit_limit && customer.credit_limit > 0
    : false;

  const creditUsedPercentage = customer && customer.credit_limit > 0
    ? Math.min(100, (customer.current_balance / customer.credit_limit) * 100)
    : 0;

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Customer not found</p>
          <Link href="/customers/list">
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Customers
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/customers/list">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  {getCustomerTypeIcon(customer.customer_type)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                    {customer.is_default && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                      {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {customer.customer_type} customer
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{customer.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{customer.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm font-medium text-gray-900">{customer.address || '-'}</p>
                  </div>
                </div>
                {customer.tax_id && (
                  <div className="flex items-start space-x-3">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Tax ID / KRA PIN</p>
                      <p className="text-sm font-medium text-gray-900">{customer.tax_id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tier & Payment Terms */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Account Details</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Award className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Customer Tier</p>
                    {customer.customer_tier ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.customer_tier.name}</p>
                        <p className="text-xs text-green-600">{customer.customer_tier.discount_percentage}% discount</p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">-</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Payment Terms</p>
                    {customer.payment_term ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.payment_term.name}</p>
                        <p className="text-xs text-gray-500">{customer.payment_term.days} days</p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">-</p>
                    )}
                  </div>
                </div>
              </div>
              {customer.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{customer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Credit Summary */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Credit Summary</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Credit Limit</p>
                  <p className="text-lg font-bold text-gray-900">
                    KES {customer.credit_limit.toLocaleString('en-KE')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                  <p className={`text-lg font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-900'}`}>
                    KES {customer.current_balance.toLocaleString('en-KE')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Available Credit</p>
                  <p className={`text-lg font-bold ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                    KES {availableCredit.toLocaleString('en-KE')}
                  </p>
                </div>
              </div>

              {/* Credit bar */}
              {customer.credit_limit > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Credit Used</span>
                    <span>{creditUsedPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        creditUsedPercentage >= 100
                          ? 'bg-red-500'
                          : creditUsedPercentage >= 80
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, creditUsedPercentage)}%` }}
                    />
                  </div>
                  {isOverLimit && (
                    <div className="flex items-center space-x-1 text-xs text-red-600 mt-2">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Customer has exceeded their credit limit</span>
                    </div>
                  )}
                </div>
              )}

              {customer.credit_limit === 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <CreditCard className="w-4 h-4" />
                  <span>No credit limit set — cash sales only</span>
                </div>
              )}
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Recent Sales</h2>
                <Link href={`/sales?customer_id=${customer.id}`}>
                  <button className="text-sm text-blue-600 hover:underline">View all</button>
                </Link>
              </div>

              {recentSales.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No sales recorded for this customer yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {sale.sale_number || `#${sale.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(sale.created_at).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          KES {Number(sale.total_amount).toLocaleString('en-KE')}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getSaleStatusColor(sale.payment_status)}`}>
                          {sale.payment_status ? sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1) : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}