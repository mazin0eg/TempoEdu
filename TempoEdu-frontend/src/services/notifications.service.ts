import api from '../lib/api';
import type { ApiResponse, Notification } from '../types';

export const notificationsApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<ApiResponse<{ notifications: Notification[]; total: number }>>(
      '/notifications',
      { params: { page, limit } },
    ),

  getUnreadCount: () =>
    api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch('/notifications/read-all'),
};
