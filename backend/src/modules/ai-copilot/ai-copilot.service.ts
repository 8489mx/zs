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

    // 1. Gather live operational snapshot with full error resilience
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let todayCount = 0;
    let todaySales = 0;
    let todayCash = 0;
    let weekCount = 0;
    let weekSales = 0;
    let customerDebt = 0;
    let lowStock = 0;
    let totalProducts = 0;
    let inventoryCost = 0;
    let inventoryRetailValue = 0;
    let todayExpenses = 0;
    let monthExpenses = 0;
    let recentExpenses: Array<{ title: string; amount: number }> = [];
    let supplierDebt = 0;
    let topSuppliers: Array<{ name: string; phone: string | null; balance: number }> = [];
    let treasuryBalance = 0;
    let overdueInstallmentsCount = 0;
    let overdueInstallmentsAmount = 0;
    let topDebtors: Array<{ name: string; phone: string | null; balance: number }> = [];
    let lowStockItems: Array<{ name: string; stock_qty: number; min_stock_qty: number }> = [];
    let topTodayRows: Array<{ product_name: string; total_qty: number; total_amount: number }> = [];
    let topMonthlyRows: Array<{ product_name: string; total_qty: number }> = [];

    try {
      // Sales today
      const salesToday = await this.db
        .selectFrom('sales')
        .select([
          sql<number>`COUNT(*)`.as('count'),
          sql<number>`COALESCE(SUM(total), 0)`.as('total_sales'),
          sql<number>`COALESCE(SUM(paid_amount), 0)`.as('cash_collected'),
        ])
        .where('tenant_id', '=', tenantId)
        .where('created_at', '>=', startOfToday)
        .where('created_at', '<=', endOfToday)
        .where('status', '!=', 'cancelled')
        .executeTakeFirst();

      todayCount = Number(salesToday?.count || 0);
      todaySales = Number(salesToday?.total_sales || 0);
      todayCash = Number(salesToday?.cash_collected || 0);
    } catch (err: any) {
      this.logger.warn(`Failed to query sales today for copilot: ${err?.message || err}`);
    }

    try {
      // Sales last 7 days
      const salesWeek = await this.db
        .selectFrom('sales')
        .select([
          sql<number>`COUNT(*)`.as('count'),
          sql<number>`COALESCE(SUM(total), 0)`.as('total_sales'),
        ])
        .where('tenant_id', '=', tenantId)
        .where('created_at', '>=', sevenDaysAgo)
        .where('status', '!=', 'cancelled')
        .executeTakeFirst();

      weekCount = Number(salesWeek?.count || 0);
      weekSales = Number(salesWeek?.total_sales || 0);
    } catch (err: any) {
      this.logger.warn(`Failed to query weekly sales for copilot: ${err?.message || err}`);
    }

    try {
      // Top 5 selling products today (column in sale_items is 'qty' and 'line_total')
      const rows = await this.db
        .selectFrom('sale_items as si')
        .innerJoin('sales as s', 's.id', 'si.sale_id')
        .select([
          'si.product_name',
          sql<number>`COALESCE(SUM(si.qty), 0)`.as('total_qty'),
          sql<number>`COALESCE(SUM(si.line_total), 0)`.as('total_amount'),
        ])
        .where('s.tenant_id', '=', tenantId)
        .where('s.created_at', '>=', startOfToday)
        .where('s.created_at', '<=', endOfToday)
        .where('s.status', '!=', 'cancelled')
        .groupBy('si.product_name')
        .orderBy(sql`SUM(si.line_total)`, 'desc')
        .limit(5)
        .execute();

      topTodayRows = rows.map((r) => ({
        product_name: r.product_name,
        total_qty: Number(r.total_qty || 0),
        total_amount: Number(r.total_amount || 0),
      }));
    } catch (err: any) {
      this.logger.warn(`Failed to query top products today for copilot: ${err?.message || err}`);
    }

    try {
      // Top 5 selling products of last 30 days
      const rows = await this.db
        .selectFrom('sale_items as si')
        .innerJoin('sales as s', 's.id', 'si.sale_id')
        .select([
          'si.product_name',
          sql<number>`COALESCE(SUM(si.qty), 0)`.as('total_qty'),
        ])
        .where('s.tenant_id', '=', tenantId)
        .where('s.created_at', '>=', thirtyDaysAgo)
        .where('s.status', '!=', 'cancelled')
        .groupBy('si.product_name')
        .orderBy(sql`SUM(si.qty)`, 'desc')
        .limit(5)
        .execute();

      topMonthlyRows = rows.map((r) => ({
        product_name: r.product_name,
        total_qty: Number(r.total_qty || 0),
      }));
    } catch (err: any) {
      this.logger.warn(`Failed to query monthly top products for copilot: ${err?.message || err}`);
    }

    try {
      // Top debtors
      const rows = await this.db
        .selectFrom('customers')
        .select(['name', 'phone', 'balance'])
        .where('tenant_id', '=', tenantId)
        .where('balance', '>', 0)
        .orderBy('balance', 'desc')
        .limit(5)
        .execute();

      topDebtors = rows.map((r) => ({
        name: r.name,
        phone: r.phone,
        balance: Number(r.balance || 0),
      }));

      const totalCustomerDebt = await this.db
        .selectFrom('customers')
        .select(sql<number>`COALESCE(SUM(balance), 0)`.as('total'))
        .where('tenant_id', '=', tenantId)
        .where('balance', '>', 0)
        .executeTakeFirst();

      customerDebt = Number(totalCustomerDebt?.total || 0);
    } catch (err: any) {
      this.logger.warn(`Failed to query customer debt for copilot: ${err?.message || err}`);
    }

    try {
      // Expenses today & month
      const expToday = await sql<{ total: number }>`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE tenant_id = ${tenantId}
          AND expense_date >= ${startOfToday}
          AND expense_date <= ${endOfToday}
      `.execute(this.db);
      todayExpenses = Number(expToday.rows[0]?.total || 0);

      const expMonth = await sql<{ total: number }>`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE tenant_id = ${tenantId}
          AND expense_date >= ${thirtyDaysAgo}
      `.execute(this.db);
      monthExpenses = Number(expMonth.rows[0]?.total || 0);

      const expList = await sql<{ title: string; amount: number }>`
        SELECT title, amount
        FROM expenses
        WHERE tenant_id = ${tenantId}
        ORDER BY id DESC
        LIMIT 3
      `.execute(this.db);
      recentExpenses = expList.rows.map((r) => ({ title: r.title, amount: Number(r.amount || 0) }));
    } catch (err: any) {
      this.logger.warn(`Failed to query expenses for copilot: ${err?.message || err}`);
    }

    try {
      // Supplier payables
      const suppRows = await this.db
        .selectFrom('suppliers')
        .select(['name', 'phone', 'balance'])
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .where('balance', '>', 0)
        .orderBy('balance', 'desc')
        .limit(5)
        .execute();

      topSuppliers = suppRows.map((s) => ({
        name: s.name,
        phone: s.phone,
        balance: Number(s.balance || 0),
      }));

      const totalSuppDebt = await this.db
        .selectFrom('suppliers')
        .select(sql<number>`COALESCE(SUM(balance), 0)`.as('total'))
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .where('balance', '>', 0)
        .executeTakeFirst();

      supplierDebt = Number(totalSuppDebt?.total || 0);
    } catch (err: any) {
      this.logger.warn(`Failed to query suppliers for copilot: ${err?.message || err}`);
    }

    try {
      // Treasury balance
      const treasuryRow = await sql<{ total: number }>`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM treasury_transactions
        WHERE tenant_id = ${tenantId}
      `.execute(this.db);
      treasuryBalance = Number(treasuryRow.rows[0]?.total || 0);
    } catch (err: any) {
      this.logger.warn(`Failed to query treasury balance for copilot: ${err?.message || err}`);
    }

    try {
      // Overdue customer installments
      const instRow = await sql<{ count: number; total: number }>`
        SELECT COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as total
        FROM customer_installments
        WHERE tenant_id = ${tenantId}
          AND status IN ('pending', 'overdue')
          AND due_date < ${now}
      `.execute(this.db);
      overdueInstallmentsCount = Number(instRow.rows[0]?.count || 0);
      overdueInstallmentsAmount = Number(instRow.rows[0]?.total || 0);
    } catch (err: any) {
      this.logger.warn(`Failed to query customer installments for copilot: ${err?.message || err}`);
    }

    try {
      // Low stock items
      const lowStockCount = await this.db
        .selectFrom('products')
        .select(sql<number>`COUNT(*)`.as('count'))
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .where(sql<boolean>`COALESCE(stock_qty, 0) <= COALESCE(min_stock_qty, 5)`)
        .executeTakeFirst();

      lowStock = Number(lowStockCount?.count || 0);

      const items = await this.db
        .selectFrom('products')
        .select(['name', 'stock_qty', 'min_stock_qty'])
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .where(sql<boolean>`COALESCE(stock_qty, 0) <= COALESCE(min_stock_qty, 5)`)
        .limit(5)
        .execute();

      lowStockItems = items.map((p) => ({
        name: p.name,
        stock_qty: Number(p.stock_qty || 0),
        min_stock_qty: Number(p.min_stock_qty || 5),
      }));
    } catch (err: any) {
      this.logger.warn(`Failed to query low stock items for copilot: ${err?.message || err}`);
    }

    try {
      // Total Inventory stats
      const inventoryStats = await this.db
        .selectFrom('products')
        .select([
          sql<number>`COUNT(*)`.as('total_products'),
          sql<number>`COALESCE(SUM(COALESCE(stock_qty, 0) * COALESCE(cost_price, 0)), 0)`.as('inventory_cost'),
          sql<number>`COALESCE(SUM(COALESCE(stock_qty, 0) * COALESCE(retail_price, 0)), 0)`.as('inventory_retail_value'),
        ])
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .executeTakeFirst();

      totalProducts = Number(inventoryStats?.total_products || 0);
      inventoryCost = Number(inventoryStats?.inventory_cost || 0);
      inventoryRetailValue = Number(inventoryStats?.inventory_retail_value || 0);
    } catch (err: any) {
      this.logger.warn(`Failed to query inventory stats for copilot: ${err?.message || err}`);
    }

    // Snapshot object
    const snapshot = {
      todaySales,
      todayCount,
      todayCash,
      weekSales,
      weekCount,
      todayExpenses,
      monthExpenses,
      recentExpenses,
      customerDebt,
      overdueInstallmentsCount,
      overdueInstallmentsAmount,
      supplierDebt,
      topSuppliers,
      treasuryBalance,
      lowStock,
      totalProducts,
      inventoryCost,
      inventoryRetailValue,
      topDebtors: topDebtors.map((d) => ({ name: d.name, debt: Number(d.balance), phone: d.phone })),
      lowStockItems: lowStockItems.map((p) => ({ name: p.name, stock: Number(p.stock_qty), min: Number(p.min_stock_qty || 5) })),
      topProductsToday: topTodayRows.map((p) => ({ name: p.product_name, qty: Number(p.total_qty), total: Number(p.total_amount) })),
      topProductsMonth: topMonthlyRows.map((p) => ({ name: p.product_name, qty: Number(p.total_qty) })),
    };

    // 2. Try Generative AI (Gemini 1.5 Flash) if API key is present
    const geminiApiKey = await this.getEffectiveGeminiApiKey(tenantId);
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
    const prompt = `أنت (زاد AI)، المساعد والمستشار التجاري والمالي الذكي لنظام إدارة المنشآت Z-Systems.
لديك البيانات الحالية المباشرة لنشاط المنشأة كمرجع لك عند الحاجة:
${JSON.stringify(snapshot, null, 2)}

قواعدك الصارمة جداً:
1. أجب «على قد السؤال بالضبط» وبإيجاز شديد ومباشر (من سطر إلى 3 أسطر كحد أقصى).
2. ممنوع نهائياً سرد تقرير شامل أو استعراض أقسام وأرقام لم يطلبها المستخدم (مثل رصيد الخزينة أو المخزون أو الموردين دفعة واحدة)!
3. إذا سأل المستخدم عن بند محدد فقط (مثل: المبيعات، أو الخزينة، أو ديون العملاء)، أجب عن ذلك البند بالتحديد فقط بالأرقام المتاحة دون زيادة.
4. إذا كان السؤال دردشة أو تعليقاً أو تحية أو سؤالاً شخصياً عنك (مثل: "هو انت ai؟" أو "ينفع ترد عليا؟" أو "رد على قد السؤال")، أجب بروح ذكية ومرحة وموجزة في سطر واحد دون سرد أي أرقام أو بيانات من النظام!
5. تحدث باللغة العربية بأسلوب راقٍ ومهذب (لهجة مصرية مبسطة أو فصحى يسيرة).
6. اقترح فقط 3 أسئلة تالية قصيرة ومركزة تناسب نفس موضوع السؤال المطروح فقط.

السؤال: "${question}"

أجب بصيغة JSON فقط بهذا الشكل:
{
  "answer": "الإجابة المباشرة والموجزة على قد السؤال تماماً",
  "suggestedQuestions": ["سؤال 1", "سؤال 2", "سؤال 3"]
}`;

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-pro',
    ];

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
        });

        if (!res.ok) {
          if (res.status === 404) continue;
          return null;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        try {
          const cleanJson = rawText.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanJson);
          const ans = parsed.answer || parsed.response || parsed.reply || parsed.text || rawText;
          return {
            answer: typeof ans === 'string' ? ans : JSON.stringify(ans),
            suggestedQuestions: Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0
              ? parsed.suggestedQuestions
              : ['مبيعات وأرباح اليوم', 'أكثر العملاء مديونية', 'الأصناف الحرجة في المخزن'],
          };
        } catch {
          return {
            answer: rawText,
            suggestedQuestions: ['مبيعات وأرباح اليوم', 'أكثر العملاء مديونية', 'الأصناف الحرجة في المخزن'],
          };
        }
      } catch {
        // try next candidate model
      } finally {
        clearTimeout(timeout);
      }
    }
    return null;
  }

  private runLocalAnalyticsEngine(q: string, s: any): CopilotResponse {
    // 1: المصروفات والنفقات التشغيلية
    if (q.includes('مصروف') || q.includes('مصاريف') || q.includes('نفقات') || q.includes('مصروفات') || q.includes('صرفنا') || q.includes('خرج') || q.includes('نثريات') || q.includes('تكاليف')) {
      const recentList = s.recentExpenses && s.recentExpenses.length > 0
        ? `\n\n**أحدث بنود المصروفات المسجلة:**\n` + s.recentExpenses.map((e: any, i: number) => `${i + 1}. **${e.title}**: ${Number(e.amount || 0).toLocaleString('ar-EG')} ج.م`).join('\n')
        : '';

      return {
        answer: `**تقرير المصروفات والنفقات التشغيلية:**\n\n` +
          `- إجمالي مصروفات اليوم: **${Number(s.todayExpenses || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- إجمالي مصروفات آخر 30 يوماً: **${Number(s.monthExpenses || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- نسبة المصروفات لمبيعات اليوم: **${s.todaySales > 0 ? ((s.todayExpenses / s.todaySales) * 100).toFixed(1) + '%' : '0%'}**.${recentList}\n\n` +
          `**توصية زاد:** راقب النثريات اليومية واحتفظ بفواتير المصروفات التشغيلية في النظام لخصمها من وعاء الأرباح وحساب صافي الدخل بدقة.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'فلوس الخزينة والدرج الحالية',
          'مستحقات وفواتير الموردين',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 2: الخزينة والدرج والسيولة النقدية
    if (q.includes('خزينة') || q.includes('خزنة') || q.includes('درج') || q.includes('كاش') || q.includes('سيولة') || q.includes('سيوله') || q.includes('نقدية') || q.includes('نقديه')) {
      return {
        answer: `**حركة الخزينة والسيولة النقدية:**\n\n` +
          `- رصيد الخزينة الإجمالي المسجل: **${Number(s.treasuryBalance || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- النقدية المحصلة بالدرج اليوم: **${Number(s.todayCash || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- إجمالي مبيعات اليوم (نقدي وآجل): **${Number(s.todaySales || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- مصروفات اليوم النقدية: **${Number(s.todayExpenses || 0).toLocaleString('ar-EG')} ج.م**.\n\n` +
          `**توصية زاد:** قم بعمل جرد فعلي للنقدية ومطابقتها مع الدرج قبل إغلاق وردية الكاشير لتفادي أي عجز أو ترحيل خاطئ.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'صرفنا كام مصاريف النهاردة؟',
          'مين أكتر عملاء عليهم فلوس؟',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 3: الموردين والشركات ومستحقات الشراء
    if (q.includes('مورد') || q.includes('موردين') || q.includes('شركات') || q.includes('شركه') || q.includes('شركة') || q.includes('فواتير الشراء') || q.includes('مشتريات') || q.includes('مستحقات المورد')) {
      const suppStr = s.topSuppliers && s.topSuppliers.length > 0
        ? `\n\n**أكبر الموردين مستحقات حالياً:**\n` + s.topSuppliers.map((sup: any, i: number) => `${i + 1}. **${sup.name}**: ${Number(sup.balance || 0).toLocaleString('ar-EG')} ج.م ${sup.phone ? `(هاتف: ${sup.phone})` : ''}`).join('\n')
        : '\n\nممتاز! لا توجد مستحقات معلقة للموردين حالياً.';

      return {
        answer: `**موقف مستحقات وفواتير الموردين:**\n\n` +
          `- إجمالي المبالغ المستحقة للموردين: **${Number(s.supplierDebt || 0).toLocaleString('ar-EG')} ج.م**${suppStr}\n\n` +
          `**توصية زاد:** قم بجدولة دفعات الموردين في مواعيد منتظمة، واستفد من خصومات السداد المبكر التي تمنحها الشركات لرفع هامش ربحك.`,
        suggestedQuestions: [
          'فلوس الخزينة والدرج الحالية',
          'ايه نواقص المخزن الحرجة؟',
          'مين أكتر عملاء عليهم فلوس؟',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 4: ديون العملاء والتحصيل والأقساط
    if (q.includes('دين') || q.includes('ديون') || q.includes('عملاء') || q.includes('عميل') || q.includes('فلوس') || q.includes('تحصيل') || q.includes('اجل') || q.includes('آجل') || q.includes('مستحقات') || q.includes('قسط') || q.includes('أقساط') || q.includes('اقساط')) {
      const debtorsStr = s.topDebtors && s.topDebtors.length > 0
        ? `\n\n**أكبر العملاء مديونية حالياً:**\n` + s.topDebtors.map((c: any, i: number) => `${i + 1}. **${c.name}**: ${Number(c.debt || 0).toLocaleString('ar-EG')} ج.م ${c.phone ? `(هاتف: ${c.phone})` : ''}`).join('\n')
        : '\n\nممتاز! لا توجد مديونيات متأخرة على العملاء.';

      const overdueInstStr = s.overdueInstallmentsCount > 0
        ? `\n**تنبيه الأقساط:** يوجد **${s.overdueInstallmentsCount}** قسط متأخر بقيمة **${Number(s.overdueInstallmentsAmount || 0).toLocaleString('ar-EG')} ج.م** تحتاج متابعة فورية.`
        : '';

      return {
        answer: `**موقف ديون ومستحقات العملاء والأقساط:**\n\n` +
          `- إجمالي المبالغ الآجلة لدى العملاء: **${Number(s.customerDebt || 0).toLocaleString('ar-EG')} ج.م**.${overdueInstStr}${debtorsStr}\n\n` +
          `**توصية زاد:** استفد من خاصية إرسال كشوف الحسابات عبر الواتساب لتذكير العملاء بلطف بسداد مستحقاتهم، وربط السداد السريع بمكافآت نقاط الولاء.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'مستحقات وفواتير الموردين',
          'ايه نواقص المخزن الحرجة؟',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 5: النواقص والمخزون ورأس المال المقيد
    if (q.includes('نواقص') || q.includes('مخزن') || q.includes('بضاعة') || q.includes('بضاعه') || q.includes('راكد') || q.includes('خلصت') || q.includes('منتجات') || q.includes('قيمة المخزون') || q.includes('جرد') || q.includes('راس المال') || q.includes('رأس المال') || q.includes('تكلفة البضاعة')) {
      const itemsStr = s.lowStockItems && s.lowStockItems.length > 0
        ? `\n\n**أبرز الأصناف التي قاربت على النفاد:**\n` + s.lowStockItems.map((p: any, i: number) => `${i + 1}. **${p.name}** (المتبقي: **${p.stock}** قطعة - حد الأمان: ${p.min})`).join('\n')
        : '\n\nجميع الأصناف متوفرة وتتخطى حدود الأمان.';

      const potentialProfit = Math.max(0, Number(s.inventoryRetailValue || 0) - Number(s.inventoryCost || 0));

      return {
        answer: `**حالة المخزون ورأس المال المقيد:**\n\n` +
          `- إجمالي الأصناف النشطة: **${s.totalProducts} صنف**.\n` +
          `- تكلفة المخزون الحالي (رأس المال المجمد): **${Number(s.inventoryCost || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- القيمة البيعية التقديرية: **${Number(s.inventoryRetailValue || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- هامش الربح الإجمالي المتوقع في البضاعة: **${potentialProfit.toLocaleString('ar-EG')} ج.م**.\n` +
          `- أصناف حرجة تحتاج إعادة طلب: **${s.lowStock} صنف**${itemsStr}\n\n` +
          `**توصية زاد:** قم بإنشاء أوامر شراء عاجلة للأصناف الحرجة لتجنب نفاد المخزون وفقدان العملاء.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'مين أكتر عملاء عليهم فلوس؟',
          'أكتر 5 منتجات مبيعاً',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 6: الأكثر طلباً ومبيعاً
    if (q.includes('اكثر') || q.includes('أكثر') || q.includes('شائع') || q.includes('سحب') || q.includes('مبيعا') || q.includes('مبيعاً') || q.includes('ترند') || q.includes('اعلى مبيع') || q.includes('أعلى مبيع') || q.includes('بست سيلر')) {
      const monthlyStr = s.topProductsMonth && s.topProductsMonth.length > 0
        ? `\n\n**الأكثر مبيعاً خلال آخر 30 يوماً:**\n` + s.topProductsMonth.map((p: any, i: number) => `${i + 1}. **${p.name}** (إجمالي مبيعات: **${p.qty}** قطعة)`).join('\n')
        : '\n\nلم يتم تسجيل بيانات مبيعات كافية خلال الشهر.';

      return {
        answer: `**تحليل الأصناف الأكثر طلباً وحركة:**${monthlyStr}\n\n` +
          `**توصية زاد:** احرص على الحفاظ على مخزون أمان مرتفع من هذه الأصناف الرابحة، وفكر في عمل عروض مجمعة (Bundles) مع الأصناف الأقل حركة لزيادة متوسط قيمة الفاتورة.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'ايه نواقص المخزن الحرجة؟',
          'ازاي أزود أرباحي النهاردة؟',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 7: استشارات وأفكار لزيادة الأرباح وتطوير النشاط (Business Advisory)
    if (q.includes('نصيحة') || q.includes('نصيحه') || q.includes('ازاي') || q.includes('كيف') || q.includes('أزود') || q.includes('ازود') || q.includes('زيادة') || q.includes('تطوير') || q.includes('افكار') || q.includes('أفكار') || q.includes('اقتراح') || q.includes('اقتراحات')) {
      return {
        answer: `**خطة ذكية مقترحة لزيادة أرباحك وتطوير المنشأة:**\n\n` +
          `1. **التحصيل السريع:** لديك **${Number(s.customerDebt || 0).toLocaleString('ar-EG')} ج.م** ديون خارجية. تحصيل 30% منها يوفر لك سيولة فورية تمول بها مشتريات بضائع سريعة الدوران دون الحاجة للاستدانة.\n` +
          `2. **حماية المبيعات من النواقص:** يوجد **${s.lowStock} صنف حرج**. كل زبون يطلب صنفاً ناقصاً يقلل ولاءه؛ جهز أمر شراء اليوم للأصناف الأكثر طلباً.\n` +
          `3. **عروض الحزم (Cross-selling):** اربط المنتجات الأكثر مبيعاً مع الأصناف بطيئة الحركة في عرض مخفض لزيادة متوسط قيمة الفاتورة.\n` +
          `4. **ضبط المصروفات:** احرص على ألا تتجاوز المصاريف اليومية نسبة 15% من إجمالي المبيعات لتعظيم صافي أرباحك.\n\n` +
          `**توصية زاد:** فعّل نظام نقاط الولاء لعملائك لضمان عودتهم المستمرة للشراء.`,
        suggestedQuestions: [
          'كسبت كام النهاردة؟',
          'مين أكتر عملاء عليهم فلوس؟',
          'ايه نواقص المخزن الحرجة؟',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 8: مبيعات وأرباح اليوم أو الأسبوع
    if (q.includes('كسبت') || q.includes('ارباح') || q.includes('أرباح') || q.includes('مبيعات') || q.includes('اليوم') || q.includes('دخل') || q.includes('اسبوع') || q.includes('أسبوع') || q.includes('شهر') || q.includes('فواتير') || q.includes('بيع')) {
      const topStr = s.topProductsToday && s.topProductsToday.length > 0
        ? `\n\n**أعلى الأصناف طلباً اليوم:**\n` + s.topProductsToday.map((p: any, i: number) => `${i + 1}. **${p.name}** (${p.qty} قطعة بـ ${Number(p.total || 0).toLocaleString('ar-EG')} ج.م)`).join('\n')
        : '\n\nلم يتم تسجيل مبيعات أصناف محددة لليوم بعد.';

      return {
        answer: `**تقرير مبيعات وأداء النشاط:**\n\n` +
          `- إجمالي مبيعات اليوم: **${Number(s.todaySales || 0).toLocaleString('ar-EG')} ج.م** (${s.todayCount} فاتورة).\n` +
          `- النقدية المحصلة بالدرج اليوم: **${Number(s.todayCash || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- مصروفات اليوم: **${Number(s.todayExpenses || 0).toLocaleString('ar-EG')} ج.م**.\n` +
          `- صافي النقدية التقديري اليوم: **${Number((s.todayCash || 0) - (s.todayExpenses || 0)).toLocaleString('ar-EG')} ج.م**.\n` +
          `- إجمالي مبيعات آخر 7 أيام: **${Number(s.weekSales || 0).toLocaleString('ar-EG')} ج.م** (${s.weekCount} فاتورة).${topStr}\n\n` +
          `**توصية زاد:** ${s.todayCount > 0 ? 'معدل البيع ممتاز، احرص على مطابقة جرد النقدية بالدرج قبل إغلاق الوردية.' : 'ننصح بتفعيل عروض ترويجية للأصناف سريعة الدوران لتحريك المبيعات اليوم.'}`,
        suggestedQuestions: [
          'مين أكتر عملاء عليهم فلوس؟',
          'ايه نواقص المخزن الحرجة؟',
          'فلوس الخزينة والدرج الحالية',
        ],
        metrics: s,
        engine: 'local_analytics',
      };
    }

    // 9: الإجابة الشاملة العامة (Executive Overview)
    return {
      answer: `**أهلاً بك يا فندم! إليك نبض المنشأة الشامل لحظة بلحظة:**\n\n` +
        `- **مبيعات اليوم:** ${Number(s.todaySales || 0).toLocaleString('ar-EG')} ج.م (${s.todayCount} فاتورة).\n` +
        `- **المحصل نقداً بالدرج:** ${Number(s.todayCash || 0).toLocaleString('ar-EG')} ج.م.\n` +
        `- **مصروفات اليوم:** ${Number(s.todayExpenses || 0).toLocaleString('ar-EG')} ج.م.\n` +
        `- **مبيعات آخر 7 أيام:** ${Number(s.weekSales || 0).toLocaleString('ar-EG')} ج.م.\n` +
        `- **ديون العملاء الآجلة:** ${Number(s.customerDebt || 0).toLocaleString('ar-EG')} ج.م.\n` +
        `- **مستحقات الموردين:** ${Number(s.supplierDebt || 0).toLocaleString('ar-EG')} ج.م.\n` +
        `- **نواقص المخزن الحرجة:** ${s.lowStock} صنف يحتاج لإعادة طلب.\n` +
        `- **رأس المال المقيد بالمخزون:** ${Number(s.inventoryCost || 0).toLocaleString('ar-EG')} ج.م بالتكلفة.\n\n` +
        `أنا هنا لمساعدتك! يمكنك اختيار سؤال جاهز من المقترحات أدناه أو كتابة سؤالك وسأجيبك فوراً.`,
      suggestedQuestions: [
        'كسبت كام النهاردة؟',
        'فلوس الخزينة والدرج الحالية',
        'مين أكتر عملاء عليهم فلوس؟',
        'مستحقات وفواتير الموردين',
        'ايه نواقص المخزن الحرجة؟',
        'أكتر 5 منتجات مبيعاً',
      ],
      metrics: s,
      engine: 'local_analytics',
    };
  }

  async getEffectiveGeminiApiKey(tenantId: string): Promise<string | null> {
    try {
      const row = await this.db
        .selectFrom('settings')
        .select('value')
        .where('tenant_id', '=', tenantId)
        .where('key', '=', 'gemini_api_key')
        .executeTakeFirst();

      if (row && row.value) {
        let val: any = row.value;
        try {
          val = JSON.parse(val);
        } catch {
          // string
        }
        if (typeof val === 'string' && val.trim().length > 5) {
          return val.trim();
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to read tenant gemini key: ${err?.message || err}`);
    }

    const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_COPILOT_API_KEY;
    if (envKey && envKey.trim().length > 5) {
      return envKey.trim();
    }
    return null;
  }

  async getConfig(actor: AuthContext): Promise<{
    hasApiKey: boolean;
    isCustomKey: boolean;
    maskedKey: string;
    engine: 'gemini_llm' | 'local_analytics';
    model: string;
  }> {
    const { tenantId } = requireTenantScope(actor);
    const customRow = await this.db
      .selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'gemini_api_key')
      .executeTakeFirst();

    let customKey: string | null = null;
    if (customRow?.value) {
      try {
        customKey = JSON.parse(customRow.value);
      } catch {
        customKey = customRow.value;
      }
    }

    const effectiveKey = await this.getEffectiveGeminiApiKey(tenantId);
    const hasKey = !!(effectiveKey && effectiveKey.trim());
    const isCustom = !!(customKey && typeof customKey === 'string' && customKey.trim().length > 5);

    let masked = '';
    if (effectiveKey && effectiveKey.length > 8) {
      masked = `${effectiveKey.slice(0, 4)}••••${effectiveKey.slice(-4)}`;
    }

    return {
      hasApiKey: hasKey,
      isCustomKey: isCustom,
      maskedKey: masked,
      engine: hasKey ? 'gemini_llm' : 'local_analytics',
      model: 'Google Gemini 3.6 Flash (المجاني الفائق)',
    };
  }

  async saveConfig(payload: { geminiApiKey?: string }, actor: AuthContext): Promise<{ ok: boolean }> {
    const { tenantId, accountId } = requireTenantScope(actor);
    const keyVal = (payload.geminiApiKey || '').trim();

    if (keyVal) {
      await sql`
        INSERT INTO settings (key, value, tenant_id, account_id)
        VALUES ('gemini_api_key', ${JSON.stringify(keyVal)}, ${tenantId}, ${accountId})
        ON CONFLICT (tenant_id, key)
        DO UPDATE SET value = EXCLUDED.value, account_id = EXCLUDED.account_id
      `.execute(this.db);
    } else {
      await this.db
        .deleteFrom('settings')
        .where('tenant_id', '=', tenantId)
        .where('key', '=', 'gemini_api_key')
        .execute();
    }

    return { ok: true };
  }

  async testGeminiKey(apiKey?: string, actor?: AuthContext): Promise<{ success: boolean; message: string; model?: string }> {
    let keyToTest = (apiKey || '').trim();
    if (!keyToTest && actor) {
      const { tenantId } = requireTenantScope(actor);
      keyToTest = (await this.getEffectiveGeminiApiKey(tenantId)) || '';
    }

    if (!keyToTest) {
      return { success: false, message: 'لم يتم توفير مفتاح Gemini لاختباره' };
    }

    // 1. First, ask Google directly which models are active for this specific key
    let detectedModel: string | null = null;
    let listError: string | null = null;

    for (const apiVer of ['v1beta', 'v1']) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models`, {
          headers: { 'x-goog-api-key': keyToTest },
        });

        const listData = await listRes.json().catch(() => ({}));
        if (listRes.ok && Array.isArray(listData?.models)) {
          const flash = listData.models.find(
            (m: any) =>
              m.supportedGenerationMethods?.includes('generateContent') &&
              (m.name?.includes('flash') || m.displayName?.toLowerCase()?.includes('flash')),
          );
          const anyGen = listData.models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
          const chosen = flash || anyGen;
          if (chosen?.name) {
            detectedModel = chosen.name.replace(/^models\//, '');
            break;
          }
        } else if (listData?.error?.message) {
          listError = listData.error.message;
        }
      } catch (err: any) {
        listError = err?.message || String(err);
      }
    }

    // 2. Candidate models prioritizing high-performance active flash models
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      ...(detectedModel ? [detectedModel] : []),
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
    ];
    const uniqueModels = Array.from(new Set(candidateModels));

    let lastError = listError || '';

    for (const model of uniqueModels) {
      for (const apiVer of ['v1beta', 'v1']) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        try {
          // Pass key in header (official standard for new AQ. keys)
          const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': keyToTest,
            },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Respond with OK' }] }],
              generationConfig: { maxOutputTokens: 10 },
            }),
          });

          if (res.ok) {
            return {
              success: true,
              message: `تم الاتصال بنموذج Google (${model}) بنجاح وفاعلية!`,
              model,
            };
          }

          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status}`;
          lastError = errMsg;

          if (errMsg.includes('API_KEY_SERVICE_BLOCKED')) {
            return {
              success: false,
              message: 'المفتاح محظور (API_KEY_SERVICE_BLOCKED): يرجى في صفحة Google AI Studio الضغط على "Create API key in new project" لإنشاء مفتاح في مشروع جديد غير مقيد.',
            };
          }

          if (res.status !== 404 && !errMsg.toLowerCase().includes('not found')) {
            // Not a missing model error, move to next or return
            break;
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    return { success: false, message: `فشل الاتصال بجوجل: ${lastError}` };
  }

  async generateSalesBotReply(params: {
    question: string;
    tenantId: string;
    customerPhone?: string;
  }): Promise<{ reply: string; matchedProducts: any[]; engine: 'gemini_llm' | 'local_smart' }> {
    const { question, tenantId } = params;
    const q = (question || '').trim();

    // 1. Get tenant business info
    const tenant = await this.db
      .selectFrom('tenants')
      .select(['business_name', 'slug', 'custom_domain'])
      .where('id', '=', tenantId)
      .executeTakeFirst();

    const businessName = tenant?.business_name || 'متجرنا';
    const storefrontUrl = tenant?.custom_domain
      ? `https://${tenant.custom_domain}`
      : tenant?.slug
        ? `https://zsystems.app/store/${tenant.slug}`
        : undefined;

    // 2. Read custom bot prompt & currency
    const promptRow = await this.db
      .selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId)
      .where('key', '=', 'whatsapp_gateway_ai_bot_prompt')
      .executeTakeFirst();

    let customPrompt = '';
    if (promptRow?.value) {
      try { customPrompt = JSON.parse(promptRow.value); } catch { customPrompt = promptRow.value; }
    }

    // 3. Fetch active catalog products
    const rawProducts = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'retail_price', 'stock_qty', 'color', 'size'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('stock_qty', 'desc')
      .limit(60)
      .execute();

    const products = rawProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.retail_price || 0),
      stock: Number(p.stock_qty || 0),
      color: p.color,
      size: p.size,
    }));

    // Find relevant matched products for frontend UI or metadata
    const matchedProducts = products.filter((p) => {
      const words = p.name.toLowerCase().split(/\s+/);
      const qLower = q.toLowerCase();
      return words.some((w) => w.length > 2 && qLower.includes(w)) || qLower.includes(p.name.toLowerCase());
    });

    const apiKey = await this.getEffectiveGeminiApiKey(tenantId);
    if (apiKey) {
      try {
        const geminiReply = await this.askGeminiSalesBot(
          q,
          products,
          {
            name: businessName,
            currency: 'ج.م',
            storefrontUrl,
            customPrompt,
          },
          apiKey,
        );

        if (geminiReply && geminiReply.trim()) {
          return {
            reply: geminiReply.trim(),
            matchedProducts: matchedProducts.slice(0, 5),
            engine: 'gemini_llm',
          };
        }
      } catch (err: any) {
        this.logger.warn(`Gemini sales bot failed, falling back to local: ${err?.message || err}`);
      }
    }

    // Fallback to local smart sales responder
    const localReply = this.runLocalSalesResponder(
      q,
      products,
      {
        name: businessName,
        currency: 'ج.م',
        storefrontUrl,
      },
    );

    return {
      reply: localReply,
      matchedProducts: matchedProducts.slice(0, 5),
      engine: 'local_smart',
    };
  }

  private async askGeminiSalesBot(
    customerMessage: string,
    products: Array<{ name: string; price: number; stock: number; color?: string | null; size?: string | null }>,
    businessInfo: { name: string; currency: string; storefrontUrl?: string; customPrompt?: string },
    apiKey: string,
  ): Promise<string | null> {
    const catalogText = products.slice(0, 45).map((p, idx) =>
      `${idx + 1}. ${p.name} | السعر: ${p.price} ${businessInfo.currency} | المتوفر بالمخزن: ${p.stock > 0 ? p.stock + ' قطعة' : 'غير متوفر حالياً'}${p.color ? ' | اللون: ' + p.color : ''}${p.size ? ' | المقاس: ' + p.size : ''}`
    ).join('\n');

    const prompt = `أنت المساعد الذكي لمبيعات وخدمة عملاء متجر "${businessInfo.name}".
مهمتك: الرد على استفسار الزبون على تطبيق واتساب بأسلوب لطيف ومحترف باللهجة العربية/المصرية السلسة والمحترمة.

قواعدك الصارمة:
1. اعتمد فقط على قائمة المنتجات والأسعار المتاحة بالمخزن أدناه:
${catalogText}

2. إذا سأل العميل عن منتج متاح، اذكر سعره بدقة وتوفر المخزون، وشجعه على الشراء${businessInfo.storefrontUrl ? ` مع رابط المتجر: ${businessInfo.storefrontUrl}` : ''}.
3. إذا سأل عن منتج غير موجود أو كميته 0، اعتذر بلطف ولباقة واقترح أقرب بديل إن وجد من القائمة.
4. حافظ على ردود مختصرة ومناسبة للواتساب (بين 2 إلى 4 أسطر)، مريحة للقراءة وبإيموجيز لطيفة غير مبالغ فيها.
5. لا تؤلف منتجات أو أسعار غير موجودة في القائمة.
${businessInfo.customPrompt ? `تعليمات التاجر الإضافية: ${businessInfo.customPrompt}` : ''}

رسالة العميل الواردة:
"${customerMessage}"

اكتب الرد النهائي الموجه للعميل مباشرة دون مقدمات أو شروحات إضافية.`;

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-pro',
    ];

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
            },
          }),
        });

        if (!res.ok) {
          if (res.status === 404) continue;
          return null;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) return rawText.trim();
      } catch {
        // try next
      } finally {
        clearTimeout(timeout);
      }
    }
    return null;
  }

  private runLocalSalesResponder(
    customerMessage: string,
    products: Array<{ name: string; price: number; stock: number }>,
    businessInfo: { name: string; currency: string; storefrontUrl?: string },
  ): string {
    const q = (customerMessage || '').toLowerCase();
    const matched = products.filter((p) => {
      const words = p.name.toLowerCase().split(/\s+/);
      return words.some((w) => w.length > 2 && q.includes(w)) || q.includes(p.name.toLowerCase());
    });

    if (matched.length > 0) {
      const top = matched.slice(0, 3);
      const itemsList = top
        .map((p) => `• *${p.name}*: سعره ${p.price} ${businessInfo.currency} (${p.stock > 0 ? `متوفر ${p.stock} قطعة` : 'غير متوفر حالياً'})`)
        .join('\n');
      return `أهلاً بك يا فندم في ${businessInfo.name}! 🌟\n\nبخصوص استفسارك، إليك المنتجات المتوفرة:\n${itemsList}\n\n${businessInfo.storefrontUrl ? `تقدر تطلب أونلاين مباشرة عبر متجرنا: ${businessInfo.storefrontUrl}\n` : ''}لو محتاج أي مساعدة في الطلب أنا تحت أمرك!`;
    }

    return `أهلاً بك في ${businessInfo.name}! 🌟\nسعداء بتواصلك معنا. يمكنك استعراض كافة منتجاتنا وأحدث العروض والأسعار عبر المتجر:\n${businessInfo.storefrontUrl || 'متجرنا الإلكتروني'}\n\nأو يمكنك توضيح اسم الصنف المطلوب وسأوافيك بتفاصيله فوراً!`;
  }
}
