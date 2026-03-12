#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const WORKSPACES = [
  { name: 'api', args: ['run', 'dev', '--workspace', 'apps/api'] },
  { name: 'web', args: ['run', 'dev', '--workspace', 'apps/web'] }
];

const WINDOWS_EXTENDED_PATH_PREFIX = '\\\\?\\';
const WINDOWS_UNC_PREFIX = '\\\\?\\UNC\\';

const normalizeWorkingDirectory = (cwd) => {
  if (typeof cwd !== 'string') {
    return cwd;
  }

  if (cwd.startsWith(WINDOWS_UNC_PREFIX)) {
    return `\\\\${cwd.slice(WINDOWS_UNC_PREFIX.length)}`;
  }

  if (cwd.startsWith(WINDOWS_EXTENDED_PATH_PREFIX)) {
    return cwd.slice(WINDOWS_EXTENDED_PATH_PREFIX.length);
  }

  return cwd;
};

const getNpmCommand = ({
  execPath = process.execPath,
  npmExecPath = process.env.npm_execpath,
  platform = process.platform
} = {}) => {
  if (npmExecPath) {
    return {
      command: execPath,
      args: [npmExecPath]
    };
  }

  if (platform === 'win32') {
    return {
      command: execPath,
      args: [path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')]
    };
  }

  return {
    command: 'npm',
    args: []
  };
};

const resolveProjectRoot = ({
  cwd = process.cwd(),
  npmPackageJson = process.env.npm_package_json,
  initCwd = process.env.INIT_CWD
} = {}) => {
  if (npmPackageJson) {
    return normalizeWorkingDirectory(path.dirname(npmPackageJson));
  }

  if (initCwd) {
    return normalizeWorkingDirectory(initCwd);
  }

  return normalizeWorkingDirectory(cwd);
};

const terminateChild = (child, signal) => {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  child.kill(signal);
};

const run = () => {
  const cwd = resolveProjectRoot();
  const npmCommand = getNpmCommand();
  const children = new Set();
  let shuttingDown = false;
  let exitDispatched = false;

  const shutdown = (code, signal) => {
    if (exitDispatched) {
      return;
    }

    exitDispatched = true;
    shuttingDown = true;

    for (const child of children) {
      terminateChild(child, signal ?? 'SIGTERM');
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  };

  for (const workspace of WORKSPACES) {
    const child = spawn(npmCommand.command, [...npmCommand.args, ...workspace.args], {
      cwd,
      stdio: 'inherit',
      env: process.env
    });

    children.add(child);

    child.on('exit', (code, signal) => {
      children.delete(child);

      if (shuttingDown) {
        if (children.size === 0 && !exitDispatched) {
          shutdown(code ?? 0, signal);
        }
        return;
      }

      shuttingDown = true;

      for (const sibling of children) {
        terminateChild(sibling, signal ?? 'SIGTERM');
      }

      shutdown(code ?? 0, signal);
    });

    child.on('error', (error) => {
      console.error(`[dev] Failed to start ${workspace.name}:`, error);
      shutdown(1);
    });
  }

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => {
      shuttingDown = true;

      for (const child of children) {
        terminateChild(child, signal);
      }

      if (children.size === 0) {
        shutdown(0, signal);
      }
    });
  }
};

if (require.main === module) {
  run();
}

module.exports = {
  getNpmCommand,
  normalizeWorkingDirectory,
  resolveProjectRoot,
  run
};
