import {
  Body,
  Controller,
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
import { SessionsService } from './sessions.service';
import { CreateSessionDto, UpdateSessionDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import { UserDocument } from '../users/schemas/user.schema';
import { SessionStatus } from './schemas/session.schema';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session request' })
  async create(
    @CurrentUser() user: UserDocument,
    @Body() createSessionDto: CreateSessionDto,
  ) {
    return this.sessionsService.create(user._id as string, createSessionDto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my sessions' })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus })
  async getMySessions(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: SessionStatus,
  ) {
    return this.sessionsService.findByUser(user._id as string, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  async findById(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update session status' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    return this.sessionsService.updateStatus(
      id,
      user._id as string,
      updateSessionDto,
    );
  }
}
