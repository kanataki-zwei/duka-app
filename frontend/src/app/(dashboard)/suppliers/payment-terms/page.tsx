'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { paymentTermsAPI, PaymentTerm, PaymentTermCreateRequest } from '@/lib/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentTermsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);

  // Form state
  const [formData, setFormData] = useState<PaymentTermCreateRequest>({
    name: '',
    description: '',
    days: undefined,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadTerms();
  }, [user, router]);

  const loadTerms = async () => {
    try {
      setIsLoading(true);
      const data = await paymentTermsAPI.getAll();
      setTerms(data);
    } catch (error: any) {
      toast.error('Failed to load payment terms');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTerm) {
        await paymentTermsAPI.update(editingTerm.id, formData);
        toast.success('Payment term updated successfully');
      } else {
        await paymentTermsAPI.create(formData);
        toast.success('Payment term created successfully');
      }
      
      // Reset form
      resetForm();
      
      // Reload terms
      loadTerms();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save payment term');
    }
  };

  const handleEdit = (term: PaymentTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      description: term.description || '',
      days: term.days || undefined,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment term?')) {
      return;
    }

    try {
      await paymentTermsAPI.delete(id);
      toast.success('Payment term deleted successfully');
      loadTerms();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete payment term');
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingTerm(null);
    setFormData({
      name: '',
      description: '',
      days: undefined,
    });
  };

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
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Terms</h1>
                <p className="text-sm text-gray-600">Manage supplier payment terms</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/suppliers">
                <Button variant="outline">
                  View Suppliers
                </Button>
              </Link>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Payment Term</span>
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
              {editingTerm ? 'Edit Payment Term' : 'Create New Payment Term'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Net 30, COD, Net 60"
                  required
                />

                <Input
                  label="Days"
                  type="number"
                  value={formData.days || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    days: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="e.g., 30, 60, 90"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  {editingTerm ? 'Update Payment Term' : 'Create Payment Term'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Payment Terms Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading payment terms...</p>
            </div>
          ) : terms.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No payment terms yet. Create your first payment term!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-semibold">{term.name}</TableCell>
                    <TableCell className="text-gray-900">
                      {term.days ? `${term.days} days` : '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {term.description || '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(term.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(term)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(term.id)}
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