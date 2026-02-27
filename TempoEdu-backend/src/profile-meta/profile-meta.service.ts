import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMeta } from './entities/profile-meta.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProfileMetaService {
  constructor(
    @InjectRepository(ProfileMeta) private readonly repo: Repository<ProfileMeta>,
    private readonly storage: StorageService,
  ) {}

  async getOrCreate(userId: string) {
    let meta = await this.repo.findOne({ where: { userId } });
    if (!meta) {
      meta = this.repo.create({ userId });
      meta = await this.repo.save(meta);
    }
    return meta;
  }

  async uploadAndSetAvatar(userId: string, file: any) {
    const uploaded = await this.storage.uploadBuffer(`avatars/${userId}`, file);
    const meta = await this.getOrCreate(userId);
    meta.avatarKey = uploaded.key;
    meta.avatarUrl = uploaded.url;
    return this.repo.save(meta);
  }
}
