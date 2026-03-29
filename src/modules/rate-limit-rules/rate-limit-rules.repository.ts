import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RateLimitStrategy } from "@prisma/client";

@Injectable()
export class RateLimitRulesRepository {
    constructor (private readonly prisma: PrismaService){}

    async create (data: {
        projectId: string;
        maxRequests: number;
        windowSeconds: number;
        strategy: RateLimitStrategy;
    }) {
        return this.prisma.rateLimitRule.create({ data });
    }

    async findByProject(projectId: string) {
    return this.prisma.rateLimitRule.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

    // the gateway calls this — needs the active rule for a project fast
    async findActiveByProject(projectId: string) {
        return this.prisma.rateLimitRule.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' }, // latest rule wins
        });
    }

    async findByIdAndProject(id: string, projectId: string) {
        return this.prisma.rateLimitRule.findFirst({
        where: { id, projectId },
        });
    }

    async update(
    id: string,
    data: {
      maxRequests?: number;
      windowSeconds?: number;
      strategy?: RateLimitStrategy;
    },
    ) {
        return this.prisma.rateLimitRule.update({ where: { id }, data });
    }

    async delete(id: string) {
        return this.prisma.rateLimitRule.delete({ where: { id } });
    }
}