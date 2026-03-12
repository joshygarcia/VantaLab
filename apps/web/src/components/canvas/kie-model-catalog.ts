export type SelectOption = {
  label: string;
  value: string;
};

type TextareaControl = {
  type: 'textarea';
  id: string;
  label?: string;
  value: string;
  placeholder?: string;
};

type SelectControl = {
  type: 'select';
  id: string;
  label?: string;
  value: string;
  options: SelectOption[];
};

export type KieNodeControl = TextareaControl | SelectControl;

export type ControlPrefix =
  | 'prompt_'
  | 'model_'
  | 'aspect_'
  | 'res_'
  | 'outfmt_'
  | 'duration_'
  | 'mode_'
  | 'sound_'
  | 'char_orient_'
  | 'multi_shots_'
  | 'multi_prompt_'
  | 'reasoning_'
  | 'vres_';

type SelectControlPrefix = Exclude<ControlPrefix, 'prompt_' | 'multi_prompt_'>;
type NodeInputId = 'prompt-in' | 'image-in' | 'video-in' | 'multi-prompt-in' | 'kling-elements-in';

export type KieNodeUiSchema = {
  visibleControlPrefixes: ControlPrefix[];
  hiddenInputIds: NodeInputId[];
  selectOptions: Partial<Record<SelectControlPrefix, SelectOption[]>>;
  defaultValues: Partial<Record<ControlPrefix, string>>;
};

const CONTROL_PREFIXES: ControlPrefix[] = [
  'prompt_',
  'model_',
  'aspect_',
  'res_',
  'outfmt_',
  'duration_',
  'mode_',
  'sound_',
  'char_orient_',
  'multi_shots_',
  'multi_prompt_',
  'reasoning_',
  'vres_'
];

export const IMAGE_MODEL_OPTIONS = [
  { label: 'Google Nano Banana', value: 'google/nano-banana' },
  { label: 'Nano Banana 2', value: 'nano-banana-2' },
  { label: 'Nano Banana Pro', value: 'nano-banana-pro' },
  { label: 'Z-Image', value: 'z-image' },
  { label: 'Seedream 5 Lite', value: 'seedream/5-lite-text-to-image' },
  { label: 'Seedream 5 Lite (Img2Img)', value: 'seedream/5-lite-image-to-image' },
  { label: 'Qwen Text to Image', value: 'qwen/text-to-image' },
  { label: 'Qwen Image to Image', value: 'qwen/image-to-image' },
  { label: 'Qwen Image Edit', value: 'qwen/image-edit' },
  { label: 'Grok Imagine (Text)', value: 'grok-imagine/text-to-image' },
  { label: 'Grok Imagine (Image)', value: 'grok-imagine/image-to-image' }
] as const satisfies readonly SelectOption[];

export const VIDEO_MODEL_OPTIONS = [
  { label: 'Kling 3.0', value: 'kling-3.0/video' },
  { label: 'Kling 2.6 Motion Control', value: 'kling-2.6/motion-control' },
  { label: 'Veo 3.1 Fast', value: 'veo3_fast' },
  { label: 'Veo 3.1 Quality', value: 'veo3' },
  { label: 'Sora 2 Text to Video', value: 'sora-2-text-to-video' },
  { label: 'Sora 2 Image to Video', value: 'sora-2-image-to-video' },
  { label: 'Grok Imagine (Text Video)', value: 'grok-imagine/text-to-video' },
  { label: 'Grok Imagine (Image Video)', value: 'grok-imagine/image-to-video' }
] as const satisfies readonly SelectOption[];

