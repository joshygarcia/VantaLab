export const KIE_IMAGE_MODELS = [
  'google/nano-banana',
  'nano-banana-2',
  'nano-banana-pro',
  'z-image',
  'seedream/5-lite-text-to-image',
  'seedream/5-lite-image-to-image',
  'qwen/text-to-image',
  'qwen/image-to-image',
  'qwen/image-edit',
  'grok-imagine/text-to-image',
  'grok-imagine/image-to-image'
] as const;

export const KIE_VIDEO_MODELS = [
  'veo3_fast',
  'veo3',
  'veo-3.1',
  'kling-3.0/video',
  'kling-2.6/motion-control',
  'sora-2-text-to-video',
  'sora-2-image-to-video',
  'grok-imagine/text-to-video',
  'grok-imagine/image-to-video'
] as const;

export const KIE_AGENT_MODELS = [
  'gpt-5-2',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash',
  'gemini-3-pro'
] as const;

export const KIE_WORKFLOW_MODELS = [
  ...KIE_IMAGE_MODELS,
  ...KIE_VIDEO_MODELS,
  ...KIE_AGENT_MODELS,
  'nano-banana',
  'seedream-5.0-lite',
  'character-suite'
] as const;

export type KieImageModel = typeof KIE_IMAGE_MODELS[number];
export type KieVideoModel = typeof KIE_VIDEO_MODELS[number];
export type KieAgentModel = typeof KIE_AGENT_MODELS[number];
export type KieWorkflowModel = typeof KIE_WORKFLOW_MODELS[number];

export const KIE_MODEL_LABELS: Record<string, string> = {
  'google/nano-banana': 'Google Nano Banana',
  'nano-banana-2': 'Nano Banana 2',
  'nano-banana-pro': 'Nano Banana Pro',
  'z-image': 'Z-Image',
  'seedream/5-lite-text-to-image': 'Seedream 5 Lite',
  'seedream/5-lite-image-to-image': 'Seedream 5 Lite (Img2Img)',
  'qwen/text-to-image': 'Qwen Text to Image',
  'qwen/image-to-image': 'Qwen Image to Image',
  'qwen/image-edit': 'Qwen Image Edit',
  'grok-imagine/text-to-image': 'Grok Imagine (Text)',
  'grok-imagine/image-to-image': 'Grok Imagine (Image)',
  'veo3_fast': 'Veo 3.1 Fast',
  'veo3': 'Veo 3.1 Quality',
  'veo-3.1': 'Veo 3.1',
  'kling-3.0/video': 'Kling 3.0',
  'kling-2.6/motion-control': 'Kling 2.6 Motion Control',
  'sora-2-text-to-video': 'Sora 2 Text to Video',
  'sora-2-image-to-video': 'Sora 2 Image to Video',
  'grok-imagine/text-to-video': 'Grok Imagine (Text Video)',
  'grok-imagine/image-to-video': 'Grok Imagine (Image Video)',
  'gpt-5-2': 'GPT-5.2',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-3-flash': 'Gemini 3 Flash',
  'gemini-3-pro': 'Gemini 3 Pro',
  'nano-banana': 'Nano Banana',
  'seedream-5.0-lite': 'Seedream 5 Lite',
  'character-suite': 'Character Suite'
};

const IMAGE_MODEL_SET = new Set<string>(KIE_IMAGE_MODELS);
const VIDEO_MODEL_SET = new Set<string>(KIE_VIDEO_MODELS);
const AGENT_MODEL_SET = new Set<string>(KIE_AGENT_MODELS);

const IMAGE_REQUIRED_MODEL_SET = new Set<string>([
  'seedream/5-lite-image-to-image',
  'qwen/image-to-image',
  'qwen/image-edit',
  'grok-imagine/image-to-image',
  'sora-2-image-to-video',
  'grok-imagine/image-to-video',
  'kling-2.6/motion-control'
]);

const VIDEO_REQUIRED_MODEL_SET = new Set<string>([
  'kling-2.6/motion-control'
]);

export function isImageModel(model: string): model is KieImageModel {
  return IMAGE_MODEL_SET.has(model);
}

export function isVideoModel(model: string): model is KieVideoModel {
  return VIDEO_MODEL_SET.has(model);
}

export function isAgentModel(model: string): model is KieAgentModel {
  return AGENT_MODEL_SET.has(model);
}

export function requiresImageInput(model: string): boolean {
  return IMAGE_REQUIRED_MODEL_SET.has(model);
}

export function requiresVideoInput(model: string): boolean {
  return VIDEO_REQUIRED_MODEL_SET.has(model);
}
