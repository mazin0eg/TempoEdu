import api from '../lib/api';
import type { ApiResponse, User } from '../types';

export const usersApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<ApiResponse<{ users: User[]; total: number }>>('/users', {
      params: { page, limit },
    }),

  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),

  updateProfile: (data: Partial<User>) =>
    api.patch<ApiResponse<User>>('/users/me', data),
};
