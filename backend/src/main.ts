import { ClassSerializerInterceptor } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { ResponseMetadataInterceptor } from './common/interceptors/response-metadata.interceptor';
import { requestValidationPipe } from './common/pipes/request-validation.pipe';
import { LoggerService } from './core/logging/logger.service';


function formatErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return [
      `Failed to bootstrap application: ${error.message}`,
      `stack: ${error.stack ?? 'N/A'}`,
      `cause: ${String(error.cause ?? 'N/A')}`,
    ].join('\n');
  }

  return `Failed to bootstrap application: ${typeof error === 'string' ? error : JSON.stringify(error)}`;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(requestValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(
    new RequestContextInterceptor(),
    new ResponseMetadataInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.enableShutdownHooks();

  const host = configService.getOrThrow<string>('app.host');
  const port = configService.getOrThrow<number>('app.port');

  const corsOrigins = configService
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(port, host);
  logger.log(`API bootstrap complete on ${host}:${port}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new LoggerService();
  logger.error(formatErrorDetails(error));
  process.exit(1);
});
