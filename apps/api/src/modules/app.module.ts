import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from './auth/guards/workspace-access.guard';
import { PrismaService } from './database/prisma.service';
import { WorkflowsController } from './workflows/workflows.controller';
import { WorkflowQueueService } from './workflows/workflow-queue.service';
import { WorkflowsService } from './workflows/workflows.service';
import { WorkspacesController } from './workspaces/workspaces.controller';
import { WorkspacesService } from './workspaces/workspaces.service';
import { ApiKeysController } from './api-keys/api-keys.controller';
import { ApiKeysService } from './api-keys/api-keys.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { HealthController } from './health/health.controller';
import { BillingController } from './billing/billing.controller';
import { BillingService } from './billing/billing.service';

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
    }]),
  ],
  controllers: [AuthController, WorkflowsController, WorkspacesController, ApiKeysController, AnalyticsController, HealthController, BillingController],
  providers: [
    AuthService,
    JwtAuthGuard,
    WorkspaceAccessGuard,
    PrismaService,
    WorkflowQueueService,
    WorkflowsService,
    WorkspacesService,
    ApiKeysService,
    BillingService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule { }
