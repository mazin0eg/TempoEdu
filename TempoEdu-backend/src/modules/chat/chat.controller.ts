import {
  Body,
  Controller,
  Get,
  Param,
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
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators';
import type { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  async getConversations(@CurrentUser() user: UserDocument) {
    return this.chatService.getUserConversations(user._id.toString());
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get a conversation' })
  async createConversation(
    @CurrentUser() user: UserDocument,
    @Body('participantId') participantId: string,
  ) {
    return this.chatService.getOrCreateConversation(
      user._id.toString(),
      participantId,
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMessages(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(id, page, limit);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  async getUnreadCount(@CurrentUser() user: UserDocument) {
    const count = await this.chatService.getUnreadCount(
      user._id.toString(),
    );
    return { unreadCount: count };
  }
}
