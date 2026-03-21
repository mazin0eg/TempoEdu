import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session, SessionSchema } from './schemas/session.schema';
import { CreditsModule } from '../credits/credits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { Skill, SkillSchema } from '../skills/schemas/skill.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Skill.name, schema: SkillSchema },
    ]),
    forwardRef(() => CreditsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ChatModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService, MongooseModule],
})
export class SessionsModule {}
