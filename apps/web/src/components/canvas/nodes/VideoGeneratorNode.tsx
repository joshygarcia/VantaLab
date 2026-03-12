import { MainNode, type BaseNodeData } from './MainNode';
import { calculateWorkflowCreditCost } from '../workflow-credit-cost';
import { normalizeElementLibrarySelection } from '../element-library-selection';
import {
  CHARACTER_ORIENTATION_OPTIONS,
  DEFAULT_VIDEO_MODEL,
  GROK_VIDEO_RESOLUTION_OPTIONS,
  KLING_30_DURATION_OPTIONS,
  KLING_MODE_OPTIONS,
  MULTI_SHOT_OPTIONS,
  SOUND_OPTIONS,
  VEO_ASPECT_RATIO_OPTIONS,
  VIDEO_MODEL_OPTIONS,
  WIDE_ASPECT_RATIO_OPTIONS,
  applyNodeUiSchemaToControls,
  getControlPrefix,
  getVideoNodeUiSchema,
  normalizeSchemaSelectValue,
  videoModelSupportsKlingElements
} from '../kie-model-catalog';

type VideoGeneratorNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const VIDEO_GENERATOR_INPUTS: NonNullable<BaseNodeData['inputs']> = [
  { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
  { id: 'image-in', label: 'Image', type: 'image' },
  { id: 'video-in', label: 'Video', type: 'video' },
  { id: 'multi-prompt-in', label: 'Multi-shot', type: 'prompt' },
  { id: 'kling-elements-in', label: 'Elements', type: 'asset' }
];

const VIDEO_GENERATOR_OUTPUTS: NonNullable<BaseNodeData['outputs']> = [
  { id: 'video-out', label: 'Video', type: 'video' }
];

const hasControl = (controls: NonNullable<BaseNodeData['controls']>, prefix: string) =>
  controls.some((control) => control.id.startsWith(prefix));

export function VideoGeneratorNode({ id, data, isConnectable, selected = false }: VideoGeneratorNodeProps) {
  const controls = [...(data.controls ?? [])];
  const normalizedControls: NonNullable<BaseNodeData['controls']> = [...controls];

  if (!hasControl(normalizedControls, 'prompt_')) {
    normalizedControls.unshift({
      type: 'textarea',
      id: `prompt_${id}`,
      value: typeof data.text === 'string' ? data.text : '',
      placeholder: 'Describe the video you want to generate...'
    });
  }

  if (!hasControl(normalizedControls, 'model_')) {
    normalizedControls.push({
      type: 'select',
      id: `model_${id}`,
      value: DEFAULT_VIDEO_MODEL,
      options: [...VIDEO_MODEL_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'aspect_')) {
    normalizedControls.push({
      type: 'select',
      id: `aspect_${id}`,
      value: '16:9',
      options: [...WIDE_ASPECT_RATIO_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'duration_')) {
    normalizedControls.push({
      type: 'select',
      id: `duration_${id}`,
      value: '5',
      options: [...KLING_30_DURATION_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'mode_')) {
    normalizedControls.push({
      type: 'select',
      id: `mode_${id}`,
      value: 'pro',
      options: [...KLING_MODE_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'sound_')) {
    normalizedControls.push({
      type: 'select',
      id: `sound_${id}`,
      value: 'false',
      options: [...SOUND_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'char_orient_')) {
    normalizedControls.push({
      type: 'select',
      id: `char_orient_${id}`,
      value: 'video',
      options: [...CHARACTER_ORIENTATION_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'multi_shots_')) {
    normalizedControls.push({
      type: 'select',
      id: `multi_shots_${id}`,
      value: 'false',
      options: [...MULTI_SHOT_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'multi_prompt_')) {
    normalizedControls.push({
      type: 'textarea',
      id: `multi_prompt_${id}`,
      value: 'Aerial sweep over the skyline at sunset | 3\nClose-up of neon reflections in rain puddles | 2',
      placeholder: 'Shot prompt | duration'
    });
  }

  if (!hasControl(normalizedControls, 'vres_')) {
    normalizedControls.push({
      type: 'select',
      id: `vres_${id}`,
      value: '480p',
      options: [...GROK_VIDEO_RESOLUTION_OPTIONS]
    });
  }

  const readRawSelectValue = (prefix: string) => {
    const control = normalizedControls.find((entry) => entry.type === 'select' && entry.id.startsWith(prefix));
    if (control?.type === 'select' && typeof control.value === 'string' && control.value.trim().length > 0) {
      return control.value;
    }
    return undefined;
  };

  const selectedModel = readRawSelectValue('model_') ?? DEFAULT_VIDEO_MODEL;
  const multiShotsEnabled = readRawSelectValue('multi_shots_') === 'true';
  const schema = getVideoNodeUiSchema(selectedModel, { multiShots: multiShotsEnabled });
  const schemaControls = applyNodeUiSchemaToControls(normalizedControls, schema) as NonNullable<BaseNodeData['controls']>;
  const selectedDuration = normalizeSchemaSelectValue(schema, 'duration_', readRawSelectValue('duration_'));
  const selectedMode = normalizeSchemaSelectValue(schema, 'mode_', readRawSelectValue('mode_'));
  const soundEnabled = normalizeSchemaSelectValue(schema, 'sound_', readRawSelectValue('sound_')) === 'true';

  const creditCost = calculateWorkflowCreditCost(selectedModel, {
    duration: selectedDuration,
    mode: selectedMode,
    sound: soundEnabled
  });

  const normalizedData: BaseNodeData = {
    ...data,
    title: 'Video Generator',
    label: 'Video Generator',
    icon: 'video',
    runnable: true,
    creditCost,
    inputs: VIDEO_GENERATOR_INPUTS.map((input) => ({ ...input })),
    hiddenInputIds: [...schema.hiddenInputIds],
    outputs: VIDEO_GENERATOR_OUTPUTS.map((output) => ({ ...output })),
    preview: data.preview ?? { type: 'placeholder', text: 'Describe the video you want to generate...' },
    supportsElementLibrary: videoModelSupportsKlingElements(selectedModel),
    attachedElementLibraryItems: normalizeElementLibrarySelection(data.attachedElementLibraryItems ?? []),
    controls: schemaControls.filter((control) => {
      const prefix = getControlPrefix(control.id);
      return prefix ? schema.visibleControlPrefixes.includes(prefix) : true;
    })
  };

  return (
    <MainNode
      id={id}
      data={normalizedData}
      isConnectable={isConnectable}
      selected={selected}
    />
  );
}
