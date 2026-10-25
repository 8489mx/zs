# قدرات المرتجعات

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **المرتجعات** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/returns/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المبيعات ونقاط البيع](SALES_CAPABILITIES.md) · [المشتريات والموردون](PURCHASES_CAPABILITIES.md) · [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## نقطة البداية من التنفيذ

لم يكن لهذا المجال قسم مستقل في السجل القديم؛ لا يعني ذلك عدم وجوده.

مرتجعات البيع والشراء وربط البنود بالمصدر وحركة المخزون وتسوية الطرف والترحيل. المصدر: `backend/src/modules/returns/returns.service.ts`. راجع أيضاً ملفات المبيعات والمشتريات والمخزون والمحاسبة قبل تغيير الدورة.

حالة التغطية: وصف حدود من خريطة النظام، وليس تدقيقاً تفصيلياً أو نتيجة اختبارات جديدة. يلزم استكمال قائمة العمليات واختبارات كل عملية أثناء مراجعة المجال.

### P0-C 2026-10-25 — KWD/OMR return and partner settlement precision (review branch)

- Sales and vendor return sources now use tenant monetary minor units for cumulative line-value allocation, credited/refunded amounts and historical inventory cost movements. Refund tender split and supplier payable allocation preserve 0.001; `AccountingPostingService` uses the same digits for return journal line aggregation. Additive migration 259 widens posted return values without lossy rollback.
- Critical pure tests verify 0.001 returns and receivable/cash tender routing. Disposable real PostgreSQL acceptance covers return source, AR/AP, physical stock and posted balanced journals. Results pending on the new SHA; partial refunds, taxed multi-item mixed tenders, exchanges and historical reconciliation remain open.
