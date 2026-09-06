import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { WhatsAppGatewayService } from '../../settings/services/whatsapp-gateway.service';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface CashierRiskProfile {
  cashierId: number;
  cashierName: string;
  cartVoidsCount: number;
  draftCancelsCount: number;
  cancelledSalesCount: number;
  discountOverridesCount: number;
  totalSuspiciousEvents: number;
  totalSalesCount: number;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  lastSuspiciousAt?: string;
}

export interface FraudRadarSummaryResponse {
  timeframe: 'today' | '7days' | '30days';
  totalSuspiciousEvents: number;
  highRiskCashiersCount: number;
  mediumRiskCashiersCount: number;
  estimatedProtectedLoss: number;
  cashiers: CashierRiskProfile[];
  thresholds: {
    maxHourlyVoidsAlert: number;
    whatsappAlertsEnabled: boolean;
  };
}

export interface FraudRadarEventItem {
  id: number;
  cashierId: number;
  cashierName: string;
  eventType: 'cart_remove' | 'draft_cancel' | 'sale_cancelled' | 'discount_override';
  eventTitle: string;
  details: string;
  amount?: number;
  createdAt: string;
}

// In-memory debounce tracker for WhatsApp alerts: tenantId:cashierId -> lastAlertTimestamp
const recentAlertTimestamps = new Map<string, number>();

@Injectable()
export class CashierFraudRadarService {
  private readonly logger = new Logger(CashierFraudRadarService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    @Optional() private readonly whatsappService?: WhatsAppGatewayService,
  ) {}

  private getTimeFilter(timeframe: 'today' | '7days' | '30days'): string {
    if (timeframe === '7days') return "NOW() - INTERVAL '7 DAYS'";
    if (timeframe === '30days') return "NOW() - INTERVAL '30 DAYS'";
    return 'CURRENT_DATE';
  }

