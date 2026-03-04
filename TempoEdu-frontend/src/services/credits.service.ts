import api from '../lib/api';
import type { ApiResponse, Transaction } from '../types';

export const creditsApi = {
  getBalance: () => api.get<ApiResponse<{ balance: number }>>('/credits/balance'),

  getHistory: (page = 1, limit = 20) =>
    api.get<ApiResponse<{ transactions: Transaction[]; total: number }>>(
      '/credits/history',
      { params: { page, limit } },
    ),
};
