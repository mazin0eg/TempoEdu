import api from '../lib/api';
import type { ApiResponse, Review } from '../types';

export const reviewsApi = {
  create: (data: {
    session: string;
    reviewee: string;
    rating: number;
    comment?: string;
  }) => api.post<ApiResponse<Review>>('/reviews', data),

  getByUser: (userId: string) =>
    api.get<ApiResponse<Review[]>>(`/reviews/user/${userId}`),

  getBySession: (sessionId: string) =>
    api.get<ApiResponse<Review[]>>(`/reviews/session/${sessionId}`),
};
