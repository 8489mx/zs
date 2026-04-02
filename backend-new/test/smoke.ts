import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function runSmokeTest(): Promise<void> {
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
    process.stderr.write(`Smoke test failed: ${String(error)}\n`);
    process.exit(1);
  });
