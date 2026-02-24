export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  avatar: string;
  role: 'user' | 'admin';
  credits: number;
  languages: string[];
  availability: Record<string, string[]>;
  reputationScore: number;
  totalReviews: number;
  isActive: boolean;
  isSuspended: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  _id: string;
  user: User | string;
  name: string;
  description: string;
  category: SkillCategory;
  level: SkillLevel;
  type: 'offer' | 'request';
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  _id: string;
  requester: User | string;
  provider: User | string;
  skill: Skill | string;
  scheduledAt: string;
  duration: number;
  status: SessionStatus;
  message: string;
  meetingLink: string;
  roomId: string;
  requesterConfirmed: boolean;
  providerConfirmed: boolean;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  session: Session | string;
  reviewer: User | string;
  reviewee: User | string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  user: string;
  amount: number;
  type: 'credit' | 'debit' | 'initial';
  session: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage: Message | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User | string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export type SkillCategory =
  | 'programming'
  | 'design'
  | 'languages'
  | 'music'
  | 'cooking'
  | 'sports'
  | 'business'
  | 'academic'
  | 'other';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type SessionStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type NotificationType =
  | 'session_request'
  | 'session_accepted'
  | 'session_rejected'
  | 'session_completed'
  | 'session_cancelled'
  | 'new_message'
  | 'new_review'
  | 'credits_received'
  | 'credits_deducted';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface DashboardStats {
  users: { total: number; active: number; suspended: number };
  skills: { total: number };
  sessions: { total: number; completed: number; pending: number };
  reviews: { total: number; averageRating: number };
}
