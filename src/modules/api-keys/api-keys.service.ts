// src/modules/api-keys/api-keys.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ApiKeysRepository } from './api-keys.repository';
import { ProjectsService } from '../projects/projects.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateApiKeyDto) {
    // always verify project ownership before creating a key under it
    // projectsService.findOne throws NotFoundException if project doesn't
    // exist or doesn't belong to this user — no extra check needed here
    await this.projectsService.findOne(projectId, userId);

    const rawKey = this.generateRawKey();
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = this.extractPrefix(rawKey);

    await this.apiKeysRepository.create({
      projectId,
      name: dto.name,
      keyHash,
      keyPrefix,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    // this is the only moment the raw key exists in memory
    // after this function returns, it is gone forever — not in DB, not in logs
    return {
      rawKey,
      keyPrefix,
      message: 'Store this key securely. It will not be shown again.',
    };
  }

  async findAll(userId: string, projectId: string) {
    // ownership check — user can only list keys of their own projects
    await this.projectsService.findOne(projectId, userId);
    return this.apiKeysRepository.findAllByProject(projectId);
  }

  async findOne(userId: string, projectId: string, keyId: string) {
    await this.projectsService.findOne(projectId, userId);

    const key = await this.apiKeysRepository.findByIdAndProject(keyId, projectId);
    if (!key) throw new NotFoundException('API key not found');

    return key;
  }

  async revoke(userId: string, projectId: string, keyId: string) {
    // findOne handles both ownership check and existence check
    await this.findOne(userId, projectId, keyId);
    return this.apiKeysRepository.updateStatus(keyId, 'REVOKED');
  }

  async remove(userId: string, projectId: string, keyId: string) {
    await this.findOne(userId, projectId, keyId);
    return this.apiKeysRepository.delete(keyId);
  }

  // ─── Internal — called only by GatewayService ────────────────────────────
  // not exposed via any controller endpoint
  async validateRawKey(rawKey: string) {
    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.apiKeysRepository.findByKeyHash(keyHash);

    // use a generic error message for all failure cases — never tell the
    // caller whether the key exists but is revoked vs simply doesn't exist
    // leaking that distinction helps attackers enumerate valid keys
    if (!apiKey) {
      throw new ForbiddenException('Invalid API key');
    }

    if (apiKey.status === 'REVOKED') {
      throw new ForbiddenException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid API key');
    }

    // fire-and-forget — update lastUsedAt without blocking the gateway request
    // if this DB write fails it's not critical — the request still goes through
    this.apiKeysRepository.updateLastUsed(apiKey.id).catch(() => {});

    return apiKey;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private generateRawKey(): string {
    // randomBytes(32) generates 32 cryptographically secure random bytes
    // .toString('hex') converts to 64 character hex string
    // prefix "gw_live_" makes it identifiable and scannable
    // (GitHub, Stripe use the same prefix pattern for their tokens)
    const secret = randomBytes(32).toString('hex');
    return `gw_live_${secret}`;
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  private extractPrefix(rawKey: string): string {
    // "gw_live_abc123def456789..." → "gw_live_abc1..."
    // shows enough for the user to identify which key is which in the UI
    // without exposing enough to reconstruct the key
    return `${rawKey.substring(0, 15)}...`;
  }
}