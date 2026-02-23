import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'Provider user ID' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ description: 'Skill ID' })
  @IsString()
  @IsNotEmpty()
  skill: string;

  @ApiProperty({ description: 'Scheduled date and time' })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiProperty({ description: 'Duration in hours (1-4)', example: 1 })
  @IsNumber()
  @Min(1)
  @Max(4)
  duration: number;

  @ApiPropertyOptional({ description: 'Message to the provider' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;
}
