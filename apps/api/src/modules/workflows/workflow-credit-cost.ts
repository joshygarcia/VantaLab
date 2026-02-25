type WorkflowParameters = {
  aspectRatio?: string;
  amount?: number;
  duration?: string;
  klingElements?: Array<unknown>;
  mode?: 'std' | 'pro' | string;
  multiShots?: boolean;
  outputFormat?: string;
  resolution?: string;
  sound?: boolean;
};

const IMAGE_MODEL_BASE_COST: Record<string, number> = {
  'nano-banana-pro': 8,
  'nano-banana': 6,
  'z-image': 5
};

const VIDEO_MODEL_BASE_COST: Record<string, number> = {
  'kling-3.0/video': 22,
  'veo-3.1': 30
};

const RESOLUTION_MULTIPLIER: Record<string, number> = {
  '1K': 1,
  '2K': 1.8,
  '4K': 3
};

const ASPECT_RATIO_MULTIPLIER: Record<string, number> = {
  '1:1': 1,
  '4:3': 1.08,
  '3:4': 1.08,
  '16:9': 1.16,
  '9:16': 1.16
};

export function calculateWorkflowCreditCost(model: string, parameters: WorkflowParameters): number {
  if (model in IMAGE_MODEL_BASE_COST) {
    const base = IMAGE_MODEL_BASE_COST[model] ?? 6;
    const resolutionMultiplier = RESOLUTION_MULTIPLIER[parameters.resolution ?? '1K'] ?? 1;
    const aspectMultiplier = ASPECT_RATIO_MULTIPLIER[parameters.aspectRatio ?? '1:1'] ?? 1.08;
    const amount = Number.isFinite(parameters.amount) && (parameters.amount ?? 0) > 0
      ? Math.min(8, Math.max(1, Math.round(parameters.amount as number)))
      : 1;

    return Math.max(1, Math.ceil(base * resolutionMultiplier * aspectMultiplier * amount));
  }

  if (model in VIDEO_MODEL_BASE_COST) {
    const base = VIDEO_MODEL_BASE_COST[model] ?? 20;
    const duration = Number.parseInt(parameters.duration ?? '5', 10);
    const durationMultiplier = Number.isFinite(duration) && duration > 0
      ? Math.min(3, Math.max(0.8, duration / 5))
      : 1;
    const modeMultiplier = parameters.mode === 'pro' ? 1.3 : 1;
    const multiShotMultiplier = parameters.multiShots ? 1.2 : 1;
    const soundMultiplier = parameters.sound ? 1.05 : 1;
    const elementsCount = Array.isArray(parameters.klingElements) ? parameters.klingElements.length : 0;
    const elementsCost = elementsCount * 2;

    return Math.max(
      1,
      Math.ceil(base * durationMultiplier * modeMultiplier * multiShotMultiplier * soundMultiplier + elementsCost)
    );
  }

  return 1;
}
