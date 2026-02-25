import { MainNode, type BaseNodeData } from './MainNode';

type TextPromptNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const TEXT_PROMPT_OUTPUT: NonNullable<BaseNodeData['outputs']>[number] = {
  id: 'prompt-out',
  label: 'Prompt',
  type: 'prompt'
};

const isPrimaryTextControlId = (controlId: string) =>
  controlId === 'text' || controlId.startsWith('text_');

export function TextPromptNode({ id, data, isConnectable, selected = false }: TextPromptNodeProps) {
  const controls = data.controls ?? [];
  const existingPrimaryTextControl = controls.find(
    (control) => control.type === 'textarea' && isPrimaryTextControlId(control.id)
  );

  const textValue =
    typeof data.text === 'string'
      ? data.text
      : existingPrimaryTextControl?.type === 'textarea'
        ? existingPrimaryTextControl.value
        : '';

  const normalizedControlId =
    existingPrimaryTextControl?.type === 'textarea'
      ? existingPrimaryTextControl.id
      : `text_prompt_${id}`;

  const normalizedData: BaseNodeData = {
    ...data,
    title: 'Text Prompt',
    label: 'Text Prompt',
    icon: 'text',
    runnable: false,
    text: textValue,
    inputs: [],
    outputs: [{ ...TEXT_PROMPT_OUTPUT }],
    controls: [
      {
        type: 'textarea',
        id: normalizedControlId,
        value: textValue,
        placeholder: 'Write your prompt...'
      }
    ]
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
