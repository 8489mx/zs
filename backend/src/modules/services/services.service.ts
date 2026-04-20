import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../common/errors/app-error';
import { paginateRows } from '../../common/utils/pagination';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { TransactionHelper } from '../../database/helpers/transaction.helper';
import { UpsertServiceDto } from './dto/upsert-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  async listServices(query: Record<string, unknown>, _auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await sql<{
      id: number;
      name: string;
      amount: string | number;
      notes: string;
      service_date: string;
      created_by_name: string | null;
    }>`
      SELECT s.id, s.name, s.amount, s.notes, s.service_date, u.username AS created_by_name
      FROM services s
      LEFT JOIN users u ON u.id = s.created_by
      ORDER BY s.id DESC
    `.execute(this.db);

    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    let rows = result.rows.map((row) => ({
      id: String(row.id),
      name: row.name || '',
      amount: Number(row.amount || 0),
      notes: row.notes || '',
      serviceDate: row.service_date,
      createdByName: row.created_by_name || '',
    }));

    if (filter === 'today') {
      rows = rows.filter((row) => String(row.serviceDate || '').slice(0, 10) === today);
    } else if (filter === 'high') {
      rows = rows.filter((row) => Number(row.amount || 0) >= 100);
    } else if (filter === 'notes') {
      rows = rows.filter((row) => String(row.notes || '').trim().length > 0);
    }

    if (search) {
      rows = rows.filter((row) =>
        [row.name, row.notes, row.createdByName].some((value) => String(value || '').toLowerCase().includes(search)),
      );
    }

    const paged = paginateRows(rows, query, { defaultSize: 20 });
    const totalAmount = Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
    const todayRows = rows.filter((row) => String(row.serviceDate || '').slice(0, 10) === today);
    const highestAmount = rows.length ? Math.max(...rows.map((row) => Number(row.amount || 0))) : 0;
    const latest = rows[0] || null;

    return {
      services: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalAmount,
        todayCount: todayRows.length,
        averageAmount: rows.length ? Number((totalAmount / rows.length).toFixed(2)) : 0,
        highestAmount,
        latestServiceName: latest?.name || '',
        latestCreatedByName: latest?.createdByName || '',
      },
    };
  }

  async createService(payload: UpsertServiceDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const service = payload.service;
    await this.tx.runInTransaction(this.db, async (trx) => {
      await sql`
        INSERT INTO services (name, amount, notes, service_date, created_by)
        VALUES (
          ${String(service.name || '').trim()},
          ${Number(service.amount || 0)},
          ${String(service.notes || '').trim()},
          ${new Date(service.date)},
          ${auth.userId}
        )
      `.execute(trx);
    });

    await this.audit.log('إضافة خدمة', 'تمت إضافة خدمة بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listServices({}, auth)) };
  }

  async updateService(id: number, payload: UpsertServiceDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const existing = await sql<{ id: number }>`SELECT id FROM services WHERE id = ${id} LIMIT 1`.execute(this.db);
    if (!existing.rows.length) {
      throw new AppError('Service not found', 'SERVICE_NOT_FOUND', 404);
    }

    const service = payload.service;
    await this.tx.runInTransaction(this.db, async (trx) => {
      await sql`
        UPDATE services
        SET
          name = ${String(service.name || '').trim()},
          amount = ${Number(service.amount || 0)},
          notes = ${String(service.notes || '').trim()},
          service_date = ${new Date(service.date)}
        WHERE id = ${id}
      `.execute(trx);
    });

    await this.audit.log('تعديل خدمة', 'تم تعديل خدمة بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listServices({}, auth)) };
  }

  async deleteService(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const existing = await sql<{ id: number }>`SELECT id FROM services WHERE id = ${id} LIMIT 1`.execute(this.db);
    if (!existing.rows.length) {
      throw new AppError('Service not found', 'SERVICE_NOT_FOUND', 404);
    }

    await sql`DELETE FROM services WHERE id = ${id}`.execute(this.db);
    await this.audit.log('حذف خدمة', 'تم حذف خدمة بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listServices({}, auth)) };
  }
}
