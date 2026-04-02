import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerService } from '../../logging/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException
      ? exception.getResponse()
      : {
          message: 'Internal server error',
        };

    const errorMessage = exception instanceof Error ? exception.message : 'Unknown error';

    this.logger.error(
      {
        err: exception,
        method: request.method,
        path: request.url,
        requestId: request.headers['x-request-id'],
      },
      errorMessage,
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
