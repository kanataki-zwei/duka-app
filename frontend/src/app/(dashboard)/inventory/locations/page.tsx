'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { storageLocationsAPI, StorageLocation, StorageLocationCreateRequest, LocationType } from '@/lib/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Warehouse, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function StorageLocationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);

  // Form state
  const [formData, setFormData] = useState<StorageLocationCreateRequest>({
    name: '',
    location_type: LocationType.WAREHOUSE,
    address: '',
    description: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadLocations();
  }, [user, router]);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const data = await storageLocationsAPI.getAll();
      setLocations(data);
    } catch (error: any) {
      toast.error('Failed to load storage locations');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLocation) {
        await storageLocationsAPI.update(editingLocation.id, formData);
        toast.success('Storage location updated successfully');
      } else {
        await storageLocationsAPI.create(formData);
        toast.success('Storage location created successfully');
      }
      
      // Reset form
      resetForm();
      
      // Reload locations
      loadLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save storage location');
    }
  };

  const handleEdit = (location: StorageLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      location_type: location.location_type as LocationType,
      address: location.address || '',
      description: location.description || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this storage location?')) {
      return;
    }

    try {
      await storageLocationsAPI.delete(id);
      toast.success('Storage location deleted successfully');
      loadLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete storage location');
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      location_type: LocationType.WAREHOUSE,
      address: '',
      description: '',
    });
  };

  const getLocationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      warehouse: 'Warehouse',
      shop: 'Shop',
      store: 'Store',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getLocationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      warehouse: 'bg-blue-100 text-blue-800',
      shop: 'bg-green-100 text-green-800',
      store: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
                <Warehouse className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Storage Locations</h1>
                <p className="text-sm text-gray-600">Manage warehouses, shops, and stores</p>
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
                <span>Add Location</span>
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
              {editingLocation ? 'Edit Storage Location' : 'Create New Storage Location'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Location Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Warehouse, Shop A"
                  required
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Location Type *
                  </label>
                  <select
                    value={formData.location_type}
                    onChange={(e) => setFormData({ ...formData, location_type: e.target.value as LocationType })}
                    required
                    className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={LocationType.WAREHOUSE}>Warehouse</option>
                    <option value={LocationType.SHOP}>Shop</option>
                    <option value={LocationType.STORE}>Store</option>
                    <option value={LocationType.OTHER}>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Physical address"
                  rows={2}
                  className="w-full px-4 py-3 text-gray-900 text-base font-medium bg-white border-2 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Locations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading storage locations...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="p-8 text-center">
              <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No storage locations yet. Create your first location!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-semibold">{location.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getLocationTypeColor(location.location_type)}`}>
                        {getLocationTypeLabel(location.location_type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {location.address ? (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{location.address}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {location.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        location.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(location)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(location.id)}
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