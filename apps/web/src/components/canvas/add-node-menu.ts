export type AddNodeType = 'text-prompt' | 'image-generator' | 'video-generator' | 'agent';

export type NodeMenuGroup = 'basics' | 'media' | 'identity';

export type NodeMenuItem = {
  type: AddNodeType;
  label: string;
  group: NodeMenuGroup;
  badge?: string;
};

export const ADD_NODE_MENU_ITEMS: NodeMenuItem[] = [
  { type: 'text-prompt', label: 'Text Prompt', group: 'basics' },
  { type: 'image-generator', label: 'Image Generator', group: 'media' },
  { type: 'video-generator', label: 'Video Generator', group: 'media' },
  { type: 'agent', label: 'Agent', group: 'basics' }
];
