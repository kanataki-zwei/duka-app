import { apiClient } from '@/lib/axios';
import { AuthResponse, LoginRequest, SignupRequest, CompanyCreateRequest, Company } from '@/types';

export const authAPI = {
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  createCompany: async (data: CompanyCreateRequest): Promise<Company> => {
    const response = await apiClient.post<Company>('/auth/company', data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export const getUserCompanies = async (): Promise<Company[]> => {
  const response = await apiClient.get('/auth/companies');
  return response.data;
};

export const createCompany = async (name: string): Promise<Company> => {
  const response = await apiClient.post('/auth/company', { name });
  return response.data;
};