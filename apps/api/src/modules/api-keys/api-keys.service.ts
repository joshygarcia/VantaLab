import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApiKey, Prisma } from '@prisma/client';

type ApiKeyWithRemainingCredits = ApiKey & {
    remainingCredits: number | null;
    remainingCreditsError?: string | null;
};

type KieRemainingCreditsResponse = {
    code?: number;
    msg?: string;
    data?: number;
};

@Injectable()
export class ApiKeysService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
        return this.prisma.apiKey.create({ data });
    }

    async findAll(): Promise<ApiKeyWithRemainingCredits[]> {
        const keys = await this.prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' },
        });

        const keysWithCredits = await Promise.all(keys.map(async (key) => {
            try {
                const remainingCredits = await this.getRemainingCreditsForKey(key.key);
                return {
                    ...key,
                    remainingCredits,
                    remainingCreditsError: null
                };
            } catch (error) {
                return {
                    ...key,
                    remainingCredits: null,
                    remainingCreditsError: error instanceof Error ? error.message : 'Failed to fetch remaining credits'
                };
            }
        }));

        return keysWithCredits;
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

    private async getRemainingCreditsForKey(apiKey: string): Promise<number | null> {
        const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Kie credits API failed with status ${response.status}`);
        }

        const payload = (await response.json()) as KieRemainingCreditsResponse;
        if (payload.code !== 200) {
            throw new Error(payload.msg || `Kie credits API returned code ${payload.code ?? 'unknown'}`);
        }

        if (typeof payload.data !== 'number' || !Number.isFinite(payload.data)) {
            throw new Error('Kie credits API returned an invalid credits value');
        }

        return Math.max(0, Math.floor(payload.data));
    }
}
