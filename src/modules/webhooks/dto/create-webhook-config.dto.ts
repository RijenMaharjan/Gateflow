import {
  IsUrl,
  IsArray,
  IsString,
  ArrayMinSize,
  IsIn,
} from 'class-validator';

// define all supported event types as a constant
// so the same list is used in validation and in the worker
export const WEBHOOK_EVENTS = [
  'quota.exceeded',   // fired when rate limit is hit
  'key.revoked',      // fired when an API key is revoked
  'key.expired',      // fired when an API key expires
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

export class CreateWebhookConfigDto {
  @IsUrl({ require_tld: false }) //  false allows localhost URLs for dev
  url!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(WEBHOOK_EVENTS, { each: true }) // each element must be a valid event type
  events!: WebhookEventType[];
}