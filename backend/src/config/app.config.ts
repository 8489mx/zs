import { registerAs } from '@nestjs/config';
import { normalizeAppMode } from './app-mode';

export default registerAs('app', () => ({
  mode: normalizeAppMode((process.env.APP_MODE as any) ?? 'online'),
  host: process.env.APP_HOST,
  port: Number(process.env.APP_PORT),
  environment: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
}));
