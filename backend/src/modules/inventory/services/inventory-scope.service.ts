import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

@Injectable()
export class InventoryScopeService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private tenantId(auth: AuthContext): string {
    return requireTenantScope(auth).tenantId;
  }

  async branchScope(auth: AuthContext): Promise<number[]> {
    const tenantId = this.tenantId(auth);
    if (auth.role === 'super_admin') return [];
    const user = await this.db
      .selectFrom('users')
      .select(['default_branch_id'])
      .where('id', '=', auth.userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();
    if (!user) return [];
    const rows = await this.db
      .selectFrom('user_branches')
      .select(['branch_id'])
      .where('user_id', '=', auth.userId)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();
    const ids = rows.map((entry) => Number(entry.branch_id)).filter((entry) => Number.isInteger(entry) && entry > 0);
    if (user.default_branch_id && !ids.includes(user.default_branch_id)) ids.push(user.default_branch_id);
    return Array.from(new Set(ids));
  }

  async assertLocationScope(locationId: number, auth: AuthContext, allowInactive = false, action: 'read' | 'write' = 'read'): Promise<{ id: number; name: string; branchId: number | null }> {
    const tenantId = this.tenantId(auth);
    const location = await this.db
      .selectFrom('stock_locations')
      .select(['id', 'name', 'branch_id', 'location_type'])
      .where('id', '=', locationId)
      .where((eb) => allowInactive ? eb.val(true) : eb('is_active', '=', true))
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    if (!location) {
      throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);
    }

    if (location.location_type === 'branch_stock') {
      const isSuper = ['owner', 'admin', 'super_admin'].includes(auth.role);
      const hasPerm = auth.permissions?.includes('canManageBranchStock');
      
      if (action === 'write' && !isSuper && !hasPerm) {
        throw new AppError('You do not have permission to modify branch stock', 'LOCATION_SCOPE_FORBIDDEN', 403);
      }
      
      if (action === 'read' && auth.role === 'storekeeper' && !hasPerm) {
        throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);
      }
    }

    const scope = await this.branchScope(auth);

    return { id: location.id, name: location.name || '', branchId: location.branch_id || null };
  }

  async filterByScope<T extends { branchId?: string; fromBranchId?: string; toBranchId?: string }>(rows: T[], auth: AuthContext): Promise<T[]> {
    const scope = await this.branchScope(auth);
    if (!scope.length) return rows;
    return rows.filter((row) => {
      const ids = [Number(row.branchId || 0), Number(row.fromBranchId || 0), Number(row.toBranchId || 0)].filter((id) => id > 0);
      if (!ids.length) return true;
      return ids.some((id) => scope.includes(id));
    });
  }

  async listLocations(auth: AuthContext, includeInactive?: boolean): Promise<Record<string, unknown>> {
    const tenantId = this.tenantId(auth);
    const scope = await this.branchScope(auth);
    let query = this.db
      .selectFrom('stock_locations as l')
      .leftJoin('branches as b', (join) => join.onRef('b.id', '=', 'l.branch_id').on(sql<boolean>`b.tenant_id = ${tenantId}`))
      .select(['l.id', 'l.name', 'l.code', 'l.branch_id', 'b.name as branch_name', 'l.is_active', 'l.location_type'])
      .where(sql<boolean>`l.tenant_id = ${tenantId}`)
      .orderBy('l.id', 'asc');
      
    if (auth.role === 'storekeeper' && !auth.permissions?.includes('canManageBranchStock')) {
      query = query.where('l.location_type', '!=', 'branch_stock');
    }
      
    if (!includeInactive) {
      query = query.where((eb) => eb.or([
        eb('l.is_active', '=', true),
        eb.exists(
          eb.selectFrom('product_location_stock as s')
            .select('s.id')
            .whereRef('s.location_id', '=', 'l.id')
            .where('s.qty', '>', 0)
        )
      ]));
    }
    // if (scope.length) query = query.where('l.branch_id', 'in', scope);
    const rows = await query.execute();
    return {
      locations: rows.map((row) => ({ id: String(row.id), name: row.name + (!row.is_active ? ' (محذوف)' : ''), code: row.code || '', branchId: row.branch_id ? String(row.branch_id) : '', branchName: row.branch_name || '', locationType: row.location_type })),
    };
  }
  async getAllLocationStocks(auth: AuthContext): Promise<Record<string, unknown>> {
    const { tenantId, accountId } = requireTenantScope(auth);
    const scope = await this.branchScope(auth);
    let query = this.db
      .selectFrom('product_location_stock as s')
      .leftJoin('products as p', 'p.id', 's.product_id')
      .innerJoin('stock_locations as l', 'l.id', 's.location_id')
      .select(['s.product_id', 's.location_id', 's.qty'])
      .where('p.is_active', '=', true)
      .where((eb) => eb.or([
        eb('l.is_active', '=', true),
        eb('s.qty', '>', 0)
      ]))
      .where('s.tenant_id', '=', tenantId)
      .where('s.account_id', '=', accountId);

    if (auth.role === 'storekeeper' && !auth.permissions?.includes('canManageBranchStock')) {
      query = query.where('l.location_type', '!=', 'branch_stock');
    }

    if (scope.length) {
      query = query.where((eb) => eb.or([
        eb('s.branch_id', 'in', scope),
        eb('s.branch_id', 'is', null)
      ]));
    }
    
    const rows = await query.execute();
    return {
      stocks: rows.map(r => ({
        productId: String(r.product_id),
        locationId: r.location_id ? String(r.location_id) : '',
        qty: Number(r.qty || 0)
      }))
    };
  }

  async getLocationCategories(locationId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const { tenantId, accountId } = requireTenantScope(auth);
    const rows = await this.db
      .selectFrom('product_categories as c')
      .leftJoin('products as p', 'p.category_id', 'c.id')
      .leftJoin('product_location_stock as s', join => join.onRef('s.product_id', '=', 'p.id').on('s.location_id', '=', locationId))
      .select([
        'c.id', 
        'c.name',
        sql<number>`COUNT(s.product_id)`.as('assignedProductCount'),
        sql<number>`SUM(CASE WHEN s.qty > 0 THEN 1 ELSE 0 END)`.as('positiveStockProductCount')
      ])
      .where('c.is_active', '=', true)
      .where('c.tenant_id', '=', tenantId)
      .where('c.account_id', '=', accountId)
      .groupBy(['c.id', 'c.name'])
      .orderBy('c.name')
      .execute();
      
    return {
      categories: rows.map(r => ({ 
        id: String(r.id), 
        name: r.name || '',
        assignedProductCount: Number(r.assignedProductCount) || 0,
        positiveStockProductCount: Number(r.positiveStockProductCount) || 0
      }))
    };
  }

  async getLocationCategoryProducts(locationId: number, categoryId: number | 'all', auth: AuthContext): Promise<Record<string, unknown>> {
    const { tenantId, accountId } = requireTenantScope(auth);
    let query = this.db
      .selectFrom('products as p')
      .innerJoin('product_location_stock as s', 's.product_id', 'p.id')
      .select(['p.id', 'p.name', 'p.barcode', 's.qty', 'p.stock_qty'])
      .where('s.location_id', '=', locationId)
      .where('p.is_active', '=', true)
      .where('p.tenant_id', '=', tenantId)
      .where('p.account_id', '=', accountId);
      
    if (categoryId !== 'all') {
      query = query.where('p.category_id', '=', categoryId);
    }
    
    const rows = await query.orderBy('p.name').execute();
    return {
      products: rows.map(r => ({
        id: String(r.id),
        name: r.name || '',
        barcode: r.barcode || '',
        stockQty: Number(r.qty || 0),
        globalStockQty: Number(r.stock_qty || 0)
      }))
    };
  }

  async getAdvancedOverview(auth: AuthContext): Promise<Record<string, unknown>> {
    const { tenantId, accountId } = requireTenantScope(auth);
    
    const locationsRaw = await this.db.selectFrom('stock_locations as l')
      .select(['l.id', 'l.name', 'l.is_active'])
      .where((eb) => eb.or([
        eb('l.is_active', '=', true),
        eb.exists(
          eb.selectFrom('product_location_stock as s')
            .select('s.id')
            .whereRef('s.location_id', '=', 'l.id')
            .where('s.qty', '>', 0)
        )
      ]))
      .where('l.tenant_id', '=', tenantId)
      .where('l.account_id', '=', accountId)
      .execute();
      
    const locations = locationsRaw.map(l => ({
      id: l.id,
      name: l.name + (!l.is_active ? ' (محذوف)' : '')
    }));
      
    const categories = await this.db.selectFrom('product_categories')
      .select(['id', 'name'])
      .where('tenant_id', '=', tenantId)
      .where('account_id', '=', accountId)
      .execute();
      
    const stockCounts = await this.db.selectFrom('product_location_stock as pls')
      .innerJoin('products as p', 'p.id', 'pls.product_id')
      .select([
        'pls.location_id',
        'p.category_id',
        sql<number>`count(distinct p.id)`.as('productCount')
      ])
      .where('pls.qty', '>', 0)
      .where('p.tenant_id', '=', tenantId)
      .where('p.account_id', '=', accountId)
      .groupBy(['pls.location_id', 'p.category_id'])
      .execute();
      
    const overview = locations.map(loc => {
      const locStocks = stockCounts.filter(s => s.location_id === loc.id);
      const locCategories = locStocks.map(s => {
        const cat = categories.find(c => c.id === s.category_id);
        return {
          id: String(s.category_id),
          name: cat ? cat.name : 'بدون قسم',
          productCount: Number(s.productCount) || 0
        };
      }).filter(c => c.productCount > 0);
      
      return {
        id: String(loc.id),
        name: loc.name,
        categories: locCategories
      };
    });
    
    return { locations: overview };
  }
  async assignProductsToLocation(locationId: number, productIds: number[], auth: AuthContext): Promise<{ success: boolean }> {
    const tenantId = this.tenantId(auth);
    if (!productIds || productIds.length === 0) return { success: true };

    await this.db.transaction().execute(async trx => {
      const { tenantId, accountId } = requireTenantScope(auth);
      const location = await trx.selectFrom('stock_locations').select('branch_id').where('id', '=', locationId).where('tenant_id', '=', tenantId).where('account_id', '=', accountId).executeTakeFirst();
      if (!location) throw new AppError('Location not found', 'NOT_FOUND', 404);

      // Find global stock
      const productsInfo = await trx.selectFrom('products')
        .select(['id', 'stock_qty'])
        .where('id', 'in', productIds)
        .where('tenant_id', '=', tenantId)
        .where('account_id', '=', accountId)
        .execute();

      // Find all location stocks for these products
      const allLocStocks = await trx.selectFrom('product_location_stock')
        .select(['product_id', 'location_id', 'qty'])
        .where('product_id', 'in', productIds)
        .where('tenant_id', '=', tenantId)
        .where('account_id', '=', accountId)
        .execute();

      const locQtyMap = new Map<number, number>();
      for (const s of allLocStocks) {
        locQtyMap.set(Number(s.product_id), (locQtyMap.get(Number(s.product_id)) || 0) + Number(s.qty));
      }

      for (const pid of productIds) {
        const pInfo = productsInfo.find(p => Number(p.id) === Number(pid));
        const globalStock = Number(pInfo?.stock_qty || 0);
        const assignedStock = locQtyMap.get(Number(pid)) || 0;
        const unassignedStock = Math.max(0, globalStock - assignedStock);

        const existingRecord = allLocStocks.find(s => Number(s.product_id) === Number(pid) && Number(s.location_id) === Number(locationId));

        if (existingRecord) {
          // If already assigned but has unassigned stock elsewhere, and we are assigning,
          // pull the unassigned stock into this location!
          if (unassignedStock > 0) {
             await trx.updateTable('product_location_stock')
               .set({ qty: Number(existingRecord.qty) + unassignedStock })
               .where('product_id', '=', Number(pid))
               .where('location_id', '=', Number(locationId))
               .where('tenant_id', '=', tenantId)
               .where('account_id', '=', accountId)
               .execute();
          }
        } else {
          // Insert new record with unassigned stock
          await trx.insertInto('product_location_stock')
            .values({
              product_id: Number(pid),
              location_id: Number(locationId),
              branch_id: location.branch_id || null,
              qty: unassignedStock,
              tenant_id: tenantId,
              account_id: accountId,
            } as any)
            .execute();
        }
      }
    });

    return { success: true };
  }

  async removeProductFromLocation(locationId: number, productId: number, auth: AuthContext): Promise<{ success: boolean }> {
    const tenantId = this.tenantId(auth);
    
    await this.db.transaction().execute(async trx => {
      const { tenantId, accountId } = requireTenantScope(auth);
      // Find the stock
      const stock = await trx.selectFrom('product_location_stock')
        .select('qty')
        .where('location_id', '=', locationId)
        .where('product_id', '=', productId)
        .where('tenant_id', '=', tenantId)
        .where('account_id', '=', accountId)
        .executeTakeFirst();
      
      if (!stock) throw new AppError('Stock not found in this location', 'NOT_FOUND', 404);
      if (Number(stock.qty) > 0) throw new AppError('لا يمكن حذف المخزن طالما يوجد به رصيد. يجب تحويل الرصيد أولاً', 'BAD_REQUEST', 400);

      await trx.deleteFrom('product_location_stock')
        .where('location_id', '=', locationId)
        .where('product_id', '=', productId)
        .where('tenant_id', '=', tenantId)
        .where('account_id', '=', accountId)
        .execute();
    });

    return { success: true };
  }
}
