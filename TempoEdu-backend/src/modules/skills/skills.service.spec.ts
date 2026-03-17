import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { Skill } from './schemas/skill.schema';
import { EarnedSkill } from './schemas/earned-skill.schema';
import { Session } from '../sessions/schemas/session.schema';

describe('SkillsService', () => {
  let service: SkillsService;
  let skillModel: Record<string, jest.Mock>;
  let earnedSkillModel: Record<string, jest.Mock>;
  let sessionModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    skillModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
    };

    earnedSkillModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    sessionModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: getModelToken(Skill.name), useValue: skillModel },
        { provide: getModelToken(EarnedSkill.name), useValue: earnedSkillModel },
        { provide: getModelToken(Session.name), useValue: sessionModel },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  describe('create', () => {
    it('should create a skill', async () => {
      const dto = { name: 'JS', description: 'desc', category: 'programming' as any, level: 'beginner' as any, type: 'offer' as const };
      const created = { _id: 's1', ...dto, user: 'u1' };
      skillModel.create.mockResolvedValue(created);

      const result = await service.create('u1', dto);

      expect(skillModel.create).toHaveBeenCalledWith({ ...dto, user: 'u1' });
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return paginated skills', async () => {
      const skills = [{ _id: 's1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(skills),
      };
      skillModel.find.mockReturnValue(chain);
      skillModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({ skills, total: 1 });
    });

    it('should apply category filter', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      };
      skillModel.find.mockReturnValue(chain);
      skillModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ category: 'programming' as any });

      expect(skillModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'programming' }),
      );
    });
  });

  describe('findById', () => {
    it('should return a skill', async () => {
      const skill = { _id: 's1', name: 'JS' };
      skillModel.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(skill) });

      expect(await service.findById('s1')).toEqual(skill);
    });

    it('should throw NotFoundException', async () => {
      skillModel.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await expect(service.findById('s1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return user skills', async () => {
      const skills = [{ _id: 's1' }];
      skillModel.find.mockResolvedValue(skills);

      const result = await service.findByUser('u1');

      expect(skillModel.find).toHaveBeenCalledWith({ user: 'u1', isActive: true });
      expect(result).toEqual(skills);
    });
  });

  describe('update', () => {
    it('should update a skill owned by user', async () => {
      const skill = { _id: 's1', user: { toString: () => 'u1' }, save: jest.fn() };
      skill.save.mockResolvedValue({ ...skill, name: 'Updated' });
      skillModel.findById.mockResolvedValue(skill);

      await service.update('s1', 'u1', { name: 'Updated' });

      expect(skill.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if skill not found', async () => {
      skillModel.findById.mockResolvedValue(null);

      await expect(service.update('s1', 'u1', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      skillModel.findById.mockResolvedValue({ _id: 's1', user: { toString: () => 'other-user' } });

      await expect(service.update('s1', 'u1', { name: 'X' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft-delete a skill', async () => {
      const skill = { _id: 's1', user: { toString: () => 'u1' }, isActive: true, save: jest.fn().mockResolvedValue(undefined) };
      skillModel.findById.mockResolvedValue(skill);

      await service.remove('s1', 'u1');

      expect(skill.isActive).toBe(false);
      expect(skill.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      skillModel.findById.mockResolvedValue({ _id: 's1', user: { toString: () => 'other' } });

      await expect(service.remove('s1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMatchingSuggestions', () => {
    it('should return empty if no requests', async () => {
      skillModel.find.mockResolvedValue([]);

      const result = await service.getMatchingSuggestions('u1');

      expect(result).toEqual([]);
    });

    it('should return matching offers', async () => {
      const requests = [{ category: 'programming', name: 'JS' }];
      const offers = [{ _id: 's2', name: 'JavaScript', type: 'offer' }];

      // First call: user requests; second call: matching offers
      skillModel.find
        .mockResolvedValueOnce(requests)
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(offers) }),
        });

      const result = await service.getMatchingSuggestions('u1');

      expect(result).toEqual(offers);
    });
  });
});
