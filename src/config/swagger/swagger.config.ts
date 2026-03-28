import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Nest Boilerplate')
  .setDescription('Enterprise NestJS Boilerplate')
  .setVersion('1.0')
  .addBearerAuth()
  .build();