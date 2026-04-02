import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { KYSELY_DB } from './database.constants';
import { Database } from './database.types';

@Global()
@Module({
  providers: [
    {
      provide: KYSELY_DB,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ssl = configService.get<boolean>('database.ssl', false);

        const pool = new Pool({
          host: configService.getOrThrow<string>('database.host'),
          port: configService.getOrThrow<number>('database.port'),
          user: configService.getOrThrow<string>('database.user'),
          password: configService.getOrThrow<string>('database.password'),
          database: configService.getOrThrow<string>('database.name'),
          ssl: ssl ? { rejectUnauthorized: false } : false,
          application_name: 'backend-new',
        });

        return new Kysely<Database>({
          dialect: new PostgresDialect({ pool }),
          log(event) {
            if (event.level === 'error') {
              // eslint-disable-next-line no-console
              console.error('Kysely query error', event.error);
            }
          },
        });
      },
    },
  ],
  exports: [KYSELY_DB],
})
export class DatabaseModule {}
