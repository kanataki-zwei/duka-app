'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  suppliersAPI, 
  paymentTermsAPI,
  productCategoriesAPI,
  SupplierWithCategories, 
  PaymentTerm,
  SupplierCreateRequest 
} from '@/lib/suppliers';
import { ProductCategory } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Truck, Search, Mail, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<SupplierWithCategories[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithCategories | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState<SupplierCreateRequest>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_term_id: '',
    product_category_ids: [],
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
      const [suppliersData, termsData, categoriesData] = await Promise.all([
        suppliersAPI.getAll(),
        paymentTermsAPI.getAll(),
        productCategoriesAPI.getAll(),
      ]);
      setSuppliers(suppliersData);
      setPaymentTerms(termsData);
      setCategories(categoriesData);
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier.id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await suppliersAPI.create(formData);
        toast.success('Supplier created successfully');
      }
      
      // Reset form
      resetForm();
      
      // Reload suppliers
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save supplier');
    }
  };

  const handleEdit = (supplier: SupplierWithCategories) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      payment_term_id: supplier.payment_term_id || '',
      product_category_ids: supplier.product_categories?.map(c => c.id) || [],
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return;
    }

    try {
      await suppliersAPI.delete(id);
      toast.success('Supplier deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete supplier');
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_term_id: '',
      product_category_ids: [],
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => {
      const currentIds = prev.product_category_ids || [];
      const isSelected = currentIds.includes(categoryId);
      
      return {
        ...prev,
        product_category_ids: isSelected
          ? currentIds.filter(id => id !== categoryId)
          : [...currentIds, categoryId]
      };
    });
  };

  const getPaymentTermName = (termId: string | null) => {
    if (!termId) return '-';
    const term = paymentTerms.find(t => t.id === termId);
    return term?.name || '-';
  };

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.phone && supplier.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                <p className="text-sm text-gray-600">Manage your suppliers</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/suppliers/payment-terms">
                <Button variant="outline">
                  Payment Terms
                </Button>
              </Link>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Supplier</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSupplier ? 'Edit Supplier' : 'Create New Supplier'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Supplier Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Acme Electronics Ltd"
                  required
                />

                <Input
                  label="Contact Person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="e.g., John Doe"
                />

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="supplier@example.com"
                />

                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 700 000 000"
                />

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Payment Term
                  </label>
                  <select
                    value={formData.payment_term_id}
                    onChange={(e) => setFormData({ ...formData, payment_term_id: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select payment term (optional)</option>
                    {paymentTerms.map(term => (
                      <option key={term.id} value={term.id}>
                        {term.name} {term.days ? `(${term.days} days)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Supplier address"
                  rows={2}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Product Categories Supplied
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.map(category => (
                    <label
                      key={category.id}
                      className={`flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.product_category_ids?.includes(category.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.product_category_ids?.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search suppliers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchTerm ? 'No suppliers match your search' : 'No suppliers yet. Create your first supplier!'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Payment Term</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-gray-900">{supplier.name}</p>
                        {supplier.contact_person && (
                          <p className="text-sm text-gray-600">{supplier.contact_person}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {getPaymentTermName(supplier.payment_term_id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {supplier.product_categories && supplier.product_categories.length > 0 ? (
                          supplier.product_categories.map(cat => (
                            <span
                              key={cat.id}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded"
                            >
                              {cat.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        supplier.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}