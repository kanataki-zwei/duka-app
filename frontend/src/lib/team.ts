import { apiClient } from './axios';
import { UserRole } from '@/store/authStore';

export interface MeResponse {
  user_id: string;
  company_id: string;
  role: UserRole;
  is_active: boolean;
}

export const teamAPI = {
  getMe: async (): Promise<MeResponse> => {
    const response = await apiClient.get<MeResponse>('/team/me/');
    return response.data;
  },

  createMember: async (data: {
    email: string;
    password: string;
    full_name?: string;
    role: UserRole;
  }) => {
    const response = await apiClient.post('/team/', data);
    return response.data;
  },

  getMembers: async () => {
    const response = await apiClient.get('/team/');
    return response.data;
  },

  updateRole: async (companyUserId: string, role: UserRole) => {
    const response = await apiClient.patch(`/team/${companyUserId}/role/`, { role });
    return response.data;
  },

  deactivateMember: async (companyUserId: string) => {
    const response = await apiClient.patch(`/team/${companyUserId}/deactivate/`);
    return response.data;
  },
};