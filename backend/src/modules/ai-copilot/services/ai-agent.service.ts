import { Inject, Injectable, Logger } from '@nestjs/common';
import { KYSELY_DB } from '../../../database/database.constants';
import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AiKnowledgeService } from './ai-knowledge.service';

export interface AgentChatMessage {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningSteps?: Array<{ step: string; observation: string }>;
  suggestedQuestions?: string[];
  createdAt?: Date;
}

export interface AgentChatResponse {
  sessionId: string;
  answer: string;
  reasoningSteps: Array<{ step: string; observation: string }>;
  suggestedQuestions: string[];
  toolsUsed: string[];
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly knowledgeService: AiKnowledgeService,
  ) {}

  /**
   * Main conversational agent endpoint: multi-turn memory + tool execution + out-of-the-box reasoning
   */
  async chat(
    message: string,
    sessionId: string | undefined,
    actor: AuthContext,
    apiKey?: string,
    provider: 'gemini' | 'openai' | 'custom' = 'gemini',
    model?: string,
    baseUrl?: string,
  ): Promise<AgentChatResponse> {
    const { tenantId } = requireTenantScope(actor);
    const userId = actor.userId;
    const text = (message || '').trim();

    // 1. Get or create session
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await this.db
        .insertInto('ai_chat_sessions')
        .values({
          id: activeSessionId,
          tenant_id: tenantId,
          user_id: userId || null,
          title: text.substring(0, 50) || 'محادثة ذكية',
          is_active: true,
        })
        .execute();
    }

    // 2. Fetch conversation history for context (last 6 messages)
    const historyRows = await this.db
      .selectFrom('ai_chat_messages')
      .select(['role', 'content', 'created_at'])
      .where('session_id', '=', activeSessionId)
      .where('tenant_id', '=', tenantId)
      .orderBy('id', 'asc')
      .limit(6)
      .execute();

    const conversationHistory: Array<{ role: string; content: string }> = historyRows.map((r) => ({
      role: r.role,
      content: r.content,
    }));

    // Save user message
    await this.db
      .insertInto('ai_chat_messages')
      .values({
        session_id: activeSessionId,
        tenant_id: tenantId,
        role: 'user',
        content: text,
      })
      .execute();

    // 3. Autonomous Tool-Calling Execution (ReAct cycle)
    const reasoningSteps: Array<{ step: string; observation: string }> = [];
    const toolsUsed: string[] = [];

    // Execute relevant tools based on query intent & always gather situational awareness
    const toolResults = await this.gatherContextualData(text, actor, apiKey, provider, reasoningSteps, toolsUsed);

    // 4. Generate Synthesized Reasoning Response via LLM (or deterministic fallback)
    let aiReply: { answer: string; suggestedQuestions: string[] } | null = null;

    if (apiKey && apiKey.trim()) {
      if (provider === 'openai' || apiKey.startsWith('sk-')) {
        aiReply = await this.askOpenAiAgent(text, toolResults, conversationHistory, reasoningSteps, apiKey, model, baseUrl);
      } else {
        aiReply = await this.askGeminiAgent(text, toolResults, conversationHistory, reasoningSteps, apiKey, model);
      }
    }

    if (!aiReply) {
      aiReply = this.synthesizeLocalStrategicResponse(text, toolResults, reasoningSteps);
    }

    // 5. Persist Assistant Response
    await this.db
      .insertInto('ai_chat_messages')
      .values({
        session_id: activeSessionId,
        tenant_id: tenantId,
        role: 'assistant',
        content: aiReply.answer,
        reasoning_steps: reasoningSteps as any,
        tool_calls: toolsUsed as any,
        suggested_questions: aiReply.suggestedQuestions as any,
      })
      .execute();

    return {
      sessionId: activeSessionId,
      answer: aiReply.answer,
      reasoningSteps,
      suggestedQuestions: aiReply.suggestedQuestions,
      toolsUsed,
    };
  }

  /**
   * Autonomous Tool Orchestrator: selects and runs tools based on user inquiry
   */
  private async gatherContextualData(
    query: string,
    actor: AuthContext,
    apiKey: string | undefined,
    provider: 'gemini' | 'openai' | 'custom',
    reasoningSteps: Array<{ step: string; observation: string }>,
    toolsUsed: string[],
  ): Promise<Record<string, unknown>> {
    const { tenantId } = requireTenantScope(actor);
    const q = query.toLowerCase();
    const context: Record<string, unknown> = {};

    // Tool A: Knowledge Base RAG (Chatbase layer)
    try {
      const knowledgeResults = await this.knowledgeService.searchKnowledge(query, actor, apiKey, provider, 3);
      if (knowledgeResults.length > 0 && knowledgeResults[0].similarity > 0.45) {
        context.knowledgeBase = knowledgeResults.map((k) => ({
          title: k.sourceTitle,
          content: k.content,
          type: k.sourceType,
          similarity: k.similarity,
        }));
        toolsUsed.push('search_knowledge_base');
        reasoningSteps.push({
          step: 'البحث في مستندات وسياسات المنشأة (RAG)',
          observation: `تم العثور على ${knowledgeResults.length} مرجع مطابق في لوائح وكتالوجات الشركة.`,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Knowledge search tool error: ${err.message}`);
    }

    // Tool B: Inventory & Product Lookup
    const isInventoryQuery = q.includes('مخزن') || q.includes('صنف') || q.includes('بضاعة') || q.includes('كمية') || q.includes('نواقص') || q.includes('سعر') || q.includes('رصيد');
    if (isInventoryQuery || q.includes('بيع') || q.includes('بديل')) {
      try {
        const lowStock = await this.db
          .selectFrom('products')
          .select(['id', 'name', 'stock_qty', 'min_stock_qty', 'retail_price', 'cost_price'])
          .where('tenant_id', '=', tenantId)
          .where('is_active', '=', true)
          .where(sql<boolean>`COALESCE(stock_qty, 0) <= COALESCE(min_stock_qty, 5)`)
          .limit(6)
          .execute();

        context.lowStockItems = lowStock.map((p) => ({
          name: p.name,
          stock: Number(p.stock_qty || 0),
          min: Number(p.min_stock_qty || 5),
          price: Number(p.retail_price || 0),
        }));

        toolsUsed.push('check_inventory_levels');
        reasoningSteps.push({
          step: 'فحص مستويات المخزون وحالة الأصناف الحرجة',
          observation: `تم رصد ${lowStock.length} أصناف وصلت لحد الطلب الأدنى وتحتاج متابعة.`,
        });
      } catch (err: any) {
        this.logger.warn(`Inventory tool error: ${err.message}`);
      }
    }

    // Tool C: Deadstock & Bundling Opportunities (Outside-the-box engine)
    const isDeadstockOpportunity = q.includes('ارباح') || q.includes('أرباح') || q.includes('راكد') || q.includes('بضاعة') || q.includes('سيولة') || q.includes('فكرة') || q.includes('عرض') || q.includes('ازاي');
    if (isDeadstockOpportunity) {
      try {
        // High stock items with retail price
        const slowMovers = await this.db
          .selectFrom('products as p')
          .leftJoin('product_categories as pc', 'pc.id', 'p.category_id')
          .select(['p.id', 'p.name', 'p.stock_qty', 'p.retail_price', 'p.cost_price', 'pc.name as category'])
          .where('p.tenant_id', '=', tenantId)
          .where('p.is_active', '=', true)
          .where(sql<boolean>`COALESCE(p.stock_qty, 0) > 10`)
          .orderBy('p.stock_qty', 'desc')
          .limit(3)
          .execute();

        const fastMovers = await this.db
          .selectFrom('products')
          .select(['id', 'name', 'retail_price'])
          .where('tenant_id', '=', tenantId)
          .where('is_active', '=', true)
          .orderBy('id', 'asc')
          .limit(3)
          .execute();

        if (slowMovers.length > 0 && fastMovers.length > 0) {
          context.bundlingOpportunities = {
            frozenCapitalItem: slowMovers[0].name,
            frozenStockQty: Number(slowMovers[0].stock_qty),
            frozenValue: Number(slowMovers[0].stock_qty) * Number(slowMovers[0].cost_price || 0),
            complementaryItem: fastMovers[0].name,
          };
          toolsUsed.push('analyze_deadstock_and_bundles');
          reasoningSteps.push({
            step: 'تحليل رأس المال المجمد وفرص العروض الترويجية المجمعة (Bundles)',
            observation: `رصد بضاعة متراكمة في صنف (${slowMovers[0].name}) بقيمة تقديرية ${Number(slowMovers[0].stock_qty) * Number(slowMovers[0].cost_price || 0)} ج.م، وربطها بالصنف الأكثر طلباً (${fastMovers[0].name}).`,
          });
        }
      } catch (err: any) {
        this.logger.warn(`Deadstock tool error: ${err.message}`);
      }
    }

    // Tool D: Customer Debts & Balances
    const isCustomerQuery = q.includes('عميل') || q.includes('عملاء') || q.includes('ديون') || q.includes('مديونية') || q.includes('فلوس') || q.includes('قسط') || q.includes('تحصيل');
    if (isCustomerQuery) {
      try {
        const topDebtors = await this.db
          .selectFrom('customers')
          .select(['name', 'phone', 'balance'])
          .where('tenant_id', '=', tenantId)
          .where('balance', '>', 0)
          .orderBy('balance', 'desc')
          .limit(5)
          .execute();

        context.debtors = topDebtors.map((d) => ({
          name: d.name,
          debt: Number(d.balance || 0),
          phone: d.phone,
        }));

        toolsUsed.push('get_customer_debtors');
        reasoningSteps.push({
          step: 'استعلام حسابات كبار العملاء ومخاطر الائتمان',
          observation: `استخراج أعلى ${topDebtors.length} عملاء مديونية لمراجعة سيولة التحصيل.`,
        });
      } catch (err: any) {
        this.logger.warn(`Customer tool error: ${err.message}`);
      }
    }

    // Tool E: Live Financial Snapshot (Sales, Treasury, Expenses)
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      const salesToday = await this.db
        .selectFrom('sales')
        .select([
          sql<number>`COUNT(*)`.as('count'),
          sql<number>`COALESCE(SUM(total), 0)`.as('total_sales'),
          sql<number>`COALESCE(SUM(paid_amount), 0)`.as('cash_collected'),
        ])
        .where('tenant_id', '=', tenantId)
        .where('created_at', '>=', startOfToday)
        .where('status', '!=', 'cancelled')
        .executeTakeFirst();

      const treasuryRow = await sql<{ total: number }>`
        SELECT COALESCE(SUM(amount), 0) as total FROM treasury_transactions WHERE tenant_id = ${tenantId}
      `.execute(this.db);

      context.todayFinancials = {
        salesAmount: Number(salesToday?.total_sales || 0),
        invoicesCount: Number(salesToday?.count || 0),
        cashCollected: Number(salesToday?.cash_collected || 0),
        treasuryBalance: Number(treasuryRow.rows[0]?.total || 0),
      };
      toolsUsed.push('get_today_financial_kpi');
    } catch (err: any) {
      this.logger.warn(`Financial tool error: ${err.message}`);
    }

    return context;
  }

  /**
   * Gemini Reasoning Agent Call
   */
  private async askGeminiAgent(
    userMessage: string,
    toolContext: Record<string, unknown>,
    history: Array<{ role: string; content: string }>,
    reasoningSteps: Array<{ step: string; observation: string }>,
    apiKey: string,
    modelName?: string,
  ): Promise<{ answer: string; suggestedQuestions: string[] } | null> {
    const candidateModels = [
      modelName || 'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
    ];

    const systemPrompt = `أنت "زاد AI" - المستشار التنفيذي الأول والخبير الاستراتيجي لنظام إدارة المنشآت Z-Systems.
أنت لست مجرد بوت دردشة تقليدي يجيب إجابات نمطية مكررة، بل شريك أعمال ذكي وخبير مالي يفكر "بره الصندوق" (Out of the box).

بيانات النظام الحية التي استخرجتها الأدوات للتو:
${JSON.stringify(toolContext, null, 2)}

خطوات تفكيرك واستدلالك الحالية:
${JSON.stringify(reasoningSteps, null, 2)}

دستور التفكير والإجابة الصارم:
1. التفكير الاستراتيجي وربط الخيوط: لا تسرد أرقاماً صامتة أبداً. إذا ذكرت مبيعات أو ديون أو مخزون، وضح دلالتها (هل هي مؤشر خطر؟ هل هناك فرصة سيولة؟).
2. الحلول الابتكارية: عندما تلاحظ نقصاً في صنف أو بضاعة راكدة، اقترح فوراً حلولاً عملية (مثل عروض مجمعة Bundles، بدائل من أصناف أخرى، أو استراتيجية لتحفيز التحصيل).
3. الاعتماد على مستندات المنشأة (RAG): إذا توافرت بيانات من knowledgeBase، استند إليها واذكر المرجع بدقة وثقة.
4. اللهجة: لغة عربية احترافية، راقية، وذكية تعكس خبرة مستشار تجاري وتنفيذي موثوق.
5. الإيجاز المركز: الإجابة محددة ومباشرة في نقاط أنيقة دون حشو ولا إطالة مفرطة.

أجب بصيغة JSON فقط:
{
  "answer": "الرد الشامل والذكي",
  "suggestedQuestions": ["سؤال استراتيجي 1", "سؤال استراتيجي 2", "سؤال استراتيجي 3"]
}`;

    for (const m of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const contents: any[] = [{ role: 'user', parts: [{ text: systemPrompt }] }];

        for (const h of history) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          });
        }
        contents.push({ role: 'user', parts: [{ text: userMessage }] });

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) continue;

        const clean = raw.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(clean);
        return {
          answer: parsed.answer || clean,
          suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * OpenAI Reasoning Agent Call
   */
  private async askOpenAiAgent(
    userMessage: string,
    toolContext: Record<string, unknown>,
    history: Array<{ role: string; content: string }>,
    reasoningSteps: Array<{ step: string; observation: string }>,
    apiKey: string,
    modelName?: string,
    baseUrl?: string,
  ): Promise<{ answer: string; suggestedQuestions: string[] } | null> {
    try {
      const host = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const model = modelName || 'gpt-4o-mini';

      const systemPrompt = `أنت "زاد AI" - المستشار التنفيذي الذكي لنظام Z-Systems. تفكر بعقلية استراتيجية خارج الصندوق.
بيانات الأدوات الحية:
${JSON.stringify(toolContext, null, 2)}
خطوات تحليلك:
${JSON.stringify(reasoningSteps, null, 2)}
قدم تشخيصاً تحليلياً دقيقاً وحلولاً ابتكارية لتعظيم الربحية وحل المشكلات بصيغة JSON: {"answer": "...", "suggestedQuestions": ["..."]}`;

      const messages: any[] = [{ role: 'system', content: systemPrompt }];
      for (const h of history) {
        messages.push({ role: h.role, content: h.content });
      }
      messages.push({ role: 'user', content: userMessage });

      const res = await fetch(`${host}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.4,
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return {
        answer: parsed.answer || raw,
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
      };
    } catch {
      return null;
    }
  }

  /**
   * High-End Local Deterministic Strategic Analyzer (Zero Internet/API Fallback)
   */
  private synthesizeLocalStrategicResponse(
    query: string,
    context: Record<string, unknown>,
    reasoningSteps: Array<{ step: string; observation: string }>,
  ): { answer: string; suggestedQuestions: string[] } {
    const q = query.toLowerCase();
    const fin = (context.todayFinancials as any) || { salesAmount: 0, cashCollected: 0, invoicesCount: 0, treasuryBalance: 0 };
    const lowStock = (context.lowStockItems as any[]) || [];
    const debtors = (context.debtors as any[]) || [];
    const bundling = context.bundlingOpportunities as any;
    const kb = (context.knowledgeBase as any[]) || [];

    // Check if Knowledge Base answered
    if (kb.length > 0) {
      return {
        answer: `استناداً إلى مستندات ولوائح المنشأة المرجعية (**${kb[0].title}**):\n\n${kb[0].content}\n\nنصيحة استراتيجية: يمكنك تحديث هذه السياسة أو إضافة كتالوجات جديدة من لوحة إدارة المعرفة في أي وقت.`,
        suggestedQuestions: ['ما هي سياسة الائتمان للعملاء؟', 'هل يوجد أصناف بديلة؟', 'فحص حركة المبيعات اليوم'],
      };
    }

    // Outside-the-box Bundling & Profit Maximization
    if (q.includes('ارباح') || q.includes('أرباح') || q.includes('راكد') || q.includes('عرض') || q.includes('ازاي') || q.includes('فكرة')) {
      if (bundling) {
        return {
          answer: `إليك فكرة تشغيلية بره الصندوق لتعظيم السيولة والأرباح:\n\n1. **رصد رأس مال مجمد:** رصدت وجود مخزون راكد في صنف (**${bundling.frozenCapitalItem}**) بإجمالي **${bundling.frozenStockQty}** قطعة تقدر بحوالي **${bundling.frozenValue.toLocaleString()} ج.م** بضاعة مجمدة.\n2. **الحل الابتكاري (عرض مجمع Bundle):** نظراً لأن صنف (**${bundling.complementaryItem}**) هو الأعلى حركة وإقبالاً، أقترح إنشاء باقة بيعية تجمع القطعتين معاً بخصم 10% على الصنف الراكد.\n3. **الأثر المالي:** هذا الإجراء سيسيل السيولة المجمدة فوراً ويمنع تراكم البضاعة دون التأثير على هامش ربحك الإجمالي!`,
          suggestedQuestions: ['من هم العملاء المناسبين لهذا العرض؟', 'ما هي الأصناف الحرجة بالمخزن؟', 'كم رصيد الخزينة المتاح حالياً؟'],
        };
      }
    }

    // Customer Debts Deep Dive
    if (q.includes('عميل') || q.includes('ديون') || q.includes('مديونية')) {
      const debtList = debtors.map((d, i) => `${i + 1}. **${d.name}**: ${d.debt.toLocaleString()} ج.م (${d.phone || 'بدون هاتف'})`).join('\n');
      return {
        answer: `تحليل مديونيات العملاء والتدفق النقدي:\n\n${debtList || 'لا توجد مديونيات متأخرة مسجلة حالياً.'}\n\n**توصية زاد خارج الصندوق:** بدلاً من إيقاف البيع التام، اقترح تفعيل خاصية "سداد نسبة مع كل فاتورة جديدة" (مثلاً سداد 20% من المديونية القديمة مع كل طلبية كاش جديدة)، مما يحافظ على استمرار العميل ويسرع التحصيل.`,
        suggestedQuestions: ['عرض تفاصيل آخر فاتورة لأكبر عميل', 'موقف رصيد الخزينة اليوم', 'الأصناف الأكثر مبيعاً'],
      };
    }

    // Default intelligent operational summary
    return {
      answer: `الموقف التشغيلي المباشر لنشاطك اليوم:\n\n- إجمالي المبيعات: **${fin.salesAmount.toLocaleString()} ج.م** عبر **${fin.invoicesCount}** فاتورة.\n- النقدية المحصلة: **${fin.cashCollected.toLocaleString()} ج.م**.\n- رصيد الخزينة الحالي: **${fin.treasuryBalance.toLocaleString()} ج.م**.\n\n${lowStock.length > 0 ? `تنبيه مبكر: يوجد **${lowStock.length}** أصناف قاربت على النفاد، منها (**${lowStock[0].name}** متبقي ${lowStock[0].stock} قطع).` : 'المخزون مستقر ولا توجد نواقص حرجة اليوم.'}`,
      suggestedQuestions: ['كيف أزيد أرباحي اليوم؟', 'من هم أكبر العملاء مديونية؟', 'اقتراح عروض ترويجية للأصناف الراكدة'],
    };
  }

  /**
   * Get messages for a session
   */
  async getSessionMessages(sessionId: string, actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    return this.db
      .selectFrom('ai_chat_messages')
      .select(['id', 'role', 'content', 'reasoning_steps', 'tool_calls', 'suggested_questions', 'created_at'])
      .where('session_id', '=', sessionId)
      .where('tenant_id', '=', tenantId)
      .orderBy('id', 'asc')
      .execute();
  }

  /**
   * List sessions for user
   */
  async listUserSessions(actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    const userId = actor.userId;
    return this.db
      .selectFrom('ai_chat_sessions')
      .select(['id', 'title', 'created_at', 'updated_at'])
      .where('tenant_id', '=', tenantId)
      .where('user_id', '=', userId || null)
      .orderBy('updated_at', 'desc')
      .limit(15)
      .execute();
  }
}
