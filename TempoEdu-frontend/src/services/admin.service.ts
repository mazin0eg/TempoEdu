import api from '../lib/api';
import type { ApiResponse, DashboardStats, User, Session } from '../types';

export const adminApi = {
  getDashboard: () =>
    api.get<ApiResponse<DashboardStats>>('/admin/dashboard'),

  getUsers: (page = 1, limit = 20) =>
    api.get<ApiResponse<{ users: User[]; total: number }>>('/admin/users', {
      params: { page, limit },
    }),

  suspendUser: (id: string) =>
    api.patch<ApiResponse<User>>(`/admin/users/${id}/suspend`),

  unsuspendUser: (id: string) =>
    api.patch<ApiResponse<User>>(`/admin/users/${id}/unsuspend`),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  getSkillsByCategory: () =>
    api.get<ApiResponse<Record<string, number>>>('/admin/skills/categories'),

  getRecentSessions: (limit = 10) =>
    api.get<ApiResponse<Session[]>>('/admin/sessions/recent', {
      params: { limit },
    }),
};
