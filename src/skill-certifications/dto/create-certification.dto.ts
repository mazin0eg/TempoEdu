import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCertificationDto {
  @IsString()
  @IsOptional()
  issuer?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  credentialId?: string;
}
