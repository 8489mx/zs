# قدرات الصيانة

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **الصيانة** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/maintenance/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [الخدمات](SERVICES_CAPABILITIES.md) · [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [10. الصيانة وأوامر الشغل وتذاكر الأجهزة (Maintenance & Repairs)](#cap-036)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-036"></a>
<!-- migrated:cap-036:start -->
## 10. الصيانة وأوامر الشغل وتذاكر الأجهزة (Maintenance & Repairs)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/maintenance`, `frontend/src/features/maintenance`
* **الجداول في قاعدة البيانات:** `maintenance_tickets`, `maintenance_ticket_parts`, `maintenance_ticket_history`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **استلام الأجهزة وتذاكر الصيانة والترقيم الذري** | 🟢 | 100% | `maintenance.service.ts`, `MaintenancePage.tsx` | فتح كارت/تذكرة صيانة، فحص الجهاز، تسجيل المشكلة، وتكلفة تقريبية مع باركود للجهاز.<br/>**تحصين سبتمبر 2026 (البند 12 — نفذه Antigravity):** القضاء التام على سباق تكرار أرقام التذاكر `COUNT(*)+1` عبر التحول للترقيم الذري بإدراج رقم مؤقت `TMP-ZM-...` ثم التسمية بالمعرف الحقيقي عبر المحرك القياسي الموحد `formatDailyDocumentNumber('ZM', ticketId)` داخل المعاملة الذرية، مع حماية المسارات بـ`PermissionsGuard` و`@RequireFeature('maintenance')`. |
| **تتبع مراحل الصيانة واستهلاك قطع الغيار** | 🟢 | 100% | `maintenance_ticket_parts`, `MaintenanceOrderModal.tsx` | ربط قطع الغيار المستخدمة من المخزن وخصمها من الرصيد وحساب أجر اليد. |
| **تسليم الجهاز وتحويله لفاتورة مبيعات** | 🟢 | 100% | `maintenance.controller.ts` | إنهاء الصيانة، تسليم الجهاز للعميل، وإصدار فاتورة وتحصيل المبلغ في الخزينة. |

---


<!-- migrated:cap-036:end -->


### P0-C — تكامل النقدية وقطع الغيار مع دفتر الأستاذ (25 أكتوبر 2026)

**التنفيذ على فرع المراجعة فقط، وليس اعتماداً للإصدار:** `maintenance.service.ts`, `maintenance-accounting.ts` و`maintenance.module.ts`.
- إنشاء تذكرة بعربون يسجل حركة خزينة وقيداً متوازناً **مدين نقدية 1110 / دائن دفعات عملاء مقدمة 2150** في المعاملة نفسها. لا يُعترف بالعربون كإيراد عند الاستلام.
- التسليم يعترف بإيراد الخدمات **4200** ويقفل الالتزام **2150**، ويثبت المتبقي في النقدية **1110** أو البنك **1120** حسب قناة التحصيل. يُرفض اختلاف المحصل عن المبلغ المستحق بدلاً من إصدار قيد ناقص؛ **المدفوعات الجزئية/المرتجعات والخصومات بعد التسليم غير مدعومة في هذا المسار بعد**.
- صرف قطعة غيار يستخدم `products.cost_price` المحمي بقفل المخزون (وليس `unitCost` القادم من العميل)، ويرفق تكلفة `stock_movements` ويقيد **5100 / 1140**. إرجاعها يعكس القيد ويعيد تسعير متوسط التكلفة المرجح بقيمتها التاريخية.
- يُحظر حذف تذكرة بها عربون أو حالة تسليم أو قطع لم ترجع، وتغيير العربون مباشرة، وإعادة الترحيل بعد التسليم؛ مسار الاسترداد/الإلغاء المدقق الكامل ما زال مفتوحاً.
- دليل الاختبار المحدد: سيناريو `backend/test/acceptance/core-accounting.postgres.spec.ts` يغطي العربون والتسليم وإعادة المحاولة والقطع وWAC ومنع الحذف والتحصيل الناقص. **إضافة سيناريو لا تعني نجاحه حتى تظهر نتائج CI الخاصة بالـSHA المرفوع.**

### P0-C precision follow-up (2026-10-25; branch only)

Maintenance advance, exact delivery settlement, and spare-part issue/return GL now use tenant base-currency minor units (`maintenance-accounting.ts`, `maintenance.service.ts`), rather than hardcoded two-decimal rounding. KWD/OMR 0.001 values and sub-minor-unit rejection are covered by disposable PostgreSQL acceptance scenarios; **CI on the new SHA must complete before declaring test success**. Refunds, cancellations, partial delivery credit, UI and 8-cycle reconciliation remain unverified.
