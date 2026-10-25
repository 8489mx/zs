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


### 2026-10-25 P0-C — Distributor purchase integration (pending final CI)

- `PharmacyService.importDistributorInvoice` now routes through `PurchasesService.createPurchase` with linked tenant supplier/product/warehouse, supplier invoice idempotency and purchase-line batch metadata. Canonical purchase commits stock, expiry lot, AP/cash and posted journal in a single DB transaction; paid versus bonus quantities preserve real supplier cost.
- `PharmacyService.upsertBatch` refuses direct quantity or unit-cost mutations, including zero-cost stock creation, and only permits batch metadata changes; `deleteDrug` rejects deleting catalog history referenced by batches. Production purchase handler cross-checks the linked pharmacy product during purchase.
- Unlinked catalog records and three-decimal pharmacy purchase totals deliberately fail closed pending safe product linking and full purchase-currency implementation; old unlinked batch records still need historical reconciliation.
- Regression: `backend/test/critical/pharmacy-distributor-purchase.spec.ts`, and `backend/test/acceptance/core-accounting.postgres.spec.ts` real-DB scenario.

### P0-C three-decimal supplier invoice (25 October 2026; review branch)

The distributor invoice adapter can now accept 2- or 3-digit tenant-currency vendor bills through canonical purchases after the purchase/AP source path was widened. Before posting any source, it reconciles each paid line's exact currency minor units to the stock quantity and diluted free-bonus unit cost, and rejects unrepresentable discrepancies. The source-purchase engine remains responsible for the single stock/treasury/AP/GL transaction, and the invoice idempotency key prevents duplicate receipt on replay. Disposable PostgreSQL regression checks KWD 0.002 paid cost, 2 paid + 1 bonus stock, lot, supplier balance, balanced journal and retry. This commit is **not** broad pharmacy certification; cash/FX, historical unlinked lots and partial supplier settlements remain open until separately verified.

### P0-C pharmacy clinical cash and prescription copay posting (25 October 2026 — review branch)

- `pharmacy.service.ts`, `pharmacy-accounting.ts` and `pharmacy.module.ts`: paid clinical services now commit source, treasury receipt and cash/service-revenue GL (1110/4200) atomically; failed posting rolls back the economic source.
- Prescription patient cash copays now use an atomic receipt and posted GL; zero copays are no longer silently turned into full invoice cash. Historical dispensed/collected prescriptions refuse destructive financial rewrites without a formal reversal. Insurance-funded dispensations explicitly fail closed until insurer receivable/subledger settlement exists.
- Money is validated in tenant minor units (KWD/OMR 0.001). The disposable PostgreSQL acceptance suite has cases for one-fil clinical fee, two-fil copay, journal/cash matching, forbidden financial edits, overprecision, insurance fail-closed and forced posting failure. **Do not claim release verification until CI on final SHA succeeds.**
- Not closed: prescription-to-stock sale/COGS, insurer AP/AR, reversal/refund workflow, cross-location expiry/lot and older unlinked data still require explicit coverage.

### P0-C prescription source deduplication (2026-10-25)

- A manually named prescription now obtains a tenant-and-number PostgreSQL transaction advisory lock before insert, rejecting concurrent/lost-response replay before a second treasury receipt. Posted GL also deduplicates pharmacy receipt source types. A paid prescription containing drug-name-only items is refused rather than recognizing sales revenue without physical stock / COGS provenance; it must use canonical sales/lot consumption instead.
- Disposable PostgreSQL coverage includes concurrent named prescription creation, exactly one source/cash/GL, a blocked unmapped medicine charge, and the earlier clinical/copay and locked-period rollback cases. Results and release signoff remain pending until the corresponding commit's CI completes.
