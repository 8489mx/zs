import { Controller, Get, Post, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { DatabaseMaintenanceService } from './db-maintenance.service';

type HealthPayload = {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  database: string;
  environment: string;
  version: string;
};

@Controller(['health', 'api/health'])
export class HealthController {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly maintenanceService: DatabaseMaintenanceService,
  ) {}

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

  @Get('db-stats')
  async getDatabaseStats(): Promise<Record<string, unknown>> {
    try {
      // Database size
      const sizeResult = await sql<{ size_mb: number }>`
        SELECT pg_database_size(current_database()) / (1024 * 1024) AS size_mb
      `.execute(this.db);

      // Per-table statistics from pg_stat_user_tables
      const tableStats = await sql<{
        table_name: string;
        n_live_tup: number;
        n_dead_tup: number;
        last_vacuum: string | null;
        last_autovacuum: string | null;
        last_analyze: string | null;
        last_autoanalyze: string | null;
      }>`
        SELECT
          relname AS table_name,
          n_live_tup,
          n_dead_tup,
          last_vacuum::text,
          last_autovacuum::text,
          last_analyze::text,
          last_autoanalyze::text
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 30
      `.execute(this.db);

      // PostgreSQL uptime
      const uptimeResult = await sql<{ uptime_hours: number }>`
        SELECT EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time())) / 3600 AS uptime_hours
      `.execute(this.db);

      return {
        timestamp: new Date().toISOString(),
        database_size_mb: Number(sizeResult.rows[0]?.size_mb || 0),
        pg_uptime_hours: Number(Number(uptimeResult.rows[0]?.uptime_hours || 0).toFixed(2)),
        table_stats: tableStats.rows.map((row) => ({
          table: row.table_name,
          live_rows: Number(row.n_live_tup),
          dead_rows: Number(row.n_dead_tup),
          bloat_pct: row.n_live_tup > 0
            ? Number(((row.n_dead_tup / (row.n_live_tup + row.n_dead_tup)) * 100).toFixed(1))
            : 0,
          last_vacuum: row.last_vacuum || row.last_autovacuum || null,
          last_analyze: row.last_analyze || row.last_autoanalyze || null,
        })),
        maintenance_last_run: this.maintenanceService.getLastResults(),
      };
    } catch (err) {
      return {
        error: 'Failed to collect database stats',
        message: (err as Error).message,
      };
    }
  }

  @Post('optimize-db')
  async runDatabaseOptimization(): Promise<Record<string, unknown>> {
    try {
      const results = await this.maintenanceService.runFullOptimization();
      const sizeResult = await sql<{ size_mb: number }>`
        SELECT pg_database_size(current_database()) / (1024 * 1024) AS size_mb
      `.execute(this.db);

      return {
        ok: true,
        message: 'تم تحسين قاعدة البيانات وضغط المساحة بنجاح',
        database_size_mb: Number(sizeResult.rows[0]?.size_mb || 0),
        results,
      };
    } catch (err) {
      return {
        ok: false,
        error: 'فشل تشغيل تحسين قاعدة البيانات',
        message: (err as Error).message,
      };
    }
  }
}
