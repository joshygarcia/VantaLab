import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthClaims } from '../auth.types';

const DEFAULT_WORKSPACE_ID = 'local';

type AuthenticatedUser = {
  id: string;
  sub?: string;
  workspaceIds: string[];
  email?: string | null;
  role?: string;
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

  constructor(private readonly jwtService: JwtService) {
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
      request.user = {
        id: localClaims.sub,
        sub: localClaims.sub,
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
      request.user = {
        id: user.id,
        sub: user.id,
        workspaceIds,
        email: user.email ?? null
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
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
