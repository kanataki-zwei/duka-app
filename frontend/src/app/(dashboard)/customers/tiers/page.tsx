'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { customerTiersAPI, CustomerTier, CustomerTierCreateRequest } from '@/lib/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Award, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerTiersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTier, setEditingTier] = useState<CustomerTier | null>(null);

  // Form state
  const [formData, setFormData] = useState<CustomerTierCreateRequest>({
    name: '',
    discount_percentage: 0,
    description: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadTiers();
  }, [user, router]);

  const loadTiers = async () => {
    try {
      setIsLoading(true);
      const data = await customerTiersAPI.getAll();
      setTiers(data);
    } catch (error: any) {
      toast.error('Failed to load customer tiers');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTier) {
        await customerTiersAPI.update(editingTier.id, formData);
        toast.success('Customer tier updated successfully');
      } else {
        await customerTiersAPI.create(formData);
        toast.success('Customer tier created successfully');
      }
      
      resetForm();
      loadTiers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save customer tier');
    }
  };

  const handleEdit = (tier: CustomerTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      discount_percentage: tier.discount_percentage,
      description: tier.description || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) {
      return;
    }

    try {
      await customerTiersAPI.delete(id);
      toast.success('Customer tier deleted successfully');
      loadTiers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete customer tier');
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingTier(null);
    setFormData({
      name: '',
      discount_percentage: 0,
      description: '',
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
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Tiers</h1>
                <p className="text-sm text-gray-600">Manage pricing tiers and discounts</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/customers/list">
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  View Customers
                </Button>
              </Link>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Tier</span>
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
              {editingTier ? 'Edit Customer Tier' : 'Create New Customer Tier'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Tier Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., VIP, Wholesale, Regular"
                  required
                />

                <Input
                  label="Discount Percentage *"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this tier"
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  {editingTier ? 'Update Tier' : 'Create Tier'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tiers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading customer tiers...</p>
            </div>
          ) : tiers.length === 0 ? (
            <div className="p-8 text-center">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No customer tiers found. Create your first tier!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="font-semibold">
                      {tier.name}
                      {tier.is_default && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                          Default
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-bold text-green-600">
                        {tier.discount_percentage}%
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {tier.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(tier)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!tier.is_default && (
                          <button
                            onClick={() => handleDelete(tier.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
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
          )}
        </div>
      </div>
    </div>
  );
}