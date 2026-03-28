import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger/dist';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)  // all routes in this controller require a valid JWT
@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}
 
    @Post()
    create(@Req() req: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.id, dto);
    }

    @Get()
    findAll(@Req() req: AuthenticatedRequest) {
    return this.projectsService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, req.user.id, dto);
    }

    @Delete(':id')
    remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectsService.remove(id, req.user.id);
    }
}