#!/usr/bin/env node
'use strict';

const net = require('node:net');
const { spawn } = require('node:child_process');

const nextBin = require.resolve('next/dist/bin/next');
const userArgs = process.argv.slice(2);
const hasPortArg = userArgs.includes('-p') || userArgs.includes('--port') || userArgs.some((arg) => arg.startsWith('--port='));

const DEFAULT_PORT = 3000;
const MAX_PORT_SCAN = 25;

const parsePort = (value) => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return null;
  }

  return parsed;
};

const canListenOnHost = (port, host) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once('error', (error) => {
      resolve({ available: false, code: error && error.code ? String(error.code) : 'UNKNOWN' });
    });

    server.once('listening', () => {
      server.close(() => resolve({ available: true, code: null }));
    });

    server.listen(port, host);
  });

const isPortAvailable = async (port) => {
  // Match Next.js default bind target first (IPv6 any-address).
  const ipv6Attempt = await canListenOnHost(port, '::');
  if (ipv6Attempt.available) {
    return true;
  }

  // If IPv6 isn't supported on this host, fallback to IPv4 probing.
  if (ipv6Attempt.code === 'EAFNOSUPPORT' || ipv6Attempt.code === 'EADDRNOTAVAIL') {
    const ipv4Attempt = await canListenOnHost(port, '0.0.0.0');
    return ipv4Attempt.available;
  }

  return false;
};

const findAvailablePort = async (preferredPort) => {
  for (let offset = 0; offset <= MAX_PORT_SCAN; offset += 1) {
    const candidate = preferredPort + offset;
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(candidate);
    if (available) {
      return candidate;
    }
  }

  return null;
};

const run = async () => {
  const envPort = parsePort(process.env.PORT);
  const shouldAutoPickPort = !hasPortArg;
  const preferredPort = envPort ?? DEFAULT_PORT;
  const resolvedPort = shouldAutoPickPort ? await findAvailablePort(preferredPort) : preferredPort;

  if (resolvedPort === null) {
    console.error(`Unable to find an open port in range ${preferredPort}-${preferredPort + MAX_PORT_SCAN}.`);
    process.exit(1);
    return;
  }

  if (shouldAutoPickPort && resolvedPort !== preferredPort) {
    console.log(`[web-dev] Port ${preferredPort} is busy, starting Next.js on ${resolvedPort} instead.`);
  }

  const args = ['dev', ...(hasPortArg ? [] : ['-p', String(resolvedPort)]), ...userArgs];

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

  child.on('error', (error) => {
    console.error('[web-dev] Failed to start Next.js dev server.', error);
    process.exit(1);
  });
};

void run();
