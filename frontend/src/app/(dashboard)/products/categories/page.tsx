'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { productCategoriesAPI, ProductCategory, CategoryCreateRequest } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductCategoriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Form state
  const [formData, setFormData] = useState<CategoryCreateRequest>({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadCategories();
  }, [user, router]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await productCategoriesAPI.getAll();
      setCategories(data);
    } catch (error: any) {
      toast.error('Failed to load categories');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await productCategoriesAPI.update(editingCategory.id, formData);
        toast.success('Category updated successfully');
      } else {
        await productCategoriesAPI.create(formData);
        toast.success('Category created successfully');
      }
      
      // Reset form
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      setEditingCategory(null);
      
      // Reload categories
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await productCategoriesAPI.delete(id);
      toast.success('Category deleted successfully');
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
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
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Product Categories</h1>
                <p className="text-sm text-gray-600">Manage your product categories</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/products/list">
                <Button variant="outline">
                  View Products
                </Button>
              </Link>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
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
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Category Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Laptops/Computers"
                required
              />
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this category"
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex space-x-3">
                <Button type="submit">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No categories yet. Create your first category!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-semibold">{category.name}</TableCell>
                    <TableCell className="text-gray-600">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(category.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        category.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
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
                          onClick={() => handleDelete(category.id)}
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