import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { SkillsService, SkillFilters } from './skills.service';
import {
  CreateSkillDto,
  UpdateSkillDto,
  ClaimEarnedSkillDto,
  UpdateEarnedSkillDto,
} from './dto';
import { Auth, CurrentUser } from '../../common/decorators';
import type { UserDocument } from '../users/schemas/user.schema';
import { SkillCategory, SkillLevel } from './schemas/skill.schema';

@ApiTags('Skills')
@Controller('skills')
@Auth()
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new skill' })
  async create(
    @CurrentUser() user: UserDocument,
    @Body() createSkillDto: CreateSkillDto,
  ) {
    return this.skillsService.create(user._id.toString(), createSkillDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all skills with filters' })
  @ApiQuery({ name: 'category', required: false, enum: SkillCategory })
  @ApiQuery({ name: 'level', required: false, enum: SkillLevel })
  @ApiQuery({ name: 'type', required: false, enum: ['offer', 'request'] })
  @ApiQuery({ name: 'owner', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('category') category?: SkillCategory,
    @Query('level') level?: SkillLevel,
    @Query('type') type?: 'offer' | 'request',
    @Query('owner') owner?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const filters: SkillFilters = {
      category,
      level,
      type,
      owner,
      search,
      page,
      limit,
    };
    return this.skillsService.findAll(filters);
  }

  @Post('earned/from-session/:sessionId')
  @ApiOperation({ summary: 'Claim an earned skill from a completed session' })
  async claimEarnedSkill(
    @CurrentUser() user: UserDocument,
    @Param('sessionId') sessionId: string,
    @Body() body: ClaimEarnedSkillDto,
  ) {
    return this.skillsService.claimEarnedSkillFromSession(
      user._id.toString(),
      sessionId,
      body,
    );
  }

  @Get('earned/me')
  @ApiOperation({ summary: 'Get my earned skills' })
  async getMyEarnedSkills(@CurrentUser() user: UserDocument) {
    return this.skillsService.findMyEarnedSkills(user._id.toString());
  }

  @Get('earned/public/:userId')
  @ApiOperation({ summary: 'Get public earned skills for a user' })
  async getPublicEarnedSkills(@Param('userId') userId: string) {
    return this.skillsService.findPublicEarnedSkills(userId);
  }

  @Patch('earned/:id')
  @ApiOperation({ summary: 'Update my earned skill visibility' })
  async updateEarnedSkill(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() body: UpdateEarnedSkillDto,
  ) {
    return this.skillsService.updateEarnedSkill(id, user._id.toString(), body);
  }

  @Delete('earned/:id')
  @ApiOperation({ summary: 'Delete my earned skill' })
  async removeEarnedSkill(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.skillsService.removeEarnedSkill(id, user._id.toString());
  }

  @Get('earned/:id/certificate')
  @ApiOperation({ summary: 'Get certificate data for an earned skill' })
  async getCertificateData(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.skillsService.getCertificateData(id, user._id.toString());
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get matching skill suggestions' })
  async getSuggestions(@CurrentUser() user: UserDocument) {
    return this.skillsService.getMatchingSuggestions(user._id.toString());
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my skills' })
  async getMySkills(@CurrentUser() user: UserDocument) {
    return this.skillsService.findByUser(user._id.toString());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get skill by ID' })
  async findById(@Param('id') id: string) {
    return this.skillsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a skill' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() updateSkillDto: UpdateSkillDto,
  ) {
    return this.skillsService.update(id, user._id.toString(), updateSkillDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a skill' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.skillsService.remove(id, user._id.toString());
  }
}
