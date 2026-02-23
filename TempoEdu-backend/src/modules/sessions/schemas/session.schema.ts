import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

export enum SessionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requester: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  provider: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Skill', required: true })
  skill: Types.ObjectId;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ required: true, min: 1, max: 4 })
  duration: number; // in hours (= credits)

  @Prop({ type: String, enum: SessionStatus, default: SessionStatus.PENDING })
  status: SessionStatus;

  @Prop({ default: '' })
  message: string;

  @Prop({ default: '' })
  meetingLink: string;

  @Prop()
  completedAt: Date;

  @Prop({ default: false })
  requesterConfirmed: boolean;

  @Prop({ default: false })
  providerConfirmed: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ requester: 1, status: 1 });
SessionSchema.index({ provider: 1, status: 1 });
SessionSchema.index({ scheduledAt: 1 });
