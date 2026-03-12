type WorkflowParameters = {
  aspectRatio?: string;
  amount?: number;
  completionTokens?: number;
  duration?: string;
  mode?: 'std' | 'pro' | '720p' | '1080p' | string;
  prompt?: string;
  promptTokens?: number;
  resolution?: string;
  sound?: boolean;
};

// Based on "Image Model Credit Pricing Spreadsheet.csv":
// - Qwen z-image, text-to-image, 1.0s: 0.8 per image
// - Google nano banana pro, 1/2K: 18.0 per image
// - Google nano banana pro, 4K: 24.0 per image
// - Google nano banana, text-to-image: 4.0 per image
// - seedream 5.0 Lite, image-to-image: 5.5 per image
// - seedream 5.0 Lite, text-to-image: 5.5 per image
const IMAGE_COST_PER_IMAGE: Record<
  | 'z-image'
  | 'nano-banana'
  | 'google/nano-banana'
  | 'nano-banana-pro'
  | 'nano-banana-2'
  | 'seedream-5.0-lite'
  | 'seedream/5-lite-text-to-image'
  | 'seedream/5-lite-image-to-image'
  | 'qwen/text-to-image'
  | 'qwen/image-to-image'
  | 'qwen/image-edit',
  (resolution?: string) => number
> = {
  'z-image': () => 0.8,
  'nano-banana': () => 4,
  'google/nano-banana': () => 4,
  'nano-banana-pro': (resolution) => (resolution === '4K' ? 24 : 18),
  'nano-banana-2': (resolution) => {
    if (resolution === '4K') {
      return 18;
    }

    if (resolution === '1K') {
      return 8;
    }

    return 12;
  },
  'seedream-5.0-lite': () => 5.5,
  'seedream/5-lite-text-to-image': () => 5.5,
  'seedream/5-lite-image-to-image': () => 5.5,
  'qwen/text-to-image': () => 4,
  'qwen/image-to-image': () => 4,
  'qwen/image-edit': () => 4
};

// Based on "Video Generation Model Pricing Spreadsheet.csv":
// - Google veo 3.1, text-to-video, Fast: 60.0 per video
// - Google veo 3.1, text-to-video, Quality: 250.0 per video
// - kling 2.5 turbo, text-to-video, Turbo Pro-5.0s: 42.0 per video
// - kling 2.5 turbo, text-to-video, Turbo Pro-10.0s: 84.0 per video
const VEO_31_FAST_COST = 60;
const VEO_31_QUALITY_COST = 250;
const KLING_30_SOUND_1080P_COST_PER_SECOND = 40;
const KLING_30_SILENT_1080P_COST_PER_SECOND = 27;
const KLING_30_SOUND_720P_COST_PER_SECOND = 30;
const KLING_30_SILENT_720P_COST_PER_SECOND = 20;
const SORA_2_10_SECOND_COST = 30;
const SORA_2_15_SECOND_COST = 35;
const KLING_26_MOTION_720P_COST_PER_SECOND = 6;
const KLING_26_MOTION_1080P_COST_PER_SECOND = 9;

const CHAT_MODEL_CREDITS_PER_MILLION_TOKENS: Record<
  'gpt-5-2' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3-flash' | 'gemini-3-pro',
  { input: number; output: number }
> = {
  'gpt-5-2': { input: 87.5, output: 700 },
  'gemini-2.5-flash': { input: 18, output: 150 },
  'gemini-2.5-pro': { input: 76, output: 600 },
  'gemini-3-flash': { input: 30, output: 180 },
  'gemini-3-pro': { input: 100, output: 700 }
};

const MIN_DURATION_SECONDS = 3;
const MAX_MOTION_CONTROL_DURATION_SECONDS = 30;
const MAX_DURATION_SECONDS = 15;
const DEFAULT_DURATION_SECONDS = 5;

const normalizeAmount = (amount?: number): number => {
  if (!Number.isFinite(amount) || (amount ?? 0) <= 0) {
    return 1;
  }

  return Math.min(8, Math.max(1, Math.round(amount as number)));
};

