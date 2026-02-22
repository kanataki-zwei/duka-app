import { apiClient } from './axios';

// ==========================================
// TYPES
// ==========================================

export enum ExpenseType {
  STANDARD = 'standard',
  SALES = 'sales',
}

export enum RecurrenceFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ExpensePaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export enum ExpensePaymentMethod {
  CASH = 'cash',
  MPESA = 'mpesa',
  BANK = 'bank',
  CARD = 'card',
}

export interface ExpenseCategory {
  id: string;
  company_id: string;
  name: string;
  expense_type: ExpenseType;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  expense_category_id: string;
  expense_type: ExpenseType;
  title: string;
  description: string | null;
  amount: number;
  supplier_id: string | null;
  sale_id: string | null;
  payment_status: ExpensePaymentStatus;
  amount_paid: number;
  amount_due: number;
  is_recurring: boolean;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_day_of_week: number | null;
  recurrence_day_of_month: number | null;
  recurrence_end_date: string | null;
  parent_expense_id: string | null;
  expense_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithDetails extends Expense {
  category?: {
    id: string;
    name: string;
    expense_type: ExpenseType;
  };
  supplier?: {
    id: string;
    name: string;
  };
  sale?: {
    id: string;
    sale_number: string;
    sale_type: string;
  };
  payments: ExpensePayment[];
}

export interface ExpensePayment {
  id: string;
  company_id: string;
  expense_id: string;
  amount: number;
  payment_date: string;
  payment_method: ExpensePaymentMethod;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ExpenseCategoryCreateRequest {
  name: string;
  expense_type: ExpenseType;
  description?: string;
}

export interface ExpenseCategoryUpdateRequest {
  name?: string;
  expense_type?: ExpenseType;
  description?: string;
  is_active?: boolean;
}

export interface ExpenseCreateRequest {
  expense_category_id: string;
  expense_type: ExpenseType;
  title: string;
  description?: string;
  amount: number;
  supplier_id?: string;
  sale_id?: string;
  expense_date: string;
  notes?: string;
  is_recurring: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  recurrence_day_of_week?: number;
  recurrence_day_of_month?: number;
  recurrence_end_date?: string;
}

export interface ExpenseUpdateRequest {
  title?: string;
  description?: string;
  amount?: number;
  supplier_id?: string;
  sale_id?: string;
  expense_date?: string;
  notes?: string;
  payment_status?: ExpensePaymentStatus;
}

export interface ExpensePaymentCreateRequest {
  expense_id: string;
  amount: number;
  payment_date: string;
  payment_method: ExpensePaymentMethod;
  reference_number?: string;
  notes?: string;
}

// ==========================================
// API FUNCTIONS
// ==========================================

export const expenseCategoriesAPI = {
  getAll: async (params?: {
    expense_type?: ExpenseType;
    is_active?: boolean;
  }): Promise<ExpenseCategory[]> => {
    const response = await apiClient.get<ExpenseCategory[]>('/expense-categories/', { params });
    return response.data;
  },

  create: async (data: ExpenseCategoryCreateRequest): Promise<ExpenseCategory> => {
    const response = await apiClient.post<ExpenseCategory>('/expense-categories/', data);
    return response.data;
  },

  update: async (id: string, data: ExpenseCategoryUpdateRequest): Promise<ExpenseCategory> => {
    const response = await apiClient.patch<ExpenseCategory>(`/expense-categories/${id}`, data);
    return response.data;
  },
};

export const expensesAPI = {
  getAll: async (params?: {
    expense_type?: ExpenseType;
    payment_status?: ExpensePaymentStatus;
    category_id?: string;
    from_date?: string;
    to_date?: string;
    include_recurring_children?: boolean;
    limit?: number;
  }): Promise<ExpenseWithDetails[]> => {
    const response = await apiClient.get<ExpenseWithDetails[]>('/expenses/', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ExpenseWithDetails> => {
    const response = await apiClient.get<ExpenseWithDetails>(`/expenses/${id}`);
    return response.data;
  },

  create: async (data: ExpenseCreateRequest): Promise<Expense> => {
    const response = await apiClient.post<Expense>('/expenses/', data);
    return response.data;
  },

  update: async (id: string, data: ExpenseUpdateRequest): Promise<Expense> => {
    const response = await apiClient.patch<Expense>(`/expenses/${id}`, data);
    return response.data;
  },

  recordPayment: async (expenseId: string, data: ExpensePaymentCreateRequest): Promise<{
    message: string;
    payment: ExpensePayment;
    updated_expense: {
      payment_status: ExpensePaymentStatus;
      amount_paid: number;
      amount_due: number;
    };
  }> => {
    const response = await apiClient.post(`/expenses/${expenseId}/payments`, data);
    return response.data;
  },
};