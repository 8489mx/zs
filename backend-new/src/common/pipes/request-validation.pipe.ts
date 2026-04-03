import { ValidationPipe } from '@nestjs/common';

export const requestValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  stopAtFirstError: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
});
