import { apiClient } from './axios';

// ==========================================
// TYPES
// ==========================================

export interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  avg_buying_price: number | null;
  avg_selling_price: number | null;
  min_stock_level: number | null;
  reorder_quantity: number | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ProductVariant {
  id: string;
  company_id: string;
  product_id: string;
  variant_name: string;
  sku: string | null;
  buying_price: number | null;
  selling_price: number | null;
  min_stock_level: number | null;
  reorder_quantity: number | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Request types
export interface CategoryCreateRequest {
  name: string;
  description?: string;
}

export interface ProductCreateRequest {
  category_id: string;
  name: string;
  description?: string;
  sku?: string;
  avg_buying_price?: number;
  avg_selling_price?: number;
  min_stock_level?: number;
  reorder_quantity?: number;
}

export interface VariantCreateRequest {
  product_id: string;
  variant_name: string;
  sku?: string;
  buying_price?: number;
  selling_price?: number;
  min_stock_level?: number;
  reorder_quantity?: number;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const productCategoriesAPI = {
  // Get all categories
  getAll: async (): Promise<ProductCategory[]> => {
    const response = await apiClient.get<ProductCategory[]>('/product-categories');
    return response.data;
  },

  // Get single category
  getById: async (id: string): Promise<ProductCategory> => {
    const response = await apiClient.get<ProductCategory>(`/product-categories/${id}`);
    return response.data;
  },

  // Create category
  create: async (data: CategoryCreateRequest): Promise<ProductCategory> => {
    const response = await apiClient.post<ProductCategory>('/product-categories', data);
    return response.data;
  },

  // Update category
  update: async (id: string, data: Partial<CategoryCreateRequest>): Promise<ProductCategory> => {
    const response = await apiClient.put<ProductCategory>(`/product-categories/${id}`, data);
    return response.data;
  },

  // Delete category
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/product-categories/${id}`);
  },
};

export const productsAPI = {
  // Get all products
  getAll: async (params?: {
    category_id?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/products', { params });
    return response.data;
  },

  // Get single product
  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  // Create product
  create: async (data: ProductCreateRequest): Promise<Product> => {
    const response = await apiClient.post<Product>('/products', data);
    return response.data;
  },

  // Update product
  update: async (id: string, data: Partial<ProductCreateRequest>): Promise<Product> => {
    const response = await apiClient.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  // Delete product
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};

export const productVariantsAPI = {
  // Get all variants
  getAll: async (params?: {
    product_id?: string;
    is_active?: boolean;
  }): Promise<ProductVariant[]> => {
    const response = await apiClient.get<ProductVariant[]>('/product-variants', { params });
    return response.data;
  },

  // Get single variant
  getById: async (id: string): Promise<ProductVariant> => {
    const response = await apiClient.get<ProductVariant>(`/product-variants/${id}`);
    return response.data;
  },

  // Create variant
  create: async (data: VariantCreateRequest): Promise<ProductVariant> => {
    const response = await apiClient.post<ProductVariant>('/product-variants', data);
    return response.data;
  },

  // Update variant
  update: async (id: string, data: Partial<VariantCreateRequest>): Promise<ProductVariant> => {
    const response = await apiClient.put<ProductVariant>(`/product-variants/${id}`, data);
    return response.data;
  },

  // Delete variant
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/product-variants/${id}`);
  },
};