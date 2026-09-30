# خطة إصلاح أداء النظام — Z-Systems Performance Fix Plan

> **تاريخ الإنشاء:** 2026-09-30
> **المصدر:** فحص شامل للـ backend بعد إصلاح بطء الداشبورد
> **الأداة:** فحص تلقائي لكل ملفات الـ service في `backend/src/modules/`

---

## ✅ منجز (تم الإصلاح)

### PERF-FIX-00 — Dashboard Trend Queries (2026-09-30)
- **الملف:** `backend/src/modules/reports/reports.service.ts` — `dashboardOverview()`
- **المشكلة:** بيجيب كل فواتير المبيعات والمشتريات (30 يوم) كـ raw rows في Node.js ويعمل grouping في JS
- **الحل:** استبدل بـ SQL `GROUP BY` يوم → 30 row بدل N row
- **الأثر:** تسريع ملحوظ في فتح الداشبورد

---

## 🔴 أولوية عالية — HIGH PRIORITY

### PERF-FIX-01 — Manager Actions: Full Product Scan + Full Sale Items History
- **الملفات:**
  - `backend/src/modules/manager-actions/manager-actions.service.ts`
    - `loadProducts()` — بيجيب كل المنتجات بدون LIMIT
    - `loadProductLastSales()` — JOIN على كل تاريخ sale_items بلا حد زمني
  - `backend/src/modules/manager-actions/manager-dashboard.service.ts`
    - `productStockRows()` — نفس المشكلة مع subquery على كل المبيعات
    - `customerDebtRows()` — كل العملاء بدون LIMIT
- **التأثير:** الـ UI بيعرض 6-8 بنود بس — بيجيب آلاف المنتجات عشان يعرض 8
- **الحل:**
  - استبدل `loadProducts()` بـ SQL مباشر يرجع top-N حسب الأولوية (stock alert, stagnant) مع `ORDER BY ... LIMIT 50`
  - `loadProductLastSales()` → استبدل بـ `MAX(s.created_at)` مع date lower bound (آخر سنة فقط)
  - `customerDebtRows()` → أضف `WHERE balance > 0 LIMIT 100` بدل كل العملاء
- **الخطوات:**
  - [ ] عدّل `loadProducts()` — SQL aggregate with LIMIT
  - [ ] عدّل `loadProductLastSales()` — date lower bound + aggregate
  - [ ] عدّل `productStockRows()` في manager-dashboard
  - [ ] عدّل `customerDebtRows()` في manager-dashboard

---

### PERF-FIX-02 — Aged Debts: Full History Scan Without Date Bound
- **الملفات:**
  - `backend/src/modules/accounting/services/aged-debts.service.ts`
    - `getAgedReceivables()` — `.selectAll()` على كل العملاء + كل تاريخ المبيعات
    - `getAgedPayables()` — نفس المشكلة على الموردين والمشتريات
  - `backend/src/modules/reports/helpers/reports-summary.service.ts`
    - `debtAgingReport()` — نفس الـ pattern بدون حد زمني
- **التأثير:** متجر بـ 500 عميل و 50,000 فاتورة آجلة → بيجيب الـ 50,000 كلها في Node
- **الحل:** استبدل الـ two-query + JS aging loop بـ SQL CTE واحد:
  ```sql
  SELECT customer_id,
    SUM(CASE WHEN age <= 30 THEN remaining ELSE 0 END) as bucket_0_30,
    SUM(CASE WHEN age BETWEEN 31 AND 60 THEN remaining ELSE 0 END) as bucket_31_60,
    SUM(CASE WHEN age BETWEEN 61 AND 90 THEN remaining ELSE 0 END) as bucket_61_90,
    SUM(CASE WHEN age > 90 THEN remaining ELSE 0 END) as bucket_over_90
  FROM aged_invoices_cte
  GROUP BY customer_id
  ```
- **الخطوات:**
  - [ ] اكتب SQL CTE للـ aging في `aged-debts.service.ts`
  - [ ] طبّق نفس الحل في `debtAgingReport()` في reports-summary

---

