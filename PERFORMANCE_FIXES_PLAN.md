# خطة التنفيذ الهندسية — إصلاح أداء النظام
# Performance Fix Execution Plan — Audited by Claude Opus

> **تاريخ:** 2026-09-30
> **المُعِدّ:** Claude Opus (مراجع ومدقق)
> **المُنفِّذ:** Antigravity (Gemini Flash)
> **التقييم النهائي:** Claude Opus بعد الانتهاء

---

## القواعد الحاكمة للتنفيذ

1. **لا تعدّل `buildManagerActionInsights()` helper** — المنطق فيه صحيح، المشكلة في الـ queries اللي بتغذيه.
2. **لا تلمس `reportSummary()`** في هذه المرحلة — حساس مالياً ويحتاج اختبارات.
3. **كل query تُعدَّل يجب أن تُختبر يدوياً** بفتح الشاشة المتأثرة.
4. **لا تستخدم `LIMIT` أعمى بدون `WHERE` ذكي أو `ORDER BY` على عمود حقيقي موجود في الـ DB.**
5. **لا تشغّل `npm run build` أو `git push`** — المستخدم سيطلبهم صراحة.

---

## المرحلة 1 — Manager Actions Service (الأعلى تأثيراً)

### ملف: `backend/src/modules/manager-actions/manager-actions.service.ts`

---

### إصلاح 1-A: `loadProductLastSales()` (السطر 101-114)

**المشكلة:** يعمل `JOIN` على **كامل تاريخ** `sale_items × sales` للحصول على `MAX(created_at)` لكل صنف.
مستأجر نشط لسنتين = ملايين السطور في الـ JOIN.

**الحل:** أضف date lower bound. أي صنف لم يُبَع خلال سنة كاملة هو بالتأكيد راكد — لا نحتاج سكان أبعد من ذلك.

**الكود الحالي (سطر 101-114):**
```typescript
private loadProductLastSales(tenantId: string): Promise<ManagerActionLastSaleRow[]> {
  return this.db
    .selectFrom('sale_items as si')
    .innerJoin('sales as s', 's.id', 'si.sale_id')
    .select([
      'si.product_id',
      sql<Date>`max(s.created_at)`.as('last_sold_at'),
    ])
    .where('s.status', '=', 'posted')
    .where('si.product_id', 'is not', null)
    .where(sql<boolean>`s.tenant_id = ${tenantId}`)
    .where(sql<boolean>`si.tenant_id = ${tenantId}`)
    .groupBy('si.product_id')
    .execute();
}
```

**الكود المطلوب:**
```typescript
private loadProductLastSales(tenantId: string): Promise<ManagerActionLastSaleRow[]> {
  // PERF: limit scan to last 12 months — any product unsold for 12+ months
  // is definitely stagnant and will be caught by the stagnant threshold check.
  const oneYearAgo = new Date();
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  return this.db
    .selectFrom('sale_items as si')
    .innerJoin('sales as s', 's.id', 'si.sale_id')
    .select([
      'si.product_id',
      sql<Date>`max(s.created_at)`.as('last_sold_at'),
    ])
    .where('s.status', '=', 'posted')
    .where('s.created_at', '>=', oneYearAgo)
    .where('si.product_id', 'is not', null)
    .where(sql<boolean>`s.tenant_id = ${tenantId}`)
    .where(sql<boolean>`si.tenant_id = ${tenantId}`)
    .groupBy('si.product_id')
    .execute();
}
```

**لماذا هذا آمن:**
- الـ helper يستخدم `lastSaleByProduct` Map لتحديد الأصناف الراكدة.
- إذا لم يظهر صنف في النتيجة (لأنه لم يُبَع خلال سنة) → `lastSaleByProduct.get(id)` = `undefined` → `toDate(undefined)` = `null`.
- في الـ helper سطر 262-280 (تقريباً)، الأصناف بدون `lastSale` أو بـ `lastSale = null` تُعامَل كراكدة. **فلن يُفقَد أي صنف راكد.**

