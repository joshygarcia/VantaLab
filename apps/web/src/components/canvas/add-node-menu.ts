export type AddNodeType =
  | 'text'
  | 'prompt-list'
  | 'image-list'
  | 'image-generator'
  | 'video-generator'
  | 'download'
  | 'assistant'
  | 'upscaler'
  | 'list'
  | 'upload'
  | 'assets'
  | 'inspiration'
  | 'identity-vault';

export type NodeMenuGroup = 'basics' | 'media' | 'identity';

export type NodeMenuItem = {
  type: AddNodeType;
  label: string;
  group: NodeMenuGroup;
  badge?: string;
};

export const ADD_NODE_MENU_ITEMS: NodeMenuItem[] = [
  { type: 'identity-vault', label: 'Identity Vault', group: 'identity', badge: 'New' },
  { type: 'text', label: 'Text', group: 'basics' },
  { type: 'prompt-list', label: 'Prompt List', group: 'basics' },
  { type: 'image-list', label: 'Image List', group: 'basics' },
  { type: 'image-generator', label: 'Image Generator', group: 'media' },
  { type: 'video-generator', label: 'Video Generator', group: 'media' },
  { type: 'download', label: 'Download', group: 'media' },
  { type: 'assistant', label: 'Assistant', group: 'basics' },
  { type: 'upscaler', label: 'Image Upscaler', group: 'media' },
  { type: 'list', label: 'List', group: 'basics', badge: 'New' },
  { type: 'upload', label: 'Upload', group: 'media' },
  { type: 'assets', label: 'Assets', group: 'media' },
  { type: 'inspiration', label: 'Find Inspiration', group: 'media', badge: 'New' }
];
