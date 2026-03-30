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
import { WebhooksService } from './webhooks.service';
import { CreateWebhookConfigDto } from './dto/create-webhook-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ApiBearerAuth } from '@nestjs/swagger/dist';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  createConfig(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: CreateWebhookConfigDto,
  ) {
    return this.webhooksService.createConfig(req.user.id, projectId, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    return this.webhooksService.findAll(req.user.id, projectId);
  }

  // GET /webhooks/events — delivery history for this project
  @Get('events')
  findEvents(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    return this.webhooksService.findEvents(req.user.id, projectId);
  }

  @Patch(':configId/activate')
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('configId') configId: string,
  ) {
    return this.webhooksService.toggleActive(req.user.id, projectId, configId, true);
  }

  @Patch(':configId/deactivate')
  deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('configId') configId: string,
  ) {
    return this.webhooksService.toggleActive(req.user.id, projectId, configId, false);
  }

  @Delete(':configId')
  deleteConfig(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('configId') configId: string,
  ) {
    return this.webhooksService.deleteConfig(req.user.id, projectId, configId);
  }
}