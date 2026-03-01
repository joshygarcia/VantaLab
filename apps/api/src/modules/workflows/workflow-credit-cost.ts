type WorkflowParameters = {
  aspectRatio?: string;
  amount?: number;
  duration?: string;
  mode?: 'std' | 'pro' | string;
  resolution?: string;
};

// Based on "Image Model Credit Pricing Spreadsheet.csv":
// - Qwen z-image, text-to-image, 1.0s: 0.8 per image
// - Google nano banana pro, 1/2K: 18.0 per image
// - Google nano banana pro, 4K: 24.0 per image
// - Google nano banana, text-to-image: 4.0 per image
// - seedream 5.0 Lite, image-to-image: 5.5 per image
// - seedream 5.0 Lite, text-to-image: 5.5 per image
const IMAGE_COST_PER_IMAGE: Record<'z-image' | 'nano-banana' | 'nano-banana-pro' | 'seedream-5.0-lite', (resolution?: string) => number> = {
  'z-image': () => 0.8,
  'nano-banana': () => 4,
  'nano-banana-pro': (resolution) => (resolution === '4K' ? 24 : 18),
  'seedream-5.0-lite': () => 5.5
};

// Based on "Video Generation Model Pricing Spreadsheet.csv":
// - Google veo 3.1, text-to-video, Fast: 60.0 per video
// - Google veo 3.1, text-to-video, Quality: 250.0 per video
// - kling 2.5 turbo, text-to-video, Turbo Pro-5.0s: 42.0 per video
// - kling 2.5 turbo, text-to-video, Turbo Pro-10.0s: 84.0 per video
const VEO_31_FAST_COST = 60;
const VEO_31_QUALITY_COST = 250;
const KLING_TURBO_COST_PER_SECOND = 8.4; // 42 / 5 and 84 / 10
const CHARACTER_PROMPTING_COST = 1;
const CHARACTER_IMAGE_SET_COST = 5.5 * 3;

const MIN_DURATION_SECONDS = 3;
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

const finalizeCredits = (value: number): number => Math.max(1, Math.ceil(value));

export function calculateWorkflowCreditCost(model: string, parameters: WorkflowParameters): number {
  if (model === 'z-image' || model === 'nano-banana' || model === 'nano-banana-pro' || model === 'seedream-5.0-lite') {
    const amount = normalizeAmount(parameters.amount);
    const perImageCost = IMAGE_COST_PER_IMAGE[model](parameters.resolution);
    return finalizeCredits(perImageCost * amount);
  }

  if (model === 'character-suite') {
    return finalizeCredits(CHARACTER_PROMPTING_COST + CHARACTER_IMAGE_SET_COST);
  }

  if (model === 'veo-3.1') {
    return finalizeCredits(parameters.mode === 'pro' ? VEO_31_QUALITY_COST : VEO_31_FAST_COST);
  }

  if (model === 'kling-3.0/video') {
    const durationSeconds = normalizeDurationSeconds(parameters.duration);
    return finalizeCredits(durationSeconds * KLING_TURBO_COST_PER_SECOND);
  }

  return finalizeCredits(1);
}
