import { isAgentModel, requiresImageInput, requiresVideoInput } from './kie-model-catalog';

type WorkflowRequestParameters = {
  prompt: string;
  referenceImageUrl?: string;
  referenceVideoUrl?: string;
  aspectRatio?: string;
  duration?: string;
  mode?: string;
  outputFormat?: 'png' | 'jpg';
  resolution?: string;
  sound?: boolean;
  characterOrientation?: 'image' | 'video' | string;
  reasoningEffort?: 'low' | 'high' | string;
  multiShots?: boolean;
  multiPrompt?: Array<{ prompt: string; duration: number }>;
  klingElements?: Array<{
    name: string;
    description?: string;
    elementInputUrls?: string[];
    elementInputVideoUrls?: string[];
  }>;
};

type BuildKieApiRequestInput = {
  model: string;
  parameters: WorkflowRequestParameters;
};

type KieApiRequest = {
  endpoint: string;
  body: Record<string, unknown>;
};

const CHAT_COMPLETIONS_ENDPOINT_BY_MODEL: Record<string, string> = {
  'gpt-5-2': '/gpt-5-2/v1/chat/completions',
  'gemini-2.5-flash': '/gemini-2.5-flash/v1/chat/completions',
  'gemini-2.5-pro': '/gemini-2.5-pro/v1/chat/completions',
  'gemini-3-flash': '/gemini-3-flash/v1/chat/completions',
  'gemini-3-pro': '/gemini-3-pro/v1/chat/completions'
};

const MARKET_CREATE_TASK_ENDPOINT = '/api/v1/jobs/createTask';

const normalizeJpegOutputFormat = (value?: 'png' | 'jpg') => {
  if (value === 'jpg') {
    return 'jpeg';
  }

  return value ?? 'png';
};

const normalizeJpgOutputFormat = (value?: 'png' | 'jpg') => {
  if (value === 'jpg') {
    return 'jpg';
  }

  return value ?? 'png';
};

const normalizeVideoDuration = (value?: string, fallback = '5') => {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return String(parsed);
};

const normalizeSoraFrames = (duration?: string) => {
  const seconds = Number.parseInt(duration ?? '10', 10);
  return seconds >= 15 ? '15' : '10';
};

const normalizeGrokVideoDuration = (duration?: string) => {
  const seconds = Number.parseInt(duration ?? '6', 10);
  return seconds >= 10 ? '10' : '6';
};

const normalizeGrokVideoMode = (mode?: string) => {
  if (mode === 'fun' || mode === 'normal' || mode === 'spicy') {
    return mode;
  }

  return 'normal';
};

const normalizeGrokVideoResolution = (resolution?: string) => (resolution === '720p' ? '720p' : '480p');

const normalizeKlingMode = (mode?: string) => (mode === 'std' ? 'std' : 'pro');

const normalizeMotionControlMode = (mode?: string) => (mode === '1080p' ? '1080p' : '720p');

const normalizeCharacterOrientation = (value?: string) => (value === 'image' ? 'image' : 'video');

const normalizeQwenImageSize = (aspectRatio?: string) => {
  switch (aspectRatio) {
    case '4:3':
      return 'landscape_4_3';
    case '3:4':
      return 'portrait_4_3';
    case '16:9':
      return 'landscape_16_9';
    case '9:16':
      return 'portrait_16_9';
    case '1:1':
    default:
      return 'square_hd';
  }
};

const normalizeSoraAspectRatio = (aspectRatio?: string) => {
  if (aspectRatio === '9:16' || aspectRatio === '3:4') {
    return 'portrait';
  }

  return 'landscape';
};

const normalizeImageAspectRatio = (aspectRatio?: string, fallback = '1:1') => {
  if (!aspectRatio?.trim()) {
    return fallback;
  }

  return aspectRatio;
};

