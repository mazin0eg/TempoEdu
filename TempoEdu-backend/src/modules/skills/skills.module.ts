import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { Skill, SkillSchema } from './schemas/skill.schema';
import { EarnedSkill, EarnedSkillSchema } from './schemas/earned-skill.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Skill.name, schema: SkillSchema },
      { name: EarnedSkill.name, schema: EarnedSkillSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService, MongooseModule],
})
export class SkillsModule {}
