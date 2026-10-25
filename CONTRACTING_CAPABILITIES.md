# قدرات المقاولات

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **المقاولات** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/contracting/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md) · [المشتريات والموردون](PURCHASES_CAPABILITIES.md) · [المخزون والمستودعات](INVENTORY_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

<a id="contracting-document-boundary-p0a"></a>
### Contracting document tenant read — P0-A security follow-up, 2026-10-25
`contracting.service.ts` now scopes its post-update document revision read by tenant ID. Runtime regression verification is pending.

[Audit evidence](docs/reviews/PLATFORM_CORE_SECURITY_P0A_20261025.md) — source fixes and regression cases only; **not executed**.

## فهرس الأقسام المنقولة

- [77. موديول المقاولات وإدارة المشاريع الإنشائية المتكامل (Contracting & Construction ERP Module)](#cap-108)
- [80. وحدة المقاولات المتكاملة - النظام المؤسسي الكامل لمقاول البناء (Enterprise Contracting ERP - Full Contractor Workflow)](#cap-111)
- [80. بنك بنود المقاولات المرجعي الشامل ومحرك الاستيراد لكافة التخصصات (Multi-Trade Master BOQ Library & 1-Click Importer)](#cap-112)
- [81. بيئة عمل المشروع الموحدة المدمجة (Unified Project Workspace & 5 Operational Hubs)](#cap-113)
- [82. المولد التلقائي للأكواد التسلسلية لبنود المقاولات وترتيب واجهة بنك البنود (Auto-Sequential BOQ Code Generator & Master Library UI Polish)](#cap-114)
- [83. تصحيح ربط بيانات المقايسة وإضافة إجراءات التعديل والحذف وتنسيق الجدول (Project BOQ Data Mapping & Actions Polish)](#cap-115)
- [84. معمارية المصدر الموحد للنوافذ المنبثقة والقضاء على تكرار الأكواد (Single Source of Truth & Universal BOQ Modal Standard)](#cap-116)
- [85. توحيد وضبط أبعاد جدول مقايسة المشروع وهندسة الحقول العددية (Contracting BOQ Table Fixed Layout & Numeric Column Balancing)](#cap-117)
- [90. محرك الاستيراد الذكي الشامل لجداول الكميات والمقايسات (Universal Smart BOQ Excel Import Engine)](#cap-122)
- [85. توحيد وضبط أبعاد جدول مقايسة المشروع وهندسة الحقول العددية (Contracting BOQ Table Fixed Layout & Numeric Column Balancing)](#cap-123)
- [90. محرك الاستيراد الذكي الشامل لجداول الكميات والمقايسات (Universal Smart BOQ Excel Import Engine)](#cap-124)
- [102. محرك التوليد الزمني الذكي للإنشاءات والمقاولات (Turnkey Construction Schedule Generator & CPM WBS Builder)](#cap-137)
- [105. منظومة إثبات وقائع التأخير والترحيل الزمني ثلاثي الخيارات للأنشطة الإنشائية (Contracting 3-Way Task Delay & Cascade Shifter)](#cap-140)
- [110. تعميم المعيار القياسي للنوافذ المنبثقة المتناظرة رباعية الأعمدة وحظر السكرول على موديول المقاولات (Symmetric 4-Column Zero-Scroll Modal Standard for Contracting)](#cap-145)
- [110. تعميم المعيار القياسي للنوافذ المنبثقة المتناظرة رباعية الأعمدة وحظر السكرول على موديول المقاولات (Symmetric 4-Column Zero-Scroll Modal Standard for Contracting)](#cap-151)
- [140. التوسيع الشامل لبنك بنود المقاولات المرجعي لـ 124 بنداً وتسعير واقعي لعام 2026 وتطوير واجهة الاستيراد (Comprehensive Master BOQ Library Expansion to 124 Items & 2026 Market Pricing)](#cap-165)
- [141. بيئة عمل دراسة وتسعير العطاءات والمشروعات المحتملة ومحرك تفكيك الكود الهندسي القياسي (Tender & Pre-Award Estimator with Standard Engineering BOM Exploder)](#cap-166)
- [142. مسار إدارة المشاريع الإنشائية الموحد والموجه الذكي للخطوة التالية (The 7-Phase Construction Lifecycle Engine & Smart Next Action Guide)](#cap-167)
- [145. محرك استخراج وتحليل مقايسات المشروعات والعطاءات من ملفات الـ PDF (Native PDF BOQ & SOV Ingestion Engine)](#cap-171)
- [142. مسار إدارة المشاريع الإنشائية الموحد والموجه الذكي للخطوة التالية (The 7-Phase Construction Lifecycle Engine & Smart Next Action Guide)](#cap-172)
- [145. محرك استخراج وتحليل مقايسات المشروعات والعطاءات من ملفات الـ PDF (Native PDF BOQ & SOV Ingestion Engine)](#cap-174)
- [146. محرك التسعير الفوري الاستباقي والمكتبة الهندسية المرجعية الموحدة لمقايسات المشروعات (Proactive BOQ Auto-Pricing & Master Engineering Pricing Core)](#cap-175)
- [147. منظومة التبويب المستقل للشيتات وعروض الأسعار متعددة الحزم وتصدير الإكسيل المسعر بهوية الشركة والـ PDF المطبوع (Multi-Sheet Preserved Tabs, Zero-Scroll Multi-line Quotations & Priced Excel/PDF Engine)](#cap-176)
- [148. دورة حياة العطاءات والمناقصات الهندسية ومسار الترسية والأرشفة المرجعية (Tender Lifecycle, Revisions, Historical Archive & Awarding Pipeline)](#cap-177)
- [149. منظومة إدارة مقاولي الباطن، دليل المهن، كشف الحساب المالي التراكمي، وسندات الصرف (Subcontractors Master Directory, Real-Time Financial Ledger & Disbursements Management)](#cap-178)
- [150. محرك توليد الجداول الزمنية الشامل متعدد الحزم والتخصصات والمزامنة التلقائية مع المقايسة (Universal Multi-Trade & Modular Schedule Engine)](#cap-179)
- [151. إحكام المعمارية التعاقدية الشاملة وتوحيد هوية مقاولي الباطن وتفكيك خصومات المستخلصات (Phase 0 Contracting Architecture Hardening)](#cap-180)
- [152. منظومة خطابات الضمان البنكية والبوابة الرقابية G1 وحجب المستخلصات والغطاء التراكمي (Phase 1: Bank Guarantees, Gateway G1, Invariant G1-C, Expiry Alerts & IPC Interlocking)](#cap-181)
- [153. محرك توزيع المصاريف غير المباشرة للموقع والربحية الحقيقية لبنود المقايسة (Track 1: Field Indirect Costs & Distributables Allocation Engine - AACE RP 10S-90 / 34R-05)](#cap-182)
- [151. إحكام المعمارية التعاقدية الشاملة وتوحيد هوية مقاولي الباطن وتفكيك خصومات المستخلصات (Phase 0 Contracting Architecture Hardening)](#cap-184)
- [153. محرك توزيع المصاريف غير المباشرة للموقع والربحية الحقيقية لبنود المقايسة (Track 1: Field Indirect Costs & Distributables Allocation Engine - AACE RP 10S-90 / 34R-05)](#cap-185)
- [159. إغلاق فجوات موديول المقاولات مقارنة بمعايير Procore/CMiC/Primavera (Tier-1 Contracting ERP Gap-Closing)](#cap-191)
- [165. دستور العزل القطاعي التام للمتاجر والتجزئة عن بيئة المقاولات (Contracting Vertical Isolation & Zero-Retail Standard)](#cap-196)
- [166. تنظيم وتوحيد تابات التخصصات الهندسية في بنك بنود المقاولات المرجعي ومنع التكرار (Master BOQ Trades Deduplication & Symmetrical Tabs Standard)](#cap-197)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-108"></a>
<!-- migrated:cap-108:start -->
## 77. موديول المقاولات وإدارة المشاريع الإنشائية المتكامل (Contracting & Construction ERP Module)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Procore / Oracle Primavera (Unifier) / SAP S/4HANA EC&O / ERPNext BuildSuite & AIA G702/G703 Standards.
* **روابط وشاشات الوصول:** `/contracting` (القائمة الجانبية: المقاولات والمشاريع ➔ المشاريع الإنشائية، المقايسات، الأوامر التغييرية، مستخلصات الدفع، عقود مقاولي الباطن، اليوميات الميدانية، الاستفسارات الهندسية).
* **مفتاح الإعداد:** `contractingModuleEnabled`
* **الباقات المدعومة:** `plan_ultimate`, `plan_omnichannel` (وكافة مصفوفات ومسميات الباقات)
* **مسارات الكود — Backend:** `backend/src/modules/contracting/`
* **مسارات الكود — Frontend:** `frontend/src/features/contracting/`
* **الجداول في قاعدة البيانات (Migration 081):** `contracting_projects`, `contracting_boq_items`, `contracting_change_orders`, `contracting_invoices`, `contracting_invoice_items`, `contracting_subcontracts`, `contracting_site_daily_logs`, `contracting_rfis`, `contracting_schedule_tasks`, `contracting_material_requisitions`.

### الملفات المنشأة والمطورة

| النوع | الملف | الوصف |
| :--- | :--- | :--- |
| **Migration** | `2040000000081_contracting_and_construction_module.ts` | ترحيل قاعدة البيانات (10 جداول علائقية متكاملة + مفاتيح خارجية وفهارس) |
| **Types** | `contracting.types.ts` | تعريفات TypeScript الكاملة للمشاريع والمقايسات والمستخلصات والأوامر والجدولة وصرف الخامات |
| **DTOs** | `dto/contracting.dto.ts` | كائنات نقل البيانات الصارمة المدققة لجميع عمليات المقاولات |
| **Service** | `contracting.service.ts` | محرك المقاولات: توليد مراكز التكلفة التحليلية، حسابات AIA G702/G703، اعتمادات التشوينات، الجدولة، وصرف الخامات |
| **Controller** | `contracting.controller.ts` | نهايات الـ API المحمية بـ `SessionAuthGuard` وعزل الـ Multi-Tenant |
| **Module** | `contracting.module.ts` | وحدة NestJS متصلة في `app.module.ts` |
| **API** | `api/contracting.api.ts` | واجهة التواصل الأمامية المستندة إلى `@/lib/http` |
| **Page** | `pages/ContractingWorkspacePage.tsx` | منصة العمل الرئيسية مع شريط مؤشرات مالية وتوجيه ديناميكي بالألسنة التسعة `?tab=` |
| **Routes** | `routes.tsx` | تسجيل مسار المقاولات بنمط `FeatureRouteModule` و `FeatureGate` |
| **Tab** | `ContractingProjectsTab.tsx` | تبويب استعراض وإدارة المشاريع وحالاتها ونسب إنجازها وموازناتها |
| **Tab** | `ContractingBoqTab.tsx` | تبويب جدول الكميات والمقايسات التثمينية (SOV / BOQ) وهوامش الأرباح |
| **Tab** | `ContractingGanttTab.tsx` | تبويب مخطط جانت وجدولة الأنشطة ومسار المسار الحرج (CPM WBS Gantt) |
| **Tab** | `ContractingChangeOrdersTab.tsx` | تبويب الأوامر التغييرية وتعديل القيمة التعاقدية والتمديدات الزمنية |
| **Tab** | `ContractingInvoicesTab.tsx` | تبويب مستخلصات الدفع التنفيذية ومتابعة المعتمد والمدفوع والختامي |
| **Tab** | `ContractingSubcontractsTab.tsx` | تبويب عقود وأوامر تكليف مقاولي الباطن ومتابعة الالتزامات |
| **Tab** | `ContractingMaterialsTab.tsx` | تبويب أذون صرف وتخصيص الخامات المباشرة من المخازن على بنود المقايسة |
| **Tab** | `ContractingDailyLogsTab.tsx` | تبويب اليوميات الميدانية للعمالة والمعدات وتوثيق عوائق الموقع |
| **Tab** | `ContractingRfiTab.tsx` | تبويب الاستفسارات الفنية (RFIs) واعتمادات المهندس الاستشاري |
| **Modal** | `CreateProjectModal.tsx` | نافذة تأسيس مشروع وعقد وتوليد مركز التكلفة التحليلي |
| **Modal** | `CreateBoqItemModal.tsx` | نافذة إضافة بند مقايسة وتقدير التكلفة والربحية |
| **Modal** | `ImportBoqModal.tsx` | نافذة استيراد جدول الكميات والمقايسة من Excel أو CSV مع تنزيل النموذج الاسترشادي والمعاينة الفورية |
| **Modal** | `CreateChangeOrderModal.tsx` | نافذة إصدار أمر تغييري وتحديد الأثر المالي والزمني |
| **Modal** | `CreateIpcInvoiceModal.tsx` | نافذة إعداد مستخلص جاري واحتساب التشوينات والاستقطاعات |
| **Modal** | `PrintIpcCertificateModal.tsx` | نافذة طباعة شهادة المستخلص الرسمية المعتمدة (نموذج AIA G702/G703 القياسي A4 مع رقم القيد الدفتري) |
| **Modal** | `CreateSubcontractModal.tsx` | نافذة إسناد وتوثيق عقد مقاولة باطن وربطه بدليل الموردين |
| **Modal** | `CreateDailyLogModal.tsx` | نافذة توثيق اليومية الميدانية للعمالة والمعدات |
| **Modal** | `CreateRfiModal.tsx` | نافذة إرسال طلب استفسار فني رسمي للاستشاري |
| **Modal** | `AnswerRfiModal.tsx` | نافذة تسجيل رد واعتماد الاستشاري وإغلاق الاستفسار |
| **Modal** | `CreateScheduleTaskModal.tsx` | نافذة جدولة مهمة جديدة في مخطط جانت وتحديد المسار الحرج وتاريخ البداية والنهاية |
| **Modal** | `CreateMaterialRequisitionModal.tsx` | نافذة إصدار إذن صرف خامات مباشر وتخصيصها على بند مقايسة معتمد |
| **Icons** | `AppIcons.tsx` | أيقونات مؤسسية معتمدة (`Building`, `FileCheck`, `FileSpreadsheet`, `Download`) متوافقة مع Clean Enterprise |

### التوصيل في النظام (System Wiring)

| الملف | ما تم إنجازه |
| :--- | :--- |
| `registry.ts` | تسجيل `contractingRouteModule` في سجل التوجيه المركزي |
| `access.ts` | إضافة أذونات `contracting` وتفرعاتها في `routePermissionMap` و `routeFeatureMap` |
| `app-shell.tsx` | إضافة أيقونات السايدبار، مجموعة `contracting-group`، وبوابات الرؤية الشرطية |
| `settings.schema.ts` | إضافة `contractingModuleEnabled: z.boolean().default(false)` |
| `contracts.ts` | ربط إعداد المقاولات مع عقود النظام المحفوظة |
| `modular-presets.ts` | تسجيل الموديول في مصفوفة الوحدات المؤسسية `SYSTEM_MODULES` |
| `ModulesSettingsTab.tsx` | إضافة كارت التفعيل والمفاتيح في شاشة إعدادات الوحدات |
| `session.service.ts` | تسجيل خاصية `contracting` في باقات `plan_ultimate` و `plan_omnichannel` |
| `saas-admin.service.ts` | تسجيل الموديول في باقات المشتركين والساس |
| `DeveloperActivationPanel.tsx` | دعم التفعيل والتعطيل في لوحة تحكم المطورين |

### الميزات والقدرات المفعلة

| الميزة التفصيلية | الحالة | نسبة الإنجاز | الملفات الأساسية |
| :--- | :---: | :---: | :--- |
| **تأسيس المشاريع ومراكز التكلفة التحليلية التلقائية** | 🟢 | 100% | `CreateProjectModal.tsx`, `contracting.service.ts` — `dimension: 'project'` |
| **جدول الكميات والمقايسة التثمينية (SOV / BOQ)** | 🟢 | 100% | `ContractingBoqTab.tsx`, `CreateBoqItemModal.tsx` |
| **استيراد وتصدير المقايسة من وإلى Excel دفعة واحدة (BOQ Batch Ingestion & Export)** | 🟢 | 100% | `ImportBoqModal.tsx`, `ContractingBoqTab.tsx`, `contracting.service.ts` (`batchCreateBoqItems`) |
| **مخطط جانت وجدولة الأنشطة والمسار الحرج (Gantt CPM WBS)** | 🟢 | 100% | `ContractingGanttTab.tsx`, `CreateScheduleTaskModal.tsx` |
| **إدارة الأوامر التغييرية والمطالبات (Change Orders)** | 🟢 | 100% | `ContractingChangeOrdersTab.tsx`, `CreateChangeOrderModal.tsx` |
| **مستخلصات الدفع المعتمدة (AIA G702 / G703)** | 🟢 | 100% | `ContractingInvoicesTab.tsx`, `CreateIpcInvoiceModal.tsx` |
| **الترحيل المحاسبي الآلي لدفتر الأستاذ العام (Automated GL Journal Posting)** | 🟢 | 100% | `ContractingInvoicesTab.tsx`, `PrintIpcCertificateModal.tsx`, `contracting.service.ts` (`postInvoiceJournalEntry`) |
| **احتساب تشوينات المواد بالموقع (Stored Materials)** | 🟢 | 100% | `CreateIpcInvoiceModal.tsx`, `contracting.service.ts` |
| **الاستقطاع الآلي للدفعة المقدمة وحسن التنفيذ (Retentions)** | 🟢 | 100% | `contracting.service.ts`, `CreateIpcInvoiceModal.tsx` |
| **أذون صرف وتخصيص الخامات المباشرة على بنود المقايسة** | 🟢 | 100% | `ContractingMaterialsTab.tsx`, `CreateMaterialRequisitionModal.tsx` |
| **طباعة شهادة مستخلص رسمي (A4 AIA Sheet)** | 🟢 | 100% | `PrintIpcCertificateModal.tsx` |
| **إسناد عقود مقاولي الباطن والالتزامات** | 🟢 | 100% | `ContractingSubcontractsTab.tsx`, `CreateSubcontractModal.tsx` |
| **سجل اليوميات واليومية الميدانية (Site Logs)** | 🟢 | 100% | `ContractingDailyLogsTab.tsx`, `CreateDailyLogModal.tsx` |
| **إدارة الاستفسارات والاعتمادات الفنية (RFI Engine)** | 🟢 | 100% | `ContractingRfiTab.tsx`, `CreateRfiModal.tsx`, `AnswerRfiModal.tsx` |
| **عزل المستأجرين التام (Multi-Tenant Isolation)** | 🟢 | 100% | جميع الجداول والخدمات بـ `tenant_id` إلزامي |
| **Feature Gating في السايدبار والإعدادات** | 🟢 | 100% | `app-shell.tsx`, `ModulesSettingsTab.tsx` |
| **الامتثال لدستور النظام البصري (0 Emojis & Clean SaaS)** | 🟢 | 100% | خلو تام من الإيموجيز واستخدام `StandardDialog` و `AppIcons` |

---


<!-- migrated:cap-108:end -->

<a id="cap-111"></a>
<!-- migrated:cap-111:start -->
## 80. وحدة المقاولات المتكاملة - النظام المؤسسي الكامل لمقاول البناء (Enterprise Contracting ERP - Full Contractor Workflow)

* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  - Backend: `backend/src/modules/contracting/`
  - Frontend: `frontend/src/features/contracting/`
* **الجداول الجديدة في قاعدة البيانات (Migration: `2040000000082`):**
  - `contracting_master_price_list` - قائمة الأسعار المرجعية للخامات والمصنعيات
  - `contracting_engineering_constants` - معادلات الاستهلاك الهندسي المعيارية
  - `contracting_cost_snapshots` - تجميد خطوط الأساس للميزانية (Cost Baseline Snapshots)
  - `contracting_retention_records` - سجل استقطاعات ضمان حسن التنفيذ
  - `contracting_payment_holds` - سجل حجز الدفعات للملاحظات الهندسية
  - `contracting_supplier_returns` - أذون مرتجع المواد وإشعارات الدائن
  - `contracting_labor_attendance` - يوميات العمالة الميدانية وتوزيع الساعات
  - `contracting_petty_cash` - العهد النقدية مع منطق رقابي صارم (Anti-Leakage)
  - `contracting_government_licenses` - تراخيص المشروع الحكومية وتنبيهات انتهاء الصلاحية

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح |
| :--- | :---: | :---: | :--- | :--- |
| **محرك التسعير الهندسي الآلي (Auto Pricing Engine)** | 🟢 | 100% | `AutoPricingModal.tsx`, `contracting.service.ts::autoPriceBoqItem` | حساب تكلفة وحدة البند بضغطة زر بناءً على معادلات الاستهلاك الهندسي (كميات الأسمنت/الحديد/الرمل/السن/العمالة لكل م³)، مع إضافة نسبة الهالك والأوفرهيد وهامش الربح وإظهار تفاصيل مكونات التكلفة. |
| **عرض السعر الرسمي للعميل (Client Quotation - Printable)** | 🟢 | 100% | `ClientQuotationModal.tsx` | توليد وطباعة عرض سعر رسمي منسق من جدول الكميات كامل مع بنود الأعمال والأسعار وشروط العقد وبيانات الطرفين وإمضاءات الاعتماد. |
| **حصر الاحتياجات الإجمالية للخامات (Material Requirements Planning - MRP)** | 🟢 | 100% | `ProjectMaterialsMrpModal.tsx`, `contracting.service.ts::getProjectMaterialRequirements` | حصر إجمالي طن الحديد وأكياس الأسمنت والرمل السن وساعات العمالة المطلوبة لكامل المشروع مقارنةً بالمنصرف والمتبقي مع أشرطة تقدم بصرية. |
| **تحليل أرباح وخسائر البنود (Item-Level P&L Analysis)** | 🟢 | 100% | `BoqProfitabilityModal.tsx`, `contracting.service.ts::getBoqProfitabilityAnalysis` | مقارنة سعر البيع التعاقدي بالتكلفة التقديرية والتكلفة الفعلية المنصرفة بنداً بنداً، مع تصنيف رابح/تحت الخطر/خاسر وإجمالي هامش الربح الفعلي. |
| **تجميد خط الأساس للميزانية (Cost Baseline Snapshots)** | 🟢 | 100% | `CostSnapshotModal.tsx`, `contracting.service.ts::createCostSnapshot` | حفظ وقفل صورة للميزانية عند اعتماد العقد، وعرض مقارنة تاريخية بين اللقطات المحفوظة لرصد الانحراف. |
| **سجل ضمان الأعمال المحتجز والفك (Retention Ledger)** | 🟢 | 100% | `RetentionLedgerModal.tsx`, `contracting.service.ts::getRetentionRecords` | تسجيل نسب الاحتجاز (5%-10%) لمقاولي الباطن والعملاء مع جدولة مواعيد الفك وسجل إفراج مفصل مع بيانات توثيقية. |
| **حجز الدفعات للملاحظات الهندسية (Payment Holds & Defect Clearance)** | 🟢 | 100% | `PaymentHoldsModal.tsx`, `contracting.service.ts::getPaymentHolds` | وقف صرف مستحقات أي مقاول أو مورد عند وجود ملاحظة هندسية أو عيب مصنعية، وتوثيق بيان الإفراج بعد التلافي. |
| **أذون مرتجع المواد وإشعارات الدائن (Supplier Returns & Credit Notes)** | 🟢 | 100% | `SupplierReturnsModal.tsx`, `contracting.service.ts::getSupplierReturns` | توثيق المواد المرفوضة أو التالفة وإرجاعها للمورد مع إصدار إشعار خصم (Credit Note) مالي بأرقام مرجعية. |
| **يوميات وتوزيع العمالة الميدانية (Labor Attendance & Split Allocation)** | 🟢 | 100% | `LaborAttendanceModal.tsx`, `contracting.service.ts::getLaborAttendance` | تسجيل حضور الصنائعية والعمال مع ساعات عادية وإضافية واليومية المستحقة، وإمكانية تقسيم نسبة التحميل بين مشروعات متعددة. |
| **العهد النقدية مع الرقابة الصارمة (Petty Cash Anti-Leakage Audit)** | 🟢 | 100% | `PettyCashModal.tsx`, `contracting.service.ts::createPettyCash` | إصدار وتتبع العهد النقدية لمهندسي المواقع مع منع صارم من فتح عهدة جديدة لأي مهندس قبل تصفية وإغلاق عهدته السابقة مستندياً بالفواتير والإيصالات. |
| **19 نقطة API للباك إند (Enterprise Contracting Endpoints)** | 🟢 | 100% | `contracting.controller.ts`, `contracting.service.ts` | تغطي: قائمة الأسعار، الثوابت الهندسية، التسعير الآلي، اللقطات، الضمانات، الحجوزات، المرتجعات، العمالة، العهد، التراخيص، مؤشر صحة المشروع، توقعات السيولة، MRP، P&L. |
| **شريط الأدوات الهندسية في تبويب BOQ** | 🟢 | 100% | `ContractingBoqTab.tsx` | شريط مدمج بـ 5 أزرار: محرك التسعير، عرض السعر للعميل، حصر الخامات MRP، تحليل ربحية البنود، تجميد خط الأساس. |
| **تراخيص المشروع الحكومية — واجهة كاملة (Government Licenses UI)** | 🟢 | 100% | `GovernmentLicensesModal.tsx` | واجهة كاملة لإضافة وعرض تراخيص الحفر والبناء والدفاع المدني مع بانر تحذير للتراخيص المنتهية أو القريبة من الانتهاء، وتفعيلها بزر "تراخيص" في صف كل مشروع بالجدول. |
| **مؤشر صحة المشروع — بادج تفاعلي (Health Score Pill Widget)** | 🟢 | 100% | `ProjectHealthWidget.tsx` | بادج ملون (أخضر/أصفر/أحمر) يعرض نقاط صحة كل مشروع 0-100 في عمود مستقل بجدول المشاريع مع tooltip يعرض SPI وCPI. |
| **بطاقة توقعات التدفق النقدي (Cash Flow Forecast Card - 30/60/90 Days)** | 🟢 | 100% | `CashForecastCard.tsx` | بطاقة ملخص في أعلى صفحة المشاريع تعرض المركز النقدي الحالي وشبكة الواردات/الصادرات/الصافي للـ 30/60/90 يوماً القادمة مع ملخص الالتزامات القادمة. |

### الملفات المضافة والمعدلة في هذه الجلسة

#### Backend
- `backend/src/database/migrations/2040000000082_contracting_master_enterprise_enhancements.ts` **[NEW]**
- `backend/src/modules/contracting/contracting.types.ts` **[MODIFIED]** - إضافة 15 interface جديدة
- `backend/src/modules/contracting/dto/contracting.dto.ts` **[MODIFIED]** - إضافة جميع DTOs للميزات الجديدة
- `backend/src/modules/contracting/contracting.service.ts` **[MODIFIED]** - إضافة 19 service method جديدة
- `backend/src/modules/contracting/contracting.controller.ts` **[MODIFIED]** - إضافة 19 endpoint جديدة

#### Frontend
- `frontend/src/features/contracting/contracting.types.ts` **[MODIFIED]** - types للواجهات الجديدة
- `frontend/src/features/contracting/api/contracting.api.ts` **[MODIFIED]** - 19 API client method جديدة
- `frontend/src/shared/components/icons/AppIcons.tsx` **[MODIFIED]** - إضافة `CalculatorIcon` و `TrendingUpIcon`
- `frontend/src/features/contracting/components/AutoPricingModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/ClientQuotationModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/ProjectMaterialsMrpModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/BoqProfitabilityModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/CostSnapshotModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/RetentionLedgerModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/PaymentHoldsModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/SupplierReturnsModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/LaborAttendanceModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/PettyCashModal.tsx` **[NEW]**
- `frontend/src/features/contracting/components/ContractingBoqTab.tsx` **[MODIFIED]** - شريط الأدوات الهندسية وربط الـ 5 مودالات
- `frontend/src/features/contracting/components/ContractingSubcontractsTab.tsx` **[MODIFIED]** - ربط Retention + Payment Holds
- `frontend/src/features/contracting/components/ContractingMaterialsTab.tsx` **[MODIFIED]** - ربط Supplier Returns
- `frontend/src/features/contracting/components/ContractingDailyLogsTab.tsx` **[MODIFIED]** - ربط Labor Attendance + Petty Cash
- `frontend/src/features/contracting/pages/ContractingBoqPage.tsx` **[MODIFIED]**
- `frontend/src/features/contracting/pages/ContractingSubcontractsPage.tsx` **[MODIFIED]**
- `frontend/src/features/contracting/pages/ContractingMaterialsPage.tsx` **[MODIFIED]**
- `frontend/src/features/contracting/pages/ContractingDailyLogsPage.tsx` **[MODIFIED]**

### التحقق النهائي
- **Frontend TypeScript:** `npx tsc --noEmit` ← **0 أخطاء** ✓
- **Backend TypeScript:** `npx tsc --noEmit` ← **0 أخطاء** ✓

---


<!-- migrated:cap-111:end -->

<a id="cap-112"></a>
<!-- migrated:cap-112:start -->
## 80. بنك بنود المقاولات المرجعي الشامل ومحرك الاستيراد لكافة التخصصات (Multi-Trade Master BOQ Library & 1-Click Importer)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Procore Master Items Catalog / Trimble WinEst & HeavyBid Multi-Trade Cost Database.
* **روابط وشاشات الوصول:**
  1. شاشة بنك البنود المرجعي المستقلة: `/contracting/master-boq` (القائمة الجانبية وشريط التبويبات العلوي: المقاولات ➔ بنك البنود المرجعي).
  2. زر الاستيراد السريع بجدول الكميات: `/contracting/boq` (زر "بنك البنود المرجعي" وزر "سحب تخصصات جاهزة" بالحالة الفارغة).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000083_contracting_master_boq_library.ts`, `2040000000094_contracting_master_boq_comprehensive_expansion.ts`, `2040000000097_contracting_mep_fire_fighting_master_library.ts`, `2040000000128_contracting_master_boq_trade_categories_normalization.ts`. جدول `contracting_master_boq_library` مُحمّل بـ 153 بنداً معيارياً واقعياً موزعاً بدقة 100% وبدون أي تكرار عبر 12 تخصصاً هندسياً معتمداً.
  * **الباك إند:** `backend/src/modules/contracting/contracting.service.ts` (`getMasterBoqTrades` بالترتيب الإنشائي التنفيذي المعتمد، و`getMasterBoqLibrary` مع دعم التصفية الفردية والمتعددة للقطاعات والتخصصات).
  * **الفرونت إند:**
    - `frontend/src/features/contracting/components/ImportMasterBoqModal.tsx` (شريط تصفية قطاعي مزدوج مع أيقونات هندسية وتحديد فريد لكل تخصص).
    - `frontend/src/features/contracting/components/CreateMasterBoqItemModal.tsx` و `UniversalBoqItemModal.tsx` (توليد الأكواد التسلسلية وهوامش الأرباح التقديرية حسب التخصص).
    - `frontend/src/features/contracting/pages/ContractingMasterBoqPage.tsx` (شريط القطاعات والتخصصات الهندسية المؤسسي: كروت قطاعات كبرى Super-Tabs، كبسولات التخصصات بأيقونات هندسية مستقلة، ثبات الخط 600، زمن استجابة 0ms، وانعدام التحديد المزدوج نهائياً).
* **التخصصات الإنشائية والكهروميكانيكية الـ 12 المعتمدة بالتسلسل التنفيذي:**
  1. تجهيزات الموقع والأعمال التمهيدية (`site_mobilization` - 6 بنود)
  2. الأعمال المدنية والخرسانات (`civil_concrete` - 16 بنداً)
  3. أعمال المباني والعزل والفواصل (`masonry_insulation` - 14 بنداً)
  4. المنشآت المعدنية والجمالونات (`steel_structure` - 3 بنود)
  5. التشطيبات المعمارية والديكور (`finishing_decor` - 15 بنداً)
  6. الأبواب والشبابيك والواجهات (`doors_windows_aluminum` - 11 بنداً)
  7. الأعمال الكهربائية والإنارة (`electrical_lighting` - 22 بنداً)
  8. التيار الخفيف والأنظمة الذكية ELV (`smart_elv_systems` - 8 بنود)
  9. الأعمال الصحية وتغذية وصرف المياه (`plumbing_sanitary` - 17 بنداً)
  10. التكييف والتهوية الميكانيكية (`hvac_mechanical` - 8 بنود)
  11. شبكات مكافحة وإطفاء الحريق (`fire_fighting` - 24 بنداً)
  12. الموقع العام واللاندسكيب والبنية التحتية (`site_infrastructure` - 9 بنود)
* **المجموعات والقطاعات الإنشائية الكبرى (Super-Tabs):**
  - **كافة التخصصات (الكل):** 153 بنداً
  - **الإنشائي والمدني:** 39 بنداً (تجهيزات الموقع + المدني والخرسانات + المباني والعزل + الجمالونات)
  - **التشطيبات والمعماري:** 26 بنداً (التشطيبات والديكور + الأبواب والشبابيك والواجهات)
  - **الكهروميكانيك (MEP):** 79 بنداً (الكهرباء والإنارة + التيار الخفيف ELV + الصحي والسباكة + التكييف والتهوية + مكافحة الحريق)
  - **الموقع العام واللاندسكيب:** 9 بنود
* **القدرات التشغيلية:**
  - القضاء التام والنهائي على ظاهرة التحديد المزدوج للتابات (تمسك تابات تانية) بفضل توحيد الفئات البرمجية وتفرد المفاتيح.
  - شريط قطاعات علوي يقلص التشتت البصري بنسبة 70% ويمكّن المقاول من تصفية تخصصات الكهروميكانيك أو المعماري بنقرة زر.
  - التزام صارم بمعيار ثبات الخط (Font-Weight: 600 ثابت بدون رعشة) وزمن استجابة فوري 0ms.
  - سحب تخصص كامل أو بنود محددة بضغطة زر واحدة لمقايسة أي مشروع جديد.
  - تصدير كامل بنك البنود المرجعي إلى Excel بضغطة زر.

---


<!-- migrated:cap-112:end -->

<a id="cap-113"></a>
<!-- migrated:cap-113:start -->
## 81. بيئة عمل المشروع الموحدة المدمجة (Unified Project Workspace & 5 Operational Hubs)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Procore Project Hub & Autodesk Construction Cloud (Unified Navigation Standard).
* **القضاء التام على السكرول الأفقي:** استبدال الـ 10 تابات المفرقة بـ 5 محاور تشغيلية متوازنة تتسع بالكامل في أي شاشة بدون أي شريط تمرير أفقي نهائياً.
* **المحاور التشغيلية الخمسة الموحدة:**
  1. **سجل المشاريع الإنشائية (`/contracting/projects`):** محفظة المشاريع، مؤشرات الأداء الكلية، وتوقعات السيولة.
  2. **المقايسة والبنود التعاقدية (`/contracting/boq`):** جدول كميات SOV، محرك التسعير الآلي، زر بنك البنود المرجعي، وتحليل ربحية البنود.
  3. **المالية والمستخلصات (`/contracting/financials`):** يجمع بتبديل فرعي سريع بين مستخلصات المالك IPC وضمانات الأعمال المحتجزة، وبين الأوامر التغييرية والمطالبات.
  4. **مقاولو الباطن والتوريدات (`/contracting/procurement`):** يجمع بتبديل فرعي بين عقود ومستخلصات مقاولي الباطن، وبين تشوينات وخامات الموقع ومرتجعات الموردين.
  5. **الميدان والجدول الزمني (`/contracting/field`):** يجمع بتبديل فرعي بين مخطط جانت والمسار الحرج، ويوميات الموقع وحضور العمالة، والاستفسارات الفنية (RFIs) وتراخيص المشروع.
  6. **السايد بار المركزي:** إضافة رابط مستقل لـ **"إعدادات وبنك بنود المقاولات"** (`/contracting/master-boq`) ككتالوج مركزي للشركة ككل.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/pages/ContractingFinancialsPage.tsx` **[NEW]**
  - `frontend/src/features/contracting/pages/ContractingProcurementPage.tsx` **[NEW]**
  - `frontend/src/features/contracting/pages/ContractingFieldPage.tsx` **[NEW]**
  - `frontend/src/features/contracting/pages/ContractingLayout.tsx` **[MODIFIED]**
  - `frontend/src/features/contracting/pages/ContractingMasterBoqPage.tsx` **[MODIFIED]** - شبكة تخصصات متناسقة هندسياً على سطرين بأبعاد موحدة (CSS Grid) بدون أي سكرول أفقي.
  - `frontend/src/features/contracting/routes.tsx` **[MODIFIED]**
  - `frontend/src/shared/layout/app-shell.tsx` **[MODIFIED]**

---


<!-- migrated:cap-113:end -->

<a id="cap-114"></a>
<!-- migrated:cap-114:start -->
## 82. المولد التلقائي للأكواد التسلسلية لبنود المقاولات وترتيب واجهة بنك البنود (Auto-Sequential BOQ Code Generator & Master Library UI Polish)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Automatic Item Numbering & Trade-Prefixed Coding Standard (Procore / HeavyBid).
* **القدرات التشغيلية:**
  1. **التوليد التلقائي الفوري للأكواد التسلسلية (Auto-Sequential Code Generator):**
     - عند فتح نافذة إضافة بند مرجعي مخصص، يقوم النظام تلقائياً بتحديد بادئة التخصص الهندسي (مثل `MAS` لأعمال المباني والعزل، `CIV` للأعمال المدنية، `ELE` لأعمال الكهرباء، إلخ).
     - فحص كافة البنود الحالية في قاعدة البيانات واستخراج أعلى رقم تسلسلي مسجل في هذا التخصص وزيادته بمقدار `1` مع تنسيق ثلاثي الخانات (مثل `MAS-007` مباشرة إذا كان آخر بند مسجل هو `MAS-006`).
     - عند تغيير التخصص من القائمة المنسدلة داخل النافذة، يعاد احتساب الكود التسلسلي التالي الخاص بالتخصص المختار فورياً.
  2. **إعادة تموضع زر الإضافة المخصص (Action Bar Realignment):**
     - نقل زر "+ إضافة بند مرجعي مخصص" من أعلى هيدر الصفحة ليتموضّع هندسياً مباشرة بين أزرار فلاتر التخصصات وجدول البنود القياسية لسهولة وسرعة الوصول.
  3. **خانة هامش الربح التفاعلية والاحتساب التلقائي اللحظي (Interactive Profit Margin & Real-Time Pricing):**
     - إضافة حقل "هامش الربح (%)" في منتصف بطاقة التسعير بين "سعر التكلفة المرجعية" و"سعر البيع المقترح".
     - تعيين هوامش ربح استرشادية ذكية مقترحة لكل تخصص هندسي (`DEFAULT_TRADE_MARGINS`: 25% للخرسانات والهياكل المعدنية، 30% للمباني والتشطيبات والسباكة والتكييف، 33% للكهرباء، إلخ).
     - احتساب فوري لسعر البيع المقترح بمجرد كتابة سعر التكلفة وفق معادلة الهامش القياسية `Cost / (1 - Margin/100)` المتطابقة 100% مع عمود الهامش في الجدول.
     - إعادة احتساب لحظية ومباشرة لسعر البيع بمجرد تغيير نسبة الهامش يدوياً، مع إمكانية تعديل سعر البيع مباشرة ليقوم النظام بعكس وحساب نسبة الهامش تلقائياً، مع شريط مؤشر لصافي عائد الوحدة.
  4. **استقرار وتثبيت نافذة استيراد المقايسة ومنع الرعشة (Import Master BOQ Modal Zero-Flicker):**
     - تثبيت أبعاد الحاوية الرأسية للنافذة (`height: 580px`, `maxHeight: 72vh`) لتظل ثابتة بنسبة 100% ولا يتغير ارتفاعها نهائياً مهما اختلف عدد البنود المعروضة أو عند البحث.
     - تحويل محرك البحث والفلترة ليعمل لحظياً في الذاكرة (Instant In-Memory Filter) بدلاً من إرسال طلبات شبكية متكررة مع كل حرف، مما قضى تماماً على إعادة تحميل الجدول أو رعشة الواجهة.
     - تنسيق أزرار التخصصات في سطرين متناسقين مع إضافة أيقونة بحث رسمية وزر مسح سريع.
  5. **التحقق وتوافق الكود البرمجي:**
     - صفر أخطاء TypeScript على الواجهة والباك إند (`npx tsc --noEmit`).
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/components/CreateMasterBoqItemModal.tsx` (`TRADE_PREFIXES`, `DEFAULT_TRADE_MARGINS`, `getNextItemCode`, interactive margin & price reactive handlers).
  - `frontend/src/features/contracting/components/ImportMasterBoqModal.tsx` (Stable fixed height, instant in-memory search filter, zero-flicker UI).
  - `frontend/src/features/contracting/pages/ContractingMasterBoqPage.tsx` (Action bar placement, dynamic existing items & trade pass-through).

---


<!-- migrated:cap-114:end -->

<a id="cap-115"></a>
<!-- migrated:cap-115:start -->
## 83. تصحيح ربط بيانات المقايسة وإضافة إجراءات التعديل والحذف وتنسيق الجدول (Project BOQ Data Mapping & Actions Polish)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Schedule of Values (SOV) Management & Item Lifecycle.
* **المشكلات التي تم حلها جذرياً:**
  1. **القضاء التام على قيم `NaN` وتصحيح ربط الحقول (Zero NaN & CamelCase Mapping):**
     - كان الباك إند في `getBoqItems` و `createBoqItem` و `updateBoqItem` يرجع أسماء أعمدة قاعدة البيانات بصيغة `snake_case` (`unit_price`, `contract_qty`, `revised_qty`, `item_code`) بينما الفرونت إند ينتظر صيغة `camelCase`، مما جعل الحقول غير معرفة وتسبب في ظهور أرقام `NaN` في البطاقات الإحصائية وأعمدة الأسعار والإجماليات.
     - تم تحويل وإرجاع كافة الكائنات المحسوبة بدقة بصيغة `camelCase` من الباك إند، مع إضافة صمام أمان مزدوج ودالة فحص رقمي آمنة `getNum()` في الفرونت إند لمنع ظهور `NaN` نهائياً تحت أي ظرف.
  2. **إضافة عمود الإجراءات وزر حذف وتعديل البند (Item Edit & Delete Actions):**
     - تم إضافة عمود "الإجراءات" بجدول المقايسة يضم زري تعديل وحذف معتمدين بأيقونات النظام الرسمية (`AppIcons.Edit`, `AppIcons.Trash`).
     - تفعيل نافذة تأكيد الحذف الرسمية واستدعاء `contractingApi.deleteBoqItem(id)` مع إشعار نجاح أو فشل وتحديث لحظي للقائمة والبطاقات الإحصائية.
     - تفعيل نافذة تعديل البند وإعادة تحميل البيانات فور الحفظ.
  3. **إعادة هيكلة وتنسيق الجدول وتعرّيب مسميات التخصصات:**
     - تعريب كافة أكواد التخصصات البرمجية (`civil_concrete` ➔ الأعمال المدنية والخرسانات، `hvac_firefighting` ➔ التكييف ومكافحة الحريق، إلخ) مع شارات بصرية مؤسسية أنيقة.
     - ضبط أبعاد وتوزيع أعمدة الجدول بدقة لمنع التداخل أو تآكل النصوص، وإضافة تأثير `hover` ناعم على الصفوف.
* **الملفات المحدثة:**
  - `backend/src/modules/contracting/contracting.service.ts` (`getBoqItems`, `createBoqItem`, `updateBoqItem` camelCase mapping).
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx` (Actions column, edit & delete handlers, safe number parsing, Arabic trade badges, enterprise styling).

---


<!-- migrated:cap-115:end -->

<a id="cap-116"></a>
<!-- migrated:cap-116:start -->
## 84. معمارية المصدر الموحد للنوافذ المنبثقة والقضاء على تكرار الأكواد (Single Source of Truth & Universal BOQ Modal Standard)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** DRY Architecture & Universal Domain Modal Pattern (Rule 11).
* **القدرات التشغيلية:**
  1. **تأسيس القاعدة الرسمية رقم 11 في `GEMINI.md`:**
     - حظر تكرار أو إعادة كتابة نوافذ منبثقة متباينة لنفس الوظيفة، وإلزامية اعتماد المكون الموحد الشامل (`Universal Modal`).
  2. **المكون الشامل الموحد لبنود المقايسة (`UniversalBoqItemModal.tsx`):**
     - تم بناء مكون مركزي موحد يعالج إضافة وتعديل البنود في كل من بنك البنود المرجعي العام (`mode: 'master'`) ومقايسة المشروع الفعلية (`mode: 'project'`).
     - يتضمن نفس بطاقة التسعير التفاعلية الموحدة (سعر التكلفة ⬅️ هامش الربح % المقترح ⬅️ سعر الفئة/البيع المقترح) مع الحساب اللحظي المتبادل.
     - في وضع المشروع (`project`): يدعم حقل الكمية التعاقدية مع حساب فوري لإجمالي قيمة البند، وإجمالي التكلفة، وصافي الربح المتوقع.
     - يتضمن التوليد التلقائي للكود التسلسلي (`MAS-007`, `CIV-009`, إلخ) والهوامش المقترحة للتخصصات.
  3. **إعادة توجيه النوافذ القديمة (`CreateMasterBoqItemModal` & `CreateBoqItemModal`):**
     - تم تحويل كلا المودالين إلى واجهات استدعاء رقيقة (Adapters) تستدعي `UniversalBoqItemModal` بنمطها المناسب، مما يضمن أن أي تعديل مستقبلي ينعكس تلقائياً وفورياً على كافة شاشات المنظومة.
* **الملفات المحدثة:**
  - `d:/zn/GEMINI.md` (إضافة القاعدة 11 الرسمية).
  - `frontend/src/features/contracting/components/UniversalBoqItemModal.tsx` **[NEW]** (المكون الموحد الشامل).
  - `frontend/src/features/contracting/components/CreateMasterBoqItemModal.tsx` **[REFACTORED]** (Adapter إلى المكون الموحد).
  - `frontend/src/features/contracting/components/CreateBoqItemModal.tsx` **[REFACTORED]** (Adapter إلى المكون الموحد).

---


<!-- migrated:cap-116:end -->

<a id="cap-117"></a>
<!-- migrated:cap-117:start -->
## 85. توحيد وضبط أبعاد جدول مقايسة المشروع وهندسة الحقول العددية (Contracting BOQ Table Fixed Layout & Numeric Column Balancing)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Institutional ERP Data Tables / Balanced Fixed Colgroup Standard.
* **المشكلات المعالجة والتطويرات:**
  1. **معالجة تمدد عمود المواصفات وقفل أبعاد الأعمدة (`tableLayout: 'fixed'`):**
     - تم تفعيل التخطيط الثابت `tableLayout: 'fixed'` مع حد أدنى للعرض `minWidth: '1240px'` وتحديد أوزان دقيقة عبر `<colgroup>`، مما منع النصوص الطويلة لبيان الأعمال من التمدد العشوائي على سطر واحد أو التهام مساحات الأعمدة المجاورة.
     - ضبط نص المواصفات ليلتف بنعومة وسلاسة على سطرين أو ثلاثة (`lineHeight: 1.5`, `wordBreak: 'break-word'`, `whiteSpace: 'normal'`).
  2. **تناسق هيدر وأعمدة الجدول (Unified Column Alignment):**
     - محاذاة كافة الأعمدة وهيدراتها بصرامة موحدة (`textAlign: 'center'` لكافة الأعمدة الرقمية، كود البند، الوحدة، الكميات، الأسعار، الإجماليات، نسب الإنجاز، وأزرار الإجراءات)، مما قضى تماماً على التنافر البصري وتداخل النصوص مع الحدود.
  3. **معالجة البنود المستوردة بدون كميات (Zero-Quantity Interactive Helper):**
     - عند استيراد بنود من بنك البنود المرجعي بكمية تعاقدية `0`، تم استبدال الرقم الصامت بزر تفاعلي إرشادي أنيق `0 (حدد الكمية)` مع أيقونة قلم التعديل، يفتح فوراً نافذة تعديل البند لإدخال الكمية المطلوبة للمشروع وحساب القيمة تلقائياً.
     - إضافة بانر توجيهي أنيق أعلى الجدول يوضح للمستخدم كيفية تحديد كميات البنود المستوردة لتحديث إجمالي قيمة المقايسة في البطاقات الإحصائية.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx` (ضبط التنسيق، colgroup، محاذاة الأعمدة، زر الكمية التفاعلي، بطاقات الـ KPI).

---


<!-- migrated:cap-117:end -->

<a id="cap-122"></a>
<!-- migrated:cap-122:start -->
## 90. محرك الاستيراد الذكي الشامل لجداول الكميات والمقايسات (Universal Smart BOQ Excel Import Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Construction Ingestion & AI-Assisted BIM/BOQ Data Interchange Standards.
* **مسارات الكود الأساسية:**
  - الفرونت إند: `frontend/src/features/contracting/utils/boqExcelParser.ts`, `frontend/src/features/contracting/components/ImportBoqModal.tsx`.
  - الاختبارات الآلية: `frontend/src/features/contracting/utils/boqExcelParser.spec.ts` (6 اختبارات مؤتمتة شاملة ناجحة بنسبة 100%).
  - الباك إند: `backend/src/modules/contracting/contracting.service.ts` (`batchCreateBoqItems`), `contracting.controller.ts`.
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **المسح العميق واكتشاف صف الهيدر التلقائي (Deep Matrix Header Scanning):**
     - تم القضاء نهائياً على الافتراض القديم بأن الهيدر دائماً في الصف الأول (Row 1).
     - يقوم المحرك بقراءة الشيت كمصفوفة ثنائية الأبعاد (2D Matrix) وفحص أول 30 صفاً عبر خوارزمية نقاط دلالية (Semantic Scoring) للغتين العربية والإنجليزية، مما يسمح باستيراد ملفات الاستشاريين والمقاولين مهما احتوت من أسطر ديباجة علوية أو شعارات أو بيانات مشروع قبل جدول الكميات الفعلي.
  2. **دعم التسميات ثنائية اللغة وتوليد الأكواد (Bilingual Semantic Column Mapping):**
     - التعرف الذاتي الكامل على كافة المسميات والترجمات الشائعة لأعمدة الجداول:
       - **البيان والمواصفات:** `Description`, `Item Description`, `Particulars`, `Scope of Work`, `Details`, `Specs`, `بيان الأعمال والمواصفات`, `الوصف`, `المواصفات`.
       - **الكميات التعاقدية:** `Qty`, `Quantity`, `Quantities`, `Contract Qty`, `Est Qty`, `الكمية`, `الكميات`, `الكمية التعاقدية`, `العدد`.
       - **أسعار الفئات:** `Rate`, `Unit Rate`, `Unit Price`, `Price`, `فئة`, `سعر الفئة`, `سعر الوحدة`, `فئة التعاقد`.
       - **الوحدات:** `Unit`, `UOM`, `Measurement`, `وحدة`, `الوحدة`, `وحدة القياس`, `التمييز`.
       - **أكواد البنود:** `Item No`, `Item #`, `Code`, `Ref`, `No`, `كود البند`, `رقم البند`, `مسلسل`.
     - في حال عدم وجود عمود للأكواد، يقوم المحرك تلقائياً بتوليد تسلسلي مؤسسي نظيف (`BOQ-001`, `BOQ-002`...).
  3. **تطبيع وترجمة الوحدات الهندسية التلقائي (Engineering Unit Normalization):**
     - تحويل وترجمة وحدات القياس العربية والإنجليزية المتداولة إلى الوحدات المعيارية المعتمدة في قاعدة البيانات:
       - `m3`, `cum`, `cu.m`, `متر مكعب` ➔ `m3` (متر مكعب)
       - `sqm`, `m2`, `متر مربع`, `متر مسطح` ➔ `m2` (متر مسطح)
       - `lm`, `m`, `linear meter`, `متر طولي`, `م.ط` ➔ `m` (متر طولي)
       - `pcs`, `ea`, `each`, `nos`, `عدد`, `حبه`, `قطعة` ➔ `item` (عدد)
       - `ls`, `lump sum`, `job`, `مقطوعية`, `جملة` ➔ `ls` (مقطوعية)
       - `ton`, `طن` ➔ `ton`
       - `kg`, `كجم` ➔ `kg`
  4. **التصنيف الهندسي التلقائي للتخصصات (Trade / Discipline Auto-Classifier):**
     - فحص الكلمات المفتاحية في بيان الأعمال وتصنيف البند آلياً إلى القسم الهندسي المناسب في حال عدم وجود عمود تصنيف:
       - أعمال خرسانة وهيكل إنشائي وحفر (`civil_concrete`)
       - تشطيبات وبياض ودهانات وبلاط وديكور (`architecture_finishes`)
       - صحي وتغذية ومواسير وصرف (`plumbing_sanitary`)
       - كهرباء وإنارة وكابلات وقواطع (`electrical_power`)
       - تكييف ومكافحة حريق ودكتات (`hvac_firefighting`)
---


<!-- migrated:cap-122:end -->

<a id="cap-123"></a>
<!-- migrated:cap-123:start -->
## 85. توحيد وضبط أبعاد جدول مقايسة المشروع وهندسة الحقول العددية (Contracting BOQ Table Fixed Layout & Numeric Column Balancing)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Institutional ERP Data Tables / Balanced Fixed Colgroup Standard.
* **المشكلات المعالجة والتطويرات:**
  1. **معالجة تمدد عمود المواصفات وقفل أبعاد الأعمدة (`tableLayout: 'fixed'`):**
     - تم تفعيل التخطيط الثابت `tableLayout: 'fixed'` مع حد أدنى للعرض `minWidth: '1240px'` وتحديد أوزان دقيقة عبر `<colgroup>`, مما منع النصوص الطويلة لبيان الأعمال من التمدد العشوائي على سطر واحد أو التهام مساحات الأعمدة المجاورة.
     - ضبط نص المواصفات ليلتف بنعومة وسلاسة على سطرين أو ثلاثة (`lineHeight: 1.5`, `wordBreak: 'break-word'`, `whiteSpace: 'normal'`).
  2. **تناسق هيدر وأعمدة الجدول (Unified Column Alignment):**
     - محاذاة كافة الأعمدة وهيدراتها بصرامة موحدة (`textAlign: 'center'` لكافة الأعمدة الرقمية، كود البند، الوحدة، الكميات، الأسعار، الإجماليات، نسب الإنجاز، وأزرار الإجراءات)، مما قضى تماماً على التنافر البصري وتداخل النصوص مع الحدود.
  3. **معالجة البنود المستوردة بدون كميات (Zero-Quantity Interactive Helper):**
     - عند استيراد بنود من بنك البنود المرجعي بكمية تعاقدية `0`، تم استبدال الرقم الصامت بزر تفاعلي إرشادي أنيق `0 (حدد الكمية)` مع أيقونة قلم التعديل، يفتح فوراً نافذة تعديل البند لإدخال الكمية المطلوبة للمشروع وحساب القيمة تلقائياً.
     - إضافة بانر توجيهي أنيق أعلى الجدول يوضح للمستخدم كيفية تحديد كميات البنود المستوردة لتحديث إجمالي قيمة المقايسة في البطاقات الإحصائية.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx` (ضبط التنسيق، colgroup، محاذاة الأعمدة، زر الكمية التفاعلي، بطاقات الـ KPI).

---


<!-- migrated:cap-123:end -->

<a id="cap-124"></a>
<!-- migrated:cap-124:start -->
## 90. محرك الاستيراد الذكي الشامل لجداول الكميات والمقايسات (Universal Smart BOQ Excel Import Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Construction Ingestion & AI-Assisted BIM/BOQ Data Interchange Standards.
* **مسارات الكود الأساسية:**
  - الفرونت إند: `frontend/src/features/contracting/utils/boqExcelParser.ts`, `frontend/src/features/contracting/components/ImportBoqModal.tsx`.
  - الاختبارات الآلية: `frontend/src/features/contracting/utils/boqExcelParser.spec.ts` (6 اختبارات مؤتمتة شاملة ناجحة بنسبة 100%).
  - الباك إند: `backend/src/modules/contracting/contracting.service.ts` (`batchCreateBoqItems`), `contracting.controller.ts`.
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **المسح العميق واكتشاف صف الهيدر التلقائي (Deep Matrix Header Scanning):**
     - تم القضاء نهائياً على الافتراض القديم بأن الهيدر دائماً في الصف الأول (Row 1).
     - يقوم المحرك بقراءة الشيت كمصفوفة ثنائية الأبعاد (2D Matrix) وفحص أول 30 صفاً عبر خوارزمية نقاط دلالية (Semantic Scoring) للغتين العربية والإنجليزية، مما يسمح باستيراد ملفات الاستشاريين والمقاولين مهما احتوت من أسطر ديباجة علوية أو شعارات أو بيانات مشروع قبل جدول الكميات الفعلي.
  2. **دعم التسميات ثنائية اللغة وتوليد الأكواد (Bilingual Semantic Column Mapping):**
     - التعرف الذاتي الكامل على كافة المسميات والترجمات الشائعة لأعمدة الجداول:
       - **البيان والمواصفات:** `Description`, `Item Description`, `Particulars`, `Scope of Work`, `Details`, `Specs`, `بيان الأعمال والمواصفات`, `الوصف`, `المواصفات`.
       - **الكميات التعاقدية:** `Qty`, `Quantity`, `Quantities`, `Contract Qty`, `Est Qty`, `الكمية`, `الكميات`, `الكمية التعاقدية`, `العدد`.
       - **أسعار الفئات:** `Rate`, `Unit Rate`, `Unit Price`, `Price`, `فئة`, `سعر الفئة`, `سعر الوحدة`, `فئة التعاقد`.
       - **الوحدات:** `Unit`, `UOM`, `Measurement`, `وحدة`, `الوحدة`, `وحدة القياس`, `التمييز`.
       - **أكواد البنود:** `Item No`, `Item #`, `Code`, `Ref`, `No`, `كود البند`, `رقم البند`, `مسلسل`.
     - في حال عدم وجود عمود للأكواد، يقوم المحرك تلقائياً بتوليد تسلسلي مؤسسي نظيف (`BOQ-001`, `BOQ-002`...).
  3. **تطبيع وترجمة الوحدات الهندسية التلقائي (Engineering Unit Normalization):**
     - تحويل وترجمة وحدات القياس العربية والإنجليزية المتداولة إلى الوحدات المعيارية المعتمدة في قاعدة البيانات:
       - `m3`, `cum`, `cu.m`, `متر مكعب` ➔ `m3` (متر مكعب)
       - `sqm`, `m2`, `متر مربع`, `متر مسطح` ➔ `m2` (متر مسطح)
       - `lm`, `m`, `linear meter`, `متر طولي`, `م.ط` ➔ `m` (متر طولي)
       - `pcs`, `ea`, `each`, `nos`, `عدد`, `حبه`, `قطعة` ➔ `item` (عدد)
       - `ls`, `lump sum`, `job`, `مقطوعية`, `جملة` ➔ `ls` (مقطوعية)
       - `ton`, `طن` ➔ `ton`
       - `kg`, `كجم` ➔ `kg`
  4. **التصنيف الهندسي التلقائي للتخصصات (Trade / Discipline Auto-Classifier):**
     - فحص الكلمات المفتاحية في بيان الأعمال وتصنيف البند آلياً إلى القسم الهندسي المناسب في حال عدم وجود عمود تصنيف:
       - أعمال خرسانة وهيكل إنشائي وحفر (`civil_concrete`)
       - تشطيبات وبياض ودهانات وبلاط وديكور (`architecture_finishes`)
       - صحي وتغذية ومواسير وصرف (`plumbing_sanitary`)
       - كهرباء وإنارة وكابلات وقواطع (`electrical_power`)
       - تكييف ومكافحة حريق ودكتات (`hvac_firefighting`)
  5. **مرونة بنود المناقصات غير المسعرة (Zero-Blocker Tender Mode):**
     - القضاء التام على مشكلة رفض الاستيراد للمقايسات التي ترد من المالك أو الاستشاري بدون أسعار (`unitPrice = 0` أو `contractQty = 0`).
     - قبول البند واعتباره صالحاً بنسبة 100% وإظهار شارة تحذيرية صفراء أنيقة `غير مسعر (مناقصة)` لتمكين المقاول من استيراد كراسة الشروط وتسعيرها لاحقاً داخل النظام بحرية تامة.
  6. **الفلترة الذكية لصفوف الإجماليات والمجاميع (Grand Total Row Filter):**
     - استبعاد وفلترة صفوف المجاميع والخلاصات نهائياً (مثل "الإجمالي العام", "المجموع", "Total", "Grand Total") تلقائياً لضمان عدم استيرادها كبنود عمل زائفة.
  7. **التعرف على صفحات العمل المتعددة وإمكانية التبديل (Multi-Sheet Inspector):**
     - تقييم أوراق العمل داخل مصنف Excel واختيار الصفحة الأكثر كثافة ومطابقة للمقايسة تلقائياً مع توفير قائمة منسدلة للتبديل بين الصفحات بضغطة زر واحدة.
  8. **تخصيص مطابقة الأعمدة يدوياً (Interactive Column Mapping):**
     - توفير واجهة أكورديون مدمجة تتيح للمستخدم فحص أو تعديل مطابقة أي عمود يدوياً بشكل لحظي للملفات ذات التنسيقات الشاذة، مع إعادة الاستخراج والمعاينة الفورية.
  9. **الفلترة الذكية لعناوين الفصول والأبواب الاستشارية (CSI Division & Section Filter):**
     - الكشف التلقائي عن أسطر عناوين المواصفات (مثل `DIVISION 07...`, `Section 075213...`, `PART...`) التي تخلو من الكميات والأسعار.
     - تزويد نافذة المعاينة بشريط تحكم فوري يتيح استبعاد عناوين الأبواب بضغطة زر (مفعل افتراضياً) لمنع تلويث بنود المقايسة، مع تمييزها بشارة رمادية واضحة `عنوان رئيسي (مستبعد)`.
  10. **الجدولة المحكمة ومنع السكرول الأفقي والالتفاف التلقائي للبنود الطويلة (Zero-Scroll Fixed Layout & Auto Multiline Wrapping):**
      - تطبيق التخطيط المحكم الثابت `tableLayout: 'fixed'` بنسبة 100% داخل نافذة الاستيراد مع إلغاء شريط التمرير الأفقي نهائياً (`overflowX: 'hidden'`).
      - تخصيص أوزان وعروض هندسية دقيقة للأعمدة عبر `<colgroup>`, مع زيادة عرض عمود الحالة إلى `150px` لمنع اقتطاع شارات الحالة، وتوسيع خانة `بيان الأعمال والمواصفات` لتلتف السطور الطويلة تلقائياً على سطرين أو ثلاثة أو أربعة أسطر مع الحفاظ على الضبط المتوازي (`text-align: justify`).
      - ظهور كافة الأعمدة الـ 9 كاملة (م، كود البند، بيان الأعمال والمواصفات، التخصص، الوحدة، الكمية، سعر الفئة، إجمالي القيمة، الحالة) في شاشة واحدة متناسقة بوضوح تام بنسبة 100% دون اقتطاع أو إزاحة خارج حدود النافذة.
  11. **المحرك التلقائي لاتجاه النصوص والمواصفات ثنائية اللغة (Dynamic Bidirectional Text Flow - English LTR / Arabic RTL):**
      - **التعرف الذاتي على لغة النص:** عبر دالة الفحص الدقيق `getTextDirection` و `hasArabicCharacters`, يتم الكشف الفوري عما إذا كان بيان العمل أو مواصفة البند مكتوبة باللغة العربية أو الإنجليزية (أو اللاتينية).
      - **التدفق الطبيعي للنصوص الإنجليزية (Strict LTR for English):**
        - عند كون النص باللغة الإنجليزية، يتم ضبط اتجاه الخلية والعنصر على `dir="ltr"` مع محاذاة السطر الأخير والمفردات لليسار (`textAlignLast: 'left'`) مع تطبيق الضبط المتوازي (`text-align: justify; text-justify: inter-word;`), وتم تصحيح أسبقية CSS في `base.css` لضمان عدم إجبار العناصر على اتجاه RTL بسبب الحاوية الأبوية.
      - **التدفق الطبيعي للنصوص العربية (Strict RTL for Arabic):**
        - عند كون النص باللغة العربية، يتم ضبط اتجاه الخلية على `dir="rtl"` مع محاذاة السطر الأخير لليمين (`textAlignLast: 'right'`).
      - **الشمولية الكاملة لكافة شاشات المقاولات:** تم تعميم المحرك على جدول بنود المقايسة التعاقدية (`ContractingBoqTab.tsx`)، نافذة معاينة الاستيراد (`ImportBoqModal.tsx`)، بنك بنود المقاولات المرجعي (`ContractingMasterBoqPage.tsx`)، عروض أسعار الملاك والطباعة الرسمية (`ClientQuotationModal.tsx`)، نافذة تحليل ربحية البنود (`BoqProfitabilityModal.tsx`)، مستخلصات المقاولين وجداول بنود الدفع (`CreateIpcInvoiceModal.tsx`, `PrintIpcCertificateModal.tsx`)، مدخلات ومواصفات البند الموحد (`UniversalBoqItemModal.tsx`)، ونافذة استيراد البنود المرجعية للمشروع (`ImportMasterBoqModal.tsx`).
  12. **كبسولات التصفية السريعة والفرز البصري للحالات (Interactive Status Filter Tabs):**
      - تزويد نافذة المعاينة (`ImportBoqModal.tsx`) بشريط كبسولات تفاعلي سريع أعلى الجدول يتيح للمهندس فرز وعزل البنود بضغطة زر واحدة:
        - `جميع البنود المدرجة`: عرض كافة البنود الصالحة للاستيراد مع عدادها الإجمالي.
        - `المسعرة والجاهزة`: عزل البنود المكتملة ذات السعر والكمية (`ready`).
        - `غير المسعرة (للتسعير الفوري)`: عزل البنود التي بلا سعر فئة لفحصها أو تسعيرها مباشرة (`unpriced`).
        - `ديباجة وملاحظات عامة`: عرض أسطر الملاحظات والديباجة الاستشارية المستقلة (`preambles`).
        - `عناوين الأبواب (DIVISION)`: عرض الأبواب الاستشارية المستبعدة (`section_headers`).
  13. **استبعاد سطور الملاحظات والديباجة العامة الخالية من الكمية والسعر (Zero-Qty Preamble Filter):**
      - الكشف التلقائي عن أسطر الملاحظات والمواصفات العامة التي لا تحتوي على كميات ولا أسعار ولا وحدات (`isPreamble`).
      - إضافة خيار استبعاد تفاعلي بضغطة زر (`ignorePreambles`) يتيح للمقاول استبعاد نصوص الديباجة الاستشارية الزائدة لتركيز المقايسة حصرياً على بنود الأعمال الحقيقية ونماذج الحصر.
  14. **التعديل والتسعير التفاعلي المباشر داخل جدول المعاينة (Inline Table Editing & Live Pricing):**
      - تحويل جدول المعاينة من مجرد شاشة عرض جامدة إلى ورشة عمل وتجهيز تفاعلية كاملة للمقايسة قبل إدراجها في قاعدة البيانات:
        - **تسعير البنود غير المسعرة لحظياً:** إمكانية كتابة سعر الفئة (`unitPrice`) مباشرة في خانة الإدخال بالخلية؛ وفور إدخال السعر يتحول البند فوراً من `غير مسعر` إلى `جاهز`، وتتحدث القيمة الإجمالية للمقايسة في شريط الـ KPIs فورياً.
        - **تعديل الكميات التعاقدية:** إمكانية تعديل الكمية (`contractQty`) داخل الجدول مباشرة.
        - **تعديل واختيار الوحدات الهندسية:** إتاحة قائمة منسدلة فورية لكل بند لاختيار وحدته وتفادي أي خطأ.
        - **تعديل التخصص الهندسي:** قائمة منسدلة فورية لتعديل التصنيف التخصصي للبند مباشرة من الجدول.
        - **تحديث إجمالي القيمة التلقائي:** يتم حساب `إجمالي القيمة` لكل بند لحظياً فور إدخال أي رقم، مع تحديث إجمالي القيمة التعاقدية الإجمالية في شريط المؤشرات أعلى النافذة.
  15. **إعادة موازنة أوزان الأعمدة وفصل سهم القوائم المنسدلة (Column Rebalancing & Select Arrow Separation):**
      - توسيع عمود `التخصص` من 115px إلى **140px** ليتسع لأطول المسميات الهندسية براحة كاملة (مثل: "تشطيبات ومعماري").
      - إضافة هامش داخلي يساري أمان (`paddingLeft: 18px`) لقائمة التخصص و (`paddingLeft: 14px`) لقائمة الوحدة، لضمان ابتعاد سهم القائمة المنسدلة للمتصفح كلياً عن الحروف العربية ومنع أي تداخل بصري في بيئة الـ RTL.
      - توسيع عمود `الكمية` من 80px إلى **90px**، وعمود `سعر الفئة` من 90px إلى **100px**.
      - تقليص عمود `الحالة` من 145px إلى **105px** بشارات مصغرة متناسقة، مما أتاح استرجاع المساحة لصالح خانات الإدخال والتخصص مع بقاء الجدول ثابتاً بنسبة 100% وخالياً تماماً من شريط التمرير الأفقي.
  16. **تنقية الأرقام من تشوهات الفاصلة العائمة والتعرف على وحدات الأسس العلوية (IEEE 754 Hardening & Superscript Units):**
      - القضاء التام على الكسور العشوائية الممتدة الناتجة عن تمثيل الفاصلة العائمة في جافاسكريبت (مثل ظهور `...999996` أو `...00000003`) عبر تطبيق التقريب الدقيق:
        `Math.round((num + Number.EPSILON) * 10000) / 10000`
        في محرك الاستخراج (`boqExcelParser.ts`) وخانات العرض والإدخال في الواجهة (`ImportBoqModal.tsx`).
      - تحديث دالة التطبيع القياسية للوحدات `normalizeUnit` لدعم الرموز العلوية للتربيع والتكعيب (`m²` و `m³`) كودياً (`\u00B2` و `\u00B3`)، مما جعل كافة بنود شيت المعماري تتعرف تلقائياً كوحدة مسطحة (`م2`) دون السقوط في القيمة الفارغة (`-`).
  17. **التسعير الهندسي الآلي وتخصيص العملة ج.م والاعتماد المباشر (Auto-Pricing Engine with Target Item Picker & Dynamic EGP Currency):**
      - **تخصيص العملة:** تحويل كافة رموز العملة الظاهرة في بطاقات وجدول تفكيك التكلفة داخل محرك التسعير من `ر.س` إلى العملة المعتمدة للمشروع `ج.م`.
      - **قائمة البند المستهدف (Target BOQ Item Selector):** إضافة قائمة اختيار زرقاء تتيح للمستخدم اختيار البند المراد تسعيره مباشرة من بنود المقايسة، مع تحديث الكميات تلقائياً.
      - **زر اعتماد وتطبيق السعر:** إضافة زر كحلي واضح `اعتماد وتطبيق السعر على البند` يقوم فور الضغط عليه بحفظ سعر الفئة والتكلفة التقديرية المحسوبة للبند في قاعدة البيانات وتحديث جدول المقايسة فورياً، مع توفير زر حاسبة سريع (`Calculator Icon`) بجوار كل بند في الجدول للتسعير المباشر.

---


<!-- migrated:cap-124:end -->

<a id="cap-137"></a>
<!-- migrated:cap-137:start -->
## 102. محرك التوليد الزمني الذكي للإنشاءات والمقاولات (Turnkey Construction Schedule Generator & CPM WBS Builder)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات المقاولات (Turnkey Fast-Tracking CPM Schedule Generator, Standard Civil WBS, Dynamic Floor Sequencing & Batch Task Commitment).
* **مسارات الكود الأساسية:**
  - نافذة محرك التوليد الزمني الميداني: `frontend/src/features/contracting/components/ScheduleGeneratorModal.tsx`
  - شاشة وجدول مخطط جانت الزمني: `frontend/src/features/contracting/components/ContractingGanttTab.tsx`
  - جدول سجل المشاريع والمسار الحرج: `frontend/src/features/contracting/components/ContractingProjectsTab.tsx`
  - واجهة برمجة تطبيقات المقاولات: `frontend/src/features/contracting/api/contracting.api.ts`
* **المشكلة التشغيلية المعالجة:**
  - قديماً كان توليد الجدول الزمني يقتصر على توليد 4 أنشطة فرعية سطحية (مباني، علب كهرباء، محارة، واجهات) متجاهلاً تماماً دورة البناء والتشييد الهندسية الواقعية (الحفر، الأساسات، خرسانات الـ SOG، رقاب الأعمدة، الهيكل الخرساني، اختبارات العزل المائي، التأسيسات الصحية، التمديدات، والأرضيات والتشطيب النهائي).
* **الحلول والترقيات الهندسية المنفذة:**
  1. **تحديد نطاق المشروع الإنشائي بدقة (Project Scope Engine):**
     - إضافة محدد النطاق المعتمد عبر `CustomSelect` لثلاثة أنماط تشغيلية:
       1. **مشروع متكامل تسليم مفتاح (Full Turnkey):** حفر وأساسات + هيكل عظم + تشطيبات متكاملة + تسليم ابتدائي.
       2. **هيكل إنشائي وعظم فقط (Concrete Structure):** حفر + أساسات + خرسانات مسلحة + مباني فقط.
       3. **تشطيبات متكاملة فقط (Finishing Only):** تمديدات كهروميكانيكية + بياض محارة + أرضيات + دهانات وتسليم.
  2. **الهيكل التفكيكي الهندسي المتكامل (11 Civil Engineering WBS Phases):**
     - **المرحلة 1 - الأعمال التحضيرية والأرضية (WBS 1.1 - 1.3):** استلام الموقع، الرفع المساحي والميزانية الشبكية، حفر الموقع لعمق التأسيس ونقل المخلفات، وتوريد وفرش طبقات الإحلال مع الدمك واختبارات الكثافة.
     - **المرحلة 2 - خرسانات الأساسات والأرضيات (Substructure & SOG - WBS 2.1 - 2.7):** صب خرسانة عادية (فرشة نظافة)، صب قواعد مسلحة / لبشة، عزل بيتومين عالي الكثافة، صب رقاب الأعمدة، صب السملات وميدات الربط، ردم داخلي مدموك على طبقات، وصب خرسانة أرضية الدور الأرضي (Slab on Grade - SOG) بشبك حديد وفواصل هبوط.
     - **المرحلة 3 - الهيكل الخرساني العلوي بالأدوار (Superstructure - WBS 3.x):** حط أخشاب وحدادة وصب أعمدة وأسقف كافة الأدوار المتكررة المحددة بنظام تسلسلي مع غرف خدمات السطح وسترة الروف مع تمييزها كمسار حرج CPM.
     - **المرحلة 4 - أعمال المباني والقواطيع بالأدوار (WBS 4.x):** بناء قواطيع الطوب المصمت والمفرغ لكل دور مع شنايش وتثبيت كانات الربط.
     - **المرحلة 5 - التأسيسات الكهروميكانيكية (MEP 1st Fix - WBS 5.x):** تمديد خراطيم وعلب وبواطات الكهرباء، شبكات التغذية والصرف الصحي مع اختبار ضغط 48 ساعة معتمد، وتمديد مسارات نحاس التكييف وكابلات التيار الخفيف.
     - **المرحلة 6 - العوازل المائية والحرارية (Waterproofing - WBS 6.1 - 6.2):** عزل مائي كيميائي وبيتوميني للحمامات والمطابخ مع اختبار غمر مائي 48 ساعة، وعزل أسطح فوم وممبرين وميول صرف المطر.
     - **المرحلة 7 - أعمال بياض المحارة واللياسة (Plastering - WBS 7.x):** طرطشة مسمارية وتثبيت شبك فايبر بالزوايا والفواصل، ضبط البؤج والأوتار بميزان القامة، وملو وتدريب وتنعيم البياض الداخلي.
     - **المرحلة 8 - أعمال الأرضيات والكسوات (Tiling & Cladding - WBS 8.1 - 8.2):** توريد وتركيب سيراميك وبورسلين الأرضيات والحوائط، وتركيب رخام السلالم والمداخل مع الجلي والتلميع.
     - **المرحلة 9 - النجارة والحدادة والألوميتال (Joinery & Metal Works - WBS 9.1 - 9.4):** تثبيت حلوق زفرة، تفصيل وتركيب قطاعات ألوميتال وزجاج مزدوج (دبل جلاس)، تفصيل حمايات حديد كريتال ودرابزينات، وتوريد وضبط ضلف الأبواب الخشبية والإكسسوارات.
     - **المرحلة 10 - الأسقف المعلقة والدهانات والواجهات (Finishes & Facades - WBS 10.1 - 10.3):** شاسيهات وألواح جبسوم بورد، دهانات داخلية (سيلر وسكاكين معجون وتشطيب نهائي)، ودهانات الواجهات الخارجية (سيلر ومحارة سافيتو ملونة مقاومة للعوامل الجوية).
     - **المرحلة 11 - التشطيب والتسليم النهائي (Final Handover - WBS 11.1 - 11.3):** تركيب مفاتيح وشاسيهات ووحدات الإنارة واللوحات، تركيب أطقم الحمامات والخلاطات، نظافة الموقع العام وإزالة المخلفات وإصدار محضر التسليم الابتدائي للمالك.
  3. **الحفظ الدفعي السلس ومؤشر الإنجاز (Chunked Async Commitment):**
     - ترحيل الأنشطة والحفظها في مجموعات من 4 مهام على التوازي لمنع أي تعليق في الواجهة أو إجهاد للسيرفر، مع مؤشر رقمي يوضح نسبة اكتمال التثبيت (`تم إنشاء X من إجمالي Y`).
  4. **استقرار جدول المشاريع وتناسق الـ 1280px:**
     - ضبط جدول سجل المشاريع بأزرار إجراءات مدمجة موحدة رأسياً ومحاذاة مركزية للأعمدة لمنع أي كسر أو وميض عند تصفح بيئة عمل المقاولات.

---


<!-- migrated:cap-137:end -->

<a id="cap-140"></a>
<!-- migrated:cap-140:start -->
## 105. منظومة إثبات وقائع التأخير والترحيل الزمني ثلاثي الخيارات للأنشطة الإنشائية (Contracting 3-Way Task Delay & Cascade Shifter)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات المقاولات والجدول ومخطط جانت (Field-Tested CPM Delay Handler, Real-Time Impact Simulation, 3-Option Shifting Engine & Zero-Native Confirm Integration).
* **مسارات الكود الأساسية:**
  - نافذة إدارة التأخير والترحيل الزمني: `frontend/src/features/contracting/components/TaskDelayModal.tsx`
  - جدول ومخطط جانت لمشاريع المقاولات: `frontend/src/features/contracting/components/ContractingGanttTab.tsx`
  - واجهة برمجة تطبيقات المقاولات: `frontend/src/features/contracting/api/contracting.api.ts`
* **المشكلة التشغيلية المعالجة:**
  - عند حدوث تأخير في موقع العمل ناتج عن المالك أو الاستشاري (مثل تأخر صرف مستخلص، تأخر اعتماد عينات أو مخططات، أو أوامر تغيير)، يحتاج المقاول إلى وسيلة سريعة لتسجيل التأخير وترحيل المواعيد بدقة لحماية نفسه تعاقدياً دون إفساد الجدول الزمني أو الاضطرار لحساب تواريخ عشرات الأنشطة يدوياً.
* **الحلول والترقيات الهندسية المنفذة:**
  1. **الخيارات الثلاثة المعيارية لترحيل الجدول الزمني (The Contractor's 3-Way Choice):**
     - **الخيار 1 (ترحيل البند الحالي فقط - Current Task Only):** مد تاريخ نهاية النشاط المحدد فقط بالمدة المطلوبة مع الحفاظ على مواعيد كافة الأنشطة الأخرى دون مساس (لحالات تعويض التأخير داخلياً بزيادة ورديات العمل أو الأنشطة ذات الفائض الزمني).
     - **الخيار 2 (ترحيل البند الحالي وبنود محددة معه - Selected Dependent Tasks):** قائمة سريعة متجاوبة تتيح للمهندس تحديد أنشطة معينة فقط متأثرة مباشرة بالتأخير لترحيلها بنفس المدة دون المساس ببقية أعمال المبنى المستقلة.
     - **الخيار 3 (ترحيل شامل لكافة الأنشطة اللاحقة - All Subsequent Tasks):** تزحيف آلي متسلسل لجميع الأنشطة التي تلي هذا النشاط حتى نهاية المشروع، مع تمديد تاريخ تسليم المشروع النهائي تلقائياً وتحديث مخطط جانت.
  2. **توثيق وقائع التأخير تعاقدياً (Contractual Delay Documentation):**
     - قائمة أسباب معيارية مطابقة لممارسات عقود الفيديك FIDIC (تأخر اعتماد استشاري، تأخر دفعات، أوامر تغيير، تأخر توريدات عميل، ظروف جوية قاهرة، تراخيص) مع حقل للملاحظات وتدوين تلقائي في سجل وملاحظات النشاط.
  3. **أزرار الأيام السريعة والمعاينة اللحظية للأثر الزمني (Live Impact Simulation):**
     - أزرار يومية سريعة (+1، +2، +3، +5، +7، +14، +30 يوماً).
     - بطاقات مقارنة فورية لتواريخ الانتهاء قبل وبعد، عدد الأنشطة التي ستتأثر، وتاريخ التسليم النهائي للمشروع.
  4. **الحفظ الدفعي وترقية رسائل التأكيد المؤسسية (Zero Native Confirm Standard):**
     - حفظ التحديثات في دفعات خفيفة مع عداد رقمي لنسبة الإنجاز.
     - تطهير زر حذف المهام في جدول جانت من `window.confirm` التقليدية واستبدالها بنظام `await systemConfirm(...)` المعتمد.

---


<!-- migrated:cap-140:end -->

<a id="cap-145"></a>
<!-- migrated:cap-145:start -->
## 110. تعميم المعيار القياسي للنوافذ المنبثقة المتناظرة رباعية الأعمدة وحظر السكرول على موديول المقاولات (Symmetric 4-Column Zero-Scroll Modal Standard for Contracting)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل عبر كافة نوافذ موديول المقاولات والإنشاءات.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/components/CreateProjectModal.tsx`: تأسيس مشروع وعقد مقاولة جديد.
  - `frontend/src/features/contracting/components/UniversalBoqItemModal.tsx`: إضافة وتعديل بنود المقايسة وبنك البنود المرجعي.
  - `frontend/src/features/contracting/components/CreateChangeOrderModal.tsx`: إصدار أوامر التغيير والملاحق التعاقدية.
  - `frontend/src/features/contracting/components/CreateSubcontractModal.tsx`: إسناد الأعمال وتوثيق عقود مقاولي الباطن.
  - `frontend/src/features/contracting/components/CreateMaterialRequisitionModal.tsx`: أذون صرف وتخصيص المواد والخامات للموقع.
  - `frontend/src/features/contracting/components/CreateDailyLogModal.tsx`: تقارير الموقع ويوميات التنفيذ الميدانية.
  - `frontend/src/features/contracting/components/CreateRfiModal.tsx`: طلبات الاستفسار الهندسي الميداني (RFI).
* **المعايير الهندسية والترقيات المنفذة:**
  1. **الشبكة المتناظرة الصارمة ذات الأعمدة الأربعة (Exact 4-Column Grid Standard):**
     - إعادة هيكلة كافة الحقول والمدخلات لتعتمد حصرياً على `gridTemplateColumns: 'repeat(4, 1fr)'` بهوامش بينية متسقة `gap: 10px`.
     - توحيد ومحاذاة كافة الحقول رأسياً في أسطر منتظمة دون أي تفاوت أو اعوجاج بصري في العرض.
  2. **حظر أشرطة التمرير الرأسية تماماً (Universal Zero-Scroll Standard):**
     - ضبط `minHeight="auto"` وعرض مريح متزن `width="min(920px, 95vw)"` لمنع حدوث أي سكرول رأسي وفتح النافذة بكامل محتواها بوضوح في شاشة واحدة.
     - ضبط ارتفاع الحقول والكومبوبوكس على `30px`، والخط الداخلي `0.8125rem`، وتسميات الحقول `0.72rem` بوزن خط مؤسسي `600`.
  3. **التطهير الشامل من عناصر `<select>` التقليدية البدائية (Rule 13 Compliance):**
     - استبدال كافة عناصر الـ HTML `<select>` التقليدية بمكون الكومبوبوكس القياسي الموحد `CustomSelect` من `@/shared/ui/custom-select`.
     - دعم البحث والتصفية الفورية وتطبيع الحروف العربية في القوائم الكبيرة (مقاول الباطن من سجل الموردين، بنود المقايسة، التخصصات الإنشائية).
  4. **كارت التسعير التلقائي المضغوط وشريط المؤشرات اللحظية:**
     - ضغط كارت التسعير الموحد في نافذة بنود المقايسة `UniversalBoqItemModal` ليظهر في 3 أعمدة متناسقة بارتفاع مدمج وعرض مؤشرات الربحية ونسبة الهامش الفعلي ومجموع قيمة البند لحظياً.
  5. **معالجة تفعيل القوائم المنسدلة العرضي عند النقر فوق الحقول (Accidental Label-Click Trigger Fix):**
     - ترقية مكون الحقول الموحد `Field.tsx` بتحويل حاويته من عنصر `<label>` إلى عنصر `<div>` محايد، مما منع نقل المتصفح للتركيز التلقائي عند النقر على عنوان الحقل أو الفراغات المحيطة به، وحصر فتح القوائم المنسدلة `CustomSelect` حصرياً عند النقر المباشر داخل صندوق الإدخال أو سهم القائمة.

---


<!-- migrated:cap-145:end -->

<a id="cap-151"></a>
<!-- migrated:cap-151:start -->
## 110. تعميم المعيار القياسي للنوافذ المنبثقة المتناظرة رباعية الأعمدة وحظر السكرول على موديول المقاولات (Symmetric 4-Column Zero-Scroll Modal Standard for Contracting)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل عبر كافة نوافذ موديول المقاولات والإنشاءات.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/components/CreateProjectModal.tsx`: تأسيس مشروع وعقد مقاولة جديد.
  - `frontend/src/features/contracting/components/UniversalBoqItemModal.tsx`: إضافة وتعديل بنود المقايسة وبنك البنود المرجعي.
  - `frontend/src/features/contracting/components/CreateChangeOrderModal.tsx`: إصدار أوامر التغيير والملاحق التعاقدية.
  - `frontend/src/features/contracting/components/CreateSubcontractModal.tsx`: إسناد الأعمال وتوثيق عقود مقاولي الباطن.
  - `frontend/src/features/contracting/components/CreateMaterialRequisitionModal.tsx`: أذون صرف وتخصيص المواد والخامات للموقع.
  - `frontend/src/features/contracting/components/CreateDailyLogModal.tsx`: تقارير الموقع ويوميات التنفيذ الميدانية.
  - `frontend/src/features/contracting/components/CreateRfiModal.tsx`: طلبات الاستفسار الهندسي الميداني (RFI).
* **المعايير الهندسية والترقيات المنفذة:**
  1. **الشبكة المتناظرة الصارمة ذات الأعمدة الأربعة (Exact 4-Column Grid Standard):**
     - إعادة هيكلة كافة الحقول والمدخلات لتعتمد حصرياً على `gridTemplateColumns: 'repeat(4, 1fr)'` بهوامش بينية متسقة `gap: 10px`.
     - توحيد ومحاذاة كافة الحقول رأسياً في أسطر منتظمة دون أي تفاوت أو اعوجاج بصري في العرض.
  2. **حظر أشرطة التمرير الرأسية تماماً (Universal Zero-Scroll Standard):**
     - ضبط `minHeight="auto"` وعرض مريح متزن `width="min(920px, 95vw)"` لمنع حدوث أي سكرول رأسي وفتح النافذة بكامل محتواها بوضوح في شاشة واحدة.
     - ضبط ارتفاع الحقول والكومبوبوكس على `30px`، والخط الداخلي `0.8125rem`، وتسميات الحقول `0.72rem` بوزن خط مؤسسي `600`.
  3. **التطهير الشامل من عناصر `<select>` التقليدية البدائية (Rule 13 Compliance):**
     - استبدال عناصر الـ HTML `<select>` التقليدية بمكون الكومبوبوكس القياسي الموحد `CustomSelect` من `@/shared/ui/custom-select`.
     - دعم البحث والتصفية الفورية وتطبيع الحروف العربية في القوائم الكبيرة (مقاول الباطن من سجل الموردين، بنود المقايسة، التخصصات الإنشائية).
  4. **كارت التسعير التلقائي المضغوط وشريط المؤشرات اللحظية:**
     - ضغط كارت التسعير الموحد في نافذة بنود المقايسة `UniversalBoqItemModal` ليظهر في 3 أعمدة متناسقة بارتفاع مدمج وعرض مؤشرات الربحية ونسبة الهامش الفعلي ومجموع قيمة البند لحظياً.
  5. **معالجة تفعيل القوائم المنسدلة العرضي عند النقر فوق الحقول (Accidental Label-Click Trigger Fix):**
     - ترقية مكون الحقول الموحد `Field.tsx` بتحويل حاويته من عنصر `<label>` إلى عنصر `<div>` محايد، مما منع نقل المتصفح للتركيز التلقائي عند النقر على عنوان الحقل أو الفراغات المحيطة به، وحصر فتح القوائم المنسدلة `CustomSelect` حصرياً عند النقر المباشر داخل صندوق الإدخال أو سهم القائمة.

---


<!-- migrated:cap-151:end -->

<a id="cap-165"></a>
<!-- migrated:cap-165:start -->
## 140. التوسيع الشامل لبنك بنود المقاولات المرجعي لـ 124 بنداً وتسعير واقعي لعام 2026 وتطوير واجهة الاستيراد (Comprehensive Master BOQ Library Expansion to 124 Items & 2026 Market Pricing)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready - 124 Discrete Contracting Items)
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000094_contracting_master_boq_comprehensive_expansion.ts`:
    1. ترحيل وإضافة 62 بنداً تشغيلياً جديداً لبنك المقاولات المرجعي (`contracting_master_boq_library`) ليرتفع الإجمالي من 62 إلى **124 بنداً هندسياً قياسياً** معتمدين بنظام Idempotent (`ON CONFLICT DO UPDATE`).
    2. تغطية شاملة لكافة تخصصات ومراحل التنفيذ الهندسي المتكاملة:
       - **تجهيزات الموقع والأعمال التمهيدية (`site_mobilization`):** سياج صاج مضلع، كرفانات مجهزة، تغذية مرافق مؤقتة، نزح مياه جوفية، هدم مباني، وأعمال رفع مساحي بـ Total Station.
       - **الأعمال المدنية والخرسانات (`civil_concrete`):** خرسانة أرضيات هليكوبتر SOG، سملات وميدات، حوائط ساندة Retaining Walls، قلبات سلالم، خزانات مياه معالجة بسيكا، خوازيق Secant/CFA، جسات تربة، واختبارات مكعبات معملية.
       - **المباني والعزل والفواصل (`masonry_insulation`):** مدماك القد وتأكيس المحاور، أعتاب خرسانية مسلحة، كانات وشبك تمدد، عزل أسمنتي بوليمري، أشرطة Waterstop، خرسانة فوم ميول، صوف صخري، ومعالجة فواصل بسيلنت PU.
       - **الأعمال الكهربائية والتيار الخفيف (`electrical`):** تأسيس خراطيم بالأسقف الخرسانية، تأسيس تكسير الحوائط وعلب ماجيك، سحب أسلاك السويدي، حوامل كابلات Cable Trays، تشطيب وشوش وبرايز شنايدر/فينوس، شبكات تأريض وصواعق، ليد بروفايل، كابلات مسلحة 4x35، ومولد ديزل 50KVA مع ATS.
       - **الأعمال الصحية والسباكة (`plumbing`):** تأسيس شبكات تغذية PPR مضغوطة 15 بار، صرف معلق ومزاريب مطر PVC، صرف أرضي وسيفونات وجاليتراب، خزانات فايبر GRP 5000L، سخانات شمسية 300L، محطات معالجة وسوفتنر، وطلمبات غاطس رفع مياه البدروم.
       - **التكييف والتهوية ومكافحة الحريق (`hvac_firefighting`):** تأسيس شيلات ومواسير نحاس معزولة، شفاطات سحب دخان Jet Fans، صمامات ZCV، محطة طلمبات حريق UL/FM 500 GPM، وعساكر حريق ووصلات سيامي.
       - **أعمال التشطيبات والديكور والدهانات (`finishes`):** أرضيات إيبوكسي ذاتي الاستواء، باركيه HDF ألماني، بديل خشب ورخام PVC/WPC، رخام ميكانيكي بالكانات، واجهات وتجاليد GRC، أرضيات مرتفعة Raised Floor، وتجاليد سمنت بورد.
       - **الأبواب والشبابيك والواجهات (`doors_windows_facades`):** حلوق زفرة موسكي، أبواب طوارئ Panic Bar 120 دقيقة، قطاعات UPVC دبل عازل، شتر جراجات أوتوماتيك، درابزين استانلس وزجاج سيكوريت، مظلات سيارات PVC كوري، ومصاعد ركاب 6 أفراد كاملة.
       - **الموقع العام والبنية التحتية واللاندسكيب (`landscape_infrastructure`):** نجيل طبيعي باسبالم، نخيل زينة، أعمدة إنارة ديكورية LED، تخطيط طرق ثيرموبلاستيك، ومطبات ومصدات عجل مطاطية.
    3. اعتماد أسعار واقعية حقيقية لعام 2026 (سعر تكلفة وسعر بيع استرشادي متزن) لكل بند بالوحدة الهندسية الدقيقة.
  - `frontend/src/features/contracting/components/ImportMasterBoqModal.tsx`, `ImportMasterBoqExcelModal.tsx`, و `ContractingMasterBoqPage.tsx`:
    1. توسيع عرض النافذة المنبثقة للاستيراد إلى `min(1200px, 96vw)` مع توزيع نسبي محكم للأعمدة عبر `<colgroup>` (`width: 38px, 85px, auto, 130px, 60px, 100px, 100px`).
    2. استبدال مسمى "سعر البيع المقترح" إلى "سعر البيع" لتوفير مساحة عرض متزنة والقضاء تماماً على أي سكرول أفقي داخل الجدول.
    3. **بناء محرك ومودال استيراد Excel لبنك البنود (`ImportMasterBoqExcelModal.tsx`):** رفع شيتات إكسيل وCSV مع تنزيل قالب استرشادي جاهز ومعاينة حية ذكية للبنود قبل الحفظ مع استيراد جماعي فوري بـ `bulkImportMasterBoqItems`.
---


<!-- migrated:cap-165:end -->

<a id="cap-166"></a>
<!-- migrated:cap-166:start -->
## 141. بيئة عمل دراسة وتسعير العطاءات والمشروعات المحتملة ومحرك تفكيك الكود الهندسي القياسي (Tender & Pre-Award Estimator with Standard Engineering BOM Exploder)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready - Pre-Award Engineering Workspace)
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000095_expand_engineering_constants_library.ts`:
    1. ترحيل وتوسيع قاعدة الثوابت والمعادلات الهندسية القياسية (`contracting_engineering_constants`) لتغطية كافة بنود البناء والتشييد وفق الكود المصري والعالمي (Egyptian & International Building Codes).
    2. تفكيك كل بند هندسي إلى مكوناته التفصيلية ومعدلات استهلاكه المعيارية (BOM):
       - **مباني طوب أحمر طفلي 12 سم (`BRK-RED-12`):** 55 طوبة طفلي + 0.02 م³ رمل + 0.01 طن أسمنت + مصنعية بنا ومساعد لكل 1 م².
       - **مباني طوب أسمنتي مصمت 25 سم (`BRK-SOL-25`):** 450 طوبة أسمنتي مصمت + 0.2 م³ رمل + 0.065 طن أسمنت + مصنعية لكل 1 م³.
       - **مباني طوب أسمنتي مفرغ 20 سم (`BRK-HLL-20`):** 12.5 طوبة مفرغة + 0.04 م³ رمل + 0.015 طن أسمنت + مصنعية لكل 1 م².
       - **خرسانة عادية للأساسات C20 (`CONC-PLN-C20`):** 0.8 م³ زلط/سن + 0.4 م³ رمل + 0.25 طن أسمنت (5 شكاير) + مصنعية صب لكل 1 م³.
       - **خرسانة مسلحة للقواعد C30 (`CONC-FTG-C30`):** 0.8 م³ سن + 0.4 م³ رمل + 0.35 طن أسمنت (7 شكاير) + 85 كجم حديد تسليح لكل 1 م³.
       - **خرسانة مسلحة للأعمدة C35 (`CONC-COL-C35`):** 0.8 م³ سن فينو + 0.4 م³ رمل + 0.4 طن أسمنت (8 شكاير) + 140 كجم حديد تسليح لكل 1 م³.
       - **خرسانة مسلحة للأسقف C30 (`CONC-SLB-C30`):** 0.8 م³ سن + 0.4 م³ رمل + 0.35 طن أسمنت + 110 كجم حديد تسليح لكل 1 م³.
       - **بياض ومحارة داخلية وخارجية ودراي ميكس (`PLAS-INT-01`, `PLAS-EXT-02`):** رمل ناعم، أسمنت، سلك شبك، زوايا فلزية، ودراي ميكس ملون.
       - **سيراميك أرضيات وحوائط وبورسلين كبير (`TILE-FLR-CER`, `TILE-WAL-CER`, `TILE-PORC-60`):** بلاط، رمل فرشة، أسمنت أسود، مادة لاصقة، وروبة سقية أسمنت أبيض.
       - **دهانات داخلية بلاستيك 3 أوجه (`PAINT-INT-03`):** سيلر مائي، 3 سكاكين معجون، ودهان بلاستيك نصف لمعة.
       - **عزل رطوبة وحرارة للأسطح والحمامات (`ISO-WTR-BIT`, `ISO-CHM-WET`):** ممبرين 4 مم، برايمر بيتوميني، فوم XPS عازل حراري، ومركب أسمنتي بوليمري مرن.
       - **حفر وردم وإحلال بطبقات سن ودك (`EXCAV-SOIL`, `BACKFILL-CMP`):** حفارات، لوادر، نقل مقطورات، سن متدرج، وهراس واختبار بروكتور.
       - **تأسيس سباكة وكهرباء وجبسوم بورد (`PLUMB-POINT`, `ELEC-POINT`, `GYPS-CEIL-01`):** مواسير PPR، محابس، كابلات نحاس السويدي، خراطيم بيتفين، وألواح جبسوم بورد خضراء مقاومة للرطوبة.
  - `backend/src/modules/contracting/contracting.service.ts`:
    - تحديث دالة `seedDefaultEngineeringConstants` لغرس الثوابت القياسية لجميع الشركات والمستأجرين تلقائياً.
  - `frontend/src/features/contracting/components/TenderEstimatorModal.tsx`:
    1. **بيئة عمل تسعير العطاءات والمشروعات المحتملة (Pre-Award Tender Estimator):** دراسة المشروع من "الصفر" قبل توقيع العقد أو التنفيذ الميداني.
    2. **نمطان مرنان لإدخال البنود:**
       - استيراد وسحب البنود من بنك المقايسات المرجعي (124 بنداً).
       - حاسبة الحصر السريع من واقع أبعاد اللوحات والمخططات المعمارية والإنشائية (طول × عرض × ارتفاع / مسطحات × عدد مع خصومات الفتحات) لحساب الكميات الصافية فورياً.
    3. **التفكيك التفاعلي اللحظي للكود الهندسي (Live BOM Exploder & Custom Rate Engine):**
       - لوحة تفكيك تفاعلية قابلة للفتح والطي تحت كل بند تعرض إجمالي كمية كل مادة أولية مطلوبة (كم طوبة، كم طن أسمنت، كم م³ رمل وزلط، كم طن حديد، كم لتر دهان، كم يومية مصنعية).
       - **التحرير والتعديل المباشر للمعدلات والأسعار:** إمكانية تعديل معدل استهلاك أي خامة (`qtyPerUnit`) وسعر الوحدة (`unitRate`) مباشرة من داخل لوحة تفكيك الكود لضبط نسب حديد التسليح أو شكاير الأسمنت أو أسعار الخامات والمصنعيات وفق واقع المشروع الميداني مع إعادة حساب التكلفة والربح فورياً.
    4. **محرك تخصيص أبعاد ومقاسات الطوب والبلوك (Dynamic Brick & Block Dimensions Engine):**
       - مكتبة مقاسات قياسية مدمجة:
         * طوب أحمر طفلي نمطي مصري (25 × 12 × 6 سم) ➔ 55 طوبة/م².
         * طوب أحمر طفلي سوقي (24 × 11 × 6 سم) ➔ 57.5 طوبة/م².
         * طوب أحمر طفلي دوبل (25 × 12 × 13 سم) ➔ 27.5 طوبة/م².
         * طوب أسمنتي مصمت (25 × 12 × 6 سم) ➔ 450 طوبة/م³.
         * بلوك أسمنتي مفرغ خليجي/واجهات (40 × 20 × 20 سم) ➔ 12.5 بلوكة/م².
         * بلوك أسمنتي قواطع (40 × 15 × 20 سم و 40 × 10 × 20 سم) ➔ 12.5 بلوكة/م².
         * طوب خرساني خفيف عازل سيبوريكس / AAC (60 × 20 × 20 سم) ➔ 8.33 بلوكة/م².
         * مقاس مخصص يدوي (Custom Dimensions): إدخال الطول، العرض، الارتفاع، وسماكة عرموس المونة لحساب عدد الطوب واستهلاك الرمل والأسمنت آلياً وفق المعادلة الهندسية.
    5. **ملخص خطة التوريدات والمشتريات الشامل للعطاء (Consolidated Pre-Procurement MRP):** تجميع فوري لإجمالي كافة المواد والموارد المطلوبة للمشروع بالكامل مع إجمالي التكلفة وقيمة العطاء وصافي الربح ونسبته.
    6. **الاعتماد والترسية الفورية بنقرة زر واحدة (One-Click Award):** إنشاء المشروع التعاقدي، زرع بنود المقايسة، وتوليد شيتات الحصر وخطة الاحتياجات تلقائياً.
  - `frontend/src/features/contracting/pages/ContractingTenderPage.tsx` & `frontend/src/features/contracting/components/ImportBoqModal.tsx`:
    - **محرك استيراد مقايسة العطاء من Excel (BOQ Import):** إضافة زر مباشر لاستيراد مقايسة العطاء غير المسعرة المسلّمة من المالك أو الاستشاري، والتعرف التلقائي على الأعمدة والكميات والوحدات وتفريغها في جدول التسعير والتفكيك الهندسي فوراً، ودعم النمط المزدوج لمودال الاستيراد الموحد (In-Memory لدراسة العطاء، وBatch DB للمشروع التعاقدي).
  - `frontend/src/features/contracting/pages/ContractingLayout.tsx`:
    - زر «دراسة وتسعير عطاء جديد» في هيدر الموديول الموحد.
  - `frontend/src/features/contracting/components/ContractingProjectsTab.tsx`:
    - زر «دراسة وتسعير عطاء جديد» في هيدر وجدول المشاريع.
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx`:
    - زر «تفكيك الكود الهندسي وتسعير العطاءات (BOM)» في شريط أدوات المقايسة.
* **فحص الجودة والسلامة البرمجية:**
  - الالتزام الصارم بدستور واجهات المستخدم (RTL، Zero Emojis، StandardDialog، وتوافق الشاشات من 14 إلى 32 بوصة).

---


<!-- migrated:cap-166:end -->

<a id="cap-167"></a>
<!-- migrated:cap-167:start -->
## 142. مسار إدارة المشاريع الإنشائية الموحد والموجه الذكي للخطوة التالية (The 7-Phase Construction Lifecycle Engine & Smart Next Action Guide)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready - Global Tier-1 Construction Lifecycle Benchmark)
* **معيار المقارنة الدولي:** Procore Project Workflow / Oracle Primavera & Unifier Lifecycle / Autodesk Build Stage Gate Pipeline.
* **المسارات في الكود:**
  - `frontend/src/features/contracting/components/ProjectLifecycleStepper.tsx`:
    1. **مسار المراحل السبع المتسلسلة (7-Phase Workflow Pipeline):** شريط تفاعلي مرقم من 1 إلى 7 في قمة بيئة العمل يوضح للمقاول مسار المشروع من اللحظة صفر وحتى التسليم:
       - **المرحلة 1:** دراسة وتسعير العطاء (حصر CAD وتفكيك الأسعار BOM).
       - **المرحلة 2:** المقايسة والميزانية (بنود التعاقد SOV وتجميد ميزانية التكلفة Baseline).
       - **المرحلة 3:** التجهيز والجدول الزمني (التراخيص الحكومية ومخطط جانت الإنشائي).
       - **المرحلة 4:** التوريد ومقاولو الباطن (طلبات الشراء MRP وعقود الباطن).
       - **المرحلة 5:** الميدان وضبط الجودة (اليوميات الميدانية واستلام الأعمال WIR واستفسارات RFI).
       - **المرحلة 6:** المستخلصات والمالية (مستخلصات AIA G702/G703 وأوامر التغيير وسجل الضمان).
       - **المرحلة 7:** التسليم والإغلاق (فحص العيوب Snag List ومحاضر الاستلام الابتدائي والنهائي).
    2. زر وصول سريع إلى سجل ومؤشرات محفظة كافة المشاريع الإنشائية.
  - `frontend/src/features/contracting/components/SmartNextActionGuide.tsx`:
    - **بطاقة الموجه الذكي للخطوة التالية:** توجيه فوري للمقاول بلغة عربية مبسطة تشرح له ما المطلوب إنجازه في المرحلة الحالية بدقة، مع أزرار إجراء مباشر تفتح النوافذ والنماذج المتخصصة بنقرة واحدة (Zero Confusion).
  - `frontend/src/features/contracting/pages/ContractingCloseoutPage.tsx`:
    - **بيئة عمل متخصصة للمرحلة السابعة (Closeout & Handover):**
      - متابعة جولات فحص العيوب وقائمة الملاحظات المشتركة (`SnagListModal`).
      - تحرير واعتماد محاضر الاستلام والتسليم الابتدائي والنهائي للمشروع (`ProjectHandoverModal`).
      - تحليل الأرباح والخسائر الختامي وتصفية حسابات المشروع (`BoqProfitabilityModal`).
      - متابعة إفراجات ضمان حسن التنفيذ المحتجز (`RetentionLedgerModal`).
      - خريطة تفاعلية لبروتوكول التسليم طبقاً لمواصفات الفيديك (FIDIC Handover Protocol).
  - `frontend/src/features/contracting/pages/ContractingLayout.tsx`:
    - ربط المسار المتسلسل والموجه الذكي وحفظ كاش التابات في الذاكرة (Keep-Alive 0ms) مع تكامل كافة النوافذ المنبثقة الـ 39.
  - `frontend/src/features/contracting/routes.tsx`:
    - تحديث المسارات الملاحية السريعة لدعم الملاحة السلسة للمراحل السبع.
* **فحص الجودة والسلامة البرمجية:**
  - الالتزام التام بدستور واجهات المستخدم (RTL، 0 Emojis، معيار الحاوية 1280px، وتوافق الشاشات من 14 إلى 32 بوصة بدون سكرول خارجي).

---


<!-- migrated:cap-167:end -->

<a id="cap-171"></a>
<!-- migrated:cap-171:start -->
## 145. محرك استخراج وتحليل مقايسات المشروعات والعطاءات من ملفات الـ PDF (Native PDF BOQ & SOV Ingestion Engine)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready)
* **المسارات في الكود:**
  - `frontend/src/features/contracting/utils/boqPdfParser.ts`: محرك التحليل الهندسي لاستخراج الجداول من ملفات الـ PDF مع التجميع المكاني وتصحيح الحروف العربية وتجميع البنود متعددة الأسطر.
  - `frontend/src/features/contracting/utils/boqPdfParser.spec.ts`: حزمة الاختبارات الشاملة (7 من 7 اختبارات ناجحة 100%).
  - `frontend/src/features/contracting/components/ImportBoqModal.tsx`: النافذة الموحدة لاستيراد المقايسات مع دعم `.xlsx, .xls, .csv, .pdf`.
  - `frontend/src/features/contracting/utils/boqExcelParser.ts`: دوال المطابقة الدلالية للأعمدة وتصنيف الأنشطة الهندسية والتطبيع العددي للفواصل.
* **القدرات والوظائف المعتمدة:**
  1. **الاستخراج المحلي الفوري بدون ذكاء اصطناعي (100% Native & In-Browser):**
     - معالجة سريعة بأجزاء من الثانية داخل المتصفح أو بيئة العمل بدون إرسال بيانات العطاءات إلى أي خوادم خارجية أو تكبد تكاليف API.
  2. **التقسيم المكاني ثنائي الاتجاه للأعمدة (Dynamic RTL & LTR Slicing):**
     - التعرف التلقائي على اتجاه الجدول، وتحديد إحداثيات أعمدة (رقم البند، بيان الأعمال والمواصفات، الوحدة، الكمية، الفئة، الإجمالي) بدقة متناهية سواء كان الجدول عربياً (RTL) أو إنجليزياً (LTR).
  3. **تجميع المواصفات والبنود متعددة الأسطر (Multi-line Description Stitching):**
       - استيراد وسحب البنود من بنك المقايسات المرجعي (124 بنداً).
       - حاسبة الحصر السريع من واقع أبعاد اللوحات والمخططات المعمارية والإنشائية (طول × عرض × ارتفاع / مسطحات × عدد مع خصومات الفتحات) لحساب الكميات الصافية فورياً.
    3. **التفكيك التفاعلي اللحظي للكود الهندسي (Live BOM Exploder & Custom Rate Engine):**
       - لوحة تفكيك تفاعلية قابلة للفتح والطي تحت كل بند تعرض إجمالي كمية كل مادة أولية مطلوبة (كم طوبة، كم طن أسمنت، كم م³ رمل وزلط، كم طن حديد، كم لتر دهان، كم يومية مصنعية).
       - **التحرير والتعديل المباشر للمعدلات والأسعار:** إمكانية تعديل معدل استهلاك أي خامة (`qtyPerUnit`) وسعر الوحدة (`unitRate`) مباشرة من داخل لوحة تفكيك الكود لضبط نسب حديد التسليح أو شكاير الأسمنت أو أسعار الخامات والمصنعيات وفق واقع المشروع الميداني مع إعادة حساب التكلفة والربح فورياً.
    4. **محرك تخصيص أبعاد ومقاسات الطوب والبلوك (Dynamic Brick & Block Dimensions Engine):**
       - مكتبة مقاسات قياسية مدمجة:
         * طوب أحمر طفلي نمطي مصري (25 × 12 × 6 سم) ➔ 55 طوبة/م².
         * طوب أحمر طفلي سوقي (24 × 11 × 6 سم) ➔ 57.5 طوبة/م².
         * طوب أحمر طفلي دوبل (25 × 12 × 13 سم) ➔ 27.5 طوبة/م².
         * طوب أسمنتي مصمت (25 × 12 × 6 سم) ➔ 450 طوبة/م³.
         * بلوك أسمنتي مفرغ خليجي/واجهات (40 × 20 × 20 سم) ➔ 12.5 بلوكة/م².
         * بلوك أسمنتي قواطع (40 × 15 × 20 سم و 40 × 10 × 20 سم) ➔ 12.5 بلوكة/م².
         * طوب خرساني خفيف عازل سيبوريكس / AAC (60 × 20 × 20 سم) ➔ 8.33 بلوكة/م².
         * مقاس مخصص يدوي (Custom Dimensions): إدخال الطول، العرض، الارتفاع، وسماكة عرموس المونة لحساب عدد الطوب واستهلاك الرمل والأسمنت آلياً وفق المعادلة الهندسية.
    5. **ملخص خطة التوريدات والمشتريات الشامل للعطاء (Consolidated Pre-Procurement MRP):** تجميع فوري لإجمالي كافة المواد والموارد المطلوبة للمشروع بالكامل مع إجمالي التكلفة وقيمة العطاء وصافي الربح ونسبته.
    6. **الاعتماد والترسية الفورية بنقرة زر واحدة (One-Click Award):** إنشاء المشروع التعاقدي، زرع بنود المقايسة، وتوليد شيتات الحصر وخطة الاحتياجات تلقائياً.
  - `frontend/src/features/contracting/pages/ContractingTenderPage.tsx` & `frontend/src/features/contracting/components/ImportBoqModal.tsx`:
    - **محرك استيراد مقايسة العطاء من Excel (BOQ Import):** إضافة زر مباشر لاستيراد مقايسة العطاء غير المسعرة المسلّمة من المالك أو الاستشاري، والتعرف التلقائي على الأعمدة والكميات والوحدات وتفريغها في جدول التسعير والتفكيك الهندسي فوراً، ودعم النمط المزدوج لمودال الاستيراد الموحد (In-Memory لدراسة العطاء، وBatch DB للمشروع التعاقدي).
  - `frontend/src/features/contracting/pages/ContractingLayout.tsx`:
    - زر «دراسة وتسعير عطاء جديد» في هيدر الموديول الموحد.
  - `frontend/src/features/contracting/components/ContractingProjectsTab.tsx`:
    - زر «دراسة وتسعير عطاء جديد» في هيدر وجدول المشاريع.
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx`:
    - زر «تفكيك الكود الهندسي وتسعير العطاءات (BOM)» في شريط أدوات المقايسة.
* **فحص الجودة والسلامة البرمجية:**
  - الالتزام الصارم بدستور واجهات المستخدم (RTL، Zero Emojis، StandardDialog، وتوافق الشاشات من 14 إلى 32 بوصة).

---


<!-- migrated:cap-171:end -->

<a id="cap-172"></a>
<!-- migrated:cap-172:start -->
## 142. مسار إدارة المشاريع الإنشائية الموحد والموجه الذكي للخطوة التالية (The 7-Phase Construction Lifecycle Engine & Smart Next Action Guide)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready - Global Tier-1 Construction Lifecycle Benchmark)
* **معيار المقارنة الدولي:** Procore Project Workflow / Oracle Primavera & Unifier Lifecycle / Autodesk Build Stage Gate Pipeline.
* **المسارات في الكود:**
  - `frontend/src/features/contracting/components/ProjectLifecycleStepper.tsx`:
    1. **مسار المراحل السبع المتسلسلة (7-Phase Workflow Pipeline):** شريط تفاعلي مرقم من 1 إلى 7 في قمة بيئة العمل يوضح للمقاول مسار المشروع من اللحظة صفر وحتى التسليم:
       - **المرحلة 1:** دراسة وتسعير العطاء (حصر CAD وتفكيك الأسعار BOM).
       - **المرحلة 2:** المقايسة والميزانية (بنود التعاقد SOV وتجميد ميزانية التكلفة Baseline).
       - **المرحلة 3:** التجهيز والجدول الزمني (التراخيص الحكومية ومخطط جانت الإنشائي).
       - **المرحلة 4:** التوريد ومقاولو الباطن (طلبات الشراء MRP وعقود الباطن).
       - **المرحلة 5:** الميدان وضبط الجودة (اليوميات الميدانية واستلام الأعمال WIR واستفسارات RFI).
       - **المرحلة 6:** المستخلصات والمالية (مستخلصات AIA G702/G703 وأوامر التغيير وسجل الضمان).
       - **المرحلة 7:** التسليم والإغلاق (فحص العيوب Snag List ومحاضر الاستلام الابتدائي والنهائي).
    2. زر وصول سريع إلى سجل ومؤشرات محفظة كافة المشاريع الإنشائية.
  - `frontend/src/features/contracting/components/SmartNextActionGuide.tsx`:
    - **بطاقة الموجه الذكي للخطوة التالية:** توجيه فوري للمقاول بلغة عربية مبسطة تشرح له ما المطلوب إنجازه في المرحلة الحالية بدقة، مع أزرار إجراء مباشر تفتح النوافذ والنماذج المتخصصة بنقرة واحدة (Zero Confusion).
  - `frontend/src/features/contracting/pages/ContractingCloseoutPage.tsx`:
    - **بيئة عمل متخصصة للمرحلة السابعة (Closeout & Handover):**
      - متابعة جولات فحص العيوب وقائمة الملاحظات المشتركة (`SnagListModal`).
      - تحرير واعتماد محاضر الاستلام والتسليم الابتدائي والنهائي للمشروع (`ProjectHandoverModal`).
      - تحليل الأرباح والخسائر الختامي وتصفية حسابات المشروع (`BoqProfitabilityModal`).
      - متابعة إفراجات ضمان حسن التنفيذ المحتجز (`RetentionLedgerModal`).
      - خريطة تفاعلية لبروتوكول التسليم طبقاً مواصفات الفيديك (FIDIC Handover Protocol).
  - `frontend/src/features/contracting/pages/ContractingLayout.tsx`:
    - ربط المسار المتسلسل والموجه الذكي وحفظ كاش التابات في الذاكرة (Keep-Alive 0ms) مع تكامل كافة النوافذ المنبثقة الـ 39.
  - `frontend/src/features/contracting/routes.tsx`:
    - تحديث المسارات الملاحية السريعة لدعم الملاحة السلسة للمراحل السبع.
* **فحص الجودة والسلامة البرمجية:**
  - الالتزام التام بدستور واجهات المستخدم (RTL، 0 Emojis، معيار الحاوية 1280px، وتوافق الشاشات من 14 إلى 32 بوصة بدون سكرول خارجي).

---


<!-- migrated:cap-172:end -->

<a id="cap-174"></a>
<!-- migrated:cap-174:start -->
## 145. محرك استخراج وتحليل مقايسات المشروعات والعطاءات من ملفات الـ PDF (Native PDF BOQ & SOV Ingestion Engine)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready)
* **المسارات في الكود:**
  - `frontend/src/features/contracting/utils/boqPdfParser.ts`: محرك التحليل الهندسي لاستخراج الجداول من ملفات الـ PDF مع التجميع المكاني وتصحيح الحروف العربية وتجميع البنود متعددة الأسطر.
  - `frontend/src/features/contracting/utils/boqPdfParser.spec.ts`: حزمة الاختبارات الشاملة (7 من 7 اختبارات ناجحة 100%).
  - `frontend/src/features/contracting/components/ImportBoqModal.tsx`: النافذة الموحدة لاستيراد المقايسات مع دعم `.xlsx, .xls, .csv, .pdf`.
  - `frontend/src/features/contracting/utils/boqExcelParser.ts`: دوال المطابقة الدلالية للأعمدة وتصنيف الأنشطة الهندسية والتطبيع العددي للفواصل.
* **القدرات والوظائف المعتمدة:**
  1. **الاستخراج المحلي الفوري بدون ذكاء اصطناعي (100% Native & In-Browser):**
     - معالجة سريعة بأجزاء من الثانية داخل المتصفح أو بيئة العمل بدون إرسال بيانات العطاءات إلى أي خوادم خارجية أو تكبد تكاليف API.
  2. **التقسيم المكاني ثنائي الاتجاه للأعمدة (Dynamic RTL & LTR Slicing):**
     - التعرف التلقائي على اتجاه الجدول، وتحديد إحداثيات أعمدة (رقم البند، بيان الأعمال والمواصفات، الوحدة، الكمية، الفئة، الإجمالي) بدقة متناهية سواء كان الجدول عربياً (RTL) أو إنجليزياً (LTR).
  3. **تجميع المواصفات والبنود متعددة الأسطر (Multi-line Description Stitching):**
     - دمج الأسطر المتتالية للبند الواحد في توصيف موحد متكامل، وربط ديباجات الأبواب ورؤوس الأقسام بالبنود التابعة لها دون تفكيك البند أو توليد أسطر فارغة.
  4. **معالجة فواصل الآلاف بالنقطة والتطبيع الرقمي:**
     - معالجة ذكية للأرقام المكتوبة بفواصل الآلاف النقطية (مثل `9.300.000` و `23.450.000`) والأرقام الهندية/المشرقية.
  5. **فلترة الإجماليات وهوامش الصفحات:**
     - الاستبعاد التلقائي لسطور الإجماليات النهائية وتكرارات الهيدرات وأرقام الصفحات.
  6. **الربط المباشر مع دراسة العطاءات والمقايسة التنفيذية:**
     - إتاحة مراجعة وتعديل وتصنيف البنود المستخرجة وإدراجها بضغطة زر في المقايسة التنفيذية للمشروع أو دراسة العطاء الفورية.

---


<!-- migrated:cap-174:end -->

<a id="cap-175"></a>
<!-- migrated:cap-175:start -->
## 146. محرك التسعير الفوري الاستباقي والمكتبة الهندسية المرجعية الموحدة لمقايسات المشروعات (Proactive BOQ Auto-Pricing & Master Engineering Pricing Core)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready)
* **المسارات في الكود:**
  - `frontend/src/features/contracting/utils/engineeringMasterPricingCore.ts`: المحرك الهندسي الشامل وقاموس الثوابت المرجعية المدمجة لكافة التخصصات التسعة (9 تخصصات كبرى: مكافحة الحريق Fire Fighting، القوى والبنية التحتية الكهربائية Electrical MV/LV، التيار الخفيف والشبكات Low Current، التكييف والتهوية HVAC، الصحي والتغذية والصرف Plumbing & Drainage، الخرسانات والأعمال المدنية Civil Concrete، أعمال المباني والقواطع Masonry، العزل المائي والحراري Waterproofing & Insulation، والتشطيبات المعمارية والأرضيات Architectural Finishes) بأكثر من 50 بنداً مرجعياً مفصلاً بتكاليفها وهوامشها ومكوناتها الـ BOM.
  - `frontend/src/features/contracting/utils/boqExcelParser.ts`: دمج التسعير الاستباقي التلقائي فور سحب وقراءة ملفات الإكسيل والـ PDF مع الدعم الكامل لدمج الأعمدة المتعددة (Item Name / Category + Technical Specification Description) وتوريث سياق الأقسام الرئيسية وتجاوز ملاحظات وديباجات الشروط التعاقدية العامة.
  - `frontend/src/features/contracting/utils/boqExcelParser.spec.ts`: حزمة الاختبارات الشاملة المعتمدة بنسبة نجاح 100% (14 اختباراً كاملاً لكافة سيناريوهات الملفات الحقيقية وشيتات التيار الخفيف LC BOQ والتخصصات).
  - `frontend/src/features/contracting/components/ImportBoqModal.tsx`: شاشة معاينة الاستيراد الذكية مع تمييز البنود المسعرة آلياً بشارة خضراء وحساب إجمالي العطاء التقديري لحظياً قبل الاعتماد.
  - `frontend/src/features/contracting/pages/ContractingTenderPage.tsx`: شاشة دراسة العطاءات وتفكيك شجرة الموارد (BOM Breakdown: خامات وتوريدات + مصنعيات وتركيبات) تلقائياً بناءً على الثوابت الهندسية.
  - `backend/src/database/migrations/2040000000097_contracting_mep_fire_fighting_master_library.ts`: التغذية السحابية وقاعدة البيانات لبنك البنود والثوابت الهندسية المركزية.
* **القدرات والوظائف المعتمدة:**
  1. **التسعير الاستباقي الفوري في شاشة المعاينة (Instant In-Modal Auto-Pricing):**
     - عند رفع أي كراسة مقايسة أو مناقصة (BOQ) غير مسعرة (أسعار الفئة فيها فارغة أو صفرية)، يقوم النظام فوراً بمطابقة مواصفات كل بند مع المكتبة الهندسية وتعبئة السعر التقديري الموصى به والتكلفة المباشرة فوراً داخل جدول المعاينة.
  2. **شارة التمييز البصري الذكية (Auto-Priced Status Badge):**
     - تمييز البنود المسعرة آلياً بحدود وحقل أخضر أنيق مع شارة `مسعر آلياً`، مع تحديث إجمالي قيمة العطاء التقديرية والتكلفة ونسبة الجاهزية إلى 100% فورياً.
  3. **التفكيك الكامل لشجرة الموارد (BOM Resource Decomposition):**
     - فك كافة بنود التخصصات الهندسية (خامات، مصنعيات، معدات، مقاولي باطن) مع حساب نسب الهالك، المصاريف الإدارية والعمومية (Overhead %)، وهامش الربح المستهدف (Profit Margin %).
  4. **التعرف الذكي على الأعمدة المتعددة والدمج التلقائي (Multi-Column Description Merging):**
     - معالجة ملفات المقايسات التي تفصل مسمى البند أو الفئة الرئيسية في عمود والتوصيف الفني والهندسي في عمود مجاور، ودمجها بذكاء لاستخراج كامل المواصفات الفنية والمطابقة الدقيقة.
  5. **عزل الديباجات وتوريث السياق الهندسي (Hierarchical Section Context & Preamble Shield):**
     - توريث التخصص الهندسي من رؤوس الأقسام والفصول للأبناء، مع حماية البنود من التوريث الخاطئ لديباجات الملاحظات العامة (Notes / Preamble).
  6. **دعم استيراد وإلحاق الشيتات المتعددة لتجميع تخصصات المشروع (Multi-Sheet Import & Append Mode):**
     - إتاحة خيارين فوريين عند استيراد أي ملف مقايسة جديد: «إلحاق وإضافة للبنود الحالية» لدمج شيتات التخصصات المختلفة (كهرباء، تكييف، صحي، تيار خفيف) في نفس دراسة العطاء، أو «استبدال كامل وتفريغ البنود السابقة».
  7. **تثبيت تابات التخصصات الهندسية (Always-Visible Discipline Filter Tabs):**
     - عرض شريط تصفية التخصصات وإجماليات كل تخصص بصورة دائمة حتى في المشاريع ذات التخصص الواحد، مما يوفر رؤية هندسية واضحة ومحكمة لإجمالي تكلفة وقيمة كل تخصص على حدة.
  8. **الحفظ التلقائي اللحظي لمسودة العطاء (Anti-Refresh Draft Auto-Save):**
     - حفظ كافة البنود الـ 65 والتخصصات والنسب وهوامش الربح تلقائياً في الكاش المحلي للمتصفح؛ بحيث لا تضيع أي بنود أو مجهود حصر عند عمل Refresh أو انقطاع الاتصال مع زر تفريغ المسودة والبدء من جديد.
  9. **دورة حفظ وترسية العطاءات الثنائية (Planning / Bidding vs Active Award Workflow):**
     - إتاحة خيارين فوريين للمهندس في أسفل الشاشة: «حفظ كعطاء قيد الدراسة والتسعير (Planning)» لحفظ المشروع في قاعدة البيانات ومتابعة المفاوضات وعروض الأسعار مع العميل، أو «اعتماد وترسية فورية كمشروع رسمي ساري (Active)» لتحويل المقايسة فوراً إلى SOV تنفيذي لبدء التوريدات والمستخلصات.

---


<!-- migrated:cap-175:end -->

<a id="cap-176"></a>
<!-- migrated:cap-176:start -->
## 147. منظومة التبويب المستقل للشيتات وعروض الأسعار متعددة الحزم وتصدير الإكسيل المسعر بهوية الشركة والـ PDF المطبوع (Multi-Sheet Preserved Tabs, Zero-Scroll Multi-line Quotations & Priced Excel/PDF Engine)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready)
* **المسارات في الكود:**
  - `frontend/src/features/contracting/components/ClientQuotationModal.tsx`: نافذة عرض السعر المالي الرسمي الشامل مع محدد نطاق العرض الفوري (كافة البنود المجمعة أو حسب ملف وشيت كل تخصص)، ونظام التوزيع الهندسي بدون أي سكرول أفقي (Zero Horizontal Scroll)، وتصدير إكسيل مسعر مطابق لترتيب كراسة العميل، وترويسة ديناميكية مقروءة من إعدادات الشركة (الاسم، الشعار، الهاتف، العنوان، الرقم الضريبي)، وطباعة رسمية A4 معتمدة وموجهة للمالك والضرائب والتأمينات.
  - `frontend/src/features/contracting/utils/originalWorkbookPricer.ts`: محرك التصدير الثنائي الذكي (Dual-Engine Export): يدعم التصدير بهوية وترويسة الشركة الملكية مع حفظ الديباجة والعناوين التبويبية وتسلسل البنود والتحليل المالي للضرائب والتأمينات، أو التصدير بالحقن الموضعي المباشر في شيت العميل الأصلي بدون إزاحة صفوف لمقارنات الاستشاري.
  - `frontend/src/features/contracting/pages/ContractingTenderPage.tsx`: دعم التبويب المستقل لكل ملف وشيت مستورد والحفاظ على التسلسل الأصلي لبنود العميل 100% بدون أي تشتيت، مع زر التصدير المباشر للإكسيل المسعر من شريط أدوات العطاءات.
  - `frontend/src/features/contracting/utils/boqExcelParser.ts`: تخزين ونقل اسم الملف واسم الشيت المصدر (`sourceFileName`, `sourceSheetName`) ورقم الصف الأصلي (`rawRowIdx`) لكل بند مع التصنيف الدقيق لمواسير التبريد والمعدات تحت تخصص التكييف.
* **القدرات والوظائف المعتمدة:**
  1. **تصدير الإكسيل بهوية وترويسة الشركة الديناميكية (Company-Branded Excel Quotation):**
     - جلب بيانات الشركة تلقائياً من إعدادات المنظومة المركزية (الاسم التجاري، الهاتف، العنوان، الرقم الضريبي، اللوجو) ووضع ترويسة مؤسسية فاخرة في أعلى شيت الإكسيل متبوعة بكامل بيانات المشروع، المالك، التاريخ، وتفاصيل النطاق.
  2. **الحفاظ التام على الديباجة، العناوين التبويبية، وتسلسل البنود (WBS & Section Hierarchy Preservation):**
     - تقسيم شيت الإكسيل إلى فصول وتخصصات هندسية واضحة (`【 أعمال القوى والشبكات الكهربائية 】`، `【 أعمال التكييف والتهوية 】`، إلخ) مع الحفاظ التام على ترتيب كراسة العطاء وشروطها التعاقدية وإجماليات التأمينات والقيمة المضافة في أسفل الشيت.
  3. **التبديل بين هوية الشركة والشيت الأصلي النقي (Branded Proposal vs Pure In-Place Toggle):**
     - إتاحة مفتاح تحكم فوري للمهندس: تصدير عرض سعر رسمي بهوية وترويسة الشركة، أو تصدير شيت العميل الأصلي نبيلاً بدون إزاحة خلايا لمطابقة شيتات الاستشاري وماكرو المقارنات.
  4. **التبويب المستقل للشيتات والملفات (File-Level Preserved Tabs):**
     - عند استيراد عدة ملفات مقايسات (مثل شيت التكييف HVAC، شيت مكافحة الحريق Fire Fighting، وشيت الكهرباء)، يتم إنشاء تابة مستقلة لكل ملف باسمه وعدد بنوده، مع الحفاظ التام على الترتيب والتسلسل الأصلي للبنود دون نقل أي بند خارج سياق ملفه الأصلي.
  5. **معيار منع السكرول الأفقي والضبط المتوازي للنصوص (Zero Horizontal Scroll & Responsive Word-Wrap):**
     - تطبيق جدول ثابت هندسياً (`table-layout: fixed`) مع توزيع أعمدة محكم (`<colgroup>`) وضبط متوازي للفقرات (`word-break: break-word`, `overflow-wrap: break-word`) لكافة النصوص والمواصفات الفنية الطويلة باللغتين العربية والإنجليزية لتظهر بسلاسة تحت بعضها بدون أي سكرول بالعرض.
  6. **عروض الأسعار المخصصة والمجمعة (Multi-Package Scope Filter):**
     - إتاحة خيار استخراج وطباعة عرض سعر رسمي مجمع لكافة أعمال المشروع، أو استخراج عرض سعر منفصل لكل ملف أو تخصص مستقل مع إعادة حساب كافة الضرائب والتأمينات والأتعاب الإدارية والإجماليات الخاصة بتلك الحزمة تلقائياً.
  7. **الطباعة الرسمية الفاخرة المعتمدة (Pixel-Perfect A4 Printout & PDF):**
     - قالب طباعة رسمي عالي الدقة يدعم الورق القياسي A4 ومزود بلوجو وبيانات شركتكم من الإعدادات، تفاصيل المشروع والجهة المالكة، جدول المواصفات المضبوط، بوكس التحليل المالي والضرائب، الشروط والمحددات التعاقدية، وثلاث خانات اعتماد رسمية (المكتب الفني، المدير التنفيذي، اعتماد المالك).
  8. **محرك الحقن الموضعي في شيت العميل الأصلي ومقاومة تحديث الصفحة عبر IndexedDB (IndexedDB-Backed In-Place Native BOQ Injection):**
     - تخزين محتوى وBuffer ملفات كراسات المقايسات الأصلية المرفوعة في قاعدة بيانات المتصفح المحلية (`IndexedDB`) بجانب ذاكرة التشغيل، لضمان بقائها حتى عند عمل Refresh أو إعادة تشغيل المتصفح.
     - حقن أسعار الفئات والإجماليات في خاناتها الأصلية بدقة متناهية مع الاحتفاظ الكامل بنسبة 100% بكافة تنسيقات العميل الأصلية وألوانه وخطوطه وديباجته وشروطه بدون المساس بخلية واحدة.
  9. **الشيت المؤسسي الملون الفاخر متعدد الملفات (Branded Enterprise Colored Spreadsheet):**
     - تصميم شيت إكسيل ملون مؤسسي مخصص متكامل يجمع بين هوية الشركة وترويستها الملكية الكحلية (`#170e5e`) وبين المحتوى الأصلي للمقايسة بنفس التسلسل والترتيب، مع تنسيق مالي معتمد للأرقام (`#,##0.00`)، ودمج كامل لأسطر الملاحظات والشروط التعاقدية عبر الأعمدة من A إلى H وتفعيل اتجاه RTL التلقائي، ودعم التصدير المجمع متعدد الملفات بنقرة واحدة.
  10. **زر التصدير المباشر في شاشة العطاء (1-Click Direct Excel Export Action):**
      - زر مخصص مميز باللون الأخضر في شريط إجراءات العطاءات يتيح تصدير شيت العميل المسعر فورياً بضغطة زر واحدة دون الحاجة للدخول لنافذة عرض السعر.
  11. **اعتماد وقبول حالة المشروع عند الحفظ والترسية (`status in CreateProjectDto`):**
      - دعم استقبال والتحقق من حقل `status` (مثل `planning` للعطاءات قيد الدراسة أو `active` للمشاريع المعتمدة والراشية) في `CreateProjectDto` وخدمة المقاولات بالباك إند مع التحقق الصارم (`@IsIn`), مما يمنع خطأ الـ Whitelist Validation ويضمن حفظ العطاءات بحالتها الدقيقة في قاعدة البيانات.
  12. **منع تعارض وتكرار أكواد البنود وحماية القيد الفريد (`BOQ Item Code Collision & Auto-Disambiguation Shield`):**
      - تطبيق آلية ذكية مزدوجة بالفرونت إند والباك إند لمنع تكرار `item_code` داخل نفس المشروع (مثل تكرار الأحرف `a` أو الترقيم الفرعي `1`, `2` بين الشيتات والفصول المختلفة) عبر ترقيم تسلسلي فرعي آلي (`a-2`, `a-3`...), مما يحمي النظام من خطأ كسر القيد الفريد `uq_contracting_boq_tenant_proj_code` ويضمن إدراج وحفظ كافة بنود المقايسة بسلاسة تامة.

---


<!-- migrated:cap-176:end -->

<a id="cap-177"></a>
<!-- migrated:cap-177:start -->
## 148. دورة حياة العطاءات والمناقصات الهندسية ومسار الترسية والأرشفة المرجعية (Tender Lifecycle, Revisions, Historical Archive & Awarding Pipeline)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready)
* **المعايير الهندسية والتعاقدية المعتمدة:** PMI Construction Extension / FIDIC Red Book / AIA Document A201 General Conditions.
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000098_contracting_tender_lifecycle_and_archive.ts`: ترحيل قاعدة البيانات بإضافة حقول دورة حياة العطاء (`loss_reason`, `loss_notes`, `competitor_price`, `revision_number`, `original_tender_id`, `submitted_at`, `awarded_at`, `consultant_name`, `contract_ref`, `contract_date`).
  - `backend/src/modules/contracting/contracting.service.ts` & `contracting.controller.ts`: محرك إدارة دورة حياة العطاءات (إنشاء مراجعات تفاوضية `createTenderRevision`، أرشفة العطاء غير الموفق `markTenderLost`، وترسية العطاء وتحويله لمشروع تنفيذي `awardTender`).
  - `frontend/src/features/contracting/components/ContractingProjectsTab.tsx`: الفصل الهندسي الصارم بين مسار دراسة العطاءات والمشاريع التنفيذية عبر 3 مسارات مستقلة (المشاريع التنفيذية السارية، مسار العطاءات والمناقصات، وأرشيف العطاءات غير المرسّاة).
  - `frontend/src/features/contracting/components/MarkTenderLostModal.tsx`: نافذة أرشفة العطاء وحفظ أسباب عدم الترسية وسعر المنافس الفائز ودروس المستفادة.
  - `frontend/src/features/contracting/components/AwardTenderModal.tsx`: نافذة اعتماد وترسية العطاء رسمياً وتوثيق رقم وتاريخ العقد والاستشاري والدفعة المقدمة ونسبة ضمان الأعمال.
  - `frontend/src/features/contracting/pages/ContractingTenderPage.tsx`: شريط حالة دورة حياة العطاء التفاعلي مع أزرار تقديم العرض، إنشاء مراجعة، ترسية العطاء، أو أرشفته.
  - `frontend/src/shared/components/icons/AppIcons.tsx`: تسجيل أيقونة الأرشيف المعتمدة `ArchiveIcon` لضمان خلو الواجهات التام من أخطاء المكونات غير المعرفة.
* **القدرات والوظائف المعتمدة:**
  1. **الفصل الصارم بين دراسة العطاءات والمشاريع التنفيذية (Tender Study vs Active Project Segregation):**
     - تقسيم شاشة المشاريع إلى 3 مسارات واضحة بتبويبات مستقلة:
       - **المشاريع التنفيذية السارية:** تعرض المشاريع المتعاقد عليها فعلياً والمستمرة في الموقع لتتبع التوريدات واليوميات وإصدار المستخلصات دون أي اختلاط بالعطاءات غير المعتمدة.
       - **مسار العطاءات والمناقصات:** يضم كافة المشروعات قيد الدراسة والتسعير أو بانتظار رد العميل أو الجارية مراجعتها وتفاوضها.
       - **أرشيف العطاءات غير المرسّاة (المرجع التاريخي):** يحتفظ بكافة العطاءات التي تم الاعتذار عنها أو لم يُوفّق فيها دون حذفها نهائياً من قاعدة البيانات.
  2. **نظام المراجعات التفاوضية (Negotiation Revision Engine - Rev-1, Rev-2...):**
     - إمكانية إنشاء مراجعة تفاوضية جديدة بضغطة زر عند طلب العميل تعديل الأسعار؛ يقوم النظام باستنساخ العطاء بكافة بنود مقايسته وتوليد كود مراجعة جديد وتجميد النسخة السابقة، مما يتيح تتبع تاريخ التفاوض بدقة.
  3. **أرشفة العطاءات غير الموفقة كمرجع تسعيري دائم (Permanent Historical Pricing Archive):**
     - حظر حذف أي عطاء تم بذل مجهود في دراسته وتسعيره؛ بل أرشفته مع توثيق سبب عدم الترسية (السعر أعلى من المنافس، إلغاء المشروع من المالك، شروط الدفع، اشتراطات فنية)، وسعر المنافس الفائز ليكون مرجعاً تسعيرياً للمكتب الفني.
  4. **إعادة فتح وتفعيل العطاءات المؤرشفة (Tender Revive Action):**
     - إمكانية إعادة العطاء المؤرشف إلى مسار التفاوض النشط بنقرة زر في حال تواصل العميل مجدداً أو أعاد طرح المشروع.
  5. **محرك الترسية والتحويل إلى مشروع تنفيذي ساري (Formal Awarding & Baseline SOV Lock):**
     - اعتماد وترسية العطاء بضغطة زر وتوثيق رقم العقد، الاستشاري، الدفعة المقدمة، ونسبة ضمان الأعمال (Retention %)، وتحويل العطاء فورياً إلى مشروع تشغيلي ساري في الموقع وتثبيت مقايسته كـ Baseline SOV.
  6. **دعم تحديث العطاءات وهوية العميل وحماية التحقق الصارم (`UpdateProjectDto Whitelist Shield`):**
     - اعتماد حقول `code` و `clientId` و `clientName` في `UpdateProjectDto` ومعالجتها بسلاسة في خدمة المقاولات بالباك إند، مع القضاء التام على خطأ 400 Whitelist Validation عند حفظ وتحديث العطاءات، والالتزام الصارم بالهوية البصرية الرصينة (0 Emojis ودرجات هادئة بدون ألوان فاقعة).
  7. **زر تسعير عطاء جديد، وسجل العطاءات السابقة (Tender Switcher)، وخريطة المسار وسيناريوهات المشروع التفاعلية:**
     - إضافة زر `[ + تسعير عطاء جديد ]` لتفريغ الشاشة الفوري وتهيئتها لاستقبال مقايسة جديدة دون البقاء عالقاً في المشروع القديم.
     - نافذة `TenderSwitcherModal` للبحث والتنقل السريع بين كافة العطاءات المحفوظة قيد الدراسة والمشاريع السارية وأرشيف العطاءات بنقرة واحدة.
     - شريط سياق ذكي أعلى جدول المقايسة يوضح ما إذا كانت الشاشة تعرض مسودة فارغة جديدة أم عطاء محفوظاً مع إمكانية التبديل الفوري.
     - نافذة `ContractingWorkflowMapModal` التفاعلية الشاملة التي ترسم خريطة دورة حياة المشروع من حصر الكميات والتسعير، مروراً بالسيناريوهات الميدانية الثلاثة (التفاوض Rev+، الرفض والأرشفة، والترسية والتحويل لمشروع تنفيذي)، وصولاً إلى التوريدات والمستخلصات والتسليم الختامي.
  8. **دستور ثبات أبعاد النوافذ المنبثقة ومنع رعشة التابات (Zero Modal Ballooning & Zero Tab-Flicker Standard):**
     - تثبيت ارتفاع الحاوية الداخلية لنافذة سجل العطاءات `TenderSwitcherModal` وكافة النوافذ متعددة التابات عند أبعاد ثابتة وصارمة (475px للغلاف الداخلي و 335px لمنطقة القائمة/الجدول)، بحيث تحتفظ النافذة بنفس الأبعاد الثابتة 100% سواء كان التاب يحتوي على 14 عنصراً أو كان فارغاً (0 items)، وتوسيط الحالة الفارغة دون أن ينكمش الفوتر أو تهتز النافذة نهائياً.
     - القضاء التام على رعشة التابات الأفقية والوميض (Tab Flicker) عبر تثبيت وزن الخط `fontWeight: 600` وإلغاء انتقالات CSS البطيئة لتكون الاستجابة لحظية 0ms دون أي تذبذب أفقياً أو رأسياً.
     - اعتماد وتوثيق هذه المعايير كدستور دائم وإلزامي في `AGENTS.md` و `GEMINI.md` لكافة النوافذ والمكونات في المنظومة.

---


<!-- migrated:cap-177:end -->

<a id="cap-178"></a>
<!-- migrated:cap-178:start -->
## 149. منظومة إدارة مقاولي الباطن، دليل المهن، كشف الحساب المالي التراكمي، وسندات الصرف (Subcontractors Master Directory, Real-Time Financial Ledger & Disbursements Management)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready)
* **المعايير الهندسية والتعاقدية المعتمدة:** الفصل المعماري والمالي الكامل بين الموردين (توريد الخامات والمواد) ومقاولي الباطن (التنفيذ والمصنعيات وحزم الأعمال التخصصية)، مع الامتثال لمحددات القيود المزدوجة وضمان الأعمال (Retention Held) وإدارة كشوف الحساب التحليلية (Statements of Account).
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000099_contracting_subcontractors_and_ledger.ts`: ترحيل قاعدة البيانات لإنشاء جدول سجل ودليل مقاولي الباطن `contracting_subcontractors` بكافة تفاصيل النشاط والمهنة والحسابات البنكية، وجدول سندات الصرف والمدفوعات `contracting_subcontractor_payments` بترقيم موحد `SPAY-YYMMDD-XXXX`، مع ترحيل آمن وتزامن متسلسلات الهوية `setval`.
  - `backend/src/database/database.types.ts`: تعريف الأنواع والجداول `ContractingSubcontractorTable` و `ContractingSubcontractorPaymentTable` وربطها بواجهة قاعدة البيانات المركزية.
  - `backend/src/modules/contracting/dto/contracting.dto.ts`: إضافة كائنات نقل البيانات `CreateSubcontractorDto` و `UpdateSubcontractorDto` و `CreateSubcontractorPaymentDto` مع التحقق الصارم من صحة الحقول.
  - `backend/src/modules/contracting/contracting.service.ts` & `contracting.controller.ts`: محرك إدارة مقاولي الباطن (CRUD)، محرك كشف الحساب المالي التحليلي اللحظي `getSubcontractorLedger` لحساب ما له وما عليه وصافي المستحق، ومحرك تسجيل سندات الصرف `createSubcontractorPayment` مع التوليد التسلسلي الموحد.
  - `frontend/src/features/contracting/contracting.types.ts`: تعريف الأنواع للواجهات الأمامية `ContractingSubcontractor` و `ContractingSubcontractorPayment` و `SubcontractorLedgerResponse`.
  - `frontend/src/features/contracting/api/contracting.api.ts`: دوال الاستدعاء والربط السحابي للخدمات المالية ودليل المقاولين وسندات الصرف.
  - `frontend/src/features/contracting/components/SubcontractorsDirectoryModal.tsx`: دليل وسجل مقاولي الباطن مع شريط تصفية التخصصات المهنية والبحث الفوري وعرض ملخص العقود وصافي المستحقات.
  - `frontend/src/features/contracting/components/CreateSubcontractorModal.tsx`: نافذة تسجيل مقاول باطن جديد بالتخصص والبيانات الضريبية والتجارية والبنكية.
  - `frontend/src/features/contracting/components/SubcontractorLedgerModal.tsx`: كشف حساب مقاول الباطن («ما له وما عليه») مع 5 بطاقات KPI فورية، سجل حركات تفصيلي برصيد تراكمي Running Balance، خيارات فلترة بالمشروع والتاريخ، وطباعة كشف حساب معتمد.
  - `frontend/src/features/contracting/components/RecordSubcontractorPaymentModal.tsx`: نافذة تسجيل وصرف دفعات مقاولي الباطن نقداً أو بتحويل بنكي أو شيك، مع تحديث فوري لكشف الحساب وعقود الإسناد.
  - `frontend/src/features/contracting/components/CreateSubcontractModal.tsx`: ربط أوامر الإسناد الحصري بدليل مقاولي الباطن بدلاً من قائمة الموردين، مع زر إضافة مقاول سريع (+ مقاول جديد) والتحديد التلقائي.
  - `frontend/src/features/contracting/components/ContractingSubcontractsTab.tsx`: أزرار الوصول السريع لدليل المقاولين وصرف الدفعات بأعلى الشاشة، وأزرار سريعة بكل سطر عقد لكشف الحساب والصرف الفوري، مع ضبط توزيع الأعمدة `<colgroup>`.
* **القدرات والوظائف المعتمدة:**
  1. **الفصل المعماري الصارم بين الموردين ومقاولي الباطن (Suppliers vs Subcontractors Isolation):**
     - التمييز الجوهري بين موردي الخامات (مواد، أسمنت، حديد، أجهزة) ومقاولي الباطن (أصحاب الحزم التخصصية والمصنعيات)، وإنشاء سجل مستقل تماماً بمحددات وبيانات متخصصة لمقاولي الباطن.
  2. **دليل وسجل مقاولي الباطن التخصصي (Subcontractors Master Directory):**
     - سجل مركزي يضم التخصص المهني (خرسانات، مباني، لياسة، كهرباء، صحي، عزل، تكييف، دهانات، سيراميك، واجهات، مصاعد)، السجل التجاري، الرقم الضريبي، الحساب البنكي والـ IBAN، التقييم، والحالة.
  3. **كشف الحساب المالي التحليلي اللحظي («ما له وما عليه» - Real-Time Ledger):**
     - كشف حساب تراكمي دقيق يحسب:
       - **ما له (Credits):** مستخلصات الأعمال المعتمدة (IPCs).
       - **ما عليه (Debits):** الدفعات والتحويلات المسددة للمقاول + الخصومات والتحميلات الميدانية (Back-charges).
       - **المبالغ المحتجزة:** ضمان الأعمال المحتجز (Retention Held).
       - **صافي الرصيد المستحق (Net Balance Due):** رصيد لحظي يبين بدقة المتبقي للمقاول أو عليه.
  4. **سجل الحركات والرصيد التراكمي (Chronological Running Balance Ledger):**
     - جدول حركات مالي مرتب زمنياً يعرض نوع الحركة (مستخلص، دفعة مسددة، خصم ميداني)، رقم السند والمستند، المشروع، المدين والدائن، والرصيد التراكمي بعد كل حركة مع فلترة متقدمة بالمشروع والتاريخ وزر طباعة مخصص.
  5. **سندات صرف ودفعات مقاولي الباطن (Subcontractor Disbursements Engine):**
     - نافذة متكاملة لتسجيل صرف الدفعات نقدياً أو عبر تحويل بنكي أو شيك مع توثيق رقم الحوالة/الشيك وتاريخ الاستحقاق والخصم المباشر من مستحقات المقاول وتحديث كشف الحساب لحظياً.
  6. **التوليد التسلسلي الموحد لسندات الصرف (`SPAY-YYMMDD-XXXX`):**
     - التزام تام بدستور الترقيم الموحد لجميع سندات الصرف الصادرة من المنظومة.
  7. **تكامل الإسناد الفوري (+ مقاول جديد داخل نافذة الإسناد):**
     - إمكانية إنشاء مقاول باطن جديد مباشرة من داخل شاشة إسناد الأعمال واختياره تلقائياً دون الحاجة لمغادرة الشاشة أو فقدان البيانات المدخلة.

---


<!-- migrated:cap-178:end -->

<a id="cap-179"></a>
<!-- migrated:cap-179:start -->
## 150. محرك توليد الجداول الزمنية الشامل متعدد الحزم والتخصصات والمزامنة التلقائية مع المقايسة (Universal Multi-Trade & Modular Schedule Engine)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready)
* **المعايير الهندسية والتعاقدية المعتمدة:** PMI Construction Extension / WBS / Critical Path Method (CPM) / CSI MasterFormat Trade Packages.
* **المسارات في الكود:**
  - `frontend/src/features/contracting/components/ScheduleGeneratorModal.tsx`: محرك التوليد الزمني الشامل مع دعم 8 قوالب هندسية قياسية، وباني الحزم الموديولار المخصص (16 حزمة متخصصة)، وخاصية التعرف الذكي والمزامنة الفورية مع مقايسة المشروع التعاقدية (Sync from Project BOQ).
* **القدرات والوظائف المعتمدة:**
  1. **التوافق التام مع أي مقاول وأي حزمة تعاقدية (Any Contractor, Any Trade Scope):**
     - القضاء التام على حصر الجداول الزمنية في المقاول العام فقط؛ حيث يتيح النظام توليد جداول زمنية دقيقة 100% لأي مقاول تخصصي منفرد (مثل مقاول أعمال الكهرباء والتيار الخفيف، مقاول السباكة والصحي، مقاول التكييف HVAC، مقاول الحريق، مقاول العوازل، مقاول المحارة، مقاول الدهانات، إلخ) أو مقاول الحزم المدمجة.
  2. **حزمة أعمال الكهرباء والتيار الخفيف المتكاملة (Full Electrical & Low Current Pipeline):**
     - توليد تسلسلي دقيق لمسار مقاول الكهرباء من اليوم الأول:
       - شبكة التأريض العمومية للأساسات (Earthing Grid) وربطها بالقواعد.
       - تمديد وتثبيت خراطيم الـ PVC ومخارج الإنارة بحديد الأسقف قبل الصب لكل دور.
       - شق الحوائط، علب الماجيك، وصناديق لوحات التوزيع الفرعية.
       - مسارات التيار الخفيف (داتا، كاميرات، إنذار حريق).
       - سحب وتدكيك الأسلاك والكابلات المعزولة.
       - تجميع اللوحات وتثبيت القواطع (DB Dressing).
       - تركيب الوشوش والبرايز ووحدات الإنارة والكشافات.
       - اختبارات العزل ومقاومة التأريض والميجر (Megger Test) وإطلاق التيار والتسليم.
  3. **باقة القوالب التخصصية الجاهزة (8 Ready Preset Templates):**
     - مشروع متكامل تسليم مفتاح (Full Turnkey).
     - هيكل إنشائي وعظم ومباني (Structure & Shell).
     - تشطيبات متكاملة لكافة التخصصات (Full Finishing).
     - كهروميكانيك متكامل (Full MEP: كهرباء + صحي + تكييف + حريق).
     - أعمال كهربائية وتيار خفيف فقط (Electrical Only).
     - أعمال صحية وتغذية وصرف فقط (Plumbing Only).
     - أعمال تكييف وتهوية فقط (HVAC Only).
     - تشطيبات معمارية فقط (Architectural Finishes).
  4. **الباني الموديولار المخصص وشبكة الـ 16 حزمة تفاعلية (Custom Modular Builder):**
     - شبكة اختيارات تفاعلية بـ 16 حزمة عمل مستقلة تمكن المقاول من تفعيل أو إلغاء أي حزمة، وتوليد جدول زمني مترابط تلقائياً لحزم تعاقده فقط.
  5. **التعرف والمزامنة الذكية مع مقايسة المشروع (Sync from Project BOQ):**
     - فحص فوري لبنود المقايسة التعاقدية للمشروع (`contractingApi.getBoqItems`) واكتشاف التخصصات الموجودة فعلياً وتحديد حزم الجدول الزمني آلياً بنقرة واحدة.
  6. **حساب التواريخ والمسار الحرج (Dynamic CPM & Cascade Scheduling):**
     - حساب مدد الأنشطة والتواريخ ومسار الأنشطة الحرجة (Critical Path) والتسلسل المنطقي بدقة تامة وبدون أي تداخلات أو فجوات عشوائية.

---


<!-- migrated:cap-179:end -->

<a id="cap-180"></a>
<!-- migrated:cap-180:start -->
## 151. إحكام المعمارية التعاقدية الشاملة وتوحيد هوية مقاولي الباطن وتفكيك خصومات المستخلصات (Phase 0 Contracting Architecture Hardening)
* **حالة الموديول العامة:** 🟢 مغلق ومحكم 100% بنجاح كامل ومثبت باختبارات التدقيق المالي الآلية (Enterprise Production Ready & Audited).
* **المعايير الهندسية والتعاقدية المعتمدة:** FIDIC Red/Yellow Books / Double-entry Ledger Invariants / Single Source of Truth Identity / Zero Dead-Code Standard.
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000100_contracting_phase0_reconciliation_and_schema_hardening.ts`: هجرة توحيد المفاتيح الخارجية وإلغاء الارتباط بـ `suppliers`، وإضافة قيود `fk_subcontracts_subcontractor` و `fk_invoices_subcontractor` بصيغة `NOT VALID` لتمكين إضافة الهيكل قبل الترحيل البياني. إضافة 23 عموداً تعاقدياً جديداً لشروط العقد المتقدمة، وتفكيك صندوق الخصومات المجمعة إلى أعمدة مستقلة وجدول سندات الخصم المفصلة `contracting_ipc_deductions`.
  - `backend/src/database/migrations/2040000000101_contracting_phase0_closure_composite_fks_and_checks.ts`: هجرة إغلاق المرحلة صفر الشاملة: جدول التعيين الدائم للهويات التاريخية `contracting_subcontractor_id_map`، فرض قيود المفاتيح الأجنبية المركبة المعزولة على مستوى المستأجر `(tenant_id, subcontractor_id)` بصيغة `NOT VALID` تمهيداً للترحيل مع حماية السجلات المالية `ON DELETE RESTRICT`، إضافة 10 قيود فحص `CHECK` لكافة المسميات التعاقدية وصحة نسب استرداد الدفعة المقدمة وعدم سلبية القيم المالية.
  - `backend/src/database/migrations/2040000000102_contracting_phase0_backfill_mapping_and_reconciliation.ts`: هجرة الترحيل البياني الفعلي (DML Data Migration & Backfill): تسجيل لقطة تدقيق قبلية لعدد الصفوف والمبالغ المالية لكل مستأجر (`_pre_recon_subcontracts`, `_pre_recon_invoices`)، نقل وترحيل كافة سجلات الموردين التاريخية المرتبطة بعقود ومستخلصات مقاولات إلى `contracting_subcontractors`، وتعبئة جدول التعيين الدائم `contracting_subcontractor_id_map`، وتحديث مراجع المفاتيح الخارجية، والتحقق البعدي الإلزامي من انعدام الفروقات (Zero Row Loss & Zero Value Drift)، والتحقق الصارم الصريح من قيود المفاتيح (`VALIDATE CONSTRAINT`) دون أي ابتلاع للأخطاء.
  - `backend/src/database/database.types.ts`: تحديث تعريفات Kysely لكافة الجداول المتأثرة وإضافة واجهة `ContractingIpcDeductionTable`.
  - `backend/src/modules/contracting/ipc-calculation.engine.ts`: المحرك الحسابي المركزي المستقل والنقي (Pure Functional Single Source of Truth) لحساب كافة طبقات المستخلصات الأربع طبقاً لمعايير FIDIC/MRICS مع تطبيق صارم لكافة الثوابت الحاكمة ($I_1, I_2, I_3, I_{12}$)، وتوليد لقطة التدقيق `calc_inputs_snapshot`.
  - `backend/src/modules/contracting/dto/contracting.dto.ts`: توسيع DTOs لعقود مقاولي الباطن والمستخلصات وبنود الحصر، مع إضافة خاصية `advanceRecoveryOverride?: boolean` للتحكم الصارم في التجاوز اليدوي.
  - `backend/src/modules/contracting/contracting.service.ts`: استدعاء المحرك المركزي `computeIpc` لحساب مبالغ المستخلص واشتقاق نسبة الإنجاز $P_n$ من واقع الدفاتر وقاعدة البيانات، مع ترحيل العجز المدين وحفظ المستخلص وبنود الخصم المفصلة.
  - `backend/test/critical/contracting-ipc-invariants.spec.ts`: جناح اختبارات تدقيق محاسبي آلي يستورد ويختبر محرك الإنتاج `computeIpc` مباشرة، يثبت بالبرهان الرياضي والسيناريوهات الرقمية انضباط الثوابت I1 و I2 و I3 و I12 والمسار الافتراضي بدون تجاوز بنسبة 100%.
  - `frontend/src/features/contracting/contracting.types.ts`: تحديث الأنواع وإضافة `SubcontractType` و `PaymentLinkageMode`.
  - `frontend/src/features/contracting/components/CreateSubcontractModal.tsx`: إضافة قسم شروط التعاقد والتحكم المالي FIDIC مع إمكانية ضبط نافذة استرداد الدفعة المقدمة (بدء الاسترداد 10% ونهايته 80%)، وسقف الضمان وسقف غرامات التأخير.
  - `frontend/src/features/contracting/components/CreateIpcInvoiceModal.tsx`: تطهير الواجهة من فرض استرداد 10% الثابت، والاعتماد التلقائي على نافذة العقد التعاقدية (Bounded Window)، مع خيار التجاوز اليدوي عند الحاجة فقط، وحساب الضمان حصرياً على الأعمال المنفذة GWD.
  - `AGENTS.md`: ترسيخ وتوسيع القاعدة السيادية رقم 13 (دستور التدقيق الحسابي ومنع الأخطاء الصامتة والكود الميت) لتشمل استيراد كود الإنتاج في الاختبارات، ونمط القيود المؤجلة `NOT VALID`، وحظر ابتلاع أخطاء التحقق، واشتراط تقرير التسوية القبلي والبعدي.
* **القدرات والوظائف المعتمدة:**
  1. **توحيد هوية مقاول الباطن والترحيل البياني الكامل (Unified Subcontractor Identity & DML Backfill):**
     - ترحيل آلي كامل لكافة مقاولي الباطن من جدول الموردين `suppliers` إلى جدول مقاولي الباطن الموحد `contracting_subcontractors`.
     - توثيق دائم لكافة روابط الهوية القديمة والجديدة في `contracting_subcontractor_id_map` مع قفل وتحقق قيود المفاتيح الأجنبية المركبة `(tenant_id, subcontractor_id)`.
  2. **العزل التعددي الصارم وحماية القيود المالية (Multi-Tenant Composite FKs & CHECK Constraints):**
     - فرض قيود مفاتيح أجنبية مركبة تشترط تطابق المستأجر `(tenant_id, subcontractor_id)` وتمنع الإسناد بين مستأجرين مختلفين.
     - تطبيق قاعدة `ON DELETE RESTRICT` الصارمة لحظر حذف أي مقاول باطن ترتبط به عقود أو مستخلصات مالية لحماية القيود اليومية والمستندات المحاسبية.
     - 10 قيود فحص `CHECK` تضمن منطقية نسب استرداد الدفعة المقدمة (`advance_recovery_end_pct > advance_recovery_start_pct`) وعدم سلبية المبالغ وصحة قيم التعدادات.
  3. **المحرك الحسابي الرباعي للمستخلصات المحصن بالثوابت الرياضية (FIDIC Standard 4-Layer IPC Engine with Invariants):**
     - **الطبقة الأولى (Gross Certified Work):** جمع إجمالي الأعمال المنفذة والفروق السعرية (Escalation) والمواد في الموقع (MOS) مع اشتقاق نسبة الإنجاز $P_n$ من السجل التراكمي.
     - **الطبقة الثانية (Contractual Holdbacks):** استرداد الدفعة المقدمة بنافذة مقيدة زمنياً وتقدمياً وفق المعادلة التعاقدية مع تطبيق سقف إلزامي يحظر أي استرداد يتجاوز الرصيد المتبقي للدفعة المقدمة (Invariant I1). وحساب حجز الضمان حصرياً على الأعمال المنفذة الفعلية GWD دون المواد ودون الفروق السعرية وبما لا يتجاوز سقف الضمان (Invariant I2).
     - **الطبقة الثالثة (Project Set-Offs):** تجميع دقيق لكافة بنود الخصومات والمحملات الميدانية عبر تجميع المصفوفات (Map Aggregation) لمنع إسقاط السجلات المتشابهة، وتطبيق سقف غرامات التأخير التعاقدي (Invariant I3)، والتحقق من التطابق التام بين الإجماليات والتفاصيل (Invariant I12).
     - **الطبقة الرابعة (Statutory Taxes & Carry-Forward):** تسوية الضرائب على الوعاء المعتمد الفعلي، وترحيل أي رصيد سالب إلى المستخلص التالي عبر `carried_forward_debit_out` مع تدوين لقطة الحسابات الكاملة `calc_inputs_snapshot`.
  4. **انعدام الكود الميت وتوافق الواجهة الأمامية مع فلسفة المحرك (Zero Dead-Code Alignment):**
     - التخلص التام من أي قيم افتراضية تعطل المنطق الخلفي في الواجهات الأمامية، وإتاحة نافذة استرداد الدفعة المقدمة Bounded Window كمسار افتراضي أساسي، مع دعم التجاوز اليدوي عند الحاجة.
  5. **جناح الاختبارات البرمجية المحاسبية المعتمد المباشر لكود الإنتاج (Production-Linked Automated Audit Suite):**
     - تغطية شاملة لجميع ثوابت المحرك في `contracting-ipc-invariants.spec.ts` تستورد مباشرة المحرك الحقيقي `computeIpc` وتثبت بنسبة 100% أن العمليات المالية والمحاسبية مطبقة ومختبرة حسابياً على كود الإنتاج الفعلي.

---


<!-- migrated:cap-180:end -->

<a id="cap-181"></a>
<!-- migrated:cap-181:start -->
## 152. منظومة خطابات الضمان البنكية والبوابة الرقابية G1 وحجب المستخلصات والغطاء التراكمي (Phase 1: Bank Guarantees, Gateway G1, Invariant G1-C, Expiry Alerts & IPC Interlocking)
* **حالة الموديول العامة:** 🟢 مغلق ومحكم 100% ومعتمد كوداً وتدقيقاً محاسبياً واختبارات آلية (Phase 1 Fully Audited & Signed Off).
* **المعايير الهندسية والتعاقدية المعتمدة:** FIDIC Red Book / URDG 758 (Uniform Rules for Demand Guarantees) / MRICS Financial Controls / Gateway G1 Strict Advance Protection / Cumulative Exposure Invariant G1-C / Objective Substantive Inference.
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000103_contracting_guarantees_and_gateway_g1.ts`: ترحيل قاعدة البيانات لإنشاء جدول خطابات الضمان `contracting_guarantees` بروابط مركبة `(tenant_id, id)`، وتقييد الحذف `ON DELETE RESTRICT` على المشروعات والعقود والمقاولين لمنع إسقاط التزامات بنكية قائمة، مع قيود CHECK لأنواع الضمانات والحالات والتواريخ.
  - `backend/src/database/migrations/2040000000104_contracting_g1_cumulative_and_composite_fks.ts`: هجرة إغلاق المرحلة الأولى التجميعية: إضافة عمودي `payment_category` و `status` لجدول `contracting_subcontractor_payments` مع قيود `CHECK` وفهرس مركب، إضافة قيد `UNIQUE (tenant_id, id)` على `contracting_projects`، وإعادة بناء المفتاح الأجنبي لخطابات الضمان مركباً `fk_guarantees_project_tenant` على مستوى المستأجر والمشروع معاً، والمصادقة الصريحة النهائية `VALIDATE CONSTRAINT` على القيود المؤجلة الثلاثة من المرحلة صفر (`fk_invoices_subcontract_tenant`, `fk_ipc_deductions_invoice_tenant`, `fk_backcharges_subcontractor_tenant`).
  - `backend/src/database/database.types.ts`: تعريف واجهة Kysely `ContractingGuaranteeTable` و `ContractingSubcontractorPaymentTable` مع أعمدة التصنيف والحالة وربطها بنوع `Database`.
  - `backend/src/modules/contracting/guarantee-gateway.engine.ts`: المحرك الرقابي المستقل والنقي (Pure Functional Gateway G1 Engine) لتطبيق فحص البوابة G1 ومنع صرف الدفعات المقدمة بدون غطاء بنكي كافٍ وسارٍ، وفرض ثابت الغطاء التراكمي **Invariant G1-C** لحظر الدفعات الجزئية المتعددة التي تتجاوز سقف الضمان بمجموعها، وفحص حجب المستخلصات IPC Interlocking عند وجود رصيد دفعة مقدمة غير مسترد مع انتهاء الضمان، ومحرك حساب وتصنيف التنبيهات المبكرة T-60 و T-30 و T-7.
  - `backend/src/modules/contracting/dto/contracting.dto.ts`: إضافة كائنات نقل البيانات `CreateGuaranteeDto`, `UpdateGuaranteeDto`, `ExtendGuaranteeDto`, `ReleaseGuaranteeDto`, `InvokeGuaranteeDto`, وتحديث `CreateSubcontractorPaymentDto` بدعم تصنيف `operational_advance`.
  - `backend/src/modules/contracting/contracting.service.ts` & `contracting.controller.ts`: دوال دورة حياة خطابات الضمان، والربط الفعلي بـ 4 نقاط إنتاجية، وتطبيق الاستدلال الموضوعي الصارم على الخادم (`isSubstantivelyAdvance`) لمنع التجاوز الصامت للبوابة من القوائم المنسدلة، وحساب رصيد الصرف التراكمي السابق، وإبراز التصنيفات المالية في كشف حساب المقاول، وفحص حجب المستخلصات `checkIpcGuaranteeInterlocking` في `createInvoice` و `approveInvoice`.
  - `backend/test/critical/contracting-guarantee-gateway.spec.ts`: جناح اختبارات آلي يستورد محرك الإنتاج النقي مباشرة (11 سيناريو تدقيقي ناجح 100%)، يغطي حالات الصرف الفردي والتراكمي وسد ثغرة الدفعات المتعددة التتابعية واختبارات حجب المستخلص والتنبيهات المبكرة.
  - `frontend/src/features/contracting/contracting.types.ts`: تعريف أنواع `ContractingGuarantee` و `GuaranteeExpiryAlert` والتعدادات.
  - `frontend/src/features/contracting/api/contracting.api.ts`: دوال الاستدعاء السحابي لخطابات الضمان وإجراءات التمديد والإفراج والتسييل.
  - `frontend/src/features/contracting/components/CreateGuaranteeModal.tsx`: نافذة تسجيل وتفعيل خطاب ضمان بنكي جديد وربطه بالمشروع أو عقد مقاول الباطن.
  - `frontend/src/features/contracting/components/GuaranteesDirectoryModal.tsx`: دليل وسجل خطابات الضمان البنكية مع بطاقات المؤشرات الإحصائية والتنبيهات المبكرة (T-60 / T-30 / T-7)، تبويبات التصفية، وإجراءات التمديد البنكي والإفراج والتسييل المدمجة دون تشتت.
  - `frontend/src/features/contracting/components/RecordSubcontractorPaymentModal.tsx`: دعم تصنيفات الدفعات (دفعة جارية، دفعة مقدمة خاضعة لـ G1، سلفة تشغيلية نقدية للموقع معفاة من G1).
  - `frontend/src/features/contracting/components/ContractingSubcontractsTab.tsx`: زر وصول مباشر بالهيدر لخطابات الضمان البنكية، وأزرار سريعة بكل سطر عقد لمتابعة وتفعيل الضمانات.
* **القدرات والوظائف المعتمدة:**
  1. **البوابة الرقابية الأولى ومعيار الغطاء التراكمي (Gateway G1 & Cumulative Invariant G1-C):**
     - صمام أمان مالي يحظر بشكل قاطع صرف أي دفعة مقدمة (Advance Payment) لمقاول أو مشروع ما لم يتوفر خطاب ضمان بنكي سارٍ يغطي كامل **إجمالي المنصرف التراكمي السابق مضافاً إليه الدفعة الحالية المطلوبة** (`priorAdvanceDisbursed + requestedAmount <= guaranteeAmount`).
     - حماية كاملة ومثبتة برمجياً من سيناريو الانكشاف المالي الناتج عن صرف دفعات مقدمة جزئية متعددة على مراحل.
  2. **الاستدلال الموضوعي الصارم بالخادم (Objective Server-Side Substantive Inference):**
     - حظر تجاوز البوابة بالصمت أو الخطأ: إذا كانت الدفعة غير مرتبطة بمستخلص، والعقد ينص على دفعة مقدمة لم تستنفد بالكامل، يستدل الخادم على أنها دفعة مقدمة ويخضعها للبوابة G1 قسراً حتى لو ترك المستخدم التصنيف على وضعه الافتراضي.
  3. **حجب المستخلصات والربط المحكم (IPC Guarantee Interlocking):**
     - عند وجود رصيد دفعة مقدمة غير مسترد للمقاول (`unrecoveredAdvanceBalance > 0`)، يفحص النظام صلاحية وسريان خطاب الضمان البنكي. وإذا انتهت صلاحية الضمان قبل اكتمال الاسترداد، يتم حجب اعتماد وصرف المستخلص فورياً مع إطلاق إشعار حظر صريح يطالب بتمديد الخطاب بنكياً أولاً.
  4. **محرك التنبيهات المبكرة المتدرج زمنيّاً (T-60 / T-30 / T-7 Early Expiry Alerts):**
     - نظام إنذار مبكر يحسب الأيام المتبقية على انتهاء أي خطاب ضمان ويصنفها:
       - **T-60 (إشعار استباقي):** تنبيه أزرق قبل 60 يوماً للمتابعة المبكرة.
       - **T-30 (تحذير إجرائي):** تنبيه برتقالي قبل 30 يوماً لبدء إجراءات التمديد مع البنك.
       - **T-7 (إنذار حرج أحمر):** تحذير أحمر عاجل قبل 7 أيام لتفادي ضياع حق تسييل أو تجديد الخطاب.
       - **Expired (منتهي الصلاحية):** وسم أحمر داكن يوجب التمديد الفوري أو الحجب.
  5. **إدارة دورة حياة خطابات الضمان المتكاملة (Full Lifecycle Actions):**
     - تسجيل الخطاب برقم بنكي رسمي والربط بالبنك والمشروع والعقد.
     - تمديد بنكي سريع يحدث تاريخ الانتهاء ويعيد تفعيل الخطاب إذا كان منتهياً.
     - إفراج رسمي عند انتهاء الالتزام التعاقدي ورد أصل الخطاب للبنك.
     - تسييل ومصادرة مع توثيق الأسباب القانونية وتاريخ المعاملة والمبلغ المصادر.
  6. **الامتثال لدستور الاختبارات والبرهان الحسابي (Rule 13 Invariant Proof):**
     - 11 سيناريو تدقيق واختبار آلي في `contracting-guarantee-gateway.spec.ts` تستورد مباشرة كود الإنتاج النقي بدون تكرار، مع بقاء كافة اختبارات المرحلة صفر خضراء بنسبة 100%.

---


<!-- migrated:cap-181:end -->

<a id="cap-182"></a>
<!-- migrated:cap-182:start -->
## 153. محرك توزيع المصاريف غير المباشرة للموقع والربحية الحقيقية لبنود المقايسة (Track 1: Field Indirect Costs & Distributables Allocation Engine - AACE RP 10S-90 / 34R-05)
* **حالة الموديول العامة:** 🟢 مكتمل 100% ومختبر تدقيقياً ومحاسبياً مع تغطية شاملة لكافة الثوابت (Track 1 Production-Ready & Invariant-Audited).
* **المعايير الهندسية والمحاسبية المعتمدة:** AACE International Recommended Practice 10S-90 / 34R-05 / Activity-Based Costing (ABC) / Single Source of Truth Invariant / Strict Raw Materials Exclusion Guard / Zero-Production Mobilization Carry-Forward / Subcontractor Backcharge Recovery.
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000105_contracting_field_indirect_cost_allocation.ts`: ترحيل قاعدة البيانات لإنشاء جداول أوعية التكاليف `contracting_cost_pools`، ودفعات التوزيع الدورية `contracting_allocation_batches`، والمصاريف الميدانية غير المباشرة `contracting_indirect_expenses`، وتوزيعات البنود التفصيلية `contracting_boq_indirect_allocations`، وإضافة أعمدة التكلفة الفعلية الشاملة في جدول البنود `contracting_boq_items` (`allocated_indirect_cost`, `direct_labor_cost`, `direct_material_cost`, `direct_equipment_cost`, `total_actual_cost`) مع قيود المفاتيح المركبة `(tenant_id, id)` وحظر الحذف `ON DELETE RESTRICT`.
  - `backend/src/modules/contracting/field-indirect-allocation.engine.ts`: المحرك الحسابي النقي والمستقل (Pure Functional Engine) لتوزيع مصاريف الأوعية الأربعة على بنود المقايسة، ومعالجة صفرية الإنتاج في مرحلة التجهيز بترحيل الرصيد (`deferred_out`) دون خطأ قسمة على صفر، واستيعاب الرصيد المرحل في الفترات المنتجة اللاحقة (`deferred_in`)، والخصم المسبق لاستقطاعات مقاولي الباطن (Backcharges) لمنع الازدواجية، وحظر استخدام تكلفة المواد كمحرك توزيع لمنع تشويه التكاليف، مع مطابقة السنتات وجبر الفروق الحسابية بالمليم (Zero Discrepancy Reconciliation Invariant).
  - `backend/src/modules/contracting/contracting.service.ts` & `contracting.controller.ts`: دوال إدارة أوعية التكاليف (التهيئة التلقائية للأوعية الأربعة، تسجيل المصاريف، معاينة التوزيع اللحظي، اعتماد وترحيل الدفعات بالترقيم الموحد `ALLOC-YYMMDD-XXXX`، وتحديث التكلفة الفعلية للبنود ومحرك تحليل الربحية).
  - `backend/test/critical/contracting-indirect-allocation.spec.ts`: جناح اختبارات تدقيقي محاسبي يستورد المحرك النقي مباشرة ويختبر 8 سيناريوهات تدقيقية بنجاح 100%.
  - `frontend/src/features/contracting/contracting.types.ts`: تعريف أنواع `CostPool`, `IndirectExpense`, `AllocationBatch`, `BatchAllocationSummary` وتحديث `BoqProfitabilityItem`.
  - `frontend/src/features/contracting/api/contracting.api.ts`: دوال الاستدعاء السحابي لإدارة أوعية التكاليف والمصاريف الميدانية والمعاينة والاعتماد.
  - `frontend/src/features/contracting/components/FieldIndirectCostModal.tsx`: نافذة شاملة ومحكمة لإدارة أوعية التكاليف والمصاريف، وتشغيل دورات التوزيع الدورية مع المعاينة اللحظية للمحمل على كل بند، وسجل الدفعات التاريخية.
  - `frontend/src/features/contracting/components/BoqProfitabilityModal.tsx`: تحديث جدول تحليل الربحية ليعرض تفاصيل التكلفة الفعلية المباشرة وغير المباشرة الموزعة وهامش الربح الحقيقي.
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx`: زر وصول سريع بنافذة شريط الأدوات المتقدمة لفتح محرك توزيع المصاريف غير المباشرة.
* **القدرات والوظائف المعتمدة:**
  1. **أوعية التكاليف الأربعة المعتمدة دولياً (The 4 AACE Cost Pools):**
     - الوعاء 1 ($P_1$) - سكن وإعاشة وانتقالات العمالة: محرك التوزيع أيام العمل الفعلية ($D_{\text{labor}}$) من واقع كشوف الحضور.
     - الوعاء 2 ($P_2$) - أعباء وبدلات وتأمينات العمالة: محرك التوزيع تكلفة الأجور المباشرة ($C_{\text{labor}}$).
     - الوعاء 3 ($P_3$) - المعدات العامة ومولدات الموقع والمحروقات المشتركة: محرك التوزيع ساعات تشغيل المعدات ($D_{\text{equip}}$).
     - الوعاء 4 ($P_4$) - إدارة وإشراف الموقع وكرفانات المهندسين: محرك التوزيع الجهد الميداني المباشر ($\text{Direct Effort} = \text{Labor} + \text{Equipment}$).
  2. **الحظر الدستوري لاستخدام تكلفة المواد كمحرك توزيع (Strict Materials Exclusion):**
     - استبعاد تكلفة المواد الموردة تماماً من مقام التوزيع لمنع تحميل بند به توريد معدات كبرى أو تشيلر مستورد بحصة جائرة من رواتب مهندسي الموقع.
  3. **معالجة فترة التجهيز وصفرية الإنتاج (Mobilization Carry-Forward):**
     - عند صرف مصاريف تأسيسية قبل بدء إنتاج بنود المقايسة، يرحل الرصيد بالكامل تلقائياً للفترة التالية دون القسمة على صفر أو التوزيع العشوائي.
  4. **الخصم المسبق لاستقطاعات مقاولي الباطن (Subcontractor Backcharges Deduction):**
     - خصم أي مبالغ تم تحميلها على المقاولين مقابل السكن أو النقل من إجمالي الوعاء لتوزيع الصافي فقط ومنع الازدواج المحاسبي.
  5. **الثابت المحاسبي الحاكم ومطابقة السنتات (Rule 13 Invariant Proof):**
     - مطابقة تامة بين صافي مصاريف الأوعية والمبالغ الموزعة والرصيد المرحل بنسبة خطأ 0.000%.

---


<!-- migrated:cap-182:end -->

<a id="cap-184"></a>
<!-- migrated:cap-184:start -->
## 151. إحكام المعمارية التعاقدية الشاملة وتوحيد هوية مقاولي الباطن وتفكيك خصومات المستخلصات (Phase 0 Contracting Architecture Hardening)
* **حالة الموديول العامة:** 🟢 مغلق ومحكم 100% بنجاح كامل ومثبت باختبارات التدقيق المالي الآلية (Enterprise Production Ready & Audited).
* **المعايير الهندسية والتعاقدية المعتمدة:** FIDIC Red/Yellow Books / Double-entry Ledger Invariants / Single Source of Truth Identity / Zero Dead-Code Standard.
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000100_contracting_phase0_reconciliation_and_schema_hardening.ts`: هجرة توحيد المفاتيح الخارجية وإلغاء الارتباط بـ `suppliers`، وإضافة قيود `fk_subcontracts_subcontractor` و `fk_invoices_subcontractor` بصيغة `NOT VALID` لتمكين إضافة الهيكل قبل الترحيل البياني. إضافة 23 عموداً تعاقدياً جديداً لشروط العقد المتقدمة، وتفكيك صندوق الخصومات المجمعة إلى أعمدة مستقلة وجدول سندات الخصم المفصلة `contracting_ipc_deductions`.
  - `backend/src/database/migrations/2040000000101_contracting_phase0_closure_composite_fks_and_checks.ts`: هجرة إغلاق المرحلة صفر الشاملة: جدول التعيين الدائم للهويات التاريخية `contracting_subcontractor_id_map`, فرض قيود المفاتيح الأجنبية المركبة المعزولة على مستوى المستأجر `(tenant_id, subcontractor_id)` بصيغة `NOT VALID` تمهيداً للترحيل مع حماية السجلات المالية `ON DELETE RESTRICT`, إضافة 10 قيود فحص `CHECK` لكافة المسميات التعاقدية وصحة نسب استرداد الدفعة المقدمة وعدم سلبية القيم المالية.
  - `backend/src/database/migrations/2040000000102_contracting_phase0_backfill_mapping_and_reconciliation.ts`: هجرة الترحيل البياني الفعلي (DML Data Migration & Backfill): تسجيل لقطة تدقيق قبلية لعدد الصفوف والمبالغ المالية لكل مستأجر (`_pre_recon_subcontracts`, `_pre_recon_invoices`), نقل وترحيل كافة سجلات الموردين التاريخية المرتبطة بعقود ومستخلصات مقاولات إلى `contracting_subcontractors`, وتعبئة جدول التعيين الدائم `contracting_subcontractor_id_map`, وتحديث مراجع المفاتيح الخارجية, والتحقق البعدي الإلزامي من انعدام الفروقات (Zero Row Loss & Zero Value Drift), والتحقق الصارم الصريح من قيود المفاتيح (`VALIDATE CONSTRAINT`) دون أي ابتلاع للأخطاء.
  - `backend/src/database/database.types.ts`: تحديث تعريفات Kysely لكافة الجداول المتأثرة وإضافة واجهة `ContractingIpcDeductionTable`.
  - `backend/src/modules/contracting/ipc-calculation.engine.ts`: المحرك الحسابي المركزي المستقل والنقي (Pure Functional Single Source of Truth) لحساب كافة طبقات المستخلصات الأربع طبقاً لمعايير FIDIC/MRICS مع تطبيق صارم لكافة الثوابت الحاكمة ($I_1, I_2, I_3, I_{12}$), وتوليد لقطة التدقيق `calc_inputs_snapshot`.
  - `backend/src/modules/contracting/dto/contracting.dto.ts`: توسيع DTOs لعقود مقاولي الباطن والمستخلصات وبنود الحصر, مع إضافة خاصية `advanceRecoveryOverride?: boolean` للتحكم الصارم في التجاوز اليدوي.
  - `backend/src/modules/contracting/contracting.service.ts`: استدعاء المحرك المركزي `computeIpc` لحساب مبالغ المستخلص واشتقاق نسبة الإنجاز $P_n$ من واقع الدفاتر وقاعدة البيانات, مع ترحيل العجز المدين وحفظ المستخلص وبنود الخصم المفصلة.
  - `backend/test/critical/contracting-ipc-invariants.spec.ts`: جناح اختبارات تدقيق محاسبي آلي يستورد ويختبر محرك الإنتاج `computeIpc` مباشرة، يثبت بالبرهان الرياضي والسيناريوهات الرقمية انضباط الثوابت I1 و I2 و I3 و I12 والمسار الافتراضي بدون تجاوز بنسبة 100%.
  - `frontend/src/features/contracting/contracting.types.ts`: تحديث الأنواع وإضافة `SubcontractType` و `PaymentLinkageMode`.
  - `frontend/src/features/contracting/components/CreateSubcontractModal.tsx`: إضافة قسم شروط التعاقد والتحكم المالي FIDIC مع إمكانية ضبط نافذة استرداد الدفعة المقدمة (بدء الاسترداد 10% ونهايته 80%), وسقف الضمان وسقف غرامات التأخير.
  - `frontend/src/features/contracting/components/CreateIpcInvoiceModal.tsx`: تطهير الواجهة من فرض استرداد 10% الثابت، والاعتماد التلقائي على نافذة العقد التعاقدية (Bounded Window), مع خيار التجاوز اليدوي عند الحاجة فقط، وحساب الضمان حصرياً على الأعمال المنفذة GWD.
  - `AGENTS.md`: ترسيخ وتوسيع القاعدة السيادية رقم 13 (دستور التدقيق الحسابي ومنع الأخطاء الصامتة والكود الميت) لتشمل استيراد كود الإنتاج في الاختبارات، ونمط القيود المؤجلة `NOT VALID`، وحظر ابتلاع أخطاء التحقق، واشتراط تقرير التسوية القبلي والبعدي.
* **القدرات والوظائف المعتمدة:**
  1. **توحيد هوية مقاول الباطن والترحيل البياني الكامل (Unified Subcontractor Identity & DML Backfill):**
     - ترحيل آلي كامل لكافة مقاولي الباطن من جدول الموردين `suppliers` إلى جدول مقاولي الباطن الموحد `contracting_subcontractors`.
     - توثيق دائم لكافة روابط الهوية القديمة والجديدة في `contracting_subcontractor_id_map` مع قفل وتحقق قيود المفاتيح الأجنبية المركبة `(tenant_id, subcontractor_id)`.
  2. **العزل التعددي الصارم وحماية القيود المالية (Multi-Tenant Composite FKs & CHECK Constraints):**
     - فرض قيود مفاتيح أجنبية مركبة تشترط تطابق المستأجر `(tenant_id, subcontractor_id)` وتمنع الإسناد بين مستأجرين مختلفين.
     - تطبيق قاعدة `ON DELETE RESTRICT` الصارمة لحظر حذف أي مقاول باطن ترتبط به عقود أو مستخلصات مالية لحماية القيود اليومية والمستندات المحاسبية.
     - 10 قيود فحص `CHECK` تضمن منطقية نسب استرداد الدفعة المقدمة (`advance_recovery_end_pct > advance_recovery_start_pct`) وعدم سلبية المبالغ وصحة قيم التعدادات.
  3. **المحرك الحسابي الرباعي للمستخلصات المحصن بالثوابت الرياضية (FIDIC Standard 4-Layer IPC Engine with Invariants):**
     - **الطبقة الأولى (Gross Certified Work):** جمع إجمالي الأعمال المنفذة والفروق السعرية (Escalation) والمواد في الموقع (MOS) مع اشتقاق نسبة الإنجاز $P_n$ من السجل التراكمي.
     - **الطبقة الثانية (Contractual Holdbacks):** استرداد الدفعة المقدمة بنافذة مقيدة زمنياً وتقدمياً وفق المعادلة التعاقدية مع تطبيق سقف إلزامي يحظر أي استرداد يتجاوز الرصيد المتبقي للدفعة المقدمة (Invariant I1). وحساب حجز الضمان حصرياً على الأعمال المنفذة الفعلية GWD دون المواد ودون الفروق السعرية وبما لا يتجاوز سقف الضمان (Invariant I2).
     - **الطبقة الثالثة (Project Set-Offs):** تجميع دقيق لكافة بنود الخصومات والمحملات الميدانية عبر تجميع المصفوفات (Map Aggregation) لمنع إسقاط السجلات المتشابهة، وتطبيق سقف غرامات التأخير التعاقدي (Invariant I3), والتحقق من التطابق التام بين الإجماليات والتفاصيل (Invariant I12).
     - **الطبقة الرابعة (Statutory Taxes & Carry-Forward):** تسوية الضرائب على الوعاء المعتمد الفعلي، وترحيل أي رصيد سالب إلى المستخلص التالي عبر `carried_forward_debit_out` مع تدوين لقطة الحسابات الكاملة `calc_inputs_snapshot`.
  4. **انعدام الكود الميت وتوافق الواجهة الأمامية مع فلسفة المحرك (Zero Dead-Code Alignment):**
     - التخلص التام من أي قيم افتراضية تعطل المنطق الخلفي في الواجهات الأمامية، وإتاحة نافذة استرداد الدفعة المقدمة Bounded Window كمسار افتراضي أساسي، مع دعم التجاوز اليدوي عند الحاجة.
  5. **جناح الاختبارات البرمجية المحاسبية المعتمد المباشر لكود الإنتاج (Production-Linked Automated Audit Suite):**
     - تغطية شاملة لجميع ثوابت المحرك في `contracting-ipc-invariants.spec.ts` تستورد مباشرة المحرك الحقيقي `computeIpc` وتثبت بنسبة 100% أن العمليات المالية والمحاسبية مطبقة ومختبرة حسابياً على كود الإنتاج الفعلي.

---


<!-- migrated:cap-184:end -->

<a id="cap-185"></a>
<!-- migrated:cap-185:start -->
## 153. محرك توزيع المصاريف غير المباشرة للموقع والربحية الحقيقية لبنود المقايسة (Track 1: Field Indirect Costs & Distributables Allocation Engine - AACE RP 10S-90 / 34R-05)
* **حالة الموديول العامة:** 🟢 مكتمل 100% ومختبر تدقيقياً ومحاسبياً مع تغطية شاملة لكافة الثوابت (Track 1 Production-Ready & Invariant-Audited).
* **المعايير الهندسية والمحاسبية المعتمدة:** AACE International Recommended Practice 10S-90 / 34R-05 / Activity-Based Costing (ABC) / Single Source of Truth Invariant / Strict Raw Materials Exclusion Guard / Zero-Production Mobilization Carry-Forward / Subcontractor Backcharge Recovery.
* **المسارات في الكود:**
  - `backend/src/database/migrations/2040000000105_contracting_field_indirect_cost_allocation.ts`: ترحيل قاعدة البيانات لإنشاء جداول أوعية التكاليف `contracting_cost_pools`، ودفعات التوزيع الدورية `contracting_allocation_batches`، والمصاريف الميدانية غير المباشرة `contracting_indirect_expenses`، وتوزيعات البنود التفصيلية `contracting_boq_indirect_allocations`، وإضافة أعمدة التكلفة الفعلية الشاملة في جدول البنود `contracting_boq_items` (`allocated_indirect_cost`, `direct_labor_cost`, `direct_material_cost`, `direct_equipment_cost`, `total_actual_cost`) مع قيود المفاتيح المركبة `(tenant_id, id)` وحظر الحذف `ON DELETE RESTRICT`.
  - `backend/src/modules/contracting/field-indirect-allocation.engine.ts`: المحرك الحسابي النقي والمستقل (Pure Functional Engine) لتوزيع مصاريف الأوعية الأربعة على بنود المقايسة، ومعالجة صفرية الإنتاج في مرحلة التجهيز بترحيل الرصيد (`deferred_out`) دون خطأ قسمة على صفر، واستيعاب الرصيد المرحل في الفترات المنتجة اللاحقة (`deferred_in`)، والخصم المسبق لاستقطاعات مقاولي الباطن (Backcharges) لمنع الازدواجية، وحظر استخدام تكلفة المواد كمحرك توزيع لمنع تشويه التكاليف، مع مطابقة السنتات والجبر الفروق الحسابية بالمليم (Zero Discrepancy Reconciliation Invariant).
  - `backend/src/modules/contracting/contracting.service.ts` & `contracting.controller.ts`: دوال إدارة أوعية التكاليف (التهيئة التلقائية للأوعية الأربعة، تسجيل المصاريف، معاينة التوزيع اللحظي، اعتماد وترحيل الدفعات بالترقيم الموحد `ALLOC-YYMMDD-XXXX`، وتحديث التكلفة الفعلية للبنود ومحرك تحليل الربحية).
  - `backend/test/critical/contracting-indirect-allocation.spec.ts`: جناح اختبارات تدقيقي محاسبي يستورد المحرك النقي مباشرة ويختبر 8 سيناريوهات تدقيقية بنجاح 100%.
  - `frontend/src/features/contracting/contracting.types.ts`: تعريف أنواع `CostPool`, `IndirectExpense`, `AllocationBatch`, `BatchAllocationSummary` وتحديث `BoqProfitabilityItem`.
  - `frontend/src/features/contracting/api/contracting.api.ts`: دوال الاستدعاء السحابي لإدارة أوعية التكاليف والمصاريف الميدانية والمعاينة والاعتماد.
  - `frontend/src/features/contracting/components/FieldIndirectCostModal.tsx`: نافذة شاملة ومحكمة لإدارة أوعية التكاليف والمصاريف، وتشغيل دورات التوزيع الدورية مع المعاينة اللحظية للمحمل على كل بند، وسجل الدفعات التاريخية.
  - `frontend/src/features/contracting/components/BoqProfitabilityModal.tsx`: تحديث جدول تحليل الربحية ليعرض تفاصيل التكلفة الفعلية المباشرة وغير المباشرة الموزعة وهامش الربح الحقيقي.
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx`: زر وصول سريع بنافذة شريط الأدوات المتقدمة لفتح محرك توزيع المصاريف غير المباشرة.
* **القدرات والوظائف المعتمدة:**
  1. **أوعية التكاليف الأربعة المعتمدة دولياً (The 4 AACE Cost Pools):**
     - الوعاء 1 ($P_1$) - سكن وإعاشة وانتقالات العمالة: محرك التوزيع أيام العمل الفعلية ($D_{\text{labor}}$) من واقع كشوف الحضور.
     - الوعاء 2 ($P_2$) - أعباء وبدلات وتأمينات العمالة: محرك التوزيع تكلفة الأجور المباشرة ($C_{\text{labor}}$).
     - الوعاء 3 ($P_3$) - المعدات العامة ومولدات الموقع والمحروقات المشتركة: محرك التوزيع ساعات تشغيل المعدات ($D_{\text{equip}}$).
     - الوعاء 4 ($P_4$) - إدارة وإشراف الموقع وكرفانات المهندسين: محرك التوزيع الجهد الميداني المباشر ($\text{Direct Effort} = \text{Labor} + \text{Equipment}$).
  2. **الحظر الدستوري لاستخدام تكلفة المواد كمحرك توزيع (Strict Materials Exclusion):**
     - استبعاد تكلفة المواد الموردة تماماً من مقام التوزيع لمنع تحميل بند به توريد معدات كبرى أو تشيلر مستورد بحصة جائرة من رواتب مهندسي الموقع.
  3. **معالجة فترة التجهيز وصفرية الإنتاج (Mobilization Carry-Forward):**
     - عند صرف مصاريف تأسيسية قبل بدء إنتاج بنود المقايسة، يرحل الرصيد بالكامل تلقائياً للفترة التالية دون القسمة على صفر أو التوزيع العشوائي.
  4. **الخصم المسبق لاستقطاعات مقاولي الباطن (Subcontractor Backcharges):**
     - خصم أي مبالغ تم تحميلها على المقاولين مقابل السكن أو النقل من إجمالي الوعاء لتوزيع الصافي فقط ومنع الازدواج المحاسبي.
  5. **الثابت المحاسبي الحاكم ومطابقة السنتات (Rule 13 Invariant Proof):**
     - مطابقة تامة بين صافي مصاريف الأوعية والمبالغ الموزعة والرصيد المرحل بنسبة خطأ 0.000%.

---


<!-- migrated:cap-185:end -->

<a id="cap-191"></a>
<!-- migrated:cap-191:start -->
## 159. إغلاق فجوات موديول المقاولات مقارنة بمعايير Procore/CMiC/Primavera (Tier-1 Contracting ERP Gap-Closing)
* **حالة الإغلاق:** 🟢 ثلاث فجوات من خمس أُغلقت بالكامل (Backend + Frontend + هجرات + تحقق)، وفجوتان مؤجَّلتان بقرار واعٍ (راجع `ARCHITECTURE_INVARIANTS.md` O16, O17).
* **معيار المقارنة الدولي:** Procore Document Management, CMiC Meeting Minutes, Primavera P6 Resource Histogram — بحث فعلي وليس افتراضاً.
* **الميزات المُنجزة:**
  1. **سجل المخططات والمستندات (Document Register):** `backend/src/database/migrations/2040000000120_contracting_document_register_and_meeting_minutes.ts` — 3 جداول (مستند → مراجعات بتاريخ كامل بلا استبدال → سجل توزيع). خدمات: `createDocument`, `addDocumentRevision`, `updateDocumentRevisionStatus`, `distributeDocument` في `contracting.service.ts` (القسم 41). واجهة: `DocumentRegisterModal.tsx` مربوطة بزر في `ContractingFieldPage.tsx`.
  2. **محاضر الاجتماعات (Meeting Minutes):** نفس الهجرة — جدولا `contracting_meeting_minutes` و`contracting_meeting_action_items` (بنود متابعة قابلة للربط بـRFI/أمر تغيير). خدمات القسم 42. واجهة: `MeetingMinutesModal.tsx`.
  3. **التدفق النقدي المتوقع الحقيقي:** `getCashForecast` في `contracting.service.ts` أُعيد بناؤه بالكامل — تجميع بحسب `payment_due_date` الفعلي (0-30/31-60/61-90/+90 يوماً + دلو "بلا تاريخ") بدل نسب 50/30/20% العشوائية القديمة؛ الحقول غير المربوطة (`pendingSupplierInvoices`, `upcomingWages`) تُعرض الآن `null`/"غير متاح" بدل صفر مضلِّل.
  4. **الجدولة المحمّلة بالموارد (Resource-Loaded Schedule):** `backend/src/database/migrations/2040000000121_contracting_schedule_resource_loading.ts` يضيف `planned_manpower_count`/`planned_equipment_count`/`resource_trade` لكل مهمة جدولية؛ `getResourceLoadingHistogram` يبني تقرير Histogram أسبوعي (ذروة العمالة/المعدات + توزيع التخصصات). واجهة: `ResourceLoadingModal.tsx` مربوطة بزر في `ContractingGanttTab.tsx`.
* **اكتشاف جانبي:** `contracting.service.ts` يحوي 172 استخدام لـ`(this.db as any)` — خرق للقاعدة F3 الموثَّقة في `ARCHITECTURE_INVARIANTS.md`؛ لم يُمس (دين تقني موروث سابق لهذه الجلسة، كل الكود الجديد Typed بالكامل) — مسجَّل كـO16.
* **فحص الجودة والسلامة البرمجية:** `npx tsc --noEmit` (Backend + Frontend) نظيف؛ `npm run test:critical` (31 جناح) 100%؛ الهجرتان 120 و121 نُفِّذتا بنجاح، وتحقَّقت قيود الـSchema (تفرد رمز المراجعة، CHECK على الحالات) بإدخال بيانات فعلية عبر سكربت مؤقت.
* **بند مفتوح متعمَّد:** بوابة تعاون خارجية (استشاري/مالك يراجعون بأنفسهم) — لم تُبنَ عمداً، قرار أمني يستحق جلسة تصميم مستقلة (O17).


<!-- migrated:cap-191:end -->

<a id="cap-196"></a>
<!-- migrated:cap-196:start -->
## 165. دستور العزل القطاعي التام للمتاجر والتجزئة عن بيئة المقاولات (Contracting Vertical Isolation & Zero-Retail Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل ومطبق 100% (Production Ready).
* **المشكلة المعمارية التي تم حلها:**
  - ظهور عناصر وتطبيقات التجزئة والمتاجر الإلكترونية (مثل "طلبات أونلاين" `online-orders` ونقاط البيع `pos`) في أعلى القائمة الجانبية أو في نتائج البحث عند تفعيل موديول المقاولات من الإعدادات، وذلك بسبب اعتماد شروط العزل القطاعي سابقاً في `app-shell.tsx` و `GlobalSearchModal.tsx` على حقل نص النشاط (`rawActivity`) فقط دون التحقق من تفعيل موديول المقاولات (`settings.contractingModuleEnabled === true`).
* **الحل المعماري المنجز:**
  1. **توحيد تعريف وضع المقاولات (`isContractingVertical` / `isDedicatedContractingOnly`):**
     - تحديث الفحص في شريط التنقل الجانبي (`app-shell.tsx`) ونافذة البحث الشامل (`GlobalSearchModal.tsx`) ليشمل صراحة:
       `rawActivity === 'contracting' || rawActivity === 'construction' || rawActivity === 'مقاولات' || settings?.contractingModuleEnabled === true`
  2. **الحجب الصارم لعناصر التجزئة في المقاولات:**
     - حجب فوري وتام لعناصر: `['pos', 'cash-drawer', 'online-orders', 'kds', 'displays', 'signage', 'product-modifiers', 'delivery-reps', 'trade-in', 'imei-history', 'maintenance', 'sales', 'returns', 'sales-orders', 'price-lists']`.
     - قصر الروابط السريعة أعلى القائمة (`primaryNavigationKeys`) لشركات المقاولات حصرياً على: **"الرئيسية" + "سجل المشاريع" + "جداول الكميات (BOQ)"**.
  3. **تفعيل بيئة عمل المقاولات المؤسسية المتخصصة:**
     - تقديم أقسام المقاولات المتكاملة (المقاولات والمشاريع، العملاء والصفقات، المشتريات والتوريد، المخازن والمستودعات، المالية والمحاسبة، الموارد البشرية، وتقارير المشاريع) بدون أي تداخل مع موديولات التجارة الإلكترونية بالتجزئة.
* **الملفات المحدثة:**
  - `frontend/src/shared/layout/app-shell.tsx`
  - `frontend/src/shared/components/GlobalSearchModal.tsx`
* **فحص الجودة والسلامة البرمجية:**
  - فحص TypeScript (Frontend + Backend): `npx tsc --noEmit` كود 0 بنسبة 100% بدون أي أخطاء.

---


<!-- migrated:cap-196:end -->

<a id="cap-197"></a>
<!-- migrated:cap-197:start -->
## 166. تنظيم وتوحيد تابات التخصصات الهندسية في بنك بنود المقاولات المرجعي ومنع التكرار (Master BOQ Trades Deduplication & Symmetrical Tabs Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل ومطبق 100% (Production Ready).
* **المشكلة المعمارية التي تم حلها:**
  - تشتت تابات التخصصات الهندسية في صفحة بنك بنود المقاولات العام (`/contracting/master-boq`) في أسطر عشوائية وتكرار تفعيل أكثر من تابة في آن واحد عند النقر عليها لاشتراكها في نفس المفتاح وتكرار التسميات في قاعدة البيانات عبر الهجرات السابقة.
* **الحل المعماري المنجز:**
  1. **هجرة تطبيع وتوحيد التخصصات بالباك إند (`2040000000128_contracting_master_boq_trade_categories_normalization.ts`):**
     - توحيد كافة سجلات `contracting_master_boq_library` لتتبع 11 تخصصاً هندسياً قياسياً معتمداً ومطابقاً لـ CSI MasterFormat.
  2. **حظر التكرار في استعلام الباك إند (`contracting.service.ts`):**
     - تعديل `getMasterBoqTrades` ليقوم بالتجميع حصرياً عبر `GROUP BY trade_category` مع `MAX(trade_name_ar)` لمنع تكرار أي فئة هندسية نهائياً.
  3. **إعادة تصميم شريط التابات والتنقل التفاعلي (`ContractingMasterBoqPage.tsx` و `ImportMasterBoqModal.tsx`):**
     - تقسيم التخصصات إلى قطاعات كبرى رئيسية (Super-Tabs) وتخصصات تنفيذية واضحة مريحة للعين تمتد بعرض الصفحة (1280px).
     - ضمان تفرد المفاتيح (`uniqueTrades`) وتطبيق دستور منع رعشة التابات (وزن خط موحد `fontWeight: 600` وزمن انتقال لحظي 0ms).
* **الملفات المحدثة:**
  - `backend/src/database/migrations/2040000000128_contracting_master_boq_trade_categories_normalization.ts`
  - `backend/src/modules/contracting/contracting.service.ts`
  - `frontend/src/features/contracting/pages/ContractingMasterBoqPage.tsx`
  - `frontend/src/features/contracting/components/ImportMasterBoqModal.tsx`
  - `frontend/src/features/contracting/components/ImportMasterBoqExcelModal.tsx`
  - `frontend/src/features/contracting/components/UniversalBoqItemModal.tsx`
* **فحص الجودة والسلامة البرمجية:**
  - فحص TypeScript (Frontend + Backend): `npx tsc --noEmit` كود 0 بنسبة 100% بدون أي أخطاء.







---


<!-- migrated:cap-197:end -->
