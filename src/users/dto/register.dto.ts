import { IsEmail, IsNotEmpty, MinLength, IsOptional, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @MaxLength(300)
  bio?: string;
}