export const AGENT_MODEL_OPTIONS = [
  { label: 'GPT-5.2', value: 'gpt-5-2' },
  { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
  { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
  { label: 'Gemini 3 Flash', value: 'gemini-3-flash' },
  { label: 'Gemini 3 Pro', value: 'gemini-3-pro' }
] as const satisfies readonly SelectOption[];

export const COMMON_ASPECT_RATIO_OPTIONS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' }
] as const satisfies readonly SelectOption[];

export const WIDE_ASPECT_RATIO_OPTIONS = [
  { label: '1:1', value: '1:1' },
  { label: '2:3', value: '2:3' },
  { label: '3:2', value: '3:2' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '4:5', value: '4:5' },
  { label: '5:4', value: '5:4' },
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
  { label: '21:9', value: '21:9' },
  { label: 'Auto', value: 'auto' }
] as const satisfies readonly SelectOption[];

export const NANO_BANANA_2_ASPECT_RATIO_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '1:4', value: '1:4' },
  { label: '16:9', value: '16:9' },
  { label: '1:8', value: '1:8' },
  { label: '21:9', value: '21:9' },
  { label: '2:3', value: '2:3' },
  { label: '3:2', value: '3:2' },
  { label: '3:4', value: '3:4' },
  { label: '4:1', value: '4:1' },
  { label: '4:3', value: '4:3' },
  { label: '4:5', value: '4:5' },
  { label: '5:4', value: '5:4' },
  { label: '8:1', value: '8:1' },
  { label: '9:16', value: '9:16' }
] as const satisfies readonly SelectOption[];

export const Z_IMAGE_ASPECT_RATIO_OPTIONS = [
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' }
] as const satisfies readonly SelectOption[];

export const GROK_ASPECT_RATIO_OPTIONS = [
  { label: '2:3', value: '2:3' },
  { label: '3:2', value: '3:2' },
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' }
] as const satisfies readonly SelectOption[];

export const VEO_ASPECT_RATIO_OPTIONS = [
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: 'Auto', value: 'auto' }
] as const satisfies readonly SelectOption[];

export const SORA_ASPECT_RATIO_OPTIONS = [
  { label: 'Landscape', value: '16:9' },
  { label: 'Portrait', value: '9:16' }
] as const satisfies readonly SelectOption[];

export const IMAGE_RESOLUTION_OPTIONS = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' }
] as const satisfies readonly SelectOption[];

export const SEEDREAM_RESOLUTION_OPTIONS = [
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' }
] as const satisfies readonly SelectOption[];

export const OUTPUT_FORMAT_OPTIONS = [
  { label: 'PNG', value: 'png' },
  { label: 'JPG', value: 'jpg' }
] as const satisfies readonly SelectOption[];

export const VIDEO_DURATION_OPTIONS = [
  { label: '3s', value: '3' },
  { label: '4s', value: '4' },
  { label: '5s', value: '5' },
  { label: '6s', value: '6' },
  { label: '7s', value: '7' },
  { label: '8s', value: '8' },
  { label: '9s', value: '9' },
  { label: '10s', value: '10' },
  { label: '11s', value: '11' },
  { label: '12s', value: '12' },
  { label: '13s', value: '13' },
  { label: '14s', value: '14' },
  { label: '15s', value: '15' },
  { label: '20s', value: '20' },
  { label: '30s', value: '30' }
] as const satisfies readonly SelectOption[];

export const KLING_30_DURATION_OPTIONS = VIDEO_DURATION_OPTIONS.filter((option) => Number.parseInt(option.value, 10) <= 15);

export const MOTION_CONTROL_DURATION_OPTIONS = [
  { label: '3s', value: '3' },
  { label: '5s', value: '5' },
  { label: '10s', value: '10' },
  { label: '15s', value: '15' },
  { label: '20s', value: '20' },
  { label: '30s', value: '30' }
] as const satisfies readonly SelectOption[];

export const SORA_DURATION_OPTIONS = [
  { label: '10s', value: '10' },
  { label: '15s', value: '15' }
] as const satisfies readonly SelectOption[];

export const GROK_VIDEO_DURATION_OPTIONS = [
  { label: '6s', value: '6' },
  { label: '10s', value: '10' }
] as const satisfies readonly SelectOption[];

export const VIDEO_MODE_OPTIONS = [
  { label: 'Pro', value: 'pro' },
  { label: 'Std', value: 'std' },
  { label: 'Normal', value: 'normal' },
  { label: 'Fun', value: 'fun' },
  { label: 'Spicy', value: 'spicy' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' }
] as const satisfies readonly SelectOption[];

export const KLING_MODE_OPTIONS = [
  { label: 'Pro', value: 'pro' },
  { label: 'Std', value: 'std' }
] as const satisfies readonly SelectOption[];

export const GROK_VIDEO_MODE_OPTIONS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Fun', value: 'fun' },
  { label: 'Spicy', value: 'spicy' }
] as const satisfies readonly SelectOption[];

