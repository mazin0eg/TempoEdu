import { IsString } from 'class-validator';

export class AddSkillDto {
  @IsString()
  name: string;
}
