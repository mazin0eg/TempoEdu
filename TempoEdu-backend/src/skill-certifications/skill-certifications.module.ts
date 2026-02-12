import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certification } from './entities/certification.entity';
import { SkillCertificationsService } from './skill-certifications.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Certification]), StorageModule],
  providers: [SkillCertificationsService],
  exports: [SkillCertificationsService],
})
export class SkillCertificationsModule {}
