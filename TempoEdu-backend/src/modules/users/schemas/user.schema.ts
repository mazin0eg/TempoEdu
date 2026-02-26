import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../../common/decorators/roles.decorator';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;

  @Prop({ default: 5 })
  credits: number;

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({
    type: {
      monday: { type: [String], default: [] },
      tuesday: { type: [String], default: [] },
      wednesday: { type: [String], default: [] },
      thursday: { type: [String], default: [] },
      friday: { type: [String], default: [] },
      saturday: { type: [String], default: [] },
      sunday: { type: [String], default: [] },
    },
    default: {},
  })
  availability: Record<string, string[]>;

  @Prop({ default: 0 })
  reputationScore: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isSuspended: boolean;

  @Prop()
  lastLoginAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('fullName').get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});
