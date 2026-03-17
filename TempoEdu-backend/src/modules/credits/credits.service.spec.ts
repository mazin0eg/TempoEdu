import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { Transaction } from './schemas/transaction.schema';
import { User } from '../users/schemas/user.schema';

describe('CreditsService', () => {
  let service: CreditsService;
  let transactionModel: Record<string, jest.Mock>;
  let userModel: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  beforeEach(async () => {
    transactionModel = {
      create: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    userModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn().mockReturnValue(5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        { provide: getModelToken(Transaction.name), useValue: transactionModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
  });

  describe('grantInitialCredits', () => {
    it('should grant initial credits to user', async () => {
      await service.grantInitialCredits('u1');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('u1', { credits: 5 });
      expect(transactionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'u1',
          amount: 5,
          type: 'initial',
        }),
      );
    });
  });

  describe('hasEnoughCredits', () => {
    it('should return true if user has enough credits', async () => {
      userModel.findById.mockResolvedValue({ credits: 10 });

      expect(await service.hasEnoughCredits('u1', 5)).toBe(true);
    });

    it('should return false if not enough credits', async () => {
      userModel.findById.mockResolvedValue({ credits: 2 });

      expect(await service.hasEnoughCredits('u1', 5)).toBe(false);
    });

    it('should return false if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      expect(await service.hasEnoughCredits('u1', 5)).toBe(false);
    });
  });

  describe('transferCredits', () => {
    it('should transfer credits between users', async () => {
      const fromUser = { _id: 'u1', credits: 10, save: jest.fn().mockResolvedValue(undefined) };
      const toUser = { _id: 'u2', credits: 5, save: jest.fn().mockResolvedValue(undefined) };

      userModel.findById
        .mockResolvedValueOnce(fromUser)
        .mockResolvedValueOnce(toUser);

      await service.transferCredits('u1', 'u2', 3, 'sess1');

      expect(fromUser.credits).toBe(7);
      expect(toUser.credits).toBe(8);
      expect(fromUser.save).toHaveBeenCalled();
      expect(toUser.save).toHaveBeenCalled();
      expect(transactionModel.create).toHaveBeenCalledTimes(2);
    });

    it('should throw if user not found', async () => {
      userModel.findById.mockResolvedValueOnce(null);

      await expect(service.transferCredits('u1', 'u2', 3, 'sess1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if insufficient credits', async () => {
      const fromUser = { _id: 'u1', credits: 1 };
      const toUser = { _id: 'u2', credits: 5 };
      userModel.findById.mockResolvedValueOnce(fromUser).mockResolvedValueOnce(toUser);

      await expect(service.transferCredits('u1', 'u2', 3, 'sess1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBalance', () => {
    it('should return user credits', async () => {
      userModel.findById.mockResolvedValue({ credits: 10 });

      expect(await service.getBalance('u1')).toBe(10);
    });

    it('should return 0 if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      expect(await service.getBalance('u1')).toBe(0);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transactions', async () => {
      const transactions = [{ _id: 't1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(transactions),
      };
      transactionModel.find.mockReturnValue(chain);
      transactionModel.countDocuments.mockResolvedValue(1);

      const result = await service.getTransactionHistory('u1', 1, 20);

      expect(result).toEqual({ transactions, total: 1 });
    });
  });
});
