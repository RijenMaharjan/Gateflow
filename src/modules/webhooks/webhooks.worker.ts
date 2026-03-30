import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createHmac } from 'crypto';
import axios from 'axios';
import { WebhooksRepository } from './webhooks.repository';

@Injectable()
export class WebhooksWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhooksWorker.name);
  private intervalId!: NodeJS.Timeout;

  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  onModuleInit() {
    // start polling when the NestJS app boots
    // poll every 5 seconds — balance between latency and DB load
    this.intervalId = setInterval(() => this.processPendingEvents(), 5000);
    this.logger.log('Webhook worker started — polling every 5 seconds');
  }

  onModuleDestroy() {
    // stop polling when the app shuts down — prevents orphaned intervals
    clearInterval(this.intervalId);
    this.logger.log('Webhook worker stopped');
  }

  private async processPendingEvents() {
    const events = await this.webhooksRepository.findPendingEvents();
    if (events.length === 0) return;

    this.logger.log(`Processing ${events.length} pending webhook events`);

    // process all pending events concurrently — Promise.allSettled
    // unlike Promise.all, allSettled never throws even if individual
    // deliveries fail — every event gets a chance to be processed
    await Promise.allSettled(
      events.map((event) => this.deliverEvent(event)),
    );
  }

  private async deliverEvent(event: any) {
    const { webhookConfig } = event;

    // build the payload that gets sent to the user's endpoint
    const payload = {
      id: event.id,
      eventType: event.eventType,
      timestamp: new Date().toISOString(),
      data: event.payload,
    };

    // sign the payload with HMAC-SHA256 using the webhook's secret
    // the user verifies this signature on their end to confirm the
    // request genuinely came from our gateway and wasn't tampered with
    const signature = this.signPayload(
      JSON.stringify(payload),
      webhookConfig.secret,
    );

    try {
      const response = await axios.post(webhookConfig.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          // X-Webhook-Signature is how Stripe, GitHub, etc. send signatures
          // users check req.headers['x-webhook-signature'] on their server
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event.eventType,
          'X-Webhook-Id': event.id,
        },
        timeout: 5000, // 5 second timeout — don't wait forever for slow endpoints
        validateStatus: (status) => status >= 200 && status < 300,
      });

      await this.webhooksRepository.markDelivered(event.id);
      this.logger.log(
        `Webhook delivered — event: ${event.eventType}, url: ${webhookConfig.url}`,
      );
    } catch (err: any) {
      const nextAttempts = event.attempts + 1;

      if (nextAttempts >= 3) {
        // max attempts reached — mark as permanently failed
        await this.webhooksRepository.markFailed(event.id);
        this.logger.warn(
          `Webhook permanently failed after 3 attempts — event: ${event.eventType}, url: ${webhookConfig.url}`,
        );
      } else {
        // still have attempts left — just increment, stay PENDING for next poll
        await this.webhooksRepository.incrementAttempts(event.id);
        this.logger.warn(
          `Webhook delivery failed (attempt ${nextAttempts}/3) — event: ${event.eventType}, url: ${webhookConfig.url}: ${err.message}`,
        );
      }
    }
  }

  private signPayload(payload: string, secret: string): string {
    // HMAC-SHA256: hash the payload using the secret as the key
    // this produces a signature only someone with the secret can reproduce
    // the user verifies: hmac(secret, receivedBody) === X-Webhook-Signature
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}