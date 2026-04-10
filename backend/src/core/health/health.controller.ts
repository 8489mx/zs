import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';

type HealthPayload = {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  database: string;
  environment: string;
  version: string;
};

@Controller('health')
export class HealthController {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private async checkDatabase(): Promise<Pick<HealthPayload, 'status' | 'database'>> {
    let database = 'up';
    let status = 'ok';

    try {
      await sql`select 1`.execute(this.db);
    } catch {
      database = 'down';
      status = 'degraded';
    }

    return { status, database };
  }

  private buildPayload(status: string, database: string): HealthPayload {
    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || 'dev',
    };
  }

  @Get()
  async getHealth(): Promise<HealthPayload> {
    const { status, database } = await this.checkDatabase();
    return this.buildPayload(status, database);
  }

  @Get('live')
  getLiveness(): { status: 'ok'; timestamp: string; uptimeSeconds: number; environment: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || 'dev',
    };
  }

  @Get('ready')
  async getReadiness(): Promise<HealthPayload> {
    const { status, database } = await this.checkDatabase();
    const payload = this.buildPayload(status, database);
    if (status !== 'ok') {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
