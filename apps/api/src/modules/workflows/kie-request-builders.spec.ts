import { buildKieApiRequest } from './kie-request-builders';

describe('buildKieApiRequest', () => {
  it('maps google/nano-banana to the market createTask payload shape', () => {
    expect(buildKieApiRequest({
      model: 'google/nano-banana',
      parameters: {
        prompt: 'A surreal painting of a giant banana floating in space.',
        aspectRatio: '16:9',
        outputFormat: 'png'
      }
    })).toEqual({
      endpoint: '/api/v1/jobs/createTask',
      body: {
        model: 'google/nano-banana',
        input: {
          prompt: 'A surreal painting of a giant banana floating in space.',
          image_size: '16:9',
          output_format: 'png'
        }
      }
    });
  });

  it('maps kling-3.0/video to the unified market payload shape', () => {
    expect(buildKieApiRequest({
      model: 'kling-3.0/video',
      parameters: {
        prompt: 'A happy dog runs through a sunlit field.',
        referenceImageUrl: 'https://example.com/first-frame.png',
        duration: '5',
        mode: 'pro',
        sound: true
      }
    })).toEqual({
      endpoint: '/api/v1/jobs/createTask',
      body: {
        model: 'kling-3.0/video',
        input: {
          prompt: 'A happy dog runs through a sunlit field.',
          image_urls: ['https://example.com/first-frame.png'],
          duration: '5',
          mode: 'pro',
          sound: true
        }
      }
    });
  });

  it('maps kling-2.6/motion-control to the specialized payload shape', () => {
    expect(buildKieApiRequest({
      model: 'kling-2.6/motion-control',
      parameters: {
        prompt: 'Turn the still portrait into a dancing clip.',
        referenceImageUrl: 'https://example.com/reference.png',
        referenceVideoUrl: 'https://example.com/motion.mp4',
        mode: '1080p',
        characterOrientation: 'image'
      }
    })).toEqual({
      endpoint: '/api/v1/jobs/createTask',
      body: {
        model: 'kling-2.6/motion-control',
        input: {
          prompt: 'Turn the still portrait into a dancing clip.',
          input_urls: ['https://example.com/reference.png'],
          video_urls: ['https://example.com/motion.mp4'],
          mode: '1080p',
          character_orientation: 'image'
        }
      }
    });
  });

  it('passes through the selected Grok video resolution when supported', () => {
    expect(buildKieApiRequest({
      model: 'grok-imagine/text-to-video',
      parameters: {
        prompt: 'A neon train races through a rainy cyberpunk city.',
        aspectRatio: '16:9',
        mode: 'spicy',
        duration: '10',
        resolution: '720p'
      }
    })).toEqual({
      endpoint: '/api/v1/jobs/createTask',
      body: {
        model: 'grok-imagine/text-to-video',
        input: {
          prompt: 'A neon train races through a rainy cyberpunk city.',
          aspect_ratio: '16:9',
          mode: 'spicy',
          duration: '10',
          resolution: '720p'
        }
      }
    });
  });

  it('maps gpt-5-2 to a chat completions payload', () => {
    expect(buildKieApiRequest({
      model: 'gpt-5-2',
      parameters: {
        prompt: 'What is in this image?',
        referenceImageUrl: 'https://example.com/input.png',
        reasoningEffort: 'high'
      }
    })).toEqual({
      endpoint: '/gpt-5-2/v1/chat/completions',
      body: {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is in this image?' },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://example.com/input.png'
                }
              }
            ]
          }
        ],
        stream: false,
        reasoning_effort: 'high'
      }
    });
  });
});
