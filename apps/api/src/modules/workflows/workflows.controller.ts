import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { concat, map, Observable, of, takeWhile } from 'rxjs';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../auth/guards/workspace-access.guard';
import { WorkflowQueueService } from './workflow-queue.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { ExecuteCharacterWorkflowDto } from './dto/execute-character-workflow.dto';
import { WorkflowsService } from './workflows.service';

@Controller('api/v1/workflows')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly workflowQueueService: WorkflowQueueService
  ) {}

  @Post('execute')
  @HttpCode(202)
  async execute(
    @Body() payload: ExecuteWorkflowDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return await this.workflowsService.execute(payload, idempotencyKey, request.user?.id);
  }

  @Post('execute-character')
  @HttpCode(202)
  async executeCharacter(
    @Body() payload: ExecuteCharacterWorkflowDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return await this.workflowsService.executeCharacter(payload, idempotencyKey, request.user?.id);
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.workflowsService.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  @Get('history')
  async getHistory(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limitRaw?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('model') model?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const parsedLimit = typeof limitRaw === 'string' ? Number(limitRaw) : NaN;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 100;

    return this.workflowsService.getUserGenerationHistory(userId, {
      limit,
      workspaceId: typeof workspaceId === 'string' && workspaceId.trim().length > 0 ? workspaceId.trim() : undefined,
      model: typeof model === 'string' && model.trim().length > 0 ? model.trim() : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined
    });
  }

  @Sse('jobs/:jobId/events')
  async streamJob(@Param('jobId') jobId: string): Promise<Observable<MessageEvent>> {
    const job = await this.workflowsService.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const initialEvent: MessageEvent = { data: job };
    if (job.status === 'succeeded' || job.status === 'failed') {
      return of(initialEvent);
    }

    return concat(
      of(initialEvent),
      this.workflowQueueService.jobUpdates(jobId).pipe(
        map((update): MessageEvent => ({ data: update })),
        takeWhile((event) => {
          const status = (event.data as { status?: string }).status;
          return status !== 'succeeded' && status !== 'failed';
        }, true)
      )
    );
  }
}
