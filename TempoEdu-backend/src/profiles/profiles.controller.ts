import { Controller, Get, UseGuards, Req, Patch, Body, Post, UploadedFile, UseInterceptors, Param } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileMetaService } from '../profile-meta/profile-meta.service';
import * as multer from 'multer';
import { AddSkillDto } from './dto/add-skill.dto';
import { SetCertifiedDto } from './dto/set-certified.dto';
import { SkillCertificationsService } from '../skill-certifications/skill-certifications.service';
import { CreateCertificationDto } from '../skill-certifications/dto/create-certification.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly profileMetaService: ProfileMetaService,
    private readonly skillCerts: SkillCertificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user.userId;
    const profile = await this.profilesService.findByUserId(userId);
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/skills')
  async updateSkills(@Req() req: any, @Body() dto: UpdateSkillsDto) {
    const userId = req.user.userId;
    const profile = await this.profilesService.setSkills(userId, dto.skills);
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    const userId = req.user.userId;
    const meta = await this.profileMetaService.uploadAndSetAvatar(userId, file);
    return { avatar: { url: meta.avatarUrl } };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/skills')
  async addSkill(@Req() req: any, @Body() dto: AddSkillDto) {
    const profile = await this.profilesService.addSkill(req.user.userId, dto.name);
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/skills/:name/certified')
  async setCertified(@Req() req: any, @Param('name') name: string, @Body() dto: SetCertifiedDto) {
    const profile = await this.profilesService.setSkillCertified(req.user.userId, name, dto.certified);
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/skills/:name/certification')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async addCertification(
    @Req() req: any,
    @Param('name') name: string,
    @Body() dto: CreateCertificationDto,
    @UploadedFile() file?: any,
  ) {
    const userId = req.user.userId;
    const cert = await this.skillCerts.createForSkill(userId, name, dto, file);
    const profile = await this.profilesService.linkSkillCertification(userId, name, cert.id);
    return { certification: cert, profile };
  }
}
