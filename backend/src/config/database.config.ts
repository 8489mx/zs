import { registerAs } from '@nestjs/config';

function readSslCaCert(): string {
  const base64Cert = process.env.DATABASE_SSL_CA_CERT_B64?.trim();
  if (base64Cert) {
    return Buffer.from(base64Cert, 'base64').toString('utf8');
  }

  return process.env.DATABASE_SSL_CA_CERT ?? '';
}

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? process.env.DB_HOST,
  port: Number(process.env.DATABASE_PORT ?? process.env.DB_PORT ?? process.env.PGPORT),
  user: process.env.DATABASE_USER ?? process.env.DB_USER,
  password: process.env.DATABASE_PASSWORD ?? process.env.DB_PASSWORD,
  name: process.env.DATABASE_NAME ?? process.env.DB_NAME,
  schema: process.env.DATABASE_SCHEMA,
  ssl: process.env.DATABASE_SSL === 'true',
  sslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  sslCaCert: readSslCaCert(),
  logging: process.env.DATABASE_LOGGING === 'true',
  poolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),
  poolIdleTimeoutMs: Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? 10000),
  poolConnectionTimeoutMs: Number(process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? 10000),
}));