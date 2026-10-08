import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../dist/main.js', import.meta.url));
const coreFixtures = process.env.FUNDGRAPH_CORE_FIXTURES
  ? resolve(process.env.FUNDGRAPH_CORE_FIXTURES)
  : fileURLToPath(new URL('../../fundgraph-core/test/fixtures/', import.meta.url));
const runCli = (args, input) => spawnSync(process.execPath, [entry, ...args], { input, encoding: 'utf8' });
const model = { schemaVersion: '1.0', kind: 'Project', id: 'project:test', name: 'test', rootPath: '.', ecosystems: ['npm'], dependencyIds: [] };

test('help and version commands are stable', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /fundgraph analyze/);
  const version = runCli(['version']);
  assert.equal(version.status, 0);
  assert.equal(version.stdout, '0.1.0\n');
});

test('analyze reads stdin and emits JSON', () => {
  const result = runCli(['analyze', '--format', 'json', '--offline'], JSON.stringify([model]));
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.modelCount, 1);
  assert.equal(output.counts.Project, 1);
  assert.equal(output.offline, true);
});

test('analyze reads a bounded file path and emits text', () => {
  const directory = mkdtempSync(join(tmpdir(), 'fundgraph-cli-'));
  const inputPath = join(directory, 'models.json');
  writeFileSync(inputPath, JSON.stringify({ models: [model] }));
  const result = runCli(['analyze', inputPath]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Models: 1/);
  assert.match(result.stdout, /Project: 1/);
});

test('analyze discovers a supported project directory through core', () => {
  const directory = mkdtempSync(join(tmpdir(), 'fundgraph-project-'));
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'fixture-project', dependencies: { demo: '^1.0.0' } }));
  writeFileSync(join(directory, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': {}, 'node_modules/demo': { version: '1.2.0' } } }));
  const result = runCli(['analyze', directory, '--format=json', '--offline']);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ecosystems[0], 'npm');
  assert.equal(output.modelCount, 1);
  assert.equal(output.edgeCount, 1);
  assert.equal(output.report.kind, 'FundGraphReport');
});

test('analyze smoke-tests the shared npm workspace fixture and emits a report', () => {
  const result = runCli(['analyze', join(coreFixtures, 'npm-workspace'), '--format=json', '--offline']);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ecosystems[0], 'npm');
  assert.equal(output.report.kind, 'FundGraphReport');
  assert.equal(output.report.schemaVersion, '1.0');
  assert.ok(output.report.summary.dependencyCount >= 3);
});

test('invalid arguments and strict model validation return meaningful failures', () => {
  const usage = runCli(['unknown']);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /USAGE/);
  const invalid = { ...model, schemaVersion: '2.0' };
  const partial = runCli(['analyze', '--format=json'], JSON.stringify([invalid]));
  assert.equal(partial.status, 1);
  assert.match(partial.stdout, /UNSUPPORTED_SCHEMA/);
  const strict = runCli(['analyze', '--strict'], JSON.stringify([invalid]));
  assert.equal(strict.status, 2);
  assert.match(strict.stderr, /INVALID_INPUT/);
});