### PERF-FIX-03 — Customer RFM Report: No Date Filter on Full Sales History
- **الملف:** `backend/src/modules/reports/reports.service.ts` — `customerRfmReport()`
- **المشكلة:** بيجيب كل المبيعات من الأزل (بدون date filter) ويعمل segments في JS
- **التأثير:** متجر نشط لمدة 3 سنوات → ملايين السطور في Node
- **الحل:**
  - أضف date lower bound (آخر 24 شهر كحد أقصى للـ RFM)
  - نقل segment counts لـ SQL: `COUNT(*) FILTER (WHERE recency_days <= 30)` etc.
  - احتفظ بـ paginated item list فقط في JS
- **الخطوات:**
  - [ ] أضف `WHERE created_at >= NOW() - INTERVAL '24 months'`
  - [ ] ادفع segment aggregations لـ SQL
  - [ ] أضف pagination على النتيجة النهائية

---

### PERF-FIX-04 — reportSummary: 8 Unbounded Table Fetches
- **الملف:** `backend/src/modules/reports/reports.service.ts` — `reportSummary()`
- **المشكلة:** 8 queries متوازية تجيب كل الـ rows في نطاق التاريخ بدون LIMIT ثم تحسب في JS
  - الأخطر: `saleItemsRows` — JOIN على sale_items × sales قد تكون 100,000+ row لشهر نشيط
- **الحل:**
  - `saleItemsRows` → استبدل بـ SQL `SUM(si.qty * si.cost_price)` مباشر (COGS)
  - `salesRows` / `purchasesRows` → SQL `SUM(total)`, `COUNT(*)` مجمّعة
  - `treasuryRows` → SQL `SUM(amount)` مجمّعة
  - احتفظ بـ `topProductsLimit: 10` فقط كـ raw rows (already limited)
- **ملاحظة:** هذه الأصعب لأن `buildReportSummaryPayload` معقد — يحتاج refactor تدريجي
- **الخطوات:**
  - [ ] ابدأ بـ `saleItemsRows` → COGS SQL aggregate (الأثقل)
  - [ ] `treasuryRows` → SQL SUM بدل raw rows
  - [ ] `returnsRows` → SQL SUM بدل raw rows
  - [ ] تدريجياً `salesRows` / `purchasesRows` → SQL aggregates

---

### PERF-FIX-05 — fetchMappedPurchases: Entire History Without Pagination
- **الملف:** `backend/src/modules/purchases/services/purchases-query.service.ts` — `fetchMappedPurchases()`
- **المشكلة:** بيجيب كل الفواتير من الأزل + كل بنودها (purchase_items) بدون pagination
- **التأثير:** متجر بـ 10,000 فاتورة شراء → يجيب الـ 10,000 + كل البنود دفعة واحدة
- **الحل:**
  - إذا كانت مستخدمة للعرض: أضف LIMIT/OFFSET مثل `listPurchases()`
  - إذا كانت للتصدير: أضف date range cap إلزامي + streaming بدل load كامل
- **الخطوات:**
  - [ ] افحص كل المستدعين لـ `fetchMappedPurchases()`
  - [ ] أضف pagination أو date range cap حسب الاستخدام

---

### PERF-FIX-06 — listSupplierPayments: All Records Without Pagination
- **الملف:** `backend/src/modules/purchases/services/purchases-query.service.ts` — `listSupplierPayments()`
- **المشكلة:** ترجع كل مدفوعات الموردين من الأزل بدون pagination
- **الحل:** أضف LIMIT/OFFSET + total COUNT مثل نمط `listExpenses()`
- **الخطوات:**
  - [ ] أضف `page`, `pageSize` parameters
  - [ ] أضف `COUNT(*) OVER()` window function للـ total
  - [ ] عدّل الـ controller المستدعي

---

## 🟡 أولوية متوسطة — MEDIUM PRIORITY

### PERF-FIX-07 — demandForecastingReport: Full Product Scan Without Pagination
- **الملف:** `backend/src/modules/reports/helpers/reports-summary.service.ts` — `demandForecastingReport()`
- **المشكلة:** بيجيب كل المنتجات بدون LIMIT ويرجع كلها في الـ response
- **الحل:** أضف pagination وإرجاع top-N فقط (مثلاً أعلى 100 بحسب الأولوية)
- **الخطوات:**
  - [ ] أضف `ORDER BY urgency_score DESC LIMIT 100`
  - [ ] أضف pagination parameters للـ endpoint

