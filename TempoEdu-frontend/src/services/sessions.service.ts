import api from '../lib/api';
import type { ApiResponse, Session, SessionStatus } from '../types';

export const sessionsApi = {
  create: (data: {
    provider: string;
    skill: string;
    scheduledAt: string;
    duration: number;
    message?: string;
  }) => api.post<ApiResponse<Session>>('/sessions', data),

  getMy: (status?: SessionStatus) =>
    api.get<ApiResponse<Session[]>>('/sessions/my', {
      params: status ? { status } : {},
    }),

  getById: (id: string) => api.get<ApiResponse<Session>>(`/sessions/${id}`),

  updateStatus: (id: string, data: { status?: SessionStatus; meetingLink?: string }) =>
    api.patch<ApiResponse<Session>>(`/sessions/${id}`, data),
};
