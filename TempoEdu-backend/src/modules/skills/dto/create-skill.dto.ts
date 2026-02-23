import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SkillLevel,
  SkillCategory,
} from '../schemas/skill.schema';

export class CreateSkillDto {
  @ApiProperty({ example: 'JavaScript' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'I can teach modern JavaScript ES6+' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({ enum: SkillCategory })
  @IsEnum(SkillCategory)
  category: SkillCategory;

  @ApiProperty({ enum: SkillLevel })
  @IsEnum(SkillLevel)
  level: SkillLevel;

  @ApiProperty({ enum: ['offer', 'request'] })
  @IsEnum(['offer', 'request'] as const)
  type: 'offer' | 'request';

  @ApiPropertyOptional({ example: ['js', 'web', 'frontend'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
