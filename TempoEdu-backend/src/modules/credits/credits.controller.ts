import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { Auth, CurrentUser } from '../../common/decorators';
import type { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Credits')
@Controller('credits')
@Auth()
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current credit balance' })
  async getBalance(@CurrentUser() user: UserDocument) {
    const balance = await this.creditsService.getBalance(user._id.toString());
    return { balance };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getHistory(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.creditsService.getTransactionHistory(
      user._id.toString(),
      page,
      limit,
    );
  }
}
