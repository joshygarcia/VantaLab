import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { CreateDevTokenDto } from './dto/create-dev-token.dto';
import { AuthClaims } from './auth.types';
import { DEFAULT_DEV_WORKSPACE, JWT_EXPIRES_IN_SECONDS, JWT_SECRET } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async createDevToken(payload: CreateDevTokenDto) {
    const workspaceIds = payload.workspaceIds?.length ? payload.workspaceIds : [DEFAULT_DEV_WORKSPACE];

    const claims: AuthClaims = {
      sub: payload.userId ?? `dev-user-${randomUUID()}`,
      workspaceIds
    };

    const accessToken = await this.jwtService.signAsync(claims, {
      secret: JWT_SECRET,
      expiresIn: `${JWT_EXPIRES_IN_SECONDS}s`
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRES_IN_SECONDS,
      workspaceIds
    };
  }
}
