# قدرات الصيدليات

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **الصيدليات** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/pharmacy/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [المبيعات ونقاط البيع](SALES_CAPABILITIES.md) · [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [13. الصيدليات وإدارة أرقام التشغيلات وتواريخ الصلاحية (Pharmacy & Batches & FEFO) 🥫💊](#cap-039)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-039"></a>
<!-- migrated:cap-039:start -->
## 13. الصيدليات وإدارة أرقام التشغيلات وتواريخ الصلاحية (Pharmacy & Batches & FEFO) 🥫💊
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/pharmacy/pharmacy.service.ts`, `backend/src/modules/pharmacy/pharmacy.controller.ts`, `backend/src/modules/sales/services/sales-write.service.ts`, `backend/src/modules/manager-actions/manager-actions.service.ts`, `backend/src/database/migrations/2040000000008_pharmacy_module.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/pharmacy/pages/PharmacyBatchesExpiryPage.tsx`, `frontend/src/features/pharmacy/pages/PharmacyDrugsPage.tsx`, `frontend/src/features/pharmacy/types/pharmacy.types.ts`
* **الجداول في قاعدة البيانات:** `pharmacy_batches`, `pharmacy_drugs`, `drug_interactions`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **تسجيل أرقام التشغيلات وتواريخ الصلاحية (Batch & Expiry Registration)** | 🟢 | 100% | `pharmacy.service.ts`, `PharmacyBatchesExpiryPage.tsx`, `pharmacy_batches` | تسجيل رقم التشغيلة (Batch Number)، تاريخ الانتهاء (Expiry Date)، الكمية بالعلب، سعر التكلفة، اسم الشركة الموزعة، والحالة التشغيلية (`active`, `near_expiry`, `expired`, `returned`) مع أزرار سريعة لاختيار المدد (+6 شهور، +سنة، +سنتين، +3 سنوات). |
| **محرك الصرف الأسبق صلاحية ومنع بيع المنتهي (FEFO Engine & Expired Sale Blocker)** | 🟢 | 100% | `sales-write.service.ts` | خوارزمية صرف إجبارية في نقطة البيع POS مرتبة تصاعدياً بالأسبق انتهاءً (`.orderBy('expiry_date', 'asc')`) مع خصم رصيد الباتش لحظياً وتحويله لـ `depleted` عند نفاده؛ وإطلاق خطأ نظامي صارم يمنع بيع الصنف إذا كانت صلاحيته منتهية (`EXPIRED_BATCH_SALE_FORBIDDEN`). |
| **شاشة تتبع الصلاحيات ومرتجعات الشركات (Batches & Expiry Management)** | 🟢 | 100% | `PharmacyBatchesExpiryPage.tsx` | شاشة متكاملة تعرض عدادات حية: تشغيلات سارية صالحة 🟢، وشيكة الانتهاء (أقل من 3 شهور) 🟡، منتهية الصلاحية (اكسباير) 🔴، وتم إرجاعه لشركات التوزيع ⚪، مع إمكانية البحث والفلترة وإضافة وتعديل التشغيلات مباشرة. |
| **رادار الصلاحيات القريبة وإجراءات المدير (Manager Expiry Actions Radar)** | 🟢 | 100% | `manager-actions.service.ts`, `manager-actions.helper.ts` | استعلام آلي مدمج في لوحة المدير (`loadPharmacyBatches`) يجلب التشغيلات القريبة من الانتهاء لإتاحة اتخاذ قرارات فورية بعمل عروض وتخفيضات عليها في صالة العرض أو ردها للموردين. |
| **دليل الأدوية والمواد الفعالة والتفاعلات الدوائية** | 🟢 | 100% | `pharmacy.service.ts`, `PharmacyDrugsPage.tsx` | البحث بالاسم التجاري والعلمي، والبدائل المتاحة، وتنبيهات التفاعلات الدوائية الخطرة. |

---


<!-- migrated:cap-039:end -->
