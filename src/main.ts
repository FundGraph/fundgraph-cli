import { readFileSync, statSync } from 'node:fs';
import { stderr, stdout } from 'node:process';
import { discoverDependencies, validateModel, type FundGraphModel } from '@fundgraph/core';
import { FundGraphCliError, parseArguments, type CliOptions } from './options.js';

export const CLI_VERSION = '0.1.0';
export const MAX_INPUT_BYTES = 1_048_576;

const HELP = `FundGraph ${CLI_VERSION}

Analyze a JSON model document and explain its validated model inventory.

Usage:
  fundgraph analyze [PATH] [--format text|json] [--offline] [--strict]
  fundgraph version
  fundgraph --help

Phase 2 input:
  PATH may be a project directory (npm, PyPI, or Cargo), a JSON file
  containing versioned FundGraph models, or -/omitted for stdin.

Options:
  --format text|json  Select output format (default: text)
  --offline           Prohibit network access (Phase 2 performs no network access)
  --strict            Treat invalid models as an invalid-input failure
  -h, --help          Show this help
  -v, --version       Show the CLI version
`;

interface AnalysisResult {
  schemaVersion: '1.0';
  input: string;
  offline: boolean;
  strict: boolean;
  modelCount: number;
  edgeCount: number;
  ecosystems: string[];
  counts: Record<string, number>;
  diagnostics: Array<{ code: string; message: string; index?: number; sourcePath?: string }>;
}

function readInput(inputPath: string): string {
  if (inputPath === '-') return readFromStdin();
  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(inputPath);
  } catch {
    throw new FundGraphCliError('INVALID_INPUT', `Input path does not exist: ${inputPath}`);
  }
  if (!stats.isFile()) {
    throw new FundGraphCliError('INVALID_INPUT', 'Phase 2 accepts a JSON model file, not a directory. Dependency discovery starts in Phase 3.');
  }
  if (stats.size > MAX_INPUT_BYTES) {
    throw new FundGraphCliError('INPUT_TOO_LARGE', `Input exceeds ${MAX_INPUT_BYTES} bytes`);
  }
  return readFileSync(inputPath, 'utf8');
}

function readFromStdin(): string {
  const input = readFileSync(0);
  if (input.byteLength > MAX_INPUT_BYTES) throw new FundGraphCliError('INPUT_TOO_LARGE', `Input exceeds ${MAX_INPUT_BYTES} bytes`);
  return input.toString('utf8');
}

function extractModels(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { models?: unknown }).models)) {
    return (parsed as { models: unknown[] }).models;
  }
  throw new FundGraphCliError('INVALID_INPUT', 'JSON input must be an array of models or an object containing a models array');
}

function analyze(options: CliOptions): AnalysisResult {
  if (options.inputPath !== '-') {
    try {
      if (statSync(options.inputPath).isDirectory()) {
        const discovered = discoverDependencies(options.inputPath);
        const diagnostics = discovered.diagnostics.map((item) => ({ code: item.code, message: item.message, ...(item.sourcePath === undefined ? {} : { sourcePath: item.sourcePath }) }));
        if (options.strict && diagnostics.length > 0) throw new FundGraphCliError('INVALID_INPUT', `${diagnostics.length} discovery diagnostic(s) reported`);
        return {
          schemaVersion: '1.0',
          input: options.inputPath,
          offline: options.offline,
          strict: options.strict,
          modelCount: discovered.graph.nodes.length,
          edgeCount: discovered.graph.edges.length,
          ecosystems: discovered.ecosystems,
          counts: { Dependency: discovered.graph.nodes.length },
          diagnostics,
        };
      }
    } catch (error) {
      if (error instanceof FundGraphCliError) throw error;
      throw new FundGraphCliError('INVALID_INPUT', error instanceof Error ? error.message : 'Unable to inspect input path');
    }
  }
  const source = readInput(options.inputPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    throw new FundGraphCliError('INVALID_INPUT', 'Input is not valid JSON');
  }
  const models = extractModels(parsed);
  const diagnostics: AnalysisResult['diagnostics'] = [];
  const validModels: FundGraphModel[] = [];
  models.forEach((model, index) => {
    try {
      validateModel(model);
      validModels.push(model);
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String((error as { code: unknown }).code) : 'INVALID_MODEL';
      const message = error instanceof Error ? error.message : 'Model validation failed';
      diagnostics.push({ code, message, index });
    }
  });
  if (options.strict && diagnostics.length > 0) {
    throw new FundGraphCliError('INVALID_INPUT', `${diagnostics.length} model(s) failed validation`);
  }
  const counts: Record<string, number> = {};
  for (const model of validModels) counts[model.kind] = (counts[model.kind] ?? 0) + 1;
  return { schemaVersion: '1.0', input: options.inputPath, offline: options.offline, strict: options.strict, modelCount: validModels.length, edgeCount: 0, ecosystems: [], counts, diagnostics };
}

function renderText(result: AnalysisResult): string {
  const lines = [
    'FundGraph analysis',
    `Input: ${result.input}`,
    `Models: ${result.modelCount}`,
    `Edges: ${result.edgeCount}`,
    ...(result.ecosystems.length > 0 ? [`Ecosystems: ${result.ecosystems.join(', ')}`] : []),
    `Offline: ${result.offline ? 'yes' : 'yes (Phase 2 has no network providers)'}`,
  ];
  for (const [kind, count] of Object.entries(result.counts).sort(([a], [b]) => a.localeCompare(b))) lines.push(`  ${kind}: ${count}`);
  if (result.diagnostics.length > 0) {
    lines.push(`Diagnostics: ${result.diagnostics.length}`);
    for (const diagnostic of result.diagnostics) lines.push(`  [${diagnostic.code}] model ${diagnostic.index}: ${diagnostic.message}`);
  }
  return `${lines.join('\n')}\n`;
}

export function run(argv: readonly string[]): number {
  try {
    const parsed = parseArguments(argv);
    if (parsed.command === 'help') {
      stdout.write(HELP);
      return 0;
    }
    if (parsed.command === 'version') {
      stdout.write(`${CLI_VERSION}\n`);
      return 0;
    }
    const result = analyze(parsed.options);
    stdout.write(parsed.options.format === 'json' ? `${JSON.stringify(result, null, 2)}\n` : renderText(result));
    return result.diagnostics.length > 0 ? 1 : 0;
  } catch (error) {
    const code = error instanceof FundGraphCliError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : 'Unexpected error';
    stderr.write(`fundgraph: [${code}] ${message}\n`);
    return code === 'USAGE' || code === 'INVALID_INPUT' || code === 'INPUT_TOO_LARGE' ? 2 : 3;
  }
}

if (process.argv[1]) process.exitCode = run(process.argv.slice(2));

