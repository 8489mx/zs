# توثيق المشكلة وخطة تحسين تابع `reportSummary` الشامل
# Report Summary Engineering Optimization Plan — For Claude Opus Audit

> **تاريخ التوثيق:** 2026-09-30  
> **الهدف:** توثيق سبب البطء المتبقي في أول فتحة للداشبورد، ووضع خطة هندسية دقيقة لتحويل `reportSummary` من مسح السجلات الخام في الذاكرة (In-Memory Processing) إلى استعلامات SQL تجميعية فائقة السرعة، لعرضها على Claude Opus للتدقيق والمصادقة.

---

## 1. تشخيص المشكلة الحالية (Root Cause Analysis)

### لماذا ما زالت أول فتحة للداشبورد تستغرق بضع ثوانٍ؟
عند فتح الداشبورد بعد تسجيل الدخول أو بعد انتهاء صلاحية الكاش، يستدعي ملف `reports.service.ts` في السطر 204 التابع:
```typescript
this.reportSummary(query, auth)
```
كأحد الاستعلامات المتوازية لتغذية بطاقات الإحصائيات (الإيرادات، تكلفة البضاعة المباعة COGS، مجمل الربح، المصروفات، المشتريات، الخزينة، والتوصيل).

### ما الذي يفعله `reportSummary` حالياً في السطور 68–158؟
يقوم بتشغيل **8 استعلامات متوازية** تجلب آلاف السجلات الخام (`raw rows`) بدون أي تجميع في قاعدة البيانات:

| # | الاستعلام في الكود | ما يجلبه حالياً من قاعدة البيانات | ما يُحسب منه فعلياً في JavaScript | حجم الهدر |
|---|-------------------|-----------------------------------|-----------------------------------|-----------|
| 1 | `saleItemsQuery` | **كل بند مبيعات** في كل فاتورة خلال الشهر (`si.qty`, `si.line_total`, `si.cost_price`, `si.product_name`...) | 1. تكلفة البضاعة المباعة `rawCogs = sum(qty * cost)`<br>2. أعلى 10 منتجات مبيعاً `buildTopProducts` | **هو الكارثة الأكبر:** متجر بـ 500 طلب يومياً × 4 أصناف = **60,000 سجل** يتم تحميلها في ذاكرة Node.js! |
| 2 | `returnedSaleItemsQuery` | كل بند مرتجع مع `leftJoin` على المبيعات والأصناف | `returnedCogs = sum(qty * cost)` فقط | مئات السطور لحساب رقم واحد |
| 3 | `salesQuery` | كل فواتير المبيعات خلال الشهر بالكامل | `count`, `sum(total)`, وتصنيف رسوم التوصيل | آلاف الفواتير لحساب 4 أرقام |
| 4 | `purchasesQuery` | كل فواتير الشراء خلال الشهر | `count`, `sum(total)` | مئات الفواتير لحساب رقمين |
| 5 | `expensesQuery` | كل المصروفات في نطاق التاريخ | `count`, `sum(amount)` | مئات المصروفات لحساب رقمين |
| 6 | `returnsQuery` | كل مستندات المرتجعات | فرز مرتجع مبيعات vs مشتريات وحساب `count` و `sum(total)` | مئات المستندات |
| 7 | `treasuryQuery` | كل حركات الخزينة في الشهر | `cashIn = sum(where amount > 0)`<br>`cashOut = sum(where amount < 0)` | مئات الحركات لحساب رقمين |
| 8 | `servicesQuery` | كل حركات الخدمات | `count`, `sum(amount)` | مئات السطور لحساب رقمين |

ثم يُمرر هذه المصفوفات الضخمة إلى الدالة المساعدة `buildReportSummaryPayload` في `reports-summary.helper.ts` لتقوم بعمل `.reduce()` و `.filter()` و `.sort()` في الذاكرة.

---

## 2. الاكتشاف المعماري المهم (The Golden Find)

