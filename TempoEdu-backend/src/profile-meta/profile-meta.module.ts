import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileMeta } from './entities/profile-meta.entity';
import { ProfileMetaService } from './profile-meta.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileMeta]), StorageModule],
  providers: [ProfileMetaService],
  exports: [ProfileMetaService],
})
export class ProfileMetaModule {}
