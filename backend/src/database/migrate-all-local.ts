import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import {
  formatErrorDetails,
  getSanitizedDatabaseTarget,
  runMigrationCommand,
  resolveDatabaseConfigFromEnv,
  type MigrationCommand,
} from './migration-runner';

type EnvTarget = {
  envFile: string;
  optional: boolean;
};

const LOCAL_TARGETS: EnvTarget[] = [
  { envFile: '.env.development', optional: false },
  { envFile: '.env', optional: false },
  { envFile: '.env.portable', optional: true },
];

function parseCommand(argv: string[]): MigrationCommand {
  const commandRaw = argv[2] ?? 'up';
  if (commandRaw !== 'up' && commandRaw !== 'down' && commandRaw !== 'list') {
    throw new Error(`Unsupported migration command: ${commandRaw}`);
  }
  return commandRaw;
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

function loadParsedEnv(envFile: string): Record<string, string> {
  const absPath = join(process.cwd(), envFile);
  const raw = readFileSync(absPath, 'utf8');
  return dotenv.parse(raw);
}

function applyParsedEnv(parsed: Record<string, string>): void {
  clearDbEnv();
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
}

async function run(): Promise<void> {
  const command = parseCommand(process.argv);
  const seenTargets = new Map<string, string[]>();

  for (const target of LOCAL_TARGETS) {
    const absPath = join(process.cwd(), target.envFile);
    if (!existsSync(absPath)) {
      if (target.optional) {
        process.stdout.write(`Skipping ${target.envFile} because it does not exist.\n`);
        continue;
      }
      throw new Error(`Env file not found: ${target.envFile}`);
    }

    process.stdout.write(`=== Running migrations for ${target.envFile} ===\n`);
    const parsed = loadParsedEnv(target.envFile);
    applyParsedEnv(parsed);
    const resolved = resolveDatabaseConfigFromEnv();
    const targetSignature = `${resolved.user}@${resolved.host}:${String(resolved.port)}/${resolved.name}`;
    const files = seenTargets.get(targetSignature) || [];
    files.push(target.envFile);
    seenTargets.set(targetSignature, files);
    process.stdout.write(`Migration command: ${command}\n`);
    process.stdout.write(`Using env file: ${target.envFile}\n`);
    process.stdout.write(`Database target: ${getSanitizedDatabaseTarget()}\n`);
    await runMigrationCommand(command);
  }

  for (const files of seenTargets.values()) {
    if (files.length > 1) {
      for (let i = 0; i < files.length - 1; i += 1) {
        for (let j = i + 1; j < files.length; j += 1) {
          process.stdout.write(`Warning: ${files[i]} and ${files[j]} point to the same database.\n`);
        }
      }
    }
  }
}

run().catch((error: unknown) => {
  process.stderr.write(`Migration command failed:\n${formatErrorDetails(error)}\n`);
  process.exit(1);
});
