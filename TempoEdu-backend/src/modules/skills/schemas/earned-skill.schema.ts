import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SkillCategory, SkillLevel } from './skill.schema';

export type EarnedSkillDocument = EarnedSkill & Document;

@Schema({ timestamps: true })
export class EarnedSkill {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacher: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Skill' })
  sourceSkill?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  skillName: string;

  @Prop({ type: String, enum: SkillCategory, required: true })
  category: SkillCategory;

  @Prop({ type: String, enum: SkillLevel, required: true })
  level: SkillLevel;

  @Prop({ required: true, unique: true })
  certificateCode: string;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ default: Date.now })
  issuedAt: Date;
}

export const EarnedSkillSchema = SchemaFactory.createForClass(EarnedSkill);

EarnedSkillSchema.index({ user: 1, issuedAt: -1 });
EarnedSkillSchema.index({ user: 1, isPublic: 1 });
EarnedSkillSchema.index({ user: 1, session: 1 }, { unique: true });
