import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateDevTokenDto } from './dto/create-dev-token.dto';
import { AuthClaims } from './auth.types';
import { DEFAULT_DEV_WORKSPACE, JWT_EXPIRES_IN_SECONDS, JWT_SECRET } from './auth.constants';

const DEFAULT_DEV_USER_ID = 'dev-user';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async createDevToken(payload: CreateDevTokenDto) {
    const workspaceIds = payload.workspaceIds?.length ? payload.workspaceIds : [DEFAULT_DEV_WORKSPACE];
    const stableDevUserId = process.env.DEV_AUTH_USER_ID?.trim() || DEFAULT_DEV_USER_ID;

    const claims: AuthClaims = {
      sub: payload.userId ?? stableDevUserId,
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