const normalizeDurationSeconds = (duration?: string): number => {
  const parsed = Number.parseInt(duration ?? `${DEFAULT_DURATION_SECONDS}`, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DURATION_SECONDS;
  }

  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, parsed));
};

const normalizeMotionControlDurationSeconds = (duration?: string): number => {
  const parsed = Number.parseInt(duration ?? `${DEFAULT_DURATION_SECONDS}`, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DURATION_SECONDS;
  }

  return Math.min(MAX_MOTION_CONTROL_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, parsed));
};

const finalizeCredits = (value: number): number => Math.max(1, Math.ceil(value));

const estimatePromptTokens = (prompt?: string): number => {
  const trimmedPrompt = prompt?.trim() ?? '';
  if (!trimmedPrompt) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmedPrompt.length / 4));
};

export function calculateWorkflowCreditCost(model: string, parameters: WorkflowParameters): number {
  if (model in CHAT_MODEL_CREDITS_PER_MILLION_TOKENS) {
    const pricing = CHAT_MODEL_CREDITS_PER_MILLION_TOKENS[model as keyof typeof CHAT_MODEL_CREDITS_PER_MILLION_TOKENS];
    const promptTokens = Number.isFinite(parameters.promptTokens)
      ? Math.max(0, Math.round(parameters.promptTokens as number))
      : estimatePromptTokens(parameters.prompt);
    const completionTokens = Number.isFinite(parameters.completionTokens)
      ? Math.max(0, Math.round(parameters.completionTokens as number))
      : 0;

    return finalizeCredits(((promptTokens * pricing.input) + (completionTokens * pricing.output)) / 1_000_000);
  }

  if (model in IMAGE_COST_PER_IMAGE) {
    const amount = normalizeAmount(parameters.amount);
    const perImageCost = IMAGE_COST_PER_IMAGE[model as keyof typeof IMAGE_COST_PER_IMAGE](parameters.resolution);
    return finalizeCredits(perImageCost * amount);
  }

  if (model === 'grok-imagine/text-to-image' || model === 'grok-imagine/image-to-image') {
    return finalizeCredits(4);
  }

  if (model === 'veo-3.1') {
    return finalizeCredits(parameters.mode === 'pro' ? VEO_31_QUALITY_COST : VEO_31_FAST_COST);
  }

  if (model === 'veo3_fast') {
    return finalizeCredits(VEO_31_FAST_COST);
  }

  if (model === 'veo3') {
    return finalizeCredits(VEO_31_QUALITY_COST);
  }

  if (model === 'kling-3.0/video') {
    const durationSeconds = normalizeDurationSeconds(parameters.duration);
    const isPro = parameters.mode === 'pro';
    const hasSound = parameters.sound === true;
    const perSecondCost = isPro
      ? (hasSound ? KLING_30_SOUND_1080P_COST_PER_SECOND : KLING_30_SILENT_1080P_COST_PER_SECOND)
      : (hasSound ? KLING_30_SOUND_720P_COST_PER_SECOND : KLING_30_SILENT_720P_COST_PER_SECOND);
    return finalizeCredits(durationSeconds * perSecondCost);
  }

  if (model === 'sora-2-text-to-video' || model === 'sora-2-image-to-video') {
    const durationSeconds = normalizeDurationSeconds(parameters.duration);
    return finalizeCredits(durationSeconds >= 15 ? SORA_2_15_SECOND_COST : SORA_2_10_SECOND_COST);
  }

  if (model === 'kling-2.6/motion-control') {
    const durationSeconds = normalizeMotionControlDurationSeconds(parameters.duration);
    const perSecondCost = parameters.mode === '1080p'
      ? KLING_26_MOTION_1080P_COST_PER_SECOND
      : KLING_26_MOTION_720P_COST_PER_SECOND;
    return finalizeCredits(durationSeconds * perSecondCost);
  }

  return finalizeCredits(1);
}