export const MOTION_CONTROL_MODE_OPTIONS = [
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' }
] as const satisfies readonly SelectOption[];

export const GROK_VIDEO_RESOLUTION_OPTIONS = [
  { label: '480p', value: '480p' },
  { label: '720p', value: '720p' }
] as const satisfies readonly SelectOption[];

export const SOUND_OPTIONS = [
  { label: 'Sound Off', value: 'false' },
  { label: 'Sound On', value: 'true' }
] as const satisfies readonly SelectOption[];

export const MULTI_SHOT_OPTIONS = [
  { label: 'Single Shot', value: 'false' },
  { label: 'Multi Shot', value: 'true' }
] as const satisfies readonly SelectOption[];

export const CHARACTER_ORIENTATION_OPTIONS = [
  { label: 'Follow Image', value: 'image' },
  { label: 'Follow Video', value: 'video' }
] as const satisfies readonly SelectOption[];

export const REASONING_EFFORT_OPTIONS = [
  { label: 'High', value: 'high' },
  { label: 'Low', value: 'low' }
] as const satisfies readonly SelectOption[];

const IMAGE_MODELS_REQUIRING_REFERENCE = new Set<string>([
  'seedream/5-lite-image-to-image',
  'qwen/image-to-image',
  'qwen/image-edit',
  'grok-imagine/image-to-image'
]);

const IMAGE_MODELS_SUPPORTING_REFERENCE = new Set<string>([
  ...IMAGE_MODELS_REQUIRING_REFERENCE,
  'nano-banana-2',
  'nano-banana-pro'
]);

const VIDEO_MODELS_REQUIRING_IMAGE = new Set<string>([
  'sora-2-image-to-video',
  'grok-imagine/image-to-video',
  'kling-2.6/motion-control'
]);

const VIDEO_MODELS_SUPPORTING_IMAGE = new Set<string>([
  ...VIDEO_MODELS_REQUIRING_IMAGE,
  'kling-3.0/video',
  'veo3_fast',
  'veo3',
  'veo-3.1'
]);

const VIDEO_MODELS_REQUIRING_VIDEO = new Set<string>([
  'kling-2.6/motion-control'
]);

const VIDEO_MODELS_SUPPORTING_VIDEO = new Set<string>(VIDEO_MODELS_REQUIRING_VIDEO);
const VIDEO_MODELS_SUPPORTING_KLING_ELEMENTS = new Set<string>([
  'kling-3.0/video'
]);

const IMAGE_MODEL_SET = new Set<string>([
  ...IMAGE_MODEL_OPTIONS.map((model) => model.value),
  'nano-banana',
  'seedream-5.0-lite'
]);
const VIDEO_MODEL_SET = new Set<string>([
  ...VIDEO_MODEL_OPTIONS.map((model) => model.value),
  'veo-3.1'
]);
const AGENT_MODEL_SET = new Set<string>(AGENT_MODEL_OPTIONS.map((model) => model.value));

const FULL_VIDEO_HIDDEN_INPUTS: NodeInputId[] = ['image-in', 'video-in', 'multi-prompt-in', 'kling-elements-in'];
const PROMPT_ONLY_HIDDEN_INPUTS: NodeInputId[] = ['image-in'];

export const DEFAULT_IMAGE_MODEL = 'nano-banana-pro';
export const DEFAULT_VIDEO_MODEL = 'kling-3.0/video';
export const DEFAULT_AGENT_MODEL = 'gpt-5-2';

const createNodeUiSchema = (
  config: Pick<KieNodeUiSchema, 'visibleControlPrefixes' | 'hiddenInputIds'> &
    Partial<Pick<KieNodeUiSchema, 'selectOptions' | 'defaultValues'>>
): KieNodeUiSchema => ({
  visibleControlPrefixes: config.visibleControlPrefixes,
  hiddenInputIds: config.hiddenInputIds,
  selectOptions: {
    model_: [...VIDEO_MODEL_OPTIONS],
    ...config.selectOptions
  },
  defaultValues: config.defaultValues ?? {}
});

