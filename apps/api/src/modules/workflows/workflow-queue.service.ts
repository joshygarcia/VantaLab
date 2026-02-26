import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, filter } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { BillingService } from '../billing/billing.service';
import { calculateWorkflowCreditCost } from './workflow-credit-cost';

type WorkflowQueuePayload = {
  workflowJobId: string;
};

type WorkflowJobUpdate = {
  id: string;
  status: 'processing' | 'succeeded' | 'failed';
  mediaUrl?: string | null;
  error?: string | null;
};

type StoredMultiPromptShot = {
  prompt?: string;
  duration?: number | string;
};

type StoredKlingElement = {
  name?: string;
  description?: string;
  elementInputUrls?: string[];
  elementInputVideoUrls?: string[];
};

type StoredWorkflowParameters = {
  prompt?: string;
  referenceImageUrl?: string;
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: 'png' | 'jpg';
  amount?: number;
  duration?: string;
  mode?: 'std' | 'pro';
  sound?: boolean;
  multiShots?: boolean;
  multiPrompt?: StoredMultiPromptShot[];
  klingElements?: StoredKlingElement[];
};

type KieUploadResponse = {
  success?: boolean;
  code?: number;
  msg?: string;
  data?: {
    fileUrl?: string;
    downloadUrl?: string;
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class WorkflowQueueService {
  private readonly logger = new Logger(WorkflowQueueService.name);
  private readonly updates$ = new Subject<WorkflowJobUpdate>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeysService: ApiKeysService,
    private readonly billingService: BillingService
  ) { }

  async enqueue(workflowJobId: string) {
    // Fire and forget background processing instead of BullMQ queueing
    this.processJobInBackground({ workflowJobId }).catch(err => {
      this.logger.error(`Workflow job failed in background processor: ${workflowJobId}`, err.stack);
    });
  }

  jobUpdates(workflowJobId: string): Observable<WorkflowJobUpdate> {
    return this.updates$.pipe(filter((update) => update.id === workflowJobId));
  }

  private async pollVeoTask(taskId: string, apiKey: string): Promise<string> {
    const url = `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`;
    for (let attempt = 0; attempt < 120; attempt++) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`Veo polling failed: ${res.status}`);
      const result = await res.json();
      if (result.code === 200) {
        if (result.data.successFlag === 1) {
          const urls = JSON.parse(result.data.resultUrls || '[]');
          return urls[0];
        } else if (result.data.successFlag === 2 || result.data.successFlag === 3) {
          throw new Error(result.msg || 'Veo generation failed');
        }
      }
      await delay(5000);
    }
    throw new Error('Veo task polling timed out');
  }

  private async pollUnifiedTask(taskId: string, apiKey: string): Promise<string> {
    const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;
    for (let attempt = 0; attempt < 120; attempt++) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`Unified polling failed: ${res.status} - ${await res.text()}`);
      const result = await res.json();
      if (result.code === 200) {
        const state = result.data.state;
        if (state === 'success') {
          const results = JSON.parse(result.data.resultJson || '{}');
          return results.resultUrls?.[0] || '';
        } else if (state === 'fail') {
          throw new Error(result.data.failMsg || 'Kie task generation failed');
        }
      }
      await delay(5000);
    }
    throw new Error('Unified task polling timed out');
  }

  private async uploadReferenceImage(base64Data: string, apiKey: string): Promise<string> {
    const response = await fetch(
      `${process.env.KIE_FILE_UPLOAD_BASE_URL ?? 'https://kieai.redpandaai.co'}/api/file-base64-upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          base64Data,
          uploadPath: `persona/reference/${Date.now()}`
        })
      }
    );

    const payload = (await response.json()) as KieUploadResponse;
    if (!response.ok || (payload.code !== 200 && payload.success !== true)) {
      throw new Error(payload.msg || 'Failed to upload reference image to Kie.ai');
    }

    const fileUrl = payload.data?.fileUrl ?? payload.data?.downloadUrl;
    if (!fileUrl) {
      throw new Error('Reference image upload completed without file URL');
    }

    return fileUrl;
  }

  private async processJobInBackground(payload: WorkflowQueuePayload) {
    const existing = await this.prisma.workflowJob.findUnique({ where: { id: payload.workflowJobId } });
    if (!existing) {
      this.logger.warn(`Job not found: ${payload.workflowJobId}`);
      return;
    }

    try {
      await this.prisma.workflowJob.update({
        where: { id: payload.workflowJobId },
        data: {
          status: 'processing',
          error: null
        }
      });
      this.updates$.next({ id: payload.workflowJobId, status: 'processing', error: null });

      const workspace = await this.prisma.workspace.findUnique({
        where: { id: existing.workspaceId }
      });

      // Load Balancing: Get the next available active API key from the database 
      // instead of relying on a workspace-level or hardcoded key.
      const apiKeyRecord = await this.apiKeysService.getNextAvailableKey();
      const apiKey = apiKeyRecord.key;

      let mediaUrl = '';
      let params: StoredWorkflowParameters = {};
      if (existing.parameters) {
        try {
          params = JSON.parse(existing.parameters) as StoredWorkflowParameters;
        } catch (e) {
          this.logger.warn(`Failed to parse parameters for job ${existing.id}`, e);
        }
      }

      const promptText = params.prompt || existing.prompt || 'Cinematic default shot';
      let referenceImageUrl = params.referenceImageUrl;
      if (referenceImageUrl?.startsWith('data:image/')) {
        referenceImageUrl = await this.uploadReferenceImage(referenceImageUrl, apiKey);
      }

      let taskId = '';

      // Check if it's Veo 3.1
      if (existing.model === 'veo-3.1' || existing.model === 'veo3_fast' || existing.model === 'veo3') {
        const veoInput: Record<string, unknown> = {
          model: 'veo3_fast', // Using fast for dev iterating speed
          prompt: promptText,
          aspect_ratio: params.aspectRatio || '16:9'
        };

        if (referenceImageUrl) {
          veoInput.imageUrls = [referenceImageUrl];
        }

        const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(veoInput)
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Kie.ai Veo API error: ${response.status} - ${errBody}`);
        }
        const data = await response.json();
        if (data.code !== 200) throw new Error(`Veo API error: ${data.msg}`);

        taskId = data.data.taskId;
        mediaUrl = await this.pollVeoTask(taskId, apiKey);

        // Log Usage
        await this.apiKeysService.logUsage(apiKeyRecord.id, 'veo/generate', 25, 200);

      } else {
        // Unified Market Models
        let targetedModel = existing.model;
        if (targetedModel === 'google-nano' || targetedModel === 'nano-banana') {
          targetedModel = 'nano-banana-pro';
        }

        const requestBody: any = {
          model: targetedModel,
          input: {
            prompt: promptText,
            aspect_ratio: params.aspectRatio || '16:9'
          }
        };

        if (params.resolution) {
          requestBody.input.resolution = params.resolution;
        }

        if (targetedModel === 'nano-banana-pro' && params.outputFormat) {
          requestBody.input.output_format = params.outputFormat;
        }

        if (referenceImageUrl) {
          if (targetedModel === 'nano-banana-pro') {
            requestBody.input.image_input = [referenceImageUrl];
          }

          if (targetedModel === 'kling-3.0/video') {
            requestBody.input.image_urls = [referenceImageUrl];
          }
        }

        if (targetedModel === 'kling-3.0/video') {
          requestBody.input.duration = params.duration || '5';
          requestBody.input.mode = params.mode || 'pro';
          const multiShotsEnabled = params.multiShots ?? false;
          requestBody.input.multi_shots = multiShotsEnabled;
          requestBody.input.sound = multiShotsEnabled ? true : (params.sound ?? false);

          const normalizedKlingElements = (params.klingElements || [])
            .map((element) => {
              const name = typeof element.name === 'string' ? element.name.trim() : '';
              if (!name) {
                return null;
              }

              const description = typeof element.description === 'string'
                ? element.description.trim()
                : undefined;

              const imageUrls = Array.isArray(element.elementInputUrls)
                ? element.elementInputUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 4)
                : [];

              const videoUrls = Array.isArray(element.elementInputVideoUrls)
                ? element.elementInputVideoUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 1)
                : [];

              if (imageUrls.length >= 2) {
                return {
                  name,
                  description,
                  element_input_urls: imageUrls
                };
              }

              if (videoUrls.length === 1) {
                return {
                  name,
                  description,
                  element_input_video_urls: videoUrls
                };
              }

              return null;
            })
            .filter((element) => element !== null);

          if (normalizedKlingElements.length > 0) {
            requestBody.input.kling_elements = normalizedKlingElements;
          }

          if (multiShotsEnabled) {
            const normalizedMultiPrompt = (params.multiPrompt || [])
              .map((shot) => {
                const prompt = typeof shot.prompt === 'string' ? shot.prompt.trim() : '';
                if (!prompt) {
                  return null;
                }

                const shotDuration = Number(shot.duration);
                const duration = Number.isFinite(shotDuration)
                  ? Math.min(15, Math.max(1, Math.round(shotDuration)))
                  : 3;

                return { prompt, duration };
              })
              .filter((shot): shot is { prompt: string; duration: number } => shot !== null);

            const boundedMultiPrompt: Array<{ prompt: string; duration: number }> = [];
            let remainingDuration = 15;
            for (const shot of normalizedMultiPrompt) {
              if (remainingDuration <= 0) {
                break;
              }

              const boundedDuration = Math.min(remainingDuration, shot.duration);
              if (boundedDuration <= 0) {
                continue;
              }

              boundedMultiPrompt.push({
                prompt: shot.prompt,
                duration: boundedDuration
              });
              remainingDuration -= boundedDuration;
            }

            if (boundedMultiPrompt.length > 0) {
              requestBody.input.multi_prompt = boundedMultiPrompt;
            } else {
              const fallbackDuration = Number.parseInt(params.duration || '5', 10);
              requestBody.input.multi_prompt = [{
                prompt: promptText,
                duration: Math.min(15, Math.max(1, Number.isFinite(fallbackDuration) ? fallbackDuration : 5))
              }];
            }
          }

          // When first-frame image is provided, Kling auto-adapts aspect ratio.
          if (referenceImageUrl) {
            delete requestBody.input.aspect_ratio;
          }
        }

        const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Kie.ai Jobs API error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        if (data.code !== 200) throw new Error(`Jobs API error: ${data.msg}`);

        taskId = data.data.taskId;
        mediaUrl = await this.pollUnifiedTask(taskId, apiKey);

        // Log Usage (Mock cost logic based on model)
        const mockCost = existing.model.includes('pro') ? 10 : 2;
        await this.apiKeysService.logUsage(apiKeyRecord.id, `jobs/createTask/${existing.model}`, mockCost, 200);
      }

      if (!mediaUrl) {
        throw new Error('No media URL returned from Kie.ai API polling');
      }

      const workflowCreditCost = calculateWorkflowCreditCost(existing.model, params);
      const spendResult = await this.billingService.spendCreditsForWorkflow(existing.userId, workflowCreditCost);
      if (!spendResult.success) {
        throw new Error(
          `Insufficient credits. This run requires ${workflowCreditCost} credits (balance: ${spendResult.remainingCredits}).`
        );
      }

      await this.prisma.workflowJob.update({
        where: { id: payload.workflowJobId },
        data: {
          status: 'succeeded',
          mediaUrl,
          error: null
        }
      });
      this.updates$.next({
        id: payload.workflowJobId,
        status: 'succeeded',
        mediaUrl,
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';

      // Attempt to update database with failure state
      try {
        await this.prisma.workflowJob.update({
          where: { id: payload.workflowJobId },
          data: {
            status: 'failed',
            error: message
          }
        });
        this.updates$.next({ id: payload.workflowJobId, status: 'failed', error: message });
      } catch (dbError) {
        this.logger.error(`Failed to update job status to failed: ${payload.workflowJobId}`, dbError);
      }

      throw error;
    }
  }
}
