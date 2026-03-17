import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { User } from '../users/schemas/user.schema';
import { Skill } from '../skills/schemas/skill.schema';
import { Session } from '../sessions/schemas/session.schema';
import { Review } from '../reviews/schemas/review.schema';

describe('AdminService', () => {
  let service: AdminService;
  let userModel: Record<string, jest.Mock>;
  let skillModel: Record<string, jest.Mock>;
  let sessionModel: Record<string, jest.Mock>;
  let reviewModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    userModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    skillModel = {
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    sessionModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
    };

    reviewModel = {
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Skill.name), useValue: skillModel },
        { provide: getModelToken(Session.name), useValue: sessionModel },
        { provide: getModelToken(Review.name), useValue: reviewModel },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getDashboardStats', () => {
    it('should return aggregated dashboard statistics', async () => {
      userModel.countDocuments
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(90) // activeUsers
        .mockResolvedValueOnce(5); // suspendedUsers

      skillModel.countDocuments.mockResolvedValue(50);

      sessionModel.countDocuments
        .mockResolvedValueOnce(200) // totalSessions
        .mockResolvedValueOnce(150) // completedSessions
        .mockResolvedValueOnce(30); // pendingSessions

      reviewModel.countDocuments.mockResolvedValue(120);
      reviewModel.aggregate.mockResolvedValue([{ avg: 4.5 }]);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        users: { total: 100, active: 90, suspended: 5 },
        skills: { total: 50 },
        sessions: { total: 200, completed: 150, pending: 30 },
        reviews: { total: 120, averageRating: 4.5 },
      });
    });

    it('should handle no reviews (avg = 0)', async () => {
      userModel.countDocuments.mockResolvedValue(0);
      skillModel.countDocuments.mockResolvedValue(0);
      sessionModel.countDocuments.mockResolvedValue(0);
      reviewModel.countDocuments.mockResolvedValue(0);
      reviewModel.aggregate.mockResolvedValue([]);

      const result = await service.getDashboardStats();

      expect(result.reviews).toEqual({ total: 0, averageRating: 0 });
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const users = [{ _id: 'u1' }];
      const chain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(users),
      };
      userModel.find.mockReturnValue(chain);
      userModel.countDocuments.mockResolvedValue(1);

      const result = await service.getAllUsers(1, 20);

      expect(result).toEqual({ users, total: 1 });
    });
  });

  describe('suspendUser', () => {
    it('should suspend a user', async () => {
      const user = { _id: 'u1', isSuspended: true };
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      const result = await service.suspendUser('u1');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { isSuspended: true },
        { new: true },
      );
      expect(result).toEqual(user);
    });
  });

  describe('unsuspendUser', () => {
    it('should unsuspend a user', async () => {
      const user = { _id: 'u1', isSuspended: false };
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      const result = await service.unsuspendUser('u1');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { isSuspended: false },
        { new: true },
      );
      expect(result).toEqual(user);
    });
  });

  describe('deleteUser', () => {
    it('should soft-delete a user', async () => {
      userModel.findByIdAndUpdate.mockResolvedValue(undefined);

      await service.deleteUser('u1');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('u1', {
        isActive: false,
        isSuspended: true,
      });
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return skill counts by category', async () => {
      skillModel.aggregate.mockResolvedValue([
        { _id: 'programming', count: 20 },
        { _id: 'design', count: 10 },
      ]);

      const result = await service.getSkillsByCategory();

      expect(result).toEqual({ programming: 20, design: 10 });
    });
  });

  describe('getRecentSessions', () => {
    it('should return recent sessions', async () => {
      const sessions = [{ _id: 'sess1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(sessions),
      };
      sessionModel.find.mockReturnValue(chain);

      const result = await service.getRecentSessions(10);

      expect(result).toEqual(sessions);
    });
  });
});