  async getSummary(timeframe: 'today' | '7days' | '30days' = 'today', auth: AuthContext): Promise<FraudRadarSummaryResponse> {
    const scope = requireTenantScope(auth);
    const timeSql = this.getTimeFilter(timeframe);

    // 1. Fetch active users / cashiers for this tenant
    const cashiers = await this.db
      .selectFrom('users')
      .select(['id', 'username', 'role'])
      .where('tenant_id', '=', scope.tenantId)
      .where('is_active', '=', true)
      .execute();

    // 2. Fetch security audit logs for the period
    const auditRows = await this.db
      .selectFrom('audit_logs')
      .select(['id', 'action', 'details', 'created_by', 'created_at'])
      .where('tenant_id', '=', scope.tenantId)
      .where(sql<boolean>`created_at >= ${sql.raw(timeSql)}`)
      .where((eb) =>
        eb.or([
          eb('action', 'like', '%حذف عنصر من السلة%'),
          eb('action', 'like', '%إلغاء/حذف فاتورة%'),
          eb('action', 'like', '%خصم%'),
          eb('action', 'like', '%مرتجع%'),
        ]),
      )
      .execute();

    // 3. Fetch cancelled sales for the period
    const cancelledSales = await this.db
      .selectFrom('sales')
      .select(['id', 'created_by', 'total', 'created_at'])
      .where('tenant_id', '=', scope.tenantId)
      .where('status', '=', 'cancelled')
      .where(sql<boolean>`created_at >= ${sql.raw(timeSql)}`)
      .execute();

    // 4. Fetch total completed sales by cashier to calculate normal baseline
    const completedSales = await this.db
      .selectFrom('sales')
      .select([
        'created_by',
        sql<number>`COUNT(id)`.as('sales_count'),
      ])
      .where('tenant_id', '=', scope.tenantId)
      .where('status', '!=', 'cancelled')
      .where(sql<boolean>`created_at >= ${sql.raw(timeSql)}`)
      .groupBy('created_by')
      .execute();

    const salesCountMap = new Map<number, number>();
    for (const s of completedSales) {
      if (s.created_by) salesCountMap.set(Number(s.created_by), Number(s.sales_count || 0));
    }

    // Process statistics per cashier
    const cashierStatsMap = new Map<number, {
      cartVoids: number;
      draftCancels: number;
      discountOverrides: number;
      cancelledSales: number;
      lastSuspiciousAt?: string;
    }>();

    for (const c of cashiers) {
      cashierStatsMap.set(Number(c.id), {
        cartVoids: 0,
        draftCancels: 0,
        discountOverrides: 0,
        cancelledSales: 0,
      });
    }

    let totalSuspiciousEvents = 0;
    let estimatedProtectedLoss = 0;

    for (const log of auditRows) {
      const uid = Number(log.created_by || 0);
      let stats = cashierStatsMap.get(uid);
      if (!stats) {
        stats = { cartVoids: 0, draftCancels: 0, discountOverrides: 0, cancelledSales: 0 };
        cashierStatsMap.set(uid, stats);
      }

      totalSuspiciousEvents++;
      const actionText = String(log.action || '');
      const createdStr = log.created_at ? new Date(log.created_at).toISOString() : undefined;

      if (actionText.includes('حذف عنصر من السلة')) {
        stats.cartVoids++;
        stats.lastSuspiciousAt = createdStr;
      } else if (actionText.includes('إلغاء/حذف فاتورة')) {
        stats.draftCancels++;
        stats.lastSuspiciousAt = createdStr;
      } else if (actionText.includes('خصم')) {
        stats.discountOverrides++;
        stats.lastSuspiciousAt = createdStr;
      }

      // Extract amount if present in details
      const match = String(log.details || '').match(/(?:الإجمالي|المبلغ|القيمة):\s*([\d.]+)/);
      if (match && match[1]) {
        estimatedProtectedLoss += Number(match[1]) || 0;
      }
    }

    for (const cs of cancelledSales) {
      const uid = Number(cs.created_by || 0);
      let stats = cashierStatsMap.get(uid);
      if (!stats) {
        stats = { cartVoids: 0, draftCancels: 0, discountOverrides: 0, cancelledSales: 0 };
        cashierStatsMap.set(uid, stats);
      }
      stats.cancelledSales++;
      totalSuspiciousEvents++;
      estimatedProtectedLoss += Number(cs.total || 0);
      stats.lastSuspiciousAt = cs.created_at ? new Date(cs.created_at).toISOString() : stats.lastSuspiciousAt;
    }

    const profiles: CashierRiskProfile[] = [];
    let highRiskCount = 0;
    let mediumRiskCount = 0;

    for (const c of cashiers) {
      const uid = Number(c.id);
      const stats = cashierStatsMap.get(uid) || { cartVoids: 0, draftCancels: 0, discountOverrides: 0, cancelledSales: 0 };
      const salesCount = salesCountMap.get(uid) || 0;
      const totalEvents = stats.cartVoids + stats.draftCancels + stats.cancelledSales + stats.discountOverrides;

      // Risk score algorithm (0 - 100)
      let rawScore = (stats.cartVoids * 12) + (stats.draftCancels * 18) + (stats.cancelledSales * 25) + (stats.discountOverrides * 8);
      if (salesCount > 10) {
        rawScore = rawScore / Math.max(1, (salesCount / 20));
      }
      const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      let riskLevel: RiskLevel = 'low';
      if (riskScore >= 60 || stats.cartVoids >= 5 || stats.cancelledSales >= 3) {
        riskLevel = 'high';
        highRiskCount++;
      } else if (riskScore >= 30 || totalEvents >= 3) {
        riskLevel = 'medium';
        mediumRiskCount++;
      }

      profiles.push({
        cashierId: uid,
        cashierName: c.username || `مستخدم #${uid}`,
        cartVoidsCount: stats.cartVoids,
        draftCancelsCount: stats.draftCancels,
        cancelledSalesCount: stats.cancelledSales,
        discountOverridesCount: stats.discountOverrides,
        totalSuspiciousEvents: totalEvents,
        totalSalesCount: salesCount,
        riskScore,
        riskLevel,
        lastSuspiciousAt: stats.lastSuspiciousAt,
      });
    }

    // Sort cashiers by riskScore descending
    profiles.sort((a, b) => b.riskScore - a.riskScore);

    return {
      timeframe,
      totalSuspiciousEvents,
      highRiskCashiersCount: highRiskCount,
      mediumRiskCashiersCount: mediumRiskCount,
      estimatedProtectedLoss: Number(estimatedProtectedLoss.toFixed(2)),
      cashiers: profiles,
      thresholds: {
        maxHourlyVoidsAlert: 5,
        whatsappAlertsEnabled: true,
      },
    };
  }

