import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

export interface JwtPayload{
  sub: string; //user id
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!, // guaranteed string
    });
  }

  async validate(payload: JwtPayload) {
    // this payload comes from decoded JWT
    const user = await this.usersService.findById(payload.sub);
    if(!user) throw new UnauthorizedException();
    return {id: user.id, email: user.email, role: user.role};
  }
}