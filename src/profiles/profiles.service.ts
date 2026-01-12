import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from './schemas/profile.schema';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(Profile.name) private readonly model: Model<ProfileDocument>,
  ) {}

  async createForUser(userId: string, name?: string, bio?: string) {
    const created = new this.model({ userId, name, bio });
    return created.save();
  }

  async findByUserId(userId: string) {
    return this.model.findOne({ userId }).lean();
  }

  async setSkills(userId: string, skills: { name: string; certified?: boolean; certificationId?: string | null }[]) {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $set: { skills } },
        { new: true, upsert: true },
      )
      .lean();
  }

  async addSkill(userId: string, name: string) {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $addToSet: { skills: { name, certified: false, certificationId: null } } },
        { new: true, upsert: true },
      )
      .lean();
  }

  async setSkillCertified(userId: string, name: string, certified: boolean) {
    return this.model
      .findOneAndUpdate(
        { userId, 'skills.name': name },
        { $set: { 'skills.$.certified': certified } },
        { new: true },
      )
      .lean();
  }

  async linkSkillCertification(userId: string, name: string, certificationId: string) {
    return this.model
      .findOneAndUpdate(
        { userId, 'skills.name': name },
        { $set: { 'skills.$.certificationId': certificationId, 'skills.$.certified': true } },
        { new: true },
      )
      .lean();
  }
}
