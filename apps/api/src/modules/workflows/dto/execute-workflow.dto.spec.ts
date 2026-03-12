import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ExecuteWorkflowDto } from './execute-workflow.dto';

const createBasePayload = () => ({
  workspaceId: 'ws_1',
  nodeId: 'node_1',
  model: 'z-image',
  parameters: {
    prompt: 'hero frame',
    aspectRatio: '1:1'
  }
});

const validatePayload = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(ExecuteWorkflowDto, payload));

describe('ExecuteWorkflowDto', () => {
  it('accepts the expanded set of supported model ids', async () => {
    const supportedModels = [
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
      'grok-imagine/image-to-image',
      'kling-3.0/video',
      'kling-2.6/motion-control',
      'sora-2-text-to-video',
      'sora-2-image-to-video',
      'veo3_fast',
      'veo3',
      'gpt-5-2'
    ];

    for (const model of supportedModels) {
      const parameters = model === 'kling-2.6/motion-control'
        ? {
            prompt: 'turn the still portrait into a dancing clip',
            referenceImageUrl: 'https://example.com/reference.png',
            referenceVideoUrl: 'https://example.com/motion.mp4',
            mode: '720p',
            characterOrientation: 'image'
          }
        : {
            prompt: 'hero frame',
            aspectRatio: '1:1'
          };

      const errors = await validatePayload({
        ...createBasePayload(),
        model,
        parameters
      });

      expect(errors).toHaveLength(0);
    }
  });

  it('rejects motion control requests without the required video-specific fields', async () => {
    const errors = await validatePayload({
      ...createBasePayload(),
      model: 'kling-2.6/motion-control',
      parameters: {
        prompt: 'turn the still portrait into a dancing clip',
        referenceImageUrl: 'https://example.com/reference.png'
      }
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('referenceVideoUrl');
    expect(serialized).toContain('characterOrientation');
    expect(serialized).toContain('mode');
  });

  it('rejects unsupported motion control mode values', async () => {
    const errors = await validatePayload({
      ...createBasePayload(),
      model: 'kling-2.6/motion-control',
      parameters: {
        prompt: 'turn the still portrait into a dancing clip',
        referenceImageUrl: 'https://example.com/reference.png',
        referenceVideoUrl: 'https://example.com/motion.mp4',
        mode: 'pro',
        characterOrientation: 'image'
      }
    });

    expect(JSON.stringify(errors)).toContain('selected model');
  });

  it('accepts model-specific video duration and mode values', async () => {
    const payloads = [
      {
        model: 'grok-imagine/text-to-video',
        parameters: {
          prompt: 'Animate a camera flythrough over a moonlit canyon.',
          aspectRatio: '16:9',
          duration: '10',
          mode: 'spicy',
          resolution: '720p'
        }
      },
      {
        model: 'grok-imagine/image-to-video',
        parameters: {
          prompt: 'Make the portrait turn toward the camera and smile.',
          referenceImageUrl: 'https://example.com/portrait.png',
          duration: '6',
          mode: 'normal',
          resolution: '480p'
        }
      },
      {
        model: 'kling-2.6/motion-control',
        parameters: {
          prompt: 'Transfer the dance performance onto the character.',
          referenceImageUrl: 'https://example.com/reference.png',
          referenceVideoUrl: 'https://example.com/motion.mp4',
          duration: '30',
          mode: '1080p',
          characterOrientation: 'video'
        }
      }
    ];

    for (const payload of payloads) {
      const errors = await validatePayload({
        ...createBasePayload(),
        ...payload
      });

      expect(errors).toHaveLength(0);
    }
  });
});
