import api from '../lib/api';
import type { ApiResponse, AuthResponse } from '../types';

export const authApi = {
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => api.post<ApiResponse<AuthResponse>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data),

  getProfile: () => api.get<ApiResponse<AuthResponse['user']>>('/auth/profile'),
};
