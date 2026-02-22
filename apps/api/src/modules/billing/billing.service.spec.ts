import { BillingService } from './billing.service';

describe('BillingService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_123'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates payment intent with package metadata', async () => {
    const prisma = {
      $transaction: jest.fn()
    } as any;
    const service = new BillingService(prisma);

    const create = jest.fn(async () => ({
      id: 'pi_1',
      client_secret: 'cs_test_123'
    }));

    (service as any).stripe = {
      paymentIntents: {
        create
      }
    };

    const result = await service.createPaymentIntent('creator', 'user-1');

    expect(result.clientSecret).toBe('cs_test_123');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1000,
      metadata: {
        packageId: 'creator',
        userId: 'user-1',
        credits: '1000'
      }
    }));
  });

  it('rejects webhook requests without stripe signature', async () => {
    const prisma = {
      $transaction: jest.fn()
    } as any;
    const service = new BillingService(prisma);

    await expect(service.handleStripeWebhook(undefined, Buffer.from('{}')))
      .rejects
      .toThrow('Missing Stripe signature header');
  });

  it('credits user exactly once for a successful payment intent', async () => {
    const findUnique = jest.fn(async () => null);
    const upsert = jest.fn(async () => ({}));
    const create = jest.fn(async () => ({}));
    const tx = {
      creditTransaction: {
        findUnique,
        create
      },
      userCreditBalance: {
        upsert
      }
    };

    const prisma = {
      $transaction: jest.fn(async (callback: (trx: typeof tx) => Promise<void>) => callback(tx))
    } as any;

    const service = new BillingService(prisma);
    const constructEvent = jest.fn(() => ({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_success_1',
          amount_received: 1000,
          currency: 'usd',
          metadata: {
            userId: 'user-1',
            packageId: 'creator',
            credits: '1000'
          }
        }
      }
    }));

    (service as any).stripe = {
      webhooks: {
        constructEvent
      }
    } as any;

    await service.handleStripeWebhook('sig_123', Buffer.from('{}'));

    expect(findUnique).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: 'pi_success_1' }
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {
        credits: {
          increment: 1000
        }
      },
      create: {
        userId: 'user-1',
        credits: 1000
      }
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1',
        packageId: 'creator',
        stripePaymentIntentId: 'pi_success_1'
      })
    }));
  });

  it('does not add credits again for duplicate webhook retries', async () => {
    const findUnique = jest.fn(async () => ({ id: 'tx_1' }));
    const upsert = jest.fn(async () => ({}));
    const create = jest.fn(async () => ({}));
    const tx = {
      creditTransaction: {
        findUnique,
        create
      },
      userCreditBalance: {
        upsert
      }
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (trx: typeof tx) => Promise<void>) => callback(tx))
    } as any;

    const service = new BillingService(prisma);
    (service as any).stripe = {
      webhooks: {
        constructEvent: jest.fn(() => ({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_existing_1',
              amount_received: 1000,
              currency: 'usd',
              metadata: {
                userId: 'user-1',
                packageId: 'creator',
                credits: '1000'
              }
            }
          }
        }))
      }
    } as any;

    await service.handleStripeWebhook('sig_123', Buffer.from('{}'));

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('returns zero balance when user has no credit record', async () => {
    const prisma = {
      userCreditBalance: {
        findUnique: jest.fn(async () => null)
      }
    } as any;

    const service = new BillingService(prisma);

    await expect(service.getBalance('user-1')).resolves.toEqual({ credits: 0 });
  });

  it('returns billing transactions in descending order', async () => {
    const findMany = jest.fn(async () => ([
      {
        id: 'tx_2',
        userId: 'user-1',
        packageId: 'pro',
        credits: 5500,
        amountInCents: 5000,
        currency: 'usd',
        stripePaymentIntentId: 'pi_2',
        metadata: '{"packageId":"pro"}',
        processedAt: new Date('2026-02-22T10:00:00.000Z')
      }
    ]));
    const prisma = {
      creditTransaction: {
        findMany
      }
    } as any;

    const service = new BillingService(prisma);
    const result = await service.listTransactions('user-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { processedAt: 'desc' },
      take: 50
    });
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].id).toBe('tx_2');
  });
});
