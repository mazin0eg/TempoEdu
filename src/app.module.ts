import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { StorageModule } from './storage/storage.module';
import { ProfileMetaModule } from './profile-meta/profile-meta.module';
import { SkillCertificationsModule } from './skill-certifications/skill-certifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'tempoedu',
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNC === 'false' ? false : true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/tempoedu'),
    UsersModule,
    AuthModule,
    ProfilesModule,
    StorageModule,
    ProfileMetaModule,
    SkillCertificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
