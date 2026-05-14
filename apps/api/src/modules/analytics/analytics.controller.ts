import { Controller, Get, UseGuards } from '@nestjs/common';
import { DbService } from '../database/db.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeveloperRoleGuard } from '../auth/guards/developer-role.guard';

@Controller('api/v1/admin/analytics')
@UseGuards(JwtAuthGuard, DeveloperRoleGuard)
export class AnalyticsController {
    constructor(private readonly db: DbService) { }

    @Get('kpi')
    async getKpis() {
        const [
            totalUsers,
            activeApiKeys,
            usageLogs,
            workflowStatsRaw,
            billingTotals
        ] = await Promise.all([
            this.db.userAccount.count(),
            this.db.apiKey.count({ where: { isActive: true } }),
            this.db.apiUsageLog.aggregate({
                _count: { id: true },
                _sum: { costInCents: true },
            }),
            this.db.workflowJob.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            this.db.creditTransaction.aggregate({
                _sum: { credits: true, amountInCents: true },
            })
        ]);

        const workflowStats = workflowStatsRaw.reduce<Record<string, number>>((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
        }, {});

        return {
            totalUsers,
            activeApiKeys,
            apiCalls: usageLogs._count.id || 0,
            apiCostInCents: usageLogs._sum.costInCents || 0,
            workflowStats,
            creditPurchases: billingTotals._sum.credits || 0,
            overallRevenueInCents: billingTotals._sum.amountInCents || 0,
        };
    }

    @Get('logs')
    async getLogs() {
        return this.db.workflowJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
}
