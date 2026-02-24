import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeveloperRoleGuard } from '../auth/guards/developer-role.guard';

@Controller('api/v1/admin/analytics')
@UseGuards(JwtAuthGuard, DeveloperRoleGuard)
export class AnalyticsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('kpi')
    async getKpis() {
        const [
            totalUsers,
            activeApiKeys,
            usageLogs,
            workflowStatsRaw,
            billingTotals
        ] = await Promise.all([
            this.prisma.userAccount.count(),
            this.prisma.apiKey.count({
                where: { isActive: true },
            }),
            this.prisma.apiUsageLog.aggregate({
                _count: {
                    id: true,
                },
                _sum: {
                    costInCents: true,
                },
            }),
            this.prisma.workflowJob.groupBy({
                by: ['status'],
                _count: {
                    id: true,
                },
            }),
            this.prisma.creditTransaction.aggregate({
                _sum: {
                    credits: true,
                    amountInCents: true,
                },
            })
        ]);

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
            creditPurchases: billingTotals._sum.credits || 0,
            overallRevenueInCents: billingTotals._sum.amountInCents || 0,
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
