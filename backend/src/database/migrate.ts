import 'dotenv/config';
import 'reflect-metadata';
import { formatErrorDetails, runMigrationCommand } from './migration-runner';

async function run(): Promise<void> {
  const raw = process.argv[2] ?? 'up';
  if (raw !== 'up' && raw !== 'down' && raw !== 'list') {
    throw new Error(`Unsupported migration command: ${raw}`);
  }
  await runMigrationCommand(raw);
}

run().catch((error: unknown) => {
  process.stderr.write(`Migration command failed:\n${formatErrorDetails(error)}\n`);
  process.exit(1);
});
