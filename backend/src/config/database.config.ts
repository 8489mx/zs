import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? process.env.DB_HOST,
  port: Number(process.env.DATABASE_PORT ?? process.env.DB_PORT ?? process.env.PGPORT),
  user: process.env.DATABASE_USER ?? process.env.DB_USER,
  password: process.env.DATABASE_PASSWORD ?? process.env.DB_PASSWORD,
  name: process.env.DATABASE_NAME ?? process.env.DB_NAME,
  schema: process.env.DATABASE_SCHEMA,
  ssl: process.env.DATABASE_SSL === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
}));
