const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';

export function resolveAllowedOrigins(frontendUrl: string | undefined): string[] {
  if (!frontendUrl || frontendUrl.trim().length === 0) {
    return [DEFAULT_FRONTEND_ORIGIN];
  }

  return [...new Set(frontendUrl.split(',').map((value) => value.trim()).filter(Boolean))];
}