---

### إصلاح 1-B: `loadCustomers()` (السطر 148-154)

**المشكلة:** يجلب **كل** العملاء النشطين. الـ helper يستخدمهم فقط لفحص:
- من لديه رصيد مدين (`balance > 0`)
- من تجاوز حد الائتمان (`balance > credit_limit`)

**الحل:** أضف `WHERE balance > 0` — العملاء بدون رصيد لن يولّدوا أي insight.

**الكود الحالي (سطر 148-154):**
```typescript
private loadCustomers(tenantId: string): Promise<ManagerActionCustomerRow[]> {
  return this.db
    .selectFrom('customers')
    .select(['id', 'name', 'balance', 'credit_limit'])
    .where('is_active', '=', true)
    .where(sql<boolean>`tenant_id = ${tenantId}`)
    .execute();
}
```

**الكود المطلوب:**
```typescript
private loadCustomers(tenantId: string): Promise<ManagerActionCustomerRow[]> {
  // PERF: only fetch customers with positive balance — zero-balance customers
  // never trigger credit-limit or debt-collection insights.
  return this.db
    .selectFrom('customers')
    .select(['id', 'name', 'balance', 'credit_limit'])
    .where('is_active', '=', true)
    .where('balance', '>', 0)
    .where(sql<boolean>`tenant_id = ${tenantId}`)
    .execute();
}
```

**لماذا هذا آمن:**
- افتح `manager-actions.helper.ts` وابحث عن كيف يُستخدم `customers`:
  - فحص تجاوز حد الائتمان → يشترط `balance > credit_limit` — إذاً `balance > 0` ضمنياً.
  - فحص أكبر المديونيات → يرتب حسب `balance` تنازلياً — العملاء بصفر رصيد لا يظهرون.
- **لن يُفقَد أي عميل مهم.**

---

## المرحلة 2 — Manager Dashboard Service

### ملف: `backend/src/modules/manager-actions/manager-dashboard.service.ts`

---

### إصلاح 2-A: `productStockRows()` (السطر 80)

**المشكلة:** الـ LEFT JOIN subquery يسكان **كامل تاريخ** `sale_items × sales` للحصول على `MAX(created_at)` و `sold_qty_30`.

**الحل:** أضف date lower bound على الـ subquery — نفس منطق إصلاح 1-A.

**التعديل المطلوب داخل الـ subquery في السطر 80:**
أضف شرط `WHERE s.created_at >= oneYearAgo` داخل الـ subquery.
يجب حساب `oneYearAgo` في بداية الـ `overview()` method (مثلاً سطر 34-35).

**الكود المطلوب:** في بداية `overview()` بعد سطر 36:
```typescript
const oneYearAgo = new Date(now);
oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
```

ثم في `productStockRows()` أضف parameter `oneYearAgo: Date` وأضف:
```typescript
.where('s.created_at', '>=', oneYearAgo)
```
داخل الـ subquery **قبل** `.groupBy('si.product_id')`.

**تمرير الـ parameter:**
غيّر استدعاء `productStockRows` في سطر 43:
```typescript
// من:
this.safeRows(() => this.productStockRows(last30Start, tenantId)),
// إلى:
this.safeRows(() => this.productStockRows(last30Start, oneYearAgo, tenantId)),
```

وعدّل signature الميثود لتستقبل `oneYearAgo`:
```typescript
private productStockRows(last30Start: Date, oneYearAgo: Date, tenantId: string)
```

---

### إصلاح 2-B: `customerDebtRows()` (السطر 81)

**المشكلة:** يجلب **كل** العملاء النشطين — نفس مشكلة 1-B.

**الحل:** نفس إصلاح 1-B — `WHERE balance > 0`.

**الكود الحالي (سطر 81):**
```typescript
private customerDebtRows(tenantId: string): Promise<Row[]> {
  return this.db.selectFrom('customers')
    .select(['id', 'name', 'balance', 'credit_limit'])
    .where('is_active', '=', true)
    .where(this.tenantClause(tenantId))
    .execute();
}
```

