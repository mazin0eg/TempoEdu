import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    userModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('should return a user', async () => {
      const user = { _id: 'id1', firstName: 'John' };
      userModel.findById.mockResolvedValue(user);

      expect(await service.findById('id1')).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.findById('id1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update and return the user', async () => {
      const updated = { _id: 'id1', firstName: 'Jane' };
      userModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.updateProfile('id1', { firstName: 'Jane' });
      expect(result).toEqual(updated);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'id1',
        { $set: { firstName: 'Jane' } },
        { new: true, runValidators: true },
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      userModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.updateProfile('id1', { firstName: 'Jane' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [{ _id: 'id1' }];
      const chain = { skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(users) };
      userModel.find.mockReturnValue(chain);
      userModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({ users, total: 1 });
      expect(userModel.find).toHaveBeenCalledWith({ isActive: true, isSuspended: false });
    });
  });

  describe('searchUsers', () => {
    it('should return users matching query', async () => {
      const users = [{ _id: 'id1', firstName: 'John' }];
      const chain = { skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(users) };
      userModel.find.mockReturnValue(chain);
      userModel.countDocuments.mockResolvedValue(1);

      const result = await service.searchUsers('John', 1, 20);

      expect(result).toEqual({ users, total: 1 });
    });
  });
});
