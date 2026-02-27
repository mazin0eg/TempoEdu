import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '../schemas/session.schema';

export class UpdateSessionDto {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  meetingLink?: string;
}
