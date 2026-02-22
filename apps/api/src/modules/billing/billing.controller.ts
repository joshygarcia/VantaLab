import { Body, Controller, Get, Headers, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { BillingService } from './billing.service';

@Controller('api/v1/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Req() request: AuthenticatedRequest) {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.billingService.getBalance(userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limitRaw?: string
  ) {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    const parsed = Number.parseInt(limitRaw ?? '', 10);
    const limit = Number.isFinite(parsed) ? parsed : 50;

    return this.billingService.listTransactions(userId, limit);
  }

  @Post('payment-intents')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Body() payload: CreatePaymentIntentDto,
    @Req() request: AuthenticatedRequest
  ) {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.billingService.createPaymentIntent(payload.packageId, userId);
  }

  @Post('stripe/webhook')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(JSON.stringify(request.body ?? {}));

    return this.billingService.handleStripeWebhook(signature, rawBody);
  }
}
