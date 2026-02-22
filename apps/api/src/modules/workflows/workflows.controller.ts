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
  Req,
  Sse,
  UseGuards
} from '@nestjs/common';
import { concat, map, Observable, of, takeWhile } from 'rxjs';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../auth/guards/workspace-access.guard';
import { WorkflowQueueService } from './workflow-queue.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
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

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.workflowsService.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
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
