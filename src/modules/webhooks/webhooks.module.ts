import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksWorker } from './webhooks.worker';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhooksRepository,
    WebhooksWorker,  // registered as a provider so NestJS manages its lifecycle
    PrismaService,
  ],
  exports: [WebhooksService], // exported so GatewayModule can call dispatchEvent()
})
export class WebhooksModule {}