const createImageNodeUiSchema = (
  config: Pick<KieNodeUiSchema, 'visibleControlPrefixes' | 'hiddenInputIds'> &
    Partial<Pick<KieNodeUiSchema, 'selectOptions' | 'defaultValues'>>
): KieNodeUiSchema => ({
  visibleControlPrefixes: config.visibleControlPrefixes,
  hiddenInputIds: config.hiddenInputIds,
  selectOptions: {
    model_: [...IMAGE_MODEL_OPTIONS],
    ...config.selectOptions
  },
  defaultValues: {
    model_: DEFAULT_IMAGE_MODEL,
    aspect_: '1:1',
    res_: '1K',
    outfmt_: 'png',
    ...config.defaultValues
  }
});

const createVideoNodeUiSchema = (
  config: Pick<KieNodeUiSchema, 'visibleControlPrefixes' | 'hiddenInputIds'> &
    Partial<Pick<KieNodeUiSchema, 'selectOptions' | 'defaultValues'>>
): KieNodeUiSchema => ({
  visibleControlPrefixes: config.visibleControlPrefixes,
  hiddenInputIds: config.hiddenInputIds,
  selectOptions: {
    model_: [...VIDEO_MODEL_OPTIONS],
    ...config.selectOptions
  },
  defaultValues: {
    model_: DEFAULT_VIDEO_MODEL,
    aspect_: '16:9',
    duration_: '5',
    mode_: 'pro',
    sound_: 'false',
    char_orient_: 'video',
    multi_shots_: 'false',
    vres_: '480p',
    ...config.defaultValues
  }
});

const createAgentNodeUiSchema = (
  config: Pick<KieNodeUiSchema, 'visibleControlPrefixes' | 'hiddenInputIds'> &
    Partial<Pick<KieNodeUiSchema, 'selectOptions' | 'defaultValues'>>
): KieNodeUiSchema => ({
  visibleControlPrefixes: config.visibleControlPrefixes,
  hiddenInputIds: config.hiddenInputIds,
  selectOptions: {
    model_: [...AGENT_MODEL_OPTIONS],
    ...config.selectOptions
  },
  defaultValues: {
    model_: DEFAULT_AGENT_MODEL,
    reasoning_: 'high',
    ...config.defaultValues
  }
});

export const isImageModel = (model: string) => IMAGE_MODEL_SET.has(model);
export const isVideoModel = (model: string) => VIDEO_MODEL_SET.has(model);
export const isAgentModel = (model: string) => AGENT_MODEL_SET.has(model);

export const imageModelRequiresReference = (model: string) => IMAGE_MODELS_REQUIRING_REFERENCE.has(model);
export const imageModelSupportsReference = (model: string) => IMAGE_MODELS_SUPPORTING_REFERENCE.has(model);
export const videoModelRequiresImage = (model: string) => VIDEO_MODELS_REQUIRING_IMAGE.has(model);
export const videoModelSupportsImage = (model: string) => VIDEO_MODELS_SUPPORTING_IMAGE.has(model);
export const videoModelRequiresVideo = (model: string) => VIDEO_MODELS_REQUIRING_VIDEO.has(model);
export const videoModelSupportsVideo = (model: string) => VIDEO_MODELS_SUPPORTING_VIDEO.has(model);
export const videoModelSupportsKlingElements = (model: string) => VIDEO_MODELS_SUPPORTING_KLING_ELEMENTS.has(model);

export const getControlPrefix = (controlId: string): ControlPrefix | null =>
  CONTROL_PREFIXES.find((prefix) => controlId.startsWith(prefix)) ?? null;

export const normalizeSchemaSelectValue = (
  schema: KieNodeUiSchema,
  prefix: SelectControlPrefix,
  value?: string
): string => {
  const options = schema.selectOptions[prefix];
  const defaultValue = schema.defaultValues[prefix] ?? options?.[0]?.value ?? '';
  if (!value?.trim()) {
    return defaultValue;
  }

  if (!options || options.some((option) => option.value === value)) {
    return value;
  }

  return defaultValue;
};

export const applyNodeUiSchemaToControls = (
  controls: KieNodeControl[],
  schema: KieNodeUiSchema
): KieNodeControl[] =>
  controls.map((control) => {
    const prefix = getControlPrefix(control.id);
    if (!prefix) {
      return control;
    }

    if (control.type === 'select') {
      const options = schema.selectOptions[prefix as SelectControlPrefix] ?? control.options;
      return {
        ...control,
        value: normalizeSchemaSelectValue(schema, prefix as SelectControlPrefix, control.value),
        options: [...options]
      };
    }

    return control;
  });

