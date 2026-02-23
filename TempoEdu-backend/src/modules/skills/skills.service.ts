import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument, SkillCategory, SkillLevel } from './schemas/skill.schema';
import { CreateSkillDto, UpdateSkillDto } from './dto';

export interface SkillFilters {
  category?: SkillCategory;
  level?: SkillLevel;
  type?: 'offer' | 'request';
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
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
    const { category, level, type, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { isActive: true };

    if (category) query.category = category;
    if (level) query.level = level;
    if (type) query.type = type;
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
}
