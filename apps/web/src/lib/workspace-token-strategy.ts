export type WorkspaceTokenStrategy = 'session' | 'dev-jwt' | 'mint-dev-token' | 'error';

type ChooseWorkspaceTokenStrategyInput = {
  hasSessionToken: boolean;
  sessionHasDirectWorkspaceAccess: boolean;
  hasDevJwt: boolean;
  devJwtHasDirectWorkspaceAccess: boolean;
  isDevEnv: boolean;
};

export function chooseWorkspaceTokenStrategy({
  hasSessionToken,
  sessionHasDirectWorkspaceAccess: _sessionHasDirectWorkspaceAccess,
  hasDevJwt,
  devJwtHasDirectWorkspaceAccess,
  isDevEnv
}: ChooseWorkspaceTokenStrategyInput): WorkspaceTokenStrategy {
  if (hasSessionToken) {
    return 'session';
  }

  if (hasDevJwt && devJwtHasDirectWorkspaceAccess) {
    return 'dev-jwt';
  }

  if (isDevEnv) {
    return 'mint-dev-token';
  }

  return 'error';
}
