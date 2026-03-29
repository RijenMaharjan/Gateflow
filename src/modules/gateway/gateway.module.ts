import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { SlidingWindowStrategy } from './strategies/sliding-window.strategy';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { RateLimitRulesModule } from '../rate-limit-rules/rate-limit-rules.module';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [
    ApiKeysModule,        // for validateRawKey()
    RateLimitRulesModule, // for getActiveRuleForProject()
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    SlidingWindowStrategy,
    RedisService,
    PrismaService,
  ],
})
export class GatewayModule {}