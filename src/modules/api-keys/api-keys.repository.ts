// src/modules/api-keys/api-keys.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyStatus } from '@prisma/client';

@Injectable()
export class ApiKeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    projectId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    expiresAt?: Date;
  }) {
    return this.prisma.apiKey.create({ data });
  }

  async findAllByProject(projectId: string) {
    // select explicitly excludes keyHash — the hash must never
    // leave the DB layer under any circumstance, even accidentally
    return this.prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndProject(id: string, projectId: string) {
    return this.prisma.apiKey.findFirst({
      where: { id, projectId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  // only used internally by gateway — the one place that legitimately needs the hash
  async findByKeyHash(keyHash: string) {
    return this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { project: true }, // gateway needs project.upstreamUrl and project.id
    });
  }

  async updateStatus(id: string, status: ApiKeyStatus) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { status },
    });
  }

  // called fire-and-forget by the gateway after every successful request
  async updateLastUsed(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async delete(id: string) {
    return this.prisma.apiKey.delete({ where: { id } });
  }
}