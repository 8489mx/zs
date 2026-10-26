# قدرات الاستبدال والمستعمل

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **الاستبدال والمستعمل** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/tradein/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [الأصناف والوحدات والمتغيرات](CATALOG_CAPABILITIES.md) · [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [12. استبدال وتقييم المستعمل (Trade-in)](#cap-038)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-038"></a>
<!-- migrated:cap-038:start -->
## 12. استبدال وتقييم المستعمل (Trade-in)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/tradein`, `frontend/src/features/tradein`
* **الجداول في قاعدة البيانات:** `tradein_evaluations`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **تقييم وفحص الأجهزة المستعملة** | 🟢 | 100% | `tradein.service.ts`, `TradeinPage.tsx` | فحص حالة الجهاز المستعمل، تحديد السعر العادل، وتوليد إيصال استبدال رسمي. |
| **خصم قيمة المستعمل من فاتورة شراء جديدة** | 🟢 | 100% | `sales.service.ts`, `TradeinModal.tsx` | تنزيل قيمة الجهاز المستعمل كدفعة مقدمة / خصم من فاتورة بيع جديدة وإدخال المستعمل للمخزن. |

---


<!-- migrated:cap-038:end -->

### P0-C three-decimal acquisition follow-up (2026-10-25; branch only)

`tradein.service.ts` validates acquisition cost against the tenant base currency before stock/cash writes; `accounting-posting.service.ts` no longer calls a two-decimal quantizer before posting cash used-goods inventory. The PostgreSQL acceptance suite now checks a 0.001 KWD acquisition against source, stock/WAC, treasury and balanced GL, plus rejection of 0.0001. **New CI result is pending**. Bank/deferred exchanges, settlement reversals and other sector pathways are still open.

### P0-C default-bank trade-in acquisition (2026-10-26, review branch)

`backend/src/modules/tradein/tradein.service.ts` permits an immediate `paymentMethod: bank` acquisition with a registered physical stock receipt and a matching `treasury_transactions.payment_channel`. `AccountingPostingService.postTradeInCashPurchase` now selects the tenant-configured/default 1120 bank account (instead of 1110 cash) and verifies channel, exact tenant minor-unit amount, stock value and idempotent source before booking Dr 1140 / Cr bank. `CreateTradeInModal` offers cash/default-bank and uses currency-aware price steps. The PostgreSQL acceptance includes one-fil KWD bank payout/source/stock/GL and rejects unsupported rails; green final-head CI is required. The bank GL is an aggregate/default configured ledger, not confirmation that an external transfer occurred. Exchange, per-bank statement matching and reversal remain blocked.
