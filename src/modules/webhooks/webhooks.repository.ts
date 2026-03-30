import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookEventStatus } from '@prisma/client';
import { WebhookEventType } from './dto/create-webhook-config.dto';

@Injectable()
export class WebhooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Webhook Config (user-defined endpoints) ─────────────────────────────

  async createConfig(data: {
    projectId: string;
    url: string;
    secret: string;
    events: string[];
  }) {
    return this.prisma.webhookConfig.create({ data });
  }

  async findConfigsByProject(projectId: string) {
    return this.prisma.webhookConfig.findMany({
      where: { projectId },
      // never return the signing secret to the API response
      // it was shown once at creation and should not be retrievable
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findConfigById(id: string, projectId: string) {
    return this.prisma.webhookConfig.findFirst({
      where: { id, projectId },
    });
  }

  async updateConfigStatus(id: string, isActive: boolean) {
    return this.prisma.webhookConfig.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteConfig(id: string) {
    return this.prisma.webhookConfig.delete({ where: { id } });
  }

  // ─── Webhook Events (delivery records) ───────────────────────────────────

  // find all active configs for a project that are subscribed to a specific event type
  // called by the gateway when it needs to fire a webhook
  async findActiveConfigsForEvent(projectId: string, eventType: WebhookEventType) {
    return this.prisma.webhookConfig.findMany({
      where: {
        projectId,
        isActive: true,
        // check if the events array contains the event type
        // Prisma's 'has' filter maps to the PostgreSQL @> array operator
        events: { has: eventType },
      },
    });
  }

  async createEvent(data: {
    apiKeyId: string;
    webhookConfigId: string;
    eventType: string;
    payload: object;
  }) {
    return this.prisma.webhookEvent.create({ data });
  }

  // worker calls this to fetch events that need to be delivered
  // only fetches PENDING events with fewer than 3 attempts
  async findPendingEvents() {
    return this.prisma.webhookEvent.findMany({
      where: {
        status: 'PENDING',
        attempts: { lt: 3 }, // lt = less than
      },
      include: {
        webhookConfig: true, // worker needs the URL and secret to deliver
      },
      // process oldest events first — FIFO order
      orderBy: { createdAt: 'asc' },
      take: 50, // process at most 50 events per poll cycle
    });
  }

  async markDelivered(id: string) {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: { status: WebhookEventStatus.DELIVERED, attempts: { increment: 1 } },
    });
  }

  async markFailed(id: string) {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: { status: WebhookEventStatus.FAILED, attempts: { increment: 1 } },
    });
  }

  async incrementAttempts(id: string) {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async findEventsByProject(projectId: string) {
    return this.prisma.webhookEvent.findMany({
      where: { webhookConfig: { projectId } },
      select: {
        id: true,
        eventType: true,
        status: true,
        attempts: true,
        createdAt: true,
        updatedAt: true,
        webhookConfig: {
          select: { url: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}