import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { WebhooksRepository } from './webhooks.repository';
import { ProjectsService } from '../projects/projects.service';
import { CreateWebhookConfigDto, WebhookEventType } from './dto/create-webhook-config.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly webhooksRepository: WebhooksRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  // ─── Config management (user-facing) ─────────────────────────────────────

  async createConfig(userId: string, projectId: string, dto: CreateWebhookConfigDto) {
    await this.projectsService.findOne(projectId, userId);

    // generate a random secret the user uses to verify incoming webhook signatures
    // shown once at creation — if lost the user must delete and recreate the config
    const secret = randomBytes(32).toString('hex');

    const config = await this.webhooksRepository.createConfig({
      projectId,
      url: dto.url,
      secret,
      events: dto.events,
    });

    // return the secret once alongside the config
    // we store it in DB (unlike API keys) because the worker needs it to sign payloads
    // but we don't return it from findAll/findOne — only at creation
    return {
      ...config,
      secret,
      message: 'Save this secret. Use it to verify incoming webhook signatures.',
    };
  }

  async findAll(userId: string, projectId: string) {
    await this.projectsService.findOne(projectId, userId);
    return this.webhooksRepository.findConfigsByProject(projectId);
  }

  async toggleActive(userId: string, projectId: string, configId: string, isActive: boolean) {
    await this.projectsService.findOne(projectId, userId);

    const config = await this.webhooksRepository.findConfigById(configId, projectId);
    if (!config) throw new NotFoundException('Webhook config not found');

    return this.webhooksRepository.updateConfigStatus(configId, isActive);
  }

  async deleteConfig(userId: string, projectId: string, configId: string) {
    await this.projectsService.findOne(projectId, userId);

    const config = await this.webhooksRepository.findConfigById(configId, projectId);
    if (!config) throw new NotFoundException('Webhook config not found');

    return this.webhooksRepository.deleteConfig(configId);
  }

  async findEvents(userId: string, projectId: string) {
    await this.projectsService.findOne(projectId, userId);
    return this.webhooksRepository.findEventsByProject(projectId);
  }

  // ─── Internal — called by GatewayService ─────────────────────────────────

  async dispatchEvent(
    apiKeyId: string,
    projectId: string,
    eventType: WebhookEventType,
    payload: object,
  ) {
    // find all active webhook configs subscribed to this event type
    const configs = await this.webhooksRepository.findActiveConfigsForEvent(
      projectId,
      eventType,
    );

    if (configs.length === 0) return; // no one is listening for this event

    // create one WebhookEvent record per config — each gets its own delivery
    // tracking, retry count, and status
    await Promise.all(
      configs.map((config) =>
        this.webhooksRepository.createEvent({
          apiKeyId,
          webhookConfigId: config.id,
          eventType,
          payload,
        }),
      ),
    );
  }
}