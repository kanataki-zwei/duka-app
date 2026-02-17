'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { salesAPI, SaleWithDetails, CreditNoteCreateRequest, CreditNoteItemRequest } from '@/lib/sales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnItem {
  sale_item_id: string;
  product_name: string;
  variant_name: string;
  original_quantity: number;
  return_quantity: number;
  unit_price: number;
  selected: boolean;
}

export default function CreateCreditNotePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [originalSale, setOriginalSale] = useState<SaleWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadOriginalSale();
  }, [user, router, params.id]);

  const loadOriginalSale = async () => {
    try {
      setIsLoading(true);
      const data = await salesAPI.getById(params.id as string);
      
      // Verify it's an invoice
      if (data.sale_type !== 'invoice') {
        toast.error('Can only create credit notes for invoices');
        router.push(`/sales/${params.id}`);
        return;
      }

      setOriginalSale(data);

      // Initialize return items from original sale items
      const items: ReturnItem[] = data.items.map(item => ({
        sale_item_id: item.id,
        product_name: item.product_variant?.products?.name || 'Unknown Product',
        variant_name: item.product_variant?.variant_name || 'Unknown Variant',
        original_quantity: item.quantity,
        return_quantity: 0,
        unit_price: item.unit_price,
        selected: false,
      }));
      setReturnItems(items);
    } catch (error: any) {
      toast.error('Failed to load original sale');
      console.error(error);
      router.push('/sales');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemSelection = (saleItemId: string) => {
    setReturnItems(items =>
      items.map(item => {
        if (item.sale_item_id === saleItemId) {
          return {
            ...item,
            selected: !item.selected,
            return_quantity: !item.selected ? item.original_quantity : 0,
          };
        }
        return item;
      })
    );
  };

  const updateReturnQuantity = (saleItemId: string, quantity: number) => {
    setReturnItems(items =>
      items.map(item => {
        if (item.sale_item_id === saleItemId) {
          // Ensure quantity doesn't exceed original
          const validQuantity = Math.min(Math.max(0, quantity), item.original_quantity);
          return { ...item, return_quantity: validQuantity };
        }
        return item;
      })
    );
  };

  const calculateReturnTotal = () => {
    const subtotal = returnItems
      .filter(item => item.selected && item.return_quantity > 0)
      .reduce((sum, item) => sum + (item.return_quantity * item.unit_price), 0);

    const discountPercentage = originalSale?.discount_percentage || 0;
    const discount = (subtotal * discountPercentage) / 100;
    const total = subtotal - discount;

    return { subtotal, discount, total, discountPercentage };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originalSale) return;

    // Validate at least one item is selected
    const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    // Validate all selected items have return quantity > 0
    for (const item of selectedItems) {
      if (item.return_quantity <= 0) {
        toast.error('Return quantity must be greater than 0 for selected items');
        return;
      }
      if (item.return_quantity > item.original_quantity) {
        toast.error(`Return quantity cannot exceed original quantity for ${item.product_name}`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const creditNoteItems: CreditNoteItemRequest[] = selectedItems.map(item => ({
        sale_item_id: item.sale_item_id,
        return_quantity: item.return_quantity,
      }));

      const payload: CreditNoteCreateRequest = {
        original_sale_id: originalSale.id,
        sale_date: saleDate,
        items: creditNoteItems,
        notes: notes || undefined,
      };

      const creditNote = await salesAPI.createCreditNote(payload);
      toast.success('Credit note created successfully');
      router.push(`/sales/${creditNote.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create credit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!originalSale) {
    return null;
  }

  const returnTotals = calculateReturnTotal();
  const hasSelectedItems = returnItems.some(item => item.selected && item.return_quantity > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/sales/${params.id}`}>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Credit Note</h1>
                <p className="text-sm text-gray-600 mt-1">
                  For Invoice: {originalSale.sale_number}
                </p>
              </div>
            </div>
            <Link href={`/sales/${params.id}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Alert */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Creating Credit Note</h3>
              <p className="text-sm text-blue-700 mt-1">
                Select the items being returned and specify the return quantities. 
                The original invoice will remain unchanged for audit purposes.
              </p>
            </div>
          </div>

          {/* Credit Note Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Credit Note Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Customer (Locked)
                </label>
                <div className="px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg">
                  {originalSale.customer?.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Storage Location (Locked)
                </label>
                <div className="px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg">
                  {originalSale.storage_location?.name}
                </div>
              </div>

              <Input
                label="Credit Note Date *"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Return Items */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Items to Return</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Original Qty</TableHead>
                  <TableHead className="text-right">Return Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Return Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnItems.map((item) => (
                  <TableRow key={item.sale_item_id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelection(item.sale_item_id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{item.product_name}</div>
                      <div className="text-sm text-gray-600">{item.variant_name}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.original_quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.selected ? (
                        <input
                          type="number"
                          min="1"
                          max={item.original_quantity}
                          value={item.return_quantity}
                          onChange={(e) => updateReturnQuantity(item.sale_item_id, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      KES {item.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {item.selected && item.return_quantity > 0
                        ? `- KES ${(item.return_quantity * item.unit_price).toLocaleString()}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Credit Note Totals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Credit Note Summary</h2>
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-semibold text-red-600">
                  - KES {returnTotals.subtotal.toLocaleString()}
                </span>
              </div>
              {returnTotals.discountPercentage > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount ({returnTotals.discountPercentage}%):</span>
                  <span className="font-semibold">
                    + KES {returnTotals.discount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-red-600 pt-3 border-t">
                <span>Credit Note Total:</span>
                <span>- KES {returnTotals.total.toLocaleString()}</span>
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
              placeholder="Reason for return or additional notes"
              rows={3}
              className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Link href={`/sales/${params.id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting || !hasSelectedItems}>
              {isSubmitting ? 'Creating...' : 'Create Credit Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}