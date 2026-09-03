import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

export interface CopilotResponse {
  answer: string;
  suggestedQuestions: string[];
  metrics?: Record<string, unknown>;
}

@Injectable()
export class AiCopilotService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
  ) {}

  async ask(question: string, actor: AuthContext): Promise<CopilotResponse> {
    const { tenantId } = requireTenantScope(actor);
    const q = (question || '').trim().toLowerCase();

    // 1. Gather live operational snapshot
    const today = new Date().toISOString().slice(0, 10);

    // Sales today
    const salesToday = await this.db
      .selectFrom('sales')
      .select([
        sql<number>`COUNT(*)`.as('count'),
        sql<number>`COALESCE(SUM(total), 0)`.as('total_sales'),
        sql<number>`COALESCE(SUM(paid_amount), 0)`.as('cash_collected'),
      ])
      .where('tenant_id', '=', tenantId)
      .where(sql<boolean>`DATE(created_at) = DATE(${today})`)
      .executeTakeFirst();

    const todayCount = Number(salesToday?.count || 0);
    const todaySales = Number(salesToday?.total_sales || 0);
    const todayCash = Number(salesToday?.cash_collected || 0);

    // Top 5 selling products today
    const topTodayRows = await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_name',
        sql<number>`SUM(si.quantity)`.as('total_qty'),
        sql<number>`SUM(si.total)`.as('total_amount'),
      ])
      .where('s.tenant_id', '=', tenantId)
      .where(sql<boolean>`DATE(s.created_at) = DATE(${today})`)
      .groupBy('si.product_name')
      .orderBy(sql`SUM(si.total)`, 'desc')
      .limit(5)
      .execute();

    // Top 3 customers with outstanding debt
    const topDebtors = await this.db
      .selectFrom('customers')
      .select(['name', 'phone', 'balance'])
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .orderBy('balance', 'desc')
      .limit(3)
      .execute();

    const totalCustomerDebt = await this.db
      .selectFrom('customers')
      .select(sql<number>`COALESCE(SUM(balance), 0)`.as('total'))
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .executeTakeFirst();

    const customerDebt = Number(totalCustomerDebt?.total || 0);

    // Low stock items (< min_stock or <= 5)
    const lowStockCount = await this.db
      .selectFrom('products')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where(sql<boolean>`stock_qty <= COALESCE(min_stock_qty, 5)`)
      .executeTakeFirst();

    const lowStock = Number(lowStockCount?.count || 0);

    // Top low stock product names
    const lowStockItems = await this.db
      .selectFrom('products')
      .select(['name', 'stock_qty', 'min_stock_qty'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where(sql<boolean>`stock_qty <= COALESCE(min_stock_qty, 5)`)
      .limit(4)
      .execute();

    // 2. Intelligent Arabic NLP Intent Router
    // A: مبيعات وأرباح اليوم
    if (q.includes('كسبت') || q.includes('ارباح') || q.includes('أرباح') || q.includes('مبيعات') || q.includes('اليوم') || q.includes('دخل')) {
      const topStr = topTodayRows.length > 0
        ? `\n\n🔥 **أعلى الأصناف طلباً اليوم:**\n` + topTodayRows.map((p, i) => `${i + 1}. **${p.product_name}** (${Number(p.total_qty)} قطعة بـ ${Number(p.total_amount).toLocaleString('ar-EG')} ج.م)`).join('\n')
        : '\n\nلم يتم تسجيل مبيعات أصناف محددة لليوم بعد.';

      return {
        answer: `📊 **تقرير مبيعات اليوم حتى اللحظة:**\n\n- إجمالي المبيعات: **${todaySales.toLocaleString('ar-EG')} ج.م**\n- عدد الفواتير المنفذة: **${todayCount} فاتورة**\n- النقدية المحصلة: **${todayCash.toLocaleString('ar-EG')} ج.م**${topStr}\n\n💡 **توصية زاد:** ${todayCount > 0 ? 'معدل البيع ممتاز اليوم، احرص على تسوية الدرج مع الكاشير قبل نهاية الوردية.' : 'يمكنك تفعيل عروض ترويجية سريعة على الأصناف الأكثر ربحية لزيادة حركة البيع اليوم.'}`,
        suggestedQuestions: [
          'مين أكتر عملاء عليهم فلوس؟',
          'ايه نواقص المخزن الحرجة؟',
          'وضع الخزينة والديون ايه؟',
        ],
        metrics: { todaySales, todayCount, todayCash },
      };
    }

    // B: ديون العملاء والتحصيل
    if (q.includes('دين') || q.includes('ديون') || q.includes('عملاء') || q.includes('فلوس') || q.includes('تحصيل') || q.includes('اجل') || q.includes('آجل')) {
      const debtorsStr = topDebtors.length > 0
        ? `\n\n👥 **أكبر 3 عملاء عليهم مديونيات حالياً:**\n` + topDebtors.map((c, i) => `${i + 1}. **${c.name}**: ${Number(c.balance).toLocaleString('ar-EG')} ج.م ${c.phone ? `(هاتف: ${c.phone})` : ''}`).join('\n')
        : '\n\nممتاز! لا توجد مديونيات متأخرة على العملاء.';

      return {
        answer: `💰 **موقف ديون ومستحقات العملاء:**\n\n- إجمالي المبالغ الآجلة لدى العملاء: **${customerDebt.toLocaleString('ar-EG')} ج.م**${debtorsStr}\n\n💡 **توصية زاد:** يمكنك استخدام ميزة **حملات الواتساب** في شاشة العملاء لإرسال تذكير لطيف للعملاء بمستحقاتهم أو حثهم على السداد للاستفادة من نقاط الولاء.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'ايه نواقص المخزن الحرجة؟',
          'الأصناف الأكثر مبيعاً',
        ],
        metrics: { customerDebt, debtorsCount: topDebtors.length },
      };
    }

    // C: النواقص والمخزون
    if (q.includes('نواقص') || q.includes('مخزن') || q.includes('بضاعة') || q.includes('راكد') || q.includes('خلصت') || q.includes('منتجات')) {
      const itemsStr = lowStockItems.length > 0
        ? `\n\n⚠️ **أبرز الأصناف التي شارفت على النفاد:**\n` + lowStockItems.map((p, i) => `${i + 1}. **${p.name}** (المتبقي: **${p.stock_qty}** قطة فقط - حد الأمان: ${p.min_stock_qty || 5})`).join('\n')
        : '\n\nجميع الأصناف متوفرة وتتخطى حدود الأمان.';

      return {
        answer: `📦 **حالة المخزون والنواقص الحرجة:**\n\n- عدد الأصناف التي تحتاج إعادة طلب فوراً: **${lowStock} صنف**${itemsStr}\n\n💡 **توصية زاد:** ننصح بإنشاء أمر شراء أو مسودة توريد لهذه الأصناف فوراً لتجنب فقدان مبيعات أو رفض طلبات العملاء.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'مين أكتر عملاء عليهم فلوس؟',
          'الأصناف الأكثر مبيعاً اليوم',
        ],
        metrics: { lowStock },
      };
    }

    // D: الإجابة الشاملة العامة (Executive Overview)
    return {
      answer: `👋 **أهلاً بك يا فندم! إليك نظرة سريعة على نبض المنشأة اليوم:**\n\n` +
        `- 💵 **مبيعات اليوم:** ${todaySales.toLocaleString('ar-EG')} ج.م (${todayCount} فاتورة).\n` +
        `- 🏦 **المحصل نقداً بالدرج:** ${todayCash.toLocaleString('ar-EG')} ج.م.\n` +
        `- 👥 **ديون العملاء الإجمالية:** ${customerDebt.toLocaleString('ar-EG')} ج.م.\n` +
        `- ⚠️ **نواقص المخزن:** ${lowStock} صنف يحتاج لإعادة طلب.\n\n` +
        `أنا هنا لمساعدتك في أي سؤال تريده حول أرقامك، مبيعاتك، مخزونك، أو تحليل أداء نشاطك!`,
      suggestedQuestions: [
        'كسبت كام النهاردة؟',
        'مين أكتر عملاء عليهم فلوس؟',
        'ايه نواقص المخزن الحرجة؟',
      ],
      metrics: { todaySales, todayCount, customerDebt, lowStock },
    };
  }
}
