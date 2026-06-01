import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { mapToHttpException } from '../mappers/error.mapper';
import { LoggerService } from '../../core/logging/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  private sanitizeError(exception: unknown): Record<string, unknown> {
    const candidate = (exception ?? {}) as Record<string, unknown>;
    const stack = typeof candidate.stack === 'string' ? candidate.stack : '';
    const stackFirstLine = stack ? stack.split('\n')[0]?.trim() : undefined;

    return {
      name: typeof candidate.name === 'string' ? candidate.name : 'Error',
      message: typeof candidate.message === 'string' ? candidate.message : 'Unknown error',
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      constraint: typeof candidate.constraint === 'string' ? candidate.constraint : undefined,
      table: typeof candidate.table === 'string' ? candidate.table : undefined,
      column: typeof candidate.column === 'string' ? candidate.column : undefined,
      stackFirstLine,
    };
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const mapped = mapToHttpException(exception);
    const status = mapped.getStatus();
    const body = mapped.getResponse();
    const requestId = request.headers['x-request-id'] ?? null;
    const sanitizedError = this.sanitizeError(exception);

    if (status >= 500) {
      this.logger.error(
        {
          method: request.method,
          path: request.url,
          status,
          requestId,
          error: sanitizedError,
        },
        `Unhandled server error ${status}`,
      );
    } else {
      this.logger.error(
        {
          method: request.method,
          path: request.url,
          status,
          requestId,
          error: sanitizedError,
        },
        exception instanceof Error ? exception.message : 'Unknown error',
      );
    }

    response.status(status).json({
      statusCode: status,
      error: body,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    });
  }
}
