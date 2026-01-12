import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProfileDocument = HydratedDocument<Profile>;

@Schema({ timestamps: true })
export class Profile {
  @Prop({ required: true })
  userId: string; // SQL user UUID

  @Prop()
  name?: string;

  @Prop()
  bio?: string;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        certified: { type: Boolean, default: false },
        certificationId: { type: String, default: null }, // SQL Certification UUID
      },
    ],
    default: [],
  })
  skills?: { name: string; certified: boolean; certificationId?: string | null }[];
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
