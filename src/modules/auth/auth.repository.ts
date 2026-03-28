import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: any) {
    return this.prisma.user.create({ data });
  }

  updateRefreshToken(userId: string, token: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }
}