عند فحص الدالة المساعدة `buildReportSummaryPayload` في `reports-summary.helper.ts` (السطور 170-172)، وجدنا أن مطور النظام الأصلي **قد جهّز مسبقاً معاملات بديلة (Overrides)** لاستقبال الحسابات التجميعية الجاهزة:
```typescript
export function buildReportSummaryPayload(args: {
  salesRows: SummaryMoneyRow[];
  servicesRows?: SummaryMoneyRow[];
  purchasesRows: SummaryMoneyRow[];
  expensesRows: SummaryExpenseRow[];
  returnsRows: SummaryReturnRow[];
  treasuryRows: SummaryTreasuryRow[];
  saleItemsRows?: SummarySaleItemRow[];
  returnedSaleItemsRows?: SummarySaleItemRow[];
  cogsOverride?: number; // <-- مدعوم بالفعل!
  topProductsOverride?: Array<{ name: string; qty: number; revenue: number; total: number }>; // <-- مدعوم بالفعل!
  topProductsLimit?: number;
  deliveryFeeMode?: string;
  storeFleetCommissionRate?: number;
})
```
وفي السطر 202 والسطر 254:
```typescript
const cogs = cogsOverride != null ? toMoney(cogsOverride) : toMoney(rawCogs - returnedCogs);
// ...
topProducts: topProductsOverride != null ? topProductsOverride : buildTopProducts(saleItemsRows, topProductsLimit),
```
**هذا يعني أن المعمارية الحالية تدعم تمرير الـ COGS المحسوبة والـ Top Products المحسوبة دون كسر أي واجهة أو استدعاء!**

---

## 3. خطة الحل المقترحة (Detailed Execution Plan)

### المرحلة 1: القضاء على حِمل الـ 60,000 سطر في `saleItemsQuery` (الأعلى تأثيراً - 85% من البطء)

بدلاً من جلب مصفوفة `saleItemsRows` كاملة:
1. **استعلام تكلفة البضاعة المباعة (SQL COGS Aggregation):**
   استعلام خفيف يرجع سطراً واحداً فيه رقم التكلفة الإجمالي:
   ```sql
   SELECT COALESCE(SUM(si.qty * si.cost_price), 0) AS raw_cogs
   FROM sale_items si
   INNER JOIN sales s ON s.id = si.sale_id
   WHERE s.status = 'posted'
     AND s.created_at >= :fromDate AND s.created_at <= :toDate
     AND s.tenant_id = :tenantId AND si.tenant_id = :tenantId
   ```
2. **استعلام مرتجعات التكلفة (SQL Returned COGS):**
   ```sql
   SELECT COALESCE(SUM(ri.qty * COALESCE(si.cost_price, p.cost_price)), 0) AS returned_cogs
   FROM return_items ri
   INNER JOIN return_documents rd ON rd.id = ri.return_document_id
   LEFT JOIN sale_items si ON si.sale_id = rd.invoice_id AND si.product_id = ri.product_id
   LEFT JOIN products p ON p.id = ri.product_id
   WHERE rd.return_type = 'sale'
     AND rd.created_at >= :fromDate AND rd.created_at <= :toDate
     AND rd.tenant_id = :tenantId AND ri.tenant_id = :tenantId
   ```
   وحساب `cogsOverride = raw_cogs - returned_cogs`.

3. **استعلام أكثر 10 أصناف مبيعاً (SQL Top Products):**
   بدلاً من جلب كل بنود الشهر وترتيبها في Node.js، ننفذ استعلام تجميعي محدد بـ `LIMIT 10`:
   ```sql
   SELECT 
     COALESCE(si.product_name, p.name, 'صنف غير محدد') AS name,
     COALESCE(SUM(si.qty), 0) AS qty,
     COALESCE(SUM(si.line_total), 0) AS revenue,
     COALESCE(SUM(si.line_total), 0) AS total
   FROM sale_items si
   INNER JOIN sales s ON s.id = si.sale_id
   LEFT JOIN products p ON p.id = si.product_id
   WHERE s.status = 'posted'
     AND s.created_at >= :fromDate AND s.created_at <= :toDate
     AND s.tenant_id = :tenantId AND si.tenant_id = :tenantId
   GROUP BY 1
   ORDER BY revenue DESC
   LIMIT 10
   ```
   وتمرير النتيجة مباشرة إلى `topProductsOverride`.

**الأثر الفوري:** استبعاد نقل ومعالجة 60,000 إلى 100,000 كائن في ذاكرة السيرفر، وتوفير أكثر من 70% من وقت الاستجابة!

---

### المرحلة 2: تحويل حركات الخزينة والمرتجعات إلى SQL Aggregates

1. **الخزينة (`treasuryQuery`):**
   بدلاً من جلب كل صفقة خزينة لمعرفة الداخل والخارج:
   ```sql
   SELECT
     COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS cash_in,
     COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) AS cash_out
   FROM treasury_transactions
   WHERE created_at >= :fromDate AND created_at <= :toDate
     AND tenant_id = :tenantId
   ```
