# قدرات التصنيع والجودة

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **التصنيع والجودة** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/manufacturing/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [11. التصنيع وشجرة المنتج (Manufacturing & BOM)](#cap-037)
- [67. إضافات التصنيع الذكية (Smart Manufacturing: Unbuild Orders, By-Products & MTO)](#cap-092)
- [182. إدارة الجودة والامتثال الصناعي وتقارير عدم المطابقة (Quality Assurance & NCR)](#cap-216)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-037"></a>
<!-- migrated:cap-037:start -->
## 11. التصنيع وشجرة المنتج (Manufacturing & BOM)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/manufacturing`, `frontend/src/features/manufacturing`
* **الجداول في قاعدة البيانات:** `manufacturing_boms`, `manufacturing_bom_items`, `manufacturing_work_orders`, `manufacturing_work_centers`, `manufacturing_wo_operations`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **تعريف شجرة المنتج وتكلفة المكونات (BOM)** | 🟢 | 100% | `manufacturing.module.ts`, `BomsListPage.tsx`, `EditBomPage.tsx` | تحديد المواد الخام ومقاديرها اللازمة لإنتاج صنف تام الصنع وحساب تكلفة الإنتاج والتكاليف غير المباشرة. |
| **أوامر التشغيل والإنتاج الفعلي** | 🟢 | 100% | `WorkOrdersListPage.tsx`, `NewWorkOrderPage.tsx`, `manufacturing.service.ts` | تنفيذ أمر إنتاج: خصم المواد الخام من مخزن الخامات، وإضافة المنتج التام لمخزن المنتجات الجاهزة والتقييد المحاسبي. |
| **مراكز العمل والماكينات وتكلفة التشغيل بالساعة (Work Centers & Routing)** | 🟢 | 100% | `manufacturing.service.ts`, `manufacturing.controller.ts`, `WorkCentersPage.tsx`, `WorkOrdersListPage.tsx`, `2040000000056_manufacturing_work_centers.ts` | معيار أودو 17 للتصنيع MRP: تعريف مراكز العمل وخطوط الإنتاج والماكينات عبر المسار `/manufacturing/work-centers` مع تحديد تكلفة تشغيل الساعة وطاقة الإنتاج وكفاءة الأداء، وتسجيل ساعات تشغيل الماكينات أثناء إنهاء أمر الإنتاج واحتسابها آلياً ضمن تكلفة المنتج التام والتوجيه المحاسبي. |


---


<!-- migrated:cap-037:end -->

<a id="cap-092"></a>
<!-- migrated:cap-092:start -->
## 67. إضافات التصنيع الذكية (Smart Manufacturing: Unbuild Orders, By-Products & MTO)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Manufacturing MRP (Unbuild / Disassembly, By-products, Make-to-Order).
* **روابط وشاشات الوصول:** `/manufacturing/work-orders` (نافذة أوامر التفكيك) و `/sales/orders` (زر توليد أمر التصنيع المباشر MTO).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000060_purchase_orders_and_unbuild.ts`, `backend/src/database/database.types.ts` (`manufacturing_unbuild_orders`).
  * **الباك إند:** `backend/src/modules/manufacturing/services/manufacturing.service.ts`, `backend/src/modules/manufacturing/controllers/manufacturing.controller.ts`, `backend/src/modules/manufacturing/dto/manufacturing.dto.ts`.
  * **الفرونت إند:** `frontend/src/features/manufacturing/api/work-orders.api.ts`, `frontend/src/features/manufacturing/pages/WorkOrdersListPage.tsx`, `frontend/src/features/sales/pages/SalesOrdersPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **أوامر التفكيك واسترجاع المواد الخام (Unbuild Orders / Disassembly):** إمكانية تفكيك أي كمية من منتج تام الصنع بنقرة زر واحدة؛ يقوم النظام بخصم المنتج التام من المخزن وإعادة كافة المواد الخام والمكونات إلى مخزن الخامات استناداً إلى نسب شجرة المنتج (BOM)، مع تقييد حركات المخزون المعكوسة.
  2. **تسجيل المنتجات الثانوية والهالك (By-products Recording):** دعم مخرجات التصنيع الثانوية المفيدة أثناء إنهاء أمر الإنتاج وإضافتها كأرصدة مخزنية صالحة للبيع أو الاستخدام.
  3. **التصنيع عند الطلب المرتبط بالمبيعات (Make-to-Order - MTO):** عند مراجعة أمر البيع في شاشة `/sales/orders`، يمكن للمستخدم بنقرة زر واحدة توليد أمر تشغيل وإنتاج فوري (Work Order) للنواقص المصنعة وربطها برقم أمر البيع كمرجع.

---


<!-- migrated:cap-092:end -->

<a id="cap-216"></a>
<!-- migrated:cap-216:start -->
## 182. إدارة الجودة والامتثال الصناعي وتقارير عدم المطابقة (Quality Assurance & NCR)
* **حالة الوحدة / المعيار:** 🟢 مكتملة ومحمية بنسبة 100% (29 سبتمبر 2026).
* **المسار:** `/inventory/quality`.
* **المشكلة المعالجة:**
  - سد فجوة حوكمة الجودة في المنشآت الصناعية والتجارية، وفرض فحص دوري أو إلزامي على استلامات المشتريات ومخرجات التصنيع والتسليمات للعملاء، ومنع دخول البضائع التالفة أو غير المطابقة للمستودعات، وتوثيق تقارير عدم المطابقة (NCR) آلياً لحفظ حقوق الشركة.
* **الهندسة والحلول المنفذة:**
  1. **هجرة قاعدة البيانات (2040000000175_quality_assurance_and_ncr.ts):**
     - إنشاء جداول معايير ونقاط فحص الجودة (`quality_control_points`)، سجل الفحوصات والمعاينات (`quality_inspections`)، وتقارير عدم المطابقة (`quality_non_conformance_reports`).
     - تطبيق عزل المستأجر الصارم (`tenant_id`) والفهارس المركبة لربط الفحوصات بأذونات الاستلام وأوامر الشغل.
  2. **محرك تقييم الجودة وتوليد الـ NCR الصافي (quality-control.engine.ts):**
     - محرك حسابي نقي وخالٍ من الاعتماديات الخارجية.
     - تقييم الفحوصات البصرية (Pass/Fail) والفحوصات الكمية (Quantitative Measurement) بالتحقق الصارم من وقوع القيمة المقاسة داخل حدود التسامح المسموح بها [Min - Max].
     - تقييم القبول المشروط (Conditional Acceptance) في حال وجود نسب هدر أو فرز جزئي.
     - استنتاج مؤشر خطورة العيب تلقائياً (Critical عند >= 50% تالف، Major عند >= 10%، و Minor فيما دون ذلك).
     - احتساب نسبة القبول الكلية للجودة بدقة مئوية (`acceptanceRatePercent`).
     - تغطية شاملة باختبارات الوحدة (`backend/test/quality-control-engine.spec.ts`) بنجاح 100%.
  3. **خدمة الباك إند ووحدة التحكم (quality-assurance.service.ts & quality-assurance.controller.ts):**
     - توليد الترقيم المستندي الموحد لتقارير عدم المطابقة (`NCR-YYMMDD-XXXX`).
     - الربط الآلي: الفحص الراسب يولد تلقائياً تقرير NCR مع تحديد سبب العيب واقتراح الإجراء التصحيحي (حجر وإتلاف، إرجاع للمورد، إصلاح داخلي، أو قبول مشروط).
     - إدارة دورة حياة الـ NCR من الفتح وحتى التحقيق والحل والإغلاق.
  4. **واجهة المستخدم التفاعلية (QualityDashboardPage.tsx, RecordInspectionModal.tsx, CreateQCPointModal.tsx, CreateNCRModal.tsx):**
     - لوحة مؤشرات أداء تشغيلية: معدل القبول العام للجودة، إجمالي الفحوصات المنفذة، تقارير الـ NCR المفتوحة، والعيوب الحرجة النشطة.
     - 3 تبويبات متخصصة: سجل الفحوصات التفصيلي، مركز تقارير عدم المطابقة مع إجراءات التحقيق والإغلاق بنقرة واحدة، وإدارة نقاط ومعايير الجودة.
     - نوافذ منبثقة معيارية متوافقة تماماً مع معايير الـ UI البريميوم ودستور العدادات RTL وسياسة 0 إيموجيز.
* **الملفات المتصلة:**
  - `backend/src/database/migrations/2040000000175_quality_assurance_and_ncr.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/inventory/engines/quality-control.engine.ts`
  - `backend/test/quality-control-engine.spec.ts`
  - `backend/src/modules/inventory/dto/quality-assurance.dto.ts`
  - `backend/src/modules/inventory/services/quality-assurance.service.ts`
  - `backend/src/modules/inventory/controllers/quality-assurance.controller.ts`
  - `backend/src/modules/inventory/inventory.module.ts`
  - `frontend/src/features/inventory/api/quality-assurance.api.ts`
  - `frontend/src/features/inventory/components/quality/CreateQCPointModal.tsx`
  - `frontend/src/features/inventory/components/quality/RecordInspectionModal.tsx`
  - `frontend/src/features/inventory/components/quality/CreateNCRModal.tsx`
  - `frontend/src/features/inventory/pages/QualityDashboardPage.tsx`
  - `frontend/src/features/inventory/routes.tsx`
  - `frontend/src/app/router/access.ts`
* **التحقق البرمجي:**
  - اختبارات الوحدة للمحرك: `backend/test/quality-control-engine.spec.ts` بنجاح 100% لكافة سيناريوهات الفحص البصري والكمي والقبول المشروط واشتقاق خطورة عدم المطابقة.

---


<!-- migrated:cap-216:end -->
