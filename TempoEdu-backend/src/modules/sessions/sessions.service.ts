import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from './schemas/session.schema';
import { CreateSessionDto, UpdateSessionDto } from './dto';
import { CreditsService } from '../credits/credits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { ChatGateway } from '../chat/chat.gateway';
import { Skill, SkillDocument } from '../skills/schemas/skill.schema';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(Skill.name)
    private readonly skillModel: Model<SkillDocument>,
    private readonly creditsService: CreditsService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async create(
    requesterId: string,
    createSessionDto: CreateSessionDto,
  ): Promise<SessionDocument> {
    const skill = await this.skillModel
      .findById(createSessionDto.skill)
      .select('user type');

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const skillOwnerId = skill.user.toString();
    const isRequestedSkill = skill.type === 'request';

    // Derive roles from the skill itself so API callers cannot accidentally invert them.
    // Requested skill: owner is learner/requester, caller is teacher/provider.
    // Offered skill: caller is learner/requester, owner is teacher/provider.
    const resolvedRequesterId = isRequestedSkill ? skillOwnerId : requesterId;
    const resolvedProviderId = isRequestedSkill ? requesterId : skillOwnerId;

    if (resolvedRequesterId === resolvedProviderId) {
      throw new BadRequestException('You cannot book a session with yourself');
    }

    // Check if learner (requester) has enough credits.
    const hasCredits = await this.creditsService.hasEnoughCredits(
      resolvedRequesterId,
      createSessionDto.duration,
    );

    if (!hasCredits) {
      throw new BadRequestException('Insufficient credits');
    }

    const session = await this.sessionModel.create({
      ...createSessionDto,
      requester: resolvedRequesterId,
      provider: resolvedProviderId,
    });

    const notificationRecipient = isRequestedSkill
      ? resolvedRequesterId
      : resolvedProviderId;

    const notificationMessage = isRequestedSkill
      ? 'Someone offered to teach a skill you requested'
      : 'You have a new session request';

    // Notify the counterparty.
    await this.notificationsService.create({
      recipient: notificationRecipient,
      type: NotificationType.SESSION_REQUEST,
      title: 'New Session Request',
      message: notificationMessage,
      metadata: { sessionId: session._id },
    });

    // Real-time: tell both users about new session
    this.chatGateway.sendToUser(resolvedRequesterId, 'sessionUpdated', { sessionId: session._id, status: session.status });
    this.chatGateway.sendToUser(resolvedProviderId, 'sessionUpdated', { sessionId: session._id, status: session.status });

    return session.populate([
      { path: 'requester', select: 'firstName lastName avatar' },
      { path: 'provider', select: 'firstName lastName avatar' },
      { path: 'skill', select: 'name category type' },
    ]);
  }

  async findById(id: string): Promise<SessionDocument> {
    const session = await this.sessionModel
      .findById(id)
      .populate('requester', 'firstName lastName avatar email')
      .populate('provider', 'firstName lastName avatar email')
      .populate('skill', 'name category level type');

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async findByUser(
    userId: string,
    status?: SessionStatus,
  ): Promise<SessionDocument[]> {
    const query: Record<string, unknown> = {
      $or: [{ requester: userId }, { provider: userId }],
    };

    if (status) query.status = status;

    return this.sessionModel
      .find(query)
      .populate('requester', 'firstName lastName avatar')
      .populate('provider', 'firstName lastName avatar')
      .populate('skill', 'name category type')
      .sort({ scheduledAt: -1 });
  }

  async updateStatus(
    sessionId: string,
    userId: string,
    updateDto: UpdateSessionDto,
  ): Promise<SessionDocument> {
    const session = await this.findById(sessionId);

    // Verify that the user is part of this session
    const isProvider =
      (session.provider as any)._id.toString() === userId;
    const isRequester =
      (session.requester as any)._id.toString() === userId;

    if (!isProvider && !isRequester) {
      throw new ForbiddenException('You are not part of this session');
    }

    // Handle status transitions
    const skillType = (session.skill as any)?.type;
    const canRespondToRequest =
      skillType === 'request' ? isRequester : isProvider;

    if (updateDto.status === SessionStatus.ACCEPTED && canRespondToRequest) {
      session.status = SessionStatus.ACCEPTED;
      session.roomId = randomUUID();

      const recipientId = isProvider
        ? (session.requester as any)._id.toString()
        : (session.provider as any)._id.toString();

      await this.notificationsService.create({
        recipient: recipientId,
        type: NotificationType.SESSION_ACCEPTED,
        title: 'Session Accepted',
        message: 'Your session has been accepted',
        metadata: { sessionId: session._id },
      });
    } else if (updateDto.status === SessionStatus.REJECTED && canRespondToRequest) {
      session.status = SessionStatus.REJECTED;

      const recipientId = isProvider
        ? (session.requester as any)._id.toString()
        : (session.provider as any)._id.toString();

      await this.notificationsService.create({
        recipient: recipientId,
        type: NotificationType.SESSION_REJECTED,
        title: 'Session Rejected',
        message: 'Your session request was rejected',
        metadata: { sessionId: session._id },
      });
    } else if (updateDto.status === SessionStatus.CANCELLED) {
      session.status = SessionStatus.CANCELLED;
      const recipientId = isRequester
        ? (session.provider as any)._id.toString()
        : (session.requester as any)._id.toString();

      await this.notificationsService.create({
        recipient: recipientId,
        type: NotificationType.SESSION_CANCELLED,
        title: 'Session Cancelled',
        message: 'A session has been cancelled',
        metadata: { sessionId: session._id },
      });
    } else if (updateDto.status === SessionStatus.COMPLETED) {
      // Both parties need to confirm
      if (isRequester) session.requesterConfirmed = true;
      if (isProvider) session.providerConfirmed = true;

      if (session.requesterConfirmed && session.providerConfirmed) {
        session.status = SessionStatus.COMPLETED;
        session.completedAt = new Date();

        // Transfer credits
        await this.creditsService.transferCredits(
          (session.requester as any)._id.toString(),
          (session.provider as any)._id.toString(),
          session.duration,
          session._id.toString(),
        );

        // Notify both
        const participants = [
          (session.requester as any)._id.toString(),
          (session.provider as any)._id.toString(),
        ];
        for (const participantId of participants) {
          await this.notificationsService.create({
            recipient: participantId,
            type: NotificationType.SESSION_COMPLETED,
            title: 'Session Completed',
            message: 'Session has been completed. Credits have been transferred.',
            metadata: { sessionId: session._id },
          });
        }
      }
    }

    if (updateDto.meetingLink) {
      session.meetingLink = updateDto.meetingLink;
    }

    const saved = await session.save();

    // Emit real-time sessionUpdated to both participants
    const requesterId = (session.requester as any)._id?.toString() ?? session.requester.toString();
    const providerId = (session.provider as any)._id?.toString() ?? session.provider.toString();

    this.chatGateway.sendToUser(requesterId, 'sessionUpdated', { sessionId: saved._id, status: saved.status });
    this.chatGateway.sendToUser(providerId, 'sessionUpdated', { sessionId: saved._id, status: saved.status });

    // If credits were transferred (completed), also notify about credit changes
    if (saved.status === SessionStatus.COMPLETED) {
      this.chatGateway.sendToUser(requesterId, 'creditUpdate', { sessionId: saved._id });
      this.chatGateway.sendToUser(providerId, 'creditUpdate', { sessionId: saved._id });
    }

    return saved;
  }
}
