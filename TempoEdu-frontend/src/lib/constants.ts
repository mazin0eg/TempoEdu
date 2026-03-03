import type { SkillCategory, SkillLevel, SessionStatus } from '../types';

export const SKILL_CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: 'programming', label: 'Programming' },
  { value: 'design', label: 'Design' },
  { value: 'languages', label: 'Languages' },
  { value: 'music', label: 'Music' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'sports', label: 'Sports' },
  { value: 'business', label: 'Business' },
  { value: 'academic', label: 'Academic' },
  { value: 'other', label: 'Other' },
];

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export const SESSION_STATUS_COLORS: Record<SessionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  programming: 'bg-blue-100 text-blue-700',
  design: 'bg-pink-100 text-pink-700',
  languages: 'bg-green-100 text-green-700',
  music: 'bg-purple-100 text-purple-700',
  cooking: 'bg-orange-100 text-orange-700',
  sports: 'bg-red-100 text-red-700',
  business: 'bg-cyan-100 text-cyan-700',
  academic: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};
