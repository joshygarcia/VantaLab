export const FEATURED_TEMPLATE_KEYS = [
  'influencer-launch',
  'product-story',
  'content-batch'
] as const;

export type FeaturedTemplateKey = (typeof FEATURED_TEMPLATE_KEYS)[number];

type TemplateNode = Record<string, unknown>;
type TemplateEdge = Record<string, unknown>;

export type TemplateCanvasState = {
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
};

export type FeaturedTemplateDefinition = {
  key: FeaturedTemplateKey;
  name: string;
  description: string;
  buildCanvas: (cloneIdPrefix: string) => TemplateCanvasState;
};

const DEFAULT_TEXT_PROMPT_NODE_SIZE = { width: 360, height: 320 } as const;
const DEFAULT_IMAGE_GENERATOR_NODE_SIZE = { width: 540, height: 560 } as const;
const DEFAULT_VIDEO_GENERATOR_NODE_SIZE = { width: 540, height: 620 } as const;
const DEFAULT_AGENT_NODE_SIZE = { width: 360, height: 360 } as const;

const DEFAULT_IMAGE_MODEL = 'nano-banana-pro';
const DEFAULT_VIDEO_MODEL = 'kling-3.0/video';
const DEFAULT_AGENT_MODEL = 'gpt-5-2';

const selectOption = (label: string, value: string) => ({ label, value });

const createTextPromptNode = (
  nodeId: string,
  position: { x: number; y: number },
  prompt: string
): TemplateNode => ({
  id: nodeId,
  type: 'text-prompt',
  position,
  style: { ...DEFAULT_TEXT_PROMPT_NODE_SIZE },
  data: {
    title: 'Text Prompt',
    label: 'Text Prompt',
    icon: 'text',
    status: 'idle',
    runnable: false,
    controls: [
      {
        type: 'textarea',
        id: `text_prompt_${nodeId}`,
        value: prompt,
        placeholder: 'Write your prompt...'
      }
    ],
    outputs: [{ id: 'prompt-out', label: 'Prompt', type: 'prompt' }]
  }
});

