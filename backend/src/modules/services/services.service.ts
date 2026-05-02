import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { AppError } from '../../common/errors/app-error';
import { paginateRows } from '../../common/utils/pagination';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { TransactionHelper } from '../../database/helpers/transaction.helper';
import { UpsertServiceDto } from './dto/upsert-service.dto';

type ServicePaymentChannel = 'cash' | 'card';

type ServiceFinanceScope = {
  branchId: number | null;
  locationId: number | null;
};

@Injectable()
export class ServicesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  private normalizePaymentChannel(value: unknown): ServicePaymentChannel {
    return String(value || '').trim() === 'card' ? 'card' : 'cash';
  }

  private toNullableNumber(value: unknown): number | null {
    const numberValue = Number(value || 0);
    return numberValue > 0 ? numberValue : null;
  }

  private async getOpenShiftFinanceScope(db: Kysely<Database>, auth: AuthContext): Promise<ServiceFinanceScope> {
    const result = await sql<{ branch_id?: number | string | null; location_id?: number | string | null }>`
      SELECT branch_id, location_id
      FROM cashier_shifts
      WHERE opened_by = ${auth.userId}
        AND status = 'open'
      ORDER BY id DESC
      LIMIT 1
    `.execute(db);

    const row = result.rows?.[0] || null;
    return {
      branchId: this.toNullableNumber(row?.branch_id),
      locationId: this.toNullableNumber(row?.location_id),
    };
  }

  private async syncServiceTreasuryTransaction(
    db: Kysely<Database>,
    serviceId: number,
    service: { name?: string; amount?: number; date?: string; paymentChannel?: ServicePaymentChannel },
    auth: AuthContext,
    scope: ServiceFinanceScope,
  ): Promise<void> {
    await sql`
      DELETE FROM treasury_transactions
      WHERE reference_type = 'service'
        AND reference_id = ${serviceId}
    `.execute(db);

    const amount = Number(service.amount || 0);
    const paymentChannel = this.normalizePaymentChannel(service.paymentChannel);
    if (paymentChannel !== 'cash' || !(amount > 0)) {
      return;
    }

    const serviceDate = service.date ? new Date(service.date) : new Date();
    await sql`
      INSERT INTO treasury_transactions (
        txn_type,
        amount,
        note,
        reference_type,
        reference_id,
        branch_id,
        location_id,
        created_by,
        created_at
      )
      VALUES (
        'cash_in',
        ${amount},
        ${`خدمة نقدي: ${String(service.name || '').trim()}`},
        'service',
        ${serviceId},
        ${scope.branchId},
        ${scope.locationId},
        ${auth.userId},
        ${serviceDate}
      )
    `.execute(db);
  }

  async listServices(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const result = await sql<{
      id: number;
      name: string;
      amount: string | number;
      notes: string;
      service_date: string;
      payment_channel?: string | null;
      branch_id?: string | number | null;
      location_id?: string | number | null;
      branch_name?: string | null;
      location_name?: string | null;
      created_by_name: string | null;
    }>`
      SELECT
        s.id,
        s.name,
        s.amount,
        s.notes,
        s.service_date,
        COALESCE(s.payment_channel, 'cash') AS payment_channel,
        s.branch_id,
        s.location_id,
        COALESCE(b.name, '') AS branch_name,
        COALESCE(l.name, '') AS location_name,
        u.username AS created_by_name
      FROM services s
      LEFT JOIN branches b ON b.id = s.branch_id
      LEFT JOIN stock_locations l ON l.id = s.location_id
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
      paymentChannel: this.normalizePaymentChannel(row.payment_channel),
      branchId: row.branch_id ? String(row.branch_id) : '',
      locationId: row.location_id ? String(row.location_id) : '',
      branchName: row.branch_name || '',
      locationName: row.location_name || '',
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
        [row.name, row.notes, row.createdByName, row.branchName, row.locationName].some((value) => String(value || '').toLowerCase().includes(search)),
      );
    }

    const paged = paginateRows(rows, query, { defaultSize: 20 });
    const totalAmount = Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
    const cashAmount = Number(rows.filter((row) => row.paymentChannel === 'cash').reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
    const cardAmount = Number(rows.filter((row) => row.paymentChannel === 'card').reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
    const todayRows = rows.filter((row) => String(row.serviceDate || '').slice(0, 10) === today);
    const highestAmount = rows.length ? Math.max(...rows.map((row) => Number(row.amount || 0))) : 0;
    const latest = rows[0] || null;

    return {
      services: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalAmount,
        cashAmount,
        cardAmount,
        todayCount: todayRows.length,
        averageAmount: rows.length ? Number((totalAmount / rows.length).toFixed(2)) : 0,
        highestAmount,
        latestServiceName: latest?.name || '',
        latestCreatedByName: latest?.createdByName || '',
      },
      scope,
    };
  }

  async createService(payload: UpsertServiceDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const service = payload.service;
    const normalizedService = {
      name: String(service.name || '').trim(),
      amount: Number(service.amount || 0),
      notes: String(service.notes || '').trim(),
      date: service.date,
      paymentChannel: this.normalizePaymentChannel(service.paymentChannel),
    };

    await this.tx.runInTransaction(this.db, async (trx) => {
      const financeScope = await this.getOpenShiftFinanceScope(trx, auth);
      const inserted = await sql<{ id?: number }>`
        INSERT INTO services (name, amount, notes, service_date, payment_channel, branch_id, location_id, created_by)
        VALUES (
          ${normalizedService.name},
          ${normalizedService.amount},
          ${normalizedService.notes},
          ${new Date(normalizedService.date)},
          ${normalizedService.paymentChannel},
          ${financeScope.branchId},
          ${financeScope.locationId},
          ${auth.userId}
        )
        RETURNING id
      `.execute(trx);

      const serviceId = Number(inserted.rows?.[0]?.id || 0);
      if (!(serviceId > 0)) {
        throw new AppError('Service could not be saved', 'SERVICE_SAVE_FAILED', 400);
      }

      await this.syncServiceTreasuryTransaction(trx, serviceId, normalizedService, auth, financeScope);
    });

    await this.audit.log('إضافة خدمة', 'تمت إضافة خدمة بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listServices({}, auth)) };
  }

  async updateService(id: number, payload: UpsertServiceDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const existing = await sql<{ id: number; branch_id?: number | string | null; location_id?: number | string | null }>`
      SELECT id, branch_id, location_id
      FROM services
      WHERE id = ${id}
      LIMIT 1
    `.execute(this.db);
    const existingRow = existing.rows?.[0] || null;
    if (!existingRow) {
      throw new AppError('Service not found', 'SERVICE_NOT_FOUND', 404);
    }

    const service = payload.service;
    const normalizedService = {
      name: String(service.name || '').trim(),
      amount: Number(service.amount || 0),
      notes: String(service.notes || '').trim(),
      date: service.date,
      paymentChannel: this.normalizePaymentChannel(service.paymentChannel),
    };
    const financeScope = {
      branchId: this.toNullableNumber(existingRow.branch_id),
      locationId: this.toNullableNumber(existingRow.location_id),
    };

    await this.tx.runInTransaction(this.db, async (trx) => {
      await sql`
        UPDATE services
        SET
          name = ${normalizedService.name},
          amount = ${normalizedService.amount},
          notes = ${normalizedService.notes},
          service_date = ${new Date(normalizedService.date)},
          payment_channel = ${normalizedService.paymentChannel}
        WHERE id = ${id}
      `.execute(trx);

      await this.syncServiceTreasuryTransaction(trx, id, normalizedService, auth, financeScope);
    });

    await this.audit.log('تعديل خدمة', 'تم تعديل خدمة بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listServices({}, auth)) };
  }

  async deleteService(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const existing = await sql<{ id: number }>`SELECT id FROM services WHERE id = ${id} LIMIT 1`.execute(this.db);
    if (!existing.rows.length) {
      throw new AppError('Service not found', 'SERVICE_NOT_FOUND', 404);
    }

    await this.tx.runInTransaction(this.db, async (trx) => {
      await sql`
        DELETE FROM treasury_transactions
        WHERE reference_type = 'service'
          AND reference_id = ${id}
      `.execute(trx);
      await sql`DELETE FROM services WHERE id = ${id}`.execute(trx);
    });

    await this.audit.log('حذف خدمة', 'تم حذف خدمة بواسطة ' + auth.username, auth);
    return { ok: true, ...(await this.listServices({}, auth)) };
  }
}
