import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  mode: process.env.APP_MODE,
  host: process.env.APP_HOST,
  port: Number(process.env.APP_PORT),
  environment: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
}));