const normalizeKlingElements = (elements?: WorkflowRequestParameters['klingElements']) =>
  (elements ?? [])
    .map((element) => {
      const name = typeof element.name === 'string' ? element.name.trim() : '';
      if (!name) {
        return null;
      }

      const description = typeof element.description === 'string' ? element.description.trim() : undefined;
      const imageUrls = Array.isArray(element.elementInputUrls)
        ? element.elementInputUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 4)
        : [];
      const videoUrls = Array.isArray(element.elementInputVideoUrls)
        ? element.elementInputVideoUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 1)
        : [];

      if (videoUrls.length > 0) {
        return {
          name,
          ...(description ? { description } : {}),
          element_input_video_urls: videoUrls
        };
      }

      if (imageUrls.length > 0) {
        return {
          name,
          ...(description ? { description } : {}),
          element_input_urls: imageUrls
        };
      }

      return null;
    })
    .filter((element): element is Exclude<typeof element, null> => element !== null);

const normalizeMultiPrompt = (items?: WorkflowRequestParameters['multiPrompt']) => {
  let remaining = 15;

  return (items ?? [])
    .map((item) => {
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
      if (!prompt || remaining <= 0) {
        return null;
      }

      const duration = Math.min(remaining, Math.max(1, Math.round(Number(item.duration) || 1)));
      remaining -= duration;

      return {
        prompt,
        duration
      };
    })
    .filter((item): item is { prompt: string; duration: number } => item !== null);
};

const buildUserMessageContent = (prompt: string, referenceImageUrl?: string) => {
  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: prompt
    }
  ];

  if (referenceImageUrl) {
    content.push({
      type: 'image_url',
      image_url: {
        url: referenceImageUrl
      }
    });
  }

  return content;
};

const assertRequiredInputs = (model: string, parameters: WorkflowRequestParameters) => {
  if (requiresImageInput(model) && !parameters.referenceImageUrl) {
    throw new Error(`${model} requires a reference image.`);
  }

  if (requiresVideoInput(model) && !parameters.referenceVideoUrl) {
    throw new Error(`${model} requires a reference video.`);
  }
};