const createAgentNode = (
  nodeId: string,
  position: { x: number; y: number },
  prompt: string
): TemplateNode => ({
  id: nodeId,
  type: 'agent',
  position,
  style: { ...DEFAULT_AGENT_NODE_SIZE },
  data: {
    title: 'Agent',
    label: 'Agent',
    icon: 'align-left',
    status: 'idle',
    runnable: true,
    controls: [
      {
        type: 'textarea',
        id: `prompt_${nodeId}`,
        value: prompt,
        placeholder: 'Ask the model to write, summarize, or transform...'
      },
      {
        type: 'select',
        id: `model_${nodeId}`,
        value: DEFAULT_AGENT_MODEL,
        options: [selectOption('GPT-5.2', DEFAULT_AGENT_MODEL)]
      },
      {
        type: 'select',
        id: `reasoning_${nodeId}`,
        value: 'high',
        options: [selectOption('High', 'high')]
      }
    ],
    inputs: [
      { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
      { id: 'image-in', label: 'Image', type: 'image' }
    ],
    outputs: [{ id: 'prompt-out', label: 'Prompt', type: 'prompt' }],
    preview: { type: 'placeholder', text: 'Ask the model to produce text.' }
  }
});

const createImageGeneratorNode = (
  nodeId: string,
  position: { x: number; y: number },
  prompt = ''
): TemplateNode => ({
  id: nodeId,
  type: 'image-generator',
  position,
  style: { ...DEFAULT_IMAGE_GENERATOR_NODE_SIZE },
  data: {
    title: 'Image Generator',
    label: 'Image Generator',
    icon: 'image',
    status: 'idle',
    runnable: true,
    controls: [
      {
        type: 'textarea',
        id: `prompt_${nodeId}`,
        value: prompt,
        placeholder: 'Describe the image you want to generate...'
      },
      {
        type: 'select',
        id: `model_${nodeId}`,
        value: DEFAULT_IMAGE_MODEL,
        options: [selectOption('Nano Banana Pro', DEFAULT_IMAGE_MODEL)]
      },
      {
        type: 'select',
        id: `aspect_${nodeId}`,
        value: '1:1',
        options: [selectOption('1:1', '1:1')]
      },
      {
        type: 'select',
        id: `res_${nodeId}`,
        value: '1K',
        options: [selectOption('1K', '1K')]
      },
      {
        type: 'select',
        id: `outfmt_${nodeId}`,
        value: 'png',
        options: [selectOption('PNG', 'png')]
      }
    ],
    inputs: [
      { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
      { id: 'image-in', label: 'Image', type: 'image' }
    ],
    outputs: [{ id: 'image-out', label: 'Image', type: 'image' }],
    preview: { type: 'placeholder', text: 'Describe the image you want to generate...' }
  }
});

const createVideoGeneratorNode = (
  nodeId: string,
  position: { x: number; y: number },
  prompt = ''
): TemplateNode => ({
  id: nodeId,
  type: 'video-generator',
  position,
  style: { ...DEFAULT_VIDEO_GENERATOR_NODE_SIZE },
  data: {
    title: 'Video Generator',
    label: 'Video Generator',
    icon: 'video',
    status: 'idle',
    runnable: true,
    supportsElementLibrary: true,
    attachedElementLibraryItems: [],
    controls: [
      {
        type: 'textarea',
        id: `prompt_${nodeId}`,
        value: prompt,
        placeholder: 'Describe the video you want to generate...'
      },
      {
        type: 'select',
        id: `model_${nodeId}`,
        value: DEFAULT_VIDEO_MODEL,
        options: [selectOption('Kling 3.0', DEFAULT_VIDEO_MODEL)]
      },
      {
        type: 'select',
        id: `aspect_${nodeId}`,
        value: '16:9',
        options: [selectOption('16:9', '16:9')]
      },
      {
        type: 'select',
        id: `duration_${nodeId}`,
        value: '5',
        options: [selectOption('5', '5')]
      },
      {
        type: 'select',
        id: `mode_${nodeId}`,
        value: 'pro',
        options: [selectOption('Pro', 'pro')]
      },
      {
        type: 'select',
        id: `sound_${nodeId}`,
        value: 'false',
        options: [selectOption('Off', 'false')]
      },
      {
        type: 'select',
        id: `char_orient_${nodeId}`,
        value: 'video',
        options: [selectOption('Video', 'video')]
      },
      {
        type: 'select',
        id: `multi_shots_${nodeId}`,
        value: 'false',
        options: [selectOption('Off', 'false')]
      },
      {
        type: 'textarea',
        id: `multi_prompt_${nodeId}`,
        value: '',
        placeholder: 'Shot prompt | duration'
      },
      {
        type: 'select',
        id: `vres_${nodeId}`,
        value: '480p',
        options: [selectOption('480p', '480p')]
      }
    ],
    inputs: [
      { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
      { id: 'image-in', label: 'Image', type: 'image' },
      { id: 'video-in', label: 'Video', type: 'video' },
      { id: 'multi-prompt-in', label: 'Multi-shot', type: 'prompt' },
      { id: 'kling-elements-in', label: 'Elements', type: 'asset' }
    ],
    outputs: [{ id: 'video-out', label: 'Video', type: 'video' }],
    preview: { type: 'placeholder', text: 'Describe the video you want to generate...' }
  }
});

const createEdge = (
  edgeId: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
  connectionType: 'prompt' | 'image'
): TemplateEdge => ({
  id: edgeId,
  type: 'connection',
  source,
  target,
  sourceHandle,
  targetHandle,
  data: {
    connectionType
  }
});

const influencerLaunchCanvas = (cloneIdPrefix: string): TemplateCanvasState => {
  const campaignBriefId = `${cloneIdPrefix}_campaign_brief`;
  const personaBuilderId = `${cloneIdPrefix}_persona_builder`;
  const heroImageId = `${cloneIdPrefix}_hero_image`;
  const launchClipPromptId = `${cloneIdPrefix}_launch_clip_prompt`;
  const launchVideoId = `${cloneIdPrefix}_launch_video`;

  return {
    nodes: [
      createTextPromptNode(
        campaignBriefId,
        { x: 0, y: 120 },
        'Define the influencer launch goal, audience, tone, product angle, and visual hooks.'
      ),
      createAgentNode(
        personaBuilderId,
        { x: 360, y: 0 },
        'Turn the connected campaign brief into a polished creator portrait prompt with wardrobe, lighting, expression, and environment details.'
      ),
      createImageGeneratorNode(heroImageId, { x: 760, y: -20 }),
      createAgentNode(
        launchClipPromptId,
        { x: 360, y: 260 },
        'Write a short launch video prompt based on the connected campaign brief. Focus on hook, camera movement, mood, and CTA energy.'
      ),
      createVideoGeneratorNode(launchVideoId, { x: 760, y: 240 })
    ],
    edges: [
      createEdge('edge_campaign_to_persona', campaignBriefId, personaBuilderId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_persona_to_image', personaBuilderId, heroImageId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_campaign_to_launch', campaignBriefId, launchClipPromptId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_image_to_video', heroImageId, launchVideoId, 'image-out', 'image-in', 'image'),
      createEdge('edge_prompt_to_video', launchClipPromptId, launchVideoId, 'prompt-out', 'prompt-in', 'prompt')
    ],
    viewport: {
      x: -60,
      y: 40,
      zoom: 0.82
    }
  };
};

const productStoryCanvas = (cloneIdPrefix: string): TemplateCanvasState => {
  const productBriefId = `${cloneIdPrefix}_product_brief`;
  const heroConceptId = `${cloneIdPrefix}_hero_concept`;
  const heroImageId = `${cloneIdPrefix}_hero_image`;
  const storyAngleId = `${cloneIdPrefix}_story_angle`;
  const storyVideoId = `${cloneIdPrefix}_story_video`;

  return {
    nodes: [
      createTextPromptNode(
        productBriefId,
        { x: 0, y: 140 },
        'Describe the product, customer problem, differentiators, launch message, and desired emotional response.'
      ),
      createAgentNode(
        heroConceptId,
        { x: 360, y: 0 },
        'Transform the connected product brief into a premium product hero image prompt with composition, materials, lighting, and background direction.'
      ),
      createImageGeneratorNode(heroImageId, { x: 760, y: -20 }),
      createAgentNode(
        storyAngleId,
        { x: 360, y: 280 },
        'Using the connected brief and reference image, write a product story video prompt with narrative arc, camera movement, and emotional payoff.'
      ),
      createVideoGeneratorNode(storyVideoId, { x: 780, y: 250 })
    ],
    edges: [
      createEdge('edge_brief_to_concept', productBriefId, heroConceptId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_concept_to_image', heroConceptId, heroImageId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_brief_to_story', productBriefId, storyAngleId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_image_to_story', heroImageId, storyAngleId, 'image-out', 'image-in', 'image'),
      createEdge('edge_story_to_video', storyAngleId, storyVideoId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_hero_to_video', heroImageId, storyVideoId, 'image-out', 'image-in', 'image')
    ],
    viewport: {
      x: -60,
      y: 70,
      zoom: 0.8
    }
  };
};

const contentBatchCanvas = (cloneIdPrefix: string): TemplateCanvasState => {
  const contentBriefId = `${cloneIdPrefix}_content_brief`;
  const strategistId = `${cloneIdPrefix}_strategist`;
  const postAPromptId = `${cloneIdPrefix}_post_a_prompt`;
  const postAImageId = `${cloneIdPrefix}_post_a_image`;
  const postBPromptId = `${cloneIdPrefix}_post_b_prompt`;
  const postBImageId = `${cloneIdPrefix}_post_b_image`;
  const shortVideoScriptId = `${cloneIdPrefix}_short_video_script`;
  const weeklyVideoId = `${cloneIdPrefix}_weekly_video`;

  return {
    nodes: [
      createTextPromptNode(
        contentBriefId,
        { x: 0, y: 280 },
        'Outline this week’s campaign themes, audience segments, offers, content pillars, and required outputs.'
      ),
      createAgentNode(
        strategistId,
        { x: 360, y: 160 },
        'Break the connected weekly brief into distinct content angles for social posts and one short video concept.'
      ),
      createAgentNode(
        postAPromptId,
        { x: 760, y: 0 },
        'Write the creative prompt for post A based on the connected content strategy. Keep it visual, concise, and conversion-aware.'
      ),
      createImageGeneratorNode(postAImageId, { x: 1160, y: -20 }),
      createAgentNode(
        postBPromptId,
        { x: 760, y: 260 },
        'Write the creative prompt for post B using a different hook and angle from the connected content strategy.'
      ),
      createImageGeneratorNode(postBImageId, { x: 1160, y: 240 }),
      createAgentNode(
        shortVideoScriptId,
        { x: 760, y: 520 },
        'Write a short video generation prompt from the connected content strategy with pacing, motion, and scene direction.'
      ),
      createVideoGeneratorNode(weeklyVideoId, { x: 1160, y: 500 })
    ],
    edges: [
      createEdge('edge_brief_to_strategy', contentBriefId, strategistId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_strategy_to_post_a', strategistId, postAPromptId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_strategy_to_post_b', strategistId, postBPromptId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_strategy_to_video_script', strategistId, shortVideoScriptId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_post_a_to_image', postAPromptId, postAImageId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_post_b_to_image', postBPromptId, postBImageId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_video_script_to_video', shortVideoScriptId, weeklyVideoId, 'prompt-out', 'prompt-in', 'prompt'),
      createEdge('edge_post_a_image_to_video', postAImageId, weeklyVideoId, 'image-out', 'image-in', 'image')
    ],
    viewport: {
      x: -80,
      y: 120,
      zoom: 0.64
    }
  };
};

const FEATURED_TEMPLATE_REGISTRY: Record<FeaturedTemplateKey, FeaturedTemplateDefinition> = {
  'influencer-launch': {
    key: 'influencer-launch',
    name: 'Influencer Launch Space',
    description: 'Pipeline for creating influencer portraits, clips, and publish-ready assets.',
    buildCanvas: influencerLaunchCanvas
  },
  'product-story': {
    key: 'product-story',
    name: 'Product Story Space',
    description: 'Generate product hero images and short narrative videos for campaigns.',
    buildCanvas: productStoryCanvas
  },
  'content-batch': {
    key: 'content-batch',
    name: 'Content Batch Space',
    description: 'Batch-ready setup for weekly content production in one shared workspace.',
    buildCanvas: contentBatchCanvas
  }
};

export const getFeaturedTemplateDefinition = (templateKey: FeaturedTemplateKey) =>
  FEATURED_TEMPLATE_REGISTRY[templateKey];

