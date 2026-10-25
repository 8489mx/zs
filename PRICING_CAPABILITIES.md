# قدرات التسعير والعروض

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **التسعير والعروض** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/addons/`، `backend/src/modules/pricing/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [الأصناف والوحدات والمتغيرات](CATALOG_CAPABILITIES.md) · [المبيعات ونقاط البيع](SALES_CAPABILITIES.md) · [المطاعم والأغذية](RESTAURANT_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [28. محرك العروض الترويجية المتقدمة والباقات (Advanced Promotions, BOGO & Happy Hours Engine)](#cap-054)
- [31. محرك حماية هامش الربح وتحديث الأسعار التلقائي عند غلاء المورد (Margin Protection & Smart Repricing Engine) 🛡️📈](#cap-056)
- [70. قوائم أسعار العملاء وشرائح الكميات (Customer Price Lists & Volume Tiers)](#cap-095)
- [70. قوائم أسعار العملاء وشرائح الكميات (Customer Price Lists & Volume Tiers)](#cap-104)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-054"></a>
<!-- migrated:cap-054:start -->
## 28. محرك العروض الترويجية المتقدمة والباقات (Advanced Promotions, BOGO & Happy Hours Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومُدقق بالكامل عبر كافة قنوات البيع
* **مسارات الكود:**
  * **قاعدة البيانات والترحيل:** `backend/src/database/migrations/2040000000040_advanced_promotions_bogo_happy_hours.ts`, `backend/src/database/database.types.ts`
  * **الباك إند وبوابة اعتماد الأسعار:** `backend/src/modules/sales/helpers/sales-write.helper.ts`, `backend/src/modules/sales/services/sales-write.service.ts`, `backend/src/modules/catalog/dto/upsert-product.dto.ts`, `backend/src/modules/catalog/services/catalog-product.service.ts`
  * **التوزيع الميداني (فانات ومندوبين):** `backend/src/modules/delivery-reps/van-sales.service.ts`, `backend/src/modules/delivery-reps/services/van-pre-sales.service.ts`
  * **المتجر الإلكتروني العام:** `frontend/src/features/storefront/lib/storefront-offers.engine.ts`, `frontend/src/features/storefront/components/`
  * **محرك حساب الكاشير والـ POS:** `frontend/src/features/pos/lib/pos.domain.ts`
  * **أوامر البيع الإدارية:** `frontend/src/features/sales/components/CreateSalesOrderModal.tsx`
  * **واجهة العروض الموحدة (Ctrl+Alt+S):** `frontend/src/features/products/components/ProductOfferDialog.tsx`, `frontend/src/features/products/components/offers/ProductOfferItemEditorTab.tsx`, `frontend/src/types/domain-models/catalog.ts`
* **الجداول في قاعدة البيانات:** `product_offers` (`offer_type` يدعم `'bogo'`, `'bundle'`, `'price'`, `'fixed'`, `'percent'`, `bogo_buy_qty`, `bogo_get_qty`, `bogo_discount_percent`, `happy_hour_start`, `happy_hour_end`, `days_of_week`), `combo_offers`, `combo_offer_items`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **محرك عروض BOGO المتقدم (اشترِ X واحصل على Y مجاناً أو بخصم)** | 🟢 | 100% | `pos.domain.ts`, `sales-write.helper.ts`, `van-sales.service.ts`, `van-pre-sales.service.ts`, `storefront-offers.engine.ts` | محرك رياضي دوري متقدم (Cycle-based BOGO) يدعم سيناريوهات الترويج الكبرى: اشترِ 2 واحصل على 1 مجاناً (100%)، أو اشترِ 1 واحصل على الثاني بنصف السعر (50%)، مع حساب دقيق لمجموعات الشراء وبواقي القطع الفردية، وتزامن كامل وموحد بين شاشات الكاشير، بوابات الترحيل في الباك إند، فانات البيع، والمتجر الإلكتروني. |
| **محرك الساعات الذهبية ومواعيد العرض (Happy Hours & Day-of-Week Scheduling)** | 🟢 | 100% | `pos.domain.ts`, `sales-write.helper.ts`, `sales-write.service.ts`, `ProductOfferItemEditorTab.tsx` | جدولة تلقائية متقدمة للعروض حسب أوقات اليوم (مثلاً من 16:00 إلى 20:00)، أو عروض منتصف الليل العابرة لليومين (مثلاً 22:00 إلى 02:00)، مع حصر أيام التطبيق (عطلة نهاية الأسبوع الجمعة والسبت، يوم الجمعة فقط، أو أيام العمل الأحد إلى الخميس). ينشط العرض وينتهي لحظياً في الكاشير وتتحقق منه بوابات اعتماد الأسعار في الباك إند بدقة التوقيت المحلي. |
| **المزامنة الشاملة عبر قنوات البيع والتوزيع (Cross-Channel Synchronization)** | 🟢 | 100% | `sales-write.helper.ts`, `van-sales.service.ts`, `van-pre-sales.service.ts`, `CreateSalesOrderModal.tsx` | معالجة وسد فجوات احتساب العروض عبر كافة المنافذ: فانات البيع الميداني، طلبات الحجز المسبق (Pre-sales)، أوامر البيع الإدارية، وفواتير الكاشير، مما يضمن ظهور شارات العروض وسعر البيع الفعلي وعدم رفض بوابات الباك إند لأي خصم مشروع صادر بموجب عرض نشط. |
| **محاكي التوفير والربحية الفوري (Realtime Cart & Margin Simulator)** | 🟢 | 100% | `ProductOfferItemEditorTab.tsx`, `ProductOfferDialog.tsx` | معاينة فورية ديناميكية في نافذة العرض توضح التكلفة الأصلية، السعر بعد تطبيق دورة BOGO، نسبة التوفير المحققة للعميل، ومتوسط سعر القطعة، مع تنبيه ذكي فوري باللون الأحمر إذا نزل سعر البيع الترويجي عن سعر تكلفة الصنف لتفادي الخسائر. |
| **واجهة العروض الموحدة والمطهرة (Clean Enterprise Offers Modal - Ctrl+Alt+S)** | 🟢 | 100% | `ProductOfferDialog.tsx`, `ProductOfferItemEditorTab.tsx` | نافذة موحدة نظيفة ومطورة، تم فيها إزالة الهيدر الداخلي المكرر وزر الإغلاق المزدوج لتتوافق 100% مع معايير StandardDialog وحظر النوافذ المتداخلة، مع تبويبات سريعة للتنقل بين عروض الصنف والعروض المجمعة وإمكانية الاستدعاء السريع بالاختصار العالمي Ctrl+Alt+S. |
| **عروض الباقات والوجبات المجمعة (Bundle Packs & Combo Meals / BOM)** | 🟢 | 100% | `pos.domain.ts`, `sales-write.service.ts`, `ProductOfferComboCreatorTab.tsx`, `ProductOfferActiveCombosTab.tsx` | دعم عروض الكميات المجمعة (Bundle Packs)، وعروض الوجبات المجمعة (كومبو) مع تفجير آلي لشجرة المكونات (BOM Auto-Production) وخصم مكوناتها ومخزونها بالترتيب القانوني للأقفال (Canonical Lock Order) فور البيع دون أي تضارب. |
| **حزمة الاختبارات الشاملة والتدقيق البرمجي (Critical Offers Test Suite)** | 🟢 | 100% | `comprehensive-offers-audit.spec.ts`, `sales-write.helper.spec.ts`, `pos.domain.spec.ts` | حزمة اختبارات تدقيقية صارمة بنسبة نجاح 100% تغطي كافة أنماط العروض الـ 8 (نسبة، مبلغ، سعر بديل، باقات، BOGO، ساعات سعيدة، جدولة أيام، كومبو مع خصم مخزني) وتؤكد مطابقة الحسابات المالية وسلامة مسارات الترحيل. |

---

---


<!-- migrated:cap-054:end -->

<a id="cap-056"></a>
<!-- migrated:cap-056:start -->
## 31. محرك حماية هامش الربح وتحديث الأسعار التلقائي عند غلاء المورد (Margin Protection & Smart Repricing Engine) 🛡️📈
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/purchases/services/margin-protection.service.ts`, `backend/src/modules/purchases/purchases.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/purchases/api/margin-protection.api.ts`, `frontend/src/features/purchases/components/MarginProtectionModal.tsx`, `frontend/src/features/purchases/components/PurchasesWorkspace.tsx`, `frontend/src/features/purchases/components/PurchaseComposer.tsx`
* **الجداول في قاعدة البيانات:** `products`, `purchases`, `purchase_items`, `audit_logs`, `tenants`, `settings`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **كشف زيادات تكلفة المورد وحساب هوامش الربح الفورية** | 🟢 | 100% | `margin-protection.service.ts`, `margin-protection.api.ts` | فحص فوري ومقارنة آلية لتكلفة الصنف السابقة مقابل التكلفة الجديدة الواردة في فاتورة المشتريات، مع حساب نسبة التغير في التكلفة وهامش الربح المحقق حالياً عند البيع بالأسعار القديمة. |
| **خوارزمية تسعير البيع الذكية لحماية الهامش المستهدف** | 🟢 | 100% | `margin-protection.service.ts`, `MarginProtectionModal.tsx` | حساب تلقائي لسعر البيع القطاعي والجملة الموصى بهما وفق معادلة الحماية: `RetailPrice = NewCost / (1 - TargetMargin / 100)` مع إتاحة شريط تمرير تفاعلي مرن لاختيار نسبة الربح المستهدفة (مثلاً 25% أو 30%) وإعادة احتساب الأسعار المقترحة فورياً. |
| **كشف وتحذير الأصناف الخاسرة ومنكمشة الهامش** | 🟢 | 100% | `margin-protection.service.ts`, `MarginProtectionModal.tsx` | تنبيه مرئي فوري عريض للأصناف الخاسرة (التي تباع بأقل من سعر التكلفة الجديد - Negative Margin) والأصناف التي تآكل هامش ربحها بنسبة خطرة مقارنة بالمستهدف. |
| **التحديث الذري الفوري بضغطة زر واحدة في الكاشير (1-Click Reprice)** | 🟢 | 100% | `margin-protection.service.ts`, `purchases.controller.ts` | اعتماد وتحديث أسعار البيع المعتمدة مباشرة في جدول الأصناف (`products`) وتحديث كاتالوج نقاط البيع والكاشير فورياً دون الحاجة لفتح شاشات المنتجات يدوياً، مع تسجيل كامل في سجل التدقيق الأمني. |
| **طباعة فورية لبطاقات الرفوف والأسعار الجديدة (Shelf Talkers Print)** | 🟢 | 100% | `MarginProtectionModal.tsx` | تنسيق طباعة مؤسسي احترافي `@media print` يتيح طباعة بطاقات رفوف أنيقة ومباشرة بالأصناف المحدثة وأسعارها الجديدة والقديمة والباركود لتعليقها على الأرفف فور استلام البضاعة. |
| **تنبيه واتساب فوري واستباقي لمالك المتجر** | 🟢 | 100% | `margin-protection.service.ts`, `whatsapp-gateway.service.ts` | إرسال تقرير موجز ومنسق عبر بوابة الواتساب السحابية لهاتف المالك فور تحديث الأسعار يوضح عدد الأصناف المعدلة وأسماء أبرزها لحمايته من أي خسائر ناتجة عن التضخم. |
| **موجات التسعير الجماعية وقواعد التسعير التلقائية (Bulk Pricing Waves & Rules)** | 🟢 | 100% | `pricing.service.ts`, `pricing_rules`, `price_change_runs`, `price_change_items` | معاينة وتطبيق موجات التسعير بنسب مئوية أو مبالغ ثابتة أو هوامش من التكلفة، مع دعم التقريب (nearest/ending)، وتطبيق الترتيب القانوني للأقفال لمنع الـ Deadlocks مع إمكانية التراجع الذري الآمن بقفل تشاؤمي. |

---



<!-- migrated:cap-056:end -->

<a id="cap-095"></a>
<!-- migrated:cap-095:start -->
## 70. قوائم أسعار العملاء وشرائح الكميات (Customer Price Lists & Volume Tiers)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Sales Pricelists (Multiple Prices per Product & Volume Discounts).
* **روابط وشاشات الوصول:** `/sales/price-lists` (القائمة الجانبية: المبيعات ➔ قوائم أسعار العملاء).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000061_customer_price_lists.ts`, `backend/src/database/database.types.ts` (`price_lists`, `price_list_items`).
  * **الباك إند:** `backend/src/modules/sales/services/price-lists.service.ts`, `backend/src/modules/sales/controllers/price-lists.controller.ts`, `backend/src/modules/sales/sales.module.ts`.
  * **الفرونت إند:** `frontend/src/features/sales/api/price-lists.api.ts`, `frontend/src/features/sales/pages/PriceListsPage.tsx`, `frontend/src/features/sales/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **قوائم تسعير مخصصة للعملاء والفئات:** إمكانية إنشاء قوائم أسعار متعددة (جملة، تجزئة، موزعين، VIP) وتعيين عملة وتواريخ صلاحية لكل قائمة.
  2. **شرائح أسعار تصاعدية حسب الكمية (Volume Discount Tiers):** دعم تحديد أسعار تفضيلية تلقائية بناءً على كميات الشراء (مثلاً: من 10 إلى 50 قطعة بسعر، ومن 51 إلى 100 قطعة بسعر أقل).
  3. **أولوية التسعير الذكية (Pricing Hierarchy):** أولوية تلقائية تطبق السعر الأفضل أو المخصص للعميل في شاشات عروض الأسعار وأوامر البيع مع بيان فرق الخصم الممنوح.

---


<!-- migrated:cap-095:end -->

<a id="cap-104"></a>
<!-- migrated:cap-104:start -->
## 70. قوائم أسعار العملاء وشرائح الكميات (Customer Price Lists & Volume Tiers)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Sales Pricelists (Multiple Prices per Product & Volume Discounts).
* **روابط وشاشات الوصول:** `/sales/price-lists` (القائمة الجانبية: المبيعات ➔ قوائم أسعار العملاء).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000061_customer_price_lists.ts`, `کمbackend/src/database/database.types.ts` (`price_lists`, `price_list_items`).
  * **الباك إند:** `backend/src/modules/sales/services/price-lists.service.ts`, `backend/src/modules/sales/controllers/price-lists.controller.ts`, `backend/src/modules/sales/sales.module.ts`.
  * **الفرونت إند:** `frontend/src/features/sales/api/price-lists.api.ts`, `frontend/src/features/sales/pages/PriceListsPage.tsx`, `frontend/src/features/sales/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **قوائم تسعير مخصصة للعملاء والفئات:** إمكانية إنشاء قوائم أسعار متعددة (جملة، تجزئة، موزعين، VIP) وتعيين عملة وتواريخ صلاحية لكل قائمة.
  2. **شرائح أسعار تصاعدية حسب الكمية (Volume Discount Tiers):** دعم تحديد أسعار تفضيلية تلقائية بناءً على كميات الشراء (مثلاً: من 10 إلى 50 قطعة بسعر، ومن 51 إلى 100 قطعة بسعر أقل).
  3. **أولوية التسعير الذكية (Pricing Hierarchy):** أولوية تلقائية تطبق السعر الأفضل أو المخصص للعميل في شاشات عروض الأسعار وأوامر البيع مع بيان فرق الخصم الممنوح.

---


<!-- migrated:cap-104:end -->
