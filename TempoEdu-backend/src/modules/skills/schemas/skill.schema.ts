import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SkillDocument = Skill & Document;

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum SkillCategory {
  PROGRAMMING = 'programming',
  DESIGN = 'design',
  LANGUAGES = 'languages',
  MUSIC = 'music',
  COOKING = 'cooking',
  SPORTS = 'sports',
  BUSINESS = 'business',
  ACADEMIC = 'academic',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Skill {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: String, enum: SkillCategory, required: true })
  category: SkillCategory;

  @Prop({ type: String, enum: SkillLevel, required: true })
  level: SkillLevel;

  @Prop({ type: String, enum: ['offer', 'request'], required: true })
  type: 'offer' | 'request';

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);

SkillSchema.index({ name: 'text', description: 'text', tags: 'text' });
SkillSchema.index({ category: 1, level: 1 });
SkillSchema.index({ user: 1 });
