import api from '../lib/api';
import type { ApiResponse, Conversation, Message } from '../types';

export const chatApi = {
  getConversations: () =>
    api.get<ApiResponse<Conversation[]>>('/chat/conversations'),

  createConversation: (participantId: string) =>
    api.post<ApiResponse<Conversation>>('/chat/conversations', { participantId }),

  getMessages: (conversationId: string, page = 1) =>
    api.get<ApiResponse<{ messages: Message[]; total: number }>>(
      `/chat/conversations/${conversationId}/messages`,
      { params: { page } },
    ),

  getUnreadCount: () =>
    api.get<ApiResponse<{ unreadCount: number }>>('/chat/unread'),
};
