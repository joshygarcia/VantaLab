import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { WorkflowQueueService } from './workflow-queue.service';
import { calculateWorkflowCreditCost } from './workflow-credit-cost';
import { Prisma } from '@prisma/client';

type GenerationHistoryFilters = {
  limit: number;
  workspaceId?: string;
  model?: string;
  startDate?: string;
  endDate?: string;
};

@Injectable()
export class WorkflowsService {
  private readonly historyRetentionDays = 14;

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
    const estimatedCreditCost = calculateWorkflowCreditCost(payload.model, payload.parameters);

    await this.createJobWithCreditGuard({
      jobId,
      userId,
      payload,
      idempotencyKey,
      requestFingerprint,
      estimatedCreditCost
    });

    await this.workflowQueue.enqueue(jobId);

    return {
      status: 'processing',
      jobId,
      message: 'Generation queued. Awaiting asynchronous resolution.',
      estimatedCreditCost
    };
  }

  async getJob(jobId: string) {
    return this.prisma.workflowJob.findUnique({ where: { id: jobId } });
  }

  async getUserGenerationHistory(userId: string, filters: GenerationHistoryFilters) {
    await this.pruneExpiredUserJobs(userId);

    const effectiveLimit = Number.isFinite(filters.limit)
      ? Math.max(1, Math.min(200, Math.trunc(filters.limit)))
      : 100;

    const cutoff = this.getHistoryCutoffDate();
    const normalizedStartDate = this.parseDateFilter(filters.startDate, 'startDate', 'start');
    const normalizedEndDate = this.parseDateFilter(filters.endDate, 'endDate', 'end');

    if (normalizedStartDate && normalizedEndDate && normalizedStartDate > normalizedEndDate) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    const gteDate = normalizedStartDate && normalizedStartDate > cutoff ? normalizedStartDate : cutoff;
    const lteDate = normalizedEndDate;

    const jobs = await this.prisma.workflowJob.findMany({
      where: {
        userId,
        createdAt: {
          gte: gteDate,
          ...(lteDate ? { lte: lteDate } : {})
        },
        status: 'succeeded',
        mediaUrl: {
          not: null
        },
        ...(filters.workspaceId
          ? { workspaceId: filters.workspaceId }
          : {}),
        ...(filters.model
          ? { model: filters.model }
          : {})
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: effectiveLimit,
      select: {
        id: true,
        workspaceId: true,
        model: true,
        prompt: true,
        mediaUrl: true,
        createdAt: true
      }
    });

    return {
      retentionDays: this.historyRetentionDays,
      items: jobs.map((job) => ({
        id: job.id,
        workspaceId: job.workspaceId,
        model: job.model,
        prompt: job.prompt,
        mediaUrl: job.mediaUrl,
        createdAt: job.createdAt.toISOString(),
        expiresAt: new Date(job.createdAt.getTime() + this.historyRetentionDays * 24 * 60 * 60 * 1000).toISOString()
      }))
    };
  }

  private getHistoryCutoffDate() {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - this.historyRetentionDays);
    return cutoff;
  }

  private parseDateFilter(value: string | undefined, fieldName: string, edge: 'start' | 'end') {
    if (!value || value.trim().length === 0) {
      return null;
    }

    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(`${fieldName} must be in YYYY-MM-DD format`);
    }

    const isoValue = edge === 'start'
      ? `${trimmed}T00:00:00.000Z`
      : `${trimmed}T23:59:59.999Z`;
    const parsed = new Date(isoValue);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} is invalid`);
    }

    return parsed;
  }

  private async pruneExpiredUserJobs(userId: string) {
    const cutoff = this.getHistoryCutoffDate();
    await this.prisma.workflowJob.deleteMany({
      where: {
        userId,
        createdAt: {
          lt: cutoff
        }
      }
    });
  }

  private safeParseParameters(rawParameters: string | null): Prisma.JsonObject {
    if (!rawParameters) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawParameters);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Prisma.JsonObject) : {};
    } catch {
      return {};
    }
  }

  private async createJobWithCreditGuard(input: {
    jobId: string;
    userId: string;
    payload: ExecuteWorkflowDto;
    idempotencyKey: string | undefined;
    requestFingerprint: string;
    estimatedCreditCost: number;
  }): Promise<void> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const [balance, pendingJobs] = await Promise.all([
              tx.userCreditBalance.findUnique({
                where: { userId: input.userId },
                select: { credits: true }
              }),
              tx.workflowJob.findMany({
                where: {
                  userId: input.userId,
                  status: {
                    in: ['queued', 'processing']
                  }
                },
                select: {
                  model: true,
                  parameters: true
                }
              })
            ]);

            const pendingCredits = pendingJobs.reduce((sum, job) => {
              const parsedParameters = this.safeParseParameters(job.parameters);
              return sum + calculateWorkflowCreditCost(job.model, parsedParameters);
            }, 0);
            const balanceCredits = balance?.credits ?? 0;
            const availableCredits = Math.max(0, balanceCredits - pendingCredits);

            if (input.estimatedCreditCost > availableCredits) {
              throw new BadRequestException(
                `Insufficient credits. This run requires ${input.estimatedCreditCost} credits, ` +
                `available is ${availableCredits} (balance: ${balanceCredits}, pending: ${pendingCredits}).`
              );
            }

            await tx.workflowJob.create({
              data: {
                id: input.jobId,
                userId: input.userId,
                workspaceId: input.payload.workspaceId,
                nodeId: input.payload.nodeId,
                model: input.payload.model,
                prompt: input.payload.parameters.prompt,
                parameters: JSON.stringify(input.payload.parameters),
                status: 'queued',
                idempotencyKey: input.idempotencyKey,
                requestFingerprint: input.requestFingerprint
              }
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
          }
        );
        return;
      } catch (error) {
        if (!this.isSerializationConflict(error) || attempt === maxRetries) {
          throw error;
        }
      }
    }
  }

  private isSerializationConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }
}
