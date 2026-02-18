import { apiClient } from './axios';
import { productCategoriesAPI } from './products';  // Add this line

// Export it so we can import from suppliers.ts
export { productCategoriesAPI };

// ==========================================
// TYPES
// ==========================================

export interface PaymentTerm {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  days: number | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_term_id: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface SupplierWithCategories extends Supplier {
  product_categories?: Array<{
    id: string;
    name: string;
  }>;
}

// Request types
export interface PaymentTermCreateRequest {
  name: string;
  description?: string;
  days?: number;
}

export interface SupplierCreateRequest {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_term_id?: string;
  product_category_ids?: string[];
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const paymentTermsAPI = {
  // Get all payment terms
  getAll: async (): Promise<PaymentTerm[]> => {
    const response = await apiClient.get<PaymentTerm[]>('/payment-terms');
    return response.data;
  },

  // Get single payment term
  getById: async (id: string): Promise<PaymentTerm> => {
    const response = await apiClient.get<PaymentTerm>(`/payment-terms/${id}`);
    return response.data;
  },

  // Create payment term
  create: async (data: PaymentTermCreateRequest): Promise<PaymentTerm> => {
    const response = await apiClient.post<PaymentTerm>('/payment-terms', data);
    return response.data;
  },

  // Update payment term
  update: async (id: string, data: Partial<PaymentTermCreateRequest>): Promise<PaymentTerm> => {
    const response = await apiClient.put<PaymentTerm>(`/payment-terms/${id}`, data);
    return response.data;
  },

  // Delete payment term
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/payment-terms/${id}`);
  },
};

export const suppliersAPI = {
  // Get all suppliers
  getAll: async (params?: {
    is_active?: boolean;
    search?: string;
  }): Promise<SupplierWithCategories[]> => {
    const response = await apiClient.get<SupplierWithCategories[]>('/suppliers', { params });
    return response.data;
  },

  // Get single supplier
  getById: async (id: string): Promise<SupplierWithCategories> => {
    const response = await apiClient.get<SupplierWithCategories>(`/suppliers/${id}`);
    return response.data;
  },

  // Create supplier
  create: async (data: SupplierCreateRequest): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', data);
    return response.data;
  },

  // Update supplier
  update: async (id: string, data: Partial<SupplierCreateRequest>): Promise<Supplier> => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },

  // Delete supplier
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};