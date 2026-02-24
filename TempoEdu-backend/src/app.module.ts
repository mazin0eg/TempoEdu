import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SkillsModule } from './modules/skills/skills.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CreditsModule } from './modules/credits/credits.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebrtcModule } from './modules/webrtc/webrtc.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    SkillsModule,
    SessionsModule,
    ReviewsModule,
    CreditsModule,
    ChatModule,
    NotificationsModule,
    AdminModule,
    WebrtcModule,
  ],
})
export class AppModule {}
