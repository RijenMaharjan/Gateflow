import { Controller, All, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';

@Controller('gateway/:projectSlug')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  // @All catches every HTTP method — GET, POST, PUT, PATCH, DELETE, OPTIONS
  // * is a wildcard that captures the rest of the path after the projectSlug
  // e.g. GET /gateway/my-project/users/1/orders → path = "users/1/orders"
  @All('*')
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Param('projectSlug') projectSlug: string,
    @Param('0') path: string,  // '0' captures the wildcard path
  ) {
    return this.gatewayService.handleRequest(req, res, path);
  }
}