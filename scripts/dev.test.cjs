const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeWorkingDirectory, getNpmCommand, resolveProjectRoot } = require('./dev.cjs');

test('normalizeWorkingDirectory strips the extended-length prefix from local Windows paths', () => {
  assert.equal(
    normalizeWorkingDirectory('\\\\?\\C:\\Users\\mrjos\\Documents\\Github\\Persona'),
    'C:\\Users\\mrjos\\Documents\\Github\\Persona'
  );
});

test('normalizeWorkingDirectory converts extended UNC paths back to standard UNC paths', () => {
  assert.equal(
    normalizeWorkingDirectory('\\\\?\\UNC\\server\\share\\Persona'),
    '\\\\server\\share\\Persona'
  );
});

test('normalizeWorkingDirectory leaves normal paths unchanged', () => {
  assert.equal(
    normalizeWorkingDirectory('C:\\Users\\mrjos\\Documents\\Github\\Persona'),
    'C:\\Users\\mrjos\\Documents\\Github\\Persona'
  );
});

test('getNpmCommand uses the current Node executable and npm cli script on Windows', () => {
  assert.deepEqual(
    getNpmCommand({
      execPath: 'C:\\Program Files\\nodejs\\node.exe',
      npmExecPath: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js',
      platform: 'win32'
    }),
    {
      command: 'C:\\Program Files\\nodejs\\node.exe',
      args: ['C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js']
    }
  );
});

test('getNpmCommand falls back to npm when npm_execpath is unavailable', () => {
  assert.deepEqual(
    getNpmCommand({
      execPath: '/usr/local/bin/node',
      npmExecPath: '',
      platform: 'linux'
    }),
    {
      command: 'npm',
      args: []
    }
  );
});

test('getNpmCommand derives the npm cli path from execPath on Windows when npm_execpath is unavailable', () => {
  assert.deepEqual(
    getNpmCommand({
      execPath: 'C:\\Program Files\\nodejs\\node.exe',
      npmExecPath: '',
      platform: 'win32'
    }),
    {
      command: 'C:\\Program Files\\nodejs\\node.exe',
      args: ['C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js']
    }
  );
});

test('resolveProjectRoot prefers the package.json directory from npm lifecycle env', () => {
  assert.equal(
    resolveProjectRoot({
      cwd: 'C:\\Windows',
      npmPackageJson: '\\\\?\\C:\\Users\\mrjos\\Documents\\Github\\Persona\\package.json',
      initCwd: '\\\\?\\C:\\Users\\mrjos\\Documents\\Github\\Persona'
    }),
    'C:\\Users\\mrjos\\Documents\\Github\\Persona'
  );
});

test('resolveProjectRoot falls back to INIT_CWD when npm_package_json is unavailable', () => {
  assert.equal(
    resolveProjectRoot({
      cwd: 'C:\\Windows',
      npmPackageJson: '',
      initCwd: '\\\\?\\C:\\Users\\mrjos\\Documents\\Github\\Persona'
    }),
    'C:\\Users\\mrjos\\Documents\\Github\\Persona'
  );
});
