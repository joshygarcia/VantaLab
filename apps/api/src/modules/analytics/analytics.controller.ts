import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('api/v1/admin/analytics')
export class AnalyticsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('kpi')
    async getKpis() {
        // 1. Total Workspaces (Proxy for Users currently)
        const totalUsers = await this.prisma.workspace.count();

        // 2. Active API Keys
        const activeApiKeys = await this.prisma.apiKey.count({
            where: { isActive: true },
        });

        // 3. API Metrics
        const usageLogs = await this.prisma.apiUsageLog.aggregate({
            _count: {
                id: true,
            },
            _sum: {
                costInCents: true,
            },
        });

        // 4. Workflow Success/Failure Breakdown
        const workflowStatsRaw = await this.prisma.workflowJob.groupBy({
            by: ['status'],
            _count: {
                id: true,
            },
        });

        const workflowStats = workflowStatsRaw.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalUsers,
            activeApiKeys,
            apiCalls: usageLogs._count.id || 0,
            apiCostInCents: usageLogs._sum.costInCents || 0,
            workflowStats,
            // Mock metrics for revenue/credits until billing is implemented
            creditPurchases: 1250,
            overallRevenueInCents: 50000,
        };
    }

    @Get('logs')
    async getLogs() {
        return this.prisma.workflowJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                model: true,
                prompt: true,
                status: true,
                error: true,
                createdAt: true,
            },
        });
    }
}
