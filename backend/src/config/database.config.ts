import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  name: process.env.DATABASE_NAME,
  schema: process.env.DATABASE_SCHEMA,
  ssl: process.env.DATABASE_SSL === 'true',
  sslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  sslCaCert: process.env.DATABASE_SSL_CA_CERT || '',
  logging: process.env.DATABASE_LOGGING === 'true',
}));
