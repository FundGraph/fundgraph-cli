export type OutputFormat = 'text' | 'json';

export interface CliOptions {
  inputPath: string;
  format: OutputFormat;
  offline: boolean;
  strict: boolean;
}

export type ParsedCommand =
  | { command: 'help' }
  | { command: 'version' }
  | { command: 'analyze'; options: CliOptions };

export type CliErrorCode = 'USAGE' | 'INVALID_INPUT' | 'INPUT_TOO_LARGE' | 'INTERNAL_ERROR';

export class FundGraphCliError extends Error {
  constructor(readonly code: CliErrorCode, message: string) {
    super(message);
    this.name = 'FundGraphCliError';
  }
}

export function parseArguments(argv: readonly string[]): ParsedCommand {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') return { command: 'help' };
  if (argv[0] === 'version' || argv[0] === '--version' || argv[0] === '-v') {
    if (argv.length > 1) throw new FundGraphCliError('USAGE', 'version does not accept additional arguments');
    return { command: 'version' };
  }
  if (argv[0] !== 'analyze') throw new FundGraphCliError('USAGE', `Unknown command: ${argv[0]}`);

  let inputPath = '-';
  let format: OutputFormat = 'text';
  let offline = false;
  let strict = false;
  let pathSeen = false;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') return { command: 'help' };
    if (argument === '--offline') {
      offline = true;
      continue;
    }
    if (argument === '--strict') {
      strict = true;
      continue;
    }
    if (argument === '--format') {
      const value = argv[++index];
      if (value !== 'text' && value !== 'json') throw new FundGraphCliError('USAGE', '--format requires text or json');
      format = value;
      continue;
    }
    if (argument?.startsWith('--format=')) {
      const value = argument.slice('--format='.length);
      if (value !== 'text' && value !== 'json') throw new FundGraphCliError('USAGE', '--format requires text or json');
      format = value;
      continue;
    }
    if (argument?.startsWith('-')) throw new FundGraphCliError('USAGE', `Unknown option: ${argument}`);
    if (pathSeen) throw new FundGraphCliError('USAGE', 'analyze accepts only one input path');
    inputPath = argument ?? '-';
    pathSeen = true;
  }
  return { command: 'analyze', options: { inputPath, format, offline, strict } };
}

