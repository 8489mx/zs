import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { CreateKitchenPrinterDto, UpdateKitchenPrinterDto } from '../dto/kitchen-printer.dto';

@Injectable()
export class KitchenPrintersService {
  constructor(
    @Inject(KYSELY_DB)
    private readonly db: Kysely<Database>,
  ) {}

  async listPrinters(tenantId: string, branchId?: number) {
    let query = this.db
      .selectFrom('pos_kitchen_printers')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (branchId) {
      query = query.where((eb) =>
        eb.or([
          eb('branch_id', '=', branchId),
          eb('branch_id', 'is', null),
        ]),
      );
    }

    const rows = await query.orderBy('id', 'asc').execute();
    return rows.map((r) => ({
      ...r,
      categoryIds: Array.isArray(r.category_ids) ? r.category_ids : JSON.parse((r.category_ids as string) || '[]'),
    }));
  }

  async createPrinter(tenantId: string, dto: CreateKitchenPrinterDto) {
    const [created] = await this.db
      .insertInto('pos_kitchen_printers')
      .values({
        tenant_id: tenantId,
        branch_id: dto.branchId ?? null,
        name: dto.name,
        station_code: dto.stationCode || 'kitchen',
        ip_address: dto.ipAddress ?? null,
        port: dto.port ?? 9100,
        paper_width: dto.paperWidth ?? '80mm',
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        category_ids: JSON.stringify(dto.categoryIds || []),
      })
      .returningAll()
      .execute();

    return {
      ...created,
      categoryIds: dto.categoryIds || [],
    };
  }

  async updatePrinter(tenantId: string, id: number, dto: UpdateKitchenPrinterDto) {
    const existing = await this.db
      .selectFrom('pos_kitchen_printers')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Kitchen printer not found');
    }

    const updates: Record<string, any> = {
      updated_at: new Date(),
    };

    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.stationCode !== undefined) updates.station_code = dto.stationCode;
    if (dto.ipAddress !== undefined) updates.ip_address = dto.ipAddress;
    if (dto.port !== undefined) updates.port = dto.port;
    if (dto.paperWidth !== undefined) updates.paper_width = dto.paperWidth;
    if (dto.branchId !== undefined) updates.branch_id = dto.branchId;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;
    if (dto.categoryIds !== undefined) updates.category_ids = JSON.stringify(dto.categoryIds);

    const [updated] = await this.db
      .updateTable('pos_kitchen_printers')
      .set(updates)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .returningAll()
      .execute();

    return {
      ...updated,
      categoryIds: Array.isArray(updated.category_ids)
        ? updated.category_ids
        : JSON.parse((updated.category_ids as string) || '[]'),
    };
  }

  async deletePrinter(tenantId: string, id: number) {
    const result = await this.db
      .deleteFrom('pos_kitchen_printers')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    return { success: Number(result.numDeletedRows || 0) > 0 };
  }
}