**أضف:**
```typescript
.where('balance', '>', 0)
```

---

### إصلاح 2-C: `returnRows()` (السطر 77)

**المشكلة:** يجلب **كل** `return_documents` في 30 يوم كـ raw rows ثم يعمل `.filter()` و `.reduce()` في JS.

**الحل:** استبدل بـ SQL aggregate:

**الكود الحالي (سطر 77):**
```typescript
private returnRows(from: Date, to: Date, tenantId: string): Promise<Row[]> {
  return this.db.selectFrom('return_documents')
    .select(['return_type', 'total'])
    .where('created_at', '>=', from).where('created_at', '<', to)
    .where(this.tenantClause(tenantId)).execute();
}
```

**الكود المطلوب:**
```typescript
private returnTotals(from: Date, to: Date, tenantId: string): Promise<Row[]> {
  return this.db.selectFrom('return_documents')
    .select([
      'return_type',
      sql<number>`coalesce(sum(total), 0)`.as('total'),
    ])
    .where('created_at', '>=', from).where('created_at', '<', to)
    .where(this.tenantClause(tenantId))
    .groupBy('return_type')
    .execute();
}
```

**ثم عدّل الاستخدام في `overview()` سطر 55:**
```typescript
// الكود الحالي:
const salesReturnsTotal = m(returnsLast30.filter((r) => r.return_type === 'sale').reduce((s, r) => s + n(r.total), 0));

// يصبح (نفس المنطق لكن الجمع تم في SQL):
const salesReturnsTotal = m(n(returnsLast30.find((r) => r.return_type === 'sale')?.total));
```

**ملاحظة:** غيّر اسم الميثود في الاستدعاء سطر 40 من `returnRows` إلى `returnTotals`.

---

## المرحلة 3 — Purchases Query Service

### ملف: `backend/src/modules/purchases/services/purchases-query.service.ts`

---

### إصلاح 3-A: `listSupplierPayments()` (السطر 219-236)

**المشكلة:** يرجع **كل** مدفوعات الموردين بدون pagination.

**الحل:** أضف LIMIT/OFFSET + total count بنفس نمط `listPurchases()` الموجود في نفس الملف.

**خطوات التنفيذ:**
1. افتح `listPurchases()` (سطر 58+) وانسخ نمط الـ pagination (page, pageSize, offset, COUNT(*) OVER()).
2. عدّل `listSupplierPayments()` لتقبل `query: Record<string, unknown>` مع `page` و `pageSize`.
3. أضف `COUNT(*) OVER()` كـ window function و `.limit(pageSize).offset(offset)`.
4. ارجع `{ items, total, page, pageSize }` بدل array مباشر.
5. **عدّل الـ controller** المستدعي ليمرر الـ query params.
6. **عدّل الـ frontend** ليتعامل مع الـ paginated response — ابحث عن مكان استدعاء هذا الـ endpoint.

---

### إصلاح 3-B: `fetchMappedPurchases()` (السطر 21-56)

**المشكلة:** يجلب **كل** فواتير الشراء + كل بنودها + كل المرفقات بدون أي حد.

**خطوات التنفيذ:**
1. **أولاً:** ابحث عن كل الأماكن اللي بتستدعي `fetchMappedPurchases()` في الكود:
   ```
   Select-String -Path "d:/zn/backend/src/**/*.ts" -Pattern "fetchMappedPurchases" -Recurse
   ```
2. **إذا كانت مستخدمة للتصدير (export):** أضف date range إلزامي كـ parameter.
3. **إذا كانت مستخدمة للعرض:** استبدل الاستدعاء بـ `listPurchases()` المحدود أصلاً.
4. **في كل الحالات:** أضف `LIMIT 500` كشبكة أمان (safety net) حتى لو كان الاستخدام مؤقت.

