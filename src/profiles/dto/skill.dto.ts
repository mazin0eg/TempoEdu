import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SkillDto {
  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  certified?: boolean;

  @IsString()
  @IsOptional()
  certificationId?: string;
}
