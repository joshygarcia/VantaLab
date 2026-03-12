import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseWorkspaceTokenStrategy } from './workspace-token-strategy.ts';

test('uses the active session token in production even when direct workspace membership is unknown', () => {
  const strategy = chooseWorkspaceTokenStrategy({
    hasSessionToken: true,
    sessionHasDirectWorkspaceAccess: false,
    hasDevJwt: false,
    devJwtHasDirectWorkspaceAccess: false,
    isDevEnv: false
  });

  assert.equal(strategy, 'session');
});

test('falls back to a scoped dev token in development when reusable tokens cannot access the workspace directly', () => {
  const strategy = chooseWorkspaceTokenStrategy({
    hasSessionToken: false,
    sessionHasDirectWorkspaceAccess: false,
    hasDevJwt: true,
    devJwtHasDirectWorkspaceAccess: false,
    isDevEnv: true
  });

  assert.equal(strategy, 'mint-dev-token');
});

test('reuses a development jwt when it already has direct workspace access', () => {
  const strategy = chooseWorkspaceTokenStrategy({
    hasSessionToken: false,
    sessionHasDirectWorkspaceAccess: false,
    hasDevJwt: true,
    devJwtHasDirectWorkspaceAccess: true,
    isDevEnv: true
  });

  assert.equal(strategy, 'dev-jwt');
});
