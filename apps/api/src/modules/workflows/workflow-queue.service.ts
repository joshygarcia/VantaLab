import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  resultUrls?: string[];
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
  private supabaseStorageAdmin: SupabaseClient | null = null;

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

  private getCharacterOutputBucket(): string {
    return process.env.SUPABASE_CREATOR_LAB_BUCKET
      ?? process.env.NEXT_PUBLIC_SUPABASE_CREATOR_LAB_BUCKET
      ?? 'creator-lab-assets';
  }

  private getSupabaseStorageAdmin(): SupabaseClient {
    if (this.supabaseStorageAdmin) {
      return this.supabaseStorageAdmin;
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase Storage is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }

    this.supabaseStorageAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    return this.supabaseStorageAdmin;
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

  private async uploadGeneratedImageToSupabase(
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
    const objectPath = `generated-characters/${workspaceSegment}/${userSegment}/${jobSegment}_${label}.${extension}`;
    const bucket = this.getCharacterOutputBucket();

    const supabase = this.getSupabaseStorageAdmin();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, imageBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload generated image to Supabase: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    const supabaseUrl = publicUrlData?.publicUrl;

    if (!supabaseUrl) {
      throw new Error('Supabase upload completed without a retrievable URL');
    }

    return supabaseUrl;
  }

  private async uploadCharacterOutputsToSupabase(
    outputUrls: [string, string, string],
    context: CharacterOutputUploadContext
  ): Promise<[string, string, string]> {
    const uploadedProfile = await this.uploadGeneratedImageToSupabase(outputUrls[0], context, 'profile');
    const uploadedFullBody = await this.uploadGeneratedImageToSupabase(outputUrls[1], context, 'full-body');
    const uploadedSheet = await this.uploadGeneratedImageToSupabase(outputUrls[2], context, 'sheet');

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
      let generatedMediaUrls: string[] | null = null;
      let generatedPromptSet: GeminiPromptSet | null = null;

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

        const uploadedCharacterUrls = await this.uploadCharacterOutputsToSupabase(
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

        taskId = await this.createUnifiedTask(requestBody, apiKey);
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
          parameters: generatedMediaUrls
            ? JSON.stringify({
              ...params,
              ...(generatedPromptSet ? { generatedPromptSet } : {}),
              generatedMediaUrls
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
