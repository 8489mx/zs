import { registerAs } from '@nestjs/config';
import { mapLegacyAppMode } from './app-mode';

export default registerAs('app', () => ({
  mode: mapLegacyAppMode((process.env.APP_MODE as any) ?? 'CLOUD_SAAS'),
  host: process.env.APP_HOST,
  port: Number(process.env.APP_PORT),
  environment: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
}));
