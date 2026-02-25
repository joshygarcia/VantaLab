import { BadRequestException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { calculateWorkflowCreditCost } from './workflow-credit-cost';

type PrismaTransactionMock = {
  userCreditBalance: {
    findUnique: jest.Mock<Promise<{ credits: number } | null>, [unknown]>;
  };
  workflowJob: {
    findMany: jest.Mock<Promise<Array<{ model: string; parameters: string | null }>>, [unknown]>;
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
};

describe('WorkflowsService credit reservation', () => {
  const enqueue = jest.fn();
  const workflowJobFindUnique = jest.fn();
  const prismaTransaction = jest.fn();

  const prismaMock = {
    workflowJob: {
      findUnique: workflowJobFindUnique
    },
    $transaction: prismaTransaction
  };

  const queueMock = {
    enqueue
  };

  let service: WorkflowsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowsService(prismaMock as never, queueMock as never);
    workflowJobFindUnique.mockResolvedValue(null);
  });

  it('queues a job when available credits include pending reservation', async () => {
    const payload = {
      workspaceId: 'ws_1',
      nodeId: 'node_1',
      model: 'nano-banana-pro',
      parameters: {
        prompt: 'hero shot',
        resolution: '1K',
        aspectRatio: '1:1'
      }
    };

    const pendingParameters = { resolution: '1K', aspectRatio: '1:1' };
    const pendingCost = calculateWorkflowCreditCost('z-image', pendingParameters);
    const estimatedCost = calculateWorkflowCreditCost(payload.model, payload.parameters);
    const balanceCredits = pendingCost + estimatedCost;

    const tx: PrismaTransactionMock = {
      userCreditBalance: {
        findUnique: jest.fn().mockResolvedValue({ credits: balanceCredits })
      },
      workflowJob: {
        findMany: jest.fn().mockResolvedValue([
          {
            model: 'z-image',
            parameters: JSON.stringify(pendingParameters)
          }
        ]),
        create: jest.fn().mockResolvedValue({})
      }
    };

    prismaTransaction.mockImplementation(async (callback: (trx: PrismaTransactionMock) => Promise<void>) => {
      await callback(tx);
    });

    const result = await service.execute(payload, undefined, 'user_1');

    expect(tx.workflowJob.create).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('processing');
    expect(result.estimatedCreditCost).toBe(estimatedCost);
  });

  it('rejects queueing when pending credits reduce available balance below job cost', async () => {
    const payload = {
      workspaceId: 'ws_1',
      nodeId: 'node_1',
      model: 'nano-banana-pro',
      parameters: {
        prompt: 'hero shot',
        resolution: '1K',
        aspectRatio: '1:1'
      }
    };

    const pendingParameters = { resolution: '2K', aspectRatio: '16:9' };
    const pendingCost = calculateWorkflowCreditCost('nano-banana-pro', pendingParameters);
    const estimatedCost = calculateWorkflowCreditCost(payload.model, payload.parameters);
    const balanceCredits = pendingCost + estimatedCost - 1;

    const tx: PrismaTransactionMock = {
      userCreditBalance: {
        findUnique: jest.fn().mockResolvedValue({ credits: balanceCredits })
      },
      workflowJob: {
        findMany: jest.fn().mockResolvedValue([
          {
            model: 'nano-banana-pro',
            parameters: JSON.stringify(pendingParameters)
          }
        ]),
        create: jest.fn().mockResolvedValue({})
      }
    };

    prismaTransaction.mockImplementation(async (callback: (trx: PrismaTransactionMock) => Promise<void>) => {
      await callback(tx);
    });

    await expect(service.execute(payload, undefined, 'user_1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.workflowJob.create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });
});
