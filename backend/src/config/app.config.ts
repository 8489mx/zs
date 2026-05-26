import { registerAs } from '@nestjs/config';
import { mapLegacyAppMode } from './app-mode';

function resolveAppPort(): number {
  const rawPort = process.env.PORT || process.env.APP_PORT;
  return Number(rawPort);
}

export default registerAs('app', () => ({
  mode: mapLegacyAppMode((process.env.APP_MODE as any) ?? 'CLOUD_SAAS'),
  host: process.env.APP_HOST,
  port: resolveAppPort(),
  environment: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
}));