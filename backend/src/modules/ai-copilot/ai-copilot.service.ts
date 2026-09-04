import { Inject, Injectable, Logger } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Kysely, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

export interface CopilotResponse {
  answer: string;
  suggestedQuestions: string[];
  metrics?: Record<string, unknown>;
  engine?: 'gemini_llm' | 'local_analytics';
}

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
  ) {}

  async ask(question: string, actor: AuthContext): Promise<CopilotResponse> {
    const { tenantId } = requireTenantScope(actor);
    const q = (question || '').trim().toLowerCase();

    // 1. Gather live operational snapshot
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

    // Sales last 7 days
    const salesWeek = await this.db
      .selectFrom('sales')
      .select([
        sql<number>`COUNT(*)`.as('count'),
        sql<number>`COALESCE(SUM(total), 0)`.as('total_sales'),
      ])
      .where('tenant_id', '=', tenantId)
      .where(sql<boolean>`DATE(created_at) >= DATE(${sevenDaysAgo})`)
      .executeTakeFirst();

    const weekCount = Number(salesWeek?.count || 0);
    const weekSales = Number(salesWeek?.total_sales || 0);

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

    // Top 5 selling products of last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const topMonthlyRows = await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_name',
        sql<number>`SUM(si.quantity)`.as('total_qty'),
        sql<number>`SUM(si.total)`.as('total_amount'),
      ])
      .where('s.tenant_id', '=', tenantId)
      .where(sql<boolean>`DATE(s.created_at) >= DATE(${thirtyDaysAgo})`)
      .groupBy('si.product_name')
      .orderBy(sql`SUM(si.quantity)`, 'desc')
      .limit(5)
      .execute();

    // Top debtors
    const topDebtors = await this.db
      .selectFrom('customers')
      .select(['name', 'phone', 'balance'])
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .orderBy('balance', 'desc')
      .limit(5)
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
      .limit(5)
      .execute();

    // Total Inventory stats
    const inventoryStats = await this.db
      .selectFrom('products')
      .select([
        sql<number>`COUNT(*)`.as('total_products'),
        sql<number>`COALESCE(SUM(stock_qty * COALESCE(cost_price, 0)), 0)`.as('inventory_cost'),
        sql<number>`COALESCE(SUM(stock_qty * COALESCE(retail_price, 0)), 0)`.as('inventory_retail_value'),
      ])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .executeTakeFirst();

    const totalProducts = Number(inventoryStats?.total_products || 0);
    const inventoryCost = Number(inventoryStats?.inventory_cost || 0);
    const inventoryRetailValue = Number(inventoryStats?.inventory_retail_value || 0);

    // Snapshot object
    const snapshot = {
      todaySales,
      todayCount,
      todayCash,
      weekSales,
      weekCount,
      customerDebt,
      lowStock,
      totalProducts,
      inventoryCost,
      inventoryRetailValue,
      topDebtors: topDebtors.map((d) => ({ name: d.name, debt: Number(d.balance), phone: d.phone })),
      lowStockItems: lowStockItems.map((p) => ({ name: p.name, stock: Number(p.stock_qty), min: Number(p.min_stock_qty || 5) })),
      topProductsToday: topTodayRows.map((p) => ({ name: p.product_name, qty: Number(p.total_qty), total: Number(p.total_amount) })),
      topProductsMonth: topMonthlyRows.map((p) => ({ name: p.product_name, qty: Number(p.total_qty) })),
    };

    // 2. Try Generative AI (Gemini) if API key is present
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_COPILOT_API_KEY;
    if (geminiApiKey && geminiApiKey.trim()) {
      try {
        const llmResponse = await this.askGemini(question, snapshot, geminiApiKey.trim());
        if (llmResponse) {
          return {
            answer: llmResponse.answer,
            suggestedQuestions: llmResponse.suggestedQuestions,
            metrics: snapshot,
            engine: 'gemini_llm',
          };
        }
      } catch (err: any) {
        this.logger.warn(`Gemini LLM copilot failed, falling back to local engine: ${err?.message || err}`);
      }
    }

    // 3. Robust Local Deterministic NLP Analytics Engine (Zero Internet Dependency / Fallback)
    return this.runLocalAnalyticsEngine(q, snapshot);
  }

  private async askGemini(
    question: string,
    snapshot: Record<string, unknown>,
    apiKey: string,
  ): Promise<{ answer: string; suggestedQuestions: string[] } | null> {
    const prompt = `أنت (زاد AI)، المستشار التجاري والمالي الذكي المدمج في نظام إدارة المنشآت Z-Systems.
لديك البيانات الحالية المباشرة لنشاط التاجر:
${JSON.stringify(snapshot, null, 2)}

المطلوب:
1. أجب عن سؤال المستخدم الآتي بأسلوب احترافي وودود باللغة العربية (مصرية مهذبة أو فصحى مبسطة).
2. استند في إجابتك للأرقام الفعلية المتاحة في البيانات أعلاه.
3. قدم نصيحة تجارية ذكية وقابلة للتطبيق بناءً على السؤال.
4. اقترح 3 أسئلة تالية ذات صلة يمكن للمستخدم طرحها.

السؤال: "${question}"

أجب بصيغة JSON فقط بهذا الشكل:
{
  "answer": "نص الإجابة المفصل والمنسق بنقاط واضحة وتنسيق markdown",
  "suggestedQuestions": ["سؤال 1", "سؤال 2", "سؤال 3"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return null;

      const parsed = JSON.parse(rawText);
      return {
        answer: parsed.answer || rawText,
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0
          ? parsed.suggestedQuestions
          : ['مبيعات وأرباح اليوم', 'أكثر العملاء مديونية', 'الأصناف الحرجة في المخزن'],
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private runLocalAnalyticsEngine(q: string, s: any): CopilotResponse {
    // A: مبيعات وأرباح اليوم أو الأسبوع
    if (q.includes('كسبت') || q.includes('ارباح') || q.includes('أرباح') || q.includes('مبيعات') || q.includes('اليوم') || q.includes('دخل') || q.includes('اسبوع') || q.includes('أسبوع')) {
      const topStr = s.topProductsToday.length > 0
        ? `\n\n🔥 **أعلى الأصناف طلباً اليوم:**\n` + s.topProductsToday.map((p: any, i: number) => `${i + 1}. **${p.name}** (${p.qty} قطعة بـ ${p.total.toLocaleString('ar-EG')} ج.م)`).join('\n')
        : '\n\nلم يتم تسجيل مبيعات أصناف محددة لليوم بعد.';

      return {
        answer: `📊 **تقرير مبيعات وأداء النشاط:**\n\n` +
          `- إجمالي مبيعات اليوم: **${s.todaySales.toLocaleString('ar-EG')} ج.م** (${s.todayCount} فاتورة).\n` +
          `- النقدية المحصلة بالدرج اليوم: **${s.todayCash.toLocaleString('ar-EG')} ج.م**.\n` +
          `- إجمالي مبيعات آخر 7 أيام: **${s.weekSales.toLocaleString('ar-EG')} ج.م** (${s.weekCount} فاتورة).${topStr}\n\n` +
          `💡 **توصية زاد:** ${s.todayCount > 0 ? 'معدل البيع ممتاز، احرص على مطابقة جرد النقدية بالدرج قبل إغلاق الوردية.' : 'ننصح بتفعيل عروض ترويجية للأصناف سريعة الدوران لتحريك المبيعات اليوم.'}`,
        suggestedQuestions: [
          'مين أكتر عملاء عليهم فلوس؟',
          'ايه نواقص المخزن الحرجة؟',
          'تقييم إجمالي قيمة المخزون الحالي',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // B: ديون العملاء والتحصيل
    if (q.includes('دين') || q.includes('ديون') || q.includes('عملاء') || q.includes('فلوس') || q.includes('تحصيل') || q.includes('اجل') || q.includes('آجل') || q.includes('مستحقات')) {
      const debtorsStr = s.topDebtors.length > 0
        ? `\n\n👥 **أكبر العملاء مديونية حالياً:**\n` + s.topDebtors.map((c: any, i: number) => `${i + 1}. **${c.name}**: ${c.debt.toLocaleString('ar-EG')} ج.م ${c.phone ? `(هاتف: ${c.phone})` : ''}`).join('\n')
        : '\n\nممتاز! لا توجد مديونيات متأخرة على العملاء.';

      return {
        answer: `💰 **موقف ديون ومستحقات العملاء:**\n\n` +
          `- إجمالي المبالغ الآجلة لدى العملاء: **${s.customerDebt.toLocaleString('ar-EG')} ج.م**${debtorsStr}\n\n` +
          `💡 **توصية زاد:** استفد من خاصية إرسال كشوف الحسابات عبر الواتساب لتذكير العملاء بلطف بسداد مستحقاتهم، وربط السداد السريع بمكافآت نقاط الولاء.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'ايه نواقص المخزن الحرجة؟',
          'الأصناف الأكثر طلباً هذا الشهر',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // C: النواقص والمخزون
    if (q.includes('نواقص') || q.includes('مخزن') || q.includes('بضاعة') || q.includes('راكد') || q.includes('خلصت') || q.includes('منتجات') || q.includes('قيمة المخزون') || q.includes('جرد')) {
      const itemsStr = s.lowStockItems.length > 0
        ? `\n\n⚠️ **أبرز الأصناف التي قاربت على النفاد:**\n` + s.lowStockItems.map((p: any, i: number) => `${i + 1}. **${p.name}** (المتبقي: **${p.stock}** قطعة - حد الأمان: ${p.min})`).join('\n')
        : '\n\nجميع الأصناف متوفرة وتتخطى حدود الأمان.';

      return {
        answer: `📦 **حالة المخزون ورأس المال المقيد:**\n\n` +
          `- إجمالي الأصناف النشطة: **${s.totalProducts} صنف**.\n` +
          `- تكلفة المخزون الحالي: **${s.inventoryCost.toLocaleString('ar-EG')} ج.م**.\n` +
          `- القيمة البيعية التقديرية: **${s.inventoryRetailValue.toLocaleString('ar-EG')} ج.م**.\n` +
          `- أصناف حرجة تحتاج إعادة طلب: **${s.lowStock} صنف**${itemsStr}\n\n` +
          `💡 **توصية زاد:** قم بإنشاء أوامر شراء عاجلة للأصناف الحرجة لتجنب نفاد المخزون وفقدان العملاء.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'مين أكتر عملاء عليهم فلوس؟',
          'أكتر 5 منتجات مبيعاً',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // D: الأكثر مبيعاً
    if (q.includes('اكثر') || q.includes('أكثر') || q.includes('شائع') || q.includes('سحب') || q.includes('مبيعا') || q.includes('مبيعاً')) {
      const monthlyStr = s.topProductsMonth.length > 0
        ? `\n\n🏆 **الأكثر مبيعاً خلال آخر 30 يوماً:**\n` + s.topProductsMonth.map((p: any, i: number) => `${i + 1}. **${p.name}** (إجمالي مبيعات: **${p.qty}** قطعة)`).join('\n')
        : '\n\nلم يتم تسجيل بيانات مبيعات كافية خلال الشهر.';

      return {
        answer: `🔥 **تحليل الأصناف الأكثر طلباً وحركة:**${monthlyStr}\n\n` +
          `💡 **توصية زاد:** احرص على الحفاظ على مخزون أمان مرتفع من هذه الأصناف الرابحة، وفكر في عمل عروض مجمعة (Bundles) مع الأصناف الأقل حركة لزيادة متوسط قيمة الفاتورة.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'ايه نواقص المخزن الحرجة؟',
          'مين أكتر عملاء عليهم فلوس؟',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // E: الإجابة الشاملة العامة (Executive Overview)
    return {
      answer: `👋 **أهلاً بك يا فندم! إليك نظرة سريعة على نبض المنشأة اليوم:**\n\n` +
        `- 💵 **مبيعات اليوم:** ${s.todaySales.toLocaleString('ar-EG')} ج.م (${s.todayCount} فاتورة).\n` +
        `- 🏦 **المحصل نقداً بالدرج:** ${s.todayCash.toLocaleString('ar-EG')} ج.م.\n` +
        `- 📈 **مبيعات آخر 7 أيام:** ${s.weekSales.toLocaleString('ar-EG')} ج.م.\n` +
        `- 👥 **ديون العملاء الإجمالية:** ${s.customerDebt.toLocaleString('ar-EG')} ج.م.\n` +
        `- ⚠️ **نواقص المخزن الحرجة:** ${s.lowStock} صنف يحتاج لإعادة طلب.\n` +
        `- 📦 **قيمة المخزون الإجمالية:** ${s.inventoryCost.toLocaleString('ar-EG')} ج.م بالتكلفة.\n\n` +
        `أنا هنا لمساعدتك في أي استفسار عن أرقامك، مبيعاتك، أرباحك، أو تحليل حركة نشاطك!`,
      suggestedQuestions: [
        'كسبت كام النهاردة؟',
        'مين أكتر عملاء عليهم فلوس؟',
        'ايه نواقص المخزن الحرجة؟',
      ],
      metrics: s,
      engine: 'local_analytics',
    };
  }
}
