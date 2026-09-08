import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

export interface CreateBinDto {
  locationId: number;
  code: string;
  barcode?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateBinDto {
  code?: string;
  barcode?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  isActive?: boolean;
  notes?: string;
}

export interface QuickReassignDto {
  binId: number;
  productId: number;
  quantity: number;
  isPrimary?: boolean;
}

export interface QuickAuditUpdateDto {
  binId: number;
  productId: number;
  countedQty: number;
  notes?: string;
}

@Injectable()
export class WarehouseBinsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private assertInventoryAccess(auth: AuthContext): void {
    if (auth.role === 'super_admin' || auth.role === 'admin' || auth.permissions.includes('inventory')) {
      return;
    }
    throw new ForbiddenException('Missing required inventory permissions');
  }

  async listBins(query: { locationId?: number; search?: string }, auth: AuthContext): Promise<any[]> {
    this.assertInventoryAccess(auth);
    const scope = requireTenantScope(auth);

    let dbQuery = this.db
      .selectFrom('warehouse_bins as wb')
      .leftJoin('stock_locations as sl', (join) =>
        join.onRef('sl.id', '=', 'wb.location_id').on('sl.tenant_id', '=', scope.tenantId)
      )
      .leftJoin('product_bin_allocations as pba', (join) =>
        join.onRef('pba.bin_id', '=', 'wb.id').on('pba.tenant_id', '=', scope.tenantId)
      )
      .select([
        'wb.id',
        'wb.location_id as locationId',
        'sl.name as locationName',
        'wb.code',
        'wb.barcode',
        'wb.aisle',
        'wb.rack',
        'wb.shelf',
        'wb.bin',
        'wb.capacity',
        'wb.is_active as isActive',
        'wb.notes',
        'wb.created_at as createdAt',
        sql<number>`COUNT(DISTINCT pba.product_id)`.as('productsCount'),
        sql<number>`COALESCE(SUM(pba.quantity), 0)`.as('totalQuantityStored'),
      ])
      .where('wb.tenant_id', '=', scope.tenantId)
      .groupBy([
        'wb.id',
        'wb.location_id',
        'sl.name',
        'wb.code',
        'wb.barcode',
        'wb.aisle',
        'wb.rack',
        'wb.shelf',
        'wb.bin',
        'wb.capacity',
        'wb.is_active',
        'wb.notes',
        'wb.created_at',
      ]);

    if (query.locationId) {
      dbQuery = dbQuery.where('wb.location_id', '=', query.locationId);
    }

    if (query.search && query.search.trim()) {
      const pattern = `%${query.search.trim()}%`;
      dbQuery = dbQuery.where((eb) =>
        eb.or([
          eb('wb.code', 'ilike', pattern),
          eb('wb.barcode', 'ilike', pattern),
          eb('wb.aisle', 'ilike', pattern),
          eb('wb.rack', 'ilike', pattern),
        ])
      );
    }

    const rows = await dbQuery.orderBy('wb.id', 'desc').execute();

    return rows.map((r) => ({
      id: Number(r.id),
      locationId: Number(r.locationId),
      locationName: r.locationName || '',
      code: r.code,
      barcode: r.barcode,
      aisle: r.aisle || '',
      rack: r.rack || '',
      shelf: r.shelf || '',
      bin: r.bin || '',
      capacity: r.capacity ? Number(r.capacity) : null,
      isActive: Boolean(r.isActive),
      notes: r.notes || '',
      productsCount: Number(r.productsCount || 0),
      totalQuantityStored: Number(r.totalQuantityStored || 0),
      createdAt: r.createdAt,
    }));
  }

  async createBin(dto: CreateBinDto, auth: AuthContext): Promise<any> {
    this.assertInventoryAccess(auth);
    const scope = requireTenantScope(auth);

    const cleanCode = String(dto.code || '').trim().toUpperCase();
    if (!cleanCode) throw new BadRequestException('رمز مكان التخزين (Code) مطلوب');

    const barcode = dto.barcode?.trim() || `BIN-${dto.locationId}-${cleanCode}`;

    // Verify unique code per location
    const existing = await this.db
      .selectFrom('warehouse_bins')
      .select(['id'])
      .where('tenant_id', '=', scope.tenantId)
      .where('location_id', '=', dto.locationId)
      .where('code', '=', cleanCode)
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestException(`مكان التخزين بالرمز ${cleanCode} موجود بالفعل في هذا المستودع`);
    }

