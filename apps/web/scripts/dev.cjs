#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');

const nextBin = require.resolve('next/dist/bin/next');
const userArgs = process.argv.slice(2);
const hasPortArg = userArgs.includes('-p') || userArgs.includes('--port');
const args = ['dev', ...(hasPortArg ? [] : ['-p', '3000']), ...userArgs];

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_DISABLE_WEBPACK_CACHE: '1'
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

