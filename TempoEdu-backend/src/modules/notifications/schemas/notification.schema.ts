import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  SESSION_REQUEST = 'session_request',
  SESSION_ACCEPTED = 'session_accepted',
  SESSION_REJECTED = 'session_rejected',
  SESSION_COMPLETED = 'session_completed',
  SESSION_CANCELLED = 'session_cancelled',
  NEW_MESSAGE = 'new_message',
  NEW_REVIEW = 'new_review',
  CREDITS_RECEIVED = 'credits_received',
  CREDITS_DEDUCTED = 'credits_deducted',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
