'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  inventoryTransactionsAPI,
  storageLocationsAPI,
  suppliersAPI,
  InventoryTransactionWithDetails,
  StorageLocation,
  TransactionType,
} from '@/lib/inventory';
import { productVariantsAPI, ProductVariant } from '@/lib/products';
import { SupplierWithCategories } from '@/lib/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, ArrowUp, ArrowDown, RefreshCw, ArrowLeftRight, Package, RotateCcw, DollarSign, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryTransactionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<InventoryTransactionWithDetails[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');

  // Variant search
  const [variantSearch, setVariantSearch] = useState('');
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const variantSearchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    product_variant_id: '',
    transaction_type: TransactionType.IN,
    quantity: '',
    from_location_id: '',
    to_location_id: '',
    adjustment_location_id: '',
    notes: '',
    supplier_id: '',
    unit_cost: '',
    total_cost: 0,
    payment_status: 'unpaid',
    amount_paid: '',
    amount_due: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, router]);

  // Close variant dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (variantSearchRef.current && !variantSearchRef.current.contains(e.target as Node)) {
        setShowVariantDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [txnsData, locationsData, variantsData, suppliersData] = await Promise.all([
        inventoryTransactionsAPI.getAll({ limit: 100 }),
        storageLocationsAPI.getAll(),
        productVariantsAPI.getAll(),
        suppliersAPI.getAll(),
      ]);
      setTransactions(txnsData);
      setLocations(locationsData);
      setVariants(variantsData);
      setSuppliers(suppliersData);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter variants based on search
  const filteredVariants = variants.filter(v => {
    const search = variantSearch.toLowerCase();
    const productName = (v as any).products?.name?.toLowerCase() || '';
    const variantName = v.variant_name?.toLowerCase() || '';
    const sku = v.sku?.toLowerCase() || '';
    return productName.includes(search) || variantName.includes(search) || sku.includes(search);
  });

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setVariantSearch(`${(variant as any).products?.name || ''} - ${variant.variant_name}`);
    setShowVariantDropdown(false);
    const buyingPrice = (variant as any).buying_price;
    setFormData((prev: any) => ({
      ...prev,
      product_variant_id: variant.id,
      unit_cost: buyingPrice ? buyingPrice.toString() : prev.unit_cost,
    }));
  };

  // Calculate totals when unit cost, quantity, payment status or amount paid changes
  useEffect(() => {
    const unitCost = parseFloat(formData.unit_cost) || 0;
    const quantity = parseInt(formData.quantity) || 0;

    if (unitCost && quantity) {
      const total = unitCost * quantity;
      let amountPaid = 0;

      if (formData.payment_status === 'paid') {
        amountPaid = total;
      } else if (formData.amount_paid && formData.payment_status !== 'paid') {
        amountPaid = parseFloat(formData.amount_paid) || 0;
      }

      const due = total - amountPaid;

      setFormData((prev: any) => ({
        ...prev,
        total_cost: total,
        amount_due: due,
        ...(prev.payment_status === 'paid' ? { amount_paid: total.toString() } : {}),
      }));
    }
  }, [formData.unit_cost, formData.quantity, formData.payment_status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.product_variant_id) {
        toast.error('Please select a product variant');
        return;
      }

      if (formData.transaction_type === TransactionType.IN && !formData.to_location_id) {
        toast.error('Please select a destination location for stock in');
        return;
      }

      if (formData.transaction_type === TransactionType.OUT && !formData.from_location_id) {
        toast.error('Please select a source location for stock out');
        return;
      }

      if (formData.transaction_type === TransactionType.TRANSFER) {
        if (!formData.from_location_id || !formData.to_location_id) {
          toast.error('Please select both source and destination for transfer');
          return;
        }
        if (formData.from_location_id === formData.to_location_id) {
          toast.error('Source and destination must be different');
          return;
        }
      }

      if (formData.transaction_type === TransactionType.ADJUSTMENT && !formData.adjustment_location_id) {
        toast.error('Please select a location for adjustment');
        return;
      }

      const payload: any = {
        product_variant_id: formData.product_variant_id,
        transaction_type: formData.transaction_type,
        quantity: Math.abs(parseInt(formData.quantity)),
      };

      if (formData.transaction_type === TransactionType.IN) {
        payload.to_location_id = formData.to_location_id;
        payload.supplier_id = formData.supplier_id;
        payload.unit_cost = parseFloat(formData.unit_cost);
        payload.total_cost = formData.total_cost;
        payload.payment_status = formData.payment_status;
        payload.amount_paid = parseFloat(formData.amount_paid) || 0;
        payload.amount_due = formData.amount_due;
      } else if (formData.transaction_type === TransactionType.OUT) {
        payload.from_location_id = formData.from_location_id;
      } else if (formData.transaction_type === TransactionType.TRANSFER) {
        payload.from_location_id = formData.from_location_id;
        payload.to_location_id = formData.to_location_id;
      } else if (formData.transaction_type === TransactionType.ADJUSTMENT) {
        const qty = parseInt(formData.quantity);
        if (qty >= 0) {
          payload.to_location_id = formData.adjustment_location_id;
        } else {
          payload.from_location_id = formData.adjustment_location_id;
          payload.quantity = Math.abs(qty);
        }
      }

      if (formData.notes?.trim()) {
        payload.notes = formData.notes;
      }

      await inventoryTransactionsAPI.create(payload);
      toast.success('Transaction created successfully');
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create transaction');
    }
  };

  const handleReverse = async (transactionId: string) => {
    if (!confirm('Are you sure you want to reverse this transaction? This will create an opposite transaction to undo the stock changes.')) return;
    try {
      await inventoryTransactionsAPI.reverse(transactionId);
      toast.success('Transaction reversed successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reverse transaction');
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setSelectedVariant(null);
    setVariantSearch('');
    setFormData({
      product_variant_id: '',
      transaction_type: TransactionType.IN,
      quantity: '',
      from_location_id: '',
      to_location_id: '',
      adjustment_location_id: '',
      notes: '',
      supplier_id: '',
      unit_cost: '',
      total_cost: 0,
      payment_status: 'unpaid',
      amount_paid: '',
      amount_due: 0,
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'in': return <ArrowDown className="w-4 h-4" />;
      case 'out': return <ArrowUp className="w-4 h-4" />;
      case 'transfer': return <ArrowLeftRight className="w-4 h-4" />;
      case 'adjustment': return <RefreshCw className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'in': return 'bg-green-100 text-green-800';
      case 'out': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-blue-100 text-blue-800';
      case 'adjustment': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Stock In';
      case 'out': return 'Stock Out';
      case 'transfer': return 'Transfer';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  const getPaymentStatusColor = (status: string | null) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProductName = (txn: InventoryTransactionWithDetails) => {
    if (!txn.product_variant) return 'Unknown Product';
    return `${(txn.product_variant as any).products?.name || ''} - ${txn.product_variant.variant_name}`;
  };

  const filteredTransactions = transactions.filter(txn => {
    if (filterType && txn.transaction_type !== filterType) return false;
    if (filterLocation) {
      if (txn.from_location?.id !== filterLocation && txn.to_location?.id !== filterLocation) return false;
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock Transactions</h1>
                <p className="text-sm text-gray-600">Add, remove, or transfer inventory</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/inventory/stock">
                <Button variant="outline">View Stock</Button>
              </Link>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>New Transaction</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Transaction</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Transaction Type and Product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Transaction Type *
                  </label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as TransactionType })}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={TransactionType.IN}>Stock In (Receiving)</option>
                    <option value={TransactionType.OUT}>Stock Out (Sales/Usage)</option>
                    <option value={TransactionType.TRANSFER}>Transfer (Between Locations)</option>
                    <option value={TransactionType.ADJUSTMENT}>Adjustment (Manual)</option>
                  </select>
                </div>

                {/* Searchable Variant Selector */}
                <div ref={variantSearchRef}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Product Variant *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by product or variant name..."
                      value={variantSearch}
                      onChange={(e) => {
                        setVariantSearch(e.target.value);
                        setShowVariantDropdown(true);
                        if (!e.target.value) {
                          setSelectedVariant(null);
                          setFormData((prev: any) => ({ ...prev, product_variant_id: '', unit_cost: '' }));
                        }
                      }}
                      onFocus={() => setShowVariantDropdown(true)}
                      className="w-full pl-10 pr-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {showVariantDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredVariants.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">No variants found</div>
                        ) : (
                          filteredVariants.map(variant => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => handleVariantSelect(variant)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                            >
                              <div className="font-semibold text-gray-900 text-sm">
                                {variant.variant_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {variant.variant_name}
                                {variant.sku && ` • SKU: ${variant.sku}`}
                                {(variant as any).buying_price && ` • KES ${(variant as any).buying_price.toLocaleString()}`}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedVariant && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Selected: {(selectedVariant as any).products?.name} - {selectedVariant.variant_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.transaction_type === TransactionType.OUT ||
                  formData.transaction_type === TransactionType.TRANSFER) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">From Location *</label>
                    <select
                      value={formData.from_location_id}
                      onChange={(e) => setFormData({ ...formData, from_location_id: e.target.value })}
                      required
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select source location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>{location.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(formData.transaction_type === TransactionType.IN ||
                  formData.transaction_type === TransactionType.TRANSFER) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">To Location *</label>
                    <select
                      value={formData.to_location_id}
                      onChange={(e) => setFormData({ ...formData, to_location_id: e.target.value })}
                      required
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select destination location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>{location.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.transaction_type === TransactionType.ADJUSTMENT && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Location *</label>
                    <select
                      value={formData.adjustment_location_id}
                      onChange={(e) => setFormData({ ...formData, adjustment_location_id: e.target.value })}
                      required
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>{location.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Quantity * {formData.transaction_type === TransactionType.ADJUSTMENT && (
                      <span className="text-xs font-normal text-gray-500">(use negative to remove stock)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={formData.transaction_type === TransactionType.ADJUSTMENT ? undefined : 1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder={formData.transaction_type === TransactionType.ADJUSTMENT ? 'e.g. 10 or -5' : 'Enter quantity'}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Supplier and Cost Section (Only for Stock In) */}
              {formData.transaction_type === TransactionType.IN && (
                <div className="border-t pt-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Supplier & Payment Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Supplier *</label>
                      <select
                        value={formData.supplier_id}
                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                        required
                        className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Unit Cost (KES)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                      placeholder="Cost per unit"
                    />

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Total Cost (Auto-calculated)
                      </label>
                      <div className="w-full px-4 py-3 text-gray-900 text-base font-bold bg-gray-50 border-2 border-gray-300 rounded-lg">
                        {formData.total_cost ? `KES ${Number(formData.total_cost).toLocaleString('en-KE')}` : 'KES 0.00'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Status</label>
                      <select
                        value={formData.payment_status}
                        onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                        className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial Payment</option>
                        <option value="paid">Fully Paid</option>
                      </select>
                    </div>

                    <Input
                      label="Amount Paid (KES)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                      placeholder="Amount already paid"
                      disabled={formData.payment_status === 'paid'}
                    />

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Amount Due (Auto-calculated)
                      </label>
                      <div className={`w-full px-4 py-3 text-base font-bold border-2 border-gray-300 rounded-lg ${
                        (formData.amount_due || 0) > 0 ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'
                      }`}>
                        {`KES ${Number(formData.amount_due || 0).toLocaleString('en-KE')}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this transaction"
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit">Create Transaction</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Transaction Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Types</option>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="transfer">Transfer</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Location</label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {filterType || filterLocation ? 'No transactions match your filters' : 'No transactions yet. Create your first transaction!'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(txn.created_at).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 w-fit ${getTransactionColor(txn.transaction_type)}`}>
                          {getTransactionIcon(txn.transaction_type)}
                          <span>{getTransactionLabel(txn.transaction_type)}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{getProductName(txn)}</TableCell>
                      <TableCell className="font-bold text-gray-900">{txn.quantity}</TableCell>
                      <TableCell className="text-sm">{txn.from_location?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{txn.to_location?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{txn.supplier?.name || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {txn.total_cost ? (
                          <div>
                            <div className="font-semibold">KES {Number(txn.total_cost).toLocaleString('en-KE')}</div>
                            {txn.unit_cost && (
                              <div className="text-xs text-gray-500">@{Number(txn.unit_cost).toLocaleString('en-KE')}/unit</div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {txn.payment_status ? (
                          <div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(txn.payment_status)}`}>
                              {txn.payment_status.charAt(0).toUpperCase() + txn.payment_status.slice(1)}
                            </span>
                            {txn.amount_due && txn.amount_due > 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                Due: KES {Number(txn.amount_due).toLocaleString('en-KE')}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {txn.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.reference_type !== 'reversal' ? (
                          <button
                            onClick={() => handleReverse(txn.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Reverse Transaction"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Reversal</span>
                        )}
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