export const getImageNodeUiSchema = (model: string): KieNodeUiSchema => {
  switch (model) {
    case 'google/nano-banana':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'outfmt_'],
        hiddenInputIds: [...PROMPT_ONLY_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...WIDE_ASPECT_RATIO_OPTIONS],
          outfmt_: [...OUTPUT_FORMAT_OPTIONS]
        }
      });
    case 'nano-banana-2':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'res_', 'outfmt_'],
        hiddenInputIds: [],
        selectOptions: {
          aspect_: [...NANO_BANANA_2_ASPECT_RATIO_OPTIONS],
          res_: [...IMAGE_RESOLUTION_OPTIONS],
          outfmt_: [...OUTPUT_FORMAT_OPTIONS]
        },
        defaultValues: {
          aspect_: 'auto',
          outfmt_: 'jpg'
        }
      });
    case 'nano-banana-pro':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'res_', 'outfmt_'],
        hiddenInputIds: [],
        selectOptions: {
          aspect_: [...WIDE_ASPECT_RATIO_OPTIONS],
          res_: [...IMAGE_RESOLUTION_OPTIONS],
          outfmt_: [...OUTPUT_FORMAT_OPTIONS]
        }
      });
    case 'z-image':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_'],
        hiddenInputIds: [...PROMPT_ONLY_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...Z_IMAGE_ASPECT_RATIO_OPTIONS]
        }
      });
    case 'seedream/5-lite-text-to-image':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'res_'],
        hiddenInputIds: [...PROMPT_ONLY_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...COMMON_ASPECT_RATIO_OPTIONS],
          res_: [...SEEDREAM_RESOLUTION_OPTIONS]
        },
        defaultValues: {
          res_: '2K'
        }
      });
    case 'seedream/5-lite-image-to-image':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'res_'],
        hiddenInputIds: [],
        selectOptions: {
          aspect_: [...COMMON_ASPECT_RATIO_OPTIONS],
          res_: [...SEEDREAM_RESOLUTION_OPTIONS]
        },
        defaultValues: {
          res_: '2K'
        }
      });
    case 'qwen/text-to-image':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'outfmt_'],
        hiddenInputIds: [...PROMPT_ONLY_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...COMMON_ASPECT_RATIO_OPTIONS],
          outfmt_: [...OUTPUT_FORMAT_OPTIONS]
        }
      });
    case 'qwen/image-to-image':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'outfmt_'],
        hiddenInputIds: [],
        selectOptions: {
          outfmt_: [...OUTPUT_FORMAT_OPTIONS]
        }
      });
    case 'qwen/image-edit':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'outfmt_'],
        hiddenInputIds: [],
        selectOptions: {
          aspect_: [...COMMON_ASPECT_RATIO_OPTIONS],
          outfmt_: [...OUTPUT_FORMAT_OPTIONS]
        }
      });
    case 'grok-imagine/text-to-image':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_'],
        hiddenInputIds: [...PROMPT_ONLY_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...GROK_ASPECT_RATIO_OPTIONS]
        },
        defaultValues: {
          aspect_: '2:3'
        }
      });
    case 'grok-imagine/image-to-image':
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_'],
        hiddenInputIds: [],
        selectOptions: {}
      });
    default:
      return createImageNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'res_', 'outfmt_'],
        hiddenInputIds: imageModelSupportsReference(model) ? [] : [...PROMPT_ONLY_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...WIDE_ASPECT_RATIO_OPTIONS],
          res_: [...IMAGE_RESOLUTION_OPTIONS],
          outfmt_: [...OUTPUT_FORMAT_OPTIONS]
        }
      });
  }
};

