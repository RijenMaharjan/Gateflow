// src/modules/api-keys/api-keys.module.ts
import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysRepository } from './api-keys.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    AuthModule,      // gives us JwtAuthGuard
    ProjectsModule,  // gives us ProjectsService for ownership checks
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeysRepository, PrismaService],
  // export ApiKeysService so GatewayModule can call validateRawKey()
  exports: [ApiKeysService],
})
export class ApiKeysModule {}