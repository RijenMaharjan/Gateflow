// src/modules/api-keys/api-keys.controller.ts
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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

// nested route under projects — enforces the ownership hierarchy in the URL
// /projects/:projectId/api-keys clearly communicates "keys belong to a project"
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(req.user.id, projectId, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    return this.apiKeysService.findAll(req.user.id, projectId);
  }

  @Get(':keyId')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeysService.findOne(req.user.id, projectId, keyId);
  }

  // PATCH instead of DELETE for revoke — revoke is a state change, not a deletion
  // the key still exists in DB for audit purposes, it's just marked REVOKED
  @Patch(':keyId/revoke')
  revoke(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeysService.revoke(req.user.id, projectId, keyId);
  }

  @Delete(':keyId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeysService.remove(req.user.id, projectId, keyId);
  }
}