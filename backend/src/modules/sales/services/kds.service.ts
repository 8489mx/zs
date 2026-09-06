import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

export type KdsTicketStatus = 'pending' | 'cooking' | 'ready' | 'served';
export type KdsItemStatus = 'pending' | 'cooking' | 'ready';
export type KdsStation = 'all' | 'kitchen' | 'grill' | 'beverages' | 'bakery' | 'general';
export type KdsUrgencyLevel = 'normal' | 'warning' | 'critical';

export interface KdsTicketItem {
  id: number;
  productId?: number;
  name: string;
  qty: number;
  unitName?: string;
  modifiers?: Array<{ name: string; qty?: number; price?: number }>;
  notes?: string;
  status: KdsItemStatus;
  station: KdsStation;
}

export interface KdsTicket {
  id: number;
  docNo: string;
  orderNumber: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  customerName?: string;
  cashierName?: string;
  status: KdsTicketStatus;
  elapsedMinutes: number;
  elapsedSeconds: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  items: KdsTicketItem[];
  urgencyLevel: KdsUrgencyLevel;
}

export interface KdsSummaryStats {
  pendingCount: number;
  cookingCount: number;
  readyCount: number;
  criticalCount: number;
  avgPrepMinutes: number;
}

interface StoredKdsState {
  tickets: Record<
    string,
    {
      status: KdsTicketStatus;
      itemsStatus: Record<string, KdsItemStatus>;
      updatedAt: string;
    }
  >;
  lastServedId?: number;
}

