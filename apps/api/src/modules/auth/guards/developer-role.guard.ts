import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class DeveloperRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    if (request.user.role !== 'developer') {
      throw new ForbiddenException('Developer role required');
    }

    return true;
  }
}
