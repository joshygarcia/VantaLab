import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service';
import { CREDIT_PACKAGES, CreditPackage } from './billing.constants';

type StripeWebhookEvent = Stripe.Event;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2026-01-28.clover'
      });
    }
  }

  async createPaymentIntent(packageId: string, userId: string) {
    const creditPackage = this.getCreditPackage(packageId);
    const stripe = this.getStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.amountInCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        packageId: creditPackage.packageId,
        userId,
        credits: String(creditPackage.credits)
      }
    });

    if (!paymentIntent.client_secret) {
      throw new InternalServerErrorException('Stripe did not return a client secret.');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    let event: StripeWebhookEvent;
    try {
      const stripe = this.getStripeClient();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new InternalServerErrorException('Missing STRIPE_WEBHOOK_SECRET environment variable');
      }

      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown webhook signature verification error';
      this.logger.warn(`Stripe webhook verification failed: ${message}`);
      throw new BadRequestException(`Stripe webhook verification failed: ${message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.processSuccessfulPaymentIntent(event.data.object as Stripe.PaymentIntent);
    }

    return { received: true };
  }

  async getBalance(userId: string) {
    const balance = await this.prisma.userCreditBalance.findUnique({
      where: { userId },
      select: { credits: true }
    });

    return {
      credits: balance?.credits ?? 0
    };
  }

  async listTransactions(userId: string, limit = 50) {
    const take = Math.max(1, Math.min(limit, 200));
    const transactions = await this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { processedAt: 'desc' },
      take
    });

    return {
      transactions
    };
  }

  async hasSufficientCredits(userId: string, requiredCredits: number): Promise<boolean> {
    if (requiredCredits <= 0) {
      return true;
    }

    const balance = await this.prisma.userCreditBalance.findUnique({
      where: { userId },
      select: { credits: true }
    });

    return (balance?.credits ?? 0) >= requiredCredits;
  }

  async spendCreditsForWorkflow(
    userId: string,
    requiredCredits: number
  ): Promise<{ success: boolean; remainingCredits: number }> {
    if (requiredCredits <= 0) {
      const currentBalance = await this.getBalance(userId);
      return {
        success: true,
        remainingCredits: currentBalance.credits
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const decrementResult = await tx.userCreditBalance.updateMany({
        where: {
          userId,
          credits: {
            gte: requiredCredits
          }
        },
        data: {
          credits: {
            decrement: requiredCredits
          }
        }
      });

      if (decrementResult.count === 0) {
        const current = await tx.userCreditBalance.findUnique({
          where: { userId },
          select: { credits: true }
        });

        return {
          success: false,
          remainingCredits: current?.credits ?? 0
        };
      }

      const updated = await tx.userCreditBalance.findUnique({
        where: { userId },
        select: { credits: true }
      });

      return {
        success: true,
        remainingCredits: updated?.credits ?? 0
      };
    });
  }

  private getCreditPackage(packageId: string): CreditPackage {
    const creditPackage = CREDIT_PACKAGES[packageId];
    if (!creditPackage) {
      throw new BadRequestException('Invalid packageId');
    }
    return creditPackage;
  }

  private getStripeClient() {
    if (!this.stripe) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new InternalServerErrorException('Missing STRIPE_SECRET_KEY environment variable');
      }

      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2026-01-28.clover'
      });
    }

    return this.stripe;
  }

  private async processSuccessfulPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
    const userId = paymentIntent.metadata.userId;
    const packageId = paymentIntent.metadata.packageId;

    if (!userId || !packageId) {
      throw new BadRequestException('Payment intent metadata is missing userId or packageId');
    }

    const creditPackage = this.getCreditPackage(packageId);
    const metadataCredits = Number.parseInt(paymentIntent.metadata.credits ?? '', 10);
    const credits = Number.isInteger(metadataCredits) && metadataCredits > 0
      ? metadataCredits
      : creditPackage.credits;

    if (paymentIntent.amount_received !== creditPackage.amountInCents) {
      this.logger.warn(
        `Amount mismatch for ${paymentIntent.id}: expected ${creditPackage.amountInCents}, got ${paymentIntent.amount_received}`
      );
      throw new BadRequestException('Payment amount mismatch for package');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.creditTransaction.findUnique({
        where: { stripePaymentIntentId: paymentIntent.id }
      });

      if (existing) {
        return;
      }

      await tx.userCreditBalance.upsert({
        where: { userId },
        update: {
          credits: {
            increment: credits
          }
        },
        create: {
          userId,
          credits
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          packageId,
          credits,
          amountInCents: paymentIntent.amount_received,
          currency: paymentIntent.currency,
          stripePaymentIntentId: paymentIntent.id,
          metadata: JSON.stringify(paymentIntent.metadata)
        }
      });
    });
  }
}
