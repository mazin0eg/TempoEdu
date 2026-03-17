import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';
import { ChatGateway } from '../chat/chat.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationModel: Record<string, jest.Mock>;
  let chatGateway: Record<string, jest.Mock>;

  beforeEach(async () => {
    notificationModel = {
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue(undefined),
      countDocuments: jest.fn(),
    };

    chatGateway = {
      sendToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useValue: notificationModel },
        { provide: ChatGateway, useValue: chatGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('create', () => {
    it('should create a notification and emit socket event', async () => {
      const payload = {
        recipient: 'u1',
        type: 'SESSION_REQUEST' as any,
        title: 'New Request',
        message: 'You have a new session request',
      };

      const notification = { _id: 'n1', ...payload };
      notificationModel.create.mockResolvedValue(notification);

      const result = await service.create(payload);

      expect(notificationModel.create).toHaveBeenCalledWith(payload);
      expect(chatGateway.sendToUser).toHaveBeenCalledWith('u1', 'notification', notification);
      expect(result).toEqual(notification);
    });
  });

  describe('findByUser', () => {
    it('should return paginated notifications', async () => {
      const notifications = [{ _id: 'n1' }];
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(notifications),
      };
      notificationModel.find.mockReturnValue(chain);
      notificationModel.countDocuments.mockResolvedValue(1);

      const result = await service.findByUser('u1', 1, 20);

      expect(result).toEqual({ notifications, total: 1 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      await service.markAsRead('n1');

      expect(notificationModel.findByIdAndUpdate).toHaveBeenCalledWith('n1', { isRead: true });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      await service.markAllAsRead('u1');

      expect(notificationModel.updateMany).toHaveBeenCalledWith(
        { recipient: 'u1', isRead: false },
        { isRead: true },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      notificationModel.countDocuments.mockResolvedValue(5);

      const result = await service.getUnreadCount('u1');

      expect(result).toBe(5);
      expect(notificationModel.countDocuments).toHaveBeenCalledWith({
        recipient: 'u1',
        isRead: false,
      });
    });
  });
});