export const getVideoNodeUiSchema = (
  model: string,
  options?: { multiShots?: boolean }
): KieNodeUiSchema => {
  const multiShotsEnabled = options?.multiShots === true;

  switch (model) {
    case 'kling-3.0/video':
      return createVideoNodeUiSchema({
        visibleControlPrefixes: [
          'prompt_',
          'model_',
          'aspect_',
          'duration_',
          'mode_',
          'sound_',
          'multi_shots_',
          ...(multiShotsEnabled ? (['multi_prompt_'] as const) : [])
        ],
        hiddenInputIds: [
          'video-in',
          ...(multiShotsEnabled ? ([] as NodeInputId[]) : (['multi-prompt-in'] as NodeInputId[]))
        ],
        selectOptions: {
          aspect_: [...Z_IMAGE_ASPECT_RATIO_OPTIONS.slice(0, 5)],
          duration_: [...KLING_30_DURATION_OPTIONS],
          mode_: [...KLING_MODE_OPTIONS],
          sound_: [...SOUND_OPTIONS],
          multi_shots_: [...MULTI_SHOT_OPTIONS]
        }
      });
    case 'kling-2.6/motion-control':
      return createVideoNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'duration_', 'mode_', 'char_orient_'],
        hiddenInputIds: ['multi-prompt-in', 'kling-elements-in'],
        selectOptions: {
          duration_: [...MOTION_CONTROL_DURATION_OPTIONS],
          mode_: [...MOTION_CONTROL_MODE_OPTIONS],
          char_orient_: [...CHARACTER_ORIENTATION_OPTIONS]
        },
        defaultValues: {
          duration_: '5',
          mode_: '720p',
          char_orient_: 'video'
        }
      });
    case 'veo3_fast':
    case 'veo3':
    case 'veo-3.1':
      return createVideoNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_'],
        hiddenInputIds: ['video-in', 'multi-prompt-in', 'kling-elements-in'],
        selectOptions: {
          aspect_: [...VEO_ASPECT_RATIO_OPTIONS]
        },
        defaultValues: {
          aspect_: '16:9'
        }
      });
    case 'sora-2-text-to-video':
      return createVideoNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'duration_'],
        hiddenInputIds: [...FULL_VIDEO_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...SORA_ASPECT_RATIO_OPTIONS],
          duration_: [...SORA_DURATION_OPTIONS]
        },
        defaultValues: {
          aspect_: '16:9',
          duration_: '10'
        }
      });
    case 'sora-2-image-to-video':
      return createVideoNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'duration_'],
        hiddenInputIds: ['video-in', 'multi-prompt-in', 'kling-elements-in'],
        selectOptions: {
          aspect_: [...SORA_ASPECT_RATIO_OPTIONS],
          duration_: [...SORA_DURATION_OPTIONS]
        },
        defaultValues: {
          aspect_: '16:9',
          duration_: '10'
        }
      });
    case 'grok-imagine/text-to-video':
      return createVideoNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'duration_', 'mode_', 'vres_'],
        hiddenInputIds: [...FULL_VIDEO_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...GROK_ASPECT_RATIO_OPTIONS],
          duration_: [...GROK_VIDEO_DURATION_OPTIONS],
          mode_: [...GROK_VIDEO_MODE_OPTIONS],
          vres_: [...GROK_VIDEO_RESOLUTION_OPTIONS]
        },
        defaultValues: {
          aspect_: '2:3',
          duration_: '6',
          mode_: 'normal',
          vres_: '480p'
        }
      });
    case 'grok-imagine/image-to-video':
      return createVideoNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'duration_', 'mode_', 'vres_'],
        hiddenInputIds: ['video-in', 'multi-prompt-in', 'kling-elements-in'],
        selectOptions: {
          duration_: [...GROK_VIDEO_DURATION_OPTIONS],
          mode_: [...GROK_VIDEO_MODE_OPTIONS],
          vres_: [...GROK_VIDEO_RESOLUTION_OPTIONS]
        },
        defaultValues: {
          duration_: '6',
          mode_: 'normal',
          vres_: '480p'
        }
      });
    default:
      return createVideoNodeUiSchema({
        visibleControlPrefixes: ['prompt_', 'model_', 'aspect_', 'duration_'],
        hiddenInputIds: [...FULL_VIDEO_HIDDEN_INPUTS],
        selectOptions: {
          aspect_: [...COMMON_ASPECT_RATIO_OPTIONS],
          duration_: [...VIDEO_DURATION_OPTIONS]
        }
      });
  }
};

export const getAgentNodeUiSchema = (_model: string): KieNodeUiSchema =>
  createAgentNodeUiSchema({
    visibleControlPrefixes: ['prompt_', 'model_', 'reasoning_'],
    hiddenInputIds: [],
    selectOptions: {
      reasoning_: [...REASONING_EFFORT_OPTIONS]
    }
  });