    const inserted = await this.db
      .insertInto('warehouse_bins')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        location_id: dto.locationId,
        code: cleanCode,
        barcode,
        aisle: dto.aisle?.trim() || null,
        rack: dto.rack?.trim() || null,
        shelf: dto.shelf?.trim() || null,
        bin: dto.bin?.trim() || null,
        capacity: dto.capacity || null,
        is_active: true,
        notes: dto.notes?.trim() || null,
      })
      .returning(['id', 'code', 'barcode'])
      .executeTakeFirstOrThrow();

    return inserted;
  }

  async updateBin(id: number, dto: UpdateBinDto, auth: AuthContext): Promise<any> {
    this.assertInventoryAccess(auth);
    const scope = requireTenantScope(auth);

    const bin = await this.db
      .selectFrom('warehouse_bins')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!bin) throw new NotFoundException('مكان التخزين غير موجود');

    const updates: any = { updated_at: sql`NOW()` };
    if (dto.code !== undefined) updates.code = dto.code.trim().toUpperCase();
    if (dto.barcode !== undefined) updates.barcode = dto.barcode.trim();
    if (dto.aisle !== undefined) updates.aisle = dto.aisle.trim();
    if (dto.rack !== undefined) updates.rack = dto.rack.trim();
    if (dto.shelf !== undefined) updates.shelf = dto.shelf.trim();
    if (dto.bin !== undefined) updates.bin = dto.bin.trim();
    if (dto.capacity !== undefined) updates.capacity = dto.capacity;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;
    if (dto.notes !== undefined) updates.notes = dto.notes.trim();

    await this.db
      .updateTable('warehouse_bins')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { success: true };
  }

  async deleteBin(id: number, auth: AuthContext): Promise<any> {
    this.assertInventoryAccess(auth);
    const scope = requireTenantScope(auth);

    // Check allocations
    const count = await this.db
      .selectFrom('product_bin_allocations')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('bin_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (Number(count?.count || 0) > 0) {
      throw new BadRequestException('لا يمكن حذف مكان التخزين لوجود أصناف مخزنة به حالياً');
    }

    await this.db
      .deleteFrom('warehouse_bins')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { success: true };
  }

  async scanAuditBin(barcodeOrCode: string, auth: AuthContext): Promise<any> {
    this.assertInventoryAccess(auth);
    const scope = requireTenantScope(auth);
    const query = String(barcodeOrCode || '').trim();

    if (!query) throw new BadRequestException('الباركود مطلوب');

    // 1. Try finding bin by barcode or code
    const bin = await this.db
      .selectFrom('warehouse_bins as wb')
      .leftJoin('stock_locations as sl', (join) =>
        join.onRef('sl.id', '=', 'wb.location_id').on('sl.tenant_id', '=', scope.tenantId)
      )
      .select([
        'wb.id',
        'wb.location_id as locationId',
        'sl.name as locationName',
        'wb.code',
        'wb.barcode',
        'wb.aisle',
        'wb.rack',
        'wb.shelf',
        'wb.bin',
        'wb.capacity',
        'wb.is_active as isActive',
        'wb.notes',
      ])
      .where('wb.tenant_id', '=', scope.tenantId)
      .where((eb) =>
        eb.or([
          eb('wb.barcode', '=', query),
          eb('wb.code', '=', query.toUpperCase()),
        ])
      )
      .executeTakeFirst();

    if (bin) {
      // Fetch all products stored in this bin
      const items = await this.db
        .selectFrom('product_bin_allocations as pba')
        .innerJoin('products as p', (join) =>
          join.onRef('p.id', '=', 'pba.product_id').on('p.tenant_id', '=', scope.tenantId)
        )
        .select([
          'pba.id as allocationId',
          'pba.product_id as productId',
          'p.name as productName',
          'p.barcode as productBarcode',
          'p.cost_price as costPrice',
          'p.retail_price as retailPrice',
          'pba.quantity',
          'pba.is_primary as isPrimary',
          'pba.updated_at as lastAuditedAt',
        ])
        .where('pba.bin_id', '=', bin.id)
        .where('pba.tenant_id', '=', scope.tenantId)
        .orderBy('pba.id', 'desc')
        .execute();

      return {
        type: 'bin',
        bin: {
          id: Number(bin.id),
          locationId: Number(bin.locationId),
          locationName: bin.locationName || '',
          code: bin.code,
          barcode: bin.barcode,
          aisle: bin.aisle || '',
          rack: bin.rack || '',
          shelf: bin.shelf || '',
          bin: bin.bin || '',
          capacity: bin.capacity ? Number(bin.capacity) : null,
          notes: bin.notes || '',
        },
        items: items.map((i) => ({
          allocationId: Number(i.allocationId),
          productId: Number(i.productId),
          productName: i.productName,
          productBarcode: i.productBarcode || '',
          costPrice: Number(i.costPrice || 0),
          retailPrice: Number(i.retailPrice || 0),
          quantity: Number(i.quantity || 0),
          isPrimary: Boolean(i.isPrimary),
          lastAuditedAt: i.lastAuditedAt,
        })),
      };
    }

    // 2. If not a bin barcode, try finding product by barcode
    const product = await this.db
      .selectFrom('products as p')
      .selectAll()
      .where('p.tenant_id', '=', scope.tenantId)
      .where((eb) =>
        eb.or([
          eb('p.barcode', '=', query),
          eb('p.name', 'ilike', `%${query}%`),
        ])
      )
      .executeTakeFirst();

    if (product) {
      // Find all bins where this product is stored
      const bins = await this.db
        .selectFrom('product_bin_allocations as pba')
        .innerJoin('warehouse_bins as wb', (join) =>
          join.onRef('wb.id', '=', 'pba.bin_id').on('wb.tenant_id', '=', scope.tenantId)
        )
        .leftJoin('stock_locations as sl', (join) =>
          join.onRef('sl.id', '=', 'wb.location_id').on('sl.tenant_id', '=', scope.tenantId)
        )
        .select([
          'wb.id as binId',
          'wb.code as binCode',
          'wb.barcode as binBarcode',
          'sl.name as locationName',
          'wb.aisle',
          'wb.rack',
          'wb.shelf',
          'wb.bin',
          'pba.quantity',
          'pba.is_primary as isPrimary',
        ])
        .where('pba.product_id', '=', Number(product.id))
        .where('pba.tenant_id', '=', scope.tenantId)
        .execute();

      return {
        type: 'product',
        product: {
          id: Number(product.id),
          name: product.name,
          barcode: product.barcode || '',
          stockQty: Number(product.stock_qty || 0),
          binLocation: product.bin_location || '',
          primaryBinId: (product as any).primary_bin_id ? Number((product as any).primary_bin_id) : null,
        },
        allocatedBins: bins.map((b) => ({
          binId: Number(b.binId),
          binCode: b.binCode,
          binBarcode: b.binBarcode,
          locationName: b.locationName || '',
          aisle: b.aisle || '',
          rack: b.rack || '',
          shelf: b.shelf || '',
          bin: b.bin || '',
          quantity: Number(b.quantity || 0),
          isPrimary: Boolean(b.isPrimary),
        })),
      };
    }

    throw new NotFoundException(`لم يتم العثور على رف أو صنف يطابق الباركود: ${query}`);
  }

  async quickReassignProduct(dto: QuickReassignDto, auth: AuthContext): Promise<any> {
    this.assertInventoryAccess(auth);
    const scope = requireTenantScope(auth);

    const bin = await this.db
      .selectFrom('warehouse_bins')
      .selectAll()
      .where('id', '=', dto.binId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!bin) throw new NotFoundException('مكان التخزين غير موجود');

    const product = await this.db
      .selectFrom('products')
      .selectAll()
      .where('id', '=', dto.productId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!product) throw new NotFoundException('الصنف غير موجود');

    const existing = await this.db
      .selectFrom('product_bin_allocations')
      .selectAll()
      .where('bin_id', '=', dto.binId)
      .where('product_id', '=', dto.productId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (existing) {
      await this.db
        .updateTable('product_bin_allocations')
        .set({
          quantity: dto.quantity,
          is_primary: Boolean(dto.isPrimary),
          updated_at: sql`NOW()`,
        } as any)
        .where('id', '=', existing.id)
        .execute();
    } else {
      await this.db
        .insertInto('product_bin_allocations')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          bin_id: dto.binId,
          product_id: dto.productId,
          quantity: dto.quantity,
          is_primary: Boolean(dto.isPrimary),
        })
        .execute();
    }

    if (dto.isPrimary) {
      await this.db
        .updateTable('products')
        .set({
          primary_bin_id: dto.binId,
          bin_location: bin.code,
          updated_at: sql`NOW()`,
        } as any)
        .where('id', '=', dto.productId)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    }

    return { success: true };
  }

  async quickAuditUpdate(dto: QuickAuditUpdateDto, auth: AuthContext): Promise<any> {
    this.assertInventoryAccess(auth);
    const scope = requireTenantScope(auth);

    const allocation = await this.db
      .selectFrom('product_bin_allocations')
      .selectAll()
      .where('bin_id', '=', dto.binId)
      .where('product_id', '=', dto.productId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    const prevQty = allocation ? Number(allocation.quantity || 0) : 0;
    const variance = dto.countedQty - prevQty;

    if (allocation) {
      await this.db
        .updateTable('product_bin_allocations')
        .set({
          quantity: dto.countedQty,
          updated_at: sql`NOW()`,
        } as any)
        .where('id', '=', allocation.id)
        .execute();
    } else {
      await this.db
        .insertInto('product_bin_allocations')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          bin_id: dto.binId,
          product_id: dto.productId,
          quantity: dto.countedQty,
          is_primary: false,
        })
        .execute();
    }

    return {
      success: true,
      previousQty: prevQty,
      countedQty: dto.countedQty,
      variance,
      message: variance === 0 ? 'الكمية مطابقة تماماً للمسجل في النظام' : `تم تسجيل فروق جرد في الرف بمقدار (${variance > 0 ? '+' : ''}${variance})`,
    };
  }
}
