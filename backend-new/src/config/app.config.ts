import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  host: process.env.APP_HOST,
  port: Number(process.env.APP_PORT),
  environment: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
}));
