import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbService } from '../database/db.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { ExecuteCharacterWorkflowDto } from './dto/execute-character-workflow.dto';
import { WorkflowQueueService } from './workflow-queue.service';
import { calculateWorkflowCreditCost } from './workflow-credit-cost';

type JsonObject = Record<string, unknown>;

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
    private readonly db: DbService,
    private readonly workflowQueue: WorkflowQueueService
  ) { }

  async execute(payload: ExecuteWorkflowDto, idempotencyKey: string | undefined, userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    const requestFingerprint = JSON.stringify(payload);

    if (idempotencyKey) {
      const existing = await this.db.workflowJob.findUnique({ where: { idempotencyKey } });
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

  async executeCharacter(payload: ExecuteCharacterWorkflowDto, idempotencyKey: string | undefined, userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    const workflowPayload: ExecuteWorkflowDto = {
      workspaceId: payload.workspaceId,
      nodeId: payload.nodeId,
      model: 'character-suite',
      parameters: {
        prompt: payload.customPrompt?.trim() || payload.characterName?.trim() || 'character-generation-request',
        characterName: payload.characterName,
        customPrompt: payload.customPrompt,
        characterImageModel: payload.imageModel ?? 'seedream-5',
        selections: payload.selections as Record<string, string>,
        aspectRatio: payload.aspectRatio ?? '9:16',
        resolution: payload.resolution ?? '2K',
        amount: 3
      }
    };

    return this.execute(workflowPayload, idempotencyKey, userId);
  }

  async getJob(jobId: string) {
    const job = await this.db.workflowJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return null;
    }

    let resultUrls: string[] | undefined;
    let textOutput: string | undefined;
    if (job.parameters) {
      try {
        const parsed = JSON.parse(job.parameters) as { generatedMediaUrls?: unknown; generatedText?: unknown };
        if (Array.isArray(parsed.generatedMediaUrls)) {
          resultUrls = parsed.generatedMediaUrls
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
            .slice(0, 4);
        }

        if (typeof parsed.generatedText === 'string' && parsed.generatedText.trim().length > 0) {
          textOutput = parsed.generatedText.trim();
        }
      } catch {
        resultUrls = undefined;
        textOutput = undefined;
      }
    }

    return {
      ...job,
      resultUrls,
      textOutput
    };
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

    const jobs = await this.db.workflowJob.findMany({
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
        parameters: true,
        createdAt: true
      }
    });

    return {
      retentionDays: this.historyRetentionDays,
      items: jobs.map((job) => {
        const generatedMediaUrls = this.extractGeneratedMediaUrls(job.parameters, job.mediaUrl);

        return {
          id: job.id,
          workspaceId: job.workspaceId,
          model: job.model,
          prompt: job.prompt,
          mediaUrl: job.mediaUrl,
          mediaUrls: generatedMediaUrls,
          createdAt: job.createdAt.toISOString(),
          expiresAt: new Date(job.createdAt.getTime() + this.historyRetentionDays * 24 * 60 * 60 * 1000).toISOString()
        };
      })
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
    await this.db.workflowJob.deleteMany({
      where: {
        userId,
        createdAt: {
          lt: cutoff
        }
      }
    });
  }

  private safeParseParameters(rawParameters: string | null): JsonObject {
    if (!rawParameters) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawParameters);
      return typeof parsed === 'object' && parsed !== null ? (parsed as JsonObject) : {};
    } catch {
      return {};
    }
  }

  private extractGeneratedMediaUrls(rawParameters: string | null, primaryMediaUrl: string | null): string[] {
    const parsedParameters = this.safeParseParameters(rawParameters);
    const rawGenerated = (parsedParameters as { generatedMediaUrls?: unknown }).generatedMediaUrls;

    const generated = Array.isArray(rawGenerated)
      ? rawGenerated.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [];

    const normalizedPrimary = typeof primaryMediaUrl === 'string' ? primaryMediaUrl.trim() : '';

    if (generated.length > 0) {
      return generated;
    }

    if (normalizedPrimary.length > 0) {
      return [normalizedPrimary];
    }

    return [];
  }

  private async createJobWithCreditGuard(input: {
    jobId: string;
    userId: string;
    payload: ExecuteWorkflowDto;
    idempotencyKey: string | undefined;
    requestFingerprint: string;
    estimatedCreditCost: number;
  }): Promise<void> {
    const [balance, pendingJobs] = await Promise.all([
      this.db.userCreditBalance.findUnique({ where: { userId: input.userId } }),
      this.db.workflowJob.findMany({
        where: {
          userId: input.userId,
          status: { in: ['queued', 'processing'] }
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

    await this.db.workflowJob.create({
      data: {
        id: input.jobId,
        userId: input.userId,
        workspaceId: input.payload.workspaceId,
        nodeId: input.payload.nodeId,
        model: input.payload.model,
        prompt: input.payload.parameters.prompt,
        parameters: JSON.stringify(input.payload.parameters),
        status: 'queued',
        idempotencyKey: input.idempotencyKey ?? null,
        requestFingerprint: input.requestFingerprint
      }
    });
  }
}
