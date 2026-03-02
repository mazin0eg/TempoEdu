import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Skill, SkillDocument } from '../skills/schemas/skill.schema';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from '../sessions/schemas/session.schema';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  async getDashboardStats(): Promise<Record<string, unknown>> {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalSkills,
      totalSessions,
      completedSessions,
      pendingSessions,
      totalReviews,
      avgRating,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true, isSuspended: false }),
      this.userModel.countDocuments({ isSuspended: true }),
      this.skillModel.countDocuments({ isActive: true }),
      this.sessionModel.countDocuments(),
      this.sessionModel.countDocuments({ status: SessionStatus.COMPLETED }),
      this.sessionModel.countDocuments({ status: SessionStatus.PENDING }),
      this.reviewModel.countDocuments(),
      this.reviewModel
        .aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }])
        .then((r) => r[0]?.avg || 0),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      skills: { total: totalSkills },
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        pending: pendingSessions,
      },
      reviews: { total: totalReviews, averageRating: Math.round(avgRating * 10) / 10 },
    };
  }

  async getAllUsers(
    page = 1,
    limit = 20,
  ): Promise<{ users: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments(),
    ]);

    return { users, total };
  }

  async suspendUser(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { isSuspended: true },
      { new: true },
    );
  }

  async unsuspendUser(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { isSuspended: false },
      { new: true },
    );
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isActive: false,
      isSuspended: true,
    });
  }

  async getSkillsByCategory(): Promise<Record<string, number>> {
    const result = await this.skillModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return result.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async getRecentSessions(limit = 10): Promise<SessionDocument[]> {
    return this.sessionModel
      .find()
      .populate('requester', 'firstName lastName email')
      .populate('provider', 'firstName lastName email')
      .populate('skill', 'name category')
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
