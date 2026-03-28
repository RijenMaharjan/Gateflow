import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './projects.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],   
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, PrismaService],
  exports: [ProjectsService],  
})
export class ProjectsModule {}