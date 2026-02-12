import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from './entities/certification.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class SkillCertificationsService {
  constructor(
    @InjectRepository(Certification) private readonly repo: Repository<Certification>,
    private readonly storage: StorageService,
  ) {}

  async createForSkill(userId: string, skillName: string, dto: Partial<Certification>, file?: any) {
    const cert = this.repo.create({ ...dto, userId, skillName });
    if (file) {
      const uploaded = await this.storage.uploadBuffer(`skill-certifications/${userId}/${skillName}`, file);
      cert.fileKey = uploaded.key;
      cert.fileUrl = uploaded.url;
    }
    return this.repo.save(cert);
  }
}