@Injectable()
export class KdsService {
  private readonly logger = new Logger(KdsService.name);

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private tenantPredicate(auth: AuthContext, alias?: string) {
    const { tenantId } = requireTenantScope(auth);
    return alias
      ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}`
      : sql<boolean>`tenant_id = ${tenantId}`;
  }

  private async getKdsStoreState(tenantId: string): Promise<StoredKdsState> {
    try {
      const record = await this.db
        .selectFrom('settings')
        .select(['value'])
        .where('key', '=', 'kds_tickets_runtime_state')
        .where(sql<boolean>`tenant_id = ${tenantId}`)
        .executeTakeFirst();

      if (record?.value) {
        return JSON.parse(record.value) as StoredKdsState;
      }
    } catch (e: any) {
      this.logger.warn(`Failed reading kds runtime state: ${e.message}`);
    }
    return { tickets: {} };
  }

  private async saveKdsStoreState(tenantId: string, state: StoredKdsState): Promise<void> {
    const jsonStr = JSON.stringify(state);
    const existing = await this.db
      .selectFrom('settings')
      .select(['key'])
      .where('key', '=', 'kds_tickets_runtime_state')
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    if (existing) {
      await this.db
        .updateTable('settings')
        .set({ value: jsonStr })
        .where('key', '=', 'kds_tickets_runtime_state')
        .where(sql<boolean>`tenant_id = ${tenantId}`)
        .execute();
    } else {
      await this.db
        .insertInto('settings')
        .values({
          tenant_id: tenantId,
          account_id: 'default',
          key: 'kds_tickets_runtime_state',
          value: jsonStr,
        })
        .execute();
    }
  }

  private inferItemStation(name: string, categoryName?: string): KdsStation {
    const lower = `${name} ${categoryName || ''}`.toLowerCase();
    if (lower.includes('مشوي') || lower.includes('كباب') || lower.includes('كفتة') || lower.includes('ستيك') || lower.includes('grill')) {
      return 'grill';
    }
    if (lower.includes('عصير') || lower.includes('مشروب') || lower.includes('قهوة') || lower.includes('شاي') || lower.includes('كوكتيل') || lower.includes('بار') || lower.includes('pepsi') || lower.includes('cola')) {
      return 'beverages';
    }
    if (lower.includes('بيتزا') || lower.includes('فطير') || lower.includes('مخبوز') || lower.includes('حلو') || lower.includes('حلويات') || lower.includes('كيك')) {
      return 'bakery';
    }
    return 'kitchen';
  }

  /**
   * Get all active kitchen tickets (pending, cooking, ready) within the last 14 hours
   */
  async getActiveTickets(
    auth: AuthContext,
    filters?: { station?: KdsStation; orderType?: string; status?: KdsTicketStatus }
  ): Promise<{ tickets: KdsTicket[]; stats: KdsSummaryStats; lastServedId?: number }> {
    const { tenantId } = requireTenantScope(auth);
    const runtimeState = await this.getKdsStoreState(tenantId);

    // Fetch sales from the past 14 hours
    const fourteenHoursAgo = new Date(Date.now() - 14 * 60 * 60 * 1000);

    const salesRows = await this.db
      .selectFrom('sales as s')
      .leftJoin('users as u', 'u.id', 's.created_by')
      .leftJoin('customers as c', 'c.id', 's.customer_id')
      .select([
        's.id',
        's.doc_no',
        's.order_type',
        's.table_number',
        's.status as sale_status',
        's.note',
        's.created_at',
        's.customer_name',
        'c.name as customer_name_ref',
        'u.username as cashier_username',
      ])
      .where(this.tenantPredicate(auth, 's'))
      .where('s.created_at', '>=', fourteenHoursAgo)
      .where('s.status', '!=', 'cancelled')
      .orderBy('s.created_at', 'asc')
      .execute();

    if (!salesRows.length) {
      return {
        tickets: [],
        stats: { pendingCount: 0, cookingCount: 0, readyCount: 0, criticalCount: 0, avgPrepMinutes: 0 },
        lastServedId: runtimeState.lastServedId,
      };
    }

    const saleIds = salesRows.map((s) => Number(s.id));

    // Fetch sale items
    const itemRows = await this.db
      .selectFrom('sale_items')
      .select(['id', 'sale_id', 'product_id', 'product_name', 'qty', 'unit_name', 'modifiers', 'notes'])
      .where('sale_id', 'in', saleIds)
      .where(this.tenantPredicate(auth))
      .orderBy('id', 'asc')
      .execute();

    const itemsBySale = new Map<number, typeof itemRows>();
    for (const item of itemRows) {
      const sid = Number(item.sale_id);
      if (!itemsBySale.has(sid)) itemsBySale.set(sid, []);
      itemsBySale.get(sid)!.push(item);
    }

    const now = Date.now();
    const tickets: KdsTicket[] = [];

    let totalMinutes = 0;
    let countedForAvg = 0;

    for (const sale of salesRows) {
      const saleId = Number(sale.id);
      const ticketStored = runtimeState.tickets[String(saleId)];
      const ticketStatus: KdsTicketStatus = ticketStored?.status || 'pending';

      // Skip already served tickets from main live grid
      if (ticketStatus === 'served') {
        continue;
      }

      if (filters?.status && filters.status !== ticketStatus) {
        continue;
      }

      const rawCreatedAt = sale.created_at;
      const saleCreatedAtMs = rawCreatedAt instanceof Date ? rawCreatedAt.getTime() : (rawCreatedAt ? new Date(rawCreatedAt).getTime() : now);
      const elapsedSeconds = Math.max(0, Math.floor((now - saleCreatedAtMs) / 1000));
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);

      let urgencyLevel: KdsUrgencyLevel = 'normal';
      if (elapsedMinutes >= 15) {
        urgencyLevel = 'critical';
      } else if (elapsedMinutes >= 8) {
        urgencyLevel = 'warning';
      }

      const rawItems = itemsBySale.get(saleId) || [];
      const parsedItems: KdsTicketItem[] = rawItems.map((item) => {
        const itemId = Number(item.id);
        const itemStatus: KdsItemStatus = ticketStored?.itemsStatus?.[String(itemId)] || (ticketStatus === 'ready' ? 'ready' : 'pending');

        let mods: Array<{ name: string; qty?: number; price?: number }> = [];
        if (typeof item.modifiers === 'string') {
          try {
            mods = JSON.parse(item.modifiers);
          } catch {
            mods = [];
          }
        } else if (Array.isArray(item.modifiers)) {
          mods = item.modifiers;
        }

        return {
          id: itemId,
          productId: item.product_id ? Number(item.product_id) : undefined,
          name: item.product_name,
          qty: Number(item.qty) || 1,
          unitName: item.unit_name || 'وجبة',
          modifiers: mods,
          notes: item.notes || undefined,
          status: itemStatus,
          station: this.inferItemStation(item.product_name),
        };
      });

      // Filter items by station if requested
      const stationFilter = filters?.station && filters.station !== 'all' ? filters.station : null;
      const filteredItems = stationFilter
        ? parsedItems.filter((it) => it.station === stationFilter)
        : parsedItems;

      if (stationFilter && !filteredItems.length) {
        continue;
      }

      // Filter by orderType
      const orderTypeFilter = filters?.orderType && filters.orderType !== 'all' ? filters.orderType : null;
      const orderTypeVal = (sale.order_type || 'dine_in') as 'dine_in' | 'takeaway' | 'delivery';
      if (orderTypeFilter && orderTypeVal !== orderTypeFilter) {
        continue;
      }

      const shortMatch = String(sale.doc_no || sale.id).match(/-0*(\d+)$/);
      const orderNumber = shortMatch ? shortMatch[1] : String(sale.id);

      const createdAtStr = rawCreatedAt instanceof Date ? rawCreatedAt.toISOString() : (rawCreatedAt ? String(rawCreatedAt) : new Date().toISOString());

      tickets.push({
        id: saleId,
        docNo: String(sale.doc_no || `#${saleId}`),
        orderNumber: `#${orderNumber}`,
        orderType: orderTypeVal,
        tableNumber: sale.table_number || undefined,
        customerName: sale.customer_name || sale.customer_name_ref || undefined,
        cashierName: sale.cashier_username || undefined,
        status: ticketStatus,
        elapsedMinutes,
        elapsedSeconds,
        createdAt: createdAtStr,
        updatedAt: ticketStored?.updatedAt || createdAtStr,
        notes: sale.note || undefined,
        items: filteredItems,
        urgencyLevel,
      });

      totalMinutes += elapsedMinutes;
      countedForAvg++;
    }

    // Sort tickets: Critical / Warning first, then oldest elapsed time
    tickets.sort((a, b) => b.elapsedSeconds - a.elapsedSeconds);

    const stats: KdsSummaryStats = {
      pendingCount: tickets.filter((t) => t.status === 'pending').length,
      cookingCount: tickets.filter((t) => t.status === 'cooking').length,
      readyCount: tickets.filter((t) => t.status === 'ready').length,
      criticalCount: tickets.filter((t) => t.urgencyLevel === 'critical').length,
      avgPrepMinutes: countedForAvg > 0 ? Math.round(totalMinutes / countedForAvg) : 0,
    };

    return {
      tickets,
      stats,
      lastServedId: runtimeState.lastServedId,
    };
  }

  /**
   * Advance ticket status to the next logical phase:
   * pending -> cooking -> ready -> served
   */
  async advanceTicketStatus(
    auth: AuthContext,
    ticketId: number
  ): Promise<{ ticketId: number; newStatus: KdsTicketStatus }> {
    const { tenantId } = requireTenantScope(auth);
    const runtimeState = await this.getKdsStoreState(tenantId);
    const existing = runtimeState.tickets[String(ticketId)];
    const currentStatus: KdsTicketStatus = existing?.status || 'pending';

    let nextStatus: KdsTicketStatus = 'cooking';
    if (currentStatus === 'pending') nextStatus = 'cooking';
    else if (currentStatus === 'cooking') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'served';
    else nextStatus = 'served';

    const nowIso = new Date().toISOString();
    const updatedItemsStatus = { ...(existing?.itemsStatus || {}) };

    if (nextStatus === 'ready' || nextStatus === 'served') {
      Object.keys(updatedItemsStatus).forEach((k) => {
        updatedItemsStatus[k] = 'ready';
      });
    }

    runtimeState.tickets[String(ticketId)] = {
      status: nextStatus,
      itemsStatus: updatedItemsStatus,
      updatedAt: nowIso,
    };

    if (nextStatus === 'served') {
      runtimeState.lastServedId = ticketId;
    }

    await this.saveKdsStoreState(tenantId, runtimeState);
    return { ticketId, newStatus: nextStatus };
  }

  /**
   * Set ticket status explicitly
   */
  async setTicketStatus(
    auth: AuthContext,
    ticketId: number,
    status: KdsTicketStatus
  ): Promise<{ ticketId: number; status: KdsTicketStatus }> {
    const { tenantId } = requireTenantScope(auth);
    const runtimeState = await this.getKdsStoreState(tenantId);
    const existing = runtimeState.tickets[String(ticketId)];
    const nowIso = new Date().toISOString();

    runtimeState.tickets[String(ticketId)] = {
      status,
      itemsStatus: existing?.itemsStatus || {},
      updatedAt: nowIso,
    };

    if (status === 'served') {
      runtimeState.lastServedId = ticketId;
    }

    await this.saveKdsStoreState(tenantId, runtimeState);
    return { ticketId, status };
  }

  /**
   * Toggle or set status of an individual item within a ticket
   */
  async setItemStatus(
    auth: AuthContext,
    ticketId: number,
    itemId: number,
    status: KdsItemStatus
  ): Promise<{ ticketId: number; itemId: number; itemStatus: KdsItemStatus }> {
    const { tenantId } = requireTenantScope(auth);
    const runtimeState = await this.getKdsStoreState(tenantId);
    const existing = runtimeState.tickets[String(ticketId)] || {
      status: 'pending',
      itemsStatus: {},
      updatedAt: new Date().toISOString(),
    };

    existing.itemsStatus[String(itemId)] = status;
    existing.updatedAt = new Date().toISOString();
    runtimeState.tickets[String(ticketId)] = existing;

    await this.saveKdsStoreState(tenantId, runtimeState);
    return { ticketId, itemId, itemStatus: status };
  }

  /**
   * Recall the last served ticket back to "ready"
   */
  async recallLastServedTicket(
    auth: AuthContext
  ): Promise<{ recalled: boolean; ticketId?: number; status?: KdsTicketStatus }> {
    const { tenantId } = requireTenantScope(auth);
    const runtimeState = await this.getKdsStoreState(tenantId);

    const lastId = runtimeState.lastServedId;
    if (!lastId || !runtimeState.tickets[String(lastId)]) {
      return { recalled: false };
    }

    runtimeState.tickets[String(lastId)].status = 'ready';
    runtimeState.tickets[String(lastId)].updatedAt = new Date().toISOString();
    runtimeState.lastServedId = undefined;

    await this.saveKdsStoreState(tenantId, runtimeState);
    return { recalled: true, ticketId: lastId, status: 'ready' };
  }
}
