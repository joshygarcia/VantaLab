import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthClaims } from '../auth.types';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_WORKSPACE_ID = 'local';

type AuthenticatedUser = {
  id: string;
  sub?: string;
  workspaceIds: string[];
  email?: string | null;
  role?: 'member' | 'developer';
};

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  method: string;
  body?: unknown;
  params?: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private supabase: SupabaseClient | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService
  ) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_JWT && token === process.env.NEXT_PUBLIC_DEV_JWT) {
      request.user = {
        id: 'dev-user',
        sub: 'dev-user',
        role: 'developer',
        workspaceIds: [DEFAULT_WORKSPACE_ID]
      };
      return true;
    }

    const localClaims = await this.tryVerifyLocalJwt(token);
    if (localClaims) {
      const role = await this.resolveUserRole(localClaims.sub);
      request.user = {
        id: localClaims.sub,
        sub: localClaims.sub,
        role,
        workspaceIds: this.normalizeWorkspaceIds(localClaims.workspaceIds)
      };
      return true;
    }

    if (!this.supabase) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      if (error || !user) {
        throw new UnauthorizedException('Invalid Supabase token');
      }

      const workspaceIds = this.normalizeWorkspaceIds((user.app_metadata as { workspaceIds?: unknown } | undefined)?.workspaceIds);
      const role = await this.resolveUserRole(user.id, user.email ?? null);
      request.user = {
        id: user.id,
        sub: user.id,
        workspaceIds,
        email: user.email ?? null,
        role
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private async resolveUserRole(userId: string, email?: string | null): Promise<'member' | 'developer'> {
    const existingById = await this.prismaService.userAccount.findUnique({
      where: { id: userId }
    });

    if (existingById) {
      if (email && existingById.email !== email) {
        const emailOwner = await this.prismaService.userAccount.findUnique({
          where: { email }
        });

        if (!emailOwner || emailOwner.id === userId) {
          await this.prismaService.userAccount.update({
            where: { id: userId },
            data: { email }
          });
        }
      }

      return existingById.role === 'DEVELOPER' ? 'developer' : 'member';
    }

    if (email) {
      const existingByEmail = await this.prismaService.userAccount.findUnique({
        where: { email }
      });

      if (existingByEmail) {
        await this.prismaService.userAccount.delete({
          where: { id: existingByEmail.id }
        });

        const migrated = await this.prismaService.userAccount.create({
          data: {
            id: userId,
            email,
            role: existingByEmail.role
          }
        });

        return migrated.role === 'DEVELOPER' ? 'developer' : 'member';
      }
    }

    const userAccount = await this.prismaService.userAccount.create({
      data: {
        id: userId,
        email: email ?? null
      }
    });

    return userAccount.role === 'DEVELOPER' ? 'developer' : 'member';
  }

  private async tryVerifyLocalJwt(token: string): Promise<AuthClaims | null> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }

    try {
      return await this.jwtService.verifyAsync<AuthClaims>(token, {
        secret: jwtSecret
      });
    } catch {
      return null;
    }
  }

  private normalizeWorkspaceIds(candidate: unknown): string[] {
    if (!Array.isArray(candidate)) {
      return [DEFAULT_WORKSPACE_ID];
    }

    const normalized = candidate
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    return normalized.length > 0 ? normalized : [DEFAULT_WORKSPACE_ID];
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const authorizationHeader = request.headers.authorization;
    const authorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;
    if (authorization) {
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    const tokenFromQuery = request.query.access_token;
    if (typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }

    return null;
  }
}