> ⚠️ **تحذير:** لا تحذف الميثود أو تعدّل الـ return type بدون فحص كل المستدعين أولاً.

---

## المرحلة 4 — Aged Debts (تقارير أعمار الديون)

### ملف: `backend/src/modules/accounting/services/aged-debts.service.ts`

---

### إصلاح 4-A: `getAgedReceivables()`

**المشكلة:**
1. `.selectAll()` على كل العملاء (يجلب كل الأعمدة + كل الصفوف)
2. يجلب **كل** الفواتير الآجلة تاريخياً بدون date lower bound
3. JS loop لتوزيع الرصيد على الفواتير

**الحل (تدريجي وآمن):**
1. **استبدل `.selectAll()`** بـ `.select(['id', 'name', 'balance', 'credit_limit'])` — فقط الأعمدة المطلوبة.
2. **أضف `WHERE balance > 0`** — عملاء بدون رصيد لا يظهرون في تقرير الأعمار.
3. **أضف date lower bound** على الفواتير: `WHERE created_at >= NOW() - INTERVAL '3 years'` — فواتير أقدم من 3 سنوات تقع كلها في bucket الـ `+90 يوم` على أي حال.

> ⚠️ **لا تحاول نقل منطق الـ FIFO aging إلى SQL** — هذا معقد ويتطلب window functions مع running sum. الـ JS loop مقبول إذا قللنا عدد الصفوف المدخلة.

### إصلاح 4-B: `getAgedPayables()`
**نفس الإصلاحات بالضبط** — suppliers بدل customers، purchases بدل sales.

---

## المرحلة 5 — Customer RFM Report

### ملف: `backend/src/modules/reports/reports.service.ts` — `customerRfmReport()`

---

**المشكلة:** يجلب **كل** المبيعات من الأزل بدون date filter.

**الحل:**
1. أضف `WHERE s.created_at >= NOW() - INTERVAL '24 months'` — الـ RFM لا يحتاج أكثر من سنتين.
2. أضف pagination على النتيجة النهائية (الكود الحالي يرجع كل العملاء في response واحد).

**خطوات التنفيذ:**
1. ابحث عن الـ query داخل `customerRfmReport()` وأضف `.where('s.created_at', '>=', twoYearsAgo)`.
2. أضف `.limit(500)` على النتيجة أو pagination parameters.

---

## ❌ ما لا يُنفَّذ في هذه الخطة

| الملف | الميثود | السبب |
|-------|---------|-------|
| `reports.service.ts` | `reportSummary()` | حساس مالياً — يحتاج unit tests قبل أي تعديل |
| `reports-dashboard.helper.ts` | `buildSevenDayTrends()` | تم إصلاحه بالفعل (PERF-FIX-00) |
| `balance-sheet.service.ts` | `getBalanceSheet()` | جدول الحسابات صغير (مئات) — أولوية منخفضة |

---

## ترتيب التنفيذ

```
1-A → 1-B → 2-A → 2-B → 2-C → اختبار يدوي للداشبورد
3-A → 3-B → اختبار يدوي لشاشة المشتريات
4-A → 4-B → اختبار يدوي لتقرير أعمار الديون
5 → اختبار يدوي لتقرير RFM
```

---

## معايير التقييم النهائي (Claude Opus)

سأراجع كل إصلاح بناءً على:

1. **هل الـ WHERE conditions آمنة؟** — لم تُفقَد بيانات مهمة؟
2. **هل الـ return type لم يتغير؟** — الـ helper و الـ frontend يتوقعان نفس الشكل؟
3. **هل كل المستدعين (callers) تم تحديثهم؟** — لا يوجد compile error أو runtime crash؟
4. **هل الـ GROUP BY expressions صحيحة؟** — لا يوجد خطأ `must appear in GROUP BY` (مثل ما حصل في الداشبورد)?
5. **هل الأداء تحسن فعلاً؟** — الحل لم يُضِف queries إضافية تبطئ أكثر؟
