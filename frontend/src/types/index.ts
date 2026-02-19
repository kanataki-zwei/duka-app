export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
  website?: string | null;
  address?: string | null;
  kra_number?: string | null;
  description?: string | null;
  logo_url?: string | null;
}

export interface CompanyUpdateRequest {
  name?: string;
  website?: string;
  address?: string;
  kra_number?: string;
  description?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  company?: Company | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface CompanyCreateRequest {
  name: string;
}