import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthClaims } from '../auth.types';
import { DbService } from '../../database/db.service';
import { FirebaseService } from '../../firebase/firebase.service';

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
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DbService,
    private readonly firebase: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('Missing bearer token');

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
      if (this.shouldBypassLocalDevPersistence(localClaims.sub)) {
        request.user = {
          id: localClaims.sub,
          sub: localClaims.sub,
          role: 'developer',
          workspaceIds: this.normalizeWorkspaceIds(localClaims.workspaceIds)
        };
        return true;
      }

      const role = await this.resolveUserRole(localClaims.sub);
      request.user = {
        id: localClaims.sub,
        sub: localClaims.sub,
        role,
        workspaceIds: this.normalizeWorkspaceIds(localClaims.workspaceIds)
      };
      return true;
    }

    try {
      const decoded = await this.firebase.auth.verifyIdToken(token);
      const workspaceIds = this.normalizeWorkspaceIds((decoded as any).workspaceIds);
      const role = await this.resolveUserRole(decoded.uid, decoded.email ?? null);
      request.user = {
        id: decoded.uid,
        sub: decoded.uid,
        workspaceIds,
        email: decoded.email ?? null,
        role
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private async resolveUserRole(userId: string, email?: string | null): Promise<'member' | 'developer'> {
    const existing = await this.db.userAccount.findUnique({ where: { id: userId } });

    if (existing) {
      if (email && existing.email !== email) {
        const emailOwner = await this.db.userAccount.findUnique({ where: { email } });
        if (!emailOwner || emailOwner.id === userId) {
          await this.db.userAccount.update({ where: { id: userId }, data: { email } });
        }
      }
      return existing.role === 'DEVELOPER' ? 'developer' : 'member';
    }

    if (email) {
      const existingByEmail = await this.db.userAccount.findUnique({ where: { email } });
      if (existingByEmail) {
        await this.db.userAccount.delete({ where: { id: existingByEmail.id } });
        const migrated = await this.db.userAccount.create({
          data: { id: userId, email, role: existingByEmail.role }
        });
        return migrated.role === 'DEVELOPER' ? 'developer' : 'member';
      }
    }

    const userAccount = await this.db.userAccount.create({
      data: { id: userId, email: email ?? null }
    });
    return userAccount.role === 'DEVELOPER' ? 'developer' : 'member';
  }

  private async tryVerifyLocalJwt(token: string): Promise<AuthClaims | null> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null;
    try {
      return await this.jwtService.verifyAsync<AuthClaims>(token, { secret: jwtSecret });
    } catch {
      return null;
    }
  }

  private normalizeWorkspaceIds(candidate: unknown): string[] {
    if (!Array.isArray(candidate)) return [DEFAULT_WORKSPACE_ID];
    const normalized = candidate
      .filter((e): e is string => typeof e === 'string')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    return normalized.length > 0 ? normalized : [DEFAULT_WORKSPACE_ID];
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const authorizationHeader = request.headers.authorization;
    const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
    if (authorization) {
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && token) return token;
    }
    const tokenFromQuery = request.query.access_token;
    if (typeof tokenFromQuery === 'string') return tokenFromQuery;
    return null;
  }

  private shouldBypassLocalDevPersistence(userId: string): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    const configuredDevUserId = process.env.DEV_AUTH_USER_ID?.trim() || 'dev-user';
    return userId === configuredDevUserId || userId.startsWith('dev-user-');
  }
}
