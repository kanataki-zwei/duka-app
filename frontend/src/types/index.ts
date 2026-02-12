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