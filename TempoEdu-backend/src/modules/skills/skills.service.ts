import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument, SkillCategory, SkillLevel } from './schemas/skill.schema';
import { CreateSkillDto, UpdateSkillDto, ClaimEarnedSkillDto, UpdateEarnedSkillDto } from './dto';
import { EarnedSkill, EarnedSkillDocument } from './schemas/earned-skill.schema';
import { Session, SessionDocument, SessionStatus } from '../sessions/schemas/session.schema';

export interface SkillFilters {
  category?: SkillCategory;
  level?: SkillLevel;
  type?: 'offer' | 'request';
  owner?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CertificateData {
  learnerName: string;
  teacherName: string;
  skillName: string;
  category: SkillCategory;
  level: SkillLevel;
  issuedAt: Date;
  certificateCode: string;
}

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
    @InjectModel(EarnedSkill.name)
    private readonly earnedSkillModel: Model<EarnedSkillDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async create(
    userId: string,
    createSkillDto: CreateSkillDto,
  ): Promise<SkillDocument> {
    return this.skillModel.create({ ...createSkillDto, user: userId });
  }

  async findAll(
    filters: SkillFilters,
  ): Promise<{ skills: SkillDocument[]; total: number }> {
    const { category, level, type, owner, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { isActive: true };

    if (category) query.category = category;
    if (level) query.level = level;
    if (type) query.type = type;
    if (owner) query.user = owner;
    if (search) {
      query.$text = { $search: search };
    }

    const [skills, total] = await Promise.all([
      this.skillModel
        .find(query)
        .populate('user', 'firstName lastName avatar reputationScore')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.skillModel.countDocuments(query),
    ]);

    return { skills, total };
  }

  async findById(id: string): Promise<SkillDocument> {
    const skill = await this.skillModel
      .findById(id)
      .populate('user', 'firstName lastName avatar bio reputationScore languages availability');

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async findByUser(userId: string): Promise<SkillDocument[]> {
    return this.skillModel.find({ user: userId, isActive: true });
  }

  async update(
    skillId: string,
    userId: string,
    updateSkillDto: UpdateSkillDto,
  ): Promise<SkillDocument> {
    const skill = await this.skillModel.findById(skillId);

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    if (skill.user.toString() !== userId) {
      throw new ForbiddenException('You can only update your own skills');
    }

    Object.assign(skill, updateSkillDto);
    return skill.save();
  }

  async remove(skillId: string, userId: string): Promise<void> {
    const skill = await this.skillModel.findById(skillId);

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    if (skill.user.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own skills');
    }

    skill.isActive = false;
    await skill.save();
  }

  async getMatchingSuggestions(
    userId: string,
  ): Promise<SkillDocument[]> {
    // Find skills the user is requesting
    const userRequests = await this.skillModel.find({
      user: userId,
      type: 'request',
      isActive: true,
    });

    if (userRequests.length === 0) return [];

    const requestedCategories = userRequests.map((s) => s.category);
    const requestedNames = userRequests.map((s) => s.name);

    // Find matching offers from other users
    return this.skillModel
      .find({
        user: { $ne: userId },
        type: 'offer',
        isActive: true,
        $or: [
          { category: { $in: requestedCategories } },
          { name: { $in: requestedNames.map((n) => new RegExp(n, 'i')) } },
        ],
      })
      .populate('user', 'firstName lastName avatar reputationScore')
      .limit(10);
  }

  async claimEarnedSkillFromSession(
    userId: string,
    sessionId: string,
    dto: ClaimEarnedSkillDto,
  ): Promise<EarnedSkillDocument> {
    const existing = await this.earnedSkillModel.findOne({
      user: userId,
      session: sessionId,
    });

    if (existing) {
      throw new BadRequestException('You already claimed this earned skill');
    }

    const session = await this.sessionModel
      .findById(sessionId)
      .populate('requester', 'firstName lastName')
      .populate('provider', 'firstName lastName')
      .populate('skill', 'name category level');

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException(
        'Certificate can only be generated from completed sessions',
      );
    }

    const requesterId = (session.requester as any)._id?.toString();
    if (requesterId !== userId) {
      throw new ForbiddenException(
        'Only the learner can claim an earned skill from this session',
      );
    }

    const skill = session.skill as any;
    const certificateCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const earnedSkill = await this.earnedSkillModel.create({
      user: userId,
      teacher: (session.provider as any)._id,
      session: session._id,
      sourceSkill: skill?._id,
      skillName: skill?.name ?? 'Skill Session',
      category: skill?.category ?? SkillCategory.OTHER,
      level: skill?.level ?? SkillLevel.BEGINNER,
      certificateCode,
      isPublic: dto.isPublic ?? true,
      issuedAt: new Date(),
    });

    return this.earnedSkillModel
      .findById(earnedSkill._id)
      .populate('teacher', 'firstName lastName avatar reputationScore') as unknown as Promise<EarnedSkillDocument>;
  }

  async findMyEarnedSkills(userId: string): Promise<EarnedSkillDocument[]> {
    return this.earnedSkillModel
      .find({ user: userId })
      .populate('teacher', 'firstName lastName avatar reputationScore')
      .sort({ issuedAt: -1, createdAt: -1 });
  }

  async findPublicEarnedSkills(userId: string): Promise<EarnedSkillDocument[]> {
    return this.earnedSkillModel
      .find({ user: userId, isPublic: true })
      .populate('teacher', 'firstName lastName avatar reputationScore')
      .sort({ issuedAt: -1, createdAt: -1 });
  }

  async updateEarnedSkill(
    id: string,
    userId: string,
    updateDto: UpdateEarnedSkillDto,
  ): Promise<EarnedSkillDocument> {
    const earnedSkill = await this.earnedSkillModel.findById(id);

    if (!earnedSkill) {
      throw new NotFoundException('Earned skill not found');
    }

    if (earnedSkill.user.toString() !== userId) {
      throw new ForbiddenException('You can only update your own earned skills');
    }

    Object.assign(earnedSkill, updateDto);
    await earnedSkill.save();

    return this.earnedSkillModel
      .findById(earnedSkill._id)
      .populate('teacher', 'firstName lastName avatar reputationScore') as unknown as Promise<EarnedSkillDocument>;
  }

  async removeEarnedSkill(id: string, userId: string): Promise<void> {
    const earnedSkill = await this.earnedSkillModel.findById(id);

    if (!earnedSkill) {
      throw new NotFoundException('Earned skill not found');
    }

    if (earnedSkill.user.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own earned skills');
    }

    await earnedSkill.deleteOne();
  }

  async getCertificateData(
    id: string,
    viewerId?: string,
  ): Promise<CertificateData> {
    const earnedSkill = await this.earnedSkillModel
      .findById(id)
      .populate('user', 'firstName lastName')
      .populate('teacher', 'firstName lastName');

    if (!earnedSkill) {
      throw new NotFoundException('Earned skill not found');
    }

    const ownerId = (earnedSkill.user as any)._id?.toString() ?? earnedSkill.user.toString();

    if (!earnedSkill.isPublic && ownerId !== viewerId) {
      throw new ForbiddenException('Certificate is private');
    }

    return {
      learnerName: `${(earnedSkill.user as any).firstName} ${(earnedSkill.user as any).lastName}`,
      teacherName: `${(earnedSkill.teacher as any).firstName} ${(earnedSkill.teacher as any).lastName}`,
      skillName: earnedSkill.skillName,
      category: earnedSkill.category,
      level: earnedSkill.level,
      issuedAt: earnedSkill.issuedAt,
      certificateCode: earnedSkill.certificateCode,
    };
  }
}
