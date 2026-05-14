import { Injectable } from '@nestjs/common';
import { DbService, ApiKey } from '../database/db.service';

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
    constructor(private readonly db: DbService) { }

    async create(data: { key: string; provider?: string; isActive?: boolean }): Promise<ApiKey> {
        return this.db.apiKey.create({ data });
    }

    async findAll(): Promise<ApiKeyWithRemainingCredits[]> {
        const keys = await this.db.apiKey.findMany({
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
        return this.db.apiKey.update({
            where: { id },
            data: { isActive },
        });
    }

    async delete(id: string): Promise<ApiKey> {
        return this.db.apiKey.delete({ where: { id } });
    }

    async getNextAvailableKey(): Promise<ApiKey> {
        const key = await this.db.apiKey.findFirst({
            where: { isActive: true },
            orderBy: { lastUsedAt: 'asc' },
        });

        if (!key) {
            throw new Error('No active API keys found.');
        }

        return key;
    }

    async logUsage(apiKeyId: string, endpoint: string, costInCents: number = 0, status: number = 200) {
        await this.db.apiUsageLog.create({
            data: { apiKeyId, endpoint, costInCents, status },
        });

        await this.db.apiKey.update({
            where: { id: apiKeyId },
            data: {
                lastUsedAt: new Date(),
                usageCount: { increment: 1 } as any,
            },
        });
    }

    private async getRemainingCreditsForKey(apiKey: string): Promise<number | null> {
        const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}` }
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
