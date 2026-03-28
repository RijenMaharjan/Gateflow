import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersRepository } from './users.repository';

@Module({
    providers: [UsersService, UsersRepository ,PrismaService],
    exports: [UsersService],
})

export class UsersModule{}