import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

const REQUIRED_ENV_VARS = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'] as const;

function getMissingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim().length === 0;
  });
}

async function runSmokeTest(): Promise<void> {
  const missingEnvVars = getMissingEnvVars();
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables for smoke test: ${missingEnvVars.join(', ')}. ` +
        'Copy backend-new/.env.example to backend-new/.env (or export variables) before running test:smoke.',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  await app.close();
}

runSmokeTest()
  .then(() => {
    process.stdout.write('Smoke test passed\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Smoke test failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
