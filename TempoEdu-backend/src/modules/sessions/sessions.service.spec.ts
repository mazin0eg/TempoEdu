import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Session, SessionStatus } from './schemas/session.schema';
import { CreditsService } from '../credits/credits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionModel: Record<string, jest.Mock>;
  let creditsService: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;
  let chatGateway: Record<string, jest.Mock>;

  beforeEach(async () => {
    sessionModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };

    creditsService = {
      hasEnoughCredits: jest.fn(),
      transferCredits: jest.fn().mockResolvedValue(undefined),
    };

    notificationsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    chatGateway = {
      sendToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getModelToken(Session.name), useValue: sessionModel },
        { provide: CreditsService, useValue: creditsService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ChatGateway, useValue: chatGateway },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('create', () => {
    const dto = { provider: 'provider1', skill: 'skill1', scheduledAt: '2025-03-15T10:00:00Z', duration: 1 };

    it('should create a session', async () => {
      creditsService.hasEnoughCredits.mockResolvedValue(true);

      const session = {
        _id: 'sess1',
        ...dto,
        requester: 'user1',
        status: SessionStatus.PENDING,
        populate: jest.fn().mockResolvedValue({ _id: 'sess1', ...dto, requester: 'user1' }),
      };
      sessionModel.create.mockResolvedValue(session);

      const result = await service.create('user1', dto);

      expect(creditsService.hasEnoughCredits).toHaveBeenCalledWith('user1', 1);
      expect(sessionModel.create).toHaveBeenCalledWith({ ...dto, requester: 'user1' });
      expect(notificationsService.create).toHaveBeenCalled();
      expect(chatGateway.sendToUser).toHaveBeenCalledTimes(2);
    });

    it('should throw if booking with yourself', async () => {
      await expect(service.create('provider1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if insufficient credits', async () => {
      creditsService.hasEnoughCredits.mockResolvedValue(false);

      await expect(service.create('user1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return a populated session', async () => {
      const session = { _id: 'sess1' };
      const chain = {
        populate: jest.fn().mockReturnThis(),
      };
      chain.populate
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce(session);
      sessionModel.findById.mockReturnValue(chain);

      expect(await service.findById('sess1')).toEqual(session);
    });

    it('should throw NotFoundException', async () => {
      const chain = { populate: jest.fn().mockReturnThis() };
      chain.populate
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce(null);
      sessionModel.findById.mockReturnValue(chain);

      await expect(service.findById('sess1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return user sessions', async () => {
      const sessions = [{ _id: 'sess1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(sessions),
      };
      sessionModel.find.mockReturnValue(chain);

      const result = await service.findByUser('u1');

      expect(result).toEqual(sessions);
    });

    it('should filter by status', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      };
      sessionModel.find.mockReturnValue(chain);

      await service.findByUser('u1', SessionStatus.PENDING);

      expect(sessionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: SessionStatus.PENDING }),
      );
    });
  });

  describe('updateStatus', () => {
    const makeSession = (overrides = {}) => ({
      _id: 'sess1',
      requester: { _id: { toString: () => 'req1' } },
      provider: { _id: { toString: () => 'prov1' } },
      status: SessionStatus.PENDING,
      duration: 1,
      requesterConfirmed: false,
      providerConfirmed: false,
      roomId: '',
      meetingLink: '',
      completedAt: null as Date | null,
      save: jest.fn(),
      ...overrides,
    });

    beforeEach(() => {
      const chain = { populate: jest.fn().mockReturnThis() };
      const session = makeSession();
      chain.populate
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce(session);
      sessionModel.findById.mockReturnValue(chain);
      session.save.mockResolvedValue(session);
    });

    it('should accept session as provider', async () => {
      const session = makeSession();
      session.save.mockResolvedValue(session);
      const chain = { populate: jest.fn().mockReturnThis() };
      chain.populate.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValueOnce(session);
      sessionModel.findById.mockReturnValue(chain);

      await service.updateStatus('sess1', 'prov1', { status: SessionStatus.ACCEPTED });

      expect(session.status).toBe(SessionStatus.ACCEPTED);
      expect(session.roomId).toBeDefined();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should reject session as provider', async () => {
      const session = makeSession();
      session.save.mockResolvedValue(session);
      const chain = { populate: jest.fn().mockReturnThis() };
      chain.populate.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValueOnce(session);
      sessionModel.findById.mockReturnValue(chain);

      await service.updateStatus('sess1', 'prov1', { status: SessionStatus.REJECTED });

      expect(session.status).toBe(SessionStatus.REJECTED);
    });

    it('should throw ForbiddenException if user not in session', async () => {
      const session = makeSession();
      const chain = { populate: jest.fn().mockReturnThis() };
      chain.populate.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValueOnce(session);
      sessionModel.findById.mockReturnValue(chain);

      await expect(
        service.updateStatus('sess1', 'stranger', { status: SessionStatus.ACCEPTED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should complete session when both confirm', async () => {
      const session = makeSession({
        requesterConfirmed: true,
        providerConfirmed: false,
      });
      session.save.mockResolvedValue(session);
      const chain = { populate: jest.fn().mockReturnThis() };
      chain.populate.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValueOnce(session);
      sessionModel.findById.mockReturnValue(chain);

      await service.updateStatus('sess1', 'prov1', { status: SessionStatus.COMPLETED });

      expect(session.providerConfirmed).toBe(true);
      expect(session.status).toBe(SessionStatus.COMPLETED);
      expect(creditsService.transferCredits).toHaveBeenCalled();
    });
  });
});