2. **المرتجعات (`returnsQuery`):**
   تجميع حسب نوع المرتجع (`sale` مقابل `purchase`):
   ```sql
   SELECT
     return_type,
     COUNT(*) AS count,
     COALESCE(SUM(total), 0) AS total
   FROM return_documents
   WHERE created_at >= :fromDate AND created_at <= :toDate
     AND tenant_id = :tenantId
   GROUP BY return_type
   ```

---

### المرحلة 3: تحويل المشتريات والمصروفات والخدمات إلى SQL Aggregates

1. **المشتريات (`purchasesQuery`):**
   `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total FROM purchases ...`
2. **المصروفات (`expensesQuery`):**
   `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM expenses ...`
3. **الخدمات (`servicesQuery`):**
   `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM services ...`

---

### المرحلة 4: فواتير المبيعات ورسوم التوصيل (`salesQuery`)

فواتير المبيعات تُستخدم لـ:
- إجمالي المبيعات وعدد الفواتير (`total`, `count`)
- إحصائيات التوصيل (`freelance` vs `store_fleet`)

يمكن تجميعها بسطر SQL واحد شامل بدلاً من سحب كل فواتير الشهر:
```sql
SELECT
  COUNT(*) AS sales_count,
  COALESCE(SUM(total), 0) AS sales_total,
  -- Freelance Courier Delivery
  COUNT(*) FILTER (WHERE delivery_fee > 0 AND (delivery_fee_mode = 'freelance_courier' OR delivery_fee_mode IS NULL)) AS freelance_count,
  COALESCE(SUM(delivery_fee) FILTER (WHERE delivery_fee > 0 AND (delivery_fee_mode = 'freelance_courier' OR delivery_fee_mode IS NULL)), 0) AS freelance_total,
  -- Store Fleet Delivery
  COUNT(*) FILTER (WHERE delivery_fee > 0 AND delivery_fee_mode = 'store_fleet') AS store_fleet_count,
  COALESCE(SUM(delivery_fee) FILTER (WHERE delivery_fee > 0 AND delivery_fee_mode = 'store_fleet'), 0) AS store_fleet_total
FROM sales
WHERE status = 'posted'
  AND created_at >= :fromDate AND created_at <= :toDate
  AND tenant_id = :tenantId
```

---

## 4. ضمانات السلامة الحسابية ومنع الانحراف المالي (Zero Discrepancy Invariants)

1. **تطابق النتائج الحسابية بنسبة 100%:**
   المعادلات الرياضية في SQL هي ترجمة حرفية ومطابقة لما كان يفعله كود الـ JavaScript:
   - `sum(qty * cost_price)` في SQL هي بالمليم `reduce((sum, r) => sum + qty * cost, 0)` في JS.
   - `COUNT(*) FILTER` يطابق تماماً `rows.filter(...).length`.
2. **عزل المستأجرين والفروع (`Tenant & Branch Scope`):**
   كافة استعلامات SQL ستستخدم نفس الدالة الموحدة `applyReportScopeFilter(query, queryDto)` لضمان تطبيق فلاتر الفرع والموقع وعزل الـ `tenant_id` بدقة تامة.
3. **ثبات عقد الواجهة (API Contract Invariant):**
   الدالة ستعيد نفس الـ JSON Payload بالضبط الذي تتوقعه الداشبورد وشاشات التقارير المالية دون أي تغيير في أسماء الحقول أو أنواعها.

---

## 5. محاور المراجعة والأسئلة لـ Claude Opus

نطرح هذه الخطة على Claude Opus لمراجعتها والإجابة على الآتي:
1. هل نقل حساب الـ COGS والـ Top 10 إلى SQL باستخدام `cogsOverride` و `topProductsOverride` آمن تماماً ولا يغير أي نواتج؟
2. هل استعلام تجميع رسوم التوصيل بـ `FILTER (WHERE ...)` في PostgreSQL دقيق ومطابق لمنطق الجافاسكريبت الحالي؟
3. هل هناك أي حالة خاصة (Edge Case) مثل الفواتير بدون أصناف أو فئات المرتجعات يجب الانتباه لها؟
4. هل يوافق على ترتيب التنفيذ المقترح للبدء فوراً؟
