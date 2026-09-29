import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { formatDailyDocumentNumber } from '../../../common/utils/document-number.util';
import {
  CreateWarehousePackageDto,
  UnpackPackageDto,
  UpdatePackageStatusDto,
} from '../dto/warehouse-package.dto';
import {
  calculatePackageGrossWeight,
  flattenPackageContents,
  validatePackageHierarchy,
  validateUnpackAction,
  type PackageHierarchyNode,
} from '../engines/package-barcode.engine';

@Injectable()
export class WarehousePackagesService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private assertAccess(auth: AuthContext): void {
    if (
      auth.role === 'super_admin' ||
      auth.role === 'admin' ||
      auth.permissions.includes('inventory') ||
      auth.permissions.includes('purchases') ||
      auth.permissions.includes('sales')
    ) {
      return;
    }
    throw new ForbiddenException('Missing required inventory permissions');
  }

  /**
   * Creates a new warehouse package (Pallet, Box, etc.) with optional nested items and parent
   */
  async createPackage(auth: AuthContext, dto: CreateWarehousePackageDto): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    // Check parent package if provided
    let parentPkg: any = null;
    if (dto.parentPackageId) {
      parentPkg = await (this.db as any)
        .selectFrom('warehouse_packages')
        .selectAll()
        .where('id', '=', dto.parentPackageId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (!parentPkg) {
        throw new NotFoundException('Parent package not found');
      }

      const hierarchyCheck = validatePackageHierarchy(parentPkg.package_type, dto.packageType);
      if (!hierarchyCheck.valid) {
        throw new BadRequestException(hierarchyCheck.reason);
      }
    }

    // Auto-generate barcode/number if not provided
    let packageNumber = dto.packageNumber;
    if (!packageNumber) {
      const prefix = dto.packageType === 'pallet' ? 'PAL' : 'BOX';
      const countRes = await (this.db as any)
        .selectFrom('warehouse_packages')
        .select(sql<number>`COUNT(*)`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('package_type', '=', dto.packageType)
        .executeTakeFirst();
      const seq = Number(countRes?.count || 0) + 1;
      packageNumber = formatDailyDocumentNumber(prefix, seq);
    }

    const packageId = `pkg_${randomUUID()}`;

    // Execute in transaction
    await (this.db as any).transaction().execute(async (trx: any) => {
      await trx
        .insertInto('warehouse_packages')
        .values({
          id: packageId,
          tenant_id: tenantId,
          package_number: packageNumber,
          package_type: dto.packageType,
          parent_package_id: dto.parentPackageId || null,
          warehouse_id: dto.warehouseId || parentPkg?.warehouse_id || null,
          location_id: dto.locationId || parentPkg?.location_id || null,
          status: 'sealed',
          gross_weight_kg: dto.grossWeightKg || null,
          net_weight_kg: dto.netWeightKg || null,
          notes: dto.notes || null,
          created_by: String(auth.userId),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          await trx
            .insertInto('warehouse_package_items')
            .values({
              id: `pkgi_${randomUUID()}`,
              tenant_id: tenantId,
              package_id: packageId,
              product_id: item.productId,
              quantity: item.quantity,
              unit_name: item.unitName || 'قطعة',
              batch_number: item.batchNumber || null,
              serial_numbers: item.serialNumbers ? JSON.stringify(item.serialNumbers) : null,
              created_at: new Date(),
            })
            .execute();
        }
      }
    });

    return {
      success: true,
      packageId,
      packageNumber,
      packageType: dto.packageType,
    };
  }

  /**
   * Retrieves list of packages with summary stats
   */
  async getPackages(
    auth: AuthContext,
    params?: { packageType?: string; status?: string; search?: string },
  ): Promise<any[]> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    let query = (this.db as any)
      .selectFrom('warehouse_packages as p')
      .leftJoin('warehouse_packages as parent', 'parent.id', 'p.parent_package_id')
      .select([
        'p.id',
        'p.package_number',
        'p.package_type',
        'p.parent_package_id',
        'parent.package_number as parent_package_number',
        'p.warehouse_id',
        'p.location_id',
        'p.status',
        'p.gross_weight_kg',
        'p.net_weight_kg',
        'p.notes',
        'p.created_at',
      ])
      .where('p.tenant_id', '=', tenantId);

    if (params?.packageType && params.packageType !== 'all') {
      query = query.where('p.package_type', '=', params.packageType);
    }
    if (params?.status && params.status !== 'all') {
      query = query.where('p.status', '=', params.status);
    }
    if (params?.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query = query.where((eb: any) =>
        eb.or([
          eb('p.package_number', 'ilike', term),
          eb('p.notes', 'ilike', term),
        ]),
      );
    }

    const packages = await query.orderBy('p.created_at', 'desc').execute();

    // Fetch items counts & child packages counts
    const packageIds = packages.map((p: any) => p.id);
    if (packageIds.length === 0) return [];

    const itemsCounts = await (this.db as any)
      .selectFrom('warehouse_package_items')
      .select(['package_id', sql<number>`COUNT(*)`.as('items_count'), sql<number>`SUM(quantity)`.as('total_qty')])
      .where('tenant_id', '=', tenantId)
      .where('package_id', 'in', packageIds)
      .groupBy('package_id')
      .execute();

    const childCounts = await (this.db as any)
      .selectFrom('warehouse_packages')
      .select(['parent_package_id', sql<number>`COUNT(*)`.as('children_count')])
      .where('tenant_id', '=', tenantId)
      .where('parent_package_id', 'in', packageIds)
      .groupBy('parent_package_id')
      .execute();

    const itemsMap = new Map(itemsCounts.map((i: any) => [i.package_id, i]));
    const childrenMap = new Map(childCounts.map((c: any) => [c.parent_package_id, Number(c.children_count || 0)]));

    return packages.map((p: any) => ({
      ...p,
      itemsCount: Number(itemsMap.get(p.id)?.items_count || 0),
      totalQuantity: Number(itemsMap.get(p.id)?.total_qty || 0),
      childrenCount: Number(childrenMap.get(p.id) || 0),
    }));
  }

  /**
   * Retrieves full package hierarchy tree (scanned by barcode or ID) with recursive contents
   */
  async getPackageDetails(auth: AuthContext, identifier: string): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    // Search by ID or Package Number (Barcode)
    const pkg = await (this.db as any)
      .selectFrom('warehouse_packages as p')
      .selectAll()
      .where('p.tenant_id', '=', tenantId)
      .where((eb: any) => eb.or([eb('p.id', '=', identifier), eb('p.package_number', '=', identifier)]))
      .executeTakeFirst();

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    // Build hierarchy node recursively
    const buildNode = async (packageRecord: any): Promise<PackageHierarchyNode> => {
      const items = await (this.db as any)
        .selectFrom('warehouse_package_items as pi')
        .leftJoin('products as pr', 'pr.id', 'pi.product_id')
        .select([
          'pi.id as item_id',
          'pi.product_id',
          'pr.name as product_name',
          'pr.code as product_code',
          'pi.quantity',
          'pi.unit_name',
          'pi.batch_number',
          'pi.serial_numbers',
        ])
        .where('pi.package_id', '=', packageRecord.id)
        .where('pi.tenant_id', '=', tenantId)
        .execute();

      const children = await (this.db as any)
        .selectFrom('warehouse_packages')
        .selectAll()
        .where('parent_package_id', '=', packageRecord.id)
        .where('tenant_id', '=', tenantId)
        .execute();

      const childNodes: PackageHierarchyNode[] = [];
      for (const child of children) {
        childNodes.push(await buildNode(child));
      }

      return {
        id: packageRecord.id,
        packageNumber: packageRecord.package_number,
        packageType: packageRecord.package_type,
        status: packageRecord.status,
        grossWeightKg: Number(packageRecord.gross_weight_kg || 0),
        items: items.map((i: any) => ({
          itemId: i.item_id,
          productId: i.product_id,
          productName: i.product_name,
          productCode: i.product_code,
          quantity: Number(i.quantity),
          unitName: i.unit_name,
          batchNumber: i.batch_number,
          serialNumbers: i.serial_numbers,
        })),
        children: childNodes,
      };
    };

    const tree = await buildNode(pkg);
    const aggregatedContents = flattenPackageContents(tree);

    return {
      package: pkg,
      tree,
      aggregatedContents,
    };
  }

  /**
   * Unpacks a package or de-nests child packages / items
   */
  async unpack(auth: AuthContext, id: string, dto: UnpackPackageDto): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const pkg = await (this.db as any)
      .selectFrom('warehouse_packages')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const check = validateUnpackAction(pkg.status, dto.action);
    if (!check.allowed) {
      throw new BadRequestException(check.reason);
    }

    await (this.db as any).transaction().execute(async (trx: any) => {
      if (dto.action === 'unpack_all') {
        // Detach all nested child packages
        await trx
          .updateTable('warehouse_packages')
          .set({ parent_package_id: null, updated_at: new Date() })
          .where('parent_package_id', '=', id)
          .where('tenant_id', '=', tenantId)
          .execute();

        // Delete direct items
        await trx
          .deleteFrom('warehouse_package_items')
          .where('package_id', '=', id)
          .where('tenant_id', '=', tenantId)
          .execute();

        // Mark as opened or consumed
        await trx
          .updateTable('warehouse_packages')
          .set({ status: 'opened', updated_at: new Date() })
          .where('id', '=', id)
          .where('tenant_id', '=', tenantId)
          .execute();
      } else if (dto.action === 'remove_child_package' && dto.targetChildPackageId) {
        await trx
          .updateTable('warehouse_packages')
          .set({ parent_package_id: null, updated_at: new Date() })
          .where('id', '=', dto.targetChildPackageId)
          .where('parent_package_id', '=', id)
          .where('tenant_id', '=', tenantId)
          .execute();
      } else if (dto.action === 'remove_item' && dto.targetPackageItemId) {
        await trx
          .deleteFrom('warehouse_package_items')
          .where('id', '=', dto.targetPackageItemId)
          .where('package_id', '=', id)
          .where('tenant_id', '=', tenantId)
          .execute();
      }
    });

    return { success: true };
  }

  /**
   * Updates package status
   */
  async updateStatus(auth: AuthContext, id: string, dto: UpdatePackageStatusDto): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);

    await (this.db as any)
      .updateTable('warehouse_packages')
      .set({ status: dto.status, updated_at: new Date() })
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { success: true };
  }
}