export function buildKieApiRequest(input: BuildKieApiRequestInput): KieApiRequest {
  const { model, parameters } = input;

  assertRequiredInputs(model, parameters);

  if (isAgentModel(model)) {
    const body: Record<string, unknown> = {
      messages: [
        {
          role: 'user',
          content: buildUserMessageContent(parameters.prompt, parameters.referenceImageUrl)
        }
      ],
      stream: false,
      reasoning_effort: parameters.reasoningEffort ?? 'high'
    };

    if (model !== 'gpt-5-2') {
      body.include_thoughts = false;
    }

    return {
      endpoint: CHAT_COMPLETIONS_ENDPOINT_BY_MODEL[model],
      body
    };
  }

  if (model === 'google/nano-banana') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          image_size: parameters.aspectRatio === '16:9' || parameters.aspectRatio === '9:16' ? parameters.aspectRatio : '1:1',
          output_format: normalizeJpegOutputFormat(parameters.outputFormat)
        }
      }
    };
  }

  if (model === 'nano-banana-pro' || model === 'nano-banana-2') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          ...(parameters.referenceImageUrl ? { image_input: [parameters.referenceImageUrl] } : {}),
          aspect_ratio: normalizeImageAspectRatio(parameters.aspectRatio),
          ...(parameters.resolution ? { resolution: parameters.resolution } : {}),
          output_format: normalizeJpgOutputFormat(parameters.outputFormat)
        }
      }
    };
  }

  if (model === 'z-image') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          aspect_ratio: normalizeImageAspectRatio(parameters.aspectRatio)
        }
      }
    };
  }

  if (model === 'seedream/5-lite-text-to-image') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          aspect_ratio: normalizeImageAspectRatio(parameters.aspectRatio),
          quality: parameters.resolution === '4K' ? 'high' : 'basic'
        }
      }
    };
  }

  if (model === 'seedream/5-lite-image-to-image') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          image_urls: [parameters.referenceImageUrl],
          aspect_ratio: normalizeImageAspectRatio(parameters.aspectRatio),
          quality: parameters.resolution === '4K' ? 'high' : 'basic'
        }
      }
    };
  }

  if (model === 'qwen/text-to-image') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          image_size: normalizeQwenImageSize(parameters.aspectRatio),
          output_format: normalizeJpegOutputFormat(parameters.outputFormat)
        }
      }
    };
  }

  if (model === 'qwen/image-to-image' || model === 'qwen/image-edit') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          image_url: parameters.referenceImageUrl,
          ...(model === 'qwen/image-edit'
            ? { image_size: normalizeQwenImageSize(parameters.aspectRatio) }
            : {}),
          output_format: normalizeJpegOutputFormat(parameters.outputFormat)
        }
      }
    };
  }

  if (model === 'grok-imagine/text-to-image') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          aspect_ratio: normalizeImageAspectRatio(parameters.aspectRatio, '1:1')
        }
      }
    };
  }

  if (model === 'grok-imagine/image-to-image') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          image_urls: [parameters.referenceImageUrl]
        }
      }
    };
  }

  if (model === 'kling-3.0/video') {
    const multiShots = parameters.multiShots === true;
    const multiPrompt = normalizeMultiPrompt(parameters.multiPrompt);
    const klingElements = normalizeKlingElements(parameters.klingElements);

    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          ...(parameters.referenceImageUrl ? { image_urls: [parameters.referenceImageUrl] } : {}),
          ...(parameters.referenceImageUrl ? {} : { aspect_ratio: normalizeImageAspectRatio(parameters.aspectRatio, '16:9') }),
          duration: normalizeVideoDuration(parameters.duration, '5'),
          mode: normalizeKlingMode(parameters.mode),
          sound: multiShots ? true : (parameters.sound ?? false),
          ...(multiShots ? { multi_shots: true } : {}),
          ...(multiPrompt.length > 0 ? { multi_prompt: multiPrompt } : {}),
          ...(klingElements.length > 0 ? { kling_elements: klingElements } : {})
        }
      }
    };
  }

  if (model === 'kling-2.6/motion-control') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          input_urls: [parameters.referenceImageUrl],
          video_urls: [parameters.referenceVideoUrl],
          mode: normalizeMotionControlMode(parameters.mode),
          character_orientation: normalizeCharacterOrientation(parameters.characterOrientation)
        }
      }
    };
  }

  if (model === 'sora-2-text-to-video') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          aspect_ratio: normalizeSoraAspectRatio(parameters.aspectRatio),
          n_frames: normalizeSoraFrames(parameters.duration),
          remove_watermark: true,
          upload_method: 's3'
        }
      }
    };
  }

  if (model === 'sora-2-image-to-video') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          image_urls: [parameters.referenceImageUrl],
          aspect_ratio: normalizeSoraAspectRatio(parameters.aspectRatio),
          n_frames: normalizeSoraFrames(parameters.duration),
          remove_watermark: true,
          upload_method: 's3'
        }
      }
    };
  }

  if (model === 'grok-imagine/text-to-video') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          prompt: parameters.prompt,
          aspect_ratio: normalizeImageAspectRatio(parameters.aspectRatio, '16:9'),
          mode: normalizeGrokVideoMode(parameters.mode),
          duration: normalizeGrokVideoDuration(parameters.duration),
          resolution: normalizeGrokVideoResolution(parameters.resolution)
        }
      }
    };
  }

  if (model === 'grok-imagine/image-to-video') {
    return {
      endpoint: MARKET_CREATE_TASK_ENDPOINT,
      body: {
        model,
        input: {
          image_urls: [parameters.referenceImageUrl],
          prompt: parameters.prompt,
          mode: normalizeGrokVideoMode(parameters.mode),
          duration: normalizeGrokVideoDuration(parameters.duration),
          resolution: normalizeGrokVideoResolution(parameters.resolution)
        }
      }
    };
  }

  return {
    endpoint: MARKET_CREATE_TASK_ENDPOINT,
    body: {
      model,
      input: {
        prompt: parameters.prompt
      }
    }
  };
}
