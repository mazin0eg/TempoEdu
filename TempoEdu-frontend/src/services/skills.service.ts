import api from '../lib/api';
import type {
  ApiResponse,
  Skill,
  SkillCategory,
  SkillLevel,
  EarnedSkill,
  CertificateData,
} from '../types';

export interface SkillFilters {
  category?: SkillCategory;
  level?: SkillLevel;
  type?: 'offer' | 'request';
  search?: string;
  owner?: string;
  page?: number;
  limit?: number;
}

export const skillsApi = {
  getAll: (filters: SkillFilters = {}) =>
    api.get<ApiResponse<{ skills: Skill[]; total: number }>>('/skills', {
      params: filters,
    }),

  getById: (id: string) => api.get<ApiResponse<Skill>>(`/skills/${id}`),

  getMy: () => api.get<ApiResponse<Skill[]>>('/skills/my'),

  getSuggestions: () => api.get<ApiResponse<Skill[]>>('/skills/suggestions'),

  create: (data: Omit<Skill, '_id' | 'user' | 'isActive' | 'createdAt' | 'updatedAt'>) =>
    api.post<ApiResponse<Skill>>('/skills', data),

  update: (id: string, data: Partial<Skill>) =>
    api.patch<ApiResponse<Skill>>(`/skills/${id}`, data),

  delete: (id: string) => api.delete(`/skills/${id}`),

  getMyEarned: () => api.get<ApiResponse<EarnedSkill[]>>('/skills/earned/me'),

  getPublicEarned: (userId: string) =>
    api.get<ApiResponse<EarnedSkill[]>>(`/skills/earned/public/${userId}`),

  claimEarnedFromSession: (sessionId: string, data: { isPublic?: boolean } = {}) =>
    api.post<ApiResponse<EarnedSkill>>(`/skills/earned/from-session/${sessionId}`, data),

  updateEarned: (id: string, data: { isPublic?: boolean }) =>
    api.patch<ApiResponse<EarnedSkill>>(`/skills/earned/${id}`, data),

  deleteEarned: (id: string) => api.delete(`/skills/earned/${id}`),

  getCertificateData: (id: string) =>
    api.get<ApiResponse<CertificateData>>(`/skills/earned/${id}/certificate`),
};
