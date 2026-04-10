import { BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export function parseWithZod<T>(schema: ZodSchema<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Validation failed',
      errors: result.error.flatten(),
    });
  }

  return result.data;
}
