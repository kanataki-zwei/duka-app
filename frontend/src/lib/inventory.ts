import { apiClient } from './axios';
import { productVariantsAPI } from './products';
import { suppliersAPI } from './suppliers';

// Export them
export { productVariantsAPI, suppliersAPI };

// ==========================================
// TYPES
// ==========================================

export enum LocationType {
  WAREHOUSE = 'warehouse',
  SHOP = 'shop',
  STORE = 'store',
  OTHER = 'other',
}

export enum TransactionType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

export interface StorageLocation {
  id: string;
  company_id: string;
  name: string;
  location_type: LocationType;
  address: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface InventoryItem {
  id: string;
  company_id: string;
  product_variant_id: string;
  storage_location_id: string;
  quantity: number;
  min_stock_level: number | null;
  max_stock_level: number | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemWithDetails extends InventoryItem {
  product_variant?: {
    id: string;
    variant_name: string;
    sku: string | null;
    product_id: string;
    products: {
      id: string;
      name: string;
    };
  };
  storage_location?: {
    id: string;
    name: string;
    location_type: string;
  };
}

export interface InventoryTransaction {
  id: string;
  company_id: string;
  product_variant_id: string;
  transaction_type: TransactionType;
  quantity: number;
  from_location_id: string | null;
  to_location_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // New fields for supplier and payment tracking
  supplier_id: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  payment_status: string | null;
  amount_paid: number | null;
  amount_due: number | null;
}

export interface InventoryTransactionWithDetails extends InventoryTransaction {
  product_variant?: {
    id: string;
    variant_name: string;
    sku: string | null;
    products: {
      id: string;
      name: string;
    };
  };
  from_location?: {
    id: string;
    name: string;
  };
  to_location?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

// Request types
export interface StorageLocationCreateRequest {
  name: string;
  location_type: LocationType;
  address?: string;
  description?: string;
}

export interface InventoryItemCreateRequest {
  product_variant_id: string;
  storage_location_id: string;
  quantity: number;
  min_stock_level?: number;
  max_stock_level?: number;
}

export interface InventoryTransactionCreateRequest {
  product_variant_id: string;
  transaction_type: TransactionType;
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  // New fields for supplier and payment tracking
  supplier_id?: string;
  unit_cost?: number;
  total_cost?: number;
  payment_status?: string;
  amount_paid?: number;
  amount_due?: number;
}

export interface StockAdjustmentRequest {
  product_variant_id: string;
  storage_location_id: string;
  quantity_change: number;
  notes?: string;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const storageLocationsAPI = {
  // Get all storage locations
  getAll: async (params?: {
    is_active?: boolean;
    location_type?: LocationType;
  }): Promise<StorageLocation[]> => {
    const response = await apiClient.get<StorageLocation[]>('/storage-locations', { params });
    return response.data;
  },

  // Get single storage location
  getById: async (id: string): Promise<StorageLocation> => {
    const response = await apiClient.get<StorageLocation>(`/storage-locations/${id}`);
    return response.data;
  },

  // Create storage location
  create: async (data: StorageLocationCreateRequest): Promise<StorageLocation> => {
    const response = await apiClient.post<StorageLocation>('/storage-locations', data);
    return response.data;
  },

  // Update storage location
  update: async (id: string, data: Partial<StorageLocationCreateRequest>): Promise<StorageLocation> => {
    const response = await apiClient.put<StorageLocation>(`/storage-locations/${id}`, data);
    return response.data;
  },

  // Delete storage location
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/storage-locations/${id}`);
  },
};

export const inventoryItemsAPI = {
  // Get all inventory items
  getAll: async (params?: {
    storage_location_id?: string;
    low_stock?: boolean;
  }): Promise<InventoryItemWithDetails[]> => {
    const response = await apiClient.get<InventoryItemWithDetails[]>('/inventory-items', { params });
    return response.data;
  },

  // Get single inventory item
  getById: async (id: string): Promise<InventoryItemWithDetails> => {
    const response = await apiClient.get<InventoryItemWithDetails>(`/inventory-items/${id}`);
    return response.data;
  },

  // Create inventory item
  create: async (data: InventoryItemCreateRequest): Promise<InventoryItem> => {
    const response = await apiClient.post<InventoryItem>('/inventory-items', data);
    return response.data;
  },

  // Update inventory item
  update: async (id: string, data: Partial<InventoryItemCreateRequest>): Promise<InventoryItem> => {
    const response = await apiClient.put<InventoryItem>(`/inventory-items/${id}`, data);
    return response.data;
  },

  // Delete inventory item
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory-items/${id}`);
  },
};

export const inventoryTransactionsAPI = {
  // Get all transactions
  getAll: async (params?: {
    product_variant_id?: string;
    storage_location_id?: string;
    transaction_type?: TransactionType;
    limit?: number;
  }): Promise<InventoryTransactionWithDetails[]> => {
    const response = await apiClient.get<InventoryTransactionWithDetails[]>('/inventory-transactions', { params });
    return response.data;
  },

  // Create transaction
  create: async (data: InventoryTransactionCreateRequest): Promise<InventoryTransaction> => {
    const response = await apiClient.post<InventoryTransaction>('/inventory-transactions', data);
    return response.data;
  },

  // Stock adjustment
  adjust: async (data: StockAdjustmentRequest): Promise<InventoryTransaction> => {
    const response = await apiClient.post<InventoryTransaction>('/inventory-transactions/adjust', data);
    return response.data;
  },

  // Reverse transaction
  reverse: async (transactionId: string): Promise<InventoryTransaction> => {
    const response = await apiClient.post<InventoryTransaction>(`/inventory-transactions/${transactionId}/reverse`);
    return response.data;
  },
};