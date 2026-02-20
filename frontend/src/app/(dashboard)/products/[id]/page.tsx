'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  productsAPI,
  productVariantsAPI,
  Product,
  ProductVariant,
  VariantCreateRequest
} from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, ArrowLeft, Package, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { user } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [generatingSku, setGeneratingSku] = useState(false);

  const [formData, setFormData] = useState<VariantCreateRequest>({
    product_id: productId,
    variant_name: '',
    sku: '',
    buying_price: undefined,
    selling_price: undefined,
    min_stock_level: undefined,
    reorder_quantity: undefined,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, router, productId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productData, variantsData] = await Promise.all([
        productsAPI.getById(productId),
        productVariantsAPI.getAll({ product_id: productId }),
      ]);
      setProduct(productData);
      setVariants(variantsData);
    } catch (error: any) {
      toast.error('Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSku = async () => {
    setGeneratingSku(true);
    try {
      const sku = await productVariantsAPI.generateSku();
      setFormData((prev) => ({ ...prev, sku }));
    } catch {
      toast.error('Failed to generate SKU');
    } finally {
      setGeneratingSku(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVariant) {
        await productVariantsAPI.update(editingVariant.id, formData);
        toast.success('Variant updated successfully');
      } else {
        await productVariantsAPI.create(formData);
        toast.success('Variant created successfully');
      }
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save variant');
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      product_id: variant.product_id,
      variant_name: variant.variant_name,
      sku: variant.sku || '',
      buying_price: variant.buying_price || undefined,
      selling_price: variant.selling_price || undefined,
      min_stock_level: variant.min_stock_level || undefined,
      reorder_quantity: variant.reorder_quantity || undefined,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    try {
      await productVariantsAPI.delete(id);
      toast.success('Variant deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete variant');
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingVariant(null);
    setFormData({
      product_id: productId,
      variant_name: product?.name || '',
      sku: '',
      buying_price: undefined,
      selling_price: undefined,
      min_stock_level: undefined,
      reorder_quantity: undefined,
    });
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Product not found</p>
          <Link href="/products/list">
            <Button className="mt-4">Back to Products</Button>
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
              <Link href="/products/list">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                  <p className="text-sm text-gray-600">Manage product variants</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                setFormData((prev) => ({ ...prev, variant_name: product?.name || '' }));
                setShowCreateForm(true);
              }}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Variant</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Product Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">SKU</p>
              <p className="text-base font-semibold text-gray-900 font-mono">
                {product.sku || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Buying Price</p>
              <p className="text-base font-semibold text-gray-900">
                {product.avg_buying_price
                  ? `KES ${Number(product.avg_buying_price).toLocaleString()}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Selling Price</p>
              <p className="text-base font-semibold text-gray-900">
                {product.avg_selling_price
                  ? `KES ${Number(product.avg_selling_price).toLocaleString()}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Variants</p>
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {product.variant_count} {product.variant_count === 1 ? 'variant' : 'variants'}
              </span>
            </div>
          </div>
          {product.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Description</p>
              <p className="text-base text-gray-900 mt-1">{product.description}</p>
            </div>
          )}
        </div>

        {/* Create/Edit Variant Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingVariant ? 'Edit Variant' : 'Create New Variant'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Variant Name *"
                  value={formData.variant_name}
                  onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                  placeholder="e.g., 128GB Silver, Large, XL"
                  required
                />

                {/* SKU with Generate button */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    SKU (Optional)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g., IP15-128-SLV"
                      className="flex-1 px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      disabled={generatingSku}
                      className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 whitespace-nowrap border-2 border-purple-200"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>{generatingSku ? 'Generating...' : 'Generate'}</span>
                    </button>
                  </div>
                </div>

                <Input
                  label="Buying Price"
                  type="number"
                  step="0.01"
                  value={formData.buying_price || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    buying_price: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  placeholder="0.00"
                />

                <Input
                  label="Selling Price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    selling_price: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  placeholder="0.00"
                />

                <Input
                  label="Minimum Stock Level"
                  type="number"
                  value={formData.min_stock_level || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    min_stock_level: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="0"
                />

                <Input
                  label="Reorder Quantity"
                  type="number"
                  value={formData.reorder_quantity || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    reorder_quantity: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="0"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  {editingVariant ? 'Update Variant' : 'Create Variant'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Variants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Product Variants ({variants.length})
            </h3>
          </div>

          {variants.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No variants yet. Create your first variant!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Buying Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Reorder Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-semibold">{variant.variant_name}</TableCell>
                    <TableCell className="text-gray-600 font-mono text-sm">
                      {variant.sku || '-'}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {variant.buying_price ? `KES ${Number(variant.buying_price).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-gray-900 font-semibold">
                      {variant.selling_price ? `KES ${Number(variant.selling_price).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {variant.min_stock_level ?? '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {variant.reorder_quantity ?? '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        variant.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {variant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(variant)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(variant.id)}
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