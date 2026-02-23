import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from '../sessions/schemas/session.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    reviewerId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewDocument> {
    const session = await this.sessionModel.findById(createReviewDto.session);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException('Session is not completed yet');
    }

    // Check if the reviewer is part of the session
    const isParticipant =
      session.requester.toString() === reviewerId ||
      session.provider.toString() === reviewerId;

    if (!isParticipant) {
      throw new BadRequestException('You are not part of this session');
    }

    // Check if already reviewed
    const existingReview = await this.reviewModel.findOne({
      session: createReviewDto.session,
      reviewer: reviewerId,
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this session');
    }

    const review = await this.reviewModel.create({
      ...createReviewDto,
      reviewer: reviewerId,
    });

    // Update user reputation score
    await this.updateUserReputation(createReviewDto.reviewee);

    // Notify reviewee
    await this.notificationsService.create({
      recipient: createReviewDto.reviewee,
      type: NotificationType.NEW_REVIEW,
      title: 'New Review',
      message: `You received a ${createReviewDto.rating}-star review`,
      metadata: { reviewId: review._id, sessionId: session._id },
    });

    return review.populate([
      { path: 'reviewer', select: 'firstName lastName avatar' },
      { path: 'reviewee', select: 'firstName lastName avatar' },
    ]);
  }

  async findByUser(userId: string): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ reviewee: userId })
      .populate('reviewer', 'firstName lastName avatar')
      .populate('session', 'scheduledAt')
      .sort({ createdAt: -1 });
  }

  async findBySession(sessionId: string): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ session: sessionId })
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar');
  }

  private async updateUserReputation(userId: string): Promise<void> {
    const reviews = await this.reviewModel.find({ reviewee: userId });
    const totalReviews = reviews.length;

    if (totalReviews === 0) return;

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await this.userModel.findByIdAndUpdate(userId, {
      reputationScore: Math.round(avgRating * 10) / 10,
      totalReviews,
    });
  }
}
