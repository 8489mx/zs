import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import { formatErrorDetails, getSanitizedDatabaseTarget, runMigrationCommand, type MigrationCommand } from './migration-runner';

type ParsedArgs = {
  command: MigrationCommand;
  envFile: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const commandRaw = argv[2] ?? 'up';
  if (commandRaw !== 'up' && commandRaw !== 'down' && commandRaw !== 'list') {
    throw new Error(`Unsupported migration command: ${commandRaw}`);
  }

  let envFile = '';
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === '--env-file') {
      envFile = argv[i + 1] || '';
      i += 1;
    }
  }

  if (!envFile) {
    throw new Error('Missing required argument: --env-file <filename>');
  }

  return { command: commandRaw, envFile };
}

function clearDbEnv(): void {
  const keys = [
    'DATABASE_URL',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'DATABASE_SSL',
    'DATABASE_SCHEMA',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_SSL',
    'PGHOST',
    'PGPORT',
    'PGUSER',
    'PGPASSWORD',
    'PGDATABASE',
  ];
  for (const key of keys) delete process.env[key];
}

function loadEnvFile(envFile: string): void {
  const absPath = join(process.cwd(), envFile);
  if (!existsSync(absPath)) {
    throw new Error(`Env file not found: ${envFile}`);
  }
  const raw = readFileSync(absPath, 'utf8');
  const parsed = dotenv.parse(raw);
  clearDbEnv();
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
}

async function run(): Promise<void> {
  const { command, envFile } = parseArgs(process.argv);
  loadEnvFile(envFile);

  process.stdout.write(`Migration command: ${command}\n`);
  process.stdout.write(`Using env file: ${envFile}\n`);
  process.stdout.write(`Database target: ${getSanitizedDatabaseTarget()}\n`);

  await runMigrationCommand(command);
}

run().catch((error: unknown) => {
  process.stderr.write(`Migration command failed:\n${formatErrorDetails(error)}\n`);
  process.exit(1);
});
