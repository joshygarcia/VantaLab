import { resolveAllowedOrigins } from './cors';

describe('resolveAllowedOrigins', () => {
  it('defaults to localhost when FRONTEND_URL is unset', () => {
    expect(resolveAllowedOrigins(undefined)).toEqual(['http://localhost:3000']);
  });

  it('accepts a comma-separated list of origins', () => {
    expect(
      resolveAllowedOrigins(
        'https://www.vanta-lab.com, https://vanta-lab.com, https://persona-web-kohl.vercel.app'
      )
    ).toEqual([
      'https://www.vanta-lab.com',
      'https://vanta-lab.com',
      'https://persona-web-kohl.vercel.app'
    ]);
  });

  it('deduplicates repeated origins after trimming', () => {
    expect(
      resolveAllowedOrigins(' https://www.vanta-lab.com ,https://www.vanta-lab.com ')
    ).toEqual(['https://www.vanta-lab.com']);
  });
});
