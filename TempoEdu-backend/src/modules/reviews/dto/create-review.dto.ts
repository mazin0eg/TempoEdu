import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  session: string;

  @ApiProperty({ description: 'Reviewee user ID' })
  @IsString()
  @IsNotEmpty()
  reviewee: string;

  @ApiProperty({ description: 'Rating 1-5', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Comment' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
