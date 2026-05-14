import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, filter } from 'rxjs';
import { DbService } from '../database/db.service';
import { FirebaseService } from '../firebase/firebase.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { BillingService } from '../billing/billing.service';
import { calculateWorkflowCreditCost } from './workflow-credit-cost';
import { buildKieApiRequest } from './kie-request-builders';
import { isAgentModel } from './kie-model-catalog';

type WorkflowQueuePayload = {
  workflowJobId: string;
};

type WorkflowJobUpdate = {
  id: string;
  status: 'processing' | 'succeeded' | 'failed';
  mediaUrl?: string | null;
  resultUrls?: string[];
  textOutput?: string | null;
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
  characterName?: string;
  characterImageModel?: string;
  customPrompt?: string;
  selections?: Record<string, string>;
  generatedPromptSet?: GeminiPromptSet;
  generatedMediaUrls?: string[];
  generatedText?: string;
  referenceImageUrl?: string;
  referenceVideoUrl?: string;
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: 'png' | 'jpg';
  amount?: number;
  duration?: string;
  mode?: 'std' | 'pro' | '720p' | '1080p' | string;
  sound?: boolean;
  characterOrientation?: 'image' | 'video' | string;
  reasoningEffort?: 'low' | 'high' | string;
  promptTokens?: number;
  completionTokens?: number;
  multiShots?: boolean;
  multiPrompt?: StoredMultiPromptShot[];
  klingElements?: StoredKlingElement[];
};

type KieTaskDetailsResponse = {
  code?: number;
  msg?: string;
  data?: {
    state?: string;
    resultJson?: string;
    failMsg?: string;
  };
};

type GeminiPromptSet = {
  profilePicturePrompt: string;
  fullBodyPrompt: string;
  characterSheetPrompt: string;
};

type GeminiPromptCandidates = Record<string, unknown>;

