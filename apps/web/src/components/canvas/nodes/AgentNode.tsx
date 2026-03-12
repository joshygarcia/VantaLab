import { MainNode, type BaseNodeData } from './MainNode';
import { calculateWorkflowCreditCost } from '../workflow-credit-cost';
import {
  AGENT_MODEL_OPTIONS,
  DEFAULT_AGENT_MODEL,
  REASONING_EFFORT_OPTIONS,
  applyNodeUiSchemaToControls,
  getAgentNodeUiSchema,
  getControlPrefix
} from '../kie-model-catalog';

type AgentNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const AGENT_INPUTS: NonNullable<BaseNodeData['inputs']> = [
  { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
  { id: 'image-in', label: 'Image', type: 'image' }
];

const AGENT_OUTPUTS: NonNullable<BaseNodeData['outputs']> = [
  { id: 'prompt-out', label: 'Prompt', type: 'prompt' }
];

const hasControl = (controls: NonNullable<BaseNodeData['controls']>, prefix: string) =>
  controls.some((control) => control.id.startsWith(prefix));

export function AgentNode({ id, data, isConnectable, selected = false }: AgentNodeProps) {
  const controls = [...(data.controls ?? [])];
  const normalizedControls: NonNullable<BaseNodeData['controls']> = [...controls];

  if (!hasControl(normalizedControls, 'prompt_')) {
    normalizedControls.unshift({
      type: 'textarea',
      id: `prompt_${id}`,
      value: typeof data.text === 'string' ? data.text : '',
      placeholder: 'Ask the model to write, summarize, or transform...'
    });
  }

  if (!hasControl(normalizedControls, 'model_')) {
    normalizedControls.push({
      type: 'select',
      id: `model_${id}`,
      value: DEFAULT_AGENT_MODEL,
      options: [...AGENT_MODEL_OPTIONS]
    });
  }

  if (!hasControl(normalizedControls, 'reasoning_')) {
    normalizedControls.push({
      type: 'select',
      id: `reasoning_${id}`,
      value: 'high',
      options: [...REASONING_EFFORT_OPTIONS]
    });
  }

  const modelControl = normalizedControls.find((control) => control.type === 'select' && control.id.startsWith('model_'));
  const selectedModel = modelControl?.type === 'select' ? modelControl.value : DEFAULT_AGENT_MODEL;
  const schema = getAgentNodeUiSchema(selectedModel);
  const schemaControls = applyNodeUiSchemaToControls(normalizedControls, schema) as NonNullable<BaseNodeData['controls']>;
  const promptControl = schemaControls.find((control) => control.type === 'textarea' && control.id.startsWith('prompt_'));
  const promptValue = promptControl?.type === 'textarea' ? promptControl.value : (typeof data.text === 'string' ? data.text : '');

  const creditCost = calculateWorkflowCreditCost(selectedModel, {
    prompt: promptValue
  });

  const normalizedData: BaseNodeData = {
    ...data,
    title: 'Agent',
    label: 'Agent',
    icon: 'align-left',
    runnable: true,
    creditCost,
    inputs: AGENT_INPUTS.map((input) => ({ ...input })),
    hiddenInputIds: [...schema.hiddenInputIds],
    outputs: AGENT_OUTPUTS.map((output) => ({ ...output })),
    preview: data.preview ?? { type: 'placeholder', text: data.outputText ?? 'Ask the model to produce text.' },
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
