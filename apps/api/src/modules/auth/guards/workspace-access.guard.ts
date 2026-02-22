import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { WorkflowsService } from '../../workflows/workflows.service';
import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(private readonly workflowsService: WorkflowsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const allowedWorkspaceIds = request.user.workspaceIds;

    if (request.method === 'POST') {
      const workspaceId = this.getWorkspaceIdFromBody(request.body);
      if (!workspaceId || allowedWorkspaceIds.includes(workspaceId)) {
        return true;
      }

      throw new ForbiddenException('Token does not grant access to this workspace');
    }

    const jobId = request.params?.jobId;
    if (!jobId) {
      return true;
    }

    const job = await this.workflowsService.getJob(jobId);
    if (!job) {
      return true;
    }

    if (!allowedWorkspaceIds.includes(job.workspaceId)) {
      throw new ForbiddenException('Token does not grant access to this workspace');
    }

    return true;
  }

  private getWorkspaceIdFromBody(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const candidate = (body as { workspaceId?: unknown }).workspaceId;
    return typeof candidate === 'string' ? candidate : null;
  }
}
