import api from '../lib/api';
import type { ApiResponse, User } from '../types';

export const usersApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<ApiResponse<{ users: User[]; total: number }>>('/users', {
      params: { page, limit },
    }),

  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),

  getMe: () => api.get<ApiResponse<User>>('/users/me'),

  updateProfile: (data: Partial<User>) =>
    api.patch<ApiResponse<User>>('/users/me', data),

  search: (q: string, page = 1) =>
    api.get<ApiResponse<{ users: User[]; total: number }>>('/users/search', {
      params: { q, page },
    }),
};
