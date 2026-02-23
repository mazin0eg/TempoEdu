import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  SESSION_REQUEST = 'SESSION_REQUEST',
  SESSION_ACCEPTED = 'SESSION_ACCEPTED',
  SESSION_REJECTED = 'SESSION_REJECTED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  SESSION_CANCELLED = 'SESSION_CANCELLED',
  SESSION_REMINDER = 'SESSION_REMINDER',
  NEW_REVIEW = 'NEW_REVIEW',
  CREDIT_RECEIVED = 'CREDIT_RECEIVED',
  NEW_MESSAGE = 'NEW_MESSAGE',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
