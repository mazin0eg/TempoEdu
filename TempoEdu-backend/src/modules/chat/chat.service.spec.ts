import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { Conversation } from './schemas/conversation.schema';
import { Message } from './schemas/message.schema';

describe('ChatService', () => {
  let service: ChatService;
  let conversationModel: Record<string, jest.Mock>;
  let messageModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    conversationModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue(undefined),
    };

    messageModel = {
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(Conversation.name), useValue: conversationModel },
        { provide: getModelToken(Message.name), useValue: messageModel },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation', async () => {
      const conv = {
        _id: 'conv1',
        participants: ['u1', 'u2'],
        populate: jest.fn().mockResolvedValue({ _id: 'conv1', participants: ['u1', 'u2'] }),
      };
      conversationModel.findOne.mockResolvedValue(conv);

      const result = await service.getOrCreateConversation('u1', 'u2');

      expect(conversationModel.findOne).toHaveBeenCalledWith({
        participants: { $all: ['u1', 'u2'] },
      });
      expect(result).toBeDefined();
    });

    it('should create new conversation if none exists', async () => {
      conversationModel.findOne.mockResolvedValue(null);
      const conv = {
        _id: 'conv1',
        populate: jest.fn().mockResolvedValue({ _id: 'conv1' }),
      };
      conversationModel.create.mockResolvedValue(conv);

      const result = await service.getOrCreateConversation('u1', 'u2');

      expect(conversationModel.create).toHaveBeenCalledWith({
        participants: ['u1', 'u2'],
      });
      expect(result).toBeDefined();
    });
  });

  describe('getUserConversations', () => {
    it('should return user conversations sorted by lastMessageAt', async () => {
      const convs = [{ _id: 'conv1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(convs),
      };
      conversationModel.find.mockReturnValue(chain);

      const result = await service.getUserConversations('u1');

      expect(conversationModel.find).toHaveBeenCalledWith({ participants: 'u1' });
      expect(result).toEqual(convs);
    });
  });

  describe('sendMessage', () => {
    it('should create a message and update conversation', async () => {
      const message = {
        _id: 'm1',
        conversation: 'conv1',
        sender: 'u1',
        content: 'Hello',
        populate: jest.fn().mockResolvedValue({ _id: 'm1', sender: 'u1', content: 'Hello' }),
      };
      messageModel.create.mockResolvedValue(message);

      const result = await service.sendMessage('conv1', 'u1', 'Hello');

      expect(messageModel.create).toHaveBeenCalledWith({
        conversation: 'conv1',
        sender: 'u1',
        content: 'Hello',
      });
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith('conv1', expect.objectContaining({
        lastMessage: 'm1',
      }));
      expect(result).toBeDefined();
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      const messages = [{ _id: 'm1' }, { _id: 'm2' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(messages),
      };
      messageModel.find.mockReturnValue(chain);
      messageModel.countDocuments.mockResolvedValue(2);

      const result = await service.getMessages('conv1', 1, 50);

      expect(result.messages).toEqual(messages.reverse());
      expect(result.total).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('should mark unread messages as read', async () => {
      await service.markAsRead('conv1', 'u1');

      expect(messageModel.updateMany).toHaveBeenCalledWith(
        {
          conversation: 'conv1',
          sender: { $ne: 'u1' },
          isRead: false,
        },
        { isRead: true },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return total unread count across conversations', async () => {
      conversationModel.find.mockResolvedValue([
        { _id: 'conv1' },
        { _id: 'conv2' },
      ]);
      messageModel.countDocuments.mockResolvedValue(3);

      const result = await service.getUnreadCount('u1');

      expect(result).toBe(3);
      expect(messageModel.countDocuments).toHaveBeenCalledWith({
        conversation: { $in: ['conv1', 'conv2'] },
        sender: { $ne: 'u1' },
        isRead: false,
      });
    });
  });
});
