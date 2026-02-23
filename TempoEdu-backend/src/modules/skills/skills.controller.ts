import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SkillsService, SkillFilters } from './skills.service';
import { CreateSkillDto, UpdateSkillDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import type { UserDocument } from '../users/schemas/user.schema';
import { SkillCategory, SkillLevel } from './schemas/skill.schema';

@ApiTags('Skills')
@Controller('skills')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
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
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('category') category?: SkillCategory,
    @Query('level') level?: SkillLevel,
    @Query('type') type?: 'offer' | 'request',
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const filters: SkillFilters = {
      category,
      level,
      type,
      search,
      page,
      limit,
    };
    return this.skillsService.findAll(filters);
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
