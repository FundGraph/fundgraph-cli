import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('package metadata identifies the public repository and compatible core', () => {
  assert.equal(packageJson.name, 'fundgraph');
  assert.equal(packageJson.repository.url, 'https://github.com/FundGraph/fundgraph-cli.git');
  assert.equal(packageJson.homepage, 'https://github.com/FundGraph/fundgraph-cli#readme');
  assert.equal(packageJson.bugs.url, 'https://github.com/FundGraph/fundgraph-cli/issues');
  assert.equal(packageJson.dependencies['@fundgraph/core'], '0.1.1');
  assert.equal(packageJson.engines.node, '>=20');
  assert.equal(packageJson.publishConfig.access, 'public');
  assert.equal(packageJson.bin.fundgraph, 'dist/main.js');
});
