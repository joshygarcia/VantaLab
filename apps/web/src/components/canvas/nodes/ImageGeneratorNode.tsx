import { MainNode, type BaseNodeData } from './MainNode';
import { calculateWorkflowCreditCost } from '../workflow-credit-cost';

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
      value: 'nano-banana-pro',
      options: [
        { label: 'Nano Banana Pro', value: 'nano-banana-pro' },
        { label: 'Z-Image', value: 'z-image' }
      ]
    });
  }

  if (!hasControl(normalizedControls, 'aspect_')) {
    normalizedControls.push({
      type: 'select',
      id: `aspect_${id}`,
      value: '1:1',
      options: [
        { label: '1:1', value: '1:1' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' }
      ]
    });
  }

  if (!hasControl(normalizedControls, 'res_')) {
    normalizedControls.push({
      type: 'select',
      id: `res_${id}`,
      value: '1K',
      options: [
        { label: '1K', value: '1K' },
        { label: '2K', value: '2K' },
        { label: '4K', value: '4K' }
      ]
    });
  }

  if (!hasControl(normalizedControls, 'amount_')) {
    normalizedControls.push({
      type: 'select',
      id: `amount_${id}`,
      value: '1',
      options: [
        { label: 'x1', value: '1' },
        { label: 'x2', value: '2' },
        { label: 'x3', value: '3' },
        { label: 'x4', value: '4' }
      ]
    });
  }

  if (!hasControl(normalizedControls, 'outfmt_')) {
    normalizedControls.push({
      type: 'select',
      id: `outfmt_${id}`,
      value: 'png',
      options: [
        { label: 'PNG', value: 'png' },
        { label: 'JPG', value: 'jpg' }
      ]
    });
  }

  const readSelectValue = (prefix: string, fallback: string) => {
    const control = normalizedControls.find((entry) => entry.type === 'select' && entry.id.startsWith(prefix));
    if (control?.type === 'select' && typeof control.value === 'string' && control.value.trim().length > 0) {
      return control.value;
    }
    return fallback;
  };

  const amountValue = Number.parseInt(readSelectValue('amount_', '1'), 10);
  const creditCost = calculateWorkflowCreditCost(readSelectValue('model_', 'nano-banana-pro'), {
    aspectRatio: readSelectValue('aspect_', '1:1'),
    resolution: readSelectValue('res_', '1K'),
    amount: Number.isFinite(amountValue) && amountValue > 0 ? amountValue : 1
  });

  const normalizedData: BaseNodeData = {
    ...data,
    title: 'Image Generator',
    label: 'Image Generator',
    icon: 'image',
    runnable: true,
    creditCost,
    inputs: IMAGE_GENERATOR_INPUTS.map((input) => ({ ...input })),
    outputs: IMAGE_GENERATOR_OUTPUTS.map((output) => ({ ...output })),
    preview: data.preview ?? { type: 'placeholder', text: 'Describe the image you want to generate...' },
    controls: normalizedControls
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
