import { ArrayNotEmpty, IsArray } from 'class-validator';
import { SkillDto } from './skill.dto';

export class UpdateSkillsDto {
  @IsArray()
  @ArrayNotEmpty()
  skills: SkillDto[];
}