  async getEvents(limit = 40, auth: AuthContext): Promise<FraudRadarEventItem[]> {
    const scope = requireTenantScope(auth);
    const safeLimit = Math.min(100, Math.max(5, limit));

    const auditRows = await this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .select([
        'a.id',
        'a.action',
        'a.details',
        'a.created_by',
        'a.created_at',
        'u.username as cashier_name',
      ])
      .where('a.tenant_id', '=', scope.tenantId)
      .where((eb) =>
        eb.or([
          eb('a.action', 'like', '%حذف عنصر من السلة%'),
          eb('a.action', 'like', '%إلغاء/حذف فاتورة%'),
          eb('a.action', 'like', '%خصم%'),
        ]),
      )
      .orderBy('a.id', 'desc')
      .limit(safeLimit)
      .execute();

    return auditRows.map((row) => {
      let eventType: FraudRadarEventItem['eventType'] = 'cart_remove';
      const action = String(row.action || '');
      if (action.includes('إلغاء')) eventType = 'draft_cancel';
      else if (action.includes('خصم')) eventType = 'discount_override';

      let amount: number | undefined;
      const match = String(row.details || '').match(/(?:الإجمالي|المبلغ|القيمة):\s*([\d.]+)/);
      if (match && match[1]) {
        amount = Number(match[1]);
      }

      return {
        id: Number(row.id),
        cashierId: Number(row.created_by || 0),
        cashierName: row.cashier_name || `مستخدم #${row.created_by || 0}`,
        eventType,
        eventTitle: action,
        details: row.details || '',
        amount,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      };
    });
  }

  async checkAndAlertAnomaly(
    tenantId: string,
    cashierId: number,
    cashierName: string,
    eventType: string,
    details?: string,
  ): Promise<void> {
    if (!this.whatsappService) return;

    try {
      // Check count of void events for this cashier in the past 60 minutes
      const pastHourEvents = await this.db
        .selectFrom('audit_logs')
        .select(sql<number>`COUNT(id)`.as('cnt'))
        .where('tenant_id', '=', tenantId)
        .where('created_by', '=', cashierId)
        .where('action', 'like', '%حذف عنصر من السلة%')
        .where(sql<boolean>`created_at >= NOW() - INTERVAL '60 MINUTES'`)
        .executeTakeFirst();

      const voidCount = Number(pastHourEvents?.cnt || 0);

      // Trigger alert threshold: 5 or more voids in 1 hour
      if (voidCount >= 5) {
        const debounceKey = `${tenantId}:${cashierId}`;
        const lastAlert = recentAlertTimestamps.get(debounceKey) || 0;
        const now = Date.now();

        // Limit alert to once every 60 minutes per cashier
        if (now - lastAlert > 60 * 60 * 1000) {
          recentAlertTimestamps.set(debounceKey, now);

          const tenant = await this.db
            .selectFrom('tenants')
            .select(['business_name', 'owner_phone'])
            .where('id', '=', tenantId)
            .executeTakeFirst();

          if (tenant?.owner_phone) {
            const alertText =
              `🚨 *رادار الرقابة ومنع الخسائر - إنذار تلاعب كاشير*\n` +
              `🏢 *${tenant.business_name || 'إدارة المتجر'}*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `⚠️ تم رصد نمط مريب: الكاشير *(${cashierName})* قام بـ *${voidCount} عمليات حذف أصناف من السلة* خلال آخر ساعة!\n\n` +
              `📝 تفاصيل آخر عملية: ${details || 'حذف صنف بعد مسحه'}\n` +
              `⏰ التوقيت: ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n\n` +
              `🔍 _يُرجى فحص شاشة رادار الكاشير أو كاميرا المراقبة للتحقق من سلامة البيع._`;

            await this.whatsappService.sendRawMessage(tenantId, tenant.owner_phone, alertText);
            this.logger.warn(`Fraud alert sent to owner for cashier ${cashierName} (${voidCount} voids/hr)`);
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Fraud anomaly check error: ${err?.message}`);
    }
  }
}
