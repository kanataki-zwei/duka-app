'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  inventoryItemsAPI, 
  storageLocationsAPI,
  InventoryItemWithDetails,
  StorageLocation 
} from '@/lib/inventory';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Package, AlertTriangle, Filter, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryStockPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [inventoryItems, setInventoryItems] = useState<InventoryItemWithDetails[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [showLowStock, setShowLowStock] = useState(false);

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
      const [itemsData, locationsData] = await Promise.all([
        inventoryItemsAPI.getAll({ low_stock: showLowStock }),
        storageLocationsAPI.getAll(),
      ]);
      setInventoryItems(itemsData);
      setLocations(locationsData);
    } catch (error: any) {
      toast.error('Failed to load inventory data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [showLowStock]);

  const filteredItems = inventoryItems.filter(item => {
    if (!filterLocation) return true;
    return item.storage_location_id === filterLocation;
  });

  const isLowStock = (item: InventoryItemWithDetails) => {
    if (!item.min_stock_level) return false;
    return item.quantity <= item.min_stock_level;
  };

  const getStockStatusColor = (item: InventoryItemWithDetails) => {
    if (item.quantity === 0) return 'text-red-600';
    if (isLowStock(item)) return 'text-orange-600';
    return 'text-green-600';
  };

  const getProductName = (item: InventoryItemWithDetails) => {
    if (!item.product_variant) return 'Unknown Product';
    return `${item.product_variant.products.name} - ${item.product_variant.variant_name}`;
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
                <h1 className="text-2xl font-bold text-gray-900">Inventory Stock</h1>
                <p className="text-sm text-gray-600">View stock levels across all locations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/inventory/locations">
                <Button variant="outline">
                  Manage Locations
                </Button>
              </Link>
              <Link href="/inventory/transactions">
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Stock</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="low-stock"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="low-stock" className="text-sm font-medium text-gray-900 cursor-pointer">
                Show only low stock items
              </label>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
              </div>
              <Package className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredItems.filter(isLowStock).length}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredItems.filter(item => item.quantity === 0).length}
                </p>
              </div>
              <Package className="w-10 h-10 text-red-600" />
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {showLowStock ? 'No low stock items found' : 'No inventory items yet. Add stock to get started!'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Min Level</TableHead>
                  <TableHead className="text-right">Max Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">
                      {getProductName(item)}
                    </TableCell>
                    <TableCell className="text-gray-600 font-mono text-sm">
                      {item.product_variant?.sku || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                        {item.storage_location?.name || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${getStockStatusColor(item)}`}>
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {item.min_stock_level || '-'}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {item.max_stock_level || '-'}
                    </TableCell>
                    <TableCell>
                      {item.quantity === 0 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                          Out of Stock
                        </span>
                      ) : isLowStock(item) ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full flex items-center space-x-1 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          In Stock
                        </span>
                      )}
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