import { Module } from '@nestjs/common';
import { RateLimitRulesController } from './rate-limit-rules.controller';
import { RateLimitRulesService } from './rate-limit-rules.service';
import { RateLimitRulesRepository } from './rate-limit-rules.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    AuthModule,      // for JwtAuthGuard
    ProjectsModule,  // for ProjectsService.findOne() — ownership checks
  ],
  controllers: [RateLimitRulesController],
  providers: [RateLimitRulesService, RateLimitRulesRepository, PrismaService],
  exports: [RateLimitRulesService], // exported so Gateway can call getActiveRuleForProject()
})
export class RateLimitRulesModule {}
