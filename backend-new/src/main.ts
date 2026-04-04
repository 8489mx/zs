import { ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { requestValidationPipe } from './common/pipes/request-validation.pipe';
import { LoggerService } from './logging/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  app.useGlobalPipes(requestValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(
    new RequestContextInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.enableShutdownHooks();

  const host = configService.getOrThrow<string>('app.host');
  const port = configService.getOrThrow<number>('app.port');

app.enableCors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
});

  await app.listen(port, host);
  logger.log(`API bootstrap complete on ${host}:${port}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new LoggerService();
  logger.error(error, 'Failed to bootstrap application');
  process.exit(1);
});
