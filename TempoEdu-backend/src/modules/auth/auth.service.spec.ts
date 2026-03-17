import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../users/schemas/user.schema';
import { CreditsService } from '../credits/credits.service';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let userModel: Record<string, jest.Mock>;
  let jwtService: { sign: jest.Mock };
  let creditsService: { grantInitialCredits: jest.Mock };

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = { sign: jest.fn().mockReturnValue('mock-token') };
    creditsService = { grantInitialCredits: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: JwtService, useValue: jwtService },
        { provide: CreditsService, useValue: creditsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = {
        _id: 'user-id-1',
        ...registerDto,
        password: 'hashed-password',
        email: registerDto.email,
        role: 'user',
      };
      userModel.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: registerDto.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(userModel.create).toHaveBeenCalledWith({
        ...registerDto,
        password: 'hashed-password',
      });
      expect(creditsService.grantInitialCredits).toHaveBeenCalledWith('user-id-1');
      expect(result).toEqual({ user: createdUser, accessToken: 'mock-token' });
    });

    it('should throw ConflictException if email already exists', async () => {
      userModel.findOne.mockResolvedValue({ email: registerDto.email });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'john@example.com', password: 'password123' };

    it('should login successfully', async () => {
      const user = {
        _id: 'user-id-1',
        email: loginDto.email,
        password: 'hashed-password',
        isSuspended: false,
        role: 'user',
        lastLoginAt: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toEqual({ user, accessToken: 'mock-token' });
      expect(user.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      const user = {
        email: loginDto.email,
        password: 'hashed',
        isSuspended: true,
      };
      userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const user = {
        email: loginDto.email,
        password: 'hashed',
        isSuspended: false,
      };
      userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = { _id: 'user-id-1', firstName: 'John' };
      userModel.findById.mockResolvedValue(user);

      const result = await service.getProfile('user-id-1');
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
