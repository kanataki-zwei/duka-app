import { apiClient } from './axios';

// ==========================================
// TYPES
// ==========================================

export enum SaleType {
  INVOICE = 'invoice',
  CREDIT_NOTE = 'credit_note',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export enum PaymentMethod {
  CASH = 'cash',
  MPESA = 'mpesa',
  BANK = 'bank',
  CARD = 'card',
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  line_total: number;
  created_at: string;
}

export interface SaleItemWithDetails extends SaleItem {
  product_variant?: {
    id: string;
    variant_name: string;
    sku: string | null;
    products: {
      name: string;
    };
  };
}

export interface Sale {
  id: string;
  company_id: string;
  customer_id: string;
  sale_number: string;
  sale_type: SaleType;
  original_sale_id: string | null;
  sale_date: string;
  storage_location_id: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleWithDetails extends Sale {
  customer?: {
    id: string;
    name: string;
    customer_type: string;
    email?: string;
    phone?: string;
  };
  storage_location?: {
    id: string;
    name: string;
  };
  original_sale?: {
    sale_number: string;
    sale_type: string;
  };
  items: SaleItemWithDetails[];
  payments: SalePayment[];
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SaleItemCreateRequest {
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
}

export interface SaleCreateRequest {
  customer_id: string;
  sale_date: string;
  storage_location_id: string;
  items: SaleItemCreateRequest[];
  notes?: string;
}

export interface CreditNoteItemRequest {
  sale_item_id: string;
  return_quantity: number;
}

export interface CreditNoteCreateRequest {
  original_sale_id: string;
  sale_date: string;
  items: CreditNoteItemRequest[];
  notes?: string;
}

export interface SalePaymentCreateRequest {
  sale_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const salesAPI = {
  // Get all sales
  getAll: async (params?: {
    sale_type?: SaleType;
    payment_status?: PaymentStatus;
    customer_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }): Promise<SaleWithDetails[]> => {
    const response = await apiClient.get<SaleWithDetails[]>('/sales/', { params });
    return response.data;
  },

  // Get single sale
  getById: async (id: string): Promise<SaleWithDetails> => {
    const response = await apiClient.get<SaleWithDetails>(`/sales/${id}`);
    return response.data;
  },

  // Create sale (invoice)
  create: async (data: SaleCreateRequest): Promise<Sale> => {
    const response = await apiClient.post<Sale>('/sales', data);
    return response.data;
  },

  // Create credit note
  createCreditNote: async (data: CreditNoteCreateRequest): Promise<Sale> => {
    const response = await apiClient.post<Sale>('/sales/credit-notes/', data);
    return response.data;
  },

  // Record payment
  recordPayment: async (data: SalePaymentCreateRequest): Promise<{
    message: string;
    payment: SalePayment;
    updated_sale: {
      payment_status: PaymentStatus;
      amount_paid: number;
      amount_due: number;
    };
  }> => {
    const response = await apiClient.post('/sales/payments', data);
    return response.data;
  },

  // Get payments for a sale
  getPayments: async (saleId: string): Promise<SalePayment[]> => {
    const response = await apiClient.get<SalePayment[]>(`/sales/payments/${saleId}`);
    return response.data;
  },

  // Download PDF
  downloadPDF: async (saleId: string, saleNumber: string): Promise<void> => {
    const response = await apiClient.get(`/sales/${saleId}/pdf/`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${saleNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};