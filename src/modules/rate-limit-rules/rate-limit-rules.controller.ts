import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RateLimitRulesService } from './rate-limit-rules.service';
import { CreateRateLimitRuleDto } from './dto/create-rate-limit-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger/dist';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)  // all routes in this controller require a valid JWT
@ApiTags('Rate-Limit-rules')
@Controller('projects/:projectId/rate-limit-rules')
export class RateLimitRulesController {
  constructor(private readonly rateLimitRulesService: RateLimitRulesService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: CreateRateLimitRuleDto,
  ) {
    return this.rateLimitRulesService.create(req.user.id, projectId, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    return this.rateLimitRulesService.findAll(req.user.id, projectId);
  }

  @Get(':ruleId')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.rateLimitRulesService.findOne(req.user.id, projectId, ruleId);
  }

  @Patch(':ruleId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: CreateRateLimitRuleDto,
  ) {
    return this.rateLimitRulesService.update(req.user.id, projectId, ruleId, dto);
  }

  @Delete(':ruleId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.rateLimitRulesService.remove(req.user.id, projectId, ruleId);
  }
}