---

### PERF-FIX-08 — loadCustomers in Manager Actions: All Customers for Credit Check
- **الملف:** `backend/src/modules/manager-actions/manager-actions.service.ts` — `loadCustomers()`
- **المشكلة:** بيجيب كل العملاء عشان يعرض من تجاوز حد الائتمان فقط
- **الحل:** استبدل بـ SQL مباشر يجيب العملاء المتجاوزين فقط:
  ```sql
  WHERE balance >= credit_limit * 0.8 AND credit_limit > 0
  ORDER BY (balance / credit_limit) DESC LIMIT 20
  ```
- **الخطوات:**
  - [ ] عدّل `loadCustomers()` بـ SQL مع WHERE للتجاوز فقط

---

### PERF-FIX-09 — partnerBalances: All Partners Without Pagination
- **الملف:** `backend/src/modules/reports/reports.service.ts` — `partnerBalances()`
- **المشكلة:** بيجيب كل العملاء/الموردين بدون pagination — استعلام التقارير
- **الحل:** أضف pagination أو على الأقل LIMIT ذكي (أعلى الأرصدة)
- **الخطوات:**
  - [ ] أضف `page`, `pageSize` أو `LIMIT 500`

---

### PERF-FIX-10 — balance-sheet: selectAll + JS Classification Loop
- **الملف:** `backend/src/modules/accounting/services/balance-sheet.service.ts` — `getBalanceSheet()`
- **المشكلة:** `.selectAll()` غير ضروري + تصنيف الحسابات في JS loop
- **الحل:** حدد الأعمدة المطلوبة فقط + ادفع التصنيف لـ SQL CASE WHEN
- **الخطوات:**
  - [ ] استبدل `.selectAll()` بـ `.select(['id', 'code', 'name', 'type', 'balance'])`
  - [ ] ادرس إمكانية SQL CASE WHEN للتصنيف

---

## 📋 ترتيب التنفيذ المقترح

```
المرحلة 1 (الأسرع تأثيراً):
  PERF-FIX-01 — Manager Actions (الصفحة بتفتح مع الداشبورد)
  PERF-FIX-08 — loadCustomers fix (جزء من PERF-FIX-01)

المرحلة 2 (تقارير الديون والعمر):
  PERF-FIX-02 — Aged Debts (هيتقل جداً مع كبر البيانات)

المرحلة 3 (تقارير العملاء):
  PERF-FIX-03 — RFM Report (full history issue)

المرحلة 4 (المشتريات):
  PERF-FIX-05 — fetchMappedPurchases
  PERF-FIX-06 — listSupplierPayments

المرحلة 5 (الأصعب — refactor تدريجي):
  PERF-FIX-04 — reportSummary (يحتاج تخطيط أعمق)

المرحلة 6 (متوسط):
  PERF-FIX-07, 09, 10 (تحسينات إضافية)
```

---

## 📊 ملخص الأثر المتوقع

| الإصلاح | قبل | بعد | الأثر |
|---------|------|------|-------|
| PERF-FIX-01 | N منتج كامل | 50 row | الأهم للـ UX اليومي |
| PERF-FIX-02 | N فاتورة تاريخية | SQL CTE | يمنع timeout عند كبر البيانات |
| PERF-FIX-03 | كل التاريخ | 24 شهر فقط | يمنع crash للمتاجر القديمة |
| PERF-FIX-04 | N row في Node | SQL SUM | تسريع الداشبورد والتقارير |
| PERF-FIX-05/06 | كل التاريخ | paginated | يمنع timeout |

---

> **ملاحظة للـ AI Agent:** اقرأ هذا الملف قبل أي إصلاح أداء. حدّث حالة الـ checkbox لكل مهمة بعد إتمامها. لا تعدّل إصلاحاً مكتملاً (✅) دون سبب وجيه.
