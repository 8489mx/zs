import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { KYSELY_DB } from '../../../database/database.constants';
import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

export interface CostCenterSplitInput {
  costCenterId: number;
  percentage: number;
  notes?: string;
}

export interface CreateCostCenterAllocationDto {
  code: string;
  name: string;
  description?: string;
  splits: CostCenterSplitInput[];
}

@Injectable()
export class CostCenterAllocationsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async listAllocations(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const allocations = await this.db
      .selectFrom('cost_center_allocations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('code', 'asc')
      .execute();

    if (allocations.length === 0) return [];

    const allocationIds = allocations.map((a) => String(a.id));
    const splits = await (this.db as any)
      .selectFrom('cost_center_allocation_splits as ccas')
      .leftJoin('cost_centers as cc', 'cc.id', 'ccas.cost_center_id')
      .select([
        'ccas.id',
        'ccas.allocation_id',
        'ccas.cost_center_id',
        'ccas.percentage',
        'ccas.notes',
        'cc.name as cost_center_name',
        'cc.code as cost_center_code',
      ])
      .where('ccas.tenant_id', '=', tenantId)
      .where('ccas.allocation_id', 'in', allocationIds)
      .execute();

    const splitsMap = new Map<string, any[]>();
    for (const s of splits) {
      const arr = splitsMap.get(String(s.allocation_id)) || [];
      arr.push({
        id: s.id,
        costCenterId: Number(s.cost_center_id),
        costCenterName: s.cost_center_name,
        costCenterCode: s.cost_center_code,
        percentage: Number(s.percentage),
        notes: s.notes,
      });
      splitsMap.set(String(s.allocation_id), arr);
    }

    return allocations.map((a) => ({
      id: String(a.id),
      code: a.code,
      name: a.name,
      description: a.description,
      isActive: a.is_active,
      createdAt: a.created_at,
      splits: splitsMap.get(String(a.id)) || [],
    }));
  }

  async createAllocation(dto: CreateCostCenterAllocationDto, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const code = String(dto.code || '').trim().toUpperCase();
    const name = String(dto.name || '').trim();
    if (!code || !name) throw new BadRequestException('كود واسم مصفوفة التوزيع مطلوبان.');

    if (!dto.splits || dto.splits.length < 2) {
      throw new BadRequestException('يجب إضافة مركزين تكلفة على الأقل في مصفوفة التوزيع.');
    }

    const totalPercentage = dto.splits.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.05) {
      throw new BadRequestException(`مجموع نسب التوزيع يجب أن يساوي 100% بالضبط (المجموع الحالي: ${totalPercentage}%).`);
    }

    const created = await this.db
      .insertInto('cost_center_allocations')
      .values({
        tenant_id: tenantId,
        code,
        name,
        description: dto.description || null,
        is_active: true,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();

    const splitRows = dto.splits.map((s) => ({
      tenant_id: tenantId,
      allocation_id: String(created.id),
      cost_center_id: String(s.costCenterId),
      percentage: Number(s.percentage),
      notes: s.notes || null,
    }));

    await this.db
      .insertInto('cost_center_allocation_splits')
      .values(splitRows as any)
      .execute();

    return { ok: true, allocationId: created.id };
  }

  async updateAllocation(id: string, dto: CreateCostCenterAllocationDto, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const code = String(dto.code || '').trim().toUpperCase();
    const name = String(dto.name || '').trim();
    if (!code || !name) throw new BadRequestException('كود واسم مصفوفة التوزيع مطلوبان.');

    const totalPercentage = dto.splits.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.05) {
      throw new BadRequestException(`مجموع نسب التوزيع يجب أن يساوي 100% بالضبط (المجموع الحالي: ${totalPercentage}%).`);
    }

    await this.db
      .updateTable('cost_center_allocations')
      .set({
        code,
        name,
        description: dto.description || null,
        updated_at: sql`NOW()`,
      } as any)
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .execute();

    // Re-insert splits
    await this.db
      .deleteFrom('cost_center_allocation_splits')
      .where('tenant_id', '=', tenantId)
      .where('allocation_id', '=', id)
      .execute();

    const splitRows = dto.splits.map((s) => ({
      tenant_id: tenantId,
      allocation_id: id,
      cost_center_id: String(s.costCenterId),
      percentage: Number(s.percentage),
      notes: s.notes || null,
    }));

    await this.db
      .insertInto('cost_center_allocation_splits')
      .values(splitRows as any)
      .execute();

    return { ok: true };
  }

  async deleteAllocation(id: string, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const deleted = await this.db
      .deleteFrom('cost_center_allocations')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .returningAll()
      .executeTakeFirst();

    if (!deleted) throw new NotFoundException('مصفوفة التوزيع غير موجودة.');
    return { ok: true };
  }

  async calculateSplitAmounts(allocationId: string, totalAmount: number, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const allocation = await this.db
      .selectFrom('cost_center_allocations')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', allocationId as any)
      .executeTakeFirst();

    if (!allocation) throw new NotFoundException('مصفوفة التوزيع غير موجودة.');

    const splits = await (this.db as any)
      .selectFrom('cost_center_allocation_splits as ccas')
      .leftJoin('cost_centers as cc', 'cc.id', 'ccas.cost_center_id')
      .select([
        'ccas.cost_center_id',
        'ccas.percentage',
        'cc.name as cost_center_name',
        'cc.code as cost_center_code',
      ])
      .where('ccas.tenant_id', '=', tenantId)
      .where('ccas.allocation_id', '=', allocationId)
      .execute();

    const splitResults = splits.map((s: any) => {
      const pct = Number(s.percentage);
      const allocatedAmount = Math.round(((totalAmount * pct) / 100) * 100) / 100;
      return {
        costCenterId: Number(s.cost_center_id),
        costCenterName: s.cost_center_name,
        costCenterCode: s.cost_center_code,
        percentage: pct,
        allocatedAmount,
      };
    });

    return {
      allocationName: allocation.name,
      totalAmount,
      splits: splitResults,
    };
  }
}
