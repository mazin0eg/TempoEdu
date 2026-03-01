import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async getOrCreateConversation(
    userId1: string,
    userId2: string,
  ): Promise<ConversationDocument> {
    let conversation = await this.conversationModel.findOne({
      participants: { $all: [userId1, userId2] },
    });

    if (!conversation) {
      conversation = await this.conversationModel.create({
        participants: [userId1, userId2],
      });
    }

    return conversation.populate(
      'participants',
      'firstName lastName avatar',
    );
  }

  async getUserConversations(
    userId: string,
  ): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ participants: userId })
      .populate('participants', 'firstName lastName avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.create({
      conversation: conversationId,
      sender: senderId,
      content,
    });

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    return message.populate('sender', 'firstName lastName avatar');
  }

  async getMessages(
    conversationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: MessageDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversation: conversationId })
        .populate('sender', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.messageModel.countDocuments({ conversation: conversationId }),
    ]);

    return { messages: messages.reverse(), total };
  }

  async markAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.messageModel.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        isRead: false,
      },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.conversationModel.find({
      participants: userId,
    });

    const conversationIds = conversations.map((c) => c._id);

    return this.messageModel.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: userId },
      isRead: false,
    });
  }
}
