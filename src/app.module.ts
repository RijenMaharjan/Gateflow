import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RateLimitRulesModule } from './modules/rate-limit-rules/rate-limit-rules.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    RateLimitRulesModule,
    GatewayModule,
    ApiKeysModule
  ],
})
export class AppModule {}