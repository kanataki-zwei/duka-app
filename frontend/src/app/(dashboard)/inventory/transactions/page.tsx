'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  inventoryTransactionsAPI,
  storageLocationsAPI,
  productVariantsAPI,
  suppliersAPI,
  InventoryTransactionWithDetails,
  StorageLocation,
  TransactionType,
  InventoryTransactionCreateRequest
} from '@/lib/inventory';
import { ProductVariant } from '@/lib/products';
import { SupplierWithCategories } from '@/lib/suppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, ArrowUp, ArrowDown, RefreshCw, ArrowLeftRight, Package, RotateCcw, DollarSign } from 'lucide-react';
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

  // Form state
  const [formData, setFormData] = useState<any>({
    product_variant_id: '',
    transaction_type: TransactionType.IN,
    quantity: '',
    from_location_id: undefined,
    to_location_id: undefined,
    notes: undefined,
    supplier_id: undefined,
    unit_cost: '',
    payment_status: 'unpaid',
    amount_paid: '',
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
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-populate unit cost from selected variant's buying price
  useEffect(() => {
    if (formData.product_variant_id && variants.length > 0) {
      const selectedVariant = variants.find(v => v.id === formData.product_variant_id);
      const buyingPrice = selectedVariant?.buying_price ?? null;
      if (buyingPrice) {
        setFormData((prev: any) => ({
          ...prev,
          unit_cost: buyingPrice.toString()
        }));
      }
    }
  }, [formData.product_variant_id, variants]);

  // Auto-calculate total_cost and amount_due
  useEffect(() => {
    const unitCost = formData.unit_cost ? parseFloat(formData.unit_cost) : 0;
    const quantity = formData.quantity ? parseInt(formData.quantity) : 0;
    
    if (unitCost && quantity) {
      const total = unitCost * quantity;
      
      // Auto-fill amount_paid if payment status is 'paid'
      let amountPaid = 0;
      
      if (formData.payment_status === 'paid') {
        amountPaid = total;
      } else if (formData.payment_status === 'partial' && formData.amount_paid) {
        amountPaid = parseFloat(formData.amount_paid);
      } else if (formData.amount_paid) {
        amountPaid = parseFloat(formData.amount_paid);
      }
      
      const due = total - amountPaid;
      
      setFormData((prev: any) => ({
        ...prev,
        total_cost: total,
        amount_paid: formData.payment_status === 'paid' ? total.toString() : prev.amount_paid,
        amount_due: due
      }));
    }
  }, [formData.unit_cost, formData.quantity, formData.payment_status, formData.amount_paid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate based on transaction type
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

      // Build clean payload with proper number parsing
      const payload: any = {
        product_variant_id: formData.product_variant_id,
        transaction_type: formData.transaction_type,
        quantity: parseInt(formData.quantity),
      };

      if (formData.from_location_id) {
        payload.from_location_id = formData.from_location_id;
      }
      
      if (formData.to_location_id) {
        payload.to_location_id = formData.to_location_id;
      }

      if (formData.notes && formData.notes.trim()) {
        payload.notes = formData.notes;
      }

      // Add supplier and payment fields
      if (formData.supplier_id) {
        payload.supplier_id = formData.supplier_id;
      }

      if (formData.unit_cost) {
        payload.unit_cost = parseFloat(formData.unit_cost);
      }

      if (formData.total_cost) {
        payload.total_cost = formData.total_cost;
      }

      // IMPORTANT: Always send payment_status for Stock In transactions
      if (formData.transaction_type === TransactionType.IN) {
        payload.payment_status = formData.payment_status || 'unpaid';
        
        if (formData.amount_paid) {
          payload.amount_paid = parseFloat(formData.amount_paid);
        } else {
          payload.amount_paid = 0;
        }

        if (formData.amount_due !== undefined) {
          payload.amount_due = formData.amount_due;
        }
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
    if (!confirm('Are you sure you want to reverse this transaction? This will create an opposite transaction to undo the stock changes.')) {
      return;
    }

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
    setFormData({
      product_variant_id: '',
      transaction_type: TransactionType.IN,
      quantity: '',
      from_location_id: undefined,
      to_location_id: undefined,
      notes: undefined,
      supplier_id: undefined,
      unit_cost: '',
      payment_status: 'unpaid',
      amount_paid: '',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowDown className="w-4 h-4" />;
      case 'out':
        return <ArrowUp className="w-4 h-4" />;
      case 'transfer':
        return <ArrowLeftRight className="w-4 h-4" />;
      case 'adjustment':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800';
      case 'out':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'in':
        return 'Stock In';
      case 'out':
        return 'Stock Out';
      case 'transfer':
        return 'Transfer';
      case 'adjustment':
        return 'Adjustment';
      default:
        return type;
    }
  };

  const getPaymentStatusColor = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProductName = (txn: InventoryTransactionWithDetails) => {
    if (!txn.product_variant) return 'Unknown Product';
    return `${txn.product_variant.products.name} - ${txn.product_variant.variant_name}`;
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
                <Button variant="outline">
                  View Stock
                </Button>
              </Link>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Transaction</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Transaction
            </h2>
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

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Product Variant *
                  </label>
                  <select
                    value={formData.product_variant_id}
                    onChange={(e) => setFormData({ ...formData, product_variant_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a product variant</option>
                    {variants.map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.variant_name} {variant.sku ? `(${variant.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.transaction_type === TransactionType.OUT || 
                  formData.transaction_type === TransactionType.TRANSFER) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      From Location *
                    </label>
                    <select
                      value={formData.from_location_id || ''}
                      onChange={(e) => setFormData({ ...formData, from_location_id: e.target.value })}
                      required
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select source location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(formData.transaction_type === TransactionType.IN || 
                  formData.transaction_type === TransactionType.TRANSFER) && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      To Location *
                    </label>
                    <select
                      value={formData.to_location_id || ''}
                      onChange={(e) => setFormData({ ...formData, to_location_id: e.target.value })}
                      required
                      className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select destination location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Input
                  label="Quantity *"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  required
                />
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
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Supplier *
                      </label>
                      <select
                        value={formData.supplier_id || ''}
                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                        required
                        className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
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
                      placeholder="Cost per unit (auto-filled)"
                    />

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Total Cost (Auto-calculated)
                      </label>
                      <div className="w-full px-4 py-3 text-gray-900 text-base font-bold bg-gray-50 border-2 border-gray-300 rounded-lg">
                        {formData.total_cost ? `KES ${formData.total_cost.toLocaleString()}` : 'KES 0.00'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Payment Status
                      </label>
                      <select
                        value={formData.payment_status || 'unpaid'}
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
                        {formData.amount_due !== undefined ? `KES ${formData.amount_due.toLocaleString()}` : 'KES 0.00'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this transaction"
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  Create Transaction
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No transactions yet. Create your first transaction!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
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
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(txn.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded flex items-center space-x-1 w-fit ${getTransactionColor(txn.transaction_type)}`}>
                          {getTransactionIcon(txn.transaction_type)}
                          <span>{getTransactionLabel(txn.transaction_type)}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {getProductName(txn)}
                      </TableCell>
                      <TableCell className="font-bold text-gray-900">
                        {txn.quantity}
                      </TableCell>
                      <TableCell className="text-sm">
                        {txn.from_location?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {txn.to_location?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {txn.supplier?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {txn.total_cost ? (
                          <div>
                            <div className="font-semibold">KES {txn.total_cost.toLocaleString()}</div>
                            {txn.unit_cost && (
                              <div className="text-xs text-gray-500">
                                @{txn.unit_cost.toLocaleString()}/unit
                              </div>
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
                                Due: KES {txn.amount_due.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {txn.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.reference_type !== 'reversal' && (
                          <button
                            onClick={() => handleReverse(txn.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Reverse Transaction"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {txn.reference_type === 'reversal' && (
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