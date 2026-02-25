import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';
import { WorkflowQueueService } from './workflow-queue.service';
import { calculateWorkflowCreditCost } from './workflow-credit-cost';
import { Prisma } from '@prisma/client';

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
