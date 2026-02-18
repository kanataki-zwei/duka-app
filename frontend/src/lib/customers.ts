import { apiClient } from './axios';

// ==========================================
// TYPES
// ==========================================

export enum CustomerType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
  WALK_IN = 'walk-in',
}

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface CustomerTier {
  id: string;
  company_id: string;
  name: string;
  discount_percentage: number;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_type: CustomerType;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  payment_term_id: string | null;
  customer_tier_id: string | null;
  credit_limit: number;
  current_balance: number;
  status: CustomerStatus;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithDetails extends Customer {
  payment_term?: {
    id: string;
    name: string;
    days: number;
  };
  customer_tier?: {
    id: string;
    name: string;
    discount_percentage: number;
  };
}

export interface CustomerTierCreateRequest {
  name: string;
  discount_percentage: number;
  description?: string;
}

export interface CustomerCreateRequest {
  customer_type: CustomerType;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_term_id?: string;
  customer_tier_id?: string;
  credit_limit?: number;
  status?: CustomerStatus;
  notes?: string;
}

export interface CreditCheckRequest {
  sale_amount: number;
}

export interface CreditCheckResponse {
  has_credit: boolean;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  sale_amount: number;
  message: string;
}

// ==========================================
// API FUNCTIONS - CUSTOMER TIERS
// ==========================================

export const customerTiersAPI = {
  // Get all customer tiers
  getAll: async (): Promise<CustomerTier[]> => {
    const response = await apiClient.get<CustomerTier[]>('/customer-tiers');
    return response.data;
  },

  // Get single customer tier
  getById: async (id: string): Promise<CustomerTier> => {
    const response = await apiClient.get<CustomerTier>(`/customer-tiers/${id}`);
    return response.data;
  },

  // Create customer tier
  create: async (data: CustomerTierCreateRequest): Promise<CustomerTier> => {
    const response = await apiClient.post<CustomerTier>('/customer-tiers', data);
    return response.data;
  },

  // Update customer tier
  update: async (id: string, data: Partial<CustomerTierCreateRequest>): Promise<CustomerTier> => {
    const response = await apiClient.put<CustomerTier>(`/customer-tiers/${id}`, data);
    return response.data;
  },

  // Delete customer tier
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customer-tiers/${id}`);
  },
};

// ==========================================
// API FUNCTIONS - CUSTOMERS
// ==========================================

export const customersAPI = {
  // Get all customers
  getAll: async (params?: {
    customer_type?: CustomerType;
    status_filter?: CustomerStatus;
    tier_id?: string;
  }): Promise<CustomerWithDetails[]> => {
    const response = await apiClient.get<CustomerWithDetails[]>('/customers', { params });
    return response.data;
  },

  // Get single customer
  getById: async (id: string): Promise<CustomerWithDetails> => {
    const response = await apiClient.get<CustomerWithDetails>(`/customers/${id}`);
    return response.data;
  },

  // Create customer
  create: async (data: CustomerCreateRequest): Promise<Customer> => {
    const response = await apiClient.post<Customer>('/customers', data);
    return response.data;
  },

  // Update customer
  update: async (id: string, data: Partial<CustomerCreateRequest>): Promise<Customer> => {
    const response = await apiClient.put<Customer>(`/customers/${id}`, data);
    return response.data;
  },

  // Delete customer (soft delete)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  // Get customer balance
  getBalance: async (id: string): Promise<{
    customer_id: string;
    customer_name: string;
    credit_limit: number;
    current_balance: number;
    available_credit: number;
  }> => {
    const response = await apiClient.get(`/customers/${id}/balance`);
    return response.data;
  },

  // Check customer credit
  checkCredit: async (id: string, data: CreditCheckRequest): Promise<CreditCheckResponse> => {
    const response = await apiClient.post<CreditCheckResponse>(`/customers/${id}/check-credit`, data);
    return response.data;
  },
};