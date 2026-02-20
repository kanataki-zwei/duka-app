'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  customersAPI,
  customerTiersAPI,
  CustomerWithDetails,
  CustomerType,
  CustomerStatus,
  CustomerTier
} from '@/lib/customers';
import { paymentTermsAPI, PaymentTerm } from '@/lib/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Users, Award, Building2, User, ShoppingCart, AlertTriangle, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomersListPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithDetails | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [formData, setFormData] = useState<any>({
    customer_type: CustomerType.INDIVIDUAL,
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    payment_term_id: '',
    customer_tier_id: '',
    credit_limit: '',
    status: CustomerStatus.ACTIVE,
    notes: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [customersData, tiersData, termsData] = await Promise.all([
        customersAPI.getAll(),
        customerTiersAPI.getAll(),
        paymentTermsAPI.getAll(),
      ]);
      setCustomers(customersData);
      setTiers(tiersData);
      setPaymentTerms(termsData);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        customer_type: formData.customer_type,
        name: formData.name,
        status: formData.status,
      };

      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.address) payload.address = formData.address;
      if (formData.tax_id) payload.tax_id = formData.tax_id;
      if (formData.payment_term_id) payload.payment_term_id = formData.payment_term_id;
      if (formData.customer_tier_id) payload.customer_tier_id = formData.customer_tier_id;
      if (formData.credit_limit) payload.credit_limit = parseFloat(formData.credit_limit);
      if (formData.notes) payload.notes = formData.notes;

      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, payload);
        toast.success('Customer updated successfully');
      } else {
        await customersAPI.create(payload);
        toast.success('Customer created successfully');
      }

      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save customer');
    }
  };

  const handleEdit = (customer: CustomerWithDetails) => {
    setEditingCustomer(customer);
    setFormData({
      customer_type: customer.customer_type,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      tax_id: customer.tax_id || '',
      payment_term_id: customer.payment_term_id || '',
      customer_tier_id: customer.customer_tier_id || '',
      credit_limit: customer.credit_limit || '',
      status: customer.status,
      notes: customer.notes || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this customer?')) return;
    try {
      await customersAPI.delete(id);
      toast.success('Customer deactivated successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to deactivate customer');
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingCustomer(null);
    setFormData({
      customer_type: CustomerType.INDIVIDUAL,
      name: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      payment_term_id: '',
      customer_tier_id: '',
      credit_limit: '',
      status: CustomerStatus.ACTIVE,
      notes: '',
    });
  };

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'business': return <Building2 className="w-4 h-4" />;
      case 'walk-in': return <ShoppingCart className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'business': return 'bg-purple-100 text-purple-800';
      case 'walk-in': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverCreditLimit = (customer: CustomerWithDetails) => {
    return customer.current_balance > customer.credit_limit && customer.credit_limit > 0;
  };

  // Only show active tiers in the form
  const activeTiers = tiers.filter(t => t.is_active);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || customer.customer_type === filterType;
    const matchesStatus = !filterStatus || customer.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                <p className="text-sm text-gray-600">Manage your customer base</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/customers/tiers">
                <Button variant="outline">
                  <Award className="w-4 h-4 mr-2" />
                  Manage Tiers
                </Button>
              </Link>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Customer Type *
                  </label>
                  <select
                    value={formData.customer_type}
                    onChange={(e) => setFormData({ ...formData, customer_type: e.target.value as CustomerType })}
                    required
                    disabled={editingCustomer?.is_default}
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value={CustomerType.INDIVIDUAL}>Individual</option>
                    <option value={CustomerType.BUSINESS}>Business</option>
                    <option value={CustomerType.WALK_IN}>Walk-In</option>
                  </select>
                </div>

                <Input
                  label="Customer Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name or business name"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@example.com"
                />

                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 700 000000"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Physical address"
                    rows={3}
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-4">
                  {formData.customer_type === CustomerType.BUSINESS && (
                    <Input
                      label="Tax ID / Registration Number"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="KRA PIN or Registration Number"
                    />
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Terms</label>
                    <select
                      value={formData.payment_term_id}
                      onChange={(e) => setFormData({ ...formData, payment_term_id: e.target.value })}
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select payment terms</option>
                      {paymentTerms.map(term => (
                        <option key={term.id} value={term.id}>{term.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Customer Tier</label>
                    <select
                      value={formData.customer_tier_id}
                      onChange={(e) => setFormData({ ...formData, customer_tier_id: e.target.value })}
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select tier (optional)</option>
                      {activeTiers.map(tier => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name} ({tier.discount_percentage}% discount)
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Credit Limit (KES)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    placeholder="0.00"
                  />

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={CustomerStatus.ACTIVE}>Active</option>
                      <option value={CustomerStatus.INACTIVE}>Inactive</option>
                      <option value={CustomerStatus.SUSPENDED}>Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this customer"
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Types</option>
              <option value={CustomerType.INDIVIDUAL}>Individual</option>
              <option value={CustomerType.BUSINESS}>Business</option>
              <option value={CustomerType.WALK_IN}>Walk-In</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value={CustomerStatus.ACTIVE}>Active</option>
              <option value={CustomerStatus.INACTIVE}>Inactive</option>
              <option value={CustomerStatus.SUSPENDED}>Suspended</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchTerm || filterType || filterStatus
                  ? 'No customers match your filters'
                  : 'No customers yet. Create your first customer!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-semibold">
                        {customer.name}
                        {customer.is_default && (
                          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
                            Default
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 w-fit ${getCustomerTypeColor(customer.customer_type)}`}>
                          {getCustomerTypeIcon(customer.customer_type)}
                          <span className="capitalize">{customer.customer_type}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{customer.email || '-'}</div>
                        <div className="text-gray-500">{customer.phone || '-'}</div>
                      </TableCell>
                      <TableCell>
                        {customer.customer_tier ? (
                          <div>
                            <div className="font-semibold">{customer.customer_tier.name}</div>
                            <div className="text-xs text-green-600">
                              {customer.customer_tier.discount_percentage}% discount
                            </div>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        KES {customer.credit_limit.toLocaleString('en-KE')}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          KES {customer.current_balance.toLocaleString('en-KE')}
                        </div>
                        {isOverCreditLimit(customer) && (
                          <div className="flex items-center space-x-1 text-xs text-red-600 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Over limit</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/customers/${customer.id}`}>
                            <button
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!customer.is_default && (
                            <button
                              onClick={() => handleDelete(customer.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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