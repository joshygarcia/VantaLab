import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApiKey, Prisma } from '@prisma/client';

@Injectable()
export class ApiKeysService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
        return this.prisma.apiKey.create({ data });
    }

    async findAll(): Promise<ApiKey[]> {
        return this.prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async setStatus(id: string, isActive: boolean): Promise<ApiKey> {
        return this.prisma.apiKey.update({
            where: { id },
            data: { isActive },
        });
    }

    async delete(id: string): Promise<ApiKey> {
        return this.prisma.apiKey.delete({ where: { id } });
    }

    /**
     * Simple Round-Robin / Least Used logic for Load Balancing.
     */
    async getNextAvailableKey(): Promise<ApiKey> {
        const key = await this.prisma.apiKey.findFirst({
            where: { isActive: true },
            orderBy: { lastUsedAt: 'asc' }, // Selects the one used longest ago or null
        });

        if (!key) {
            throw new Error('No active API keys found.');
        }

        return key;
    }

    /**
     * Log usage against a key.
     */
    async logUsage(apiKeyId: string, endpoint: string, costInCents: number = 0, status: number = 200) {
        // 1. Log the transaction
        await this.prisma.apiUsageLog.create({
            data: {
                apiKeyId,
                endpoint,
                costInCents,
                status,
            },
        });

        // 2. Update the key's lastUsedAt and usageCount
        await this.prisma.apiKey.update({
            where: { id: apiKeyId },
            data: {
                lastUsedAt: new Date(),
                usageCount: { increment: 1 },
            },
        });
    }
}
