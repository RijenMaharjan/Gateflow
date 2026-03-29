import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RateLimitRulesRepository } from './rate-limit-rules.repository';
import { ProjectsService } from '../projects/projects.service';
import { CreateRateLimitRuleDto } from './dto/create-rate-limit-rule.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateRateLimitRuleDto extends PartialType(CreateRateLimitRuleDto){}

@Injectable()
export class RateLimitRulesService{
    constructor(
    private readonly rateLimitRulesRepository: RateLimitRulesRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateRateLimitRuleDto) {
    // verify project ownership — same pattern as ApiKeys
    await this.projectsService.findOne(projectId, userId);

    // one active rule per project keeps gateway logic simple —
    // no need to merge/prioritize multiple conflicting rules
    const existing = await this.rateLimitRulesRepository.findActiveByProject(projectId);
    if (existing) {
      throw new ConflictException(
        'This project already has a rate limit rule. Update or delete it first.',
      );
    }

    return this.rateLimitRulesRepository.create({
      projectId,
      maxRequests: dto.maxRequests,
      windowSeconds: dto.windowSeconds,
      strategy: dto.strategy,
    });
  }

    async findAll(userId: string, projectId: string) {
    await this.projectsService.findOne(projectId, userId);
    return this.rateLimitRulesRepository.findByProject(projectId);
  }

  async findOne(userId: string, projectId: string, ruleId: string) {
    await this.projectsService.findOne(projectId, userId);

    const rule = await this.rateLimitRulesRepository.findByIdAndProject(ruleId, projectId);
    if (!rule) throw new NotFoundException('Rate limit rule not found');

    return rule;
  }

  async update(
    userId: string,
    projectId: string,
    ruleId: string,
    dto: UpdateRateLimitRuleDto,
  ) {
    // findOne already verifies both project ownership and rule existence
    await this.findOne(userId, projectId, ruleId);
    return this.rateLimitRulesRepository.update(ruleId, dto);
  }

  async remove(userId: string, projectId: string, ruleId: string) {
    await this.findOne(userId, projectId, ruleId);
    return this.rateLimitRulesRepository.delete(ruleId);
  }

  // called by the Gateway module directly — no ownership check needed
  // because the gateway already validated the API key which belongs to the project
  async getActiveRuleForProject(projectId: string) {
    return this.rateLimitRulesRepository.findActiveByProject(projectId);
  }
}

