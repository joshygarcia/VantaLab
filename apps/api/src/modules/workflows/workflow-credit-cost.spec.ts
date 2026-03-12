import { calculateWorkflowCreditCost } from './workflow-credit-cost';

describe('calculateWorkflowCreditCost', () => {
  it('uses image pricing from spreadsheet rows', () => {
    expect(calculateWorkflowCreditCost('z-image', { amount: 1 })).toBe(1); // 0.8 -> ceil to int credits
    expect(calculateWorkflowCreditCost('z-image', { amount: 4 })).toBe(4); // 0.8 * 4 = 3.2 -> 4
    expect(calculateWorkflowCreditCost('nano-banana', { amount: 3 })).toBe(12); // 4 * 3
    expect(calculateWorkflowCreditCost('google/nano-banana', { amount: 3 })).toBe(12); // 4 * 3
    expect(calculateWorkflowCreditCost('nano-banana-pro', { resolution: '1K', amount: 2 })).toBe(36); // 18 * 2
    expect(calculateWorkflowCreditCost('nano-banana-pro', { resolution: '2K', amount: 2 })).toBe(36); // 18 * 2
    expect(calculateWorkflowCreditCost('nano-banana-pro', { resolution: '4K', amount: 2 })).toBe(48); // 24 * 2
    expect(calculateWorkflowCreditCost('nano-banana-2', { resolution: '1K', amount: 2 })).toBe(16); // 8 * 2
    expect(calculateWorkflowCreditCost('nano-banana-2', { resolution: '2K', amount: 2 })).toBe(24); // 12 * 2
    expect(calculateWorkflowCreditCost('nano-banana-2', { resolution: '4K', amount: 2 })).toBe(36); // 18 * 2
    expect(calculateWorkflowCreditCost('seedream-5.0-lite', { amount: 1 })).toBe(6); // 5.5 -> 6
    expect(calculateWorkflowCreditCost('seedream-5.0-lite', { amount: 3 })).toBe(17); // 16.5 -> 17
    expect(calculateWorkflowCreditCost('seedream/5-lite-text-to-image', { amount: 1 })).toBe(6); // 5.5 -> 6
    expect(calculateWorkflowCreditCost('seedream/5-lite-image-to-image', { amount: 2 })).toBe(11); // 5.5 * 2 = 11
    expect(calculateWorkflowCreditCost('qwen/text-to-image', { amount: 2 })).toBe(8); // 4 * 2
    expect(calculateWorkflowCreditCost('qwen/image-to-image', { amount: 2 })).toBe(8); // 4 * 2
    expect(calculateWorkflowCreditCost('qwen/image-edit', { amount: 3 })).toBe(12); // 4 * 3
    expect(calculateWorkflowCreditCost('grok-imagine/text-to-image', {})).toBe(4); // fixed bundle price
    expect(calculateWorkflowCreditCost('grok-imagine/image-to-image', {})).toBe(4); // fixed bundle price
    expect(calculateWorkflowCreditCost('character-suite', {})).toBe(18); // defaults to seedream-5, 3 images + gemini prompting
    expect(calculateWorkflowCreditCost('character-suite', { characterImageModel: 'seedream-5' })).toBe(18);
    expect(calculateWorkflowCreditCost('character-suite', { characterImageModel: 'nano-banana-2', resolution: '2K' })).toBe(37);
    expect(calculateWorkflowCreditCost('character-suite', { characterImageModel: 'nano-banana-pro', resolution: '2K' })).toBe(55);
  });

  it('uses video pricing from spreadsheet rows', () => {
    expect(calculateWorkflowCreditCost('veo3_fast', {})).toBe(60); // Fast
    expect(calculateWorkflowCreditCost('veo3', {})).toBe(250); // Quality
    expect(calculateWorkflowCreditCost('veo-3.1', { mode: 'std' })).toBe(60); // legacy alias
    expect(calculateWorkflowCreditCost('veo-3.1', { mode: 'pro' })).toBe(250); // legacy alias
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '5', mode: 'std', sound: false })).toBe(100); // 20 * 5
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '5', mode: 'std', sound: true })).toBe(150); // 30 * 5
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '5', mode: 'pro', sound: false })).toBe(135); // 27 * 5
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '5', mode: 'pro', sound: true })).toBe(200); // 40 * 5
    expect(calculateWorkflowCreditCost('sora-2-text-to-video', { duration: '10' })).toBe(30);
    expect(calculateWorkflowCreditCost('sora-2-text-to-video', { duration: '15' })).toBe(35);
    expect(calculateWorkflowCreditCost('sora-2-image-to-video', { duration: '10' })).toBe(30);
    expect(calculateWorkflowCreditCost('sora-2-image-to-video', { duration: '15' })).toBe(35);
    expect(calculateWorkflowCreditCost('kling-2.6/motion-control', { duration: '5', mode: '720p' })).toBe(30); // 6 * 5
    expect(calculateWorkflowCreditCost('kling-2.6/motion-control', { duration: '10', mode: '1080p' })).toBe(90); // 9 * 10
  });

  it('uses token pricing for agent models', () => {
    expect(calculateWorkflowCreditCost('gpt-5-2', {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000
    })).toBe(788);
    expect(calculateWorkflowCreditCost('gemini-2.5-flash', {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000
    })).toBe(168);
    expect(calculateWorkflowCreditCost('gemini-3-pro', {
      promptTokens: 25_000,
      completionTokens: 500
    })).toBe(3);
    expect(calculateWorkflowCreditCost('gpt-5-2', {
      prompt: 'Write a one-sentence product description.'
    })).toBe(1);
  });

  it('always returns an integer rounded up', () => {
    expect(Number.isInteger(calculateWorkflowCreditCost('z-image', { amount: 1 }))).toBe(true);
    expect(calculateWorkflowCreditCost('z-image', { amount: 1 })).toBe(1);
    expect(Number.isInteger(calculateWorkflowCreditCost('kling-2.6/motion-control', { duration: '7', mode: '1080p' }))).toBe(true);
    expect(calculateWorkflowCreditCost('kling-2.6/motion-control', { duration: '7', mode: '1080p' })).toBe(63);
  });
});
