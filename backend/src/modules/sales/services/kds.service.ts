import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

export type KdsTicketStatus = 'pending' | 'cooking' | 'ready' | 'served';
export type KdsItemStatus = 'pending' | 'cooking' | 'ready';
export type KdsStation = 'all' | 'kitchen' | 'grill' | 'beverages' | 'bakery' | 'general' | 'expo';
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
  course?: 'appetizer' | 'main' | 'dessert' | 'beverage';
  aggregatorChannel?: string;
  aggregatorOrderId?: string;
  pagerNumber?: string;
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

  private async getKdsStoreState(tenantId: string, db: Kysely<Database> = this.db): Promise<StoredKdsState> {
    try {
      const record = await db
        .selectFrom('settings')
        .select(['value'])
        .where('key', '=', 'kds_tickets_runtime_state')
        .where(sql<boolean>`tenant_id = ${tenantId}`)
        .executeTakeFirst();

      if (record?.value) {
        const state = JSON.parse(record.value) as StoredKdsState;
        state.tickets ||= {};
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [id, ticket] of Object.entries(state.tickets || {})) {
          const updatedAt = new Date(ticket.updatedAt).getTime();
          if (!Number.isFinite(updatedAt) || updatedAt < cutoff) delete state.tickets[id];
        }
        if (state.lastServedId && !state.tickets[String(state.lastServedId)]) state.lastServedId = undefined;
        return state;
      }
    } catch (e: any) {
      this.logger.warn(`Failed reading kds runtime state: ${e.message}`);
      throw e; // never overwrite persisted progress with a fabricated empty state
    }
    return { tickets: {} };
  }

  private async saveKdsStoreState(tenantId: string, state: StoredKdsState, db: Kysely<Database> = this.db): Promise<void> {
    const jsonStr = JSON.stringify(state);
    const existing = await db
      .selectFrom('settings')
      .select(['key'])
      .where('key', '=', 'kds_tickets_runtime_state')
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable('settings')
        .set({ value: jsonStr })
        .where('key', '=', 'kds_tickets_runtime_state')
        .where(sql<boolean>`tenant_id = ${tenantId}`)
        .execute();
    } else {
      await db
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

  /** All state writes are serialized on the tenant row and committed with the order update. */
  private async withKdsWrite<T>(tenantId: string, mutate: (trx: Kysely<Database>) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(async (trx) => {
      const tenant = await trx.selectFrom('tenants').select('id')
        .where('id', '=', tenantId).forUpdate().executeTakeFirst();
      if (!tenant) throw new NotFoundException('المنشأة غير موجودة');
      return mutate(trx);
    });
  }

  private async assertTicketOwned(
    db: Kysely<Database>, tenantId: string, ticketId: number, itemId?: number,
  ): Promise<void> {
    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
      throw new BadRequestException('رقم تذكرة المطبخ غير صالح');
    }
    if (ticketId >= 10_000_000) {
      const agg = await db.selectFrom('pos_aggregator_orders')
        .select(['id', 'status', 'order_payload'])
        .where('id', '=', ticketId - 10_000_000).where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      if (!agg || !['received', 'preparing', 'ready', 'picked_up'].includes(String(agg.status))) {
        throw new NotFoundException('تذكرة التوصيل غير موجودة أو ألغيت');
      }
      if (itemId !== undefined) {
        let payload: any;
        try { payload = typeof agg.order_payload === 'string' ? JSON.parse(agg.order_payload) : agg.order_payload; }
        catch { throw new BadRequestException('بيانات أصناف الطلب غير صالحة'); }
        if (!Array.isArray(payload?.items) || itemId < 1000 ||
            !Number.isSafeInteger(itemId) || itemId >= 1000 + payload.items.length) {
          throw new NotFoundException('صنف تذكرة التوصيل غير موجود');
        }
      }
      return;
    }
    const sale = await db.selectFrom('sales').select(['id', 'status', 'order_type'])
      .where('id', '=', ticketId).where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!sale || sale.status === 'cancelled' ||
        !['dine_in', 'takeaway', 'delivery'].includes(String(sale.order_type || 'dine_in'))) {
      throw new NotFoundException('تذكرة المطعم غير موجودة أو ألغيت');
    }
    if (itemId !== undefined) {
      const item = await db.selectFrom('sale_items').select('id')
        .where('tenant_id', '=', tenantId).where('sale_id', '=', ticketId)
        .where('id', '=', itemId).executeTakeFirst();
      if (!item) throw new NotFoundException('صنف التذكرة غير موجود');
    }
  }

  /**
   * Hands a kitchen ticket's progress from one sale to another — used when a storefront QR order's
   * DRAFT sale (what the kitchen was cooking from) is replaced by the cashier's POSTED sale. Without it
   * the kitchen would see the order vanish and reappear as a brand-new pending ticket.
   * With `toSaleId = null` the draft's state is simply dropped (order cancelled).
   * Item-level status is keyed by sale_item id, which changes with the new sale, so only the ticket
   * status carries over.
   */
  async transferTicketState(tenantId: string, fromSaleId: number, toSaleId: number | null): Promise<void> {
    return this.withKdsWrite(tenantId, async (trx) => {
    const state = await this.getKdsStoreState(tenantId, trx);
    const fromKey = String(fromSaleId);
    const stored = state.tickets?.[fromKey];
    if (!stored) return;

    delete state.tickets[fromKey];
    if (toSaleId) {
      state.tickets[String(toSaleId)] = {
        status: stored.status,
        itemsStatus: {},
        updatedAt: new Date().toISOString(),
      };
    }
    await this.saveKdsStoreState(tenantId, state, trx);

    });
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
  ): Promise<{ tickets: KdsTicket[]; stats: KdsSummaryStats; lastServedId?: number; truncated: boolean }> {
    const { tenantId } = requireTenantScope(auth);
    const runtimeState = await this.getKdsStoreState(tenantId);

    // Fetch sales from the past 14 hours
    const fourteenHoursAgo = new Date(Date.now() - 14 * 60 * 60 * 1000);
    const servedIds = Object.entries(runtimeState.tickets)
      .filter(([, state]) => state.status === 'served')
      .map(([id]) => Number(id)).filter((id) => Number.isSafeInteger(id) && id > 0);

    let salesQuery = this.db
      .selectFrom('sales as s')
      .leftJoin('users as u', (join) => join.onRef('u.id', '=', 's.created_by').onRef('u.tenant_id', '=', 's.tenant_id'))
      .leftJoin('customers as c', (join) => join.onRef('c.id', '=', 's.customer_id').onRef('c.tenant_id', '=', 's.tenant_id'))
      .select([
        's.id',
        's.doc_no',
        's.order_type',
        's.table_number',
        's.status as sale_status',
        's.note',
        's.created_at',
        's.customer_name',
        's.dining_course',
        's.aggregator_channel',
        's.pager_number',
        'c.name as customer_name_ref',
        'u.username as cashier_username',
      ])
      .where(this.tenantPredicate(auth, 's'))
      .where('s.created_at', '>=', fourteenHoursAgo)
      .where('s.status', '!=', 'cancelled')
      .where('s.order_type', 'in', ['dine_in', 'takeaway', 'delivery']);
    if (servedIds.length) salesQuery = salesQuery.where(sql<boolean>`s.id <> ALL(${servedIds}::bigint[])`);
    // Oldest outstanding tickets retain priority when the bounded kitchen queue overflows.
    const candidateRows = await salesQuery.orderBy('s.created_at', 'asc').orderBy('s.id', 'asc').limit(201).execute();
    const salesRows = candidateRows.slice(0, 200);
    const truncated = candidateRows.length > 200;

    const saleIds = salesRows.map((s) => Number(s.id));

    // Fetch sale items
    const itemRows = saleIds.length > 0
      ? await this.db
          .selectFrom('sale_items as si')
          .leftJoin('products as p', (join) => join
            .onRef('p.id', '=', 'si.product_id')
            .onRef('p.tenant_id', '=', 'si.tenant_id'))
          .select(['si.id', 'si.sale_id', 'si.product_id', 'si.product_name',
            'si.qty', 'si.unit_name', 'si.modifiers', 'si.notes',
            'p.kitchen_station as configured_station'])
          .where('si.sale_id', 'in', saleIds)
          .where('si.tenant_id', '=', tenantId)
          .orderBy('si.id', 'asc')
          .execute()
      : [];

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
          station: ['kitchen', 'grill', 'beverages', 'bakery', 'general'].includes(
            String(item.configured_station || '').toLowerCase())
            ? String(item.configured_station).toLowerCase() as KdsStation
            : this.inferItemStation(item.product_name),
        };
      });

      // Filter items by station if requested
      const stationFilter = filters?.station && filters.station !== 'all' && filters.station !== 'expo' ? filters.station : null;
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
        course: (sale as any).dining_course || undefined,
        aggregatorChannel: (sale as any).aggregator_channel || undefined,
        pagerNumber: (sale as any).pager_number || undefined,
      });

      totalMinutes += elapsedMinutes;
      countedForAvg++;
    }

    // Ingest live aggregator delivery orders (Jahez, Hungerstation, Talabat, Keeta, Deliveroo)
    const aggOrders = await this.db
      .selectFrom('pos_aggregator_orders as o')
      .innerJoin('pos_delivery_aggregators as a', 'a.id', 'o.aggregator_id')
      .select([
        'o.id',
        'o.display_number',
        'o.external_order_id',
        'o.status',
        'o.customer_name',
        'o.rider_name',
        'o.order_payload',
        'o.created_at',
        'a.code as aggregator_code',
        'a.name as aggregator_name',
      ])
      .where('o.tenant_id', '=', tenantId)
      .where('o.created_at', '>=', fourteenHoursAgo)
      .where('o.status', 'in', ['received', 'preparing', 'ready'])
      .orderBy('o.created_at', 'asc')
      .execute();

    for (const agg of aggOrders) {
      const aggTicketId = 10_000_000 + Number(agg.id);
      const ticketStored = runtimeState.tickets[String(aggTicketId)];
      const mappedStatus: KdsTicketStatus = ticketStored?.status
        || (agg.status === 'received' ? 'pending' : agg.status === 'preparing' ? 'cooking' : 'ready');

      if (mappedStatus === 'served' || (filters?.status && filters.status !== mappedStatus)) {
        continue;
      }

      const rawCreatedAt = agg.created_at;
      const createdAtMs = rawCreatedAt instanceof Date ? rawCreatedAt.getTime() : new Date(rawCreatedAt).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((now - createdAtMs) / 1000));
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);

      const payload = typeof agg.order_payload === 'string' ? JSON.parse(agg.order_payload) : (agg.order_payload || {});
      const payloadItems = Array.isArray(payload.items) ? payload.items : [];
      const items: KdsTicketItem[] = payloadItems.map((pi: any, idx: number) => {
        const itemId = 1000 + idx;
        return {
          id: itemId,
          productId: pi.productId ? Number(pi.productId) : undefined,
          name: pi.name || 'صنف توصيل',
          qty: Number(pi.qty) || 1,
          unitName: 'وجبة',
          modifiers: Array.isArray(pi.modifiers) ? pi.modifiers : [],
          notes: pi.notes,
          status: ticketStored?.itemsStatus?.[String(itemId)] || (mappedStatus === 'ready' ? 'ready' : 'pending'),
          station: this.inferItemStation(pi.name || ''),
        };
      });

      const stationFilter = filters?.station && filters.station !== 'all' && filters.station !== 'expo' ? filters.station : null;
      const filteredItems = stationFilter
        ? items.filter((it) => it.station === stationFilter)
        : items;

      if (stationFilter && !filteredItems.length) {
        continue;
      }

      tickets.push({
        id: aggTicketId,
        docNo: agg.display_number || agg.external_order_id,
        orderNumber: agg.display_number || agg.external_order_id,
        orderType: 'delivery',
        customerName: `${agg.aggregator_name} - ${agg.customer_name || 'عميل'} (سائق: ${agg.rider_name || 'بانتظار'})`,
        cashierName: agg.aggregator_code,
        status: mappedStatus,
        elapsedMinutes,
        elapsedSeconds,
        createdAt: new Date(createdAtMs).toISOString(),
        updatedAt: ticketStored?.updatedAt || new Date(createdAtMs).toISOString(),
        items: filteredItems,
        urgencyLevel: elapsedMinutes >= 15 ? 'critical' : elapsedMinutes >= 8 ? 'warning' : 'normal',
        aggregatorChannel: agg.aggregator_code,
        aggregatorOrderId: agg.external_order_id,
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
      truncated,
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
    return this.withKdsWrite(tenantId, async (trx) => {
    await this.assertTicketOwned(trx, tenantId, ticketId);
    const runtimeState = await this.getKdsStoreState(tenantId, trx);
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

    if (ticketId >= 10_000_000) {
      const realAggId = ticketId - 10_000_000;
      const dbAggStatus = nextStatus === 'cooking' ? 'preparing' : nextStatus === 'ready' ? 'ready' : 'picked_up';
      await trx
        .updateTable('pos_aggregator_orders')
        .set({ status: dbAggStatus, updated_at: new Date() })
        .where('id', '=', realAggId)
        .where('tenant_id', '=', tenantId)
        .execute();
    }

    await this.saveKdsStoreState(tenantId, runtimeState, trx);
    return { ticketId, newStatus: nextStatus };

    });
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
    return this.withKdsWrite(tenantId, async (trx) => {
    await this.assertTicketOwned(trx, tenantId, ticketId);
    if (!['pending', 'cooking', 'ready', 'served'].includes(status)) {
      throw new BadRequestException('حالة تذكرة المطبخ غير صالحة');
    }
    const runtimeState = await this.getKdsStoreState(tenantId, trx);
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

    if (ticketId >= 10_000_000) {
      const realAggId = ticketId - 10_000_000;
      const dbAggStatus = status === 'cooking' ? 'preparing' : status === 'ready' ? 'ready' : status === 'served' ? 'picked_up' : 'received';
      await trx
        .updateTable('pos_aggregator_orders')
        .set({ status: dbAggStatus, updated_at: new Date() })
        .where('id', '=', realAggId)
        .where('tenant_id', '=', tenantId)
        .execute();
    }

    await this.saveKdsStoreState(tenantId, runtimeState, trx);
    return { ticketId, status };

    });
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
    return this.withKdsWrite(tenantId, async (trx) => {
    await this.assertTicketOwned(trx, tenantId, ticketId, itemId);
    if (!['pending', 'cooking', 'ready'].includes(status)) {
      throw new BadRequestException('حالة صنف المطبخ غير صالحة');
    }
    const runtimeState = await this.getKdsStoreState(tenantId, trx);
    const existing = runtimeState.tickets[String(ticketId)] || {
      status: 'pending',
      itemsStatus: {},
      updatedAt: new Date().toISOString(),
    };

    existing.itemsStatus[String(itemId)] = status;
    existing.updatedAt = new Date().toISOString();
    runtimeState.tickets[String(ticketId)] = existing;

    await this.saveKdsStoreState(tenantId, runtimeState, trx);
    return { ticketId, itemId, itemStatus: status };

    });
  }
  /**
   * Recall the last served ticket back to "ready"
   */
  async recallLastServedTicket(
    auth: AuthContext
  ): Promise<{ recalled: boolean; ticketId?: number; status?: KdsTicketStatus }> {
    const { tenantId } = requireTenantScope(auth);
    return this.withKdsWrite(tenantId, async (trx) => {
    const runtimeState = await this.getKdsStoreState(tenantId, trx);

    const lastId = runtimeState.lastServedId;
    if (!lastId || !runtimeState.tickets[String(lastId)]) {
      return { recalled: false };
    }

    runtimeState.tickets[String(lastId)].status = 'ready';
    runtimeState.tickets[String(lastId)].updatedAt = new Date().toISOString();
    runtimeState.lastServedId = undefined;

    await this.saveKdsStoreState(tenantId, runtimeState, trx);
    return { recalled: true, ticketId: lastId, status: 'ready' };

    });
  }
  /**
   * Fire or advance the dining course for a ticket (Course Firing)
   * e.g. 'appetizer' -> 'main' -> 'dessert'
   */
  async fireTicketCourse(
    auth: AuthContext,
    ticketId: number,
    course?: 'appetizer' | 'main' | 'dessert' | 'beverage'
  ): Promise<{ ticketId: number; course: string }> {
    const { tenantId } = requireTenantScope(auth);
    return this.withKdsWrite(tenantId, async (trx) => {
    if (ticketId >= 10_000_000) throw new BadRequestException('إطلاق دورة التحضير يخص فواتير المطعم فقط');
    await this.assertTicketOwned(trx, tenantId, ticketId);
    if (course && !['appetizer', 'main', 'dessert', 'beverage'].includes(course)) {
      throw new BadRequestException('مرحلة التحضير غير صالحة');
    }
    let targetCourse = course;
    if (!targetCourse) {
      const sale = await trx
        .selectFrom('sales')
        .select(['dining_course'])
        .where('id', '=', ticketId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const current = (sale as any)?.dining_course || 'appetizer';
      if (current === 'appetizer') targetCourse = 'main';
      else if (current === 'main') targetCourse = 'dessert';
      else targetCourse = 'dessert';
    }

    await trx
      .updateTable('sales')
      .set({ dining_course: targetCourse } as any)
      .where('id', '=', ticketId)
      .where('tenant_id', '=', tenantId)
      .execute();

    const runtimeState = await this.getKdsStoreState(tenantId, trx);
    const existing = runtimeState.tickets[String(ticketId)];
    runtimeState.tickets[String(ticketId)] = {
      status: 'cooking',
      itemsStatus: existing?.itemsStatus || {},
      updatedAt: new Date().toISOString(),
    };
    await this.saveKdsStoreState(tenantId, runtimeState, trx);

    return { ticketId, course: targetCourse };

    });
  }}
