'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { salesAPI, SaleCreateRequest, SaleItemCreateRequest } from '@/lib/sales';
import { customersAPI, CustomerWithDetails } from '@/lib/customers';
import { storageLocationsAPI, StorageLocation, productVariantsAPI } from '@/lib/inventory';
import { ProductVariant } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ShoppingCart, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LineItem {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Selected customer details
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);

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
      const [customersData, locationsData, variantsData] = await Promise.all([
        customersAPI.getAll(),
        storageLocationsAPI.getAll(),
        productVariantsAPI.getAll(),
      ]);
      setCustomers(customersData);
      setLocations(locationsData);
      setVariants(variantsData);
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Math.random().toString(36).substr(2, 9),
        product_variant_id: '',
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-fill unit price when variant is selected
        if (field === 'product_variant_id' && value) {
          const variant = variants.find(v => v.id === value);
          if (variant?.selling_price) {
            updated.unit_price = variant.selling_price;
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    const discountPercentage = selectedCustomer?.customer_tier?.discount_percentage || 0;
    return (subtotal * discountPercentage) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const checkCreditLimit = () => {
    if (!selectedCustomer || selectedCustomer.customer_type === 'walk-in') {
      return { allowed: true, message: '' };
    }

    const total = calculateTotal();
    const newBalance = selectedCustomer.current_balance + total;
    const availableCredit = selectedCustomer.credit_limit - selectedCustomer.current_balance;

    if (newBalance > selectedCustomer.credit_limit) {
      return {
        allowed: false,
        message: `Credit limit exceeded. Available credit: KES ${availableCredit.toLocaleString()}`
      };
    }

    return { allowed: true, message: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!locationId) {
      toast.error('Please select a storage location');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate all line items
    for (const item of lineItems) {
      if (!item.product_variant_id) {
        toast.error('Please select a product for all line items');
        return;
      }
      if (item.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return;
      }
      if (item.unit_price <= 0) {
        toast.error('Unit price must be greater than 0');
        return;
      }
    }

    // Check credit limit
    const creditCheck = checkCreditLimit();
    if (!creditCheck.allowed) {
      toast.error(creditCheck.message);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: SaleCreateRequest = {
        customer_id: customerId,
        sale_date: saleDate,
        storage_location_id: locationId,
        items: lineItems.map(item => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        notes: notes || undefined,
      };

      const sale = await salesAPI.create(payload);
      toast.success('Invoice created successfully');
      router.push(`/sales/${sale.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  const discountPercentage = selectedCustomer?.customer_tier?.discount_percentage || 0;
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
                <p className="text-sm text-gray-600">Create a new sales invoice</p>
              </div>
            </div>
            <Link href="/sales">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invoice Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Customer *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.customer_tier && ` (${customer.customer_tier.discount_percentage}% discount)`}
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && selectedCustomer.customer_type !== 'walk-in' && (
                    <div className="mt-2 text-sm">
                      <div className="text-gray-600">
                        Credit Limit: KES {selectedCustomer.credit_limit.toLocaleString()}
                      </div>
                      <div className="text-gray-600">
                        Current Balance: KES {selectedCustomer.current_balance.toLocaleString()}
                      </div>
                      <div className={`font-semibold ${
                        (selectedCustomer.credit_limit - selectedCustomer.current_balance) > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        Available Credit: KES {(selectedCustomer.credit_limit - selectedCustomer.current_balance).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Storage Location *
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Sale Date *"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Items</h2>
                <Button type="button" onClick={addLineItem} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-5">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Product Variant *
                        </label>
                        <select
                          value={item.product_variant_id}
                          onChange={(e) => updateLineItem(item.id, 'product_variant_id', e.target.value)}
                          required
                          className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select product</option>
                          {variants.map(variant => (
                            <option key={variant.id} value={variant.id}>
                              {variant.variant_name} {variant.sku ? `(${variant.sku})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <Input
                          label="Quantity *"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          label="Unit Price *"
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Line Total
                        </label>
                        <div className="px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg font-bold">
                          {(item.quantity * item.unit_price).toLocaleString()}
                        </div>
                      </div>

                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">KES {subtotal.toLocaleString()}</span>
                </div>
                {discountPercentage > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount ({discountPercentage}%):</span>
                    <span className="font-semibold">- KES {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                  <span>Total:</span>
                  <span>KES {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this sale"
                rows={3}
                className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Credit Warning */}
            {selectedCustomer && selectedCustomer.customer_type !== 'walk-in' && !checkCreditLimit().allowed && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Credit Limit Exceeded</h3>
                  <p className="text-sm text-red-700 mt-1">{checkCreditLimit().message}</p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <Link href="/sales">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || !checkCreditLimit().allowed}>
                {isSubmitting ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}