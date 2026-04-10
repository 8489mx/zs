import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { mapToHttpException } from '../mappers/error.mapper';
import { LoggerService } from '../../core/logging/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const mapped = mapToHttpException(exception);
    const status = mapped.getStatus();
    const body = mapped.getResponse();

    this.logger.error(
      {
        err: exception,
        method: request.method,
        path: request.url,
        requestId: request.headers['x-request-id'],
      },
      exception instanceof Error ? exception.message : 'Unknown error',
    );

    response.status(status).json({
      statusCode: status,
      error: body,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers['x-request-id'] ?? null,
    });
  }
}
