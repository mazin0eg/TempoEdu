import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Auth, CurrentUser } from '../../common/decorators';
import type { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Reviews')
@Controller('reviews')
@Auth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review after a session' })
  async create(
    @CurrentUser() user: UserDocument,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user._id.toString(), createReviewDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews for a user' })
  async findByUser(@Param('userId') userId: string) {
    return this.reviewsService.findByUser(userId);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get reviews for a session' })
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.reviewsService.findBySession(sessionId);
  }
}
