'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  expenseCategoriesAPI,
  ExpenseCategory,
  ExpenseCategoryCreateRequest,
  ExpenseType,
} from '@/lib/expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ExpenseCategoriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState<ExpenseCategoryCreateRequest>({
    name: '',
    expense_type: ExpenseType.STANDARD,
    description: '',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadCategories();
  }, [user, router, showInactive]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await expenseCategoriesAPI.getAll(
        showInactive ? {} : { is_active: true }
      );
      setCategories(data);
    } catch (error: any) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await expenseCategoriesAPI.update(editingCategory.id, formData);
        toast.success('Category updated successfully');
      } else {
        await expenseCategoriesAPI.create(formData);
        toast.success('Category created successfully');
      }
      resetForm();
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      expense_type: category.expense_type,
      description: category.description || '',
    });
    setShowForm(true);
  };

  const handleToggleActive = async (category: ExpenseCategory) => {
    const action = category.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${category.name}"?`)) return;
    try {
      await expenseCategoriesAPI.update(category.id, { is_active: !category.is_active });
      toast.success(`Category ${action}d successfully`);
      loadCategories();
    } catch (error: any) {
      toast.error(`Failed to ${action} category`);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', expense_type: ExpenseType.STANDARD, description: '' });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Expense Categories</h1>
                <p className="text-sm text-gray-600">Manage your expense categories</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/expenses">
                <Button variant="outline">View Expenses</Button>
              </Link>
              <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Category Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rent, Delivery Costs"
                  required
                />
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Expense Type *
                  </label>
                  <select
                    value={formData.expense_type}
                    onChange={(e) => setFormData({ ...formData, expense_type: e.target.value as ExpenseType })}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={ExpenseType.STANDARD}>Standard</option>
                    <option value={ExpenseType.SALES}>Sales</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category"
                  rows={2}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex space-x-3">
                <Button type="submit">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-inactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="show-inactive" className="text-sm font-medium text-gray-900 cursor-pointer">
              Show inactive categories
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No categories yet. Create your first category!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className={!category.is_active ? 'opacity-60' : ''}>
                    <TableCell className="font-semibold text-gray-900">{category.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        category.expense_type === ExpenseType.STANDARD
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {category.expense_type.charAt(0).toUpperCase() + category.expense_type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{category.description || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(category)}
                          className={`p-2 rounded-lg transition-colors ${
                            category.is_active
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={category.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {category.is_active
                            ? <ToggleRight className="w-4 h-4" />
                            : <ToggleLeft className="w-4 h-4" />}
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