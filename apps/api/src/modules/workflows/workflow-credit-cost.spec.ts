import { calculateWorkflowCreditCost } from './workflow-credit-cost';

describe('calculateWorkflowCreditCost', () => {
  it('uses image pricing from spreadsheet rows', () => {
    expect(calculateWorkflowCreditCost('z-image', { amount: 1 })).toBe(1); // 0.8 -> ceil to int credits
    expect(calculateWorkflowCreditCost('z-image', { amount: 4 })).toBe(4); // 0.8 * 4 = 3.2 -> 4
    expect(calculateWorkflowCreditCost('nano-banana', { amount: 3 })).toBe(12); // 4 * 3
    expect(calculateWorkflowCreditCost('nano-banana-pro', { resolution: '1K', amount: 2 })).toBe(36); // 18 * 2
    expect(calculateWorkflowCreditCost('nano-banana-pro', { resolution: '2K', amount: 2 })).toBe(36); // 18 * 2
    expect(calculateWorkflowCreditCost('nano-banana-pro', { resolution: '4K', amount: 2 })).toBe(48); // 24 * 2
    expect(calculateWorkflowCreditCost('seedream-5.0-lite', { amount: 1 })).toBe(6); // 5.5 -> 6
    expect(calculateWorkflowCreditCost('seedream-5.0-lite', { amount: 3 })).toBe(17); // 16.5 -> 17
  });

  it('uses video pricing from spreadsheet rows', () => {
    expect(calculateWorkflowCreditCost('veo-3.1', { mode: 'std' })).toBe(60); // Fast
    expect(calculateWorkflowCreditCost('veo-3.1', { mode: 'pro' })).toBe(250); // Quality
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '5' })).toBe(42); // 8.4 * 5
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '10' })).toBe(84); // 8.4 * 10
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '15' })).toBe(126); // 8.4 * 15
  });

  it('always returns an integer rounded up', () => {
    expect(Number.isInteger(calculateWorkflowCreditCost('z-image', { amount: 1 }))).toBe(true);
    expect(calculateWorkflowCreditCost('z-image', { amount: 1 })).toBe(1);
    expect(Number.isInteger(calculateWorkflowCreditCost('kling-3.0/video', { duration: '7' }))).toBe(true);
    expect(calculateWorkflowCreditCost('kling-3.0/video', { duration: '7' })).toBe(59); // 58.8 -> 59
  });
});
