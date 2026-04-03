import { HttpException, HttpStatus } from '@nestjs/common';
import { AppError } from '../errors/app-error';

export function mapToHttpException(error: unknown): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  if (error instanceof AppError) {
    return new HttpException(
      {
        message: error.message,
        code: error.code,
        details: error.details ?? null,
      },
      error.statusCode,
    );
  }

  return new HttpException(
    {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
