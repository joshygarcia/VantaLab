import { MainNode, type BaseNodeData } from './MainNode';
import { calculateWorkflowCreditCost } from '../workflow-credit-cost';
import {
  DEFAULT_IMAGE_MODEL,
  IMAGE_MODEL_OPTIONS,
  IMAGE_RESOLUTION_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  WIDE_ASPECT_RATIO_OPTIONS,
  applyNodeUiSchemaToControls,
  getControlPrefix,
  getImageNodeUiSchema,
  normalizeSchemaSelectValue
} from '../kie-model-catalog';

type ImageGeneratorNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const IMAGE_GENERATOR_INPUTS: NonNullable<BaseNodeData['inputs']> = [
  { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
  { id: 'image-in', label: 'Image', type: 'image' }
];

const IMAGE_GENERATOR_OUTPUTS: NonNullable<BaseNodeData['outputs']> = [
  { id: 'image-out', label: 'Image', type: 'image' }
];

const hasControl = (controls: NonNullable<BaseNodeData['controls']>, prefix: string) =>
  controls.some((control) => control.id.startsWith(prefix));

export function ImageGeneratorNode({ id, data, isConnectable, selected = false }: ImageGeneratorNodeProps) {
  const controls = [...(data.controls ?? [])];
  const normalizedControls: NonNullable<BaseNodeData['controls']> = [...controls];

  if (!hasControl(normalizedControls, 'prompt_')) {
    normalizedControls.unshift({
      type: 'textarea',
      id: `prompt_${id}`,
      value: typeof data.text === 'string' ? data.text : '',
      placeholder: 'Describe the image you want to generate...'
    });
  }

  if (!hasControl(normalizedControls, 'model_')) {
    normalizedControls.push({
      type: 'select',
      id: `model_${id}`,
      value: DEFAULT_IMAGE_MODEL,
      options: [...IMAGE_MODEL_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'aspect_')) {
    normalizedControls.push({
      type: 'select',
      id: `aspect_${id}`,
      value: '1:1',
      options: [...WIDE_ASPECT_RATIO_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'res_')) {
    normalizedControls.push({
      type: 'select',
      id: `res_${id}`,
      value: '1K',
      options: [...IMAGE_RESOLUTION_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'outfmt_')) {
    normalizedControls.push({
      type: 'select',
      id: `outfmt_${id}`,
      value: 'png',
      options: [...OUTPUT_FORMAT_OPTIONS]
    });
  }

  const readRawSelectValue = (prefix: string) => {
    const control = normalizedControls.find((entry) => entry.type === 'select' && entry.id.startsWith(prefix));
    if (control?.type === 'select' && typeof control.value === 'string' && control.value.trim().length > 0) {
      return control.value;
    }
    return undefined;
  };

  const selectedModel = readRawSelectValue('model_') ?? DEFAULT_IMAGE_MODEL;
  const schema = getImageNodeUiSchema(selectedModel);
  const schemaControls = applyNodeUiSchemaToControls(normalizedControls, schema) as NonNullable<BaseNodeData['controls']>;

  const creditCost = calculateWorkflowCreditCost(selectedModel, {
    aspectRatio: normalizeSchemaSelectValue(schema, 'aspect_', readRawSelectValue('aspect_')),
    resolution: normalizeSchemaSelectValue(schema, 'res_', readRawSelectValue('res_')),
    amount: 1
  });

  const normalizedData: BaseNodeData = {
    ...data,
    title: 'Image Generator',
    label: 'Image Generator',
    icon: 'image',
    runnable: true,
    creditCost,
    inputs: IMAGE_GENERATOR_INPUTS.map((input) => ({ ...input })),
    hiddenInputIds: [...schema.hiddenInputIds],
    outputs: IMAGE_GENERATOR_OUTPUTS.map((output) => ({ ...output })),
    preview: data.preview ?? { type: 'placeholder', text: 'Describe the image you want to generate...' },
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
