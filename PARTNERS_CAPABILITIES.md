# قدرات العملاء والتحصيل والولاء

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **العملاء والتحصيل والولاء** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/partners/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md) · [المشتريات والموردون](PURCHASES_CAPABILITIES.md) · [إدارة علاقات العملاء والفرص](CRM_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

<a id="partners-join-boundary-p0a"></a>
### Customer/branch tenant joins — P0-A security follow-up, 2026-10-25
`partners.service.ts` constrains sale/return and branch joins by both tenant and identifier; no PostgreSQL execution was performed.

[Audit evidence](docs/reviews/PLATFORM_CORE_SECURITY_P0A_20261025.md) — source fixes and regression cases only; **not executed**.

## فهرس الأقسام المنقولة

- [5. العملاء والمبيعات الآجلة (Customers & Accounts Receivable)](#cap-031)
- [17. برنامج ولاء ونقاط المكافآت للعملاء (Customer Loyalty Points Engine)](#cap-043)
- [178. محرك متابعة وتصعيد التحصيلات المستقل ومركز الإنذارات وحظر الآجل الآلي (Dedicated AR Collections & Dunning Hub)](#cap-212)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-031"></a>
<!-- migrated:cap-031:start -->
## 5. العملاء والمبيعات الآجلة (Customers & Accounts Receivable)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/partners`, `frontend/src/features/customers`
* **الجداول في قاعدة البيانات:** `customers`, `customer_transactions`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **دليل العملاء وسجل المشتريات** | 🟢 | 100% | `partners.service.ts`, `CustomersPage.tsx` | بيانات العملاء، أرقام الهواتف، العناوين، وإجمالي مشتريات ومديونية كل عميل. |
| **البيع الآجل وحدود الائتمان (Credit Limits)** | 🟢 | 100% | `sales.service.ts`, `CustomerCreditLimit.tsx` | تحديد سقف ائتمان لكل عميل لمنع تجاوزه أثناء إصدار الفواتير الآجلة. |
| **كشوف حسابات العملاء التفصيلية** | 🟢 | 100% | `CustomerStatementModal.tsx` | كشف حساب زمني يوضح كل فاتورة، دفعة مسددة، ورصيد المديونية المتبقي. |
| **سندات قبض مديونيات العملاء** | 🟢 | 100% | `treasury.service.ts`, `ReceiptVoucherModal.tsx` | استلام دفعات ديون العملاء وإيداعها في الخزينة أو البنك وتحديث الرصيد فوراً. |
| **خطط وجداول أقساط العملاء (Customer Installment Plans)** | 🟢 | 100% | `customer-installments.service.ts`, `customer_installment_plans`, `customer_installments` | إنشاء خطط الأقساط الشهرية، احتساب الفائدة، امتصاص كسور السنتات في القسط الأخير لضمان مطابقة الإجمالي بدقة 100%، وتوليد ترقيم موحد `INST-YYMMDD-XXXX`. |
| **سداد الأقساط والربط المحاسبي الكامل (Installments Payments & GL Sync)** | 🟢 | 100% | `customer-installments.service.ts`, `customer-installments.controller.ts`, `sales-finance.service.ts`, `accounting-posting.service.ts` | سداد الأقساط بقفل تشاؤمي `forUpdate()` لمنع التحصيل الزائد، مع خصم رصيد العميل في الأستاذ المساعد، إثبات حركة الخزينة، وترحيل قيد متوازن للأستاذ العام برقم إيصال موحد `REC-YYMMDD-XXXX`.<br/>**تحصين سبتمبر 2026 (البند 10 و O21 — نفذه Antigravity):** تحصين `CustomerInstallmentsController` بـ`PermissionsGuard` وفرض صلاحية `@RequireAnyPermission('sales', 'customers')` على كافة مسارات خطط وجداول ودفعات الأقساط لمنع أي مستخدم غير مصرح له من إدارة الأقساط أو تسجيل تحصيلات نقدية. |
| **إدارة علاقات العملاء والفرص البيعية (CRM Deals & Pipeline)** | 🟢 | 100% | `crm.service.ts`, `crm_deals`, `crm_activities` | متابعة مراحل الفرص البيعية وحساب القيمة الوزنية ومعدل التحويل بدقة، مع تحويل ذري آمن للفرصة إلى عميل مسجل بالدفاتر. |


---


<!-- migrated:cap-031:end -->

<a id="cap-043"></a>
<!-- migrated:cap-043:start -->
## 17. برنامج ولاء ونقاط المكافآت للعملاء (Customer Loyalty Points Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/sales`, `backend/src/modules/returns`, `backend/src/modules/partners`, `frontend/src/features/pos`, `frontend/src/features/settings`, `frontend/src/features/customers`, `frontend/src/lib/pos-printing`
* **الجداول في قاعدة البيانات:** `customers` (`loyalty_points`), `customer_loyalty_logs`, `settings`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **محرك اكتساب النقاط الديناميكي** | 🟢 | 100% | `sales-write.service.ts`, `database.types.ts` | احتساب نقاط تلقائياً للعميل عند إصدار فواتير البيع بناءً على المبلغ المدفوع ومعدل الاكتساب المحدد (افتراضياً 10 نقاط لكل 100 جنيه) مع الترحيل لجدول السجلات. |
| **محرك استبدال النقاط بالخصم الفوري** | 🟢 | 100% | `sales-write.service.ts`, `PosCheckoutDialogSections.tsx`, `usePosWorkspaceDerived.ts` | استبدال النقاط بخصم نقدي مباشر في شاشة الكاشير مع تطبيق قيمة النقطة، الحد الأدنى للاستبدال، وسقف أقصى نسبة خصم من الفاتورة. |
| **تسوية النقاط عند المرتجعات (Clawback & Refund)** | 🟢 | 100% | `returns.service.ts` | حماية النظام من التلاعب: خصم النقاط المكتسبة تلقائياً بنسبة المرتجع، ورد النقاط المستبدلة للعميل في حالة إرجاع الفاتورة. |
| **إعدادات الولاء وحاسبة المحاكاة الحية** | 🟢 | 100% | `SalesInventorySettingsTab.tsx`, `settings.schema.ts` | بطاقة مؤسسية أنيقة لضبط نسب الاكتساب، قيمة النقطة، الحد الأدنى، وسقف الخصم، مع حاسبة محاكاة تفاعلية فورية. |
| **إظهار النقاط في إيصالات وفواتير الطباعة** | 🟢 | 100% | `pos-printing.ts`, `pos-printing/template.ts` | طباعة النقاط المكتسبة، المستبدلة، وإجمالي الرصيد المتبقي على الإيصالات الحرارية (80mm/57mm) وفواتير A4. |
| **سجل حركات نقاط العميل والتعديل اليدوي** | 🟢 | 100% | `CustomerLoyaltyModal.tsx`, `partners.service.ts` | بطاقات إحصائية ملخصة، تصنيف دقيق للحركات (اكتساب، استبدال، خصم مرتجع، رد مرتجع)، وإمكانية التعديل اليدوي بصلاحيات. |

---


<!-- migrated:cap-043:end -->

<a id="cap-212"></a>
<!-- migrated:cap-212:start -->
## 178. محرك متابعة وتصعيد التحصيلات المستقل ومركز الإنذارات وحظر الآجل الآلي (Dedicated AR Collections & Dunning Hub)
* **حالة الوحدة / المعيار:** 🟢 مكتملة ومحمية بنسبة 100% (29 سبتمبر 2026).
* **المسارات:** `/accounting/collections`، `/finance/collections`.
* **المشكلة المعالجة:**
  - تحويل إدارة الديون من مجرد كشوف حسابات صامتة وسجلات أعمار ديون غير تنفيذية إلى منظومة تدفقات عمل إجرائية صارمة ترتب أولويات مسؤولي التحصيل، وتحدد مواعيد السداد المتعهد بها، وتصعد المطالبات تدريجياً، وتحظر البيع الآجل آلياً للعملاء المماطلين.
* **الهندسة والحلول المنفذة:**
  1. **هجرة قاعدة البيانات (2040000000171_ar_dunning_and_collection_hub.ts):**
     - جدول مستويات المطالبة (`ar_dunning_levels`): ضبط مستويات التصعيد (1: تذكير ودي، 2: إشعار رسمي، 3: إنذار تعليق الآجل، 4: تصعيد قانوني) مع مدد التأخير، قوالب الرسائل، وتفعيل الحظر الآلي.
     - جدول ملفات التحصيل (`ar_collection_cases`): ملف لكل عميل مدين يتتبع إجمالي المتأخرات، أقدم فاتورة بالأيام، الحالة (open, promised_to_pay, escalated, settled)، وتاريخ ومبلغ السداد المتعهد به.
     - جدول سجل المتابعات (`ar_collection_logs`): سجل غير قابل للحذف يوثق كل مكالمة، زيارة، محادثة واتساب، وعد سداد، أو تصعيد إداري مع هوية المستخدم والوقت.
     - أعمدة حظر الآجل في جدول العملاء (`customers`): `is_credit_blocked`، `credit_block_reason`، `credit_blocked_at`، `credit_blocked_by`.
  2. **محرك الفحص والحساب الرياضي الصافي (ar-dunning.engine.ts):**
     - محرك حسابي نقي وخالٍ من الآثار الجانبية يطبق توزيع الأرصدة عبر FIFO، واحتساب أيام التأخير الفعلية وفقاً لشروط الائتمان، وترقية مستويات المطالبة، ومراقبة إخلال العميل بوعود السداد، وبناء رسائل وروابط الواتساب الفورية.
     - اختبارات وحدة شاملة (`backend/test/ar-dunning-engine.spec.ts`) تغطي 7 سيناريوهات بنجاح 100%.
  3. **الحوكمة والربط العضوي بخدمة المبيعات (Sales Credit Block Gate):**
     - تم ربط محرك إنشاء المبيعات (`sales-write.service.ts`) للتحقق اللحظي من راية `customer.is_credit_blocked` ومنع أي بيع آجل فوراً للعميل مع إظهار سبب الحظر.
  4. **واجهة المستخدم التفاعلية المتكاملة (ArCollectionsPage.tsx):**
     - شريط مؤشرات KPIs: إجمالي المتأخرات، الملفات النشطة، مبالغ اليوم المتعهد بها، ملفات تحت الإنذار، والعملاء المحظورون من الآجل.
     - جدول تفاعلي يدعم الفلترة بالحالة والبحث بالاسم والهاتف، مع عرض مستوى المطالبة وشارات الحالة.
     - زر إرسال واتساب فوري يفتح محادثة العميل بالرسالة الرسمية المقننة بنقرة واحدة.
     - نافذة تسجيل تعهد بالسداد (`ArPromiseToPayModal`).
     - نافذة توثيق الإجراءات والمتابعات (`ArInteractionLogModal`).
     - ملف العميل الشامل وسجل الفواتير والمتابعات (`ArCaseDetailsModal`).
     - نافذة تخصيص مستويات المطالبة (`ArDunningLevelsModal`).
* **الملفات المتصلة:**
  - `backend/src/database/migrations/2040000000171_ar_dunning_and_collection_hub.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/accounting/engines/ar-dunning.engine.ts`
  - `backend/test/ar-dunning-engine.spec.ts`
  - `backend/src/modules/accounting/dto/ar-collections.dto.ts`
  - `backend/src/modules/accounting/services/ar-collections.service.ts`
  - `backend/src/modules/accounting/ar-collections.controller.ts`
  - `backend/src/modules/accounting/accounting.module.ts`
  - `backend/src/modules/sales/services/sales-write.service.ts`
  - `frontend/src/features/accounting/api/ar-collections.api.ts`
  - `frontend/src/features/accounting/components/collections/ArCollectionsKpis.tsx`
  - `frontend/src/features/accounting/components/collections/ArPromiseToPayModal.tsx`
  - `frontend/src/features/accounting/components/collections/ArInteractionLogModal.tsx`
  - `frontend/src/features/accounting/components/collections/ArCaseDetailsModal.tsx`
  - `frontend/src/features/accounting/components/collections/ArDunningLevelsModal.tsx`
  - `frontend/src/features/accounting/pages/ArCollectionsPage.tsx`
  - `frontend/src/features/accounting/routes.tsx`
  - `frontend/src/features/accounting/pages/AgedDebtsPage.tsx`
* **التحقق البرمجي:**
  - اختبارات الوحدة للمحرك: `backend/test/ar-dunning-engine.spec.ts` بنجاح 100% لكافة سيناريوهات التسوية، والتصعيد، والوعود، والرسائل.

---


<!-- migrated:cap-212:end -->
