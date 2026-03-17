import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review } from './schemas/review.schema';
import { Session, SessionStatus } from '../sessions/schemas/session.schema';
import { User } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewModel: Record<string, jest.Mock>;
  let sessionModel: Record<string, jest.Mock>;
  let userModel: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    reviewModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    sessionModel = { findById: jest.fn() };
    userModel = { findByIdAndUpdate: jest.fn() };
    notificationsService = { create: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: reviewModel },
        { provide: getModelToken(Session.name), useValue: sessionModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('create', () => {
    const dto = { session: 'sess1', reviewee: 'u2', rating: 5, comment: 'Great!' };

    it('should create a review', async () => {
      sessionModel.findById.mockResolvedValue({
        _id: 'sess1',
        status: SessionStatus.COMPLETED,
        requester: { toString: () => 'u1' },
        provider: { toString: () => 'u2' },
      });
      reviewModel.findOne.mockResolvedValue(null);

      const review = {
        _id: 'r1',
        ...dto,
        reviewer: 'u1',
        populate: jest.fn().mockResolvedValue({ _id: 'r1', ...dto, reviewer: 'u1' }),
      };
      reviewModel.create.mockResolvedValue(review);

      // Mock updateUserReputation: find reviews for the user
      reviewModel.find.mockResolvedValue([{ rating: 5 }]);
      userModel.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await service.create('u1', dto);

      expect(result).toBeDefined();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if session not found', async () => {
      sessionModel.findById.mockResolvedValue(null);

      await expect(service.create('u1', dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session not completed', async () => {
      sessionModel.findById.mockResolvedValue({
        _id: 'sess1',
        status: SessionStatus.PENDING,
        requester: { toString: () => 'u1' },
        provider: { toString: () => 'u2' },
      });

      await expect(service.create('u1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not participant', async () => {
      sessionModel.findById.mockResolvedValue({
        _id: 'sess1',
        status: SessionStatus.COMPLETED,
        requester: { toString: () => 'other1' },
        provider: { toString: () => 'other2' },
      });

      await expect(service.create('u1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if already reviewed', async () => {
      sessionModel.findById.mockResolvedValue({
        _id: 'sess1',
        status: SessionStatus.COMPLETED,
        requester: { toString: () => 'u1' },
        provider: { toString: () => 'u2' },
      });
      reviewModel.findOne.mockResolvedValue({ _id: 'existing' });

      await expect(service.create('u1', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByUser', () => {
    it('should return reviews for a user', async () => {
      const reviews = [{ _id: 'r1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(reviews),
      };
      reviewModel.find.mockReturnValue(chain);

      const result = await service.findByUser('u1');

      expect(reviewModel.find).toHaveBeenCalledWith({ reviewee: 'u1' });
      expect(result).toEqual(reviews);
    });
  });

  describe('findBySession', () => {
    it('should return reviews for a session', async () => {
      const reviews = [{ _id: 'r1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
      };
      chain.populate.mockReturnValueOnce(chain).mockResolvedValueOnce(reviews);
      reviewModel.find.mockReturnValue(chain);

      const result = await service.findBySession('sess1');

      expect(reviewModel.find).toHaveBeenCalledWith({ session: 'sess1' });
      expect(result).toEqual(reviews);
    });
  });
});