type GeminiCompletionResponse = {
  code?: number;
  msg?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type KieChatCompletionResponse = {
  code?: number;
  msg?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type WorkflowExecutionResult = {
  mediaUrl?: string;
  resultUrls?: string[];
  textOutput?: string;
  parametersPatch?: Partial<StoredWorkflowParameters>;
  usageEndpoint?: string;
  usageCostInCents?: number;
};

type CharacterPromptKind = 'profile' | 'full-body' | 'sheet';
type CharacterImageModel = 'seedream-5' | 'nano-banana-2' | 'nano-banana-pro';

type CharacterOutputUploadContext = {
  workspaceId: string;
  userId: string;
  jobId: string;
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
    private readonly db: DbService,
    private readonly firebase: FirebaseService,
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
    const urls = await this.pollUnifiedTaskUrls(taskId, apiKey);
    return urls[0] ?? '';
  }

  private async pollUnifiedTaskUrls(taskId: string, apiKey: string): Promise<string[]> {
    const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;
    for (let attempt = 0; attempt < 120; attempt++) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`Unified polling failed: ${res.status} - ${await res.text()}`);
      const result = (await res.json()) as KieTaskDetailsResponse;
      if (result.code === 200) {
        const state = result.data?.state;
        if (state === 'success') {
          const parsedResult = this.safeJsonParse<{ resultUrls?: unknown }>(result.data?.resultJson ?? '{}');
          const resultUrls = Array.isArray(parsedResult.resultUrls)
            ? parsedResult.resultUrls
              .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
            : [];

          if (resultUrls.length > 0) {
            return resultUrls;
          }

          throw new Error('Task completed without media URLs');
        } else if (state === 'fail') {
          throw new Error(result.data?.failMsg || result.msg || 'Kie task generation failed');
        }
      }
      await delay(5000);
    }
    throw new Error('Unified task polling timed out');
  }

  private safeJsonParse<T>(raw: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error('Unable to parse API response payload');
    }
  }

  private toNonEmptyString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private humanizeSelectionKey(key: string): string {
    const normalized = key.trim();
    const labels: Record<string, string> = {
      gender: 'gender',
      ethnicity: 'ethnicity',
      ageRange: 'age range',
      eyeColor: 'eye color',
      hairStyle: 'hair style',
      skinCondition: 'skin condition',
      bodyType: 'body type',
      renderStyle: 'render style'
    };

    if (labels[normalized]) {
      return labels[normalized];
    }

    return normalized.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }

  private normalizeSelectionValue(key: string, value: string): string {
    const normalizedKey = key.trim();
    const normalizedValue = value.trim();

    if ((normalizedKey === 'ageRange' || normalizedKey === 'age_range') && /^adult$/i.test(normalizedValue)) {
      return 'young adult (around 20 years old)';
    }

    return normalizedValue;
  }

  private normalizeSelectionsForPromptInput(selections?: Record<string, string>): Record<string, string> {
    const entries = Object.entries(selections ?? {})
      .map(([key, value]) => {
        const cleanedValue = this.normalizeSelectionValue(key, this.toNonEmptyString(value));
        return [key, cleanedValue] as const;
      })
      .filter(([, value]) => value.length > 0);

    return Object.fromEntries(entries);
  }

  private isMeaningfulSelectionValue(key: string, value: string): boolean {
    const normalizedKey = key.trim();
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return false;
    }

    if ((normalizedKey === 'skinCondition' || normalizedKey === 'skin_condition') && /^none$/i.test(normalizedValue)) {
      return false;
    }

    return true;
  }

  private summarizeCharacterInputs(params: StoredWorkflowParameters): string {
    const normalizedSelections = this.normalizeSelectionsForPromptInput(params.selections);
    const characterName = this.toNonEmptyString(params.characterName);
    const customPrompt = this.toNonEmptyString(params.customPrompt);

    const gender = this.toNonEmptyString(normalizedSelections.gender);
    const ageRange = this.toNonEmptyString(normalizedSelections.ageRange);
    const ethnicity = this.toNonEmptyString(normalizedSelections.ethnicity);
    const eyeColor = this.toNonEmptyString(normalizedSelections.eyeColor);
    const hairStyle = this.toNonEmptyString(normalizedSelections.hairStyle);
    const skinCondition = this.toNonEmptyString(normalizedSelections.skinCondition);
    const bodyType = this.toNonEmptyString(normalizedSelections.bodyType);
    const renderStyle = this.toNonEmptyString(normalizedSelections.renderStyle);

    const identityCore = [gender, ageRange, 'character'].filter((part) => part.length > 0).join(' ');
    const traits: string[] = [];

    if (ethnicity) {
      traits.push(`${ethnicity} heritage`);
    }

    if (eyeColor) {
      traits.push(`${eyeColor} eyes`);
    }

    if (hairStyle) {
      traits.push(`${hairStyle} hairstyle`);
    }

    if (this.isMeaningfulSelectionValue('skinCondition', skinCondition)) {
      traits.push(`${skinCondition} skin detail`);
    }

    if (bodyType) {
      traits.push(`${bodyType} physique`);
    }

    if (renderStyle) {
      traits.push(`${renderStyle} visual style`);
    }

    const identity = traits.length > 0
      ? `${identityCore || 'character'} with ${traits.join(', ')}`
      : identityCore || 'character';

    const segments = [
      characterName ? `Name: ${characterName}` : '',
      `Identity: ${identity}`,
      customPrompt ? `Direction: ${customPrompt}` : ''
    ].filter((segment) => segment.length > 0);

    return segments.join('. ');
  }

  private cleanPromptText(prompt: string): string {
    return prompt.replace(/\s+/g, ' ').trim();
  }

  private composePrompt(...segments: string[]): string {
    const normalizedSegments = segments
      .map((segment) => this.cleanPromptText(segment).replace(/[.\s]+$/g, '').trim())
      .filter((segment) => segment.length > 0);

    if (normalizedSegments.length === 0) {
      return '';
    }

    return `${normalizedSegments.join('. ')}.`;
  }

  private normalizeCharacterImageModel(value: string | undefined): CharacterImageModel {
    if (value === 'nano-banana-2' || value === 'nano-banana-pro') {
      return value;
    }

    return 'seedream-5';
  }

  private sanitizeStoragePathSegment(value: string): string {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private getCharacterOutputPrefix(): string {
    return process.env.FIREBASE_CREATOR_LAB_PREFIX ?? 'creator-lab-assets';
  }

  private inferImageExtension(sourceUrl: string, contentType: string | null): string {
    const normalizedContentType = (contentType ?? '').split(';')[0].trim().toLowerCase();
    const extensionByMime: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif'
    };

    const fromMime = extensionByMime[normalizedContentType];
    if (fromMime) {
      return fromMime;
    }

    try {
      const pathname = new URL(sourceUrl).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
      if (match) {
        const fromPath = match[1].toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'].includes(fromPath)) {
          return fromPath === 'jpeg' ? 'jpg' : fromPath;
        }
      }
    } catch {
      // ignore URL parse failures and fallback to png
    }

    return 'png';
  }

  private async uploadGeneratedImageToFirebase(
    sourceUrl: string,
    context: CharacterOutputUploadContext,
    label: 'profile' | 'full-body' | 'sheet'
  ): Promise<string> {
    const sourceResponse = await fetch(sourceUrl);
    if (!sourceResponse.ok) {
      throw new Error(`Failed to download generated image: ${sourceResponse.status}`);
    }

    const imageBuffer = Buffer.from(await sourceResponse.arrayBuffer());
    if (imageBuffer.length === 0) {
      throw new Error('Generated image download was empty');
    }

    const extension = this.inferImageExtension(sourceUrl, sourceResponse.headers.get('content-type'));
    const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    const workspaceSegment = this.sanitizeStoragePathSegment(context.workspaceId) || 'workspace';
    const userSegment = this.sanitizeStoragePathSegment(context.userId) || 'user';
    const jobSegment = this.sanitizeStoragePathSegment(context.jobId) || Date.now().toString();
    const prefix = this.getCharacterOutputPrefix();
    const objectPath = `${prefix}/generated-characters/${workspaceSegment}/${userSegment}/${jobSegment}_${label}.${extension}`;

    const file = this.firebase.bucket.file(objectPath);
    await file.save(imageBuffer, {
      contentType,
      metadata: { cacheControl: 'public, max-age=31536000' },
      resumable: false,
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${this.firebase.bucket.name}/${objectPath}`;
  }

  private async uploadCharacterOutputsToStorage(
    outputUrls: [string, string, string],
    context: CharacterOutputUploadContext
  ): Promise<[string, string, string]> {
    const uploadedProfile = await this.uploadGeneratedImageToFirebase(outputUrls[0], context, 'profile');
    const uploadedFullBody = await this.uploadGeneratedImageToFirebase(outputUrls[1], context, 'full-body');
    const uploadedSheet = await this.uploadGeneratedImageToFirebase(outputUrls[2], context, 'sheet');

    return [uploadedProfile, uploadedFullBody, uploadedSheet];
  }

  private withQualityDirectives(prompt: string, kind: CharacterPromptKind, params: StoredWorkflowParameters): string {
    const cleaned = this.cleanPromptText(prompt);
    const identity = this.summarizeCharacterInputs(params);
    const includesIdentityAlready = /\b(subject identity|character identity|identity:|character named|name:)\b/i.test(cleaned);
    const identitySentence = includesIdentityAlready ? '' : `Character identity: ${identity}`;

    const shared =
      'high detail, coherent anatomy, realistic texture fidelity, cinematic lighting, flattering light sculpting, aesthetic color harmony, elegant styling, visually striking and beautiful character design, clean silhouette, no text, no watermark, no logo, no extra limbs';

    if (kind === 'profile') {
      return this.composePrompt(
        cleaned,
        identitySentence,
        'Head-and-shoulders portrait framing, eye-level camera, crisp facial detail, expressive eyes, polished skin and hair rendering, premium professional character portrait',
        shared
      );
    }

    if (kind === 'full-body') {
      return this.composePrompt(
        cleaned,
        identitySentence,
        'Same identity as the provided profile reference image, matching face shape, hairstyle, eye color, skin detail, and outfit motifs',
        'Full body visible from head to toe in one frame, graceful stance, appealing fashion silhouette, refined material rendering',
        shared
      );
    }

    return this.composePrompt(
      cleaned,
      identitySentence,
      'Same identity as the provided full-body reference image',
      'Character turnaround sheet with front, side, and back views plus one expressive portrait inset, consistent outfit details, neutral studio background, premium concept-sheet presentation',
      shared
    );
  }

  private finalizePromptSet(promptSet: GeminiPromptSet, params: StoredWorkflowParameters): GeminiPromptSet {
    return {
      profilePicturePrompt: this.withQualityDirectives(promptSet.profilePicturePrompt, 'profile', params),
      fullBodyPrompt: this.withQualityDirectives(promptSet.fullBodyPrompt, 'full-body', params),
      characterSheetPrompt: this.withQualityDirectives(promptSet.characterSheetPrompt, 'sheet', params)
    };
  }

  private buildFallbackCharacterPromptSet(params: StoredWorkflowParameters): GeminiPromptSet {
    return {
      profilePicturePrompt: 'Single-subject profile portrait with naturally beautiful, visually striking features, polished skin and hair rendering, subtle confident expression, soft key light with elegant rim light, premium cinematic portrait styling',
      fullBodyPrompt: 'Full-body hero character render with elegant proportions, fashion-forward silhouette, refined material detail, graceful posture, and cohesive palette that matches portrait identity',
      characterSheetPrompt: 'Character turnaround sheet with front, side, and back views, one expressive inset portrait, consistent outfit construction details, clean neutral studio backdrop, premium production design-board look'
    };
  }

  private getPromptFromCandidates(candidates: GeminiPromptCandidates, aliases: string[]): string {
    const nestedPrompts = typeof candidates.prompts === 'object' && candidates.prompts !== null
      ? (candidates.prompts as GeminiPromptCandidates)
      : null;

    for (const key of aliases) {
      const direct = this.toNonEmptyString(candidates[key]);
      if (direct) {
        return direct;
      }

      if (nestedPrompts) {
        const nested = this.toNonEmptyString(nestedPrompts[key]);
        if (nested) {
          return nested;
        }
      }
    }

    return '';
  }

  private extractPromptFromLabeledContent(content: string, label: string, stopLabels: string[]): string {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedStopLabels = stopLabels.map((entry) => entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const pattern = stopLabels.length > 0
      ? new RegExp(
        `${escapedLabel}\\s*:\\s*([\\s\\S]*?)(?=(?:${escapedStopLabels})\\s*:|$)`,
        'i'
      )
      : new RegExp(`${escapedLabel}\\s*:\\s*([\\s\\S]+)$`, 'i');

    const match = content.match(pattern);
    if (!match) {
      return '';
    }

    return this.cleanPromptText(match[1] ?? '');
  }

  private parseGeminiPromptSet(content: string, params: StoredWorkflowParameters): GeminiPromptSet {
    const fallback = this.buildFallbackCharacterPromptSet(params);
    const normalizedContent = content.startsWith('```')
      ? content.replace(/^```[a-zA-Z0-9]*\s*/, '').replace(/```$/, '').trim()
      : content;

    const profileFromLabels = this.extractPromptFromLabeledContent(
      normalizedContent,
      'PROFILE_PROMPT',
      ['FULL_BODY_PROMPT', 'CHARACTER_SHEET_PROMPT']
    );
    const fullBodyFromLabels = this.extractPromptFromLabeledContent(
      normalizedContent,
      'FULL_BODY_PROMPT',
      ['CHARACTER_SHEET_PROMPT']
    );
    const sheetFromLabels = this.extractPromptFromLabeledContent(
      normalizedContent,
      'CHARACTER_SHEET_PROMPT',
      []
    );

    if (profileFromLabels || fullBodyFromLabels || sheetFromLabels) {
      return this.finalizePromptSet(
        {
          profilePicturePrompt: profileFromLabels || fallback.profilePicturePrompt,
          fullBodyPrompt: fullBodyFromLabels || fallback.fullBodyPrompt,
          characterSheetPrompt: sheetFromLabels || fallback.characterSheetPrompt
        },
        params
      );
    }

    let parsed: GeminiPromptCandidates | null = null;

    try {
      parsed = this.safeJsonParse<GeminiPromptCandidates>(normalizedContent);
    } catch {
      const firstBrace = normalizedContent.indexOf('{');
      const lastBrace = normalizedContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = this.safeJsonParse<GeminiPromptCandidates>(normalizedContent.slice(firstBrace, lastBrace + 1));
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed) {
      this.logger.warn('Gemini response was not parseable JSON. Falling back to deterministic prompt set.');
      return this.finalizePromptSet(fallback, params);
    }

    const profilePicturePrompt = this.getPromptFromCandidates(parsed, [
      'profilePicturePrompt',
      'profile_picture_prompt',
      'profilePrompt',
      'portraitPrompt',
      'headshotPrompt',
      'profile'
    ]);

    const fullBodyPrompt = this.getPromptFromCandidates(parsed, [
      'fullBodyPrompt',
      'full_body_prompt',
      'fullBodyImagePrompt',
      'fullbodyPrompt',
      'bodyPrompt',
      'fullBody'
    ]);

    const characterSheetPrompt = this.getPromptFromCandidates(parsed, [
      'characterSheetPrompt',
      'character_sheet_prompt',
      'sheetPrompt',
      'turnaroundPrompt',
      'modelSheetPrompt',
      'characterSheet'
    ]);

    const resolvedProfile = profilePicturePrompt || fallback.profilePicturePrompt;
    const resolvedFullBody = fullBodyPrompt || `Full-body character render of the same person shown in the profile reference. ${resolvedProfile}`;
    const resolvedCharacterSheet = characterSheetPrompt || `Character sheet turnaround for the same person shown in the full-body reference. ${resolvedFullBody}`;

    return this.finalizePromptSet({
      profilePicturePrompt: resolvedProfile,
      fullBodyPrompt: resolvedFullBody,
      characterSheetPrompt: resolvedCharacterSheet
    }, params);
  }

  private async createUnifiedTask(requestBody: Record<string, unknown>, apiKey: string): Promise<string> {
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

    const data = (await response.json()) as { code?: number; msg?: string; data?: { taskId?: string } };
    if (data.code !== 200 || !data.data?.taskId) {
      throw new Error(`Jobs API error: ${data.msg || 'task id missing'}`);
    }

    return data.data.taskId;
  }

  private async executeChatCompletion(
    endpoint: string,
    body: Record<string, unknown>,
    apiKey: string
  ): Promise<WorkflowExecutionResult> {
    const response = await fetch(`https://api.kie.ai${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Kie.ai Chat API error: ${response.status} - ${errBody}`);
    }

    const payload = (await response.json()) as KieChatCompletionResponse;
    if (typeof payload.code === 'number' && payload.code !== 200) {
      throw new Error(payload.msg || payload.error?.message || 'Kie.ai chat completion failed');
    }

    const textOutput = payload.choices?.[0]?.message?.content?.trim();
    if (!textOutput) {
      throw new Error(payload.error?.message || 'Kie.ai chat completion returned empty content');
    }

    return {
      textOutput,
      parametersPatch: {
        generatedText: textOutput,
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens
      },
      usageEndpoint: endpoint.replace(/^\//, ''),
      usageCostInCents: 0
    };
  }

  private async executeStandardWorkflow(
    model: string,
    params: StoredWorkflowParameters,
    apiKey: string
  ): Promise<WorkflowExecutionResult> {
    const { endpoint, body } = buildKieApiRequest({
      model,
      parameters: {
        prompt: params.prompt ?? 'Cinematic default shot',
        referenceImageUrl: params.referenceImageUrl,
        referenceVideoUrl: params.referenceVideoUrl,
        aspectRatio: params.aspectRatio,
        duration: params.duration,
        mode: params.mode,
        outputFormat: params.outputFormat,
        resolution: params.resolution,
        sound: params.sound,
        characterOrientation: params.characterOrientation,
        reasoningEffort: params.reasoningEffort,
        multiShots: params.multiShots,
        multiPrompt: (params.multiPrompt ?? [])
          .map((shot) => {
            const prompt = typeof shot.prompt === 'string' ? shot.prompt.trim() : '';
            if (!prompt) {
              return null;
            }

            const duration = Number(shot.duration);
            return {
              prompt,
              duration: Number.isFinite(duration) ? Math.max(1, Math.round(duration)) : 1
            };
          })
          .filter((shot): shot is { prompt: string; duration: number } => shot !== null),
        klingElements: (params.klingElements ?? [])
          .map((element) => {
            const name = typeof element.name === 'string' ? element.name.trim() : '';
            if (!name) {
              return null;
            }

            return {
              name,
              description: typeof element.description === 'string' ? element.description.trim() : undefined,
              elementInputUrls: Array.isArray(element.elementInputUrls) ? element.elementInputUrls : undefined,
              elementInputVideoUrls: Array.isArray(element.elementInputVideoUrls) ? element.elementInputVideoUrls : undefined
            };
          })
          .filter((element): element is Exclude<typeof element, null> => element !== null)
      }
    });

    if (isAgentModel(model)) {
      return this.executeChatCompletion(endpoint, body, apiKey);
    }

    const taskId = await this.createUnifiedTask(body, apiKey);
    const resultUrls = await this.pollUnifiedTaskUrls(taskId, apiKey);
    const mediaUrl = resultUrls[0];

    if (!mediaUrl) {
      throw new Error('Task completed without media URLs');
    }

    return {
      mediaUrl,
      resultUrls,
      usageEndpoint: endpoint.replace(/^\//, ''),
      usageCostInCents: 0
    };
  }

  private async generateCharacterPromptsWithGemini(params: StoredWorkflowParameters, apiKey: string): Promise<GeminiPromptSet> {
    const payload = {
      characterName: (params.characterName ?? '').trim() || 'Untitled character',
      customPrompt: (params.customPrompt ?? '').trim(),
      selections: this.normalizeSelectionsForPromptInput(params.selections),
      objective: 'Create three related prompts for profile picture, full body image, and character sheet while preserving visual identity consistency.'
    };

    const response = await fetch('https://api.kie.ai/gemini-3-pro/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        stream: false,
        include_thoughts: false,
        reasoning_effort: 'low',
        messages: [
          {
            role: 'developer',
            content: [
              {
                type: 'text',
                text: 'You are an elite prompt engineer for character generation. Output exactly three labeled blocks and nothing else: PROFILE_PROMPT:, FULL_BODY_PROMPT:, CHARACTER_SHEET_PROMPT:. Each block must contain one strong production prompt between 70 and 140 words written in natural cinematic prose (not key:value lists). Keep one consistent identity across all prompts. Bias toward aesthetically beautiful and visually striking characters with elegant styling, flattering lighting, polished skin and hair rendering, and premium art direction while preserving selected traits and custom direction. PROFILE_PROMPT must be portrait framing. FULL_BODY_PROMPT must be full figure and reference-compatible with the profile output. CHARACTER_SHEET_PROMPT must be turnaround-sheet style and reference-compatible with full-body output only. No markdown, no JSON, no extra text.'
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: JSON.stringify(payload)
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini 3 Pro prompt generation failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GeminiCompletionResponse;
    if (typeof data.code === 'number' && data.code !== 200) {
      throw new Error(data.msg || 'Gemini 3 Pro request was rejected');
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      this.logger.warn(data.error?.message || 'Gemini 3 Pro returned empty prompt content. Using fallback prompts.');
      return this.buildFallbackCharacterPromptSet(params);
    }

    return this.parseGeminiPromptSet(content, params);
  }

  private async generateSeedreamTextToImage(prompt: string, apiKey: string, aspectRatio: string): Promise<string> {
    const taskId = await this.createUnifiedTask(
      {
        model: 'seedream/5-lite-text-to-image',
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          quality: 'high'
        }
      },
      apiKey
    );

    return this.pollUnifiedTask(taskId, apiKey);
  }

  private async generateSeedreamImageToImage(
    prompt: string,
    references: string[],
    apiKey: string,
    aspectRatio: string
  ): Promise<string> {
    const taskId = await this.createUnifiedTask(
      {
        model: 'seedream/5-lite-image-to-image',
        input: {
          prompt,
          image_urls: references,
          aspect_ratio: aspectRatio,
          quality: 'high'
        }
      },
      apiKey
    );

    return this.pollUnifiedTask(taskId, apiKey);
  }

  private async generateNanoBananaImage(
    imageModel: 'nano-banana-2' | 'nano-banana-pro',
    prompt: string,
    references: string[],
    apiKey: string,
    aspectRatio: string,
    resolution: string
  ): Promise<string> {
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: 'png'
    };

    if (references.length > 0) {
      input.image_input = references.slice(0, 14);
    }

    const taskId = await this.createUnifiedTask(
      {
        model: imageModel,
        input
      },
      apiKey
    );

    return this.pollUnifiedTask(taskId, apiKey);
  }

  private async generateCharacterImage(
    imageModel: CharacterImageModel,
    prompt: string,
    references: string[],
    apiKey: string,
    aspectRatio: string,
    resolution: string
  ): Promise<string> {
    this.logger.log(
      `Character image generation using ${imageModel} with ${references.length} reference image(s). ` +
      `Prompt preview: ${prompt.slice(0, 140)}`
    );

    if (imageModel === 'seedream-5') {
      if (references.length === 0) {
        return this.generateSeedreamTextToImage(prompt, apiKey, aspectRatio);
      }

      return this.generateSeedreamImageToImage(prompt, references, apiKey, aspectRatio);
    }

    return this.generateNanoBananaImage(imageModel, prompt, references, apiKey, aspectRatio, resolution);
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
          uploadPath: `vanta-lab/reference/${Date.now()}`
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
    const existing = await this.db.workflowJob.findUnique({ where: { id: payload.workflowJobId } });
    if (!existing) {
      this.logger.warn(`Job not found: ${payload.workflowJobId}`);
      return;
    }

    try {
      await this.db.workflowJob.update({
        where: { id: payload.workflowJobId },
        data: {
          status: 'processing',
          error: null
        }
      });
      this.updates$.next({ id: payload.workflowJobId, status: 'processing', error: null });

      const workspace = await this.db.workspace.findUnique({
        where: { id: existing.workspaceId }
      });

      // Load Balancing: Get the next available active API key from the database 
      // instead of relying on a workspace-level or hardcoded key.
      const apiKeyRecord = await this.apiKeysService.getNextAvailableKey();
      const apiKey = apiKeyRecord.key;

      let mediaUrl: string | undefined;
      let textOutput: string | undefined;
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

      let generatedMediaUrls: string[] | null = null;
      let generatedPromptSet: GeminiPromptSet | null = null;
      let parametersPatch: Partial<StoredWorkflowParameters> = {};

      params = {
        ...params,
        prompt: promptText,
        referenceImageUrl
      };

      if (existing.model === 'character-suite') {
        const selectedImageModel = this.normalizeCharacterImageModel(params.characterImageModel);
        const selectedResolution = (params.resolution ?? '2K').trim() || '2K';
        const promptSet = await this.generateCharacterPromptsWithGemini(params, apiKey);
        generatedPromptSet = promptSet;
        await this.apiKeysService.logUsage(apiKeyRecord.id, 'gemini-3-pro/v1/chat/completions', 0, 200);

        this.logger.log(
          `Character prompt set ready for ${existing.id} using ${selectedImageModel}. ` +
          `Profile prompt preview: ${promptSet.profilePicturePrompt.slice(0, 140)}`
        );

        const profilePictureUrl = await this.generateCharacterImage(
          selectedImageModel,
          promptSet.profilePicturePrompt,
          [],
          apiKey,
          '1:1',
          selectedResolution
        );

        const fullBodyUrl = await this.generateCharacterImage(
          selectedImageModel,
          promptSet.fullBodyPrompt,
          [profilePictureUrl],
          apiKey,
          '9:16',
          selectedResolution
        );

        const characterSheetUrl = await this.generateCharacterImage(
          selectedImageModel,
          promptSet.characterSheetPrompt,
          [fullBodyUrl],
          apiKey,
          '16:9',
          selectedResolution
        );

        const uploadedCharacterUrls = await this.uploadCharacterOutputsToStorage(
          [profilePictureUrl, fullBodyUrl, characterSheetUrl],
          {
            workspaceId: existing.workspaceId,
            userId: existing.userId,
            jobId: existing.id
          }
        );

        mediaUrl = uploadedCharacterUrls[0];
        generatedMediaUrls = [...uploadedCharacterUrls];
        await this.apiKeysService.logUsage(apiKeyRecord.id, `jobs/createTask/${selectedImageModel}-suite`, 0, 200);

      } else if (existing.model === 'veo-3.1' || existing.model === 'veo3_fast' || existing.model === 'veo3') {
        const veoModel = existing.model === 'veo-3.1'
          ? (params.mode === 'pro' ? 'veo3' : 'veo3_fast')
          : existing.model;
        const veoInput: Record<string, unknown> = {
          model: veoModel,
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

        mediaUrl = await this.pollVeoTask(data.data.taskId, apiKey);

        // Log Usage
        await this.apiKeysService.logUsage(apiKeyRecord.id, 'veo/generate', 0, 200);

      } else {
        const targetedModel = existing.model === 'nano-banana'
          ? 'google/nano-banana'
          : existing.model === 'seedream-5.0-lite'
            ? 'seedream/5-lite-text-to-image'
            : existing.model;

        const executionResult = await this.executeStandardWorkflow(targetedModel, params, apiKey);
        mediaUrl = executionResult.mediaUrl;
        generatedMediaUrls = executionResult.resultUrls ?? null;
        textOutput = executionResult.textOutput;
        parametersPatch = executionResult.parametersPatch ?? {};

        await this.apiKeysService.logUsage(
          apiKeyRecord.id,
          executionResult.usageEndpoint ?? `jobs/createTask/${targetedModel}`,
          executionResult.usageCostInCents ?? 0,
          200
        );
      }

      if (!mediaUrl && !textOutput) {
        throw new Error('Workflow completed without a media URL or text output');
      }

      const finalParameters: StoredWorkflowParameters = {
        ...params,
        ...parametersPatch
      };
      const workflowCreditCost = calculateWorkflowCreditCost(existing.model, finalParameters);
      const spendResult = await this.billingService.spendCreditsForWorkflow(existing.userId, workflowCreditCost);
      if (!spendResult.success) {
        throw new Error(
          `Insufficient credits. This run requires ${workflowCreditCost} credits (balance: ${spendResult.remainingCredits}).`
        );
      }

      await this.db.workflowJob.update({
        where: { id: payload.workflowJobId },
        data: {
          status: 'succeeded',
          mediaUrl: mediaUrl ?? null,
          parameters: generatedMediaUrls || generatedPromptSet || textOutput || Object.keys(parametersPatch).length > 0
            ? JSON.stringify({
              ...finalParameters,
              ...(generatedPromptSet ? { generatedPromptSet } : {}),
              ...(generatedMediaUrls ? { generatedMediaUrls } : {}),
              ...(textOutput ? { generatedText: textOutput } : {})
            })
            : existing.parameters,
          error: null
        }
      });
      this.updates$.next({
        id: payload.workflowJobId,
        status: 'succeeded',
        mediaUrl,
        resultUrls: generatedMediaUrls ?? undefined,
        textOutput: textOutput ?? null,
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';

      // Attempt to update database with failure state
      try {
        await this.db.workflowJob.update({
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
