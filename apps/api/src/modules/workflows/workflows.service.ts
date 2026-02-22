import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { WorkflowQueueService } from './workflow-queue.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowQueue: WorkflowQueueService
  ) { }

  async execute(payload: ExecuteWorkflowDto, idempotencyKey: string | undefined, userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    const requestFingerprint = JSON.stringify(payload);

    if (idempotencyKey) {
      const existing = await this.prisma.workflowJob.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.requestFingerprint && existing.requestFingerprint !== requestFingerprint) {
          throw new ConflictException('Idempotency key was already used with a different payload.');
        }

        return {
          status: existing.status,
          jobId: existing.id,
          message: 'Generation already queued.'
        };
      }
    }

    const jobId = `job_${randomUUID()}`;

    await this.prisma.workflowJob.create({
      data: {
        id: jobId,
        userId,
        workspaceId: payload.workspaceId,
        nodeId: payload.nodeId,
        model: payload.model,
        prompt: payload.parameters.prompt,
        parameters: JSON.stringify(payload.parameters),
        status: 'queued',
        idempotencyKey,
        requestFingerprint
      }
    });

    await this.workflowQueue.enqueue(jobId);

    return {
      status: 'processing',
      jobId,
      message: 'Generation queued. Awaiting asynchronous resolution.'
    };
  }

  async getJob(jobId: string) {
    return this.prisma.workflowJob.findUnique({ where: { id: jobId } });
  }
}
