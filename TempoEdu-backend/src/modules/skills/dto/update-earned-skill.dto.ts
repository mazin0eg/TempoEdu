import { PartialType } from '@nestjs/swagger';
import { ClaimEarnedSkillDto } from './claim-earned-skill.dto';

export class UpdateEarnedSkillDto extends PartialType(ClaimEarnedSkillDto) {}
