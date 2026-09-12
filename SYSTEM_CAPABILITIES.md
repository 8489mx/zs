# سجل قدرات ومنظومة Z-Systems (System Capabilities & Feature Matrix)

> **وثيقة مرجعية موحدة ودائمة لكافة ميزات ووحدات النظام**  
> **تاريخ آخر تحديث شامل:** سبتمبر 2026  
> **الغرض:** الحصر الدقيق لكل سطر كود وشاشة ووحدة في النظام (Backend & Frontend) لمنع اقتراح أي ميزة منجزة بالفعل، وتحديد ما هو مكتمل 100%، وما هو جزئي، وما هو متبقي فعلياً.  
> **قاعدة إلزامية:** أي ميزة جديدة يتم إضافتها أو تطويرها في النظام يجب توثيقها وتحديث حالتها في هذا الملف فوراً.

---

## بيئة التشغيل والاستضافة السحابية المعتمدة (Cloud Hosting & Infrastructure)
> ⚠️ **تنبيه حاسم لكافة المطورين والمساعدين الذكيين:**  
> المنظومة بالكامل (Frontend، Backend، Database - PostgreSQL) مستضافة ومُشغلة حصرياً على **سيرفر أوراكل (Oracle Cloud VPS)**.  
> **تم إنهاء وإلغاء أي وجود أو استخدام لـ هوستنجر (Hostinger) نهائياً.** لا تبحث ولا ترجع لأي ملفات أو إعدادات أو مسارات قديمة تخص هوستنجر إطلاقاً. المرجع الحصري الوحيد لبيئة الإنتاج السحابية هو سيرفر أوراكل.

---

## دلالات شارات الحالة (Status Badges)
- 🟢 **مكتمل 100% (Production Ready):** الواجهة مكتملة، الـ Backend مكتمل، قاعدة البيانات مربوطة، وتم اختباره واعتماده.
- 🟡 **مكتمل جزئياً (Partial / In Progress):** مكتمل بنسبة محددة (مع توضيح ما ينقصه بدقة).
- 🔴 **غير منجز / مقترح (Planned / Not Started):** فكرة مستقبلية غير مطبقة كوداً حتى الآن.

---

## 1. المتجر الإلكتروني وقنوات البيع الموحدة (Storefront & Omnichannel)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/storefront`, `frontend/src/features/storefront`
* **الجداول في قاعدة البيانات:** `tenants`, `settings`, `online_orders`, `storefront_coupons`, `storefront_delivery_zones`, `product_reviews`, `products`, `product_categories`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **واجهة الكتالوج العام للمتجر** | 🟢 | 100% | `PublicStorefrontPage.tsx`, `storefront.service.ts` | تصفح الأصناف، الأقسام، شريط البحث الفوري، فرز الأسعار، والمفضلة. |
| **سلة المشتريات التفاعلية** | 🟢 | 100% | `StorefrontCartDrawer.tsx`, `StorefrontProductCard.tsx` | درج سلة جانبي، تعديل الكميات (+ و - بنظام RTL صحيح)، وحساب المجاميع فورياً. |
| **نافذة إتمام الطلب المحكمة** | 🟢 | 100% | `StorefrontCheckoutModal.tsx` | تحقق صارم برقم الموبايل المصري (11 رقم: 010/011/012/015)، الاسم، العنوان، وتثبيت زر الطلب Sticky CTA. |
| **تتبع الطلبات المباشر «طلباتي»** | 🟢 | 100% | `StorefrontCustomerOrderCard.tsx`, `StorefrontMyOrdersModal.tsx` | شريط مراحل تتبع حي (تم الاستلام ➔ جاري التجهيز ➔ مع المندوب ➔ تم التسليم) مع إمكانية إلغاء وتعديل الطلب وهو pending. |
| **ربط بيانات ومحادثة مندوب التوصيل** | 🟢 | 100% | `StorefrontCustomerOrderCard.tsx` | عند خروج الطلب مع المندوب يظهر اسمه ورقمه مع زر اتصال `tel:` ومحادثة واتساب مباشرة `wa.me`. |
| **كوبونات الخصم والعروض الترويجية** | 🟢 | 100% | `StorefrontCouponsManager.tsx`, `coupon.dto.ts` | كوبونات خصم (نسبة مئوية مع سقف، مبلغ ثابت، أو شحن مجاني)، حدود استخدام، وتطبيق لحظي في الدفع. |
| **قاعدة الشحن المجاني التلقائي** | 🟢 | 100% | `StorefrontSettingsTab.tsx`, `StorefrontCheckoutModal.tsx` | إلغاء مصاريف التوصيل تلقائياً عند تجاوز سلة العميل حداً أدنى يحدده التاجر مع شريط تقدم تسويقي. |
| **تسعير التوصيل الذكي حسب المنطقة/المحافظة** | 🟢 | 100% | `StorefrontDeliveryZonesManager.tsx`, `delivery-zone.dto.ts` | مصفوفة مناطق وشحن، قوالب جاهزة بضغطة زر (محلي وشحن محافظات)، اختيار المنطقة بدقة، وحساب الفاتورة فورياً. |
| **تكامل واتساب المباشر والتلقائي** | 🟢 | 100% | `storefront.service.ts`, `whatsapp-gateway.service.ts` | توليد رابط رسالة واتساب منسقة بالتفاصيل، وإشعار فوري عبر بوابة الواتساب عند كل طلب جديد. |
| **استوديو وضبط صور الأصناف** | 🟢 | 100% | `StorefrontProductStudio.tsx`, `image-compressor.ts` | ضغط الصور، قص، ورفع ومعاينة مباشرة لصور الكتالوج والتصنيفات. |
| **بوابات الدفع الإلكتروني المتكاملة (Tap GCC & Stripe & Paymob & XPay & Mock)** | 🟢 | 100% | `storefront-payment.service.ts`, `StorefrontPaymentGatewaysManager.tsx`, `StorefrontOnlinePaymentModal.tsx`, `storefront-public.controller.ts` | دعم متكامل وشامل لـ 5 بوابات دفع رئيسية: **تاب (Tap Payments الخليجية)** لدعم بطاقات مدى السعودية 🇸🇦، شبكة كي نت الكويتية 🇰🇼، بطاقات ناباس القطرية 🇶🇦، وبطاقات بنفت 🇧🇭، و **Stripe العالمية 🌍** لدعم كافة البطاقات الدولية و Apple Pay و Google Pay، بالإضافة إلى **Paymob** و **XPay** للمدفوعات المصرية و **Sandbox Mock**، مع تأكيد سداد آلي عبر الـ Webhooks وإشعارات واتساب فورية. |
| **لوحة إدارة الطلبات للتاجر** | 🟢 | 100% | `MerchantOnlineOrdersPage.tsx`, `ConvertDeliveryModal.tsx` | متابعة الطلبات، الفلترة حسب الحالة، وتنزيل الطلب بنقرة واحدة في سلة الـ POS أو تحويله مباشرة لفاتورة دليفري مع مندوب. |

---

## 2. نقاط البيع والمبيعات والكاشير (POS & Sales Management)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/sales`, `backend/src/modules/sessions`, `backend/src/modules/cash-drawer`, `frontend/src/features/pos`, `frontend/src/features/sales`
* **الجداول في قاعدة البيانات:** `sales`, `sale_items`, `cashier_sessions`, `cash_drawer_transactions`, `pos_drafts`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **شاشة الكاشير السريعة وأنماط العرض (POS Workspace & Sale Modes)** | 🟢 | 100% | `PosWorkspace.tsx`, `PosCart.tsx`, `pos-sale-modes.css` | نمطان رئيسيان للبيع بتصميم مؤسسي نظيف بنظام العمودين المتجاوبين: نمط «سكانر» لمنافذ الباركود السريع والسوبرماركت مع تركيز واسع على السلة، ونمط «تاتش» لشاشات اللمس والأجهزة اللوحية والكاونتر مع شبكة بطاقات بصرية، مع تجاوب تلقائي وسلس لكافة مقاسات الشاشات والموبايل. |
| **طرق الدفع المتعددة والمجزأة** | 🟢 | 100% | `PaymentModal.tsx`, `sales.service.ts` | نقدي، فيزا/ماستركارد، آجل، محافظ إلكترونية، مع إمكانية تجزئة الفاتورة الواحدة بين أكثر من طريقة دفع. |
| **تعليق واسترجاع الفواتير (Park/Hold Cart)** | 🟢 | 100% | `pos-drafts`, `HoldCartModal.tsx` | تعليق الفاتورة لخدمة زبون آخر واسترجاعها بضغطة زر واحدة. |
| **الورديات والجلسات النقدية (Shifts)** | 🟢 | 100% | `sessions.service.ts`, `CashDrawerPage.tsx`, `CashDrawerFormsPanel.tsx`, `ShiftModal.tsx` | فتح الوردية برصيد افتتاحي، إغلاق الوردية، جرد الكاش الفعلي، ربط زر إغلاق الوردية في الكاشير بالبوب اب المباشر فورياً عبر `?action=close`، وحساب العجز والزيادة تلقائياً. |
| **حركات درج النقدية والمصروفات النثرية** | 🟢 | 100% | `cash-drawer.service.ts`, `CashDrawerModal.tsx` | تسجيل سحب نقدية، إيداع نقدية، دفع مصروفات من الدرج، مع ترحيلها لقيود اليومية. |
| **إلغاء ومرتجع الفواتير وصلاحيات المدير** | 🟢 | 100% | `returns.service.ts`, `manager-actions.service.ts` | مرتجع كامل أو جزئي، طلب إذن المدير للخصومات أو الإلغاء، وتأثير المرتجع على المخزون والخزينة. |
| **طباعة الفواتير والإيصالات الحرارية وإعادة الطباعة السريعة** | 🟢 | 100% | `pos-printing.ts`, `thermal-receipt.ts`, `PosRecentSalesReprintModal.tsx` | دعم طابعات الإيصالات (80mm و 57mm)، طباعة A4، وطباعة تلقائية عند حفظ الفاتورة مع باركود QR، وتسلسل رسمي موحد للفاتورة، مع نافذة إعادة طباعة الفواتير والريسيت الفورية (F9 لآخر فاتورة وقائمة آخر 5 فواتير) بتصميم مؤسسي نظيف وأزرار مدمجة وخالٍ من البانرات القاتمة. |
| **البيع بدون إنترنت والمزامنة الذكية (Offline POS)** | 🟢 | 100% | `usePosOfflineSync.ts`, `PosOfflineQueueModal.tsx`, `lazy-route.tsx`, `CashDrawerFormsPanel.tsx` | حفظ محلي للفواتير والكتالوج، توليد تسلسلات فواتير نظامية معتمدة، حماية التنقل بين الشاشات بدون إنترنت، استعادة الجلسة بأمان، نافذة إدارة ومراجعة الفواتير المعلقة، تنبيه ومنع إغلاق الوردية قبل ترحيل الفواتير المعلقة، ومزامنة ذكية تلقائية فور عودة الاتصال مع تجديد مفاتيح الـ Idempotency ومعالجة القيود المحاسبية الآمنة بتصميم مؤسسي نظيف. |
| **توجيه المخزون الذكي ورسائل الرصيد التفاعلية** | 🟢 | 100% | `sales-write.service.ts`, `createPosWorkspaceAsyncActions.ts` | عند عدم كفاية الرصيد في المخزن الحالي، يقوم النظام ديناميكياً بفحص سائر المخازن وعرض رسالة ترشد الكاشير لاسم المخزن الحالي ورصيده، مع بيان المخازن البديلة التي يتوفر بها الصنف وكمياتها. |
| **فك وتشفير باركود الميزان الوزني في الكاشير (Weighted Barcode Scanner Decryption)** | 🟢 | 100% | `weighted-barcode.ts`, `PosWorkspace.tsx`, `SettingsMainForm.tsx` | قراءة وتفكيك باركود الميزان الوزني الصادر من موازين السوبرماركت والمحامص (مثل `200001012500`) بدقة، استخراج كود الصنف، والوزن بالجرام/الكيلو، واحتساب السعر تلقائياً وفق إعدادات البادئة وعدد خانات الوزن والكسور العشرية المضبوطة في النظام. |
| **إشعارات الواتساب الفورية للمالك عند إغلاق الوردية والمرتجعات (Shift Close & Refund WhatsApp Alerts)** | 🟢 | 100% | `whatsapp-gateway.service.ts`, `cash-drawer.service.ts`, `returns.service.ts` | إرسال رسالة واتساب تلقائية فورية للمالك عند إغلاق أي كاشير للوردية (تتضمن اسم الكاشير، الفرع، رصيد الافتتاح، مبيعات الكاش، العجز/الزيادة، وملاحظات الإغلاق)، بالإضافة لإشعار فوري عند إجراء أي مرتجع مبيعات نقدي. |
| **شاشة متابعة المالك المتنقلة (Owner Mobile Companion PWA)** | 🟢 | 100% | `OwnerCompanionPage.tsx`, `app-shell.tsx` | لوحة متابعة مصممة خصيصاً لهاتف المالك لمراقبة المبيعات الحية، الورديات المفتوحة، وتنبيهات النواقص، مع دعم التثبيت المباشر كتطبيق PWA بنقرة واحدة دون الحاجة لمتاجر التطبيقات. |
| **تكامل ماكينات الدفع البنكي الذكية في الكاشير (Smart POS Terminal Integration)** | 🟢 | 100% | `pos-terminal.service.ts`, `pos-terminal.controller.ts`, `PosCheckoutDialogSections.tsx`, `SalesInventorySettingsTab.tsx`, `pos.api.ts` | تكامل مباشر مع ماكينات الدفع الإلكتروني البنكية (Geidea, Paymob Smart POS, Network International, Mock Sandbox)؛ تمرير مبلغ الفاتورة تلقائياً لشاشة الماكينة عبر الشبكة المحلية (IP / ECR Direct)، قراءة حالة العملية ومتابعة السحب بنظام Polling حي، وقيد كود التفويض البنكي (Auth Code) ورقم البطاقة آلياً في الفاتورة دون تدخل يدوي من الكاشير، مع تخصيص الماكينات وإدارتها بالكامل من شاشة الإعدادات. |
| **استيراد المبيعات الخارجية (Bulk Sales Import)** | 🟢 | 100% | `import-sales.service.ts`, `import-sales` | استيراد فواتير مبيعات سابقة من ملفات Excel و CSV مع التحقق والمطابقة. |
| **هيدر الكاشير الذكي ودمج خريطة الصالة والطلبات المعلقة (Unified Floor Plan & Suspended Orders Hub)** | 🟢 | 100% | `PosWorkspaceHeader.tsx`, `PosTablesFloorPlanDialog.tsx`, `PosWorkspace.tsx`, `PosWorkspaceDock.tsx`, `createPosWorkspaceBaseActions.helpers.ts` | دمج وتوحيد خريطة الصالة وإدارة الطاولات مع الفواتير المعلقة في نافذة شاملة واحدة (`PosTablesFloorPlanDialog`) بتصميم ذكي متعدد التبويبات (تبويب خريطة الصالة التفاعلية للطاولات الشاغرة والمشغولة ونقل الطاولات + تبويب قائمة الفواتير المعلقة والتيك أواي مع أزرار الاسترجاع والحذف وحذف الكل ودعم اختصارات لوحة المفاتيح)، مع إظهار شريط سريع للطلبات الخارجية والتيك أواي داخل خريطة الصالة ذاتها، وتوحيد اختصار F3 وزر الهيدر العلوي وزر الدوك السفلي ليفتحا نفس النافذة الموحدة في نمط المطاعم، مع الحفاظ الصارم بنسبة 100% على عمل نافذة الفواتير المعلقة التقليدية السريعة (`PosHeldDraftsDialog`) بدون أي تشويش لكاشير المحلات والتجزئة العادية. |
| **شاشة العميل الرقمية (POS Customer-Facing Display)** | 🟢 | 100% | `CustomerFacingDisplayPage.tsx`, `pos-customer-display.css`, `usePosWorkspace.ts` | شاشة مستقلة موجهة للعميل تعرض تفاصيل السلة الحالية والأسعار والعروض التسويقية وتحديث السلة آنياً بنظام البث المحلي/المزامنة. |
| **شاشات العروض الرقمية والأسعار (Digital Signage & Price Board)** | 🟢 | 100% | `DigitalSignagePage.tsx`, `SignageHeader.tsx`, `SignageNavDrawer.tsx`, `sales/routes.tsx`, `app-shell.tsx` | لوحة عرض تفاعلية ترويجية لقوائم الأسعار والعروض الترويجية في صالة العرض مع تحديث ديناميكي للمنتجات والأسعار، مزودة بزر عودة فوري للنظام ولوحة التحكم وزر دروج جانبي سحابي للتنقل السريع بين أقسام المنظومة وحماية نسخة الديسكتوب (Electron) من الاحتجاز مع دعم زر Esc. |
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/inventory`, `backend/src/modules/catalog`, `frontend/src/features/inventory`, `frontend/src/features/products`
* **الجداول في قاعدة البيانات:** `products`, `product_units`, `product_categories`, `warehouses`, `inventory_transactions`, `stock_adjustments`, `stock_transfers`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **دليل المنتجات والوحدات المتعددة** | 🟢 | 100% | `catalog.service.ts`, `ProductsPage.tsx` | صنف مع وحدات متعددة (قطعة/كرتونة مع معامل التحويل)، وسعر وتكلفة لكل وحدة. |
| **المستودعات المتعددة (Multi-Warehouse)** | 🟢 | 100% | `inventory.service.ts`, `WarehousesPage.tsx` | تعريف عدة مخازن وفروع، وتحديد رصيد كل صنف في كل مخزن على حدة. |
| **التحويلات المخزنية بين الفروع والمستودعات** | 🟢 | 100% | `stock_transfers`, `TransfersPage.tsx` | نقل بضاعة بين المخازن مع دورة اعتماد وتحديث الأرصدة تلقائياً. |
| **أذون التسوية والإضافة والصرف المخزني** | 🟢 | 100% | `stock_adjustments`, `AdjustmentsPage.tsx` | إثبات الهالك، بضاعة تالفة، عجز مخزني، أو بضاعة مهداة مع الترحيل المحاسبي. |
| **الجرد الفعلي الدوري والمفاجئ** | 🟢 | 100% | `StockCountPage.tsx`, `inventory.service.ts` | جرد المخزون الفعلي ومقارنته بالدفتري واستخراج فروق الجرد وتوليد تسوية فورية. |
| **تنبيهات النواقص والحد الأدنى للطلب** | 🟢 | 100% | `LowStockAlerts.tsx`, `inventory.service.ts` | كشف الأصناف التي قاربت على النفاد بناءً على حد إعادة الطلب. |
| **حركة كارت الصنف التفصيلية (Stock Card)** | 🟢 | 100% | `ProductHistoryModal.tsx` | تتبع كل حركة دخول وخروج ورقم الفاتورة والرصيد المتبقي للصنف بالتاريخ والوقت. |
| **تصدير وبرمجة موازين الباركود الإلكترونية (Scale PLU Export Engine)** | 🟢 | 100% | `ScalePluExportModal.tsx`, `ProductsWorkspace.tsx` | توليد وتصدير ملفات الأصناف والأسعار المتوافقة بضغطة زر لمختلف موازين الباركود الأكثر انتشاراً في السوق: Rongta (RLS1000 / RLink)، CAS (CL5000 / CL-Works)، Dibal (Series 500 / Wind)، وملف Universal Excel/CSV، مع ترقيم الـ PLU التلقائي، وتطبيع طول الأكواد، وإرشادات التنزيل المباشر للميزان. |
| **أرقام التشغيلات وتواريخ الصلاحية ونظام FEFO** | 🟢 | 100% | `pharmacy_batches`, `sales-write.service.ts`, `PharmacyBatchesExpiryPage.tsx` | تتبع رقم التشغيلة (Batch) وتاريخ الانتهاء، وصرف الأسبق انتهاءً تلقائياً في الكاشير مع حظر بيع المنتهي الصلاحية نهائياً (انظر تفاصيل الوحدة 13). |
| **تتبع التشغيلات وتواريخ الصلاحية الشامل لكافة الأنشطة (Universal Batches & Expiry)** | 🟢 | 100% | `InventoryBatchesPage.tsx`, `purchases-write.service.ts`, `pharmacy.service.ts`, `inventory/routes.tsx` | شاشة شاملة لإدارة وتتبع أرقام التشغيلات وتواريخ الانتهاء في المخازن العامة للصيدليات والأغذية والتوزيع والتجزئة عبر المسار `/inventory/batches`، وتحديث تلقائي لبيانات التشغيلة عند الشراء، مع مؤشرات ذكية وتمديد الصلاحية السريع (+3M, +6M, +1Y, +2Y). |
| **مركز التسعير الجماعي ومحاكاة الأثر المالي (Batch Pricing Center & Financial Simulation)** | 🟢 | 100% | `PricingCenterPage.tsx`, `PricingScopeFormulaSection.tsx`, `PricingSimulationSection.tsx`, `PricingPreviewTableSection.tsx`, `PricingRunsHistorySection.tsx`, `pricing.service.ts` | محرك تسعير جماعي ذكي ومتقدم للأصناف عبر المسار `/pricing-center`، يشمل تحديد نطاق الأصناف حسب المورد أو القسم أو نوع الصنف، ومعادلات زيادة أو تخفيض الأسعار (نسبة، قيمة ثابتة، هامش ربح من التكلفة) مع قواعد التقريب الذكية، وشاشة محاكاة مالية فورية متجاوبة جنباً إلى جنب مع نطاق التسعير لاحتساب أثر التعديل على قيمة المخزون وهوامش الربح وفحص أمان التكلفة، وجدول معاينة تفصيلي لقبل وبعد، مع سجل تدقيق كامل لموجات التسعير وإمكانية التراجع الفوري بضغطة زر. |



---

## 4. المشتريات وحسابات الموردين (Purchases & Suppliers)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/purchases`, `backend/src/modules/partners`, `frontend/src/features/purchases`, `frontend/src/features/suppliers`
* **الجداول في قاعدة البيانات:** `purchases`, `purchase_items`, `purchase_returns`, `suppliers`, `supplier_transactions`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **تسجيل فواتير المشتريات** | 🟢 | 100% | `purchases.service.ts`, `PurchasesPage.tsx` | إضافة فواتير المشتريات، تعديل متوسط التكلفة (Moving Average Cost)، وتغذية المخزون فوراً. |
| **مرتجع المشتريات للمورد** | 🟢 | 100% | `purchase_returns`, `PurchaseReturnsPage.tsx` | إرجاع بضاعة للمورد، خصمها من المخزن وتخفيض مديونية المورد أو استرداد نقدي. |
| **سجل وحسابات الموردين (Supplier Ledger)** | 🟢 | 100% | `partners.service.ts`, `SuppliersPage.tsx` | كشف حساب تفصيلي، أرصدة سابقة، مديونيات، وسجل الفواتير السابقة. |
| **سندات صرف دفعات الموردين** | 🟢 | 100% | `treasury.service.ts`, `PaymentVoucherModal.tsx` | سداد نقدي أو شيك أو تحويل بنكي للمورد وخصمه من الخزينة وكشف حساب المورد. |
| **محرك تكاليف الشحن والجمارك الموزعة (Purchase Landed Costs Engine)** | 🟢 | 100% | `purchase-landed-costs.service.ts`, `purchases.controller.ts`, `PurchaseLandedCostsModal.tsx`, `PurchaseDetailCard.tsx`, `2040000000054_purchase_landed_costs.ts` | محرك احتساب تكاليف الشحن البحري والجوي والتخليص الجمركي والنقل والتأمين الإضافية وتوزيعها آلياً حسب القيمة أو الكمية على بنود فاتورة المشتريات، وتحديث تكلفة الوحدة المخزنية `landed_unit_cost` وسعر التكلفة `cost_price` في المخازن، وتوليد القيود المحاسبية المقابلة. |
| **مقترح إعادة الطلب والتوريد الذكي (Smart Reorder & Procurement Suggestions)** | 🟢 | 100% | `SmartReorderPage.tsx`, `purchases.api.ts`, `SmartReorderStats.tsx`, `SmartReorderFilters.tsx`, `SmartReorderSupplierGroupCard.tsx` | تحليل معدلات استهلاك المخزون وأيام التغطية وفترة التوريد عبر المسار `/purchases/reorder` بتصميم مؤسسي قياسي مطابق لـ `installments` مع هيدر النظام وعمود العرض الموحد `document-prototype-column`, وتجميع مقترحات الشراء آلياً حسب الموردين، وتوليد مسودات أوامر شراء مجمعة لكافة الموردين بنقرة واحدة. |
| **أوامر الشراء ومحدد الأصناف والموردين الذكي (Purchase Orders & Searchable Selector)** | 🟢 | 100% | `PurchaseOrdersPage.tsx`, `CreatePurchaseOrderModal.tsx`, `purchase-orders.api.ts`, `SearchableCombobox.tsx` | إدارة أوامر الشراء وإصدارها للموردين عبر المسار `/purchases/orders`؛ نافذة إنشاء أمر شراء ذكية مزودة بمحدد أصناف وموردين سحابي عائم (`SearchableCombobox`) يدعم البحث الفوري بالاسم أو الباركود أو رقم الهاتف والتطبيع التلقائي للأحرف العربية، مع التعبئة التلقائية لأسعار التكلفة الحالية والوحدات والاحتساب اللحظي للإجماليات دون قص النوافذ. |
| **طلبات عروض أسعار الموردين ومصفوفة المقارنة الترسية (Vendor RFQs & Quotation Comparison Matrix)** | 🟢 | 100% | `purchase-rfqs.service.ts`, `purchase-rfqs.controller.ts`, `PurchaseRfqsPage.tsx`, `CreateRfqModal.tsx`, `RfqBidsModal.tsx`, `RfqComparisonMatrixModal.tsx`, `PurchasesWorkspace.tsx`, `2040000000067_purchase_rfqs.ts` | دورة مشتريات وتوريد متكاملة تضاهي Odoo 17 و Dynamics 365 BC عبر المسار `/purchases/rfqs` مع زر وصول مباشر في شريط أدوات مساحة المشتريات الرئيسية؛ إنشاء طلبات عروض الأسعار وتحديد بنود الأصناف والكميات المطلوبة وتاريخ الإغلاق، دعوة الموردين، تسجيل عروض الأسعار المتلقاة من كل مورد (سعر الوحدة، مدة التوريد، شروط السداد، وملاحظات الجودة)، مصفوفة مقارنة بصرية تحليلية تبرز العرض الأفضل سعراً والأسرع توريداً، مع ترسية العرض الفائز بنقرة واحدة وتحويله تلقائياً لأمر شراء رسمي معتمد (PO). |


---

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

---

## 6. مناديب التوصيل والدليفري (Delivery Representatives & Fleet)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/delivery-reps`, `frontend/src/features/delivery-reps`
* **الجداول في قاعدة البيانات:** `delivery_representatives`, `delivery_representative_settlements`, `sales`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **سجل مناديب التوصيل والبيانات** | 🟢 | 100% | `delivery-reps.service.ts`, `DeliveryRepsPage.tsx` | إدارة المناديب، أرقام هواتفهم، العمولات، وتحديد المندوب النشط. |
| **إسناد الفواتير والطلبات للمندوب** | 🟢 | 100% | `ConvertDeliveryModal.tsx`, `sales.service.ts` | تسليم الطلبات للمندوب وتغيير حالتها إلى "خرج للتوصيل" مع طباعة إيصال الدليفري. |
| **بوابة وتطبيق السائق المتنقل وتأكيد التسليم (Driver Mobile Portal & PWA)** | 🟢 | 100% | `DriverPortalPage.tsx`, `driver-portal.controller.ts`, `DeliverySettlementModal.tsx`, `delivery-reps.service.ts` | بوابة موبايل مستقلة تماماً عبر الرابط المباشر `/driver` معزولة عن لوحة تحكم الـ ERP؛ تتيح للمندوب تسجيل الدخول السريع برقم هاتفه ورمز الـ PIN المكون من 4 أرقام، وتدعم التثبيت المباشر كـ PWA؛ توفر أزرار اتصال سريع وواتساب وخرائط لكل طلب، ونافذة تسليم احترافية تشمل: **توقيع العميل الإلكتروني باللمس (Touch Canvas Signature)**، **التقاط صورة إثبات التسليم بالكاميرا مباشرة**، **رصد إحداثيات الـ GPS الجغرافية التلقائي**، وحفظ الملاحظات. |
| **التسليم أوفلاين وطابور المزامنة الذكية (Driver Offline Queue)** | 🟢 | 100% | `DeliveryDriverMobilePage.tsx`, `delivery-reps.api.ts` | تمكين المندوب من تأكيد تسليم الشحنات وتسجيل التوقيعات والصور حتى في حالة انعدام تغطية الإنترنت (Offline)، مع حفظ العمليات محلياً وإظهار مؤشر عدم الاتصال، وزر مزامنة فورية ومزامنة تلقائية عند عودة الشبكة. |
| **تصفية عهدة المندوب والتحصيل (Settlement)** | 🟢 | 100% | `DeliveryRepSettlementModal.tsx` | استلام متحصلات الفواتير من المندوب، حصر المرتجعات، حساب عمولة التوصيل، وتوريد النقدية للخزينة. |

---

## 7. المحاسبة والمالية والخزينة (Accounting, Finance & Treasury)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/accounting`, `backend/src/modules/treasury`, `frontend/src/features/accounting`, `frontend/src/features/treasury`
* **الجداول في قاعدة البيانات:** `chart_of_accounts`, `journal_entries`, `journal_entry_lines`, `treasuries`, `bank_accounts`, `treasury_transactions`, `fixed_assets`, `asset_depreciation_logs`, `accounting_fiscal_years`, `tamper_audit_logs`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **دليل الحسابات الشجري (Chart of Accounts)** | 🟢 | 100% | `accounting.service.ts`, `ChartOfAccountsPage.tsx` | أصول، خصوم، حقوق ملكية، إيرادات، ومصروفات بتسلسل محاسبي معتمد. |
| **التوجيه المحاسبي التلقائي (Automated Posting)** | 🟢 | 100% | `accounting-posting.service.ts` | توليد قيود اليومية آلياً عند كل عملية بيع، شراء، مرتجع، سداد، أو حركة خزينة بدون تدخل بشري. |
| **قيود اليومية اليدوية (Manual Journal Entries)** | 🟢 | 100% | `JournalEntriesPage.tsx`, `accounting.service.ts` | إدخال قيود محاسبية يدوية وتدقيق توازن الطرفين المدين والدائن. |
| **ميزان المراجعة والأستاذ العام (Trial Balance)** | 🟢 | 100% | `TrialBalancePage.tsx`, `GeneralLedgerPage.tsx` | ميزان المراجعة بالمجاميع والأرصدة، وحركات كل حساب في الأستاذ العام. |
| **قائمة الدخل والأرباح والخسائر (P&L Statement)** | 🟢 | 100% | `IncomeStatementPage.tsx` | حساب صافي الربح التشغيلي والنهائي بناءً على المبيعات وتكلفة المبيعات والمصروفات. |
| **الخزائن والحسابات البنكية وحركات النقدية** | 🟢 | 100% | `treasury.service.ts`, `TreasuryPage.tsx` | إدارة عدة خزائن وبنوك، سندات القبض والصرف، والتحويل بين الخزائن. |
| **سجل الأصول الثابتة وكروت الأصول (Fixed Assets Registry)** | 🟢 | 100% | `AccountingFixedAssetsPage.tsx`, `accounting.service.ts`, `2040000000024_fixed_assets.ts` | إدارة كاملة للأصول الثابتة عبر المسار `/accounting/fixed-assets`: تسجيل بيانات الأصل، الكود، التصنيف (سيارات، معدات، أثاث، أجهزة كمبيوتر، مباني، عام)، تاريخ وتكلفة الشراء، القيمة التخريدية (Salvage Value)، والعمر الإنتاجي بالشهور، مع حساب آلي لحظي لصافي القيمة الدفترية ومجمع الإهلاك وإجمالي تكلفة أصول المؤسسة. |
| **محرك الإهلاك التلقائي وقيود اليومية الآلية (Auto-Depreciation Engine)** | 🟢 | 100% | `AccountingFixedAssetsPage.tsx`, `accounting.service.ts`, `fixed-assets-depreciation.spec.ts` | محرك إهلاك مالي دقيق يدعم طريقتي: القسط الثابت (Straight-Line) والقسط المتناقص المزدوج (Double Declining Balance) مع حماية سقف القيمة التخريدية؛ إمكانية تشغيل الإهلاك لأصل منفرد أو تشغيل دورة إهلاك مجمعة لكافة أصول الشركة بنقرة واحدة، مع إنشاء الحسابات تلقائياً (حـ/ مصروف إهلاك 6950، وحـ/ مجمع إهلاك 1290) وتوليد قيود يومية متوازنة آلياً في الأستاذ العام وتسجيل كامل في جدول `asset_depreciation_logs`. |
| **محرك التسوية والمطابقة البنكية الذكية (Smart Bank Reconciliation Engine)** | 🟢 | 100% | `bank-reconciliation.service.ts`, `accounting.controller.ts`, `BankReconciliationPage.tsx`, `2040000000053_bank_reconciliation.ts` | محرك تسوية بنكية متكامل بمعيار أودو 17 و SAP B1 عبر المسار `/accounting/bank-reconciliation`، يشمل استيراد كشوف الحسابات البنكية، المطابقة الآلية الذكية بالسجل والمبلغ (Auto Match)، المطابقة اليدوية المزدوجة بنظام العمودين، احتساب رصيد الإغلاق، وتحديث حالة أسطر اليومية. |
| **نظام إغلاق الفترات المالية المحاسبية (Fiscal Lock Dates & Governance)** | 🟢 | 100% | `accounting-validation.service.ts`, `AccountingSettingsPage.tsx`, `ManualJournalEntryDialog.tsx`, `2040000000052_accounting_lock_dates.ts` | حوكمة محاسبية صارمة تمنع التعديل أو الترحيل في الفترات المقفلة عبر 3 مستويات: إغلاق لكافة المستخدمين، إغلاق للمستخدمين العاديين مع استثناء المستشار المالي، وإغلاق ضريبي للإقرارات، مع نافذة متوازنة للقيود اليومية اليدوية. |
| **الميزانية العمومية وقائمة المركز المالي الرسمية (Balance Sheet / IAS 1 / IFRS)** | 🟢 | 100% | `balance-sheet.service.ts`, `BalanceSheetPage.tsx`, `accounting.controller.ts` | تقرير المركز المالي المعتمد دولياً عبر المسار `/accounting/balance-sheet`: تقسيم قياسي للأصول (متداولة وغير متداولة)، الخصوم (متداولة وطويلة الأجل)، وحقوق الملكية، مع ترحيل آلي لحظي لصافي أرباح الفترة الحالية من قائمة الدخل، وفحص التوازن الذهبي الآلي (`الأصول = الخصوم + حقوق الملكية`)، ومقارنة الفترات السابقة (نفس التاريخ من العام الماضي أو تاريخ مخصص)، وتصدير CSV والطباعة المعتمدة. |
| **قائمة التدفقات النقدية المعيارية (Cash Flow Statement / IAS 7)** | 🟢 | 100% | `cash-flow.service.ts`, `CashFlowStatementPage.tsx`, `accounting.controller.ts` | تقرير حركة السيولة المعياري عبر المسار `/accounting/cash-flow`: تصنيف دقيق للتدفقات النقدية وفق معيار IAS 7 إلى (أنشطة تشغيلية، أنشطة استثمارية، أنشطة تمويلية)، واحتساب صافي التغير في النقدية، مع مطابقة آلية دقيقة 100% مع الأرصدة الفعلية للخزائن والحسابات البنكية، ودعم الفلاتر والاختصارات السريعة وتصدير CSV. |
| **تقرير أعمار الديون التحليلي للعملاء والموردين ومطالبات الواتساب (Aged Receivables & Payables)** | 🟢 | 100% | `aged-debts.service.ts`, `AgedDebtsPage.tsx`, `accounting.controller.ts` | نظام تحصيل ومتابعة ديون متفوق على أودو و SAP عبر المسار `/accounting/aged-debts`: تبويبان منفصلان لديون العملاء والموردين، تقسيم زمني لـ 5 شرائح معيارية (حالي، 1-30، 31-60، 61-90، +90 يوم حرج)، شارات تقييم المخاطرة اللونية، رصد تاريخ وعدد أيام أقدم فاتورة، وزر إرسال واتساب فوري للعملاء المتعثرين بنقرة واحدة لرسالة مطالبة ودية منسقة مع تصدير CSV. |
| **حافظة الشيكات البنكية وأوراق القبض والدفع (PDC Cheques Management)** | 🟢 | 100% | `pdc-cheques.service.ts`, `PdcChequesPage.tsx`, `accounting.controller.ts`, `2040000000057_pdc_cheques_management.ts` | دورة متكاملة لإدارة أوراق القبض (شيكات العملاء) وأوراق الدفع (شيكات الموردين) عبر المسار `/accounting/cheques`: 6 بطاقات مؤشرات أداء (إجمالي، في الخزينة، برسم التحصيل، محصلة، مرتدة، تستحق خلال 7 أيام أو متأخرة)، دورة حياة كاملة للشيك (إيداع بنكي برسم التحصيل، تحصيل بنكي، صرف أوراق الدفع، تسجيل الارتداد مع الأسباب والمصاريف، التظهير لموردين آخرين، الاسترجاع للخزينة)، فلاتر متقدمة، معاينة وطباعة سند استلام شيك / إيصال رسمي معتمد، وتصدير CSV. |
| **معالج إقفال السنوات المالية وترحيل الأرباح وحوكمة الفترات (Fiscal Year-End Closing Engine)** | 🟢 | 100% | `fiscal-year.service.ts`, `AccountingFiscalYearsPage.tsx`, `FiscalYearCloseWizardModal.tsx`, `CreateFiscalYearModal.tsx`, `ReopenFiscalYearModal.tsx`, `2040000000068_accounting_fiscal_years.ts` | محرك محاسبي متكامل يضاهي Odoo 17 Enterprise و Microsoft Dynamics 365 BC عبر المسار `/accounting/fiscal-years`: إدارة الفترات المحاسبية السنوية، التدقيق المالي الآلي قبل الإقفال (Pre-Closing Audit) للتحقق من ترحيل كافة المسودات، محاكاة قيد الإقفال السنوي لتصفير أرصدة قائمة الدخل (إيرادات 4xxx ومصروفات 5xxx/6xxx)، ترحيل صافي الأرباح أو الخسائر آلياً إلى حساب الأرباح المحتجزة (3200)، توليد قيد إقفال متزن 100%، تحديث وتأمين تاريخ القفل الشامل للنظام لمنع القيود بأثر رجعي، مع دعم كامل لإعادة فتح السنة المالية بشرط المبرر الإداري والترتيب الزمني العكسي. |
| **سجل التدقيق الجنائي المشفّر غير القابل للتلاعب وسلاسل التجزئة (Tamper-evident Cryptographic Audit Trail)** | 🟢 | 100% | `tamper-audit.service.ts`, `tamper-audit.controller.ts`, `TamperAuditTrailTab.tsx`, `TamperAuditDiffModal.tsx`, `tamper-audit.api.ts`, `2040000000069_tamper_evident_audit_trail.ts`, `2040000000070_tamper_audit_deterministic_hash.ts` | منظومة رقابة جنائية أمنية متقدمة تعمل على مستوى محرك قاعدة البيانات PostgreSQL مباشرة (Database Triggers) وسلاسل تجزئة تشفيرية متسلسلة (SHA-256 Hash Chaining تحاكي تقنيات البلوكشين Merkle/Hash Chain) عبر المسار `/audit`: حظر نهائي للحذف أو التعديل على سجل التدقيق (Append-Only Immutable Table)، رصد فوري لكافة عمليات INSERT و UPDATE و DELETE على 11 جدولاً حرجاً في النظام (القيود، أطراف القيود، شجرة الحسابات، إعدادات الحسابات، فواتير وبنود المبيعات، فواتير وبنود المشتريات، الخزائن وسندات القبض والصرف)، تسجيل تفاصيل الفوارق الحقلية (Field-Level Diff) بدقة بين القديم والجديد، زر فحص ومطابقة نزاهة السلسلة التشفيرية بنقرة واحدة (Cryptographic Integrity Verifier)، وكشف أي محاولة تلاعب يدوي من داخل قاعدة البيانات مباشرة (psql / pgAdmin) أو من التطبيق. |
| **الجدولة المؤتمتة لقيود إهلاك الأصول الثابتة (Automated Depreciation Scheduler)** | 🟢 | 100% | `fixed-assets-scheduler.service.ts`, `accounting.controller.ts`, `AccountingFixedAssetsPage.tsx`, `accounting.module.ts` | محرك جدولة خلفي دوري مؤتمت يفحص نهاية كل شهر ميلادي لكافة منشآت النظام المفعلة، ويشغل دورة الإهلاك الشهرية للأصول الثابتة النشطة، ويولد قيود اليومية المتوازنة تلقائياً في الأستاذ العام ويسجل العمليات في `asset_depreciation_logs` مع لوحة تحكم سريعة في واجهة الأصول لتفعيل/تعطيل الجدولة أو تشغيل الإهلاك الفوري بضغطة زر. |
| **مصفوفة وقوالب توزيع مراكز التكلفة بالنسب المئوية (Hierarchical Cost Center Allocation Matrix)** | 🟢 | 100% | `cost-center-allocations.service.ts`, `CostCenterAllocationsTab.tsx`, `AccountingCostCentersPage.tsx`, `cost-centers.api.ts`, `2040000000072_cost_center_allocation_matrices.ts` | محرك توزيع تحليلي متقدم يضاهي SAP و Dynamics 365 BC عبر المسار `/accounting/cost-centers` (تبويب قوالب التوزيع)؛ إمكانية إنشاء قوالب توزيع مسبقة الإعداد لتقسيم المصروفات المشتركة على عدة مراكز تكلفة بنسب مئوية محكمة مع تحقق صارم من اكتمال النسبة 100%، شريط توزيع لوني تفاعلي، محاكي مالي لاحتساب المبالغ الموزعة لحظياً، وتطبيق القوالب على بنود وسطور المصروفات والفواتير. |
| **محرك تقييم العملات الأجنبية وأرباح وخسائر فروق الصرف IAS 21 (Multi-Currency FX Revaluation Engine)** | 🟢 | 100% | `forex-revaluation.service.ts`, `accounting.controller.ts`, `AccountingForexRevaluationPage.tsx`, `forex.api.ts`, `2040000000073_forex_revaluation_engine.ts` | معيار المحاسبة الدولي IAS 21 لإعادة تقييم الحسابات والأرصدة بالعملات الأجنبية في نهاية كل فترة مالية عبر المسار `/accounting/forex`؛ قراءة فورية لأرصدة الحسابات النقدية والبنكية وحسابات العملاء والموردين بالعملة الأجنبية ومقارنة سعر الصرف الدفتري مع سعر الإقفال الحالي، واحتساب فروق الصرف غير المحققة (Unrealized FX Gain/Loss)، وتوليد وترحيل قيد تسوية آلي متزن في الأستاذ العام (حـ/ أرباح أو خسائر فروق العملة 4920/5920) وحفظ تقرير التدقيق وسجل الدورات. |


---

## 8. الضرائب والفاتورة الإلكترونية المصرية والخليجية (Tax Integration)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/tax-integration`, `frontend/src/features/settings`
* **الجداول في قاعدة البيانات:** `tax_settings`, `eta_invoices`, `zatca_invoices`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **ضريبة القيمة المضافة (VAT)** | 🟢 | 100% | `vat-declaration.service.ts` | حساب ضريبة القيمة المضافة 14% تلقائياً، إقرار ضريبي دوري، وإظهار الرقم الضريبي في الفواتير. |
| **الفاتورة الإلكترونية المصرية (ETA Integration)** | 🟢 | 100% | `eta-submission.service.ts`, `eta-serializer` | الربط مع مصلحة الضرائب المصرية، التوقيع الإلكتروني، وتصدير بصيغة JSON المعتمدة مع UUID. |
| **الفاتورة الإلكترونية السعودية (ZATCA Phase 1 & 2)** | 🟢 | 100% | `zatca/zatca.service.ts` | تشفير QR Code بتنسيق TLV المتوافق مع متطلبات هيئة الزكاة والضريبة والجمارك. |

---

## 9. الموارد البشرية والرواتب (HR & Payroll)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/hr`, `frontend/src/features/hr`
* **الجداول في قاعدة البيانات:** `employees`, `attendance`, `payroll_runs`, `employee_advances`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **دليل الموظفين والملفات الشخصية** | 🟢 | 100% | `hr.service.ts`, `EmployeesPage.tsx` | بيانات الموظفين، الرواتب الأساسية، البدلات، المسميات الوظيفية، وتاريخ التعيين. |
| **حركات الحضور والانصراف والغياب** | 🟢 | 100% | `attendance`, `AttendancePage.tsx` | تسجيل ساعات الحضور والانصراف والغياب والأيام الإضافية. |
| **مسير الرواتب والسلف والخصومات** | 🟢 | 100% | `payroll_runs`, `PayrollPage.tsx`, `hr-treasury` | احتساب المرتبات شهرياً، استقطاع السلف والغياب، وصرف الرواتب وترحيلها للخزينة والمصروفات. |
| **بوابة الخدمة الذاتية للموظف (Employee Self-Service Portal)** | 🟢 | 100% | `EmployeePortalPage.tsx`, `employee-portal.service.ts`, `employee-portal.controller.ts` | بوابة مخصصة للموظف تتيح له تسجيل الدخول بكوده الوظيفي وكلمة المرور المشفرة للاطلاع على ملفه، رصيد الإجازات، سجل الحضور، مفردات المرتب، وتقديم طلبات السلف والإجازات مع عزل كامل لصلاحيات الإدارة. |
| **إدارة العهد العينية والنقدية للموظفين (Employee Custody & Assets)** | 🟢 | 100% | `HrAssetsPage.tsx`, `hr.service.ts`, `hr_employee_assets`, `employee-portal.service.ts` | نظام كامل لإدارة العهد العينية (سيارات، لابتوبات، هواتف، أجهزة) والنقدية، وتتبع تسليمها واسترجاعها، مع إثبات تلقائي للخصومات المالية على راتب الموظف عند التلف أو الفقدان، وربطها الصارم بإخلاء الطرف وتصفية مستحقات نهاية الخدمة (`endOfService`) وبوابة الموظف الذاتية (`EmployeePortalPage`). |
| **ملف حماية الأجور والرواتب البنكي (WPS / SIF Payroll Export)** | 🟢 | 100% | `hr.service.ts`, `hr.controller.ts`, `PayrollWpsExportModal.tsx`, `HrPayrollPage.tsx`, `2040000000055_hr_employee_bank_details.ts` | معيار BambooHR و Deel للشركات: تسجيل الحسابات البنكية للموظفين والآيبان IBAN وكود السويفت SWIFT، وتصدير ملف حماية الأجور المعتمد للبنوك الخليجية والسعودية والمصرية (تنسيق SIF: سجل المؤسسة SCR + سجلات الموظفين EDR) وملف CSV المعتمد بنقرة واحدة من صفحة الرواتب. |


---

## 10. الصيانة وأوامر الشغل (Maintenance & Repairs)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/maintenance`, `frontend/src/features/maintenance`
* **الجداول في قاعدة البيانات:** `maintenance_orders`, `maintenance_items`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **استلام الأجهزة وأوامر الشغل** | 🟢 | 100% | `maintenance.service.ts`, `MaintenancePage.tsx` | فتح كارت صيانة، فحص الجهاز، تسجيل المشكلة، وتكلفة تقريبية مع باركود للجهاز. |
| **تتبع مراحل الصيانة واستهلاك قطع الغيار** | 🟢 | 100% | `maintenance_items`, `MaintenanceOrderModal.tsx` | ربط قطع الغيار المستخدمة من المخزن وخصمها من الرصيد وحساب أجر اليد. |
| **تسليم الجهاز وتحويله لفاتورة مبيعات** | 🟢 | 100% | `maintenance.controller.ts` | إنهاء الصيانة، تسليم الجهاز للعميل، وإصدار فاتورة وتحصيل المبلغ في الخزينة. |

---

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

## 12. استبدال وتقييم المستعمل (Trade-in)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/tradein`, `frontend/src/features/tradein`
* **الجداول في قاعدة البيانات:** `tradein_evaluations`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **تقييم وفحص الأجهزة المستعملة** | 🟢 | 100% | `tradein.service.ts`, `TradeinPage.tsx` | فحص حالة الجهاز المستعمل، تحديد السعر العادل، وتوليد إيصال استبدال رسمي. |
| **خصم قيمة المستعمل من فاتورة شراء جديدة** | 🟢 | 100% | `sales.service.ts`, `TradeinModal.tsx` | تنزيل قيمة الجهاز المستعمل كدفعة مقدمة / خصم من فاتورة بيع جديدة وإدخال المستعمل للمخزن. |

---

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

## 14. المساعد الذكي والتحليلات التنبؤية (AI Copilot & Smart Forecasts)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/ai-copilot`, `frontend/src/features/ai-copilot`
* **الوصف:** استقراء وتحليل بيانات المبيعات، اقتراح خطط إعادة الطلب التلقائية للأصناف الأكثر رواجاً، وتوقع فترات الركود والذروة.

---

## 15. إدارة المنصة والساس وتعدد المستأجرين (SaaS Admin & Multi-Tenancy)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/saas-admin`, `backend/src/modules/tenant-subscription`, `frontend/src/features/saas-admin`
* **الجداول في قاعدة البيانات:** `tenants`, `tenant_subscriptions`, `subscription_plans`, `platform_users`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **عزل بيانات المستأجرين الصارم (Strict Tenant Isolation)** | 🟢 | 100% | `tenant-boundary.ts`, `Database.ts` | كل استعلام في النظام مقيد بالـ `tenant_id` لمنع أي تسريب بين العملاء نهائياً. |
| **هندسة الباقات الأربعة المعتمدة (4-Tier SaaS Matrix)** | 🟢 | 100% | `saas-admin.service.ts`, `plan-feature.service.ts`, `TenantSubscriptionPage.tsx`, `DeveloperActivationPanel.tsx`, `2040000000035_align_plans_matrix_and_modular_tiers.ts` | هيكل تسعير واشتراكات متدرج ومحكم بدقة: <br>1. **الأساسية (Basic - 3,500 ج.م):** 4 ميزات فقط (المبيعات ونقاط البيع POS، المنتجات والأصناف، ورديات العمل والكاشير، وصندوق الكاشير والخزينة والمصروفات). <br>2. **الاحترافية (Pro - 7,500 ج.م):** 7 ميزات (ما سبق في الأساسية + إدارة المشتريات والموردين، المخزون المتقدم والجرد، والتقارير المتقدمة وسجل النشاط). <br>3. **المتكاملة (Ultimate ERP - 15,000 ج.م):** 21 ميزة (ما سبق في الاحترافية + شجرة الحسابات، الأصول الثابتة، التقسيط، الفاتورة الإلكترونية، الإقرار الضريبي، الموارد البشرية، المناديب، نقاط الولاء، الصيانة وسيريال IMEI، الملابس، المطاعم، التصنيع، الاستيراد، والصيدليات - **بدون المتجر الإلكتروني**). <br>4. **التجارة الشاملة (Omnichannel Enterprise - 24,000 ج.م):** 22 ميزة بالكامل (كافة ميزات المتكاملة + المتجر الإلكتروني وطلبات الأونلاين وبوابات الدفع الإلكتروني Paymob/XPay/Stripe). |
| **إدارة الموديولات المفعلة ونظام القفل والترقية (Modular Toggles & Paywall)** | 🟢 | 100% | `ModulesSettingsTab.tsx`, `settings.schema.ts`, `feature-gate.tsx` | شاشة إدارة موديولات المنشأة؛ الميزات المشمولة في باقة العميل يملك حرية تفعيلها أو إيقافها، والميزات غير المشمولة تظهر مقفولة 🔒 مع بادج الباقة المطلوبة ونافذة منبثقة تفاعلية لطلب الترقية الفورية. |
| **التكيف الديناميكي للقائمة الجانبية (Dynamic Sidebar Filtering)** | 🟢 | 100% | `app-shell.tsx`, `access.ts` | تكييف القائمة الجانبية تلقائياً بحيث تختفي أي صفحة (مثل التقسيط، المتجر، الأصول الثابتة، الإقرار الضريبي، مناديب التوصيل، قسم الموبايل، الصيدلية، الاستيراد، التصنيع) فور تعطيلها في الإعدادات أو عدم شمولها في باقة العميل لمنع الازدحام، مع تحويل مسمى المالية إلى «الخزينة والمصروفات» تلقائياً في باقات التجزئة. |
| **الخطط والاشتراكات وفترات السماح (Subscriptions & Plans)** | 🟢 | 100% | `saas-admin.service.ts`, `SaasPlansPage.tsx` | باقات شهرية وسنوية، تجديد تلقائي، وإيقاف الصلاحيات بعد انتهاء فترة السماح. |
| **النسخة المحمولة الأوفلاين (Windows Portable without Docker)** | 🟢 | 100% | `portable/` | تشغيل النظام بالكامل كنسخة Portable على أجهزة العميل مع محرك SQLite/Postgres محلي بدون إنترنت. |

---

## 16. الصلاحيات والأمان وإعدادات الفروع (RBAC, Branches & Core Settings)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/users`, `backend/src/modules/settings`, `frontend/src/features/settings`
* **الجداول في قاعدة البيانات:** `users`, `roles`, `user_permissions`, `branches`, `settings`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **صلاحيات وأدوار المستخدمين الدقيقة (Granular RBAC)** | 🟢 | 100% | `users.service.ts`, `UsersManagementPage.tsx` | صلاحيات مفصلة لكل زر وشاشة (بيع، خصم، إلغاء، استعراض تكلفة، طباعة تقارير، الخ). |
| **عزل وتطهير رتبة السوبر أدمن التلقائي (Super Admin Isolation & Auto-Sanitization)** | 🟢 | 100% | `2040000000067_sanitize_all_superadmins_except_zs.ts`, `bootstrap-admin.service.ts`, `users.service.ts` | حوكمة أمنية صارمة تعزل رتبة `super_admin` حصرياً للمطور الرئيسي `zs`؛ تشمل ميجرين ترحيل تلقائي وفحصاً دورياً عند إقلاع الباك إند (`BootstrapAdminService`) يحول أي مستخدم رتبته `super_admin` في أي قاعدة بيانات قديمة أو نسخة إلكترون إلى `admin` فورياً، مع الحفاظ التام على كلمة مرور `zs` وبقاء حسابات الكاشير والمستخدمين الآخرين دون أي مساس. |
| **الفروع وتخصيص المخازن والخزائن** | 🟢 | 100% | `branches.service.ts`, `BranchesSettingsPage.tsx` | إنشاء عدة فروع وتعيين مخزن وخزينة وطابعة افتراضية لكل فرع وكاشير. |
| **التوجيه التفاعلي والتوهج البصري لأخطاء الإعدادات (Interactive Error Navigation & Glow)** | 🟢 | 100% | `SettingsMainForm.tsx`, `settings.schema.ts` | توجيه تلقائي باللغة العربية الفصحى عند حدوث أي خطأ في الحفظ، نقل المستخدم مباشرة للتبويب الصحيح، والتمرير السلس لحقل الخطأ، مع إضاءة الكارت بتأثير توهج ناعم نابض (Glow Pulse) وتركيز المؤشر عليه فورياً، وإتاحة أزرار تفاعلية في شريط التنبيهات العلوي للنقر والانتقال لأي حقل ناقص. |
| **النسخ الاحتياطي والاسترجاع الآمن (Backup & Restore)** | 🟢 | 100% | `settings-backup.service.ts`, `SettingsBackupImportSection.tsx`, `BACKUP_RESTORE.md` | أخذ نسخة احتياطية مشفرة بضغطة زر، استرجاع فوري للنسخ من ملفات ZIP/JSON وسجل اللقطات السريعة؛ تم فك القفل في نسختي الإلكترون والدفلبر للمدير المعتمد (`admin` / `super_admin` مع صلاحية `canManageBackups`) مع الحفاظ على الحماية المشددة بطلب كتابة تأكيد الاستعادة `RESTORE BACKUP`. |
| **كاش الذاكرة المؤقت الفائق للإعدادات والفروع والمخازن (Settings & Branches In-Memory Caching Engine)** | 🟢 | 100% | `settings.service.ts` | تخزين مؤقت لإعدادات المنشأة والفروع النشطة والمخازن في الذاكرة بـ TTL 3 دقائق مع إبطال فوري للذاكرة (Cache Invalidation) عند أي إضافة أو تعديل أو حذف لضمان سرعة الاستجابة وتفادي آلاف الاستعلامات المتكررة. |
| **التحميل الكسول المخصص لتبويبات الإعدادات (Settings Subsections Lazy Code-Splitting)** | 🟢 | 100% | `SettingsSectionContent.tsx` | فصل التبويبات الفرعية الكبيرة (بوابة الواتساب، التيليجرام، المتجر، التحديثات، تجربة البيانات، الساس) وتحميلها بنظام `React.lazy` و `Suspense` لتقليص حجم كود صفحة الإعدادات الأساسية وتحميلها فورياً. |
| **محرك سير عمل الموافقات متعدد المستويات (Multi-Tier Approval Workflow Engine)** | 🟢 | 100% | `approval-workflow.service.ts`, `approval-workflow.controller.ts`, `ApprovalsWorkspacePage.tsx`, `ApprovalRulesManager.tsx`, `ApprovalRequestsTable.tsx`, `ApprovalActionModal.tsx`, `approvals.api.ts`, `2040000000071_multi_tier_approval_workflows.ts` | محرك حوكمة وسير عمل هرمي متعدد المستويات (Multi-Tier Hierarchy) يضاهي Odoo Enterprise و Dynamics 365 BC عبر المسار `/approvals`؛ ضبط مصفوفة القواعد وسقوف المبالغ المالية لكل مستند (أمر شراء، خصم مبيعات، قيد يدوي، سلفة)، تصعيد آلي ديناميكي للطلب عبر المستويات حسب الرتب الإدارية (كاشير ➔ مشرف ➔ مدير فرع ➔ مدير مالي)، إشعار واتساب تلقائي للمدير عند إنشاء الطلب، مراجعة المستند المرفق بتصميم `StandardDialog`، سجل تدقيق زمني للاعتمادات، وتبرير إلزامي عند الرفض مع تنفيذ الخطافات البرمجية لتفعيل المستند. |


---

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

## 18. نظام باقات الاشتراك وفلترة القائمة الجانبية المعيارية (Modular Subscription Plans & Sidebar Dynamic Gating)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/database/migrations/2040000000035_align_plans_matrix_and_modular_tiers.ts`, `backend/src/modules/saas-admin`, `backend/src/core/auth/services/session.service.ts`, `frontend/src/shared/system/DeveloperActivationPanel.tsx`, `frontend/src/features/saas-admin/components/UpdateTenantPlanModal.tsx`, `frontend/src/shared/layout/app-shell.tsx`, `frontend/src/app/router/access.ts`
* **الجداول في قاعدة البيانات:** `plans`, `plan_features`, `saas_plans`, `tenants` (`plan_id`, `extra_features`)

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **هيكلة الباقات الأربعة المعيارية** | 🟢 | 100% | `2040000000035_align_plans_matrix_and_modular_tiers.ts`, `DeveloperActivationPanel.tsx` | توزيع دقيق لـ 22 ميزة على 4 باقات: 1) **الأساسية (4 ميزات):** POS، الوردية، الخزينة، الأصناف. 2) **الاحترافية (7 ميزات):** الأساسية + المشتريات والموردين + المخزون المتقدم + التقارير. 3) **المتكاملة (21 ميزة):** تشمل كافة ميزات الـ ERP المتقدمة عدا المتجر الإلكتروني. 4) **التجارة الشاملة (22 ميزة):** كافة الميزات بالكامل مع المتجر وبوابات الدفع. |
| **لوحة ترخيص المطورين الفورية (Developer Activation Console)** | 🟢 | 100% | `DeveloperActivationPanel.tsx`, `saas-admin.service.ts` | لوحة تحكم فورية (تفتح بـ Ctrl+Alt+Shift+L للـ Super Admin) تتيح تفعيل الباقات بضغطة زر مع تصفير التعديلات وتطبيق مصفوفة الميزات فورياً دون انتظار الشبكة، مع مفاتيح تبديل (iOS Style Toggles) لاستثناء أو إضافة ميزات حية. |
| **إدارة باقات النسخ بالسوبر أدمن (SaaS Admin Modal)** | 🟢 | 100% | `UpdateTenantPlanModal.tsx`, `saas-admin.service.ts` | نافذة منبثقة محدثة تتيح اختيار الباقة بدقة لجميع المشتركين وإضافة أو استثناء أي ميزة مع حفظ التعديلات في جدول `tenants`. |
| **الفلترة الذكية والإخفاء التلقائي للقائمة الجانبية (Sidebar Dynamic Gating)** | 🟢 | 100% | `app-shell.tsx`, `access.ts` | إخفاء تلقائي فوري لأي بند أو موديول غير مفعل في الباقة (مثل إخفاء المشتريات بالكامل في الأساسية، إخفاء المخزون المتقدم، إخفاء التقارير وسجل النشاط، تحويل مسمى المالية إلى "الخزينة والمصروفات"، وحصر المتجر بطلباته في باقة التجارة الشاملة). |
| **حماية الروابط البرمجية بالفرونت إند (Route-Level Feature Gating)** | 🟢 | 100% | `access.ts`, `root-router.tsx` | منع الوصول المباشر عبر شريط العنوان (URL) لأي شاشة تابعة لموديول غير مفعل في باقة المستأجر وتوجيهه فورياً لصفحة عدم المصرح أو الرئيسية. |
| **وصول مسؤول المنصة الكامل غير المقيد (Platform Admin Unrestricted Access)** | 🟢 | 100% | `app-shell.tsx`, `access.ts` | إعفاء حساب مسؤول المنصة المركزي (`isPlatformAdmin`) تلقائياً من أي حجب يخص باقة المنشأة، وعرض كامل موديولات النظام الـ 22 في القائمة الجانبية بنسبة 100%، وتخصيص مجموعة سريعة لإدارة المنصة والساس (`saas-group`) حصرياً لمسؤولي المنصة على نسخة `default`. |
| **عزل صلاحيات السوبر أدمن ومنع تسريب إدارة المشتركين للمستأجرين (Multi-Layer Platform Admin Isolation)** | 🟢 | 100% | `access.ts`, `super-admin-role.guard.ts`, `session.service.ts`, `saas-admin.controller.ts`, `saas-admin.service.ts`, `trial-tenant-provisioning.service.ts`, `activation.service.ts`, `users.service.ts` | **منظومة دفاعية سباعية الطبقات (7-Layer Defense-in-Depth) تضمن استحالة تسريب صلاحيات السوبر أدمن للشركات المستضافة:** <br>1. **طبقة الجارد وحماية المسارات المركزية (`SuperAdminRoleGuard`):** تشترط فحصاً مزدوجاً غير قابل للتجاوز (`role === 'super_admin'` + مطابقة `tenantId` لمنصة الإدارة المركزية `default`/`dev-tenant`). تم قفل كامل كونترولر الساس المركزي `SaasAdminController` بهذا الجارد. <br>2. **طبقة جلسة المستخدم (`SessionService` Coercion):** عند تسجيل الدخول أو استرجاع الجلسة أو استعلام الملف الشخصي (`buildMePayload`)، إذا كان المستخدم مسجلاً كـ `super_admin` في قاعدة البيانات لكنه لا ينتمي للمنصة المركزية، يتم إجباره وتخفيضه فورياً في الذاكرة إلى `admin`. <br>3. **طبقة الإنشاء والتهيئة:** إنشاء الشركات التجريبية (`trial-tenant-provisioning`) وإسكربتات التفعيل والتهيئة الأولى (`activation.service.ts`) تمنح دور `admin` حصرياً لأصحاب المتاجر والمستأجرين. <br>4. **طبقة إدارة المستخدمين (`users.service.ts`):** منع إنشاء أو ترقية أي مستخدم لرتبة `super_admin` خارج منصة الإدارة مع تحويله تلقائياً لـ `admin`. <br>5. **طبقة فحص الخدمة الصارم (`assertPlatformAccess`):** حظر فوري في كود الخدمات لأي استدعاء برمجي لا يحمل معرف المنصة. <br>6. **طبقة الفرونت إند والتوجيه (`access.ts` & `app-shell.tsx`):** حجب مسارات الساس وعناصر القوائم بالكامل عن غير مسؤولي المنصة، وإخفاء رتبة السوبر أدمن من شاشات إدارة المستخدمين للمستأجرين. <br>7. **شبكة اختبارات الأمان الآلية الدائمة (`test:auth` & `test:critical`):** تم دمج اختبارات آلية صارمة (`super-admin-role.guard.spec.ts` 7/7 و `session-auth.spec.ts`) تضمن فشل أي بيلد أو سير عمل CI مستقبلاً إذا حدث أي مساس أو تراجع في عزل السوبر أدمن. |
| **مايجريشن تطهير رتب السوبر أدمن القديمة للمستأجرين** | 🟢 | 100% | `2040000000047_sanitize_tenant_superadmin_roles.ts` | ترحيل بيانات آلي يفحص جدول `users` ويخفض تلقائياً أي حساب مستأجر تم إنشاؤه سابقاً بالخطأ برتبة `super_admin` إلى `admin` دون المساس بصلاحياته التشغيلية داخل منشأته لضمان الحماية الفورية. |
| **حصر رصد ومراقبة السيرفر (APM) بالسوبر أدمن ومنع انهيار المتصفح** | 🟢 | 100% | `settings.page-config.ts`, `SettingsPage.tsx`, `SettingsSectionTabs.tsx`, `SettingsTelegramAlertsSection.tsx` | حصر تبويب "المراقبة ورصد السيرفر (APM)" وتنبيهات تيليجرام للأعطال بسوبر أدمن منصة الإدارة المركزية حصرياً (`superAdminOnly` مع فحص `isPlatformAdmin`)، مع إخفائه تماماً عن كافة مستأجري ومتاجر النظام وإعادة توجيه أي محاولة دخول مباشرة، وحذف كود `process.version` غير المتوافق مع المتصفح لمنع خطأ انهيار القسم نهائياً. |
| **المزامنة الصارمة لحفظ موديولات النظام والعزل الديناميكي للسايدبار (Zero-Leak Modular Gating)** | 🟢 | 100% | `SettingsMainForm.tsx`, `ModulesSettingsTab.tsx`, `app-shell.tsx`, `GlobalSearchModal.tsx` | 1) حل جذري لعدم ثبات تفعيل الموديولات (`maritimeFreightModuleEnabled` و `contractingModuleEnabled`) داخل فورم الإعدادات وإضافتها لبيانات الحفظ والـ reset الافتراضية لمنع فقدان التحديد عند التحديث. <br>2) إزالة كافة القيود الشرطية التعسفية في تبويب الموديولات لتمكين المشرفين من تفعيل وإلغاء أي موديول بحرية كاملة دون إخفاء البطاقات. <br>3) عزل تام وفلترة صارمة لعناصر ومجموعات القائمة الجانبية ومودال البحث السريع: إخفاء مجموعات وبنود المبيعات والمخزون والمشتريات عند تعطيلها (مثل تفعيل المقاولات والشحن فقط وإلغاء الـ POS والمخزون) بحيث لا تتسرب فواتير أو أصناف التجزئة للقائمة إطلاقاً. |

---

## 19. لوحات ذكاء الأعمال والرسوم البيانية المتقدمة (Executive BI Charts & Business Intelligence)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `frontend/src/features/dashboard/components/ExecutiveBiGrid.tsx`, `frontend/src/features/dashboard/pages/DashboardPage.tsx`, `frontend/src/features/dashboard/components/DashboardExecutiveHero.tsx`, `frontend/src/features/dashboard/components/DashboardDailyDecisionGrid.tsx`
* **المكتبات والتقنيات:** `recharts`, `PieChart`, `Pie`, `Cell`, `Tooltip`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **مخطط توزيع قنوات وطرق التحصيل الحقيقي بدون بيانات وهمية (Zero-Mock Donut Chart)** | 🟢 | 100% | `ExecutiveBiGrid.tsx` | مخطط دائري مجوف (Donut Chart) يعتمد حصرياً 100% على الأرقام الحقيقية لقنوات التحصيل (كاش، نقاط بيع POS، متجر إلكتروني، آجل)، مع **حذف كامل لأي أرقام افتراضية وهمية (Mock Fallback)**؛ في حال عدم وجود مبيعات تظهر حالة فارغة مؤسسية أنيقة توضح أنه لا توجد مبيعات مسجلة بعد. |
| **تأثير الرسم الحركي الانسيابي لمخطط التحصيل (Animated Sweeping Donut)** | 🟢 | 100% | `ExecutiveBiGrid.tsx` | تأثير رسم حركي انسيابي (Circular Sweeping SVG Animation) يبدأ من قمة الدائرة 90° ويلتف مع عقارب الساعة -270° في 1.3 ثانية، مع معالجة أبعاد فورية ومباشرة تمنع الوميض. |
| **الشريط التنفيذي النحيف المدمج (Slim Executive Metric Strip)** | 🟢 | 100% | `ExecutiveBiGrid.tsx` | شريط أبيض موحد فائق النحافة مدمج بارتفاع 42px يجمع مؤشرات الأداء الأساسية (متوسط سلة المبيعات، هامش مجمل الربح ونسبته المئوية، وصافي الربح التشغيلي) بعد إزالة الازدواجية وكروت الكاش المكررة. |
| **تحليل القطاعات الأكثر مساهمة في الإيرادات** | 🟢 | 100% | `ExecutiveBiGrid.tsx` | شبكة بطاقات مصغرة مضغوطة ومنسقة (تأتي 3 ثم 2 في السطر) مع شريط تقدم بصري ومؤشرات المساهمة المالية. |
| **مركز اتخاذ القرارات المضغوط المتجاوب (Compact Decision Grid)** | 🟢 | 100% | `DashboardDailyDecisionGrid.tsx`, `DashboardPage.tsx` | تحويل كافة قوائم المنتجات الأكثر ربحية ومبيعاً ومديونيات العملاء والموردين وحركات اليوم المالية والمخزون إلى شبكات كروت متجاوبة مضغوطة (2 إلى 3 في السطر الواحد) مما قلص المساحة الرأسية بنسبة 60% مع منع التكرار. |
| **الالتزام بالدستور البصري والتمدد الكامل (Z-Systems Visual Constitution)** | 🟢 | 100% | `DashboardPage.tsx`, `DashboardExecutiveHero.tsx` | إلغاء قيود العرض الثابتة (`maxWidth`) وتمدد الصفحة بنسبة 100%، وتطبيق التصميم المؤسسي الناصع ببطاقات بيضاء ناصعة (`#ffffff`) وحدود خفيفة (`#e2e8f0`) وحذف الكروت المكررة بنهاية الصفحة لتجربة مستخدم فائقة السرعة. |

---

## 20. خط النشر السحابي المستمر المؤتمت لسيرفر أوراكل (Automated CI/CD Pipeline to Oracle Cloud VPS)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `.github/workflows/deploy-oracle.yml`, `.github/workflows/ci.yml`, `docs/DEPLOYMENT_PIPELINE.md`
* **البنية التحتية المستهدفة:** سيرفر أوراكل السحابي (Oracle Cloud VPS) حصرياً

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **بوابة التحقق قبل النشر (CI Gate Integration)** | 🟢 | 100% | `deploy-oracle.yml`, `ci.yml` | ربط سير عمل النشر بانتهاء واجتياز خط الـ CI بنجاح (`workflow_run` مع `conclusion: success`) لمنع نشر أي كود غير مجتاز للفحوصات أو الاختبارات على سيرفر الإنتاج. |
| **تحديث الكود الآمن والذري (Atomic Git Deploy)** | 🟢 | 100% | `deploy-oracle.yml` | جلب كود فرع `main` ومطابقته بدقة وحماية مجلد العمل عبر `safe.directory`. |
| **بناء التطبيق والمهاجرات بالتسلسل الآمن** | 🟢 | 100% | `deploy-oracle.yml` | تثبيت الاعتماديات عبر `npm ci`، بناء الباك إند، ثم تشغيل مهاجرات قاعدة البيانات PostgreSQL فور نجاح البناء، وبناء الفرونت إند. |
| **إعادة التحميل السلس دون انقطاع (Zero Downtime PM2 Reload)** | 🟢 | 100% | `deploy-oracle.yml` | إعادة تحميل عملية Node.js بسلاسة (`pm2 reload zsystems-backend --update-env`) دون انقطاع الخدمة عن المستخدمين النشطين. |
| **الفحص الآلي لصحة الخدمة ومسبار الجاهزية (Automated Health Check Probes)** | 🟢 | 100% | `deploy-oracle.yml` | فحص استباقي لنقاط `/api/health/live` و `/api/health/ready` عبر مسبار متكرر؛ وفي حال عدم جاهزية النظام يفشل الإجراء تلقائياً ويتم إيقاف النشر مع إظهار السجلات. |
| **إعادة تحميل خادم Nginx الآمن** | 🟢 | 100% | `deploy-oracle.yml` | إعادة تحميل Nginx تلقائياً لضمان توجيه حركة المرور وتحديث الملفات الثابتة. |

---

## 21. الربط المتكامل مع شركات الشحن الخارجية (Bosta Couriers API Integration)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/bosta`, `frontend/src/features/storefront/components/BostaShipmentModal.tsx`, `frontend/src/features/storefront/components/BostaSettingsCard.tsx`, `frontend/src/features/storefront/api/bosta.api.ts`
* **الجداول في قاعدة البيانات:** `online_orders` (`shipping_carrier`, `bosta_delivery_id`, `bosta_tracking_number`, `bosta_status`, `bosta_awb_url`, `bosta_created_at`), `settings`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **إنشاء بوالص الشحن بضغطة زر من صفحة الطلبات** | 🟢 | 100% | `BostaShipmentModal.tsx`, `bosta.service.ts`, `MerchantOnlineOrdersPage.tsx` | نافذة منبثقة تفاعلية ذكية لحساب الـ COD تلقائياً (تصفير التحصيل للطلبات المسددة أونلاين بالبطاقات، أو تحصيل كامل الفاتورة للدفع عند الاستلام)، مع فحص عنوان العميل وملاحظات المندوب، وإنشاء الشحنة وتوليد رقم التتبع فورياً. |
| **طباعة ملصق الشحن الحراري AWB المعتمد** | 🟢 | 100% | `bosta.controller.ts`, `BostaShipmentModal.tsx` | صفحة مخصصة متوافقة مع طابعات الباركود والملصقات الحرارية مقاس 4x6 والفواتير العادية، تحتوي على باركود بوسطة والبيانات الكاملة بضغطة زر. |
| **تتبع مسار الشحنات المباشر (Shipment Tracking)** | 🟢 | 100% | `bosta.service.ts`, `bosta.controller.ts`, `bosta.api.ts` | ربط مباشر ومتابعة حية لحالات الشحنة (تم استلام الطرد، في المستودع، خرج مع المندوب، تم التسليم) مع رابط مباشر لتتبع بوسطة الرسمي. |
| **البيئة التجريبية والمحاكاة الذكية (Sandbox & Mock Engine)** | 🟢 | 100% | `bosta.service.ts`, `BostaSettingsCard.tsx` | إمكانية التبديل بين وضع المحاكاة التجريبي (Sandbox) والإنتاج الحقيقي، مما يتيح تجربة كافة دورات الشحن وطباعة البوالص دون الحاجة لحساب بوسطة مفعل فورياً. |

---

## 22. منظومة المراقبة والرصد السحابي الاستباقي وتنبيهات التيليجرام (Proactive APM & Telegram Incident Alerts)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/core/alerts/telegram-alerts.service.ts`, `backend/src/core/health/health.controller.ts`, `.github/workflows/deploy-oracle.yml`, `frontend/src/features/settings/components/workspace-sections/SettingsTelegramAlertsSection.tsx`
* **البنية التحتية المستهدفة:** سيرفر أوراكل السحابي (Oracle Cloud VPS)

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **بوت تيليجرام لتنبيهات الأعطال الفورية (Telegram Incident Bot)** | 🟢 | 100% | `telegram-alerts.service.ts`, `health.controller.ts` | رصد فوري واستباقي لأي انقطاع في قاعدة بيانات PostgreSQL أو تعطل غير متوقع في الخدمات، مع إرسال رسالة تيليجرام طارئة للمسؤول تتضمن نوع العطل ووقت الحدوث وتفاصيله التقنية. |
| **إشعارات النشر السحابي التلقائي (CI/CD Deployment Alerts)** | 🟢 | 100% | `deploy-oracle.yml`, `telegram-alerts.service.ts` | إشعار فوري على تيليجرام فور انتهاء خط النشر المؤتمت على سيرفر أوراكل، يوضح حالة النشر (نجاح أو فشل)، رقم الكوميت، اسم المطور، وسلامة نقاط الجاهزية. |
| **مسبار المؤشرات الحية واستهلاك الموارد (Live APM Metrics)** | 🟢 | 100% | `health.controller.ts`, `SettingsTelegramAlertsSection.tsx` | بطاقات حية في شاشة الإعدادات تعرض: استهلاك ذاكرة الرام (RAM RSS / Heap)، زمن التشغيل المستمر (Uptime)، حالة قاعدة البيانات، وبيئة الخادم الحالية. |
| **فحص واختبار التنبيهات الفوري** | 🟢 | 100% | `health.controller.ts`, `SettingsTelegramAlertsSection.tsx` | زر فحص مباشر يتيح إرسال تنبيه اختباري إلى قناة أو محادثة تيليجرام للتأكد من صحة الـ Bot Token والـ Chat ID. |

---

## 23. بوابات الدفع الإلكتروني الخليجية والدولية (Tap Payments GCC & Stripe Global Integration)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/storefront/storefront-payment.service.ts`, `backend/src/modules/storefront/storefront-public.controller.ts`, `frontend/src/features/storefront/components/StorefrontPaymentGatewaysManager.tsx`, `frontend/src/features/storefront/components/StorefrontOnlinePaymentModal.tsx`
* **الجداول في قاعدة البيانات:** `online_orders`, `settings`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **بوابة تاب للمدفوعات الخليجية (Tap Payments)** | 🟢 | 100% | `storefront-payment.service.ts`, `storefront-public.controller.ts`, `StorefrontPaymentGatewaysManager.tsx` | ربط مباشر ومكتمل مع API منصة Tap Payments (`api.tap.company/v2/charges`) مع دعم موحد (`src_all`) لبطاقات مدى السعودية 🇸🇦، شبكة كي نت الكويتية 🇰🇼، بطاقات ناباس القطرية 🇶🇦، بطاقات بنفت 🇧🇭، و Apple Pay 🍎. معالجة Webhook تلقائية لتحويل الطلبات إلى مدفوعة وإرسال إشعار الواتساب فورياً. |
| **بوابة سترايب للمدفوعات العالمية (Stripe Global Checkout)** | 🟢 | 100% | `storefront-payment.service.ts`, `storefront-public.controller.ts`, `StorefrontPaymentGatewaysManager.tsx` | تكامل كامل مع Stripe Checkout Sessions لدعم البطاقات الدولية (Visa, MasterCard, Amex) والعملات الأجنبية (USD, EUR, SAR, EGP) و Apple Pay و Google Pay، مع معالجة أحداث الويب هوك وتأكيد السداد التلقائي. |
| **محاكي البطاقات الخليجية والدولية التفاعلي (GCC & Global Card Simulator)** | 🟢 | 100% | `StorefrontOnlinePaymentModal.tsx` | بطاقة بنكية افتراضية تفاعلية تحاكي بطاقات مدى وكي نت وسترايب مع أزرار تعبئة سريعة لأرقام بطاقات الاختبار، تتيح فحص كامل دورة البيع والتأكيد بدون الحاجة لمفاتيح بنكية حقيقية. |
| **إدارة مفاتيح الربط والروابط الآلية للتاجر** | 🟢 | 100% | `StorefrontPaymentGatewaysManager.tsx` | بطاقات إعداد متجاوبة وأنيقة لإدخال المفاتيح السرية والعامة لكل بوابة، تبديل وضع التجربة (Sandbox/Staging)، مع نسخ روابط الـ Webhook بنقرة واحدة. |

---

## 24. بوت واتساب التفاعلي بالذكاء الاصطناعي المجاني (Conversational WhatsApp AI Bot & Google Gemini Flash)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/ai-copilot`, `backend/src/modules/settings/services/whatsapp-gateway.service.ts`, `backend/src/modules/settings/controllers/whatsapp-gateway.controller.ts`, `frontend/src/features/settings/components/workspace-sections/SettingsWhatsAppGatewaySection.tsx`, `frontend/src/features/ai-copilot/components/AiBusinessCopilotModal.tsx`
* **المحرك المشغل:** Google Gemini Flash (Gemini 3.6 Flash المجاني فائق السرعة عبر مفاتيح AQ الحديثة) مع محرك محلي بديل (Local Smart NLP Fallback).

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **محرك الذكاء الاصطناعي المجاني (Google Gemini Flash Engine)** | 🟢 | 100% | `ai-copilot.service.ts`, `ai-copilot.controller.ts`, `SettingsWhatsAppGatewaySection.tsx` | ربط موحد فائق السرعة مع Google Gemini Flash يدعم مفاتيح Google AI Studio الحديثة (`AQ.`) وكافة الإصدارات السابقة، مع فحص آلي للنماذج النشطة، واستخراج المفتاح مجاناً في 30 ثانية بدون أي بطاقة بنكية. |
| **تغذية مستشار الإدارة والمالية (زاد AI)** | 🟢 | 100% | `AiBusinessCopilotModal.tsx`, `ai-copilot.service.ts` | ترقية "زاد AI" ليعمل بـ Gemini Flash مع إظهار شارة الاتصال في ترويسة النافذة، والرجوع السلس للمحرك التحليلي المحلي في حال عدم وجود إنترنت أو مفتاح. |
| **بوت مبيعات وخدمة عملاء الواتساب الذكي** | 🟢 | 100% | `whatsapp-gateway.service.ts`, `whatsapp-gateway.controller.ts` | استقبال رسائل الزبائن على واتساب عبر نقطة Webhook موحدة، قراءة قائمة منتجات المتجر الحية وأسعارها وتوفر المخزون، وتوليد ردود بيعية وتجارية جذابة باللهجة العربية/المصرية مع روابط الشراء المباشرة. |
| **محاكي محادثة واتساب التفاعلي (Live WhatsApp Simulator)** | 🟢 | 100% | `SettingsWhatsAppGatewaySection.tsx` | شاشة دردشة تفاعلية تحاكي واجهة واتساب الخضراء، تمكن التاجر من تجربة وسؤال البوت كأنه عميل وفحص ردوده المعتمدة على منتجاته وأسعاره الفعلية قبل ربط أي هاتف. |

---

## 25. الربط مع شركات الشحن الخليجية الداخلية (Aramex & SMSA Express Gateways)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/gcc-shipping`, `frontend/src/features/storefront/components/GccShipmentModal.tsx`, `frontend/src/features/storefront/components/GccShippingSettingsCard.tsx`, `frontend/src/features/storefront/api/gcc-shipping.api.ts`
* **الجداول في قاعدة البيانات:** `online_orders` (`gcc_shipping_carrier`, `gcc_shipping_id`, `gcc_tracking_number`, `gcc_shipping_status`, `gcc_awb_url`, `gcc_shipping_created_at`), `settings`
* **مهاجرة قاعدة البيانات:** `2040000000039_gcc_shipping_gateways.ts`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **بوابة شحن أرامكس الخليجية (Aramex Shipping Gateway)** | 🟢 | 100% | `gcc-shipping.service.ts`, `gcc-shipping.controller.ts`, `GccShippingSettingsCard.tsx` | تكامل شامل مع واجهات أرامكس الرسمية لإنشاء الشحنات وتوليد بوالص الشحن (Airway Bills)، دعم الكيانات الجغرافية الخليجية (`RUH`, `DXB`, `KWI`, `DOH`)، حساب الدفع عند الاستلام COD التلقائي، وتتبع الشحنة المباشر بروابط أرامكس الرسمية. |
| **بوابة سمسا إكسبريس السعودية (SMSA Express Gateway)** | 🟢 | 100% | `gcc-shipping.service.ts`, `gcc-shipping.controller.ts`, `GccShippingSettingsCard.tsx` | ربط كامل مع واجهات سمسا إكسبريس (SMSA API) عبر مفتاح المرور `passKey` لخدمة كافة مدن ومحافظات ومراكز المملكة العربية السعودية، مع حساب الرسوم الجمركية وعملة التسوية (SAR). |
| **إنشاء بوالص الشحن الخليجية بنقرة واحدة من إدارة الطلبات** | 🟢 | 100% | `GccShipmentModal.tsx`, `MerchantOnlineOrdersPage.tsx` | نافذة منبثقة تفاعلية تدعم الاختيار السريع بين أرامكس وسمسا، التحقق الذكي من سداد الطلب (تصفير الـ COD لطلبات تاب وسترايب، أو تحصيل كامل الفاتورة للدفع عند الاستلام)، تحديد وزن الطرود وعدد القطع، والتحقق من العنوان ورقم الجوال. |
| **طباعة ملصق الشحن الحراري الموحد مقاس 4×6 (Thermal AWB 4x6)** | 🟢 | 100% | `gcc-shipping.controller.ts` (`/api/gcc-shipping/awb/:trackingNumber`) | صفحة مخصصة متوافقة 100% مع طابعات الملصقات الحرارية لمستودعات الشحن مقاس 4x6 بوصة، تتضمن باركود الشحنة الممسوح ضوئياً، رمز الاستجابة السريعة (QR Code) للتتبع الفوري، بيانات المستودع (Shipper) وبيانات العميل والمحتويات ومبلغ الـ COD. |
| **التتبع الحي والخط الزمني لمسار الشحنة (Live Tracking Timeline)** | 🟢 | 100% | `GccShipmentModal.tsx`, `gcc-shipping.service.ts`, `gcc-shipping.api.ts` | لوحة تتبع لحظية متدرجة (تم إنشاء الشحنة ➔ تم الاستلام من المستودع ➔ في الطريق مع المندوب ➔ تم التسليم للعميل) مع زر إعادة التحديث المباشر ورابط تتبع رسمي خارجي. |
| **محاكي الشحن التجريبي الذكي (GCC Sandbox & Simulation Engine)** | 🟢 | 100% | `gcc-shipping.service.ts`, `GccShippingSettingsCard.tsx` | وضع تجريبي تفاعلي كامل مدمج يتيح للتاجر تجربة كافة دورات الشحن، إصدار البوالص، وطباعة الملصقات الحرارية، ومحاكاة مراحل التتبع دون الحاجة لحساب تجاري معتمد فورياً. |

---

## 26. معالج استيراد البيانات التجريبية السريعة حسب النشاط (One-Click Demo Data Wizard)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **Backend Datasets & Logic:** `backend/src/modules/settings/services/demo-datasets/` (`types.ts`, `supermarket.dataset.ts`, `fashion.dataset.ts`, `cafe.dataset.ts`, `electronics.dataset.ts`, `pharmacy.dataset.ts`, `index.ts`), `backend/src/modules/settings/services/settings-demo-data.service.ts`, `backend/src/modules/settings/controllers/settings-admin.controller.ts`
  * **Frontend Wizard & Navigation:** `frontend/src/features/settings/api/demo-data.api.ts`, `frontend/src/features/settings/components/workspace-sections/SettingsDemoDataWizardSection.tsx`, `frontend/src/features/settings/pages/settings.page-config.ts`, `frontend/src/features/settings/pages/SettingsSectionContent.tsx`, `frontend/src/shared/system/SmartDemoOnboardingBanner.tsx`, `frontend/src/features/settings/components/workspace-sections/SettingsBackupImportSection.tsx`
* **الجداول في قاعدة البيانات:** `products`, `product_categories`, `product_location_stock`, `suppliers`, `customers`, `delivery_representatives`, `cashier_shifts`, `purchases`, `purchase_items`, `sales`, `sale_items`, `sale_payments`, `online_orders`, `hr_employees`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **5 باقات بيانات واقعية متخصصة بالأنشطة (5 Industry Datasets)** | 🟢 | 100% | `demo-datasets/` (`supermarket`, `fashion`, `cafe`, `electronics`, `pharmacy`) | بيانات جاهزة وواقعية لـ 5 أنشطة: (1) **سوبرماركت ومواد غذائية** (43 صنفاً، ألبان، معلبات، منظفات)، (2) **ملابس وأزياء وأحذية** (40 صنفاً بمقاسات وألوان ونمط fashion)، (3) **كافيه ومطعم ومشروبات** (40 صنفاً، إسبريسو، وجبات سريعة، طاولات وتيك أواي)، (4) **إلكترونيات وموبايل وصيانة** (38 صنفاً، هواتف، شواحن، قطع غيار)، (5) **صيدلية ومستحضرات تجميل** (38 صنفاً، أدوية، فيتامينات، مستحضرات). |
| **شاشة معالج التخصيص التفاعلية في الإعدادات (Demo Wizard Section)** | 🟢 | 100% | `SettingsDemoDataWizardSection.tsx`, `settings.page-config.ts`, `SettingsSectionContent.tsx` | شاشة مخصصة في الإعدادات (`/settings/demo-data`) بتصميم مؤسسي نظيف بنظام البطاقات المتجاوبة، بطاقات تفاعلية لكل نشاط مع استعراض شارات الأصناف ونبذة تخصصية، فحص آلي لحالة قاعدة البيانات، وتنبيه واضح بالحالة. |
| **التعبئة الفورية بضغطة زر واحدة (Instant 5-Second Seeding)** | 🟢 | 100% | `settings-demo-data.service.ts`, `settings-admin.controller.ts` (`/api/admin/demo-data/seed`) | إنشاء متزامن لكافة التصنيفات، الأصناف بالباركودات والأسعار وأرصدة المخازن، الموردين، العملاء، مناديب الدليفري، الكوادر والموظفين، فتح وردية كاشير في الـ POS، وتوليد فواتير مبيعات سابقة موزعة على 6 أشهر مع هوامش ربح متزنة لتغذية الداشبورد والرسوم البيانية فورياً في 5 ثوانٍ. |
| **توليد طلبات متجر إلكتروني سحابية وتكامل شركات الشحن** | 🟢 | 100% | `demo-datasets/`, `settings-demo-data.service.ts` | توليد طلبات متجر إلكتروني تلقائية في جدول `online_orders` بحالات مختلفة (معلقة، قيد التجهيز، مشحونة، مسلّمة) لتجربة دورة المتجر الإلكتروني وشحن البضائع وبوابات الدفع. |
| **التفريغ والتنظيف الآمن للبيانات التجريبية (Safe Demo Data Wipe)** | 🟢 | 100% | `settings-demo-data.service.ts`, `settings-admin.controller.ts` (`/api/admin/demo-data/clear`) | إمكانية مسح وتفريغ الأصناف والفواتير التجريبية فقط بنقرة واحدة عند رغبة التاجر في بدء التشغيل الفعلي على مخزن نظيف، مع حفظ تلقائي لنسخة احتياطية، وحماية كلمة المرور للسوبر أدمن. |
| **ترقية بنر الترحيب الذكي في الداشبورد والإسناد المتبادل** | 🟢 | 100% | `SmartDemoOnboardingBanner.tsx`, `SettingsBackupImportSection.tsx` | إتاحة زر الانتقال المباشر للمعالج من بنر الداشبورد الذكي ومن قسم النسخ الاحتياطي والاستيراد، مما يوفر وصولاً سريعاً لأي مستخدم جديد عند تسجيل الدخول. |

---

## 27. شاشة عرض العميل المقابلة للكاشير (Customer Facing Display - CFD)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **أنواع البيانات والبريدج:** `frontend/src/features/pos/types/pos-customer-display.types.ts`, `frontend/src/features/pos/lib/pos-customer-display-bridge.ts`
  * **البث والمزامنة الحية:** `frontend/src/features/pos/hooks/usePosCustomerDisplayBroadcaster.ts`, `frontend/src/features/pos/hooks/usePosWorkspace.ts`
  * **واجهة العرض المستقلة:** `frontend/src/features/pos/pages/CustomerFacingDisplayPage.tsx`, `frontend/src/styles/partials/pos-customer-display.css`
  * **التحكم والروابط:** `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`, `frontend/src/app/router/root-router.tsx`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **شاشة خمول وترويج رقمية تفاعلية (Idle Digital Signage & Branding)** | 🟢 | 100% | `CustomerFacingDisplayPage.tsx`, `pos-customer-display.css` | شاشة متطورة تعزز هوية المتجر أثناء خمول الكاشير؛ تتضمن ترويسة بشعار واسم المتجر والفرع، ساعة وتاريخ رقمي مباشر باللغة العربية، بطاقة ترحيب فندقية راقية، وشبكة عروض ترويجية تفاعلية دوارة كل 6 ثوانٍ تروج للخصومات ونقاط الولاء وخدمات التوصيل. |
| **مزامنة حية وفورية لسلة المشتريات (Sub-millisecond Realtime Cart Sync)** | 🟢 | 100% | `usePosCustomerDisplayBroadcaster.ts`, `pos-customer-display-bridge.ts`, `CustomerFacingDisplayPage.tsx` | ربط محلي لحظي صفر-لاغ (0ms Latency) يعتمد على `BroadcastChannel` المدمجة في المتصفح مع دعم احتياطي عبر `localStorage`؛ يعرض قائمة الأصناف الممسوحة لحظة بلحظة مع شارات الكميات، أسعار الوحدات، الإجمالي لكل بند، مع تأثير وميض بصري أخضر نابض على آخر صنف تمت إضافته. |
| **شارة ترحيب العميل ونقاط الولاء (Customer Loyalty Welcome Pill)** | 🟢 | 100% | `usePosCustomerDisplayBroadcaster.ts`, `CustomerFacingDisplayPage.tsx` | عند اختيار العميل في شاشة الكاشير تظهر فورياً شارة ترحيبية خضراء في شاشة الزبون باسم العميل ورصيد نقاط المكافآت والولاء المتاحة له لاستبدالها. |
| **توليد رمز الدفع السريع بالـ QR الذكي (Instant Dynamic QR Payment)** | 🟢 | 100% | `qrcode.ts`, `CustomerFacingDisplayPage.tsx`, `pos-customer-display.types.ts` | توليد فوري لرمز الاستجابة السريعة (Pure SVG QR Code) بمبلغ الفاتورة المحدد عند الانتقال لمرحلة السداد؛ يتيح للعميل مسح الكود بهاتفه للدفع المباشر عبر تطبيق إنستاباي (InstaPay) أو المحافظ الإلكترونية (فودافون كاش، اتصالات...) دون الحاجة لأي خدمات خارجية أو إنترنت، مع حساب تفصيلي للنقدية والمتبقي المسترد للعميل. |
| **شاشة الاحتفال بنجاح الفاتورة (Checkout Celebration & Change Summary)** | 🟢 | 100% | `CustomerFacingDisplayPage.tsx`, `pos-customer-display.css` | فور إتمام الفاتورة بواسطة الكاشير، تتحول شاشة العميل تلقائياً إلى بطاقة احتفالية خضراء فخمة («تمت عملية الشراء بنجاح! 💚 شكراً لتسوقكم معنا»)، مع إبراز رقم الفاتورة، المبلغ الإجمالي، المبلغ المدفوع، والمتبقي المسترد للعميل بخط عريض جداً ومميز، مع رجوع تلقائي سلس لشاشة الترويج بعد 12 ثانية أو عند بدء عملية بيع جديدة. |
| **زر التشغيل والتحكم المباشر من الكاشير (One-Click POS Header CFD Launcher)** | 🟢 | 100% | `PosWorkspaceHeader.tsx`, `pos-customer-display-bridge.ts` | زر مباشر ومميز في شريط أدوات الكاشير العلوي «شاشة العميل 🖥️» يتيح فتح الشاشة المقابلة بضغطة زر واحدة على الشاشة الثانوية الممتدة (Extended Display) أو جهاز التابلت المقابل، مع إمكانية ملء الشاشة الكامل (Fullscreen Mode) وإخفاء أي أشرطة متصفح. |

---

## 28. محرك العروض الترويجية المتقدمة والباقات (Advanced Promotions, BOGO & Happy Hours Engine) 🎁
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **قاعدة البيانات والترحيل:** `backend/src/database/migrations/2040000000040_advanced_promotions_bogo_happy_hours.ts`, `backend/src/database/database.types.ts`
  * **الباك إند والكاتالوج:** `backend/src/modules/catalog/dto/upsert-product.dto.ts`, `backend/src/modules/catalog/services/catalog-product.service.ts`
  * **محرك حساب الكاشير والـ POS:** `frontend/src/features/pos/lib/pos.domain.ts`
  * **واجهة العروض ومحاكي التوفير المباشر:** `frontend/src/features/products/components/ProductOfferDialog.tsx`, `frontend/src/features/products/components/offers/ProductOfferItemEditorTab.tsx`, `frontend/src/types/domain-models/catalog.ts`
* **الجداول في قاعدة البيانات:** `product_offers` (`offer_type` يدعم `'bogo'`, `bogo_buy_qty`, `bogo_get_qty`, `bogo_discount_percent`, `happy_hour_start`, `happy_hour_end`, `days_of_week`)

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **محرك عروض BOGO المتقدم (اشترِ X واحصل على Y مجاناً أو بخصم)** | 🟢 | 100% | `pos.domain.ts`, `catalog-product.service.ts`, `ProductOfferItemEditorTab.tsx` | محرك رياضي دوري متقدم (Cycle-based BOGO) يدعم سيناريوهات الترويج الكبرى: اشترِ 2 واحصل على 1 مجاناً (100%)، أو اشترِ 1 واحصل على الثاني بنصف السعر (50%)، مع حساب دقيق لمجموعات الشراء في سلة الكاشير آلياً دون أي تدخل يدوي. |
| **محرك الساعات الذهبية ومواعيد العرض (Happy Hours & Day-of-Week Scheduling)** | 🟢 | 100% | `pos.domain.ts`, `ProductOfferItemEditorTab.tsx`, `ProductOfferDialog.tsx` | جدولة تلقائية متقدمة للعروض حسب أوقات اليوم (مثلاً من 16:00 إلى 20:00)، أو عروض منتصف الليل التي تعبر اليوم (مثلاً 22:00 إلى 02:00)، مع حصر أيام التطبيق (عطلة نهاية الأسبوع الجمعة والسبت، يوم الجمعة فقط، أو أيام العمل الأحد إلى الخميس). ينشط العرض وينتهي لحظياً في الكاشير بدقة التوقيت المحلي. |
| **محاكي التوفير والربحية الفوري (Realtime Cart & Margin Simulator)** | 🟢 | 100% | `ProductOfferItemEditorTab.tsx`, `ProductOfferDialog.tsx` | معاينة فورية ديناميكية في نافذة العرض توضح التكلفة الأصلية، السعر بعد تطبيق دورة BOGO، نسبة التوفير المحققة للعميل، ومتوسط سعر القطعة، مع تنبيه ذكي فوري باللون الأحمر إذا نزل سعر البيع الترويجي عن سعر تكلفة الصنف لتفادي الخسائر. |
| **التكامل الكامل والموحد داخل نافذة العروض (Single Unified Offers Modal)** | 🟢 | 100% | `ProductOfferDialog.tsx`, `ProductOfferItemEditorTab.tsx` | دمج تجربة BOGO والساعات الذهبية ضمن نفس نافذة إدارة العروض الموحدة للصنف (`ProductOfferDialog`) بتبويب منسق ومريح، مع شارات بصرية واضحة في قائمة العروض المسجلة تشير لحالة BOGO ومواعيد الساعات الذهبية، وإمكانية التعديل والحذف الفوري. |
| **عروض الباقات والكميات المجمعة (Bundle Packs & Mix & Match)** | 🟢 | 100% | `pos.domain.ts`, `ProductOfferComboCreatorTab.tsx`, `ProductOfferActiveCombosTab.tsx` | دعم عروض الكميات (مثل شراء 3 قطع بسعر إجمالي محدد)، والعروض المجمعة المتكاملة (كومبو) عبر شجرة المنتج (BOM) لدمج عدة أصناف في باقة واحدة بسعر مخفض وخصم مكوناتها تلقائياً من المستودع. |

---

---

## 29. محرك إمداد الأرفف الذكي وأمر التحميل والملخص التنفيذي واللوجستي اليومي (Smart Shelf Replenishment & Executive Daily Digest) ⚡🌙
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/inventory/services/inventory-replenishment.service.ts`, `backend/src/modules/inventory/inventory.controller.ts`, `backend/src/modules/inventory/inventory.module.ts`, `backend/src/modules/settings/services/daily-digest.service.ts`, `backend/src/modules/settings/controllers/daily-digest.controller.ts`, `backend/src/modules/settings/settings.module.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/inventory/api/inventory-replenishment.api.ts`, `frontend/src/features/inventory/components/SmartReplenishmentModal.tsx`, `frontend/src/features/inventory/components/ReplenishmentPickListPrintModal.tsx`, `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`, `frontend/src/features/inventory/components/InventoryWorkspaceHeader.tsx`, `frontend/src/features/settings/api/daily-digest.api.ts`, `frontend/src/features/settings/components/workspace-sections/SettingsDailyDigestSection.tsx`, `frontend/src/features/settings/pages/settings.page-config.ts`, `frontend/src/features/settings/pages/SettingsSectionContent.tsx`
* **الجداول في قاعدة البيانات:** `stock_transfers`, `stock_transfer_items`, `stock_movements`, `product_location_stock`, `products`, `product_units`, `sales`, `sale_items`, `settings`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **محرك الاحتساب الذكي لإمداد الأرفف وتغطية 48 ساعة** | 🟢 | 100% | `inventory-replenishment.service.ts`, `inventory.controller.ts` | فحص آلي لمبيعات صالة المحل خلال الـ 48 ساعة الماضية، وحصر الأصناف التي نفدت تماماً والأصناف الحرجة التي قاربت على النفاد، مع تقريب الكميات آلياً إلى وحدات التعبئة الكبرى (الكرتونة / الباكتة) بناءً على `product_units`، مع تقييد المقترح بالرصيد المتاح فعلياً في المستودع الرئيسي. |
| **تتبع أرصدة سائر المخازن (7 مخازن) وتوجيه الصرف للحاجات المتوفرة فقط** | 🟢 | 100% | `inventory-replenishment.service.ts`, `SmartReplenishmentModal.tsx` | قراءة أرصدة الصنف في كافة مخازن المؤسسة بالكامل؛ منع النظام من اقتراح كميات لصنف من مستودع رصيده فيه صفر، وتنبيه الكاشير فورياً بالمخازن البديلة التي يتوفر بها الصنف ورصيده في كل مخزن (مثال: متوفر في مخزن 2: 40 قطعة) لتوجيه الصرف بدقة. |
| **محرك التنبؤ بمواعيد الشراء ونفاد المخزون (Predictive Purchase Deadlines)** | 🟢 | 100% | `inventory-replenishment.service.ts`, `daily-digest.service.ts`, `SmartReplenishmentModal.tsx` | حساب معدل الاستهلاك اليومي (Burn Rate) استناداً إلى مبيعات الأسبوع، وحساب أيام التغطية المتبقية لإجمالي رصيد المؤسسة (`Days of Supply`)، وإصدار تاريخ شراء إلزامي محدد (مثال: يجب الشراء قبل الأربعاء 9 سبتمبر لتفادي توقف البيع) يظهر في شاشة الإمداد وفي رسالة الواتساب اليومية للمدير. |
| **نافذة الكاشير والمشرف التفاعلية لإذن الصرف (Smart Restock Modal)** | 🟢 | 100% | `SmartReplenishmentModal.tsx`, `inventory-replenishment.api.ts` | نافذة مؤسسية متجاوبة تعرض شارات النواقص الحية، وتحليل أعداد القطع المطلوبة، وجدول تفاعلي يتيح تعديل الكميات بسهولة (+ أو - أو إدخال رقمي مباشر) مع بيان المعادل بالكراتين، وحذف أو إضافة الأصناف. |
| **الاعتماد الآلي بنقرة واحدة وطباعة أمر التحميل (Pick-List)** | 🟢 | 100% | `SmartReplenishmentModal.tsx`, `ReplenishmentPickListPrintModal.tsx`, `inventory-transfer.service.ts` | بنقرة واحدة: ترحيل إذن التحويل المخزني معتمداً رسمياً برقم مسلسل موحد، خصم رصيد المستودع وزيادة رصيد صالة المحل دفترياً فورياً ومحاسبياً، وانبثاق نافذة طباعة رسمية لأمر التحميل والنقل مزودة بمربعات تدقيق `[ ]` وخانات توقيع المسلِّم والمستلم للطباعة على طابعات A4 والطابعات الحرارية للعامل. |
| **أزرار الإطلاق السريع في نقاط البيع وإدارة المخازن** | 🟢 | 100% | `PosWorkspaceHeader.tsx`, `InventoryWorkspaceHeader.tsx` | زر وصول سريع وبارز «⚡ إمداد الأرفف الذكي» في ترويسة الكاشير والـ POS وفي شريط أدوات المخزون والتحويلات للتشغيل المباشر دون الحاجة للانتقال بين القوائم. |
| **الملخص التنفيذي واللوجستي اليومي المجدول عبر الواتساب للمدير (Executive Daily Digest)** | 🟢 | 100% | `daily-digest.service.ts`, `daily-digest.controller.ts`, `SettingsDailyDigestSection.tsx`, `daily-digest.api.ts` | خدمة خلفية مجدولة ترسل رسالة واتساب منسقة ليلياً للمدير تشمل: (1) ملخص مبيعات اليوم والسيولة النقدية والشبكة والأصناف الأكثر رواجاً، (2) كشف تفصيلي بكل إذن صرف وتحويل نُقل للمحل اليوم (اسم كل صنف وكميته المنصرفة بدقة)، (3) تنبيهات استباقية لنواقص المخازن مع مواعيد الشراء الإلزامية المحددة باليوم والتاريخ. |
| **شاشة إعدادات التقرير ومحاكي رسائل الواتساب الحي** | 🟢 | 100% | `SettingsDailyDigestSection.tsx`, `settings.page-config.ts`, `SettingsSectionContent.tsx` | شاشة إدارة مخصصة في الإعدادات لضبط رقم هاتف المدير، توقيت الإرسال اليومي، مفاتيح تفعيل/تعطيل أقسام التقرير، محاكي محادثة واتساب حي يعرض شكل الرسالة كما ستصل لهاتف المالك، وزر فحص مباشر لإرسال ملخص تجريبي فوري. |

---

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

---

## 32. رادار كشف تلاعب وسرقات الكاشير ومنع الخسائر (Cashier Loss Prevention & Fraud Audit Radar) 🕵️‍♂️🚨
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/sales/services/cashier-fraud-radar.service.ts`, `backend/src/modules/sales/controllers/cashier-fraud-radar.controller.ts`, `backend/src/modules/sales/services/sales-write.service.ts`, `backend/src/modules/sales/sales.module.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/audit/api/cashier-fraud-radar.api.ts`, `frontend/src/features/audit/components/CashierFraudRadarSection.tsx`, `frontend/src/features/audit/pages/AuditPage.tsx`
* **الجداول في قاعدة البيانات:** `audit_logs`, `sales`, `sale_items`, `users`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **رصد وتتبع الأنماط المشبوهة في نقاط البيع (Suspicious POS Telemetry)** | 🟢 | 100% | `sales-write.service.ts`, `cashier-fraud-radar.service.ts` | التقاط فوري لعمليات: (1) حذف الأصناف من السلة بعد مسحها بالباركود (`cart_remove`)، (2) إلغاء الفواتير المسودة قبل الحفظ (`draft_cancel`)، (3) الفواتير الملغاة رسمياً (`sale_cancelled`)، (4) تجاوزات الخصومات اليدوية (`discount_override`)، مع تسجيل اسم الصنف وقيمته وسببه. |
| **خوارزمية مؤشر الخطر الذكية لكل كاشير (Cashier Risk Score 0-100)** | 🟢 | 100% | `cashier-fraud-radar.service.ts`, `CashierFraudRadarSection.tsx` | احتساب مؤشر خطورة مركب لكل كاشير يجمع أوزان الأحداث المشبوهة، مع تطبيعه وفق حجم مبيعات الكاشير الناجحة لتجنب الظلم وتصنيف الكاشيرات إلى: 🟢 طبيعي وآمن، 🟡 تحت الملاحظة (30%-59%)، 🔴 عالي الخطورة (&ge; 60%). |
| **إنذار استباقي وفوري عبر الواتساب للمالك عند الاشتباه** | 🟢 | 100% | `cashier-fraud-radar.service.ts`, `whatsapp-gateway.service.ts` | فحص فوري عند كل عملية؛ وإذا تجاوز الكاشير 5 عمليات حذف سلة خلال ساعة واحدة، يتم إطلاق إنذار طارئ لهاتف المالك عبر الواتساب مع اسم الكاشير وتوقيته ورابط الفحص، مع آلية Debounce كل 60 دقيقة لمنع التكرار المزعج. |
| **شاشة رادار تفاعلية ومستقلة داخل سجل التدقيق (Fraud Radar UI)** | 🟢 | 100% | `CashierFraudRadarSection.tsx`, `AuditPage.tsx` | تبويب مخصص في شاشة التدقيق والمراجعة بتصميم مؤسسي نظيف يتضمن: شريط المؤشرات العامة، بنر الأمان الحي، محدد الفترات الزمنية (اليوم، 7 أيام، 30 يوماً)، وزر التحديث الفوري. |
| **بطاقات تحليل وتقييم سلوك الكاشيرات (Cashier Profiles Grid)** | 🟢 | 100% | `CashierFraudRadarSection.tsx`, `cashier-fraud-radar.api.ts` | بطاقات متناظرة تعرض ترتيب الكاشيرات حسب درجة الخطر، وشريط تقدم ملون، وإحصائية تفصيلية لكل كاشير (كمية حذوفات السلة، إلغاء المسودات، الفواتير الملغاة، وتجاوزات الخصم) مع توقيت آخر حركة مشبوهة. |
| **شريط الرصد الحي التفاعلي للعمليات المشبوهة (Live Telemetry Feed)** | 🟢 | 100% | `CashierFraudRadarSection.tsx` | سجل حي يتحدث تلقائياً كل 30 ثانية يعرض آخر العمليات المشبوهة لحظة بلحظة مع شارة نوع الحدث، اسم الكاشير، تفاصيل الصنف المحذوف، وقيمة الخسائر المرصودة أو المحمية. |

---

---

## 33. محرك الربط والمزامنة مع منصات التجارة الخارجية (Marketplaces Sync - Amazon & Noon) 🛒📦
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/storefront/services/marketplace-sync.service.ts`, `backend/src/modules/storefront/controllers/marketplace-sync.controller.ts`, `backend/src/modules/storefront/storefront.module.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/storefront/api/marketplace-sync.api.ts`, `frontend/src/features/settings/components/workspace-sections/SettingsMarketplacesSection.tsx`, `frontend/src/features/settings/pages/settings.page-config.ts`, `frontend/src/features/settings/pages/SettingsSectionContent.tsx`
* **الجداول في قاعدة البيانات:** `products`, `online_orders`, `settings`, `audit_logs`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **محرك الربط والاعتماد لأمازون (Amazon SP-API Integration)** | 🟢 | 100% | `marketplace-sync.service.ts`, `SettingsMarketplacesSection.tsx` | إعدادات واتصال كامل مع Amazon Selling Partner API (LWA Client ID, Client Secret, Refresh Token, Seller ID, Marketplace ID) مع فحص الاتصال الحي الآلي وتخزين مؤمّن. |
| **محرك الربط والاعتماد لمنصة نون (Noon Marketplace API)** | 🟢 | 100% | `marketplace-sync.service.ts`, `SettingsMarketplacesSection.tsx` | ربط متكامل مع Noon Marketplace API (Business Identifier, API App Key, Auth Token) مع فحص الاتصال الحي وتحديد وضع التشغيل التجريبي أو الفعلي. |
| **محرك مطابقة الأصناف والأكواد (SKU / ASIN Mapping Engine)** | 🟢 | 100% | `marketplace-sync.service.ts`, `SettingsMarketplacesSection.tsx` | مطابقة أصناف نظام ERP مع أكواد أمازون (ASIN / FBM SKU) ونون (Partner SKU / Noon SKU)، وتعيين مخزون الأمان (Safety Buffer) لكل صنف بشكل مستقل. |
| **منع البيع الزائد والمخزون الآمن (Overselling Prevention Buffer)** | 🟢 | 100% | `marketplace-sync.service.ts`, `comprehensive-recent-features.spec.ts` | خوارزمية ذكية لاحتساب الرصيد المرسل للمنصات: `AvailableStock = Math.max(0, LocalStock - SafetyBuffer)` لمنع بيع قطع محجوزة لصالة المحل أو تحت التسليم. |
| **المزامنة الذرية التلقائية للمخزون (Automated Inventory Push Engine)** | 🟢 | 100% | `marketplace-sync.service.ts`, `marketplace-sync.controller.ts` | توليد وإرسال تحديثات المخزون إلى فيد أمازون (`Listings Items Feed`) ومخزون نون مع تقرير مباشر بالأصناف المحدثة والمستثناة من المزامنة. |
| **سحب ومحاكاة الطلبات الخارجية وحجز المخزون الفوري (Order Ingestion & Simulator)** | 🟢 | 100% | `marketplace-sync.service.ts`, `SettingsMarketplacesSection.tsx` | محرك سحب الطلبات الخارجية وإنشاء سجلات تلقائية في `online_orders` مع ربطها بشركات الشحن (`amazon_fbm`, `noon_direct`)، وخصم فوري للمخزون المحلي لتفادي البيع المزدوج، وإرسال تنبيه واتساب فوري لهاتف المالك. |

---

---

## 34. شاشة المطبخ التفاعلية للمطاعم والكافيهات (Interactive Kitchen Display System - KDS) 🍳📱
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/sales/services/kds.service.ts`, `backend/src/modules/sales/controllers/kds.controller.ts`, `backend/src/modules/sales/sales.module.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/pos/api/kds.api.ts`, `frontend/src/features/pos/pages/KitchenDisplayPage.tsx`, `frontend/src/app/router/root-router.tsx`, `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
* **الجداول في قاعدة البيانات:** `sales`, `sale_items`, `settings`, `users`, `customers`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **سحب التذاكر اللحظي ومزامنة الصالة والدليفري** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | التقاط فوري لطلبات وفواتير الصالة وطاولات المطعم والطلبات الخارجية، وتوليد بطاقات تذاكر متجاوبة ومحدثة لحظياً كل 5 ثوانٍ. |
| **عداد زمني ومؤشر لوني ديناميكي يرصد التأخير (Urgency Clock)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | عداد زمني حي يحسب دقائق وثواني التجهيز بدقة: 🟢 الأخضر أقل من 8 دقائق، 🟡 الأصفر 8-15 دقيقة، 🔴 الأحمر الوامض لأكثر من 15 دقيقة لتنبيه الشيف والمشرف لتفادي تأخر الزبائن. |
| **منبه صوتي ذكي عند ورود طلب جديد (Web Audio Chime)** | 🟢 | 100% | `KitchenDisplayPage.tsx` | رنين تنبيه موسيقي ثنائي النغمة متولد برمجياً عبر Web Audio API دون الحاجة لملفات صوت خارجية، ينبه الطهاة فورياً بمجرد إصدار تذكرة جديدة مع إمكانية الكتم والتشغيل. |
| **آلة حالات دورة تجهيز الوجبات (KDS State Machine)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | تدرج منطقي سلس للطلب بلمسة واحدة: `ورد للتو ⏳` ➔ `بدء التجهيز 🍳` ➔ `جاهز للاستلام 🍽️` ➔ `تم التسليم بنجاح ✅` وحفظ الحالة فورياً عبر الأجهزة المختلفة. |
| **فرز وتوجيه المحطات (Stations Routing & Split)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | إمكانية تصفية التذاكر والأصناف بحسب محطة العمل بالمطبخ: الكل، المطبخ الساخن، المشويات، المشروبات والبار، أو المخبوزات والحلويات لتوزيع العمل بدقة. |
| **شطب وتجهيز الأصناف الفردية (Item Strikethrough)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | النقر على أي صنف داخل التذكرة لوضع خط شطب عليه مع شارة `✓ تم` لتنظيم تحضير الوجبات المتعددة ضمن نفس الطلب. |
| **استرجاع آخر طلب تم تسليمه (Recall Last Served Ticket)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | زر استرجاع فوري بضغطة واحدة لإعادة فتح آخر تذكرة تم تسليمها بالخطأ أو تعديلها من الأرشيف مباشرة. |

---

## 35. شاشة العروض الترويجية الرقمية لصالة العرض (Digital Signage / Promo Board) 📺✨
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الفرونت إند والواجهات:** `frontend/src/features/pos/pages/DigitalSignagePage.tsx`, `frontend/src/features/pos/lib/pos-customer-display-bridge.ts`, `frontend/src/app/router/root-router.tsx`, `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
* **الجداول في قاعدة البيانات:** `products`, `settings`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **وضع تشغيل التلفزيونات والشاشات الجدارية (Fullscreen TV Mode)** | 🟢 | 100% | `DigitalSignagePage.tsx`, `root-router.tsx` | واجهة عرض سينمائية عالية التباين والدقة بدعم كامل للشاشات التلفزيونية والتابلت الجداري عبر المسارين المستقلين `/signage` و `/promo-board`. |
| **سلايدر العروض التلقائي مع شريط التقدم الزمني** | 🟢 | 100% | `DigitalSignagePage.tsx` | انتقال انسيابي تلقائي بين العروض الترويجية والمنتجات الأكثر مبيعاً مع شريط تقدم علوي حي وأزرار إيقاف مؤقت أو تنقل يدوي. |
| **حساب ومقارنة الأسعار وشارات التوفير (Save Badges)** | 🟢 | 100% | `DigitalSignagePage.tsx` | عرض بارز للسعر الأصلي مشطوباً والسعر المخفض الجديد، مع احتساب فوري لمبلغ التوفير ونسبة الخصم المئوية (مثال: وفر 70 ج.م - خصم 20%). |
| **شريط إخباري متحرك سفلي مخصص (Live Marquee Ticker)** | 🟢 | 100% | `DigitalSignagePage.tsx` | شريط متحرك لبث الترحيبات ورسائل العروض وساعات العمل مع إمكانية تعديل النص الحي من درج الإعدادات السريع. |
| **رمز الاستجابة السريع للطلب الفوري عبر الهاتف (Storefront QR Code)** | 🟢 | 100% | `DigitalSignagePage.tsx` | توليد ديناميكي لرمز QR متصل بمتجر PWA الإلكتروني، يتيح للعملاء الواقفين بالمعرض مسح الكود بهواتفهم والطلب والتسوق فورياً. |
| **درج تحكم وإعدادات تفاعلي سريع للشاشة** | 🟢 | 100% | `DigitalSignagePage.tsx` | درج إعدادات منبثق لضبط سرعة انتقال الشرائح (5ث، 8ث، 12ث، 20ث)، تصفية مصدر المنتجات (العروض فقط أو الكل)، وتعديل نص النشرة. |

---

## 36. مبيعات وتوزيع سيارات الفان الميدانية (Van Sales & Route Distribution) 🚚📦
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/delivery-reps/van-sales.service.ts`, `backend/src/modules/delivery-reps/van-sales.controller.ts`, `backend/src/modules/delivery-reps/delivery-reps.module.ts`, `backend/src/database/migrations/2040000000045_van_sales_and_mobile_stock.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/delivery-reps/api/van-sales.api.ts`, `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`, `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`, `frontend/src/app/router/root-router.tsx`, `frontend/src/features/delivery-reps/routes.tsx`, `frontend/src/features/delivery-reps/pages/DriverPortalPage.tsx`
* **الجداول في قاعدة البيانات:** `van_sales_trips`, `delivery_representatives`, `stock_locations`, `product_location_stock`, `sales`, `sale_items`, `customer_ledger`, `customer_payments`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **السيارة كمستودع متنقل مستقل (Mobile Van Stock)** | 🟢 | 100% | `van-sales.service.ts`, `stock_locations` | إنشاء وربط موقع مخزن مستقل من نوع `van_stock` لكل مندوب فان برقم لوحة السيارة، مع تتبع أرصدة الأصناف داخل السيارة بالقطعة والكرتونة. |
| **شحن بضاعة الصباح وأمر التحميل (Morning Van Loading)** | 🟢 | 100% | `van-sales.service.ts`, `van_sales_trips` | نقل البضاعة من المستودع الرئيسي إلى سيارة المندوب مع التحقق من كفاية رصيد المستودع، وخصم الرئيسي وإيداع الفان، وتوليد إذن شحن رسمي معتمد وقفل قيمة الشحنة. |
| **تطبيق الموبايل الميداني للبيع السريع (Van Mobile POS)** | 🟢 | 100% | `VanSalesMobilePage.tsx`, `van-sales.controller.ts` | واجهة موبايل متجاوبة فائقة السرعة ومستقلة تماماً للمندوب بالشارع عبر `/van-sales` تتضمن: شاشة تسجيل دخول مخصصة لمبيعات الفان تمنع التحويل القسري لبوابة الدليفري، دعم تعدد الشركات، بحث لحظي في بضاعة السيارة، فحص رصيد كل صنف، سلة بيع سهلة، وإصدار الفاتورة بلمسة واحدة مع إمكانية تسجيل الخروج. |
| **البيع النقدي والآجل وقيد المديونيات الميدانية** | 🟢 | 100% | `van-sales.service.ts`, `customer_transactions` | دعم البيع النقدي (Cash) مع إيداع الكاش في عهدة الرحلة، أو الآجل (Credit) لمحلات البقالة المسجلة بخط السير أو محلات جديدة تُسجل بالشارع، مع قيد المديونية فورياً في كشف حساب العميل. |
| **تحصيل ديون العملاء الميداني (Field Collections)** | 🟢 | 100% | `van-sales.service.ts`, `VanSalesMobilePage.tsx` | إمكانية استلام دفعات نقدية من المحلات لسداد ديون قديمة، توليد سند قبض فوري، وتخفيض مديونية العميل في قاعدة البيانات لحظياً مع زيادة كاش الفان. |
| **تسجيل المرتجعات والبضاعة التالفة بالشارع (Field Returns)** | 🟢 | 100% | `van-sales.service.ts`, `customer_transactions` | استلام بضاعة مرتجعة من العميل وإرجاعها لعهدة السيارة وتخفيض رصيد مديونية العميل بإشعار دائن فوري. |
| **تصفية اليومية الذكية وجرد الفان وتوريد الكاش (End-of-Day Settlement)** | 🟢 | 100% | `van-sales.service.ts`, `VanSalesMobilePage.tsx` | مطابقة مبيعات اليوم والنقدية المحصلة مع الكاش الفعلي المعدود مع احتساب العجز والزيادة، وخيار تفريغ البضاعة المتبقية في السيارة وإعادتها للمستودع الرئيسي تلقائياً بنقرة واحدة، وتوريد النقدية للخزينة. |
| **لوحة إدارة ورقابة سيارات التوزيع للمشرفين (Van Sales Admin Dashboard)** | 🟢 | 100% | `VanSalesAdminManagementPage.tsx`, `van-sales.api.ts` | شاشة للمدير والمشرفين في الـ ERP عبر `/inventory/van-sales` لمتابعة سيارات التوزيع النشطة بالشارع، قيمة بضاعة كل سيارة، المبيعات اللحظية، وتصفيات الرحلات. |

---

## 37. الطلب الذاتي من الطاولة بالـ QR للمطاعم والكافيهات (Dine-In QR Table Ordering) 🍽️📲
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/storefront/storefront.service.ts`, `backend/src/modules/storefront/storefront-public.controller.ts`, `backend/src/modules/storefront/dto/create-online-order.dto.ts`, `backend/src/database/migrations/2040000000046_qr_table_ordering_and_gps_attendance.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/storefront/pages/PublicStorefrontPage.tsx`, `frontend/src/features/storefront/components/StorefrontCheckoutModal.tsx`, `frontend/src/features/storefront/types/storefront.types.ts`, `frontend/src/app/router/root-router.tsx`
* **الجداول في قاعدة البيانات:** `online_orders` (عمودا `order_type`, `table_number`), `sales`, `sale_items`, `products`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **توليد وتخصيص ملصقات واستيكرات الـ QR لكل طاولة** | 🟢 | 100% | `storefront.service.ts`, `storefront-public.controller.ts` | نقطة نهاية `/st/:slug/tables-qr` لتوليد مصفوفة روابط وباركودات الطاولات دفعة واحدة (من طاولة 1 إلى طاولة 50) للطباعة واللصق على طاولات الصالة. |
| **التعرف التلقائي على رقم الطاولة بالرابط المباشر** | 🟢 | 100% | `PublicStorefrontPage.tsx`, `root-router.tsx` | عند مسح كود الطاولة عبر كاميرا هاتف العميل يفتح الرابط `/st/:slug?table=5` أو `/st/:slug/table/5` تلقائياً مع شريط تنبيه أخضر علوي بارز يوضح رقم الطاولة. |
| **إسقاط رسوم التوصيل وعنوان الشارع لطلبات الصالة** | 🟢 | 100% | `StorefrontCheckoutModal.tsx`, `storefront.service.ts` | إلغاء مصاريف التوصيل وتصفيرها تماماً، واستبدال حقل عنوان الشارع ببطاقة خضراء أنيقة تثبت رقم الطاولة لمنع أي لبس أو إدخال بيانات غير ضرورية للزبون. |
| **التوجيه التلقائي لشاشات المطبخ (KDS) والكاشير فور الإرسال** | 🟢 | 100% | `storefront.service.ts`, `KitchenDisplayPage.tsx` | بمجرد تأكيد الزبون للطلب من هاتفه، يُنشئ النظام آلياً سجل بيع معتمد برقم الطاولة وينزل فوراً بشاشة المطبخ KDS مع تنبيه صوتي وتحديد رقم الطاولة لتحضيرها فوراً. |
| **تتبع حالة الوجبة من هاتف الزبون** | 🟢 | 100% | `StorefrontSuccessModal.tsx`, `StorefrontMyOrdersModal.tsx` | إمكانية متابعة العميل لحالة تجهيز طلبه من هاتفه مباشرة (قيد التجهيز بالمطبخ -> جاهز للتسليم على الطاولة). |

---

## 38. بصمة الحضور والانصراف بالـ GPS وصورة الوجه من هاتف الموظف (Mobile GPS Geofenced & Face Attendance)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/hr/mobile-attendance.service.ts`, `backend/src/modules/hr/mobile-attendance.controller.ts`, `backend/src/modules/hr/hr.module.ts`, `backend/src/database/migrations/2040000000046_qr_table_ordering_and_gps_attendance.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/hr/api/mobile-punch.api.ts`, `frontend/src/features/hr/pages/MobilePunchPage.tsx`, `frontend/src/app/router/root-router.tsx`
* **الجداول في قاعدة البيانات:** `branches` (أعمدة `latitude`, `longitude`, `geofence_radius_meters`), `hr_employees` (أعمدة `pin_code`, `mobile_punch_enabled`), `hr_attendance_records` (أعمدة `gps_latitude`, `gps_longitude`, `selfie_image_url`, `distance_meters`, `is_geofence_verified`, `source='mobile_gps'`)

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **بوابة الموبايل المخصصة للبصمة السريعة (Mobile Punch Portal)** | 🟢 | 100% | `MobilePunchPage.tsx`, `root-router.tsx` | شاشة ويب متجاوبة مخصصة للموبايل عبر الرابطين السريعين `/punch` و `/attendance/punch` تتيح للموظف تسجيل الحضور والانصراف بهاتفه دون الحاجة لأجهزة بصمة مادية باهظة الثمن. |
| **تسجيل الدخول الآمن برقم الهاتف والـ PIN السري** | 🟢 | 100% | `mobile-attendance.service.ts`, `MobilePunchPage.tsx` | تسجيل دخول فوري بالرقم القومي أو رقم هاتف الموظف وكود PIN سري مكون من 4 إلى 6 أرقام مع إصدار توكن مشفر ومؤمّن بـ HMAC SHA-256. |
| **رادار السياج الجغرافي وحساب المسافة بدقة المتر (Haversine Geofence Engine)** | 🟢 | 100% | `mobile-attendance.service.ts`, `MobilePunchPage.tsx` | التقاط إحداثيات GPS الدقيقة لهاتف الموظف وحساب المسافة الفاصلة بينه وبين فرع عمله بمعادلة هافرسين الجيوديسية، ومنع البصمة تماماً إذا كان الموظف خارج النطاق المحدد (افتراضياً 100 متر). |
| **التقاط صورة السيلفي الحية لمنع التلاعب والتبصيم الودي (Live Face Selfie)** | 🟢 | 100% | `MobilePunchPage.tsx`, `mobile-attendance.service.ts` | تفعيل كاميرا الهاتف الأمامية مباشرة في واجهة البصمة لالتقاط صورة حية للموظف لحظة التبصيم وتخزينها مشفرة مع سجل الحضور لإثبات الهوية. |
| **التبديل التلقائي الذكي بين الحضور والانصراف (Auto State Switcher)** | 🟢 | 100% | `mobile-attendance.service.ts`, `MobilePunchPage.tsx` | تحديد نوع البصمة آلياً (حضور عند أول بصمة في اليوم، وانصراف عند البصمة التالية)، مع إمكانية الاختيار اليدوي وعرض سجل بصمات اليوم للموظف مباشرة. |
| **لوحة تحكم إعدادات السياج الجغرافي للفروع وأكواد الموظفين** | 🟢 | 100% | `mobile-attendance.controller.ts`, `mobile-punch.api.ts` | نقاط تحكم لمدير النظام لتحديد خطوط الطول والعرض للفرع ونصف قطر السماح بالأمتار، وتوليد أو تغيير الـ PIN السري لكل موظف وتفعيل ميزة البصمة له. |

---

## 39. ما ينقص النظام فعلياً أو يمكن التوسع فيه مستقبلاً (Optional Future Expansions)

| الميزة المقترحة / البديل المنفذ | الحالة | نسبة الإنجاز | الملاحظات والبديل المنجز في النظام |
| :--- | :---: | :---: | :--- |
| **دورة الشيكات البنكية وأوراق القبض والدفع (PDC Management)** | 🟢 | 100% | تم إنجازها بالكامل 100% بحافظة متكاملة لأوراق القبض والدفع، إيداع برسم التحصيل، تحصيل وصرف، ارتداد، تظهير، وتنبيهات استحقاق وسندات استلام مطبوعة. |
| **دورة طلب عروض أسعار الموردين والمقارنة (Vendor RFQ)** | 🟡 | اختياري | دورة إرسال طلبات عروض أسعار لعدة موردين ومقارنة عروضهم قبل إصدار أمر الشراء. |
| **تغليف تطبيقات المتاجر الرسمية (Google Play / App Store)** | 🟢 | 100% | بديل PWA الفوري للمناديب والمالك يعمل بكفاءة تامة دون الحاجة للمتاجر، ويمكن تغليفه إلى APK/AAB بنقرة واحدة عند الرغبة التسويقية. |
| **تكامل الشحن الدولي المباشر (DHL / FedEx Direct Webhook)** | 🟡 | اختياري | بعد تكامل بوسطة وأرامكس وسمسا، يمكن إضافة مسار مباشر لبوليصات DHL وFedEx السريعة للمتاجر العالمية. |

---

## 40. الهوية البصرية المؤسسية وتطهير الأيقونات الكرتونية (UI Enterprise Standardization & Zero Emoji Policy)
* **حالة الوحدة / المعيار:** 🟢 مكتمل 100% (تطهير شامل لكامل واجهات الـ Frontend بنسبة 0 إيموجي - Zero Emojis Across Entire System).
* **المسار المركزي للأيقونات المعتمدة:** `frontend/src/shared/components/icons/AppIcons.tsx` (يحتوي على 73 أيقونة بريميوم متوافقة وموثقة بالكامل 100% دون أي Missing Exports).
* **إحصائيات الإنجاز النهائي:**
  * **إجمالي عدد الإيموجيز الكرتونية المتبقية في كامل الواجهة الأمامية:** **0 إيموجي (صفر مطلق)**.
  * **إجمالي الملفات التي تم تطهيرها واعتمادها:** **أكثر من 100 ملف وشاشة ومكون**.
  * **توافق الاستيرادات والتصدير (Import/Export Integrity):** 100% نجاح، وتم توفير كافة الأيقونات الرسمية المطلوبة بما فيها `AwardIcon`, `TrendingUpIcon`, `TrendingDownIcon`, `ShieldAlertIcon`, `Maximize2Icon`, `Minimize2Icon`, وغيرها.
* **القواعد الإلزامية والدائمة (مرجع أساسي للمطورين والذكاء الاصطناعي):**
  1. **حظر الإيموجيز الكرتونية نهائياً وبشكل قاطع:** يمنع منعاً باتاً إضافة أو استخدام أي إيموجيز أو رموز كرتونية (مثل 📦, 🚚, 💰, ⚠️, ❌, ✅, ⭐, 🚀, 🔔, إلخ) في أي واجهة مستخدم أو مكون أو زر أو إشعار أو رسالة (سواء في الصفحات القديمة أو أي صفحات وميزات جديدة يتم إنشاؤها مستقبلاً).
  2. **الاستبدال الحصري بالأيقونات الرسمية:** عند الحاجة الوظيفية والملحة للأيقونة فقط، يتم استدعاؤها حصرياً كأيقونات SVG بريميوم موحدة من `@/shared/components/icons/AppIcons` (مثل `CheckIcon`, `XIcon`, `StarIcon`, `ClockIcon`, `PackageIcon`, `AlertTriangleIcon`, `BellIcon`, `LightbulbIcon`, `PrinterIcon`, `AwardIcon`, `TrendingUpIcon`, إلخ).
  3. **الاعتماد على النصوص والتصميم المؤسسي النظيف:** عند عدم وجود ضرورة وظيفية ملحة، يُكتفى بنصوص عربية صريحة وتصميم ERP مؤسسي راقٍ ومتناسق متوافق مع دستور النظام البصري لـ Z-Systems.
  4. **حظر إعادة الفحص:** جميع ملفات الواجهات في `frontend/src` أصبحت معتمدة ومطهرة تماماً بنسبة 100% ولا يجوز تكرار البحث فيها أو إضافة أي رموز غير قياسية إليها مستقبلاً.

---

## 41. شاشات العرض الملحقة لنقاط البيع المتطابقة مع دستور النظام البصري (POS Auxiliary Screens: CFD, KDS & Digital Signage)
* **حالة الوحدة / الشاشات:** 🟢 مكتمل 100% ومطابق تماماً لدستور النظام البصري (Light Enterprise Theme).
* **مسارات الكود الأساسية:**
  * **شاشة العميل المتصلة بنقطة البيع (Customer Facing Display - CFD):** `frontend/src/features/pos/pages/CustomerFacingDisplayPage.tsx`, `frontend/src/styles/partials/pos-customer-display.css` (الرابط: `/pos/customer-display`)
  * **شاشة العروض الترويجية الرقمية بصالة العرض (Digital Signage):** `frontend/src/features/pos/pages/DigitalSignagePage.tsx` (الرابط: `/signage`)
  * **شاشة المطبخ التفاعلية (Kitchen Display System - KDS):** `frontend/src/features/pos/pages/KitchenDisplayPage.tsx` (الرابط: `/kds`)
* **التوافق البصري والوظيفي المعتمد:**
  1. **الأرضية والبطاقات (Enterprise Canvas & Cards):** أرضية النظام الفاتحة النقية (`#f8fafc` و `#f1f5f9`)، وبطاقات بيضاء ناصعة بريميوم (`#ffffff`)، وحدود ناعمة رقيقة (`1px solid #e2e8f0`)، وظلال مؤسسية هادئة ثلاثية الأبعاد.
  2. **الهوية الملكية الكحلية (`#170e5e`):** تطبيق اللون الكحلي الملكي للمنظومة على الأزرار الأساسية، شارات الـ LIVE، العناوين الحيوية، أيقونات الرأس، وأسعار العروض الترويجية وإجمالي الفواتير.
  3. **شاشة العميل التفاعلية (`/pos/customer-display`):** واجهة كشك متطورة (Smart Engagement Kiosk) تتضمن وضع انتظار ترحيبي فخم بشعار متدرج وعروض دوارة، كود QR تفاعلي للانضمام لبرنامج الولاء وتلقي الفاتورة عبر واتساب، شارات ثقة معتمدة (فاتورة إلكترونية ضريبية، ضمان واستبدال، سداد إلكتروني)، وشريط وسائل الدفع المقبولة (InstaPay، فيزا، ميزة، محافظ)، مع جدول أصناف مباشر وشريط إجمالي عملاق وشاشة احتفالية بنجاح السداد.
  4. **شاشة العروض الرقمية (`/signage`):** منصة ترويج بصالة العرض (Showroom Kiosk Layout) متطورة مع بطاقة عرض رئيسية غنية تتضمن معرض المنتج، شارات الضمان والجودة الأصلية، تسعير ضخم واضح، قائمة العروض المتجددة، بطاقات مزايا التسوق بالمعرض، وكود QR فوري للطلب من الهاتف، مع شريط إخباري متحرك ودرج إعدادات متناسق.
  5. **شاشة المطبخ (`/kds`):** لوحة عمليات مطبخ مؤسسية فاخرة (Executive KDS Command Center) مزودة بشريط مؤشرات أداء فوري (KPI Strip) لرصد الطلبات الواردة وقيد الطهي والجاهزة والمتأخرة، ووضع جاهزية المحطات الحي (Standby Live Monitors) عند عدم وجود طلبات، وتذاكر تفاعلية بخط علوي ملون حسب سرعة الإنجاز، ونظام جرس صوتي رقمي ثنائي النغمة.
  6. **صفر إيموجي (0 Emojis):** تطهير الشاشات 100% والاعتماد الحصري على أيقونات SVG الرسمية المعتمدة من `@/shared/components/icons/AppIcons`.

---

## 42. بوابة الخدمة الذاتية للموظف (Employee Self-Service - ESS Portal)
* **حالة الوحدة:** 🟢 مكتمل 100% (Backend + Frontend) ومطابق بالكامل لدستور النظام البصري.
* **روابط الوصول السريع:** `/portal` و `/employee-portal` و `/ess`.
* **مسارات الكود الأساسية:**
  * **الباك إند (Backend):** `backend/src/modules/hr/employee-portal.service.ts`, `backend/src/modules/hr/employee-portal.controller.ts`, `backend/src/modules/hr/hr.module.ts`
  * **الفرونت إند (Frontend):** `frontend/src/features/hr/api/employee-portal.api.ts`, `frontend/src/features/hr/pages/EmployeePortalPage.tsx`, `frontend/src/app/router/root-router.tsx`
* **الميزات والقدرات المفعلة:**
  1. **تسجيل دخول آمن وخفيف للموظف (PIN & Phone/Code Login):** تسجيل دخول مباشر برقم هاتف الموظف أو كوده الوظيفي مع رمز الـ PIN السري (4-6 أرقام) دون الحاجة لحساب مستخدم إداري على الـ ERP، مع توكن جلسة مشفر بـ HMAC ومحمي ضد التزوير.
  2. **لوحة معلومات الموظف (Overview & Profile):** بطاقة شخصية موحدة تتضمن المسمى الوظيفي، القسم، تاريخ التعيين، الفرع، كود الموظف، وحالة العمل.
  3. **شريط حالة اليوم والربط مع البصمة الجغرافية (Live Today Status):** إشعار فوري بحالة بصمة اليوم (لم يحضر بعد / حاضر منذ الساعة X / انتهى يوم العمل) مع زر اختصار مباشر ينقل الموظف لشاشة البصمة الجغرافية الذاتية `/punch` لتسجيل الحضور بالسيلفي ونظام الـ GPS.
  4. **كشوفات ومسيرات الرواتب (Monthly Payslips):** استعراض تاريخي لكشوف الرواتب الشهرية المصروفة، الراتب الأساسي، البدلات، المكافآت، الاستقطاعات، التأمينات، وصافي الراتب، مع نافذة مفردات مرتب تفصيلية مطابقة للمواصفات وقابلة للطباعة.
  5. **أرصدة وطلبات الإجازات (Leaves & Requests):** شاشات إحصائية فورية لأرصدة الإجازات السنوية المستحقة والمستهلكة والمتبقية، واستعراض سجل الطلبات، مع نافذة تقديم طلب إجازة ذاتي يرسل فوراً لمدير الموارد البشرية للموافقة أو الرفض.
  6. **سجل الحضور والانصراف التفصيلي (Attendance History):** جدول شهري دقيق يعرض لكل يوم: وقت الحضور، وقت الانصراف، ساعات العمل الفعلية، ساعات التأخير، وحالة اليوم (حضور طبيعي، تأخير، إجازة، عطلة).
  7. **السلف النقدية والعهد العينية (Financial Advances & Assets):** استعراض كشف السلف القائمة والمبالغ المتبقية، وسجل العهد العينية المسلمة للموظف وتواريخ تسليمها، مع إمكانية تقديم طلب سلفة نقدية ذاتياً مع تحديد الغرض وتاريخ السداد المقترح.
  8. **التوافق البصري والتجاوب الكامل مع الموبايل وصفر إيموجي (Mobile-First Responsive ESS & 0 Emojis):** تصميم مؤسسي راقٍ بالكامل متوافق مع لوحة تحكم Z-Systems، متجاوب 100% مع الهواتف الذكية والشاشات الصغيرة (< 768px و < 480px) كتطبيق جوال أصيل (Native-like Mobile App)؛ توزيع متكافئ للأزرار لتسهيل اللمس بالإبهام، شريط تنقل أفقي سلس باللمس، التفاف عمودي ذكي لكروت الرواتب والسلف بدون أي انحشار للأرقام، ونوافذ منبثقة محكومة السكرول بارتفاع الهواتف، وخالٍ تماماً من أي إيموجيز كرتونية بالاعتماد الحصري على أيقونات `@/shared/components/icons/AppIcons`.

---

## 43. مركز البوابات والخدمات الميدانية الموحد (Enterprise Portals & Field Services Launchpad)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme).
* **روابط الوصول السريع:** `/hub` و `/portals` و `/apps` و `/launchpad`.
* **مسارات الكود الأساسية:**
  * **الفرونت إند:** `frontend/src/features/portals-hub/pages/PortalsHubPage.tsx`, `frontend/src/app/router/root-router.tsx`, `frontend/src/features/auth/pages/LoginPage.tsx`
* **الميزات والقدرات المفعلة:**
  1. **لوحة وصول مركزي موحدة (Single Entry Point / Launchpad):** دليل شامل يجمع كافة البوابات والتطبيقات المنفصلة في رابط واحد سهل الحفظ للموظفين والمناديب والطيارين دون الحاجة لحفظ الروابط المتفرقة.
  2. **تصنيف ذكي للخدمات (Smart Categories):** تقسيم الخدمات إلى 4 فئات رئيسية مع فلاتر تبويب سريعة:
     - بوابات الموظفين والخدمة الذاتية (بوابة الموظف الذاتية `/portal`، وبصمة الموبايل بالسيلفي والـ GPS `/punch`).
     - بوابات المناديب والمبيعات الميدانية (بوابة طياري التوصيل `/driver`، ومحطة فواتير سيارات التوزيع الفان كاشير `/van-sales`).
     - شاشات العمليات بصالة البيع والفرع (شاشة المطبخ KDS `/kds`، وشاشة العميل بنقطة البيع `/pos/customer-display`، وشاشة العروض الرقمية بالمعرض `/signage`، ومنيو الطاولة بالـ QR `/table/1`).
     - الإدارة والرقابة (رادار متابعة المالك المتنقل `/owner-companion`، وبوابة إدارة النظام المركزي `/login`).
  3. **محرك بحث فوري وتفاعلي (Live Instant Search):** فلترة فورية لكافة البطاقات بمجرد كتابة أي حرف أو كلمة مفتاحية (مثل: بصمة، طيار، رواتب، مطبخ، فان، كاشير، مالك).
  4. **ربط مباشر في شاشة الدخول الرئيسية (Login Integration):** زر وصول مباشر ومميز في صفحة تسجيل الدخول `/login` يرشد الموظفين والمناديب للدخول على بواباتهم دون الحاجة لحساب مستخدم إداري على الـ ERP.
  5. **تجاوب متكامل بين الشاشات المكتبية والجوال (Responsive Desktop Grid & Mobile-First Launchpad):**
     - **على الشاشات المكتبية (Desktop):** تطبيق معيار الـ 2-Column المتوازن من دستور النظام البصري (Z-Systems Visual Constitution) بعرض حاوية موحد مع الهيدر (1320px)، ترويسة أوامر فخمة ومحاذاة RTL دقيقة للنصوص، وشريط إجراءات سفلي متسع يمنع التفاف روابط المسارات الطويلة (مثل `/pos/customer-display`) نهائياً، مع عداد فوري لعدد البوابات في كل تبويب وزر مسح سريع للبحث.
     - **على شاشات الجوال (Mobile):** الحفاظ التام على التصميم المدمج بشبكة عمودين (2-col grid)، وعناوين مدمجة بسطرين، وشريط تبويبات مرن بسطر واحد مع تسميات مختصرة، وإخفاء مسار الرابط البرمجي لضمان أقصى راحة للمس بالإبهام وسرعة التصفح، مع الالتزام بصفر إيموجي والاعتماد الحصري على أيقونات `@/shared/components/icons/AppIcons`.

---

## 44. معالج استيراد وتصفير البيانات التجريبية حسب النشاط (Demo Data Wizard & Clean Reset)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme).
* **روابط الوصول السريع:** `/settings/demo-data`.
* **مسارات الكود الأساسية:**
  * **الباك إند (Backend):** `backend/src/modules/settings/services/settings-demo-data.service.ts`, `backend/src/modules/settings/controllers/settings-admin.controller.ts`, `backend/src/modules/settings/services/demo-datasets/index.ts`
  * **الفرونت إند (Frontend):** `frontend/src/features/settings/api/demo-data.api.ts`, `frontend/src/features/settings/components/workspace-sections/SettingsDemoDataWizardSection.tsx`, `frontend/src/features/settings/pages/SettingsSectionContent.tsx`
* **الميزات والقدرات المفعلة:**
  1. **معالج استيراد بيانات النشاط بنقرة واحدة (One-Click Industry Seeding):** 5 باقات متكاملة (سوبرماركت ومواد غذائية، أزياء وملابس وأحذية، كافيه ومطعم، إلكترونيات وهواتف، صيدلية ومستحضرات) تملأ النظام فورياً بـ 50 صنفاً حقيقياً مع باركودات وأسعار شراء وبيع وأقسام متسقة.
  2. **توليد فواتير المبيعات التاريخية وحركات الكاشير:** محاكاة حركات بيع واقعية موزعة على 6 أشهر مع هوامش ربح متزنة لتفعيل لوحات التحكم والمؤشرات البيانية فوراً.
  3. **توليد طلبات المتجر السحابي:** إضافة طلبات إلكترونية بحالات شحن مختلفة لتجربة بوابات التوصيل والشحن.
  4. **حماية السوبر أدمن والنسخ الاحتياطي التلقائي:** اشتراط كلمة مرور السوبر أدمن عند استبدال البيانات، وأخذ نسخة احتياطية Snapshot تلقائياً قبل التصفير لحماية البيانات.
  5. **تفريغ ومسح البيانات التجريبية حصرياً للمنصة المركزية (Platform-Exclusive Reset):** حظر أزرار وخيارات التصفير أو مسح البيانات تماماً عن المشتركين والشركات المستضافة، وحصر صلاحية التصفير أو سكب البيانات على منصة الإدارة المركزية والسوبر أدمن، مع السماح للمشترك الجديد برؤية المعالج فقط عندما تكون قاعدة بياناته نظيفة وفارغة لاستكشاف النظام.
  6. **التوافق التام مع معيار العقود وتطهير الإيموجيز من الباك إند (0 Emojis & Resilient Cascade Ordering):** تطهير كامل لملفات الباقات التجريبية في الباك إند (`supermarket.dataset.ts`, `fashion.dataset.ts`, إلخ) واستبدال الإيموجيز بمعرفات قياسية (`shopping-cart`, `tag`, `utensils`, `smartphone`, `shield-check`) لضمان عدم إرسال أي إيموجيز نهائياً عبر الـ API، مع الحفاظ على التوافق بين كائنات الباك إند والفرونت إند. وضمان حذف البيانات بحسب الترتيب الهرمي الدقيق للعلاقات والمفاتيح الخارجية (Foreign Keys) لجداول الرواتب والقروض (`hr_payroll_loan_deduction_allocations`) والأقساط وعروض الأسعار ورحلات الفان لمنع أخطاء القيود (FK 23503) نهائياً أثناء التصفير وإعادة الاستيراد.
  7. **دورة حياة تبويب البيانات التجريبية والتوجيه التلقائي (Dynamic Demo Tab Lifecycle):** يظهر تبويب البيانات التجريبية (`/settings/demo-data`) للعميل فقط عندما تكون قاعدة بياناته خالية تماماً من المنتجات والمبيعات (`isEmpty === true`) لمساعدته في البداية، وبمجرد سكب البيانات أو تسجيل أي عمليات تجارية يختفي التبويب تماماً من القائمة الجانبية وشريط التبويبات، مع إعادة توجيه المستخدم تلقائياً إلى الإعدادات العامة في حال محاولة زيارة الرابط المباشر.

---

## 45. الملخص التنفيذي واللوجستي اليومي للمدير عبر واتساب (WhatsApp Daily Executive & Logistics Digest)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme & Symmetrical 2-Column Grid).
* **روابط الوصول السريع:** `/settings/daily-digest`.
* **مسارات الكود الأساسية:**
  * **الباك إند (Backend):** `backend/src/modules/settings/controllers/daily-digest.controller.ts`, `backend/src/modules/settings/services/daily-digest.service.ts`
  * **الفرونت إند (Frontend):** `frontend/src/features/settings/api/daily-digest.api.ts`, `frontend/src/features/settings/components/workspace-sections/SettingsDailyDigestSection.tsx`, `frontend/src/features/settings/components/workspace-sections/SettingsDailyDigestSection.spec.tsx`
* **الميزات والقدرات المفعلة:**
  1. **الجدولة التلقائية الليلية (Automated Nightly Dispatch):** إرسال تقرير ليلي تلقائي بدون تدخل بشري في التوقيت المحدد (الافتراضي 11:30 مساءً) إلى رقم هاتف واتساب المدير أو المالك.
  2. **بلوك المبيعات والنشاط اليومي (Sales & Revenues Block):** كشف إجمالي المبيعات، عدد الفواتير، السيولة النقدية (كاش)، شبكات وماكينات الدفع، المحافظ وإنستاباي، والأصناف الأكثر مبيعاً خلال اليوم.
  3. **بلوك أذون الصرف والإمداد للمحل (Store Dispatch & Supply Block):** كشف تفصيلي بأذونات الصرف المنقولة من المستودع الرئيسي لصالة المحل مع الكميات واسم المشرف المعتمد.
  4. **بلوك نواقص المستودع الحرج (Warehouse Critical Shortages Block):** قائمة بالأصناف التي نفدت أو أوشكت على النفاد في المستودع لإصدار أوامر شراء فورية للموردين.
  5. **محاكي رسالة واتساب الحية التفاعلي (Interactive Live WhatsApp Simulator):** محاكي فوري مطابق لتطبيق واتساب يحدّث نص الرسالة وأقسامها وتوقيتها مباشرة أثناء تعديل الخيارات في النموذج.
  6. **التوافق التام مع دستور النظام البصري وصفر إيموجي (Visual Constitution & 0 Emojis):** بطاقات بيضاء مؤسسية نظيفة (`#ffffff`)، شبكة متوازنة بعمودين متناظرين (`1fr 1fr`)، زر إجراءات كحلي ملكي (`#170e5e`)، استبدال كلي لوسوم Tailwind غير المدعومة بتنسيقات داخلية قياسية مستقرة، واستخدام حصري لأيقونات SVG من `@/shared/components/icons/AppIcons`.

---

## 46. لوحة التحليلات التنفيذية والشبكة المتوازنة (Executive BI Symmetrical Grid)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (Symmetrical 2-Column Grid & 0 Emojis).
* **روابط الوصول السريع:** `/dashboard`
* **مسارات الكود الأساسية:**
  * **الفرونت إند (Frontend):** `frontend/src/features/dashboard/components/ExecutiveBiGrid.tsx`, `frontend/src/features/dashboard/components/ExecutiveBiGrid.spec.tsx`
* **الميزات والقدرات المفعلة:**
  1. **الحفاظ الدائم على توازن العمودين (Balanced 2-Column Grid Consistency):** تثبيت تقسيم الشاشة الثنائي المتطابق (50% - 50%) لكارت "توزيع قنوات وطرق التحصيل" وكارت "أعلى القطاعات مساهمة في الإيرادات والربحية" ومنع تمدد أو تشوه أي كارت منفرداً.
  2. **حالة فارغة مؤسسية أنيقة (Enterprise Empty State):** عند فتح حساب جديد أو عندما تكون قاعدة البيانات فارغة (قبل تسجيل أول مبيعات)، يظل الكارت ظاهراً في مكانه محافظاً على الهيكل الجمالي، مع عرض رسالة توجيهية أنيقة وأيقونة SVG رسمية (`BarChartIcon`) توضح أن القطاعات الأكثر ربحية ستظهر تلقائياً بمجرد تسجيل الفواتير أو استيراد بيانات النشاط التجاري.
  3. **تغطية شاملة باختبارات الوحدة (100% Unit Test Coverage):** اختبارات Vitest للتحقق من العرض الثنائي المتزامن في حالة وجود بيانات مبيعات حقيقية، وفي حالة النظام النظيف الفارغ.
  4. **إحكام وتناسق بطاقات الأصناف الأكثر مبيعاً (Top Selling Items Balanced Grid):** ضبط شبكة ثنائية متوازنة (2x2) لكارت "أعلى أصناف اليوم مبيعاً" في `DashboardPage.tsx` لمنع تداخل أو طفو المبالغ المالية خارج إطار الكارت نهائياً، مع تقليم أسماء المنتجات الطويلة بسطرين (`-webkit-line-clamp: 2`)، وتثبيت المبالغ المالية على اليسار مع العملة الرسمية (`ج.م`) وبادجات الترتيب التنازلي الأنيقة (#1 بالكحلي الملكي `#170e5e`، و #2 و #3 و #4)، والانهيار السلس لعمود واحد على شاشات الجوال الضيقة.

---

## 47. إدارة دورة حياة بيانات المشتركين وتصفير المنشآت من الساس (SaaS Tenant Demo Seeding & Factory Reset)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme & Strict Multi-Tenant Isolation).
* **روابط الوصول السريع:** `/saas-admin/tenants` (حصرياً لسوبر أدمن المنصة المركزية `isPlatformAdmin`).
* **مسارات الكود الأساسية:**
  * **الباك إند (Backend):** `backend/src/modules/saas-admin/saas-admin.controller.ts`, `backend/src/modules/saas-admin/saas-admin.service.ts`, `backend/src/modules/settings/services/settings-demo-data.service.ts`
  * **الفرونت إند (Frontend):** `frontend/src/features/saas-admin/api/saas-admin.api.ts`, `frontend/src/features/saas-admin/components/TenantActionHubModal.tsx`, `frontend/src/features/saas-admin/components/SeedTenantDemoModal.tsx`, `frontend/src/features/saas-admin/components/WipeTenantDataModal.tsx`, `frontend/src/features/saas-admin/pages/SaasTenantsPage.tsx`
* **الميزات والقدرات المفعلة:**
  1. **حقن باقات الأنشطة التجريبية للمشترك عن بُعد (Remote Tenant Demo Seeding):** تمكين السوبر أدمن من لوحة تحكم المشتركين المركزية من اختيار أي نشاط تجاري (سوبرماركت، ملابس وأزياء، كافيه ومطعم، إلكترونيات، صيدلية) وحقن بياناته مباشرة في حساب أي مشترك مع خيار الاستبدال التلقائي دون الحاجة لتسجيل الدخول بحساب العميل.
  2. **تصفير قاعدة بيانات المنشأة كلياً (Tenant Factory Reset to Zero):** تمكين السوبر أدمن بضغطة زر عندما يقرر العميل الاستقرار والبدء الفعلي للتشغيل من مسح وتصفير قاعدة بيانات المشترك بالكامل (كافة المنتجات، المخازن، الفواتير، المبيعات، المشتريات، الديون، القيود المحاسبية، الجلسات، والطلبات) لتعود منشأة جديدة تماماً برصيد صفري نظيف، ليدخل العميل بياناته الحقيقية.
  3. **الحفاظ الصارم على هوية المالك والاشتراك (Owner Identity & Subscription Preservation):** استثناء وحماية الحساب الإداري الأساسي لمالك المنشأة وفرعه الرئيسي واشتراكه السحابي تلقائياً من المسح أثناء التصفير، مع تطهير أي مستخدمين أو كاشيرات فرعية تم إنشاؤها عبر الباقات التجريبية.
  4. **الحماية المشددة وتأكيد كلمة مرور السوبر أدمن (Super Admin Password Verification):** اشتراط إدخال كلمة مرور السوبر أدمن الشخصية للتحقق الأمني قبل تنفيذ أي عملية تصفير لمنع أي خطأ بشري غير مقصود، مع أخذ نسخة احتياطية Snapshot فورية لقاعدة بيانات المنشأة قبل التصفير.
  5. **عزل صارم وحظر الوصول للمشتركين (Strict Multi-Tenant Isolation):** عزل تام لمسارات الـ API (`/api/saas-admin/tenants/:id/seed-demo` و `/api/saas-admin/tenants/:id/wipe-data`) بحراسة مزدوجة تشترط `SuperAdminRoleGuard` وهوية المنصة المركزية `isPlatformAdmin`، وحظر كامل لظهور أزرار التصفير أو معالجات المطورين لدى أي مشترك عادي.

---

## 48. تحويل نقطة البيع والكاشير إلى موديول اختياري مرن (Modular POS & Cashier Workspace for B2B & Wholesale ERP)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme).
* **روابط الوصول السريع:** `/settings/modules` (تبويب الموديولات في الإعدادات العامة).
* **مسارات الكود الأساسية:**
  * **النماذج والعقود:** `frontend/src/types/domain-models/settings.ts`, `frontend/src/types/domain-models/system.ts`, `frontend/src/features/settings/schemas/settings.schema.ts`, `frontend/src/features/settings/contracts.ts`, `frontend/src/features/settings/components/forms/SettingsMainForm.tsx`
  * **واجهة الإعدادات والتحكم:** `frontend/src/features/settings/components/forms/tabs/ModulesSettingsTab.tsx`
  * **الشل والقوائم والتوجيه:** `frontend/src/shared/layout/app-shell.tsx`, `frontend/src/features/pos/pages/PosPage.tsx`, `frontend/src/features/cash-drawer/pages/CashDrawerPage.tsx`, `frontend/src/shared/layout/MobileBottomNav.tsx`, `frontend/src/shared/layout/MobileQuickActionSheet.tsx`
* **الميزات والقدرات المفعلة:**
  1. **بطاقة تحكم مؤسسية في شاشة الموديولات (POS Toggle Card):** بطاقة بيضاء نظيفة بأيقونة SVG رسمية (`MonitorIcon`) في ترويسة شبكة الموديولات تتيح للمنشأة تفعيل أو إيقاف واجهات نقاط البيع السريعة والورديات بالكامل بنقرة زر واحدة.
  2. **الاستمرارية الافتراضية للتجزئة (Zero-Breaking Backward Compatibility):** القيمة الافتراضية هي `true` (مفعل)، مما يضمن عدم تأثر أي عميل تجزئة أو سوبرماركت أو مطعم قائم، مع إتاحة التعطيل الفوري للشركات التي لا تحتاج كاشير.
  3. **تكييف القائمة الجانبية والأوامر السريعة (Dynamic Sidebar & Primary Keys Adaptation):** عند إيقاف الكاشير، تختفي صفحات الكاشير (`/pos`) والوردية والدرج النقدي (`/cash-drawer`) والشاشات الملحقة (`/kds`, `/signage`) من القائمة الجانبية، ويتكيف شريط الأوامر السريعة الرئيسي ليصبح: `الرئيسية (Dashboard)`، `سجل الفواتير والمبيعات (Sales)`، و`طلبات المتجر (Online Orders)` لمخاطبة شركات الجملة والمؤسسات كـ Enterprise B2B ERP.
  4. **حماية التوجيه وإعادة التحويل التلقائي (Route-Level Auto-Redirects):** أي محاولة دخول مباشرة للمسار `/pos` عند تعطيل الموديول يُعاد توجيهها فورياً لـ `/sales`، وأي محاولة دخول لـ `/cash-drawer` يُعاد توجيهها لحركات الخزينة `/treasury`.
  5. **التكيف المحمول لشاشات الهواتف (Responsive Mobile Bottom Nav & Quick Actions):** يتحول الزر الرابع في شريط الجوال السفلي تلقائياً من "نقطة البيع" إلى "المخزون" (`/inventory`)، ويتحول زر الإجراء السريع في القائمة المنبثقة من كاشير التجزئة إلى "سجل الفواتير والمبيعات" لإنشاء وإصدار الفواتير الميدانية والتجارية.

## 49. التوحيد البصري المؤسسي الفاخر للقوائم الجانبية وكروت الإعدادات (Ultra-Clean Monochrome Enterprise Sidebar & Cards)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (Monochrome Enterprise & 0 Emojis & Light Enterprise Theme).
* **روابط الوصول السريع:** كافة شاشات المنظومة والقائمة الجانبية والإعدادات العامة `/settings/sales-inventory`.
* **مسارات الكود الأساسية:**
  * **الشل والقوائم:** `frontend/src/shared/layout/app-shell.tsx`, `frontend/src/styles/partials/layout.css`
  * **شاشة الإعدادات:** `frontend/src/features/settings/components/forms/tabs/SalesInventorySettingsTab.tsx`
* **الميزات والقدرات المفعلة:**
  1. **توحيد السايد بار المونوكروم الفاخر (Unified Monochrome Sidebar Navigation):** استبدال مصفوفة ألوان الباستيل وقوس قزح القديمة (`iconToneMap`) بنظام مونوكروم رمادي هادئ موحد لكافة أقسام وعناصر القائمة الجانبية (`#475569` مع خلفية ناعمة `#f8fafc` وإطار `#e2e8f0`)، مما ينقل مظهر النظام لمستوى المنصات العالمية الفاخرة (مثل Stripe و Linear).
  2. **التمييز البصري الذكي للقسم النشط (Royal Navy Brand Accent):** عند الوقوف في أي صفحة أو فتح أي مجموعة في السايد بار، تبرز الأيقونة تلقائياً باللون الكحلي الملكي الرسمي للنظام (`#170e5e`) مع خلفية مريحة للعين (`#eef2ff`)، ليظل التركيز واضحاً بدون أي بهرجة.
  3. **تطهير وتوحيد كروت الإعدادات (Zero-Noise Settings Cards):** توحيد كروت برنامج نقاط وولاء العملاء، وتنبيهات الصلاحية، والأصناف الراكدة، وماكينات نقاط البيع (POS Terminals) لتعتمد كلياً على `iconBadgeStyle` المونوكروم الموحد، وإلغاء خلفيات الباستيل والألوان المتضاربة، وتوحيد أزرار الاختيار السريع لتعتمد لون الكحلي الملكي الرسمي.
  4. **التطهير الشامل لأيقونات الذكاء الاصطناعي (AI Cliché Icon Eradication):** حذف واستبدال كافة أيقونات البريق (`SparklesIcon` / `IconSparkles`) وأيقونات الصواريخ (`RocketIcon`) من 21 شاشة ومكوناً في النظام (بما في ذلك الصيدلية، إدارة الحسابات، بوابات الدفع، وإعدادات الواتساب)، والاعتماد الحصري على نصوص واضحة وتصميم مؤسسي رصين.

---

## 50. معالج التخصيص الذكي للموديولات والأنشطة التجارية (Smart Modular Configurator & Industry Presets)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme & Full Width Responsive Grid).
* **روابط الوصول السريع:** `/settings/modules` (شاشة الموديولات في الإعدادات العامة) وشاشة التهيئة الأولى `/setup`.
* **مسارات الكود الأساسية:**
  * **محرك الأنشطة والاعتماديات:** `frontend/src/features/settings/components/modular-configurator/modular-presets.ts`
  * **معالج التخصيص التفاعلي:** `frontend/src/features/settings/components/modular-configurator/SmartModularConfiguratorModal.tsx`
  * **شريط الوصول السريع:** `frontend/src/features/settings/components/modular-configurator/SmartModularQuickBar.tsx`
  * **إدارة الموديولات بالمنظومة:** `frontend/src/features/settings/components/forms/tabs/ModulesSettingsTab.tsx`
  * **مخطط التحقق:** `frontend/src/features/settings/schemas/settings.schema.ts`
  * **شاشة التهيئة الأولى:** `frontend/src/features/activation/components/onboarding/Step3Industry.tsx`
* **الميزات والقدرات المفعلة:**
  1. **مصفوفة الأنشطة الـ 10 المعيارية (10 Comprehensive Industry Presets):** تغطية شاملة لكافة قطاعات الأعمال في السوق العربي: (1) تجارة التجزئة والسوبرماركت، (2) مبيعات الجملة والتوزيع، (3) المطاعم والكافيهات، (4) الملابس والأزياء والأحذية، (5) الإلكترونيات ومراكز الصيانة، (6) الصيدليات والمراكز الطبية، (7) التصنيع الخفيف والورش، (8) الشركات الخدمية والمقاولات، (9) المتاجر الرقمية والبيع أونلاين، و (10) تخصيص يدوي حر.
  2. **معالج المنيو الذكي (Interactive 3-Step Modular Menu):** تجربة استخدام متكاملة تشبه "قائمة المنيو"؛ الخطوة الأولى لاختيار هوية النشاط، الخطوة الثانية مخصّص للموديولات مع فلاتر الفئات والبحث وشروحات عملية لكل موديول، والخطوة الثالثة ملخص دقيق لما تم تفعيله وما سيبقى مخفياً لتخفيف الواجهة.
  3. **شبكة الاعتماديات التلقائية (Smart Dependencies Resolver):** خوارزمية ذكية تفحص متطلبات كل موديول (مثل اعتماد المطاعم على نقاط البيع، والصيانة على الخدمات والمخزون) وتفعلها آلياً مع تنبيه المستخدم بوضوح.
  4. **محرك المطابقة الذكية للباقات (Smart SaaS Plan Recommendation):** تحليل فوري للموديولات المختارة ومطابقتها التلقائية مع مصفوفة باقات الساس الـ 4 المعتمدة في النظام (الأساسية 3,500 ج.م، الاحترافية 7,500 ج.م، المتكاملة 15,000 ج.م، والتجارة الشاملة 24,000 ج.م) مع إظهار السعر والملخص التشغيلي.
  5. **شريط التبديل السريع بالهيدر (Smart Modular QuickBar):** كارت مؤسسي أنيق بأعلى صفحة الموديولات يتيح التبديل بنقرة واحدة بين الأنشطة الأكثر شيوعاً، مع زر تشغيل المعالج الكامل بلون الكحلي الملكي الرسمي.
  6. **الالتزام الكامل بالدستور البصري وحظر الإيموجيز (Enterprise Visual Constitution & 0 Emojis):** خلفية ناصعة (`#f8fafc`)، بطاقات بيضاء نقية (`#ffffff`)، حدود ناعمة (`#e2e8f0`)، زر إجراءات كحلي ملكي عميق (`#170e5e`)، وخلو تام ومطلق من أي إيموجيز أو رموز كرتونية مع الاعتماد الحصري على أيقونات SVG خطية معتمدة.

---

## 51. الهيكلية النمطية الشاملة وتحويل النواة الكلاسيكية لموديولات اختيارية (Full Modular Core: Purchases, Advanced Inventory & HR)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme & Dynamic Sidebar Pruning).
* **روابط الوصول السريع:** `/settings/modules` (شاشة الموديولات في الإعدادات العامة) وكافة شاشات المنظومة.
* **مسارات الكود الأساسية:**
  * **المخطط والتحقق:** `frontend/src/features/settings/schemas/settings.schema.ts`, `frontend/src/features/settings/components/forms/SettingsMainForm.tsx`
  * **شاشة التحكم والتبديل:** `frontend/src/features/settings/components/forms/tabs/ModulesSettingsTab.tsx`
  * **محرك الأنشطة وقوالب الساس:** `frontend/src/features/settings/components/modular-configurator/modular-presets.ts`
  * **شريط التوجيه والقائمة الجانبية:** `frontend/src/shared/layout/app-shell.tsx`
* **الميزات والقدرات المفعلة:**
  1. **تحويل النواة الكلاسيكية لموديولات مرنة (Modular Core Transformation):** تحويل الأنظمة التي كانت تُعد ثابتة سابقاً (المشتريات والموردين، المخازن المتقدمة، والموارد البشرية HR) إلى موديولات نمطية قابلة للتفعيل والتعطيل بنقرة زر واحدة على غرار بنية Odoo العالمية.
  2. **الحفاظ الصارم على التوافقية العكسية (Default True Compatibility):** تعيين القيمة الافتراضية للموديولات الثلاثة إلى `true`، مما يضمن عدم تأثر أي حساب أو عميل قائم إطلاقاً، مع إتاحة التعطيل الفوري لأي منشأة ترغب في تبسيط واجهتها.
  3. **الحجب الذكي والكامل لعناصر ومجموعات القائمة الجانبية (Dynamic Sidebar Pruning):**
     * **المشتريات والموردين (`purchasesModuleEnabled`):** عند الإيقاف، يتم حجب إنشاء فاتورة شراء، سجل الفواتير، مرتجعات المشتريات، الموردين، مقترح إعادة الطلب الذكي، وتقارير المشتريات؛ وبذلك تصبح مجموعة `المشتريات والموردين` فارغة تماماً وتختفي كلياً من القائمة الجانبية تلقائياً.
     * **المخازن المتقدمة (`inventoryModuleEnabled`):** عند الإيقاف، يتم حجب أماكن المخزون، شجرة المخازن، أذونات الصرف والتحويلات، وتقارير المخزون؛ لتبقى الواجهة خفيفة ومناسبة للشركات الخدمية والمكاتب الاستشارية.
     * **الموارد البشرية (`hrModuleEnabled`):** عند الإيقاف، يتم حجب موديول الموارد البشرية والرواتب من مجموعة الإدارة والنظام، وحجب تقارير الموظفين من التقارير.
  4. **كروت تحكم مؤسسية بأيقونات رسمية موحدة (Enterprise Toggle Cards):** تم تصميم كروت التحكم الثلاثة في ترويسة تبويب الموديولات وفق الدستور البصري الموحد بأيقونات رسمية (`PackageIcon`, `ReceiptIcon`, `UsersIcon`)، مع فحص صلاحيات باقة الاشتراك السحابي (`useHasFeature`) وعرض شارة "ترقية مطلوبة" عند عدم توفر الميزة في الباقة.
  5. **التكامل مع معالج الأنشطة وترشيح الباقات (Preset Engine Integration):** ربط المفاتيح الثلاثة بمصفوفة الأنشطة الـ 10، حيث يقوم نشاط "الشركات الخدمية والمقاولات" بتعطيل المخازن والمشتريات تلقائياً لتحويل النظام إلى نظام محاسبي وفوترة فائق السرعة والخفة.
  6. **التطبيق الشامل للفلترة ومنع التجاوز العشوائي (Universal Sidebar Pruning Without Admin Bypass):** إلغاء استثناء السوبر أدمن التلقائي (`Platform Admin Bypass`) في شروط إخفاء الموديولات، بحيث يعكس السايد بار دائماً حالة إعدادات المنشأة الفعلية (`settings.*`) بدقة 100% للجميع؛ فإذا تم تعطيل موديول، يختفي فورياً من السايد بار حتى للسوبر أدمن لضمان مطابقة تجربة الاستخدام ومحاكاة بيئة العميل بدقة، مع اقتصار خصوصية السوبر أدمن على إدارة المنصة والساس (`saas-admin`) وإشراف النظام المركزي.
  7. **تطهير وهيكلة مسارات السايد بار وإلغاء الحشو (Sidebar Deduplication & Workflow Reorganization):** 
     - **إلغاء العناصر المكررة:** حذف «إنشاء فاتورة شراء» من السايد بار للاكتفاء بزر الإنشاء داخل «سجل فواتير المشتريات»، وحذف «إذن صرف جديد» للاكتفاء بزر الإنشاء داخل «سجل أذونات الصرف والتحويل».
     - **إعادة التموضع المنطقي الصحيح:** نقل «الإقرار الضريبي (ن10 و ZATCA)» إلى قسم «المالية والمحاسبة»، وتقديم «الخدمات» للأعلى مباشرة بعد «أقسام الأصناف» لتجاور كتالوج المنتجات.
     - **فصل شاشات التشغيل والمطاعم:** استحداث قسم مستقل لـ «المطاعم والكافيهات» يظهر حصرياً عند تفعيل الموديول ويحتوي على «شاشة المطبخ (KDS)»، مع تنظيف قسم المبيعات وترتيبه وفق تسلسل دورة البيع الطبيعية (عروض أسعار ➔ فواتير ➔ مرتجعات ➔ تقسيط ➔ عملاء ➔ مناديب ➔ فاتورة إلكترونية ➔ شاشات عروض).

---

## 52. أتمتة تهيئة الموديولات عند التسطيب الأول في الإلكترون وصفحة الترحيب والتخصيص المستقلة في الساس (Desktop First-Run Setup & SaaS Full-Page Onboarding Hub)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Light Enterprise Theme & Full-Page Clean Architecture).
* **روابط الوصول السريع:** مسار التهيئة الأولى للديسكتوب `/setup` ومسار الترحيب والتخصيص المستقل للساس `/onboarding` (مع دعم المعاينة المباشرة `?preview=1` أو `?onboarding=1`).
* **مسارات الكود الأساسية:**
  * **الباك إند (Backend):** `backend/src/modules/activation/dto/initialize-app.dto.ts`, `backend/src/modules/activation/activation.service.ts`
  * **الفرونت إند (Frontend - Desktop):** `frontend/src/types/activation.ts`, `frontend/src/features/activation/hooks/useFirstRunSetupPageController.ts`, `frontend/src/features/activation/components/onboarding/OnboardingWizard.tsx`, `frontend/src/features/activation/components/onboarding/Step3Industry.tsx`
  * **الفرونت إند (Frontend - SaaS):** `frontend/src/features/activation/pages/SaaSOnboardingPage.tsx`, `frontend/src/app/router/root-router.tsx`, `frontend/src/shared/layout/app-shell.tsx`, `frontend/src/features/settings/schemas/settings.schema.ts`, `frontend/src/features/settings/contracts.ts`, `frontend/src/features/settings/components/modular-configurator/modular-presets.ts`
* **الميزات والقدرات المفعلة:**
  1. **التهيئة الفورية في معالج الديسكتوب والإلكترون (Offline / Electron First-Run Automation):** ربط الخطوة الثالثة لاختيار النشاط التجاري في معالج التثبيت الأول (`/setup`) بحفظ وتطبيق حزمة الإعدادات والموديولات الكاملة في جدول `settings` المحلي تلقائياً داخل المعاملة (Transaction) ذاتها، ليدخل العميل بعد التسطيب ويجد النظام مفصلاً ومضبوطاً حسب نشاطه بنسبة 100%.
  2. **صفحة الترحيب والتخصيص الكاملة والمستقلة لمشتركي الساس (Full-Page SaaS Onboarding Experience):** الانتقال من نمط النوافذ المنبثقة الضيقة إلى صفحة كاملة مستقلة `/onboarding` تستقبل العميل ببيئة هادئة وناصعة (Clean White & Light Slate `#f8fafc`) تعرض شبكة الأنشطة الـ 10 المعيارية بأيقونات SVG خطية معبرة وفائقة الدقة بدون أي تآكل للحواف وبدون سكرول داخلي محشور.
  3. **التخصيص الفوري بنقرة واحدة (Instant 1-Click Environment Setup):** بمجرد اختيار النشاط والضغط على "تأكيد الإعداد وبدء العمل"، يتم تطبيق وضبط كافة مفاتيح الموديولات والأنماط وحجب ما لا يلزم في القائمة الجانبية وحفظ علامة الإكمال (`onboardingCompleted: true`) والتوجيه السلس إلى لوحة التحكم الرئيسية (`/`).
  4. **خيار التخطي المؤسسي (Graceful Skip & Dismissal):** إتاحة زر "تخطي والبدء بالإعدادات الافتراضية" ليتمكن العميل من بدء العمل بالإعدادات الافتراضية مع حفظ علامة الإكمال لعدم إزعاجه مرة أخرى، بالإضافة لخيار "تخصيص متقدم بنداً ببند" للانتقال السلس لمعالج الموديولات في الإعدادات.
  5. **عزل الصلاحيات وحماية السوبر أدمن (Privilege Guard):** حظر ظهور صفحة الترحيب لسوبر أدمن المنصة المركزية (`isPlatformAdmin`)، واقتصارها حصرياً على مديري المنشآت المستضافة (`admin` أو `super_admin`) عند كون `onboardingCompleted !== true`.
  6. **ثبات الكروت التام وهندسة انعدام الإزاحة البصرية (Zero Layout Shift on Selection):** تثبيت أبعاد الكروت بدقة متناهية؛ سمك الحدود ثابت دائماً `2px` وحجز مساحة علامة الفحص (Checkmark) الموحدة وتثبيت أحجام وأوزان الخطوط، مما يحقق ثباتاً هندسياً مطلقاً (CLS = 0) عند التبديل بين كروت الأنشطة دون أي اهتزاز أو تغير في الأبعاد أو التفاف النصوص.
  7. **لوحة الموديولات التفاعلية المترابطة (Interrelated Module Selector & Logical Grouping):** إعادة تنظيم وترتيب الموديولات الـ 20 وفق ترابطها وتكاملها التشغيلي (المشتريات متجاورة مع المخازن، والخدمات مع الصيانة والسيريال، واللوجستيات مع المتجر الإلكتروني، والمحاسبة مع التقسيط والضرائب) مع ترويسات فرعية أنيقة لكل مجموعة، وزر تأكيد سريع علوي لمنع الحاجة للنزول لآخر الصفحة.
  8. **تصحيح دورة المشتريات والمخازن للأنشطة التجارية (Correct Commercial Lifecycle):** تفعيل موديول المشتريات وإدارة الموردين وموديول المخازن المتقدمة تلقائياً لكافة الأنشطة التجارية (تجزئة، جملة، مطاعم، أزياء، أجهزة، إلخ) لحساب متوسط التكلفة المرجح WAC وجرد الأصناف بدقة.
  9. **حساب الباقة والمطابقة التلقائية اللحظية (Real-time Plan Tier Calculation):** حساب فوري ومباشر للباقة المتوافقة (الأساسية، باقة النمو، المتكاملة، التجارة الشاملة) استناداً إلى الموديولات المحددة فعلياً، وحفظ اختيارات العميل المخصصة بدقة تامة.
  10. **تكامل دورة التوجيه بعد تسجيل الدخول (End-to-End Post-Login Redirection):** فحص حالة التهيئة الأولية للمشترك الجديد لحظياً عبر مسار `auth/me` وجلسة المستخدم؛ حيث يتم توجيه مدير المنشأة تلقائياً إلى `/onboarding` في حال عدم اكتمال التهيئة (`onboardingCompleted: false`)، مع منع التخطي العشوائي، والتحويل الفوري إلى الرئيسية `/` وتكييف السايد بار لحظياً فور الحفظ.
  11. **دليل البداية السريعة لتشغيل المنشأة بالداشبورد (Tenant Quick-Start Checklist):** بطاقة إرشادية مؤسسية أنيقة وخفيفة في أعلى لوحة التحكم الرئيسية (`TenantQuickStartChecklist.tsx`) ترشد المشترك الجديد نحو أولى محطاته التشغيلية الثلاث: (1) ضبط بيانات المنشأة وترويسة الفواتير، (2) إضافة أول منتج أو استيراد بيانات تجريبية جاهزة، و(3) فتح أول وردية وبدء البيع (POS)، مع مؤشر إنجاز ناعم وزر إخفاء وحفظ الحالة محلياً.
  12. **تخصيص البيانات التجريبية حسب النشاط المختار (Industry-Aware Demo Data Engine):** ربط محرك سكب البيانات التجريبية (`settings-demo-data.service.ts`) بنشاط المنشأة المختار في التهيئة (`businessIndustry`)، بحيث يتم تلقائياً سكب أصناف وفواتير مطابقة تماماً للمجال (وجبات وطاولات للمطاعم، ملابس ومقاسات للأزياء، أجهزة وصيانة للإلكترونيات، أدوية وباتشات للصيدليات، وبقالة وسلع استهلاكية للتجزئة) وتحديث نصوص أزرار السكب السريع بالداشبورد ومعالج الإعدادات تلقائياً.
   13. **إتاحة العودة المستمرة لصفحة التهيئة والتخصيص طالما لم يتم إدخال أصناف (Onboarding Re-entry While Inventory is Empty):** السماح للمستخدم بفتح شاشة التهيئة وتعديل النشاط والموديولات (`/onboarding`) حتى لو كان قد ضغط على "تخطي" مسبقاً، وذلك طالما أن عدد الأصناف في المنشأة صفر (`totalProducts === 0`) لمنحه فرصة التعديل بحرية كاملة قبل بدء العمل الفعلي، مع توفير رابط وصول سريع ومباشر في ترويسة دليل البداية السريعة بالداشبورد (`TenantQuickStartChecklist`) يتيح فتح الشاشة بضغطة زر واحدة في أي وقت.
   14. **الإخفاء التلقائي لدليل البداية السريعة عند اكتمال الجاهزية 100% (Auto-dismiss on 100% Operational Readiness):** إخفاء بطاقة دليل البداية السريعة بالداشبورد (`TenantQuickStartChecklist.tsx`) تلقائياً وحفظ إغلاقها في التخزين المحلي بمجرد إنجاز الخطوات التشغيلية الثلاث بالكامل (100%) لمنع ازدحام لوحة التحكم واستقرار الداشبورد نظيفة للمستخدم.
   15. **التدفق الإرشادي المتصل والتوجيه التلقائي في شاشات الإعدادات (Guided Continuous QuickStart Stepper):** إضافة شريط إرشادي متصل بالترويسة (`QuickStart Banner`) في شاشة إعدادات المنشأة الأساسية (`/settings/core?setup=quickstart`) وشاشة استيراد البيانات التجريبية (`/settings/demo-data?setup=quickstart`) يوضح رقم الخطوة وما سيحدث بعدها، مع التوجيه التلقائي المباشر للخطوة التالية (تجهيز الأصناف) فور حفظ بيانات المنشأة دون ضياع المستخدم أو إجباره على العودة اليدوية للرئيسية.
   16. **نافذة التحميل الكاملة ومؤشر الانتظار الشفاف عند سكب البيانات التجريبية (Transparent Full-Screen Seeding Overlay):** عرض نافذة تحميل كاملة في منتصف الشاشة (`Full-Screen Loading Overlay`) أثناء سكب البيانات التجريبية توضح للمستخدم بالاسم والنص والعداد أنه جاري توليد 50 صنفاً وفواتير كاشير وعمليات خزينة لنشاطه المختار، مع استبدال إعادة تحميل الصفحة العشوائية (`window.location.reload`) بالتحديث الحي الناعم لكويريز البيانات (`queryClient.invalidateQueries`) وعرض نافذة نجاح تفاعلية توجهه مباشرة للخطوة الثالثة (فتح الكاشير).

---

## 53. منظومة الهوية الموحدة بالموبايل وعزل المستأجرين الصارم (Zero-Trust Mobile-First Identity & Multi-Tenant Disambiguation)
* **حالة الوحدة:** 🟢 مكتمل 100% ومختبر آلياً بنسبة 100% ضد سيناريوهات تداخل الحسابات (0 Emojis & Zero Data Leakage).
* **روابط وشاشات الوصول:** `/login` (شاشة دخول النظام الرئيسية)، `/settings/users` (إدارة المستخدمين والصلاحيات)، `/portal` (بوابة الموظف الذاتية)، `/punch` (بصمة الحضور بالموبايل)، `/driver-portal` (بوابة المناديب وسائقي الفان).
  * **مسارات الكود الأساسية:**
  * **الترحيل وقاعدة البيانات:** `backend/src/database/migrations/2040000000048_add_phone_to_users_and_tenant_disambiguation.ts`, `backend/src/database/database.types.ts`
  * **أدوات التحقق والدول:** `backend/src/core/utils/phone-utils.ts`, `frontend/src/shared/utils/phone-utils.ts`
  * **إدارة المستخدمين:** `backend/src/modules/users/users.service.ts`, `backend/src/modules/users/helpers/users.helper.ts`, `backend/src/modules/users/dto/upsert-user.dto.ts`, `backend/src/modules/users/dto/update-profile.dto.ts`
  * **نظام الجلسات والمصادقة:** `backend/src/core/auth/services/session.service.ts`, `backend/src/modules/sessions/sessions.controller.ts`, `backend/src/modules/sessions/dto/login.dto.ts`
  * **بوابات الموظفين والمناديب:** `backend/src/modules/hr/employee-portal.service.ts`, `backend/src/modules/hr/employee-portal.controller.ts`, `backend/src/modules/hr/mobile-attendance.service.ts`, `backend/src/modules/hr/mobile-attendance.controller.ts`, `backend/src/modules/delivery-reps/delivery-reps.service.ts`, `backend/src/modules/delivery-reps/driver-portal.controller.ts`
  * **الواجهة الأمامية (Frontend):** `frontend/src/features/auth/pages/LoginPage.tsx`, `frontend/src/features/auth/hooks/useLoginForm.ts`, `frontend/src/shared/api/auth.ts`, `frontend/src/features/settings/components/user-management-panels/UserManagementEditorCard.tsx`, `frontend/src/features/settings/hooks/useUserManagement.helpers.ts`, `frontend/src/features/settings/components/user-management.shared.ts`, `frontend/src/features/settings/api/settings.api.ts`, `frontend/src/features/hr/pages/EmployeePortalPage.tsx`, `frontend/src/features/hr/api/employee-portal.api.ts`
  * **الاختبارات الآلية الحساسة:** `backend/test/critical/session-auth.spec.ts`, `backend/test/infra/phone-utils.spec.ts`, `backend/test/infra/users.helper.spec.ts`, `frontend/src/features/settings/hooks/useUserManagement.helpers.spec.ts`, `frontend/src/features/auth/pages/LoginPage.spec.tsx`
* **الميزات والقدرات المفعلة:**
  1. **إلغاء ثغرة الاختيار العشوائي `candidates[0]` نهائياً (Zero-Trust Disambiguation):** استئصال الاختيار العشوائي بالكامل؛ في حال وجود تطابق لاسم المستخدم وكلمة المرور بين مستأجرين مختلفين، يرفض النظام الدخول فوراً برمية استثناء صريحة تمنع أي تسريب للبيانات: *"بيانات الدخول مسجلة لدى أكثر من منشأة بنفس كلمة المرور. يرجى تسجيل الدخول برقم الهاتف المحمول أو تحديد كود المنشأة لمنع تداخل الحسابات."*.
  2. **إلزامية رقم الهاتف المحمول ومنع الحفظ بدونه (Mandatory Phone Field Enforcement):** أصبح حقل رقم الهاتف إجبارياً (`*`) في الباك إند (`UpsertUserDto`) والفرونت إند (`validateUserDraft`)؛ ويُمنع نهائياً إنشاء أو تعديل أي مستخدم بدون إدخال رقم هاتف صالح وموثق.
  3. **حقل الهاتف الموحد المدمج والدروب داون البريميوم (Unified LTR Phone Input with Premium Combobox - 0 Emojis):**
     - دمج اختيار الدولة مع رقم الهاتف في **حقل واحد موحد وأنيق** بعنوان `رقم الهاتف المحمول * (Mobile Phone)`، مما يحافظ على التوزيع المتناسق لشبكة حقول المستخدمين (3 أعمدة متزنة).
     - وضع بادج كود الدولة المنسدل على **يسار الرقم** (LTR Layout) وفق المعايير العالمية لكتابة أرقام الهواتف، مع إزالة التكرار البصري للكود.
     - عند النقر على كود الدولة، تفتح القائمة العائمة البريميوم المعتمدة في السستم (`custom-combobox-dropdown` المطابقة لتذاكر الصيانة واستلام الأجهزة والمبنية على `combobox-system.css`) مع التنقل بالأسهم وعلامة فحص SVG للبلد المختار وبدون أي إيموجيز كرتونية.
     - الفاليديشن الذكي التلقائي لكل دولة:
       - **مصر (+20):** تحقق صارم من 11 رقماً تبدأ بـ `010` أو `011` أو `012` أو `015`.
       - **المملكة العربية السعودية (+966):** 9 أرقام تبدأ بـ `5` (أو 10 أرقام تبدأ بـ `05`).
       - **دولة قطر (+974):** 8 أرقام تبدأ بـ `3` أو `5` أو `6` أو `7`.
       - **الإمارات العربية المتحدة (+971):** 9 أرقام تبدأ بـ `5` (أو 10 أرقام تبدأ بـ `05`).
       - **دولة الكويت (+965):** 8 أرقام تبدأ بـ `5` أو `6` أو `9`.
       - **سلطنة عمان (+968):** 8 أرقام تبدأ بـ `7` أو `9`.
       - **مملكة البحرين (+973):** 8 أرقام تبدأ بـ `3` أو `6`.
       - **المملكة الأردنية الهاشمية (+962):** 9 أرقام تبدأ بـ `7` (أو 10 أرقام تبدأ بـ `07`).
       - **دولي / أخرى:** أرقام دولية بين 7 و 15 خانة وفق معيار ITU-T E.164.
  4. **إزالة الشرح الزائد وتوحيد ارتفاعات الصفوف (Zero Whitespace Clutter):** إزالة النص التوضيحي الثابت من أسفل حقل الهاتف لتوحيد ارتفاعات أعمدة الصف الأول تماماً ومنع أي فراغ أو إزاحة رأسية بين الحقول والدروب داون في الصف الثاني، مع الاحتفاظ بـ `title` وتلميح الـ Placeholder الشامل والفحص اللحظي والتحقق الصارم عند الحفظ.
  5. **منع تكرار الهاتف داخل المنشأة (Unique Phone per Tenant):** التحقق المزدوج على مستوى الواجهة وقاعدة البيانات لمنع تسجيل نفس رقم الهاتف لمستخدمين مختلفين داخل المنشأة ذاتها.
  6. **التوليد الذكي لتنويعات البحث بالمطابقة الشاملة (Universal Search Variants Generator):** توليد كافة الصيغ الممكنة للرقم (بالكود الدولي `+20...`، أو بالبادئة المحلية `010...`، أو بالأرقام المجردة) لضمان تسجيل دخول فوري وسلس من شاشة `/login` بأي صيغة يكتبها المستخدم.
  7. **حقل وفهارس الموبايل في قاعدة البيانات:** إضافة عمود `phone` لجدول `users`، وإنشاء فهارس سريعة `idx_users_phone` و `idx_users_tenant_phone` مع الترحيل التلقائي لهاتف المالك من جدول المنشآت `tenants.owner_phone` للحسابات القائمة.
  8. **حماية بوابة الموظفين وبصمة الموبايل (`/portal` و `/punch`):** توحيد شاشتي بوابة الموظف وبصمة الحضور للمطالبة الحصرية برقم الهاتف المحمول (`رقم الهاتف المحمول: مثال: 01012345678`) بدلاً من كود الموظف لمنع أي تضارب أو التباس لحسابات الموظفين بين المنشآت عند تشابه الأكواد والـ PIN الافتراضي، مع الإبقاء على دعم كود الموظف كخيار خلفي حصري عند اقتران الرابط بكود المنشأة (`?c=ragab`).
  9. **حماية وبوابة المناديب وسائقي الفان (`/driver-portal`):** حظر أي تداخل بين المنشآت عند تشابه أرقام هواتف أو رموز PIN المناديب؛ وفي حال تسجيل المندوب لدى أكثر من منشأة بنفس الرقم، تظهر له نافذة اختيار المنشأة (`Tenant Switcher Modal`) لاختيار المحل المراد توصيل طلباته ومتابعة عهدته الآن، مع ظهور شارة اسم المنشأة النشطة وزر `تبديل المنشأة` في ترويسة الشاشة لسهولة التبديل بضغطة زر واحدة ودون أي خلط للعهدة النقدية أو طلبات العملاء.
  10. **الحفظ التلقائي لكود المنشأة في المتصفح (Auto-Remember Last Tenant):** حفظ تلقائي لمعرف المنشأة في التخزين المحلي للمتصفح عند أول تسجيل دخول ناجح على الجهاز، لتسهيل الدخول المستقبلي للكاشير والموظفين دون الحاجة لإعادة كتابته.
  11. **دعم الروابط المباشرة وملصقات الباركود:** دعم معلمات الرابط `?c=companyCode` و `?tenant=companyCode` لتمكين أصحاب الأنشطة من طباعة QR Code للمحل يفتح شاشات الدخول والبوابات مقترنة مباشرة بالمنشأة.
  12. **نافذة اختيار وتبديل المنشأة التلقائية عند تعدد الحسابات (Automatic Tenant Switcher & Account Picker Modal):** عند وجود حساب متطابق للمستخدم لدى أكثر من منشأة بنفس كلمة المرور، يرسل الباك إند كود استثناء `MULTIPLE_TENANTS` مرفقاً بقائمة المنشآت المطابقة (`id`, `name`, `slug`). تظهر في الواجهة نافذة حوارية عائمة مؤسسية راقية ونظيفة (0 Emojis) بعنوان "اختر المنشأة للمتابعة" مع كروت تفاعلية بأسماء وأكواد المنشآت وأيقونات SVG رسمية، تمكّن المستخدم من النقر المباشر على منشأته للدخول فوراً دون أي لبس أو تداخل.
  13. **حقل إدخال كود المنشأة اليدوي وشارة المنشأة المحفوظة (Manual Company Code Input & Switch Badge):** إتاحة شارة ذكية أعلى نموذج تسجيل الدخول عند تذكر منشأة سابقة مع زر "تغيير" لتبديل المنشأة، وزر "+ تحديد كود منشأة معين" لفتح حقل اختياري يتيح للمستخدم كتابة كود أو معرف منشأة محددة يدوياً قبل تسجيل الدخول مع التحقق التلقائي والربط الصارم.
  14. **المعالجة المتوازية الفورية لكلمات المرور (Concurrent High-Performance Verification):** فحص ومطابقة الهاش عبر `Promise.all` لكافة المرشحين بالتوازي بدلاً من الحلقات التتابعية، مما يقلل زمن الاستجابة إلى أجزاء من الثانية.
  15. **التمييز الدقيق بين تعدد المنشآت وتعدد الحسابات الداخلية (Multi-Tenant vs Same-Tenant Disambiguation):** في حال تكرار رقم الهاتف لأكثر من حساب داخل نفس المنشأة، يوجه النظام المستخدم بوضوح لتسجيل الدخول باسم المستخدم الخاص به، بينما يُفعّل نافذة اختيار المنشأة حصرياً عند تعدد المنشآت الفعلية.
  16. **حفظ وتمرير الهاتف الآمن في تعديل المستخدمين (Sanitized User Phone Payload):** دمج حقل `phone` داخل `sanitizeUserPayload` في واجهة إعدادات المستخدمين لمنع أخطاء التحقق (`minLength`) عند التحديث أو التعديل.

---

## 54. مركز البوابات الموحد وإدارة السائقين ومبيعات الفان الميدانية (Portals Hub & Driver Portal & Van Sales Navigation)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **روابط وشاشات الوصول:** `/hub` (مركز البوابات الموحد)، `/driver` (بوابة السائقين والدليفري)، `/van-sales` (مبيعات سيارات الفان المتنقلة).
* **مسارات الكود الأساسية:**
  * **الفرونت إند (Frontend):** `frontend/src/features/portals/pages/PortalsHubPage.tsx`, `frontend/src/features/delivery-reps/pages/DriverPortalPage.tsx`, `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`
  * **الباك إند (Backend):** `backend/src/modules/delivery-reps/delivery-reps.service.ts`, `backend/src/modules/delivery-reps/driver-portal.controller.ts`, `backend/src/modules/delivery-reps/van-sales.controller.ts`
* **الميزات والقدرات المفعلة:**
  1. **مركز البوابات الشامل (`/hub`):** لوحة تجميع مركزية لكافة بوابات النظام الميدانية والخدمية (بوابة الموظف الذاتية، بصمة الموبايل، بوابة السائقين، مبيعات الفان، المتجر الإلكتروني، المطبخ والشاشات، الصيانة، إلخ) بتصميم مؤسسي نظيف ووصول مباشر.
  2. **معالجة حلقة التوجيه في سجل المتصفح (Safe History Navigation & Loop Elimination):** استبدال إعادة التوجيه التلقائي في شاشة مبيعات الفان (`VanSalesMobilePage`) من `navigate('/driver')` إلى `navigate('/driver', { replace: true })` عند عدم وجود جلسة سائق نشطة؛ مما يمنع حبس المستخدم في حلقة تكرار لانهائية (Redirect Loop Trap) عند الضغط على زر الرجوع (Back) في المتصفح، ويسمح بالرجوع الطبيعي والسلس فوراً لمركز البوابات `/hub` أو الصفحة السابقة.
  3. **روابط العودة المباشرة لمركز البوابات (Direct In-App Hub Links):** إضافة رابط عودة مباشر وواضح لمركز البوابات (`← العودة لمركز البوابات`) في ترويسة ونموذج تسجيل دخول السائقين (`DriverPortalPage`) وشاشة مبيعات الفان (`VanSalesMobilePage`)، مع تحويل كافة مسارات التنقل الداخلية إلى التنقل الأحادي (SPA Navigate) بدلاً من إعادة التحميل الكامل (`window.location.href`).
  4. **بوابة السائقين ومبيعات الفان المستقلة:** دعم تصفح الأوردرات المسندة للسائق، تأكيد التسليم والتحصيل، وتوزيع وبيع بضائع سيارات الفان مع المزامنة اللحظية مع المخازن والخزينة.

---

## 55. مركز إدارة الهويات والوصول الموحد للعاملين والمناديب والموظفين (Unified Identity & Access Management - IAM Directory)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **روابط وشاشات الوصول:** `/settings/users` (معلمات التبويب: `?tab=drivers` و `?tab=employees`)، `/hub` (زر الوصول السريع لإدارة الحسابات والوصول).
* **مسارات الكود الأساسية:**
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/settings/components/UserManagementSection.tsx` (إدارة التبويبات الموحدة وشريط التنقل المتجاوب).
    * `frontend/src/features/settings/components/user-management/UnifiedAccessDirectoryPanel.tsx` (لوحة إدارة وصول المناديب ولوحة إدارة وصول موظفي الخدمة الذاتية والبصمة).
    * `frontend/src/features/portals-hub/pages/PortalsHubPage.tsx` (زر مباشر في ترويسة الـ Hub للانتقال لمركز إدارة الحسابات).
    * `frontend/src/features/hr/pages/EmployeeProfilePage.tsx` (زر ونافذة تعيين رمز الـ PIN لبوابة الموظف وبصمة الموبايل في بروفايل الموظف).
  * **الباك إند ومصادر البيانات الأساسية (Single Source of Truth):**
    * `backend/src/modules/delivery-reps/delivery-reps.service.ts` و `shared/api/delivery-reps.api.ts` (تعديل الـ PIN وتغيير الهاتف وتجميد وتفعيل حساب المندوب).
    * `backend/src/modules/hr/mobile-attendance.controller.ts` (`@Put('employees/:id/pin')`) و `frontend/src/features/hr/api/mobile-punch.api.ts` (`setEmployeePin`).
    * `backend/src/modules/hr/hr.service.ts` و `hr.controller.ts` (`@Patch('employees/:id/status')` لتغيير الحالة الذري، `@Put('employees/:id/credentials')` لتعديل الهاتف والـ PIN ذرياً، و `listEmployees` لإرجاع الهاتف و `pin_code`).
    * `backend/src/modules/users/users.service.ts` (`settingsApi.updateUser`).
* **الميزات والقدرات المفعلة:**
  1. **الربط المباشر بالكود المصدري الأصلي (Zero-Duplication Single Source of Truth):** الصفحة المجمعة لا تكرر أي كود أو جداول، بل تتصل مباشرة بالـ APIs ومفاتيح الكاش ومصادر البيانات الأصلية؛ فأي تعديل في هاتف أو PIN السائق أو الموظف في الصفحة المجمعة ينعكس فوراً في شاشة المناديب وشاشة الموظفين والعكس صحيح لحظياً.
  2. **التبويبات الموحدة في شاشة إدارة المستخدمين (`/settings/users`):**
     - **مستخدمو لوحة الإدارة (ERP Users):** إدارة أدوار النظام (كاشير، محاسب، مدير، سوبر أدمن)، الصلاحيات، الفروع، وكلمات المرور مع احترام حدود الباقة.
     - **مناديب التوصيل والفان (Drivers & Reps):** عرض طياري الدليفري وموزعي الفان، أرقام الهواتف، رموز الـ PIN السريعة، إيقاف وتفعيل الحساب فورياً، نسخ روابط البوابات (`/driver` و `/van-sales`)، وزر انتقال مباشر لملف المندوب الكامل.
     - **موظفو الخدمة الذاتية والبصمة (Staff):** عرض كافة موظفي المنشأة، أرقام الهواتف، رموز الدخول السريع للبصمة الذكية والبوابة، زر "تعديل الـ PIN والهاتف" المباشر، تبديل حالة الحساب (نشط / موقوف) عبر نقطة نهاية ذرية، ونسخ روابط `/portal` و `/punch` وزر انتقال للملف الوظيفي في HR.
  3. **تعديل الهاتف والـ PIN الذري لموظفي الخدمة الذاتية (Atomic Employee Credentials & Phone Update):** إضافة مسار مخصص `@Put('employees/:id/credentials')` ومودال متكامل يتيح إدخال أو تعديل رقم الهاتف المحمول والـ PIN للموظف مباشرة من شاشة الإدارة المجمعة، مع الترحيل التلقائي لجدول `hr_employee_contacts` كجهة اتصال أساسية (`is_primary: true`) وحفظ `pin_code` وتفعيل بصمة الموبايل، وعكس التعديل لحظياً في الجدول بدون الحاجة لإعادة تحميل الصفحة.
  4. **تبديل حالة الموظف المخصص (`@Patch('employees/:id/status')`):** إنشاء مسار مخصص ونظيف لتحديث حالة الموظف وتجميده أو تفعيله دون الحاجة لتمرير كائن الموظف بالكامل لتجنب أخطاء التحقق الصارم (`firstName required`).
  5. **إلزامية رقم الهاتف المحمول عند تسجيل موظف جديد (Mandatory Phone as ESS Login Identifier):** التأكيد الصارم على إلزامية رقم المحمول كمعرف فريد أساسي لتسجيل الدخول في بوابة الخدمة الذاتية (`/portal`) وبصمة الحضور الذكية بالـ GPS (`/punch`)، ودمجه في جدول الموظفين وجهات الاتصال تلقائياً.
  6. **زر الإدارة السريع في ترويسة مركز البوابات (`/hub`):** إضافة زر "إدارة الحسابات والوصول" في الشريط العلوي لدليل البوابات، لتمكين المسؤول من الوصول الفوري لتعديل بيانات أي سائق أو موظف يواجه مشكلة في تسجيل الدخول.
  7. **زر ونافذة تعيين الـ PIN في بروفايل الموظف في HR (`EmployeeProfilePage`):** تمكين مسؤولي شؤون العاملين من تعيين أو إعادة تعيين رمز الدخول السريع للموظف مباشرة من بطاقة التشغيل بالملف الشخصي.
  8. **تصميم مؤسسي نظيف وخالٍ تماماً من الإيموجيز (0 Emojis):** اعتماد كامل على أيقونات SVG القياسية من `@/shared/components/icons/AppIcons`، ألوان المنظومة المعتمدة (`#170e5e`، رمادي محايد، كروت بيضاء متجاوبة)، وتنسيق RTL احترافي.
  9. **دمج حقل الموبايل في صفحة تعديل الموظف وحل وتجميل نوافذ الـ Dialog:** إضافة حقل الموبايل الإجباري في نموذج تعديل الموظف مع جلبه من جهات الاتصال الأساسية للموظف تلقائياً وتحديثه في جدول `hr_employee_contacts`، وتصحيح خاصية `open` لنافذة الحوار (`DialogShell`) لفتح نافذة تعديل الـ PIN والهاتف فورياً للمناديب والموظفين عند النقر، وتطبيق نمط الحاوية الداخلية المؤسسية (`dialog-card`) مع هوامش تنفس وفيرة (`padding: 24px 28px`) وعرض متجاوب متزن يمنع اقتصاص النصوص والحروف تماماً.
  10. **اعتماد الاسم اللطيف والمختصر للمنشأة (Tenant Slug & Business Name Resolution):** استبدال المعرفات الطويلة المشفرة (UUID 36-char) باسم المنشأة اللطيف واسم العمل التجاري في شارة تسجيل الدخول (`/login`) بدلاً من عرض الـ UUID الطويل المنفر، مع دعم الباك إند (`session.service.ts`، `delivery-reps.service.ts`، `employee-portal.service.ts`، `mobile-attendance.service.ts`) لمطابقة كود المنشأة سواء تم إدخاله كـ `slug` قصير وفريد أو كـ `id` (UUID) بشفافية تامة ومطابقة تلقائية في قاعدة البيانات.
  11. **ضغط وتنسيق أعمدة جداول إدارة الوصول الموحدة (Compact Table Layout & Zero Overflow):** إعادة هندسة وتنسيق أعمدة جدول موظفي الخدمة الذاتية ومناديب التوصيل (`UnifiedAccessDirectoryPanel.tsx`)، تقليص هوامش الخلايا (`padding: 10px 10px`)، اختصار عناوين الأعمدة والروابط والبادجات، وتطبيق تمرير أفقي متجاوب (`overflowX: auto`)، مما وفّر أكثر من 300 بكسل وجعل عمود الإجراءات بالكامل وزر «الملف ↗» يظهر داخل إطار الكارت بأريحية تامة وبدون أي اقتصاص.


---

## 56. إعادة هيكلة وتوحيد شاشات وتبويبات الإعدادات وهرمية التنقل المؤسسية (Settings Architecture & Enterprise Navigation Overhaul)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **روابط وشاشات الوصول:** `/settings/*` (`core`, `reference`, `users`, `tax-integration`, `storefront`, `marketplaces`, `whatsapp`, `daily-digest`, `backup`, `subscription`, `lan-network`, `system-updates`, `monitoring`).
* **مسارات الكود الأساسية:**
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/settings/pages/settings.page-config.ts` (تعريف الأقسام والتسميات الرسمية وخاصية `hiddenInTabs`).
    * `frontend/src/features/settings/pages/SettingsSectionTabs.tsx` (فلترة التبويبات الثانوية وتمييز التبويب الأب النشط تلقائياً).
    * `frontend/src/features/settings/pages/SettingsSectionContent.tsx` (حاويات التبديل الداخلية بين المتجر وأمازون ونون، والواتساب والملخص اليومي).
    * `frontend/src/features/settings/pages/settings-page.helpers.tsx` (تحديث التوصيفات الإدارية لكافة أقسام الإعدادات).
    * `frontend/src/features/settings/components/forms/SettingsMainForm.tsx` (تقليص تبويبات الإعدادات الأساسية إلى 4 تبويبات وإزالة تابة الأمان الزائدة).
    * `frontend/src/features/settings/components/forms/tabs/SalesInventorySettingsTab.tsx` (دمج حقل رمز المدير PIN مع كارت سقف الخصم، وإضافة رابط سريع للتكامل الضريبي).
* **الميزات والقدرات المفعلة:**
  1. **تقليص شريط التبويبات العلوي لمنع التكدس (Single-Row Clean Tab Bar):** تقليص التبويبات المعروضة في شريط الإعدادات من 14 تابة متراكمة على صفين إلى صف واحد متناسق (8 تابات أساسية)، مع الحفاظ الكامل على كافة المسارات والروابط المباشرة والعميقة عبر ميزة `hiddenInTabs`.
  2. **دمج وإعادة توحيد التجارة الإلكترونية والمنصات (Omnichannel Settings):** دمج شاشة المتجر الإلكتروني الخاص (`/settings/storefront`) والربط مع أمازون ونون (`/settings/marketplaces`) داخل تبويب رئيسي موحد بعنوان "التجارة الإلكترونية والمنصات"، مع شريط تبديل فرعي أنيق يتيح التنقل اللحظي بينهما دون مغادرة السياق.
  3. **دمج وإعادة توحيد الواتساب والتقارير الذكية (WhatsApp Intelligence):** دمج بوابة الواتساب السحابية وبوت الذكاء الاصطناعي (`/settings/whatsapp`) مع الملخص اليومي للمدير (`/settings/daily-digest`) داخل تبويب رئيسي موحد بعنوان "بوابة الواتساب والتقارير الذكية"، مع شريط تبديل داخلي فوري.
  4. **تبسيط نموذج الإعدادات الأساسية (`settings/core`):** تقليص التبويبات الداخلية إلى 4 تبويبات مركزة (عام، البيع وقواعد المخزون، موديولات النظام، الطباعة والإيصالات) بدلاً من 5 تبويبات، حيث تم نقل حقل `managerPin` مباشرة إلى موقعه الوظيفي الطبيعي في تبويب البيع والمخزون داخل كارت "سقف خصم الكاشير واعتماد المدير (PIN)"، والاستغناء عن تابة الأمان الشبه فارغة، والاعتماد على قسم النسخ والصيانة المخصص لإدارة الحفظ التلقائي.
  5. **ربط تكاملي سريع مع الفاتورة الإلكترونية:** إضافة بطاقة إرشادية ورابط مباشر داخل قسم الضريبة الأساسي ينقل المستخدم بنقرة واحدة إلى إعدادات الربط السحابي مع مصلحة الضرائب المصرية (ETA) وهيئة الزكاة والضريبة والجمارك (ZATCA).
  6. **الالتزام الكامل بالدستور البصري وسياسة منع الإيموجيز (Strict UI Constitution & 0 Emojis):** اعتماد التدرج الكحلي الملكي `#170e5e` للأزرار والتبويبات النشطة، والخلفيات الرمادية الهادئة `#f1f5f9`، والكروت البيضاء المتوازنة، والأيقونات الرسمية الحصرية من `@/shared/components/icons/AppIcons`.

---

## 57. بنية محرك الذكاء الاصطناعي الشامل ومتعدد المزودين (Universal AI Engine & Multi-Provider LLM Gateway)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:**
  * **الباك إند (Backend):**
    * `backend/src/modules/ai-copilot/ai-copilot.service.ts` (دعم مزودي الذكاء الاصطناعي `gemini` و `openai` و `custom`، وتوجيه الاستفسارات ديناميكياً لكلا المحركين، مع دعم Base URL مخصص لأي خادم متوافق مع OpenAI API مثل DeepSeek و Groq و Ollama).
    * `backend/src/modules/ai-copilot/ai-copilot.controller.ts` (نقاط النهاية لتخزين وفحص اتصال المفاتيح لكافة المزودين ذرياً).
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/settings/components/workspace-sections/SettingsWhatsAppGatewaySection.tsx` (كارت إدارة محرك الذكاء الاصطناعي الشامل مع منتقي المزود، وحقول المفتاح والنموذج والرابط المخصص، واكتشاف نوع المفتاح تلقائياً).
    * `frontend/src/features/ai-copilot/components/AiBusinessCopilotModal.tsx` (تجريد الشارة الترويجية وجعلها عامة ومحايدة لدعم كافة النماذج).
* **الميزات والقدرات المفعلة:**
  1. **التحرر الكامل من انغلاق المزود الواحد (Vendor-Agnostic LLM Architecture):** إزالة أي حصر أو تقييد لنموذج أو شركة واحدة؛ النظام الآن يدعم رسمياً 3 خيارات مرنة:
     - **Google Gemini:** يدعم أحدث نماذج فلاش فائقة السرعة مع استكشاف ديناميكي للنماذج النشطة بالمفتاح تلقائياً.
     - **OpenAI / ChatGPT:** يدعم GPT-4o و GPT-4o-mini ونماذج الاستدلال المتطورة.
     - **مزود مخصص (OpenAI-Compatible Providers):** ربط أي مزود ذكاء اصطناعي خارجي يدعم بروتوكول Chat Completions مثل **DeepSeek** (`deepseek-chat`)، أو **Groq**، أو النماذج المحلية المستضافة عبر **Ollama** أو **vLLM** فقط بتحديد الرابط الأساسي (Base URL) واسم النموذج.
  2. **الاستكشاف الذكي التلقائي لنوع المفتاح (Smart Key Auto-Detection):** عند لصق المستخدم لمفتاح API يبدأ بـ `sk-` يتحول منتقي المزود تلقائياً إلى OpenAI، وعند لصق مفتاح يبدأ بـ `AIza` أو `AQ.` يتحول تلقائياً إلى Google Gemini.
  3. **فحص اتصال موحد واختبار حي (Unified Connection Testing):** نقطة نهاية موحدة `@Post('test-key')` تقوم بإرسال استعلام تحقق خفيف وسريع للمزود المختار وتأكيد نجاح الاتصال وعرض رسالة استجابة فورية للمستخدم مع زمن الاستجابة.
  4. **محرك ثنائي الاستخدام (Dual Consumers Integration):** المحرك يغذي وظيفتين حيويتين داخل المنظومة:
     - **مستشار الإدارة والقرارات (Z-Systems Business Copilot):** إجابة استفسارات المدير وتحليل المبيعات وتوقعات النواقص بهيكل JSON صارم وآمن.
     - **بوت واتساب التفاعلي لخدمة ومبيعات العملاء (Conversational WhatsApp Sales Bot):** الرد الفوري على رسائل واستفسارات الزبائن حول أسعار المنتجات والمقاسات والألوان وتوليد روابط الشراء المباشرة.
  5. **طبقات التراجع الآمن وتصفير البيانات الوهمية (Graceful Multi-Layer Fallback):** في حال عدم إدخال مفتاح مخصص من قبل المستأجر، يبحث النظام عن مفاتيح الخادم البيئية (`OPENAI_API_KEY` ثم `GEMINI_API_KEY`)، وفي حال عدم توفر أي مفتاح أو تعطل الإنترنت الخارجي، يتراجع النظام تلقائياً وبسلاسة إلى محرك التحليل والرد المحلي المدمج (`local_analytics` و `local_smart`) دون توقف المنظومة أو إطلاق أخطاء قاتلة.
  6. **التطهير الشامل للواجهات ومنع الإيموجيز (0 Emojis & UI Constitution):** إزالة عبارة "Gemini 1.5 Flash" و "Google Gemini" الحصرية من كافة الواجهات والبادجات ومحاكي الشات، واستبدالها بتسميات مؤسسية نظيفة (`Universal AI Engine`، `AI Cloud`، `Smart Local`)، مع تطبيق ألوان الهوية المؤسسية (`#170e5e` للأزرار الرئيسية).

---

## 58. حزمة التوطين الخليجي الشاملة وتعدد العملات ومحرك الفلس ثلاثي الخانات (GCC Localization Pack & 3-Decimal Fils Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:**
  * `frontend/src/lib/currencies.ts` (إضافة دعم عملات الخليج KWD, QAR, BHD, OMR إلى جانب SAR, AED, EGP, USD وتحديد عدد الخانات العشرية بدقة 3 خانات للدينار الكويتي والبحريني والريال العماني).
  * `frontend/src/lib/format.ts` (تحديث محرك تنسيق العملات `formatCurrency` ليعتمد تلقائياً على `getCurrencyDecimals` ويدعم ديناميكياً تنسيق الفلس والبيسة ثلاثي الخانات العشرية بدلاً من الاقتصار على خانتين).
  * `frontend/src/features/settings/components/forms/tabs/GeneralSettingsTab.tsx` (توسيع قائمة المناطق الزمنية لتشمل كافة عواصم ومدن الخليج: الكويت `Asia/Kuwait`، قطر `Asia/Qatar`، البحرين `Asia/Bahrain`، مسقط `Asia/Muscat`، الرياض `Asia/Riyadh`، دبي `Asia/Dubai`).
  * `frontend/src/features/settings/pages/TenantSubscriptionPage.tsx` (تسعير باقات الاشتراك السحابي إقليمياً لدول الخليج KWD, SAR, QAR, AED, BHD, OMR مع محول ديناميكي للعملة يتيح للمشترك الخليجي الاطلاع على الباقات بالعملة المحلية مباشرة بدون حصر بالجنيه المصري).
* **الميزات والقدرات المفعلة:**
  1. **التوافق الكامل مع العملات الخليجية (Full GCC Currencies Support):** دعم رسمي متكامل لعملات الدينار الكويتي (KWD)، الريال القطري (QAR)، الدينار البحريني (BHD)، الريال العماني (OMR)، والريال السعودي (SAR)، والدرهم الإماراتي (AED).
  2. **محرك الفلس والبيسة ثلاثي الخانات (3-Decimal Fractional Currency Engine):** معالجة الخصوصية الحسابية الفريدة لدول الخليج التي تعتمد 1000 فلس للدينار (الكويت والبحرين) و 1000 بيسة للريال (عُمان)، مع إظهار المبالغ بدقة 3 خانات عشرية (مثل 12.500 د.ك) تلقائياً ودون تشويه للعملات ثنائية الخانات (مثل الجنيه المصري والريال السعودي والدولار).
  3. **توطين المناطق الزمنية للأعمال (GCC Business Timezones):** ضبط مواعيد الجلسات وتوقيت إغلاق الكاشير والتقارير المالية بحسب التوقيت المحلي الدقيق لكل دولة خليجية.
  4. **التسعير الإقليمي المخصص لمنصة SaaS:** إمكانية عرض واشتراك المنشآت الخليجية في باقات Z-Systems بحسب عملتها المحلية بأسعار متكافئة ومدروسة لسوق كل دولة.

---

## 59. محرك مراكز التكلفة المحاسبية وشجرة مراكز التكلفة وتحليل الربحية (Cost Centers Accounting Engine & P&L Reporting)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات والترحيل (Database & Migration):**
    * `backend/src/database/migrations/2040000000049_cost_centers_and_gcc_currencies.ts` (إنشاء جدول `cost_centers` الهرمي مع كود ومركز رئيسي وعزل الشركات، وإضافة عمود `cost_center_id` المفهرس في جدول `journal_entry_lines`).
    * `backend/src/database/database.types.ts` (تعريف أنواع الجداول `CostCenterTable` وربط الحقل بـ `JournalEntryLineTable`).
  * **الباك إند (Backend):**
    * `backend/src/modules/accounting/accounting.service.ts` (دوال إدارة مراكز التكلفة `listCostCenters`, `createCostCenter`, `updateCostCenter`, `deleteCostCenter`, وتوليد تقرير قائمة الدخل والأرباح والخسائر لكل مركز `getCostCenterReport`، وربط حقل `cost_center_id` في القيود المحاسبية).
    * `backend/src/modules/accounting/accounting.controller.ts` (نقاط النهاية لـ CRUD مراكز التكلفة وتقرير المركز المالي `/api/accounting/cost-centers`).
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/accounting/api/cost-centers.api.ts` (عميل API متكامل لعمليات مراكز التكلفة والتقارير المالية).
    * `frontend/src/features/accounting/pages/AccountingCostCentersPage.tsx` (شاشة إدارة مراكز التكلفة بتصميم مؤسسي متكامل: بطاقات إحصائية، شجرة ومستويات المراكز، بحث وفلترة، نافذة منبثقة للإنشاء والتعديل، ونافذة تفصيلية لتقرير الأرباح والخسائر P&L والحركات المحاسبية مع فلترة بالتاريخ).
    * `frontend/src/features/accounting/routes.tsx` & `frontend/src/app/router/access.ts` & `frontend/src/shared/layout/app-shell.tsx` (تسجيل المسار `/accounting/cost-centers`، دمج التبويب في قائمة المالية والمحاسبة بالسايدبار مع الصلاحيات والأيقونة المؤسسية).
    * `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx` (عرض مركز التكلفة المرتبط بكل سطر من سطور القيد اليومي).
* **الميزات والقدرات المفعلة:**
  1. **هيكلية شجرية مرنة لمراكز التكلفة (Hierarchical Cost Center Tree):** إمكانية إنشاء مراكز رئيسية (فروع، خطوط أعمال، مشاريع) ومراكز فرعية متفرعة عنها بعدة مستويات مع حساب المستوى التلقائي.
  2. **ربط سطور القيود اليومية بمراكز التكلفة (Multi-Dimensional Journal Tagging):** دعم إسناد أي حركة مالية (مصروف، إيراد، أصل) إلى مركز تكلفة محدد بدقة عند توليد القيود.
  3. **تقرير الأرباح والخسائر لكل مركز تكلفة (Cost Center P&L & Financial Report):** احتساب فوري وصارم لإجمالي المصروفات والإيرادات وصافي الربح/الخسارة لكل مركز تكلفة مع سجل تفصيلي لجميع السطور المحاسبية المرتبطة وفلاتر زمنية دقيقة.
  4. **منع الحذف في حال وجود ارتباطات مالية (Data Integrity Protection):** حماية المركز من الحذف العشوائي إذا كان مرتبطاً بحركات وسطور قيود فعلية أو لديه مراكز تكلفة فرعية تابعة.
  5. **الالتزام الكامل بالدستور البصري وسياسة منع الإيموجيز (Strict Enterprise UI & 0 Emojis):** بطاقات بيضاء متوازنة، مؤشرات أداء بنسب مئوية نظيفة، أيقونات SVG قياسية، وتدرج لوني كحلي ملكي `#170e5e`.

---

## 60. ترقية مراكز التكلفة بالموازنات التقديرية وموديول إدارة علاقات العملاء والصفقات المؤسسي (Cost Center Budgets & Enterprise CRM Pipeline Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **روابط وشاشات الوصول:**
  * `/accounting/cost-centers` (مراكز التكلفة، الأبعاد التحليلية، والموازنات التقديرية).
  * `/crm` (لوحة مسار الفرص والصفقات البيعية وإدارة الأنشطة والعملاء).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات والترحيل (Database & Migrations):**
    * `backend/src/database/migrations/2040000000050_cost_center_budgets_and_dimensions.ts` (إضافة أعمدة `dimension` و `budget_amount` لجدول `cost_centers`، وعمود `cost_center_id` لجدول `expenses`).
    * `backend/src/database/migrations/2040000000051_crm_deals_and_activities.ts` (إنشاء جدولي `crm_deals` و `crm_activities` مع الفهارس والعزل الصارم للمستأجرين).
    * `backend/src/database/database.types.ts` (تعريف أنواع `CrmDealTable` و `CrmActivityTable` وتحديث `CostCenterTable` و `ExpenseTable`).
  * **الباك إند (Backend):**
    * `backend/src/modules/accounting/accounting.service.ts` & `accounting.controller.ts` & `accounting-posting.service.ts` (تحديث إضافة وتعديل مراكز التكلفة بحقول الموازنة والبعد، وحساب نسبة الاستهلاك والانحراف، وترحيل مركز التكلفة من المصروفات اليومية للقيود المحاسبية).
    * `backend/src/modules/treasury/treasury.service.ts` & `dto/create-expense.dto.ts` (دعم إسناد مركز التكلفة المباشر للمصروف).
    * `backend/src/modules/crm/crm.service.ts` & `crm.controller.ts` & `crm.module.ts` & `dto/crm.dto.ts` (محرك إدارة الصفقات، ملخص المسار البيعي KPIs، سجل الأنشطة والمهام، ونقطة تحويل الفرصة إلى عميل مسجل).
    * `backend/src/app.module.ts` (تسجيل `CrmModule`).
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/accounting/api/cost-centers.api.ts` & `AccountingCostCentersPage.tsx` (فلتر الأبعاد التحليلية، بطاقات وشارات الأبعاد، مدخلات الموازنة التقديرية، وبطاقة متابعة الموازنة ونسبة الاستهلاك التفاعلية).
    * `frontend/src/features/treasury/components/TreasuryExpenseEntryCard.tsx` (منتقي مراكز التكلفة في نموذج تسجيل المصروفات السريعة).
    * `frontend/src/features/crm/api/crm.api.ts` (عميل API لصفقات CRM وسجل الأنشطة وملخص المسار والتحويل لعميل).
    * `frontend/src/features/crm/pages/CrmPipelinePage.tsx` (واجهة CRM المؤسسية المتكاملة: بطاقات المؤشرات الأربعة، لوحة كانبان ذات 6 مراحل، التنقل السريع بين المراحل، جدول تفصيلي، نموذج إنشاء فرصة، نافذة تفاصيل الفرصة وسجل المهام والأنشطة، زر التحويل الفوري لعميل مسجل، وزر مراسلة واتساب المباشر).
    * `frontend/src/features/crm/routes.tsx` & `frontend/src/app/router/registry.ts` & `frontend/src/app/router/access.ts` (تسجيل المسار `/crm` والصلاحيات).
    * `frontend/src/shared/layout/app-shell.tsx` (إضافة CRM لمجموعة المبيعات في السايدبار مع الأيقونة والترتيب المفضل وعنوان الشاشة).
    * `frontend/src/locales/ar.json` & `en.json` (ترجمات إدارة علاقات العملاء باللغتين العربية والإنجليزية).
* **الميزات والقدرات المفعلة:**
  1. **الأبعاد التحليلية الخماسية لمراكز التكلفة (Analytic Dimensions - Odoo 17 Benchmark):** تصنيف مراكز التكلفة وفق 5 أبعاد عملية رئيسية (فروع ومواقع `branch`، مشاريع ومقاولات `project`، أقسام داخلية `department`، أسطول وسيارات `fleet`، تشغيلي عام `operational`) مع فلاتر فرز وشارات بصرية مميزة.
  2. **محرك الموازنات التقديرية ومقارنة الفعلي بالمخطط (Budget vs Actual & Variance Engine):** رصد الموازنة التقديرية المستهدفة لكل مركز تكلفة ومقارنتها التلقائية بحركات المصروفات الفعلية المستخرجة من سطور اليومية العامة، مع احتساب الانحراف (Variance) ونسبة الاستهلاك اللحظية (Utilization %) وشريط تقدم بياني.
  3. **إسناد مراكز التكلفة لمصروفات الخزينة المباشرة (Direct Expense Cost Center Tagging):** إمكانية اختيار مركز التكلفة مباشرة عند تسجيل أي مصروف نثري في الخزينة، مع الترحيل التلقائي لسطر القيد المحاسبي في الأستاذ العام وتأثيره الفوري على موازنة المركز.
  4. **لوحة كانبان التفاعلية لإدارة الفرص والصفقات (Kanban Sales Pipeline - Twenty CRM Benchmark):** متابعة مرئية لكافة الصفقات عبر 6 مراحل متدرجة (جديد، تم التواصل، مؤهل للشراء، عرض سعر مرسل، مفاوضات، تم التعاقد / فوز) مع إحصائيات فورية لعدد ومبالغ كل مرحلة، وإمكانية نقل الصفقات بين المراحل بنقرة سريعة.
  5. **مؤشرات الأداء البيعي التراكمي (Sales Pipeline KPIs):** احتساب دقيق لإجمالي الفرص النشطة، القيمة الإجمالية للمسار، القيمة المتوقعة الموزونة بنسبة احتمالية النجاح (Weighted Pipeline Value)، ونسبة إغلاق ونجاح الصفقات (Win Rate %).
  6. **التحويل الفوري للفرصة إلى عميل مسجل (1-Click Convert to Customer):** تحويل أي فرصة بيعية بضغطة زر واحدة إلى عميل دائم ومسجل في قاعدة بيانات المنشأة مع التحقق من عدم التكرار برقم الهاتف، وتحديث حالة الصفقة تلقائياً إلى [تم التعاقد / فوز]، وتوثيق ذلك في سجل الأنشطة.
  7. **سجل متابعات وخط زمني للأنشطة والمهام (Activities & Follow-up Timeline):** جدول زمني لكل فرصة لتدوين المكالمات والاجتماعات والمهام والملاحظات ومواعيد الاستحقاق مع إمكانية إنجاز المهام بمربعات اختيار تفاعلية.
  8. **التكامل المباشر مع واتساب ونقاط البيع (WhatsApp & POS Integration):** زر فوري لفتح محادثة واتساب مع جهة الاتصال برابط منسق مسبقاً، وزر سريع لفتح نقطة البيع أو المبيعات لإصدار عروض الأسعار وفواتير التعاقد.
  9. **التصميم المؤسسي النظيف وسياسة خلو الإيموجيز (Clean Enterprise Constitution & 0 Emojis):** التزام قطعي بنسبة 100% بكافة معايير النظام البصري (كروت بيضاء نقية، خلفية `#f8fafc`، أزرار كحلية عميقة `#170e5e`، وأيقونات SVG رسمية من مكتبة `AppIcons`).

---

## 61. محرك قفل الفترات المحاسبية المحكم والقيود اليومية اليدوية المتزنة (Fiscal Lock Dates & Manual Journal Entries Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 17 Accounting & SAP Business One Financial Periods.
* **روابط وشاشات الوصول:**
  * `/accounting/settings` (تبويب: إقفال الفترات المحاسبية).
  * `/accounting/journal-entries` (زر ونافذة: إنشاء قيد يدوي).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات والترحيل (Database & Migrations):**
    * `backend/src/database/migrations/2029000000008_accounting_lock_dates.ts` (إضافة أعمدة `lock_date_all`, `lock_date_non_adviser`, `lock_date_tax` لجدول `accounting_settings`).
    * `backend/src/database/database.types.ts` (تحديث نوع `AccountingSettingsTable`).
  * **الباك إند (Backend):**
    * `backend/src/modules/accounting/dto/accounting.dto.ts` (تحديث `UpdateAccountingSettingsDto` بمدخلات تواريخ الإقفال، وإضافة `CreateManualJournalEntryDto` و `CreateJournalLineDto`).
    * `backend/src/modules/accounting/accounting.service.ts` (تحديث `getAccountingSettings` و `updateAccountingSettings`، إضافة محرك التدقيق المحاسبي `assertNotInLockedPeriod`، وتنفيذ دالة إنشاء القيد اليدوي المتزن `createManualJournalEntry` مع التحقق الصارم من توازن المدين والدائن وصلاحيات الحسابات).
    * `backend/src/modules/accounting/accounting.controller.ts` (إضافة نقطة النهاية `POST /api/accounting/journal-entries`).
    * `backend/src/modules/accounting/accounting-posting.service.ts` (حقن فحص وتدقيق تواريخ الإقفال المحاسبي الصارم داخل محرك ترحيل القيود العام `insertJournal` لرفض أي حركة بيع أو شراء أو مصروف أو تسوية تقع في فترة مغلقة).
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/accounting/api/accounting.api.ts` (تحديث واجهة الـ API لدعم قراءة وتحديث تواريخ الإقفال، واستدعاء `createJournalEntry`).
    * `frontend/src/features/accounting/components/ManualJournalEntryDialog.tsx` (مكون نافذة إدخال القيد اليدوي المؤسسية: جدول سطور ديناميكي، منتقي الحسابات ومراكز التكلفة، احتساب لحظي للمدين والدائن والفارق، شارة حالة التوازن، ومنع الترحيل حتى تحقيق التوازن التام).
    * `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx` (زر «إنشاء قيد يدوي» في رأس الصفحة، تكامل فتح النافذة، والتحديث الفوري للجدول مع الانتقال المباشر لتفاصيل القيد المنشأ).
    * `frontend/src/features/accounting/pages/AccountingSettingsPage.tsx` (تبويب وبطاقات «إقفال الفترات المحاسبية والرقابة المالية»: كارت الإقفال الشامل النهائي Hard Lock، كارت إقفال العمليات التشغيلية لمدخلي البيانات والكاشير Non-Advisers Lock، وكارت إقفال الإقرار الضريبي Tax Lock، مع أزرار الحفظ والإلغاء وإشعارات الحالة).
* **الميزات والقدرات المفعلة:**
  1. **الإقفال المحاسبي النهائي الشامل (Hard Lock Date):** منع بات ومطلق لإضافة أو تعديل أي فواتير بيع أو شراء أو مصاريف أو سندات صرف وقبض أو قيود يومية بتاريخ يسبق أو يطابق تاريخ الإقفال لجميع المستخدمين بما فيهم الإدارة العامة والمدير المالي، لحماية الفترات المدققة رسمياً.
  2. **إقفال العمليات التشغيلية (Operational Lock Date for Non-Advisers):** منع موظفي الكاشير ومدخلي البيانات والمحاسبين المبتدئين من تسجيل أي حركات بأثر رجعي تسبق تاريخ الإقفال التشغيلي، مع حصر استثناء التعديل للمدققين والمديرين الماليين المعتمدين.
  3. **إقفال الإقرار الضريبي (Tax / VAT Lock Date):** تجميد الفترات الضريبية التي تم تقديم إقرارها للهيئة الضريبية لحماية تطابق إقرارات ضريبة القيمة المضافة مع الدفاتر.
  4. **محرك القيود اليومية اليدوية المتزنة (Balanced Manual Journal Entry Engine):** إمكانية تسجيل قيود تسوية محاسبية متعددة الأطراف (Multi-line) مع اختيار مراكز التكلفة، مع تدقيق لحظي في الفرونت إند والباك إند يمنع ترحيل أي قيد غير متزن أو يحتوي على سطور صفرية أو متعارضة.
  5. **الحوكمة المالية الصارمة وخلو الإيموجيز (Enterprise Financial Governance & 0 Emojis):** التزام قطعي بنسبة 100% بالدستور البصري المؤسسي بدون أي رموز غير قياسية، مع استخدام اللون الكحلي الملكي `#170e5e` للأزرار الأساسية وتنسيق كروت بيضاء نقية متناسقة.

---

## 62. إدارة ومتابعة الشيكات المؤجلة وحافظة الشيكات (PDC - Post-Dated Cheques Management)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 17 Post-Dated Checks & SAP Business One Banking PDC.
* **روابط وشاشات الوصول:** `/accounting/cheques` (القائمة الجانبية: المالية والمحاسبة ➔ حافظة الشيكات PDC).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000057_pdc_cheques_management.ts`, `backend/src/database/database.types.ts`.
  * **الباك إند:** `backend/src/modules/accounting/services/pdc-cheques.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`, `backend/src/modules/accounting/accounting.module.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/PdcChequesPage.tsx`, `frontend/src/features/accounting/api/accounting.api.ts`, `frontend/src/features/accounting/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة الشيكات الصادرة والواردة (Receivable & Payable PDCs):** متابعة شيكات العملاء الواردة وشيكات الموردين الصادرة مع رصد رقم الشيك، البنك المسحوب عليه، اسم الساحب، القيمة، وتاريخ الاستحقاق.
  2. **دورة حياة الشيك الكاملة (Full Lifecycle Workflow):** دعم حالات التحصيل والإيداع (مستلم ➔ برسم التحصيل ➔ محصل ➔ مرتد مع تدوين سبب ومصروف الارتداد ➔ مجير لمورد خارجي).
  3. **التنبيه المبكر للشيكات المستحقة:** فلاتر ذكية وإحصائيات فورية للشيكات المستحقة خلال 7 أيام القادمة والشيكات المتأخرة لتفادي الغرامات ومتابعة السيولة.
  4. **التكامل مع القيود وأستاذ الحسابات:** ربط فوري مع أرقام القيود اليومية في شجرة الحسابات.

---

## 63. ضريبة الخصم والإضافة المصرية ونموذج 41 ضرائب (Egyptian Withholding Tax - WHT & Form 41)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي والمحلي:** مصلحة الضرائب المصرية (ETA Form 41) & Odoo Egypt Localisation.
* **روابط وشاشات الوصول:** `/accounting/withholding-tax` (القائمة الجانبية: المالية والمحاسبة ➔ الخصم والإضافة ن41).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000058_withholding_tax_form41.ts`, `backend/src/database/database.types.ts`.
  * **الباك إند:** `backend/src/modules/accounting/services/withholding-tax.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`, `backend/src/modules/accounting/accounting.module.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/WithholdingTaxPage.tsx`, `frontend/src/features/accounting/api/accounting.api.ts`, `frontend/src/features/accounting/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **الاستخراج التلقائي من فواتير المشتريات والمصروفات:** استخراج حركات الخصم والإضافة آلياً من فواتير المشتريات التي تتجاوز الحد القانوني (300 جنيه مصري) وتصنيفها بنسب القانون: 1% توريدات وسلع، 3% خدمات ومصنعيات، 5% مهن حرة واستشارات.
  2. **تقرير ربع سنوي تفصيلي لنموذج 41 (Form 41 Quarterly Report):** احتساب دقيق حسب الربع السنوي (Q1, Q2, Q3, Q4) والسنة الضريبية مع بيان رقم التسجيل الضريبي، الملف الضريبي، المأمورية، القيمة الإجمالية وقيمة الضريبة المستقطعة.
  3. **تصدير شيت الإكسيل والـ CSV المتوافق مع بوابة الضرائب المصرية (ETA CSV Format):** تصدير بضغطة زر واحدة لملف CSV مهيأ للرفع المباشر على منظومة الضرائب المصرية.
  4. **طباعة ورقة نموذج 41 الرسمية A4:** نموذج طباعة رسمي معتمد لمصلحة الضرائب المصرية جاهز للتقديم والتوقيع.

---

## 64. التقويم الهجري (أم القرى) المزدوج (Dual Hijri & Gregorian Calendar Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الإقليمي:** متطلبات هيئة الزكاة والضريبة والجمارك السعودية (ZATCA) وتقويم أم القرى المعتمد في الخليج والشرق الأوسط.
* **روابط ومواقع الظهور:**
  * **الشريط العلوي للنظام (Global Header):** ويدجت التقويم المزدوج التفاعلي في الهيدر الرئيسي لكافة الشاشات.
  * **إعدادات الطباعة والفواتير:** خيار `printShowHijriDate` في تبويب إعدادات الطباعة.
  * **قوالب الفواتير والريسيت الحراري (POS & Tax Invoices):** إظهار التاريخ الهجري إلى جانب الميلادي في فواتير البيع والضريبة.
* **مسارات الكود الأساسية:**
  * **محرك التاريخ الهجري:** `frontend/src/lib/hijri.ts` (حساب فلكي دقيق وفق تقويم أم القرى الرسمي `ar-SA-u-ca-islamic-umalqura`، الشهور الهجرية العربية، أسماء الأيام، وتحويل الأرقام).
  * **المكون المرئي:** `frontend/src/shared/components/DualCalendarBadge.tsx`.
  * **التكامل في القوالب والشريط:** `frontend/src/shared/layout/GlobalAppToolbar.tsx`, `frontend/src/lib/pos-printing/template.ts`, `frontend/src/features/settings/components/forms/tabs/PrintingSettingsTab.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **عرض متزامن لليوم والتاريخين (هجري وميلادي):** ويدجت أنيق يعرض التاريخين في سطر واحد مع نافذة تفاعلية منسدلة تحتوي على تفاصيل السنة المالية، أزرار نسخ التاريخ الهجري أو الميلادي أو كلاهما معاً.
  2. **خلو تام من الإيموجيز:** اعتماد حصري على أيقونات SVG القياسية وتصميم مؤسسي نظيف يتناسب مع هوية المنظومة.
  3. **الامتثال لمتطلبات الفوترة الخليجية:** طباعة التاريخ الهجري على إيصالات وفواتير الكاشير والضريبة لضمان التوافق التام مع متطلبات السوق السعودي والخليجي.

---

## 65. أوامر البيع وحجز المخزون المؤقت (Sales Orders & Stock Reservation Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 17 Sales Orders & Stock Allocation / Reservation Engine.
* **روابط وشاشات الوصول:** `/sales/orders` (القائمة الجانبية: المبيعات ➔ أوامر البيع وحجز المخزون).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000059_sales_orders_stock_reservation.ts`, `backend/src/database/database.types.ts` (`products.reserved_qty`, `sales_orders`, `sales_order_items`).
  * **الباك إند:** `backend/src/modules/sales/services/sales-orders.service.ts`, `backend/src/modules/sales/controllers/sales-orders.controller.ts`, `backend/src/modules/sales/sales.module.ts`.
  * **الفرونت إند:** `frontend/src/features/sales/api/sales-orders.api.ts`, `frontend/src/features/sales/pages/SalesOrdersPage.tsx`, `frontend/src/features/sales/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حجز المخزون المؤقت الآلي (Real-Time Stock Reservation):** فور تأكيد أمر البيع، يتم حجز الكميات المطلوبة في المخزون (`reserved_qty`) لمنع بيعها أو تكرار حجزها في نقاط البيع (POS) أو المتجر الإلكتروني، مع احتساب دقيق للرصيد المتاح للبيع للآخرين (`available_qty = stock_qty - reserved_qty`).
  2. **صلاحية الحجز ومتابعة التسليم:** تحديد تاريخ انتهاء لصلاحية الحجز وتاريخ التسليم المتوقع لكل طلبية.
  3. **التحويل بنقرة واحدة إلى فاتورة بيع فعلية (1-Click Convert to Sale Invoice):** تحويل أمر البيع المؤكد مباشرة إلى فاتورة بيع مرحلة في نظام المبيعات، مع فك الحجز آلياً وخصم الكميات من المخزون الفعلي دون أي تدخل يدوي أو ازدواجية.
  4. **إلغاء أمر البيع وفك الحجز الفوري:** إمكانية إلغاء أمر البيع بضغطة زر لفك حجز المخزون فورياً وإعادته للرصيد المتاح للبيع.
  5. **لوحة فحص جاهزية المخزون (Stock Readiness Modal):** فحص فوري لكل بند في أمر البيع ومقارنة الكمية المطلوبة بالكمية المحجوزة والرصيد الفعلي بالمستودع والرصيد المتاح للآخرين.

## 66. دورة أوامر الشراء واعتماد الموردين والاستلام المخزني (Purchase Orders & Goods Receipt)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Purchase Orders (PO) & 3-Way Matching Flow.
* **روابط وشاشات الوصول:** `/purchases/orders` (القائمة الجانبية: المشتريات والموردين ➔ أوامر الشراء PO).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000060_purchase_orders_and_unbuild.ts`, `backend/src/database/database.types.ts` (`purchase_orders`, `purchase_order_items`).
  * **الباك إند:** `backend/src/modules/purchases/services/purchase-orders.service.ts`, `backend/src/modules/purchases/controllers/purchase-orders.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`.
  * **الفرونت إند:** `frontend/src/features/purchases/api/purchase-orders.api.ts`, `frontend/src/features/purchases/pages/PurchaseOrdersPage.tsx`, `frontend/src/features/purchases/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إصدار واعتماد أوامر الشراء الرسمية (Purchase Orders):** إنشاء أوامر شراء بمسودة أولية مع الموردين، حساب المجاميع والضرائب والخصومات، وتأكيد الأمر بنقرة زر واحدة لإرساله للمورد.
  2. **دورة الاستلام المخزني الجزئي والكامل (Goods Receipt Flow):** نافذة مخصصة لإثبات استلام الشحنات والبضائع الواردة، وتغذية أرصدة المخزون الفعلية فورياً، مع تصنيف دقيق لحالة الاستلام (`partially_received` أو `received`).
  3. **التحويل المباشر لفاتورة مشتريات رسمية (Convert to Bill):** تحويل أمر الشراء المستلم بضغطة زر واحدة إلى فاتورة مشتريات مرحلة في حسابات الموردين دون إعادة إدخال البيانات، مع حفظ رقم الفاتورة المرجعي.
  4. **إلغاء وحذف الأوامر المسودة والملغاة:** حوكمة صارمة لمنع التعديل على الأوامر التي تم ترحيلها لفواتير رسمية.

---

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

## 68. دستور وتوحيد التيبوجرافي المؤسسي وأحجام الخطوط (Enterprise Typography Hierarchy)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:** `frontend/src/styles/partials/base.css`, `frontend/src/shared/components/page-header.tsx`, `d:\zn\GEMINI.md`.
* **الميزات والقدرات المفعلة:**
  1. **متغيرات CSS قياسية مركزية (Typography Tokens):** تعريف متغيرات ثابتة لأحجام الخطوط (`--font-page-title: 1.15rem`, `--font-section-title: 0.98rem`, `--font-body: 0.8125rem`, `--font-subtitle: 0.8125rem`, `--font-table-head: 0.78rem`, `--font-badge: 0.72rem`, `--font-micro: 0.6875rem`).
  2. **إعادة ضبط عناصر HTML الأساسية (Base HTML Scale Resets):** إلزام وسوم `h1`, `h2`, `h3`, `h4`, `p`, `small`, `th`, `td` بأوزان وأحجام منضبطة تمنع المتصفح من تكبير أي عنوان أو هيدر لجدول تلقائياً وتمنع التفاوت البصري بين الشاشات.
  3. **توثيق دستوري إلزامي:** تقييد السلم الهرمي في دستور النظام `GEMINI.md` كقاعدة إلزامية دائمة لكافة المطورين.

---

## 69. نظام حفظ واسترجاع المسودات التلقائي عديم الحمل (Zero-Overhead Auto-Draft Persistence Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Google Docs / Linear Autosave & Draft Protection Standard.
* **روابط وشاشات الوصول المشمولة:**
  1. إذن صرف المخزون الجديد (`/inventory/new-issue-order`).
  2. فاتورة / أمر المشتريات الجديدة (`/purchases/new`).
  3. أوامر البيع وحجز المخزون (`/sales/orders`).
  4. أوامر الشراء PO مع الموردين (`/purchases/orders`).
  5. عروض الأسعار للعملاء (`/sales/quotations`).
* **مسارات الكود الأساسية:**
  * **الخطاف العام (Universal Hook):** `frontend/src/shared/hooks/use-form-draft.ts`.
  * **مكون التنبيه المؤسسي (UI Banner):** `frontend/src/shared/components/DraftRestoredBanner.tsx`.
  * **صفحات التنفيذ:** `NewIssueOrderPage.tsx`, `useNewPurchaseOrderController.ts`, `SalesOrdersPage.tsx`, `PurchaseOrdersPage.tsx`, `QuotationsPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حماية المدخلات من الفقدان العرضي:** في حال قام المستخدم بإدخال عدة أصناف أو بيانات في إذن صرف أو فاتورة مشتريات أو أمر بيع، ثم انتقل بالخطأ إلى صفحة أخرى أو نقر على رابط في القائمة الجانبية أو أغلق المتصفح، تظل كافة البيانات المحررة والأصناف محفوظة في المتصفح محلياً دون فقدان أي بند.
  2. **صفر حمل على السيرفر وانعدام البطء (Zero CPU/Server Load):** يتم الحفظ داخل متصفح المستخدم (`localStorage`) عبر محرك تأخير ذكي (Debounce 400ms) مع مقارنة البصمة الحركية (`Snapshot Check`)، فلا يتم الحفظ إلا عند حدوث تغيير حقيقي، مع تفريغ فوري (`flushDraft`) قبل مغادرة الصفحة أو عند إغلاق التبويب (`beforeunload`).
  3. **تطهير وتفريغ تلقائي للمسودة:** يتم مسح المسودة تلقائياً وفورياً بمجرد تأكيد وحفظ العملية بنجاح أو عند قيام المستخدم بإلغاء المسودة أو تصفير النموذج لضمان نظافة التخزين وعدم بقاء مخلفات قديمة.
  4. **شريط استرجاع مؤسسي أنيق (DraftRestoredBanner):** إشعار بصري ناعم مطابق للدستور المؤسسي بدون إيموجيز يُنبه المستخدم بأنه تم استرجاع مدخلات المسودة السابقة تلقائياً مع زر مباشر لمسح المسودة والبدء من جديد بنقرة واحدة.

---

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

## 71. طلبات عروض أسعار الموردين ومصفوفة المقارنة والترسية (Vendor RFQs & Comparison Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Purchase RFQ & Vendor Tender Comparison Matrix.
* **روابط وشاشات الوصول:** `/purchases/rfqs` (القائمة الجانبية: المشتريات والموردين ➔ طلبات عروض الأسعار RFQ).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000062_purchase_rfqs.ts`, `backend/src/database/database.types.ts` (`purchase_rfqs`, `purchase_rfq_items`, `purchase_rfq_vendor_bids`).
  * **الباك إند:** `backend/src/modules/purchases/services/purchase-rfqs.service.ts`, `backend/src/modules/purchases/controllers/purchase-rfqs.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`.
  * **الفرونت إند:** `frontend/src/features/purchases/api/purchase-rfqs.api.ts`, `frontend/src/features/purchases/pages/PurchaseRfqsPage.tsx`, `frontend/src/features/purchases/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة دورة طلبات عروض الأسعار المفتوحة (Purchase RFQs):** إنشاء طلبات تسعير بأصناف وكميات محددة مع تحديد موعد استحقاق نهائي لاستقبال العطاءات.
  2. **تسجيل ومقارنة عروض الموردين المتنافسة (Bid Comparison Matrix):** جدول مقارنة بصري تفاعلي يقارن الأسعار المقدمة ومواعيد التسليم المقترحة وشروط الدفع بين مختلف الموردين.
  3. **الترسية وتوليد أمر الشراء بضغطة زر (1-Click Award to PO):** اختيار العرض الفائز وترسيته بنقرة واحدة لتحويله تلقائياً إلى أمر شراء رسمي (PO) في موديول المشتريات وإغلاق المناقصة.

---

## 72. تسوية وتخصيص المدفوعات والقيود العكسية الآلية (Invoice Payment Allocation & Auto-Reversals)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Invoicing Reconciliation / Matching & Reversal Journal Entries.
* **روابط وشاشات الوصول:** `/accounting/payment-allocation` و `/accounting/journal-entries`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000063_payment_allocations_and_reversals.ts`, `backend/src/database/database.types.ts` (`payment_allocations`).
  * **الباك إند:** `backend/src/modules/accounting/services/payment-allocation.service.ts`, `backend/src/modules/accounting/accounting.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/PaymentAllocationPage.tsx`, `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **تسوية وتخصيص الدفعات غير المربوطة بالفواتير:** ربط سندات القبض والدفع المفتوحة بفواتير المبيعات والمشتريات المعلقة للعميل أو المورد مع بيان المبلغ المتبقي لكل فاتورة.
  2. **محرك التسوية الآلي بالوارِد أولاً يُصرَف أولاً (FIFO Auto-Reconciliation):** توزيع تلقائي فوري لأي دفعة على الفواتير المفتوحة الأقدم تاريخياً وتحديث حالة السداد ومبالغ الفواتير بدقة سنت واحد.
  3. **إلغاء وعكس القيود اليومية آلياً (Auto-Reversal Entries):** نافذة رسمية لإلغاء أي قيد مرحل مع تدوين سبب الإلغاء، وتوليد القيد العكسي المعادل فورياً وربطه محاسبياً بالقيد الأصلي لمنع التلاعب وحفظ التدقيق المالي.

---

## 73. أماكن التخزين والأرفف والجرد الفوري بالباركود (Warehouse Bins, Shelves & Mobile Audit)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Storage Locations / Putaway Rules & Barcode Stock Audit.
* **روابط وشاشات الوصول:** `/inventory/bins` (القائمة الجانبية: المخزون والأصناف ➔ أماكن التخزين والأرفف).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000064_warehouse_bin_locations.ts`, `backend/src/database/database.types.ts` (`warehouse_bins`, `product_bin_allocations`).
  * **الباك إند:** `backend/src/modules/inventory/services/warehouse-bins.service.ts`, `backend/src/modules/inventory/controllers/warehouse-bins.controller.ts`, `backend/src/modules/inventory/inventory.module.ts`.
  * **الفرونت إند:** `frontend/src/features/inventory/api/warehouse-bins.api.ts`, `frontend/src/features/inventory/pages/WarehouseBinsPage.tsx`, `frontend/src/features/inventory/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **دليل وهيكل أماكن التخزين الثلاثي (Aisle / Rack / Shelf / Bin):** إدارة الأرفف والمسارات التخزينية داخل كل مستودع وتعيين سعات تخزينية قصوى ونوع التخزين المخصص.
  2. **تخصيص وربط مواقع الأصناف (Product Allocations):** تعيين موقع التخزين الأساسي والثانوي لكل صنف لتسهيل عمليات التجهيز والانتقاء (Picking & Putaway).
  3. **الجرد الفوري بالباركود من الجوال وقارئ الباركود (Instant Barcode Stock Audit):** مسح كود الرف وكود الصنف لتسجيل الرصيد الفعلي ومقارنته بالرصيد الدفتري فورياً مع تبيان الفروقات وحفظ سجل التدقيق.

---

## 74. مصفوفة خيارات ومعدلات الأصناف ونقاط البيع (POS Item Modifiers & Fast Combos Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Foodics / Odoo POS Product Modifiers & Meal Attributes Matrix.
* **روابط وشاشات الوصول:** `/products/modifiers` وشاشة الكاشير التفاعلية `/pos`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000065_pos_item_modifiers.ts`, `backend/src/database/database.types.ts` (`pos_modifier_groups`, `pos_modifier_options`, `product_pos_modifiers`).
  * **الباك إند:** `backend/src/modules/addons/addons.service.ts`, `backend/src/modules/addons/addons.controller.ts`.
  * **الفرونت إند:** `frontend/src/shared/api/addons.api.ts`, `frontend/src/features/products/pages/ProductModifiersPage.tsx`, `frontend/src/features/pos/components/pos-cart-panel/PosItemModifiersModal.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة مجموعات الخيارات والمعدلات (Modifier Groups):** إنشاء مجموعات منظمة (مثل: الحجم، نوع الخبز، درجة الطهي، الإضافات) مع ضبط قواعد الاختيار (إلزامي / اختياري، اختيار فردي Single-Choice أو متعدد Multiple-Choice مع حد أدنى وأقصى).
  2. **تسعير الخيارات المستقل:** تعيين سعر إضافي وتكلفة لكل خيار معدل مع دعم الخيارات المجانية.
  3. **نافذة كاشير سريعة ومحكومة القواعد (Sub-50ms POS Modifier Modal):** نافذة سريعة تفرض الاختيارات الإلزامية وتتيح التبديل والتعديل بنقرة واحدة، مع الربط التلقائي بأسعار الفاتورة وطباعة الإيصالات وشاشة المطبخ (KDS).

---

## 75. محرك تصفية المستحقات ومكافأة نهاية الخدمة والعهد (HR End of Service Settlement & Gratuity Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Jisr / ZenHR / SAP B1 End of Service Indemnity & Clearance Engine.
* **روابط وشاشات الوصول:** `/hr/settlements` (القائمة الجانبية: الإدارة والنظام ➔ مخالصات ونهاية الخدمة).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000066_hr_end_of_service_settlements.ts`, `backend/src/database/database.types.ts` (`hr_end_of_service_settlements`).
  * **الباك إند:** `backend/src/modules/hr/services/end-of-service.service.ts`, `backend/src/modules/hr/controllers/end-of-service.controller.ts`, `backend/src/modules/hr/hr.module.ts`.
  * **الفرونت إند:** `frontend/src/features/hr/api/end-of-service.api.ts`, `frontend/src/features/hr/pages/HrEndOfServicePage.tsx`, `frontend/src/features/hr/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حاسبة مكافأة نهاية الخدمة وفق أنظمة العمل (Saudi & Egyptian Labor Law Gratuity):** احتساب آلي للمكافأة طبقاً للمادتين 84 و 85 من نظام العمل السعودي (التفريق بين إنهاء العقد والاستقالة وسنوات الخدمة: أقل من سنتين، 2-5 سنوات، 5-10 سنوات، 10+ سنوات) وقانون العمل المصري المادة 125، أو السياسات المخصصة.
  2. **تصفية شاملة للمستحقات والاستقطاعات:** احتساب بدل رصيد الإجازات السنوية المتبقية، وأيام الشهر الحالي، والخصم الآلي لكافة السلف والقروض غير المسددة من صافي المستحق.
  3. **كشف العهد والأجهزة المسلمة وإقرار إخلاء الطرف:** استعراض مباشر لكافة الأجهزة والعهد العينية المسلمة للموظف (لابتوب، سيارات، عهد مالية) مع التحقق من استرجاعها وإثبات إخلاء الطرف.
  4. **الترحيل المحاسبي بنقرة واحدة (1-Click Journal Entry):** توليد قيد اليومية المالي آلياً لمديونية مصروف/مخصص نهاية الخدمة وتسوية سلف الموظفين وصرف الصافي من الخزينة أو البنك مع ربط رقم القيد بالمخالصة لمنع الازدواجية.
  5. **نموذج مخالصة وإخلاء طرف رسمي قابل للطباعة (Official Clearance Document):** شهادة مخالصة نهائية متكاملة بصيغة قانونية تحتوي على إقرار الموظف باستلام مستحقاته وإبراء ذمة المنشأة مع مساحات لتواقيع الموظف وإدارة الموارد البشرية والإدارة المالية.

---

## 76. معمارية تقسيم الملفات والوحدات وتحسين سرعة وصيانة النظام (Modularization & High-Performance Architecture)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري والأداء المؤسسي (Clean Modular Architecture & Performance).
* **معيار المقارنة الدولي:** Clean Architecture & Domain-Driven Component Slicing.
* **مسارات الكود والوحدات المقسمة:**
  1. **إدارة الصيانة (Maintenance Module):**
     - تم تقليص `MaintenanceTicketsPage.tsx` من 1,961 سطر إلى 696 سطر (تخفيض بنسبة 65%).
     - استخراج الأيقونات والتكوينات إلى `frontend/src/features/maintenance/components/MaintenanceConstants.tsx`.
     - استخراج نافذة الاستلام والإيصال إلى `frontend/src/features/maintenance/components/MaintenanceCreateTicketModal.tsx`.
     - استخراج تفاصيل الصيانة وصرف القطع وعمولة الفني إلى `frontend/src/features/maintenance/components/MaintenanceDetailModal.tsx`.
     - استخراج تسوية الحساب والتسليم إلى `frontend/src/features/maintenance/components/MaintenanceSettlementModal.tsx`.
  2. **إدارة أوامر البيع (Sales Orders Module):**
     - تم استخراج منتقي المنتجات والباركود (Combobox Portal) المعقد من `SalesOrdersPage.tsx` إلى المكون المستقل `frontend/src/features/sales/components/OrderItemProductPicker.tsx` (تخفيض 287 سطر).
  3. **إدارة المنصة والسوبر أدمن (SaaS Admin Module):**
     - تم تقليص `SaasTenantsPage.tsx` من 1,704 سطر إلى 1,274 سطر باستخراج نافذة توليد النسخ التجريبية وإدارة بيانات الدخول إلى `frontend/src/features/saas-admin/components/CreateTrialTenantModal.tsx`.
  4. **كاش الباك إند فائق السرعة (Backend In-Memory Cache Engine):**
     - تفعيل كاش ذاكرة فائق السرعة لبيانات الإعدادات والفروع والمواقع في `backend/src/modules/settings/settings.service.ts` مع إبطال فوري وتلقائي عند الحفظ أو التعديل لتسريع الاستجابة.
  5. **تقسيم كود الإعدادات (Lazy Code-Splitting):**
     - تحويل الأقسام الثانوية في `SettingsSectionContent.tsx` إلى `React.lazy` و `Suspense` لتسريع تحميل واجهة الإعدادات وتقليل حجم حزمة الجافاسكريبت المبدئية.
  6. **تنظيف وتحسين ملفات التنسيق (CSS Optimization):**
     - إزالة 1,115 سطر من الأكواد المكررة في `frontend/src/styles/partials/document-form-prototype.css` وتوحيد أنماط الدارك مود.
  7. **إدارة الشيكات والأوراق المالية (PDC Cheques Module):**
     - تم تقليص `PdcChequesPage.tsx` من 1,643 سطر إلى 969 سطر (تخفيض أكثر من 670 سطر).
  3. **الامتثال لمتطلبات الفوترة الخليجية:** طباعة التاريخ الهجري على إيصالات وفواتير الكاشير والضريبة لضمان التوافق التام مع متطلبات السوق السعودي والخليجي.

---

## 65. أوامر البيع وحجز المخزون المؤقت (Sales Orders & Stock Reservation Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 17 Sales Orders & Stock Allocation / Reservation Engine.
* **روابط وشاشات الوصول:** `/sales/orders` (القائمة الجانبية: المبيعات ➔ أوامر البيع وحجز المخزون).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000059_sales_orders_stock_reservation.ts`, `backend/src/database/database.types.ts` (`products.reserved_qty`, `sales_orders`, `sales_order_items`).
  * **الباك إند:** `backend/src/modules/sales/services/sales-orders.service.ts`, `backend/src/modules/sales/controllers/sales-orders.controller.ts`, `backend/src/modules/sales/sales.module.ts`.
  * **الفرونت إند:** `frontend/src/features/sales/api/sales-orders.api.ts`, `frontend/src/features/sales/pages/SalesOrdersPage.tsx`, `frontend/src/features/sales/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حجز المخزون المؤقت الآلي (Real-Time Stock Reservation):** فور تأكيد أمر البيع، يتم حجز الكميات المطلوبة في المخزون (`reserved_qty`) لمنع بيعها أو تكرار حجزها في نقاط البيع (POS) أو المتجر الإلكتروني، مع احتساب دقيق للرصيد المتاح للبيع للآخرين (`available_qty = stock_qty - reserved_qty`).
  2. **صلاحية الحجز ومتابعة التسليم:** تحديد تاريخ انتهاء لصلاحية الحجز وتاريخ التسليم المتوقع لكل طلبية.
  3. **التحويل بنقرة واحدة إلى فاتورة بيع فعلية (1-Click Convert to Sale Invoice):** تحويل أمر البيع المؤكد مباشرة إلى فاتورة بيع مرحلة في نظام المبيعات، مع فك الحجز آلياً وخصم الكميات من المخزون الفعلي دون أي تدخل يدوي أو ازدواجية.
  4. **إلغاء أمر البيع وفك الحجز الفوري:** إمكانية إلغاء أمر البيع بضغطة زر لفك حجز المخزون فورياً وإعادته للرصيد المتاح للبيع.
  5. **لوحة فحص جاهزية المخزون (Stock Readiness Modal):** فحص فوري لكل بند في أمر البيع ومقارنة الكمية المطلوبة بالكمية المحجوزة والرصيد الفعلي بالمستودع والرصيد المتاح للآخرين.

## 66. دورة أوامر الشراء واعتماد الموردين والاستلام المخزني (Purchase Orders & Goods Receipt)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Purchase Orders (PO) & 3-Way Matching Flow.
* **روابط وشاشات الوصول:** `/purchases/orders` (القائمة الجانبية: المشتريات والموردين ➔ أوامر الشراء PO).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000060_purchase_orders_and_unbuild.ts`, `backend/src/database/database.types.ts` (`purchase_orders`, `purchase_order_items`).
  * **الباك إند:** `backend/src/modules/purchases/services/purchase-orders.service.ts`, `backend/src/modules/purchases/controllers/purchase-orders.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`.
  * **الفرونت إند:** `frontend/src/features/purchases/api/purchase-orders.api.ts`, `frontend/src/features/purchases/pages/PurchaseOrdersPage.tsx`, `frontend/src/features/purchases/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إصدار واعتماد أوامر الشراء الرسمية (Purchase Orders):** إنشاء أوامر شراء بمسودة أولية مع الموردين، حساب المجاميع والضرائب والخصومات، وتأكيد الأمر بنقرة زر واحدة لإرساله للمورد.
  2. **دورة الاستلام المخزني الجزئي والكامل (Goods Receipt Flow):** نافذة مخصصة لإثبات استلام الشحنات والبضائع الواردة، وتغذية أرصدة المخزون الفعلية فورياً، مع تصنيف دقيق لحالة الاستلام (`partially_received` أو `received`).
  3. **التحويل المباشر لفاتورة مشتريات رسمية (Convert to Bill):** تحويل أمر الشراء المستلم بضغطة زر واحدة إلى فاتورة مشتريات مرحلة في حسابات الموردين دون إعادة إدخال البيانات، مع حفظ رقم الفاتورة المرجعي.
  4. **إلغاء وحذف الأوامر المسودة والملغاة:** حوكمة صارمة لمنع التعديل على الأوامر التي تم ترحيلها لفواتير رسمية.

---

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

## 68. دستور وتوحيد التيبوجرافي المؤسسي وأحجام الخطوط (Enterprise Typography Hierarchy)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:** `frontend/src/styles/partials/base.css`, `frontend/src/shared/components/page-header.tsx`, `d:\zn\GEMINI.md`.
* **الميزات والقدرات المفعلة:**
  1. **متغيرات CSS قياسية مركزية (Typography Tokens):** تعريف متغيرات ثابتة لأحجام الخطوط (`--font-page-title: 1.15rem`, `--font-section-title: 0.98rem`, `--font-body: 0.8125rem`, `--font-subtitle: 0.8125rem`, `--font-table-head: 0.78rem`, `--font-badge: 0.72rem`, `--font-micro: 0.6875rem`).
  2. **إعادة ضبط عناصر HTML الأساسية (Base HTML Scale Resets):** إلزام وسوم `h1`, `h2`, `h3`, `h4`, `p`, `small`, `th`, `td` بأوزان وأحجام منضبطة تمنع المتصفح من تكبير أي عنوان أو هيدر لجدول تلقائياً وتمنع التفاوت البصري بين الشاشات.
  3. **توثيق دستوري إلزامي:** تقييد السلم الهرمي في دستور النظام `GEMINI.md` كقاعدة إلزامية دائمة لكافة المطورين.

---

## 69. نظام حفظ واسترجاع المسودات التلقائي عديم الحمل (Zero-Overhead Auto-Draft Persistence Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Google Docs / Linear Autosave & Draft Protection Standard.
* **روابط وشاشات الوصول المشمولة:**
  1. إذن صرف المخزون الجديد (`/inventory/new-issue-order`).
  2. فاتورة / أمر المشتريات الجديدة (`/purchases/new`).
  3. أوامر البيع وحجز المخزون (`/sales/orders`).
  4. أوامر الشراء PO مع الموردين (`/purchases/orders`).
  5. عروض الأسعار للعملاء (`/sales/quotations`).
* **مسارات الكود الأساسية:**
  * **الخطاف العام (Universal Hook):** `frontend/src/shared/hooks/use-form-draft.ts`.
  * **مكون التنبيه المؤسسي (UI Banner):** `frontend/src/shared/components/DraftRestoredBanner.tsx`.
  * **صفحات التنفيذ:** `NewIssueOrderPage.tsx`, `useNewPurchaseOrderController.ts`, `SalesOrdersPage.tsx`, `PurchaseOrdersPage.tsx`, `QuotationsPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حماية المدخلات من الفقدان العرضي:** في حال قام المستخدم بإدخال عدة أصناف أو بيانات في إذن صرف أو فاتورة مشتريات أو أمر بيع، ثم انتقل بالخطأ إلى صفحة أخرى أو نقر على رابط في القائمة الجانبية أو أغلق المتصفح، تظل كافة البيانات المحررة والأصناف محفوظة في المتصفح محلياً دون فقدان أي بند.
  2. **صفر حمل على السيرفر وانعدام البطء (Zero CPU/Server Load):** يتم الحفظ داخل متصفح المستخدم (`localStorage`) عبر محرك تأخير ذكي (Debounce 400ms) مع مقارنة البصمة الحركية (`Snapshot Check`)، فلا يتم الحفظ إلا عند حدوث تغيير حقيقي، مع تفريغ فوري (`flushDraft`) قبل مغادرة الصفحة أو عند إغلاق التبويب (`beforeunload`).
  3. **تطهير وتفريغ تلقائي للمسودة:** يتم مسح المسودة تلقائياً وفورياً بمجرد تأكيد وحفظ العملية بنجاح أو عند قيام المستخدم بإلغاء المسودة أو تصفير النموذج لضمان نظافة التخزين وعدم بقاء مخلفات قديمة.
  4. **شريط استرجاع مؤسسي أنيق (DraftRestoredBanner):** إشعار بصري ناعم مطابق للدستور المؤسسي بدون إيموجيز يُنبه المستخدم بأنه تم استرجاع مدخلات المسودة السابقة تلقائياً مع زر مباشر لمسح المسودة والبدء من جديد بنقرة واحدة.

---

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

## 71. طلبات عروض أسعار الموردين ومصفوفة المقارنة والترسية (Vendor RFQs & Comparison Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Purchase RFQ & Vendor Tender Comparison Matrix.
* **روابط وشاشات الوصول:** `/purchases/rfqs` (القائمة الجانبية: المشتريات والموردين ➔ طلبات عروض الأسعار RFQ).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000062_purchase_rfqs.ts`, `backend/src/database/database.types.ts` (`purchase_rfqs`, `purchase_rfq_items`, `purchase_rfq_vendor_bids`).
  * **الباك إند:** `backend/src/modules/purchases/services/purchase-rfqs.service.ts`, `backend/src/modules/purchases/controllers/purchase-rfqs.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`.
  * **الفرونت إند:** `frontend/src/features/purchases/api/purchase-rfqs.api.ts`, `frontend/src/features/purchases/pages/PurchaseRfqsPage.tsx`, `frontend/src/features/purchases/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة دورة طلبات عروض الأسعار المفتوحة (Purchase RFQs):** إنشاء طلبات تسعير بأصناف وكميات محددة مع تحديد موعد استحقاق نهائي لاستقبال العطاءات.
  2. **تسجيل ومقارنة عروض الموردين المتنافسة (Bid Comparison Matrix):** جدول مقارنة بصري تفاعلي يقارن الأسعار المقدمة ومواعيد التسليم المقترحة وشروط الدفع بين مختلف الموردين.
  3. **الترسية وتوليد أمر الشراء بضغطة زر (1-Click Award to PO):** اختيار العرض الفائز وترسيته بنقرة واحدة لتحويله تلقائياً إلى أمر شراء رسمي (PO) في موديول المشتريات وإغلاق المناقصة.

---

## 72. تسوية وتخصيص المدفوعات والقيود العكسية الآلية (Invoice Payment Allocation & Auto-Reversals)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Invoicing Reconciliation / Matching & Reversal Journal Entries.
* **روابط وشاشات الوصول:** `/accounting/payment-allocation` و `/accounting/journal-entries`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000063_payment_allocations_and_reversals.ts`, `backend/src/database/database.types.ts` (`payment_allocations`).
  * **الباك إند:** `backend/src/modules/accounting/services/payment-allocation.service.ts`, `backend/src/modules/accounting/accounting.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/PaymentAllocationPage.tsx`, `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **تسوية وتخصيص الدفعات غير المربوطة بالفواتير:** ربط سندات القبض والدفع المفتوحة بفواتير المبيعات والمشتريات المعلقة للعميل أو المورد مع بيان المبلغ المتبقي لكل فاتورة.
  2. **محرك التسوية الآلي بالوارِد أولاً يُصرَف أولاً (FIFO Auto-Reconciliation):** توزيع تلقائي فوري لأي دفعة على الفواتير المفتوحة الأقدم تاريخياً وتحديث حالة السداد ومبالغ الفواتير بدقة سنت واحد.
  3. **إلغاء وعكس القيود اليومية آلياً (Auto-Reversal Entries):** نافذة رسمية لإلغاء أي قيد مرحل مع تدوين سبب الإلغاء، وتوليد القيد العكسي المعادل فورياً وربطه محاسبياً بالقيد الأصلي لمنع التلاعب وحفظ التدقيق المالي.

---

## 73. أماكن التخزين والأرفف والجرد الفوري بالباركود (Warehouse Bins, Shelves & Mobile Audit)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Storage Locations / Putaway Rules & Barcode Stock Audit.
* **روابط وشاشات الوصول:** `/inventory/bins` (القائمة الجانبية: المخزون والأصناف ➔ أماكن التخزين والأرفف).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000064_warehouse_bin_locations.ts`, `backend/src/database/database.types.ts` (`warehouse_bins`, `product_bin_allocations`).
  * **الباك إند:** `backend/src/modules/inventory/services/warehouse-bins.service.ts`, `backend/src/modules/inventory/controllers/warehouse-bins.controller.ts`, `backend/src/modules/inventory/inventory.module.ts`.
  * **الفرونت إند:** `frontend/src/features/inventory/api/warehouse-bins.api.ts`, `frontend/src/features/inventory/pages/WarehouseBinsPage.tsx`, `frontend/src/features/inventory/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **دليل وهيكل أماكن التخزين الثلاثي (Aisle / Rack / Shelf / Bin):** إدارة الأرفف والمسارات التخزينية داخل كل مستودع وتعيين سعات تخزينية قصوى ونوع التخزين المخصص.
  2. **تخصيص وربط مواقع الأصناف (Product Allocations):** تعيين موقع التخزين الأساسي والثانوي لكل صنف لتسهيل عمليات التجهيز والانتقاء (Picking & Putaway).
  3. **الجرد الفوري بالباركود من الجوال وقارئ الباركود (Instant Barcode Stock Audit):** مسح كود الرف وكود الصنف لتسجيل الرصيد الفعلي ومقارنته بالرصيد الدفتري فورياً مع تبيان الفروقات وحفظ سجل التدقيق.

---

## 74. مصفوفة خيارات ومعدلات الأصناف ونقاط البيع (POS Item Modifiers & Fast Combos Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Foodics / Odoo POS Product Modifiers & Meal Attributes Matrix.
* **روابط وشاشات الوصول:** `/products/modifiers` وشاشة الكاشير التفاعلية `/pos`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000065_pos_item_modifiers.ts`, `backend/src/database/database.types.ts` (`pos_modifier_groups`, `pos_modifier_options`, `product_pos_modifiers`).
  * **الباك إند:** `backend/src/modules/addons/addons.service.ts`, `backend/src/modules/addons/addons.controller.ts`.
  * **الفرونت إند:** `frontend/src/shared/api/addons.api.ts`, `frontend/src/features/products/pages/ProductModifiersPage.tsx`, `frontend/src/features/pos/components/pos-cart-panel/PosItemModifiersModal.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة مجموعات الخيارات والمعدلات (Modifier Groups):** إنشاء مجموعات منظمة (مثل: الحجم، نوع الخبز، درجة الطهي، الإضافات) مع ضبط قواعد الاختيار (إلزامي / اختياري، اختيار فردي Single-Choice أو متعدد Multiple-Choice مع حد أدنى وأقصى).
  2. **تسعير الخيارات المستقل:** تعيين سعر إضافي وتكلفة لكل خيار معدل مع دعم الخيارات المجانية.
  3. **نافذة كاشير سريعة ومحكومة القواعد (Sub-50ms POS Modifier Modal):** نافذة سريعة تفرض الاختيارات الإلزامية وتتيح التبديل والتعديل بنقرة واحدة، مع الربط التلقائي بأسعار الفاتورة وطباعة الإيصالات وشاشة المطبخ (KDS).

---

## 75. محرك تصفية المستحقات ومكافأة نهاية الخدمة والعهد (HR End of Service Settlement & Gratuity Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Jisr / ZenHR / SAP B1 End of Service Indemnity & Clearance Engine.
* **روابط وشاشات الوصول:** `/hr/settlements` (القائمة الجانبية: الإدارة والنظام ➔ مخالصات ونهاية الخدمة).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000066_hr_end_of_service_settlements.ts`, `backend/src/database/database.types.ts` (`hr_end_of_service_settlements`).
  * **الباك إند:** `backend/src/modules/hr/services/end-of-service.service.ts`, `backend/src/modules/hr/controllers/end-of-service.controller.ts`, `backend/src/modules/hr/hr.module.ts`.
  * **الفرونت إند:** `frontend/src/features/hr/api/end-of-service.api.ts`, `frontend/src/features/hr/pages/HrEndOfServicePage.tsx`, `frontend/src/features/hr/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حاسبة مكافأة نهاية الخدمة وفق أنظمة العمل (Saudi & Egyptian Labor Law Gratuity):** احتساب آلي للمكافأة طبقاً للمادتين 84 و 85 من نظام العمل السعودي (التفريق بين إنهاء العقد والاستقالة وسنوات الخدمة: أقل من سنتين، 2-5 سنوات، 5-10 سنوات، 10+ سنوات) وقانون العمل المصري المادة 125، أو السياسات المخصصة.
  2. **تصفية شاملة للمستحقات والاستقطاعات:** احتساب بدل رصيد الإجازات السنوية المتبقية، وأيام الشهر الحالي، والخصم الآلي لكافة السلف والقروض غير المسددة من صافي المستحق.
  3. **كشف العهد والأجهزة المسلمة وإقرار إخلاء الطرف:** استعراض مباشر لكافة الأجهزة والعهد العينية المسلمة للموظف (لابتوب، سيارات، عهد مالية) مع التحقق من استرجاعها وإثبات إخلاء الطرف.
  4. **الترحيل المحاسبي بنقرة واحدة (1-Click Journal Entry):** توليد قيد اليومية المالي آلياً لمديونية مصروف/مخصص نهاية الخدمة وتسوية سلف الموظفين وصرف الصافي من الخزينة أو البنك مع ربط رقم القيد بالمخالصة لمنع الازدواجية.
  5. **نموذج مخالصة وإخلاء طرف رسمي قابل للطباعة (Official Clearance Document):** شهادة مخالصة نهائية متكاملة بصيغة قانونية تحتوي على إقرار الموظف باستلام مستحقاته وإبراء ذمة المنشأة مع مساحات لتواقيع الموظف وإدارة الموارد البشرية والإدارة المالية.

---

## 76. معمارية تقسيم الملفات والوحدات وتحسين سرعة وصيانة النظام (Modularization & High-Performance Architecture)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري والأداء المؤسسي (Clean Modular Architecture & Performance).
* **معيار المقارنة الدولي:** Clean Architecture & Domain-Driven Component Slicing.
* **مسارات الكود والوحدات المقسمة:**
  1. **إدارة الصيانة (Maintenance Module):**
     - تم تقليص `MaintenanceTicketsPage.tsx` من 1,961 سطر إلى 696 سطر (تخفيض بنسبة 65%).
     - استخراج الأيقونات والتكوينات إلى `frontend/src/features/maintenance/components/MaintenanceConstants.tsx`.
     - استخراج نافذة الاستلام والإيصال إلى `frontend/src/features/maintenance/components/MaintenanceCreateTicketModal.tsx`.
     - استخراج تفاصيل الصيانة وصرف القطع وعمولة الفني إلى `frontend/src/features/maintenance/components/MaintenanceDetailModal.tsx`.
     - استخراج تسوية الحساب والتسليم إلى `frontend/src/features/maintenance/components/MaintenanceSettlementModal.tsx`.
  2. **إدارة أوامر البيع (Sales Orders Module):**
     - تم استخراج منتقي المنتجات والباركود (Combobox Portal) المعقد من `SalesOrdersPage.tsx` إلى المكون المستقل `frontend/src/features/sales/components/OrderItemProductPicker.tsx` (تخفيض 287 سطر).
  3. **إدارة المنصة والسوبر أدمن (SaaS Admin Module):**
     - تم تقليص `SaasTenantsPage.tsx` من 1,704 سطر إلى 1,274 سطر باستخراج نافذة توليد النسخ التجريبية وإدارة بيانات الدخول إلى `frontend/src/features/saas-admin/components/CreateTrialTenantModal.tsx`.
     - توحيد وتنسيق صفحة باقات الساس `SaasPlansPage.tsx` بنسبة 100% وفق دستور النظام البصري ومطابقتها لنموذج الأقساط `installments` (عمود العرض `document-prototype-column`، هيدر `PageHeader` بشارة SaaS Admin، بطاقات الإحصائيات `StatsGrid`، شريط بحث فوري، وقسم البطاقة `document-prototype-section`).
  4. **كاش الباك إند فائق السرعة (Backend In-Memory Cache Engine):**
     - تفعيل كاش ذاكرة فائق السرعة لبيانات الإعدادات والفروع والمواقع في `backend/src/modules/settings/settings.service.ts` مع إبطال فوري وتلقائي عند الحفظ أو التعديل لتسريع الاستجابة.
  5. **تقسيم كود الإعدادات (Lazy Code-Splitting):**
     - تحويل الأقسام الثانوية في `SettingsSectionContent.tsx` إلى `React.lazy` و `Suspense` لتسريع تحميل واجهة الإعدادات وتقليل حجم حزمة الجافاسكريبت المبدئية.
  6. **تنظيف وتحسين ملفات التنسيق (CSS Optimization):**
     - إزالة 1,115 سطر من الأكواد المكررة في `frontend/src/styles/partials/document-form-prototype.css` وتوحيد أنماط الدارك مود.
  7. **إدارة الشيكات والأوراق المالية (PDC Cheques Module):**
     - تم تقليص `PdcChequesPage.tsx` من 1,643 سطر إلى 969 سطر (تخفيض أكثر من 670 سطر).
     - استخراج نافذة تسجيل ورقة قبض / دفع جديدة بكامل منطق الفاليديشن والعملات والتواريخ إلى `frontend/src/features/accounting/components/PdcChequeCreateModal.tsx`.
     - استخراج نافذة دورة حياة الشيك (إيداع بنكي، تحصيل، صرف، ارتداد مع الغرامات، تظهير لمورد) إلى `frontend/src/features/accounting/components/PdcChequeActionModal.tsx`.
     - استخراج معاينة وطباعة السند المالي الرسمي للشيك إلى `frontend/src/features/accounting/components/PdcChequeVoucherModal.tsx`.
  8. **كاش خطط وباقات الساس وميزات النظام (SaaS & Feature Plans In-Memory Cache):**
     - إضافة كاش ذاكرة ذكي في `backend/src/modules/saas-admin/saas-admin.service.ts` لطلبات استعلام الباقات ومصفوفة الميزات (5 دقائق TTL) مع إبطال فوري عند الإنشاء أو التعديل لتسريع الاستجابة وتخفيف الحمل على قاعدة البيانات.
  9. **تحسين أداء الرسوم ومسارات الـ CSS (CSS Composition & Zero Perpetual Loops):**
     - إزالة الأنيميشن المستمر `reportFloat` اللانهائي في `frontend/src/styles/partials/features.css` لمنع استهلاك المعالج والـ GPU المستمر، والتأكد من صفر لاج في الرسوم البيانية التفاعلية.
  10. **تفكيك وتدقيق صفحات النظام الكبرى (Enterprise Page Modularization - Categories 1 & 2):**
      - تم بنجاح تفكيك وتقليص كافة صفحات الفئة الأولى (> 600 سطر) والفئة الثانية (500 إلى 600 سطر) لتصبح جميعها رشيقة وتحت سقف 400 سطر (معظمها بين 150 و 260 سطر) بنسبة إنجاز 100% وبصفر أخطاء TypeScript:
      - **قوائم الأسعار (`PriceListsPage.tsx`):** من 625 إلى 260 سطر باستخراج `PriceListModal.tsx` و `PriceListCard.tsx`.
      - **حضور وانصراف الموظفين (`HrAttendancePage.tsx`):** من 624 إلى 341 سطر باستخراج `AttendanceKpiSummary.tsx`, `DailyAttendanceTable.tsx`, `AttendanceExceptionsTable.tsx`, `ManualAttendanceModal.tsx`.
      - **تصنيفات المنتجات (`ProductCategoriesPage.tsx`):** من 613 إلى 337 سطر باستخراج `CategoriesDataTable.tsx`, `CategoryFormModal.tsx`, `CategoryTransferProductsModal.tsx`, `CategoryTransferWarehouseModal.tsx`.
      - **الأصول الثابتة والإهلاك (`AccountingFixedAssetsPage.tsx`):** من 598 إلى 265 سطر باستخراج `AddFixedAssetModal.tsx`, `DepreciateModals.tsx`, `FixedAssetsTable.tsx`, `FixedAssetsLogsTable.tsx`.
      - **تخصيص وسداد الفواتير (`PaymentAllocationPage.tsx`):** من 592 إلى 257 سطر باستخراج `PartnerSelectorBar.tsx`, `UnallocatedPaymentsCard.tsx`, `OpenInvoicesCard.tsx`.
      - **إقرار ضريبة القيمة المضافة (`VatDeclarationPage.tsx`):** من 576 إلى 194 سطر باستخراج `VatPeriodSelector.tsx`, `VatSalesTable.tsx`, `VatPurchasesTable.tsx`, `VatSummaryBox.tsx`.
      - **شاشة العميل (`CustomerFacingDisplayPage.tsx`):** من 564 إلى 203 سطر باستخراج `CfdHeader.tsx`, `CfdIdleView.tsx`, `CfdScanningView.tsx`, `CfdCompletedView.tsx`.
      - **نواقص الصيدلية (`PharmacyShortagesPage.tsx`):** من 549 إلى 198 سطر باستخراج `ShortagesKpiGrid.tsx`, `ShortageQuickAddBar.tsx`, `ShortageFilterBar.tsx`, `ShortagesTable.tsx`, `ShortageDetailModal.tsx`.
## 66. دورة أوامر الشراء واعتماد الموردين والاستلام المخزني (Purchase Orders & Goods Receipt)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Purchase Orders (PO) & 3-Way Matching Flow.
* **روابط وشاشات الوصول:** `/purchases/orders` (القائمة الجانبية: المشتريات والموردين ➔ أوامر الشراء PO).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000060_purchase_orders_and_unbuild.ts`, `backend/src/database/database.types.ts` (`purchase_orders`, `purchase_order_items`).
  * **الباك إند:** `backend/src/modules/purchases/services/purchase-orders.service.ts`, `backend/src/modules/purchases/controllers/purchase-orders.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`.
  * **الفرونت إند:** `frontend/src/features/purchases/api/purchase-orders.api.ts`, `frontend/src/features/purchases/pages/PurchaseOrdersPage.tsx`, `frontend/src/features/purchases/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إصدار واعتماد أوامر الشراء الرسمية (Purchase Orders):** إنشاء أوامر شراء بمسودة أولية مع الموردين، حساب المجاميع والضرائب والخصومات، وتأكيد الأمر بنقرة زر واحدة لإرساله للمورد.
  2. **دورة الاستلام المخزني الجزئي والكامل (Goods Receipt Flow):** نافذة مخصصة لإثبات استلام الشحنات والبضائع الواردة، وتغذية أرصدة المخزون الفعلية فورياً، مع تصنيف دقيق لحالة الاستلام (`partially_received` أو `received`).
  3. **التحويل المباشر لفاتورة مشتريات رسمية (Convert to Bill):** تحويل أمر الشراء المستلم بضغطة زر واحدة إلى فاتورة مشتريات مرحلة في حسابات الموردين دون إعادة إدخال البيانات، مع حفظ رقم الفاتورة المرجعي.
  4. **إلغاء وحذف الأوامر المسودة والملغاة:** حوكمة صارمة لمنع التعديل على الأوامر التي تم ترحيلها لفواتير رسمية.

---

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

## 68. دستور وتوحيد التيبوجرافي المؤسسي وأحجام الخطوط (Enterprise Typography Hierarchy)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:** `frontend/src/styles/partials/base.css`, `frontend/src/shared/components/page-header.tsx`, `d:\zn\GEMINI.md`.
* **الميزات والقدرات المفعلة:**
  1. **متغيرات CSS قياسية مركزية (Typography Tokens):** تعريف متغيرات ثابتة لأحجام الخطوط (`--font-page-title: 1.15rem`, `--font-section-title: 0.98rem`, `--font-body: 0.8125rem`, `--font-subtitle: 0.8125rem`, `--font-table-head: 0.78rem`, `--font-badge: 0.72rem`, `--font-micro: 0.6875rem`).
  2. **إعادة ضبط عناصر HTML الأساسية (Base HTML Scale Resets):** إلزام وسوم `h1`, `h2`, `h3`, `h4`, `p`, `small`, `th`, `td` بأوزان وأحجام منضبطة تمنع المتصفح من تكبير أي عنوان أو هيدر لجدول تلقائياً وتمنع التفاوت البصري بين الشاشات.
  3. **توثيق دستوري إلزامي:** تقييد السلم الهرمي في دستور النظام `GEMINI.md` كقاعدة إلزامية دائمة لكافة المطورين.

---

## 69. نظام حفظ واسترجاع المسودات التلقائي عديم الحمل (Zero-Overhead Auto-Draft Persistence Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Google Docs / Linear Autosave & Draft Protection Standard.
* **روابط وشاشات الوصول المشمولة:**
  1. إذن صرف المخزون الجديد (`/inventory/new-issue-order`).
  2. فاتورة / أمر المشتريات الجديدة (`/purchases/new`).
  3. أوامر البيع وحجز المخزون (`/sales/orders`).
  4. أوامر الشراء PO مع الموردين (`/purchases/orders`).
  5. عروض الأسعار للعملاء (`/sales/quotations`).
* **مسارات الكود الأساسية:**
  * **الخطاف العام (Universal Hook):** `frontend/src/shared/hooks/use-form-draft.ts`.
  * **مكون التنبيه المؤسسي (UI Banner):** `frontend/src/shared/components/DraftRestoredBanner.tsx`.
  * **صفحات التنفيذ:** `NewIssueOrderPage.tsx`, `useNewPurchaseOrderController.ts`, `SalesOrdersPage.tsx`, `PurchaseOrdersPage.tsx`, `QuotationsPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حماية المدخلات من الفقدان العرضي:** في حال قام المستخدم بإدخال عدة أصناف أو بيانات في إذن صرف أو فاتورة مشتريات أو أمر بيع، ثم انتقل بالخطأ إلى صفحة أخرى أو نقر على رابط في القائمة الجانبية أو أغلق المتصفح، تظل كافة البيانات المحررة والأصناف محفوظة في المتصفح محلياً دون فقدان أي بند.
  2. **صفر حمل على السيرفر وانعدام البطء (Zero CPU/Server Load):** يتم الحفظ داخل متصفح المستخدم (`localStorage`) عبر محرك تأخير ذكي (Debounce 400ms) مع مقارنة البصمة الحركية (`Snapshot Check`)، فلا يتم الحفظ إلا عند حدوث تغيير حقيقي، مع تفريغ فوري (`flushDraft`) قبل مغادرة الصفحة أو عند إغلاق التبويب (`beforeunload`).
  3. **تطهير وتفريغ تلقائي للمسودة:** يتم مسح المسودة تلقائياً وفورياً بمجرد تأكيد وحفظ العملية بنجاح أو عند قيام المستخدم بإلغاء المسودة أو تصفير النموذج لضمان نظافة التخزين وعدم بقاء مخلفات قديمة.
  4. **شريط استرجاع مؤسسي أنيق (DraftRestoredBanner):** إشعار بصري ناعم مطابق للدستور المؤسسي بدون إيموجيز يُنبه المستخدم بأنه تم استرجاع مدخلات المسودة السابقة تلقائياً مع زر مباشر لمسح المسودة والبدء من جديد بنقرة واحدة.

---

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

## 71. طلبات عروض أسعار الموردين ومصفوفة المقارنة والترسية (Vendor RFQs & Comparison Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Purchase RFQ & Vendor Tender Comparison Matrix.
* **روابط وشاشات الوصول:** `/purchases/rfqs` (القائمة الجانبية: المشتريات والموردين ➔ طلبات عروض الأسعار RFQ).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000062_purchase_rfqs.ts`, `backend/src/database/database.types.ts` (`purchase_rfqs`, `purchase_rfq_items`, `purchase_rfq_vendor_bids`).
  * **الباك إند:** `backend/src/modules/purchases/services/purchase-rfqs.service.ts`, `backend/src/modules/purchases/controllers/purchase-rfqs.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`.
  * **الفرونت إند:** `frontend/src/features/purchases/api/purchase-rfqs.api.ts`, `frontend/src/features/purchases/pages/PurchaseRfqsPage.tsx`, `frontend/src/features/purchases/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة دورة طلبات عروض الأسعار المفتوحة (Purchase RFQs):** إنشاء طلبات تسعير بأصناف وكميات محددة مع تحديد موعد استحقاق نهائي لاستقبال العطاءات.
  2. **تسجيل ومقارنة عروض الموردين المتنافسة (Bid Comparison Matrix):** جدول مقارنة بصري تفاعلي يقارن الأسعار المقدمة ومواعيد التسليم المقترحة وشروط الدفع بين مختلف الموردين.
  3. **الترسية وتوليد أمر الشراء بضغطة زر (1-Click Award to PO):** اختيار العرض الفائز وترسيته بنقرة واحدة لتحويله تلقائياً إلى أمر شراء رسمي (PO) في موديول المشتريات وإغلاق المناقصة.

---

## 72. تسوية وتخصيص المدفوعات والقيود العكسية الآلية (Invoice Payment Allocation & Auto-Reversals)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Invoicing Reconciliation / Matching & Reversal Journal Entries.
* **روابط وشاشات الوصول:** `/accounting/payment-allocation` و `/accounting/journal-entries`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000063_payment_allocations_and_reversals.ts`, `backend/src/database/database.types.ts` (`payment_allocations`).
  * **الباك إند:** `backend/src/modules/accounting/services/payment-allocation.service.ts`, `backend/src/modules/accounting/accounting.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/PaymentAllocationPage.tsx`, `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **تسوية وتخصيص الدفعات غير المربوطة بالفواتير:** ربط سندات القبض والدفع المفتوحة بفواتير المبيعات والمشتريات المعلقة للعميل أو المورد مع بيان المبلغ المتبقي لكل فاتورة.
  2. **محرك التسوية الآلي بالوارِد أولاً يُصرَف أولاً (FIFO Auto-Reconciliation):** توزيع تلقائي فوري لأي دفعة على الفواتير المفتوحة الأقدم تاريخياً وتحديث حالة السداد ومبالغ الفواتير بدقة سنت واحد.
  3. **إلغاء وعكس القيود اليومية آلياً (Auto-Reversal Entries):** نافذة رسمية لإلغاء أي قيد مرحل مع تدوين سبب الإلغاء، وتوليد القيد العكسي المعادل فورياً وربطه محاسبياً بالقيد الأصلي لمنع التلاعب وحفظ التدقيق المالي.

---

## 73. أماكن التخزين والأرفف والجرد الفوري بالباركود (Warehouse Bins, Shelves & Mobile Audit)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Storage Locations / Putaway Rules & Barcode Stock Audit.
* **روابط وشاشات الوصول:** `/inventory/bins` (القائمة الجانبية: المخزون والأصناف ➔ أماكن التخزين والأرفف).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000064_warehouse_bin_locations.ts`, `backend/src/database/database.types.ts` (`warehouse_bins`, `product_bin_allocations`).
  * **الباك إند:** `backend/src/modules/inventory/services/warehouse-bins.service.ts`, `backend/src/modules/inventory/controllers/warehouse-bins.controller.ts`, `backend/src/modules/inventory/inventory.module.ts`.
  * **الفرونت إند:** `frontend/src/features/inventory/api/warehouse-bins.api.ts`, `frontend/src/features/inventory/pages/WarehouseBinsPage.tsx`, `frontend/src/features/inventory/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **دليل وهيكل أماكن التخزين الثلاثي (Aisle / Rack / Shelf / Bin):** إدارة الأرفف والمسارات التخزينية داخل كل مستودع وتعيين سعات تخزينية قصوى ونوع التخزين المخصص.
  2. **تخصيص وربط مواقع الأصناف (Product Allocations):** تعيين موقع التخزين الأساسي والثانوي لكل صنف لتسهيل عمليات التجهيز والانتقاء (Picking & Putaway).
  3. **الجرد الفوري بالباركود من الجوال وقارئ الباركود (Instant Barcode Stock Audit):** مسح كود الرف وكود الصنف لتسجيل الرصيد الفعلي ومقارنته بالرصيد الدفتري فورياً مع تبيان الفروقات وحفظ سجل التدقيق.

---

## 74. مصفوفة خيارات ومعدلات الأصناف ونقاط البيع (POS Item Modifiers & Fast Combos Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Foodics / Odoo POS Product Modifiers & Meal Attributes Matrix.
* **روابط وشاشات الوصول:** `/products/modifiers` وشاشة الكاشير التفاعلية `/pos`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000065_pos_item_modifiers.ts`, `backend/src/database/database.types.ts` (`pos_modifier_groups`, `pos_modifier_options`, `product_pos_modifiers`).
  * **الباك إند:** `backend/src/modules/addons/addons.service.ts`, `backend/src/modules/addons/addons.controller.ts`.
  * **الفرونت إند:** `frontend/src/shared/api/addons.api.ts`, `frontend/src/features/products/pages/ProductModifiersPage.tsx`, `frontend/src/features/pos/components/pos-cart-panel/PosItemModifiersModal.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة مجموعات الخيارات والمعدلات (Modifier Groups):** إنشاء مجموعات منظمة (مثل: الحجم، نوع الخبز، درجة الطهي، الإضافات) مع ضبط قواعد الاختيار (إلزامي / اختياري، اختيار فردي Single-Choice أو متعدد Multiple-Choice مع حد أدنى وأقصى).
  2. **تسعير الخيارات المستقل:** تعيين سعر إضافي وتكلفة لكل خيار معدل مع دعم الخيارات المجانية.
  3. **نافذة كاشير سريعة ومحكومة القواعد (Sub-50ms POS Modifier Modal):** نافذة سريعة تفرض الاختيارات الإلزامية وتتيح التبديل والتعديل بنقرة واحدة، مع الربط التلقائي بأسعار الفاتورة وطباعة الإيصالات وشاشة المطبخ (KDS).

---

## 75. محرك تصفية المستحقات ومكافأة نهاية الخدمة والعهد (HR End of Service Settlement & Gratuity Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Jisr / ZenHR / SAP B1 End of Service Indemnity & Clearance Engine.
* **روابط وشاشات الوصول:** `/hr/settlements` (القائمة الجانبية: الإدارة والنظام ➔ مخالصات ونهاية الخدمة).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000066_hr_end_of_service_settlements.ts`, `backend/src/database/database.types.ts` (`hr_end_of_service_settlements`).
  * **الباك إند:** `backend/src/modules/hr/services/end-of-service.service.ts`, `backend/src/modules/hr/controllers/end-of-service.controller.ts`, `backend/src/modules/hr/hr.module.ts`.
  * **الفرونت إند:** `frontend/src/features/hr/api/end-of-service.api.ts`, `frontend/src/features/hr/pages/HrEndOfServicePage.tsx`, `frontend/src/features/hr/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حاسبة مكافأة نهاية الخدمة وفق أنظمة العمل (Saudi & Egyptian Labor Law Gratuity):** احتساب آلي للمكافأة طبقاً للمادتين 84 و 85 من نظام العمل السعودي (التفريق بين إنهاء العقد والاستقالة وسنوات الخدمة: أقل من سنتين، 2-5 سنوات، 5-10 سنوات، 10+ سنوات) وقانون العمل المصري المادة 125، أو السياسات المخصصة.
  2. **تصفية شاملة للمستحقات والاستقطاعات:** احتساب بدل رصيد الإجازات السنوية المتبقية، وأيام الشهر الحالي، والخصم الآلي لكافة السلف والقروض غير المسددة من صافي المستحق.
  3. **كشف العهد والأجهزة المسلمة وإقرار إخلاء الطرف:** استعراض مباشر لكافة الأجهزة والعهد العينية المسلمة للموظف (لابتوب، سيارات، عهد مالية) مع التحقق من استرجاعها وإثبات إخلاء الطرف.
  4. **الترحيل المحاسبي بنقرة واحدة (1-Click Journal Entry):** توليد قيد اليومية المالي آلياً لمديونية مصروف/مخصص نهاية الخدمة وتسوية سلف الموظفين وصرف الصافي من الخزينة أو البنك مع ربط رقم القيد بالمخالصة لمنع الازدواجية.
  5. **نموذج مخالصة وإخلاء طرف رسمي قابل للطباعة (Official Clearance Document):** شهادة مخالصة نهائية متكاملة بصيغة قانونية تحتوي على إقرار الموظف باستلام مستحقاته وإبراء ذمة المنشأة مع مساحات لتواقيع الموظف وإدارة الموارد البشرية والإدارة المالية.

---

## 76. معمارية تقسيم الملفات والوحدات وتحسين سرعة وصيانة النظام (Modularization & High-Performance Architecture)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري والأداء المؤسسي (Clean Modular Architecture & Performance).
* **معيار المقارنة الدولي:** Clean Architecture & Domain-Driven Component Slicing.
* **مسارات الكود والوحدات المقسمة:**
  1. **إدارة الصيانة (Maintenance Module):**
     - تم تقليص `MaintenanceTicketsPage.tsx` من 1,961 سطر إلى 696 سطر (تخفيض بنسبة 65%).
     - استخراج الأيقونات والتكوينات إلى `frontend/src/features/maintenance/components/MaintenanceConstants.tsx`.
     - استخراج نافذة الاستلام والإيصال إلى `frontend/src/features/maintenance/components/MaintenanceCreateTicketModal.tsx`.
     - استخراج تفاصيل الصيانة وصرف القطع وعمولة الفني إلى `frontend/src/features/maintenance/components/MaintenanceDetailModal.tsx`.
     - استخراج تسوية الحساب والتسليم إلى `frontend/src/features/maintenance/components/MaintenanceSettlementModal.tsx`.
  2. **إدارة أوامر البيع (Sales Orders Module):**
     - تم استخراج منتقي المنتجات والباركود (Combobox Portal) المعقد من `SalesOrdersPage.tsx` إلى المكون المستقل `frontend/src/features/sales/components/OrderItemProductPicker.tsx` (تخفيض 287 سطر).
  3. **إدارة المنصة والسوبر أدمن (SaaS Admin Module):**
     - تم تقليص `SaasTenantsPage.tsx` من 1,704 سطر إلى 1,274 سطر باستخراج نافذة توليد النسخ التجريبية وإدارة بيانات الدخول إلى `frontend/src/features/saas-admin/components/CreateTrialTenantModal.tsx`.
     - توحيد وتنسيق صفحة باقات الساس `SaasPlansPage.tsx` بنسبة 100% وفق دستور النظام البصري ومطابقتها لنموذج الأقساط `installments` (عمود العرض `document-prototype-column`، هيدر `PageHeader` بشارة SaaS Admin، بطاقات الإحصائيات `StatsGrid`، شريط بحث فوري، وقسم البطاقة `document-prototype-section`).
  4. **كاش الباك إند فائق السرعة (Backend In-Memory Cache Engine):**
     - تفعيل كاش ذاكرة فائق السرعة لبيانات الإعدادات والفروع والمواقع في `backend/src/modules/settings/settings.service.ts` مع إبطال فوري وتلقائي عند الحفظ أو التعديل لتسريع الاستجابة.
  5. **تقسيم كود الإعدادات (Lazy Code-Splitting):**
     - تحويل الأقسام الثانوية في `SettingsSectionContent.tsx` إلى `React.lazy` و `Suspense` لتسريع تحميل واجهة الإعدادات وتقليل حجم حزمة الجافاسكريبت المبدئية.
  6. **تنظيف وتحسين ملفات التنسيق (CSS Optimization):**
     - إزالة 1,115 سطر من الأكواد المكررة في `frontend/src/styles/partials/document-form-prototype.css` وتوحيد أنماط الدارك مود.
  7. **إدارة الشيكات والأوراق المالية (PDC Cheques Module):**
     - تم تقليص `PdcChequesPage.tsx` من 1,643 سطر إلى 969 سطر (تخفيض أكثر من 670 سطر).
     - استخراج نافذة تسجيل ورقة قبض / دفع جديدة بكامل منطق الفاليديشن والعملات والتواريخ إلى `frontend/src/features/accounting/components/PdcChequeCreateModal.tsx`.
     - استخراج نافذة دورة حياة الشيك (إيداع بنكي، تحصيل، صرف، ارتداد مع الغرامات، تظهير لمورد) إلى `frontend/src/features/accounting/components/PdcChequeActionModal.tsx`.
     - استخراج معاينة وطباعة السند المالي الرسمي للشيك إلى `frontend/src/features/accounting/components/PdcChequeVoucherModal.tsx`.
  8. **كاش خطط وباقات الساس وميزات النظام (SaaS & Feature Plans In-Memory Cache):**
     - إضافة كاش ذاكرة ذكي في `backend/src/modules/saas-admin/saas-admin.service.ts` لطلبات استعلام الباقات ومصفوفة الميزات (5 دقائق TTL) مع إبطال فوري عند الإنشاء أو التعديل لتسريع الاستجابة وتخفيف الحمل على قاعدة البيانات.
  9. **تحسين أداء الرسوم ومسارات الـ CSS (CSS Composition & Zero Perpetual Loops):**
     - إزالة الأنيميشن المستمر `reportFloat` اللانهائي في `frontend/src/styles/partials/features.css` لمنع استهلاك المعالج والـ GPU المستمر، والتأكد من صفر لاج في الرسوم البيانية التفاعلية.
  10. **تفكيك وتدقيق صفحات النظام الكبرى (Enterprise Page Modularization - Categories 1 & 2):**
      - تم بنجاح تفكيك وتقليص كافة صفحات الفئة الأولى (> 600 سطر) والفئة الثانية (500 إلى 600 سطر) لتصبح جميعها رشيقة وتحت سقف 400 سطر (معظمها بين 150 و 260 سطر) بنسبة إنجاز 100% وبصفر أخطاء TypeScript:
      - **قوائم الأسعار (`PriceListsPage.tsx`):** من 625 إلى 260 سطر باستخراج `PriceListModal.tsx` و `PriceListCard.tsx`.
      - **حضور وانصراف الموظفين (`HrAttendancePage.tsx`):** من 624 إلى 341 سطر باستخراج `AttendanceKpiSummary.tsx`, `DailyAttendanceTable.tsx`, `AttendanceExceptionsTable.tsx`, `ManualAttendanceModal.tsx`.
      - **تصنيفات المنتجات (`ProductCategoriesPage.tsx`):** من 613 إلى 337 سطر باستخراج `CategoriesDataTable.tsx`, `CategoryFormModal.tsx`, `CategoryTransferProductsModal.tsx`, `CategoryTransferWarehouseModal.tsx`.
      - **الأصول الثابتة والإهلاك (`AccountingFixedAssetsPage.tsx`):** من 598 إلى 265 سطر باستخراج `AddFixedAssetModal.tsx`, `DepreciateModals.tsx`, `FixedAssetsTable.tsx`, `FixedAssetsLogsTable.tsx`.
      - **تخصيص وسداد الفواتير (`PaymentAllocationPage.tsx`):** من 592 إلى 257 سطر باستخراج `PartnerSelectorBar.tsx`, `UnallocatedPaymentsCard.tsx`, `OpenInvoicesCard.tsx`.
      - **إقرار ضريبة القيمة المضافة (`VatDeclarationPage.tsx`):** من 576 إلى 194 سطر باستخراج `VatPeriodSelector.tsx`, `VatSalesTable.tsx`, `VatPurchasesTable.tsx`, `VatSummaryBox.tsx`.
      - **شاشة العميل (`CustomerFacingDisplayPage.tsx`):** من 564 إلى 203 سطر باستخراج `CfdHeader.tsx`, `CfdIdleView.tsx`, `CfdScanningView.tsx`, `CfdCompletedView.tsx`.
      - **نواقص الصيدلية (`PharmacyShortagesPage.tsx`):** من 549 إلى 198 سطر باستخراج `ShortagesKpiGrid.tsx`, `ShortageQuickAddBar.tsx`, `ShortageFilterBar.tsx`, `ShortagesTable.tsx`, `ShortageDetailModal.tsx`.
      - **تعديل بيانات الموظف (`EmployeeEditPage.tsx`):** من 541 إلى 217 سطر باستخراج أقسام البيانات الأساسية، التعويضات والرواتب، بيانات الوظيفة، سياسة الحضور، والبيانات البنكية.
      - **إنشاء وتعديل تركيبة المنتج BOM (`NewBomPage.tsx` & `EditBomPage.tsx`):** من 536 و 526 سطر إلى 253 و 249 سطر عبر استخراج مكونات مشتركة `BomLinesTable.tsx`, `BomCostSummaryCard.tsx`, `bom-types.ts`.
      - **تقارير الموارد البشرية (`HrReportsPage.tsx`):** من 532 إلى 173 سطر باستخراج `HrReportsKpiBar.tsx`, `HrReportsFiltersToolbar.tsx`, `HrReportsOverviewGrid.tsx`, `HrReportsDetailSections.tsx`.
      - **مجموعات خيارات وإضافات المنتجات (`ProductModifiersPage.tsx`):** من 512 إلى 216 سطر باستخراج `ModifierGroupCard.tsx` و `ModifierGroupModal.tsx`.
      - **الروشتات والتأمين الصحي (`PharmacyPrescriptionsPage.tsx`):** من 510 إلى 151 سطر باستخراج `PrescriptionsKpiGrid.tsx`, `PrescriptionsFilterBar.tsx`, `PrescriptionsTable.tsx`, `PrescriptionModal.tsx`.
  11. **القضاء التام على وميض الإطار الأسود العابر عند تحميل الصفحات وتوحيد صفحة قوائم الأسعار (Global Focus Stroke Suppression & PriceLists Page Standardization):**
      - **حل جذري لمشكلة الستروك الأسود (Zero Transient Focus Ring):** إزالة محددات `:where(...)` ذات الأولوية الصفرية في `app.css` و `base.css` وتطبيق محددات مباشرة فائقة الأولوية مع `!important` تمنع المتصفح من إظهار أي إطار تركيز عابر (`outline: none !important; outline-color: transparent !important;`) على الحاويات والبطاقات (`div`, `section`, `article`, `main`, `.card`, `.document-prototype-section`, إلخ) عند تبديل الصفحات أو انتهاء التحميل غير المتزامن.
      - **إزالة الوسوم المتداخلة `<main>`:** استبدال وسم `<main>` الداخلي بـ `<div>` في `PriceListsPage`, `QuotationsPage`, `InstallmentsPage` لمنع ارتباك المتصفح في توجيه التركيز التلقائي.
      - **توحيد صفحة قوائم الأسعار (`PriceListsPage.tsx`):** ترقية الصفحة لتطابق الدستور البصري الموحد بالكامل عبر إضافة بطاقات الإحصائيات الذكية `StatsGrid` (إجمالي القوائم، القوائم المفعلة، القائمة الافتراضية، إجمالي القواعد)، تغليف المحتوى داخل `.document-prototype-section` القياسي، واستخدام مكون الزر الرسمي `Button` في الحالة الفارغة.
      - الالتزام التام بكافة معايير النظام البصري: اتجاه RTL، أيقونات SVG رسمية حصرياً، نوافذ عبر `StandardDialog` و `DialogShell` (صفر أخطاء clipping أو أوفري عشوائي)، واستبعاد كلاسات تيلويند نهائياً.
  12. **التحصين الوقائي للعمليات التشغيلية واللانشر (Defensive Hardening for User Operations & Launcher):**
      - **إرشاد المستخدم عند حذف الحسابات (`users.service.ts`):** تحويل خطأ قاعدة البيانات العام لتعارض المفتاح الأجنبي عند محاولة حذف مستخدم مسجل بحركات مالية أو مخزنية سابقة إلى رسالة عربية إرشادية واضحة ومباشرة: *"لا يمكن حذف هذا المستخدم لوجود فواتير أو حركات مخزنية مسجلة باسمه. يمكنك تعطيل حسابه بدلاً من الحذف للحفاظ على السجلات المالية"* بكود خطأ `USER_HAS_TRANSACTIONS` (400) بدلاً من استثناء قاعدة البيانات العام.
      - **التحقق المسبق من مسار النسخ الاحتياطي (`settings-backup.service.ts`):** فحص مسار مجلد النسخ الاحتياطي وتطهيره من الرموز الممنوعة (`?`, `*`, `<`, `>`, `|`) ومنع مسارات ويندوز المشوهة مثل `\\?`، وترجمة أي تعذر في الكتابة لخطأ `400` معتمد بدلاً من حدوث خطأ خادم غير معالج 500 في السجلات.
      - **قفل التشغيل المتزامن في اللانشر المحمول (`Start-ZS.ps1`):** إضافة آلية قفل مؤقت (`starting.lock`) لمنع إطلاق عمليات خلفية مكررة واصطدام البورت 3001 (`EADDRINUSE`) عند الضغط المزدوج السريع على اختصار تشغيل النسخة المحمولة.
  13. **تسريع فائق لإقلاع نسخة الإلكترون والنسخة المحمولة (Electron & Portable Startup Optimization):**
      - **تفعيل كاش التجميع V8 المدمج (`NODE_COMPILE_CACHE`):** تفعيل كاش البايت كود المدمج لمحرك Node 22+ في كل من `backend/src/main.ts`، وعملية الإلكترون الرئيسية `frontend/electron/main.cjs`، واللانشر المحمول `Start-ZS.ps1`، مما يخفض وقت تحميل موديولات NestJS والفرونت إند بنسبة تصل إلى 40% عند الإقلاع المتكرر.
      - **فحص جهوزية قاعدة البيانات عبر مآخذ TCP غير المتزامنة (`postgres-manager.cjs`):** استبدال استدعاءات `execSync("psql.exe")` المتكررة التي كانت تحجب مسار الـ Event Loop بفحص مباشر لمقبس TCP (`net.Socket`) كل 100ms، مما يوفر مئات المللي ثوانٍ ويقضي على أي تجميد عابر أثناء شاشة البداية.
      - **المصافحة اللحظية لجاهزية الخادم عبر IPC (`main.cjs`):** التقاط إشارة الجاهزية اللحظية (`ready`) المرسلة من الباك إند عبر قنوات الـ IPC المباشرة وإظهار النافذة الرئيسية دون انتظار دورات الاستطلاع الشبكي، مع التحديد الديناميكي لمنفذ الخادم.
  14. **معالجة وتصحيح التحقق من الصفر وأسعار الأصناف في أوامر الشراء والتحويلات المخزنية (Purchase & Stock Transfers Zero-Price Validation Hardening):**
      - **الصفر الآمن الافتراضي لكافة الأصناف (`useNewPurchaseOrderController.ts`):** تحصين دوال اختيار الأصناف (`handleProductSelect`, `addProductAsLine`, `incrementProductByBarcode`, `handleProductCreateSuccess`) بحيث تسند رقماً صحيحاً `0` في حال كان الصنف مسجلاً بدون سعر تكلفة أو تم إنشاؤه حديثاً، لمنع تواجد قيمة `undefined` في كائن البند.
      - **مرونة دالة التحقق وقبول السعر الصفري (`validateBeforeConfirm`):** تعديل دالة فحص الفاتورة لاعتبار السعر الفارغ أو غير المحدد مساوياً للصفر المقبول (0.00 ج.م) دعماً لحركات النقل والصرف المخزني المجرد من الأسعار، واقتصار الخطأ فقط على القيم السالبة الصريحة (`< 0`) للقضاء تماماً على مشكلة تعليق وحبس المؤشر في خانة السعر عند الحفظ.
      - **تحسين خانة إدخال السعر ومنع تكرار الصفر (`PurchaseOrderItemsTable.tsx`):** إضافة التحديد التلقائي لكامل محتوى الخانة عند التركيز (`onFocus.select`) وتسوية القيمة عند الخروج (`onBlur`) لمنع تحول الصفر إلى `00` عند محاولة المستخدم كتابة صفر إضافي.
  15. **إحكام عزل باقات الاشتراك والباقة الأساسية (Subscription Plans Feature Isolation & Gating):**
      - **ترحيل موديول الخدمات والمصنعيات:** ربطه بباقة النمو (الاحترافية Pro) وتثبيت شارة القفل ونافذة الترقية الموحدة ومنع تفعيله في الباقة الأساسية.
      - **ترحيل تحديد الطاولة والعميل بالسلة (`posShowCartMeta`):** ربطه بالباقة المتكاملة (Ultimate ERP) مع شارة القفل الرسمية.
      - **إحكام مسار ولوحة التحكم الرئيسية (`/` و `DashboardPage.tsx`):** ربط لوحة التحكم ومسار البداية بميزة `reports`، بحيث يتم إخفاء "الرئيسية" تماماً من السايد بار في الباقة الأساسية، وتوجيه المشترك فور تسجيل الدخول أو عند زيارة مسار البداية تلقائياً إلى شاشة نقاط البيع السريعة (`/pos`).
      - **إثراء وتفصيل بطاقات الباقات وجدول المقارنة الكامل (`SubscriptionPlansCards.tsx` & `DetailedPlanFeaturesMatrix.tsx`):** إعادة صياغة بطاقات الباقات الأربع بمحتوى تسويقي مؤسسي مكثف وشامل يعكس القيمة الحقيقية لكل باقة، مع إضافة جدول تفصيلي تفاعلي متكامل يغطي أكثر من 45 ميزة ونظاماً فرعياً مقسمة إلى 9 قطاعات تشغيلية مع إمكانية الطي والفتح السلس لمساعدة العميل على المقارنة والترقية بثقة.
  16. **معالجة ومزامنة موديولات الإعدادات مع الباقات وحظر الشيك بوكس النشط للموديولات المقفلة (Modules Settings Plan Sync & Strict Locked UI Enforcement):**
      - **تصحيح القيم الافتراضية بمخطط ونموذج الإعدادات (`settings.schema.ts` & `SettingsMainForm.tsx`):** ضبط قيم الموديولات المتقدمة الافتراضية (الأصول الثابتة، التقسيط، الإقرار الضريبي، أسطول التوصيل، المتجر الإلكتروني، الموارد البشرية) لتكون `false` كقيمة افتراضية، وقصر `true` كافتراضي على نقاط البيع والمشتريات والمخازن.
      - **ربط حالة الاختيار الصارم لكافة الموديولات العشرين (`ModulesSettingsTab.tsx`):** ربط خاصية `checked={Boolean(isXActive)}` صراحة لكافة مربعات الاختيار مع شرط الترخيص `hasFeature`، بحيث تظهر الموديولات غير المشمولة في باقة العميل بحالة غير مفعلة (`[ ]`) ومقفلة بالكامل (`disabled`) مع إيقاف أي تلوين أخضر نشط.
      - **المزامنة التلقائية لموديولات المنشأة عند تبديل الباقة (`saas-admin.service.ts` & `DeveloperActivationPanel.tsx`):** استدعاء دالة `syncTenantModuleSettingsForPlan` تلقائياً عند تغيير أو ترقية الباقة لتعطيل الموديولات غير المسموح بها في الباقة الجديدة وحفظ الحالة الصحيحة فورياً في جدول الإعدادات بقاعدة البيانات.
  17. **تطوير وتنسيق قسم الاستيراد والحاويات والشراكة وتوحيد النوافذ المنبثقة القياسية (Import & Shipments & Partner Profit Pool Enterprise Polish):**
      - **ترقية نافذة إضافة حاوية شحن (`NewShipmentDialog.tsx`):** ترقيتها إلى `StandardDialog` بعرض `580px` وشبكة حقول متناسقة (2-Column Grid) مع هيدر قياسي وزر إغلاق رسمي وأزرار حفظ وإلغاء مؤسسية مع شارة التحميل.
      - **ترقية نافذة إضافة صنف للحاوية (`AddShipmentItemDialog.tsx`):** ترقيتها إلى `StandardDialog` بعرض `640px` مع محدد الأصناف السحابي `SearchableCombobox` وحقول الكمية وسعر الشراء بالدولار.
      - **تطوير صفحة إدارة الحاويات والشحنات (`ShipmentsManager.tsx`):** إضافة 3 كروت مؤشرات أداء (حاويات في البحر، في الجمارك، مكتملة التكلفة بالمخازن) مع جدول شحنات مؤسسي وشارات حالات شحن ملونة وأزرار تفاصيل مدمجة.
      - **تطوير صفحة محفظة سداد موردي الخارج وتدبير العملة (`SupplierCredit.tsx`):** استبدال كلاسات تيلويند غير المدعومة بنظام كروت مؤسسي ناصع، 3 كروت KPI للمديونيات بالدولار والسيولة المتاحة، نموذج تسجيل حوالة متناسق، وجدول سجل حوالات أجنبية مع حالة فارغة أنيقة.
      - **ترقية نافذة إدارة الشركاء وتوزيع النسب (`ManagePartnersDialog.tsx`):** ترقيتها إلى `StandardDialog` بعرض `min(860px, 95vw)` مع نموذج إضافة شريك بشبكة حقول متجاوبة وربط بالخزائن البنكية، جدول شركاء مؤسسي بحسابات مبالغ ونسب الأرباح، زر إعادة حساب النسب آلياً من رأس المال، كشف حساب الشريك، وحساب الإجمالي مع تنبيهات التحقق من 100%.
      - **ترقية نوافذ حركات رأس المال وكشف الحساب (`PartnerLedgerComponents.tsx`):** ترقية `CapitalTransactionDialog` و `PartnerLedgerDialog` إلى `StandardDialog` مع شارات ملونة للإيداع والسحب وصرف الأرباح، وتوجيه آلي لحركات الخزينة.
      - **ترقية مجمع أرباح الشركاء وتصفية الحسابات (`ProfitPool.tsx`):** تثبيت العرض القياسي 1280px، إضافة 3 كروت إحصائية مؤسسية (إجمالي الإيرادات، إجمالي التكلفة والمصاريف مع التفصيل، صافي الربح المتاح للتوزيع)، جدول توزيع أرباح الشركاء بحسابات حقيقية دقيقة، نافذة منبثقة معيارية لصرف دفعات الأرباح (`PartnerPayoutModal`) مع خيار ملء كامل الرصيد المتبقي بضغطة زر بدلاً من النوافذ البدائية للمتصفح.
      - **توحيد عرض صفحات النظام على 1280px:** تثبيت العرض القياسي الموحد لكافة صفحات النظام والتقارير وشجرة الحسابات والصيدليات والصيانة لمنع أي تباين في أبعاد الكروت.
  18. **ربط محدد الأصناف الذكي في قوائم الأسعار والشرائح (Customer Price Lists Product Selector & ID Binding):**
      - **ترقية حقل اختيار الصنف في نافذة قوائم الأسعار (`PriceListModal.tsx`):** تحويل خانة الصنف من مجرد حقل نصي حر إلى محدد أصناف سحابي ذكي متكامل `SearchableCombobox` مرتبط بقاعدة بيانات المنتجات `useProductsQuery`.
      - **البحث السريع بالاسم والباركود والكود:** دعم البحث المتطابق باللغة العربية `matchesArabic` مع إظهار الباركود وسعر البيع الحالي الافتراضي لكل صنف كمرجع تسعيري فوري.
      - **ربط وحفظ المعرف الحقيقي للصنف (`product_id`):** تمرير `product_id` بدقة إلى كائن `PriceListItem` في قاعدة البيانات لضمان التقاط ومطابقة الصنف آلياً بنسبة 100% في محرك التسعير ونقاط البيع (`calculateEffectivePrice`).
  19. **سجل التدقيق الجنائي غير القابل للتلاعب وسلاسل التجزئة التشفيرية (Tamper-evident Cryptographic Audit Trail):**
* **روابط وشاشات الوصول المشمولة:**
  1. إذن صرف المخزون الجديد (`/inventory/new-issue-order`).
  2. فاتورة / أمر المشتريات الجديدة (`/purchases/new`).
  3. أوامر البيع وحجز المخزون (`/sales/orders`).
  4. أوامر الشراء PO مع الموردين (`/purchases/orders`).
  5. عروض الأسعار للعملاء (`/sales/quotations`).
* **مسارات الكود الأساسية:**
  * **الخطاف العام (Universal Hook):** `frontend/src/shared/hooks/use-form-draft.ts`.
  * **مكون التنبيه المؤسسي (UI Banner):** `frontend/src/shared/components/DraftRestoredBanner.tsx`.
  * **صفحات التنفيذ:** `NewIssueOrderPage.tsx`, `useNewPurchaseOrderController.ts`, `SalesOrdersPage.tsx`, `PurchaseOrdersPage.tsx`, `QuotationsPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حماية المدخلات من الفقدان العرضي:** في حال قام المستخدم بإدخال عدة أصناف أو بيانات في إذن صرف أو فاتورة مشتريات أو أمر بيع، ثم انتقل بالخطأ إلى صفحة أخرى أو نقر على رابط في القائمة الجانبية أو أغلق المتصفح، تظل كافة البيانات المحررة والأصناف محفوظة في المتصفح محلياً دون فقدان أي بند.
  2. **صفر حمل على السيرفر وانعدام البطء (Zero CPU/Server Load):** يتم الحفظ داخل متصفح المستخدم (`localStorage`) عبر محرك تأخير ذكي (Debounce 400ms) مع مقارنة البصمة الحركية (`Snapshot Check`), فلا يتم الحفظ إلا عند حدوث تغيير حقيقي، مع تفريغ فوري (`flushDraft`) قبل مغادرة الصفحة أو عند إغلاق التبويب (`beforeunload`).
  3. **تطهير وتفريغ تلقائي للمسودة:** يتم مسح المسودة تلقائياً وفورياً بمجرد تأكيد وحفظ العملية بنجاح أو عند قيام المستخدم بإلغاء المسودة أو تصفير النموذج لضمان نظافة التخزين وعدم بقاء مخلفات قديمة.
  4. **شريط استرجاع مؤسسي أنيق (DraftRestoredBanner):** إشعار بصري ناعم مطابق للدستور المؤسسي بدون إيموجيز يُنبه المستخدم بأنه تم استرجاع مدخلات المسودة السابقة تلقائياً مع زر مباشر لمسح المسودة والبدء من جديد بنقرة واحدة.

---

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

## 71. طلبات عروض أسعار الموردين ومصفوفة المقارنة والترسية (Vendor RFQs & Comparison Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Purchase RFQ & Vendor Tender Comparison Matrix.
* **روابط وشاشات الوصول:** `/purchases/rfqs` (القائمة الجانبية: المشتريات والموردين ➔ طلبات عروض الأسعار RFQ).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000062_purchase_rfqs.ts`, `backend/src/database/database.types.ts` (`purchase_rfqs`, `purchase_rfq_items`, `purchase_rfq_vendor_bids`).
  * **الباك إند:** `backend/src/modules/purchases/services/purchase-rfqs.service.ts`, `backend/src/modules/purchases/controllers/purchase-rfqs.controller.ts`, `backend/src/modules/purchases/purchases.module.ts`.
  * **الفرونت إند:** `frontend/src/features/purchases/api/purchase-rfqs.api.ts`, `frontend/src/features/purchases/pages/PurchaseRfqsPage.tsx`, `frontend/src/features/purchases/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة دورة طلبات عروض الأسعار المفتوحة (Purchase RFQs):** إنشاء طلبات تسعير بأصناف وكميات محددة مع تحديد موعد استحقاق نهائي لاستقبال العطاءات.
  2. **تسجيل ومقارنة عروض الموردين المتنافسة (Bid Comparison Matrix):** جدول مقارنة بصري تفاعلي يقارن الأسعار المقدمة ومواعيد التسليم المقترحة وشروط الدفع بين مختلف الموردين.
  3. **الترسية وتوليد أمر الشراء بضغطة زر (1-Click Award to PO):** اختيار العرض الفائز وترسيته بنقرة واحدة لتحويله تلقائياً إلى أمر شراء رسمي (PO) في موديول المشتريات وإغلاق المناقصة.

---

## 72. تسوية وتخصيص المدفوعات والقيود العكسية الآلية (Invoice Payment Allocation & Auto-Reversals)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Invoicing Reconciliation / Matching & Reversal Journal Entries.
* **روابط وشاشات الوصول:** `/accounting/payment-allocation` و `/accounting/journal-entries`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000063_payment_allocations_and_reversals.ts`, `backend/src/database/database.types.ts` (`payment_allocations`).
  * **الباك إند:** `backend/src/modules/accounting/services/payment-allocation.service.ts`, `backend/src/modules/accounting/accounting.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/PaymentAllocationPage.tsx`, `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **تسوية وتخصيص الدفعات غير المربوطة بالفواتير:** ربط سندات القبض والدفع المفتوحة بفواتير المبيعات والمشتريات المعلقة للعميل أو المورد مع بيان المبلغ المتبقي لكل فاتورة.
  2. **محرك التسوية الآلي بالوارِد أولاً يُصرَف أولاً (FIFO Auto-Reconciliation):** توزيع تلقائي فوري لأي دفعة على الفواتير المفتوحة الأقدم تاريخياً وتحديث حالة السداد ومبالغ الفواتير بدقة سنت واحد.
  3. **إلغاء وعكس القيود اليومية آلياً (Auto-Reversal Entries):** نافذة رسمية لإلغاء أي قيد مرحل مع تدوين سبب الإلغاء، وتوليد القيد العكسي المعادل فورياً وربطه محاسبياً بالقيد الأصلي لمنع التلاعب وحفظ التدقيق المالي.

---

## 73. أماكن التخزين والأرفف والجرد الفوري بالباركود (Warehouse Bins, Shelves & Mobile Audit)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Storage Locations / Putaway Rules & Barcode Stock Audit.
* **روابط وشاشات الوصول:** `/inventory/bins` (القائمة الجانبية: المخزون والأصناف ➔ أماكن التخزين والأرفف).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000064_warehouse_bin_locations.ts`, `backend/src/database/database.types.ts` (`warehouse_bins`, `product_bin_allocations`).
  * **الباك إند:** `backend/src/modules/inventory/services/warehouse-bins.service.ts`, `backend/src/modules/inventory/controllers/warehouse-bins.controller.ts`, `backend/src/modules/inventory/inventory.module.ts`.
  * **الفرونت إند:** `frontend/src/features/inventory/api/warehouse-bins.api.ts`, `frontend/src/features/inventory/pages/WarehouseBinsPage.tsx`, `frontend/src/features/inventory/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **دليل وهيكل أماكن التخزين الثلاثي (Aisle / Rack / Shelf / Bin):** إدارة الأرفف والمسارات التخزينية داخل كل مستودع وتعيين سعات تخزينية قصوى ونوع التخزين المخصص.
  2. **تخصيص وربط مواقع الأصناف (Product Allocations):** تعيين موقع التخزين الأساسي والثانوي لكل صنف لتسهيل عمليات التجهيز والانتقاء (Picking & Putaway).
  3. **الجرد الفوري بالباركود من الجوال وقارئ الباركود (Instant Barcode Stock Audit):** مسح كود الرف وكود الصنف لتسجيل الرصيد الفعلي ومقارنته بالرصيد الدفتري فورياً مع تبيان الفروقات وحفظ سجل التدقيق.

---

## 74. مصفوفة خيارات ومعدلات الأصناف ونقاط البيع (POS Item Modifiers & Fast Combos Matrix)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Foodics / Odoo POS Product Modifiers & Meal Attributes Matrix.
* **روابط وشاشات الوصول:** `/products/modifiers` وشاشة الكاشير التفاعلية `/pos`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000065_pos_item_modifiers.ts`, `backend/src/database/database.types.ts` (`pos_modifier_groups`, `pos_modifier_options`, `product_pos_modifiers`).
  * **الباك إند:** `backend/src/modules/addons/addons.service.ts`, `backend/src/modules/addons/addons.controller.ts`.
  * **الفرونت إند:** `frontend/src/shared/api/addons.api.ts`, `frontend/src/features/products/pages/ProductModifiersPage.tsx`, `frontend/src/features/pos/components/pos-cart-panel/PosItemModifiersModal.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة مجموعات الخيارات والمعدلات (Modifier Groups):** إنشاء مجموعات منظمة (مثل: الحجم، نوع الخبز، درجة الطهي، الإضافات) مع ضبط قواعد الاختيار (إلزامي / اختياري، اختيار فردي Single-Choice أو متعدد Multiple-Choice مع حد أدنى وأقصى).
  2. **تسعير الخيارات المستقل:** تعيين سعر إضافي وتكلفة لكل خيار معدل مع دعم الخيارات المجانية.
  3. **نافذة كاشير سريعة ومحكومة القواعد (Sub-50ms POS Modifier Modal):** نافذة سريعة تفرض الاختيارات الإلزامية وتتيح التبديل والتعديل بنقرة واحدة، مع الربط التلقائي بأسعار الفاتورة وطباعة الإيصالات وشاشة المطبخ (KDS).

---

## 75. محرك تصفية المستحقات ومكافأة نهاية الخدمة والعهد (HR End of Service Settlement & Gratuity Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Jisr / ZenHR / SAP B1 End of Service Indemnity & Clearance Engine.
* **روابط وشاشات الوصول:** `/hr/settlements` (القائمة الجانبية: الإدارة والنظام ➔ مخالصات ونهاية الخدمة).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000066_hr_end_of_service_settlements.ts`, `backend/src/database/database.types.ts` (`hr_end_of_service_settlements`).
  * **الباك إند:** `backend/src/modules/hr/services/end-of-service.service.ts`, `backend/src/modules/hr/controllers/end-of-service.controller.ts`, `backend/src/modules/hr/hr.module.ts`.
  * **الفرونت إند:** `frontend/src/features/hr/api/end-of-service.api.ts`, `frontend/src/features/hr/pages/HrEndOfServicePage.tsx`, `frontend/src/features/hr/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **حاسبة مكافأة نهاية الخدمة وفق أنظمة العمل (Saudi & Egyptian Labor Law Gratuity):** احتساب آلي للمكافأة طبقاً للمادتين 84 و 85 من نظام العمل السعودي (التفريق بين إنهاء العقد والاستقالة وسنوات الخدمة: أقل من سنتين، 2-5 سنوات، 5-10 سنوات، 10+ سنوات) وقانون العمل المصري المادة 125، أو السياسات المخصصة.
  2. **تصفية شاملة للمستحقات والاستقطاعات:** احتساب بدل رصيد الإجازات السنوية المتبقية، وأيام الشهر الحالي، والخصم الآلي لكافة السلف والقروض غير المسددة من صافي المستحق.
  3. **كشف العهد والأجهزة المسلمة وإقرار إخلاء الطرف:** استعراض مباشر لكافة الأجهزة والعهد العينية المسلمة للموظف (لابتوب، سيارات، عهد مالية) مع التحقق من استرجاعها وإثبات إخلاء الطرف.
  4. **الترحيل المحاسبي بنقرة واحدة (1-Click Journal Entry):** توليد قيد اليومية المالي آلياً لمديونية مصروف/مخصص نهاية الخدمة وتسوية سلف الموظفين وصرف الصافي من الخزينة أو البنك مع ربط رقم القيد بالمخالصة لمنع الازدواجية.
  5. **نموذج مخالصة وإخلاء طرف رسمي قابل للطباعة (Official Clearance Document):** شهادة مخالصة نهائية متكاملة بصيغة قانونية تحتوي على إقرار الموظف باستلام مستحقاته وإبراء ذمة المنشأة مع مساحات لتواقيع الموظف وإدارة الموارد البشرية والإدارة المالية.

---

## 76. معمارية تقسيم الملفات والوحدات وتحسين سرعة وصيانة النظام (Modularization & High-Performance Architecture)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري والأداء المؤسسي (Clean Modular Architecture & Performance).
* **معيار المقارنة الدولي:** Clean Architecture & Domain-Driven Component Slicing.
* **مسارات الكود والوحدات المقسمة:**
  1. **إدارة الصيانة (Maintenance Module):**
     - تم تقليص `MaintenanceTicketsPage.tsx` من 1,961 سطر إلى 696 سطر (تخفيض بنسبة 65%).
     - استخراج الأيقونات والتكوينات إلى `frontend/src/features/maintenance/components/MaintenanceConstants.tsx`.
     - استخراج نافذة الاستلام والإيصال إلى `frontend/src/features/maintenance/components/MaintenanceCreateTicketModal.tsx`.
     - استخراج تفاصيل الصيانة وصرف القطع وعمولة الفني إلى `frontend/src/features/maintenance/components/MaintenanceDetailModal.tsx`.
     - استخراج تسوية الحساب والتسليم إلى `frontend/src/features/maintenance/components/MaintenanceSettlementModal.tsx`.
  2. **إدارة أوامر البيع (Sales Orders Module):**
     - تم استخراج منتقي المنتجات والباركود (Combobox Portal) المعقد من `SalesOrdersPage.tsx` إلى المكون المستقل `frontend/src/features/sales/components/OrderItemProductPicker.tsx` (تخفيض 287 سطر).
  3. **إدارة المنصة والسوبر أدمن (SaaS Admin Module):**
     - تم تقليص `SaasTenantsPage.tsx` من 1,704 سطر إلى 1,274 سطر باستخراج نافذة توليد النسخ التجريبية وإدارة بيانات الدخول إلى `frontend/src/features/saas-admin/components/CreateTrialTenantModal.tsx`.
     - توحيد وتنسيق صفحة باقات الساس `SaasPlansPage.tsx` بنسبة 100% وفق دستور النظام البصري ومطابقتها لنموذج الأقساط `installments` (عمود العرض `document-prototype-column`، هيدر `PageHeader` بشارة SaaS Admin، بطاقات الإحصائيات `StatsGrid`، شريط بحث فوري، وقسم البطاقة `document-prototype-section`).
  4. **كاش الباك إند فائق السرعة (Backend In-Memory Cache Engine):**
     - تفعيل كاش ذاكرة فائق السرعة لبيانات الإعدادات والفروع والمواقع في `backend/src/modules/settings/settings.service.ts` مع إبطال فوري وتلقائي عند الحفظ أو التعديل لتسريع الاستجابة.
  5. **تقسيم كود الإعدادات (Lazy Code-Splitting):**
     - تحويل الأقسام الثانوية في `SettingsSectionContent.tsx` إلى `React.lazy` و `Suspense` لتسريع تحميل واجهة الإعدادات وتقليل حجم حزمة الجافاسكريبت المبدئية.
  6. **تنظيف وتحسين ملفات التنسيق (CSS Optimization):**
     - إزالة 1,115 سطر من الأكواد المكررة في `frontend/src/styles/partials/document-form-prototype.css` وتوحيد أنماط الدارك مود.
  7. **إدارة الشيكات والأوراق المالية (PDC Cheques Module):**
     - تم تقليص `PdcChequesPage.tsx` من 1,643 سطر إلى 969 سطر (تخفيض أكثر من 670 سطر).
     - استخراج نافذة تسجيل ورقة قبض / دفع جديدة بكامل منطق الفاليديشن والعملات والتواريخ إلى `frontend/src/features/accounting/components/PdcChequeCreateModal.tsx`.
     - استخراج نافذة دورة حياة الشيك (إيداع بنكي، تحصيل، صرف، ارتداد مع الغرامات، تظهير لمورد) إلى `frontend/src/features/accounting/components/PdcChequeActionModal.tsx`.
     - استخراج معاينة وطباعة السند المالي الرسمي للشيك إلى `frontend/src/features/accounting/components/PdcChequeVoucherModal.tsx`.
  8. **كاش خطط وباقات الساس وميزات النظام (SaaS & Feature Plans In-Memory Cache):**
     - إضافة كاش ذاكرة ذكي في `backend/src/modules/saas-admin/saas-admin.service.ts` لطلبات استعلام الباقات ومصفوفة الميزات (5 دقائق TTL) مع إبطال فوري عند الإنشاء أو التعديل لتسريع الاستجابة وتخفيف الحمل على قاعدة البيانات.
  9. **تحسين أداء الرسوم ومسارات الـ CSS (CSS Composition & Zero Perpetual Loops):**
     - إزالة الأنيميشن المستمر `reportFloat` اللانهائي في `frontend/src/styles/partials/features.css` لمنع استهلاك المعالج والـ GPU المستمر، والتأكد من صفر لاج في الرسوم البيانية التفاعلية.
  10. **تفكيك وتدقيق صفحات النظام الكبرى (Enterprise Page Modularization - Categories 1 & 2):**
      - تم بنجاح تفكيك وتقليص كافة صفحات الفئة الأولى (> 600 سطر) والفئة الثانية (500 إلى 600 سطر) لتصبح جميعها رشيقة وتحت سقف 400 سطر (معظمها بين 150 و 260 سطر) بنسبة إنجاز 100% وبصفر أخطاء TypeScript:
      - **قوائم الأسعار (`PriceListsPage.tsx`):** من 625 إلى 260 سطر باستخراج `PriceListModal.tsx` و `PriceListCard.tsx`.
      - **حضور وانصراف الموظفين (`HrAttendancePage.tsx`):** من 624 إلى 341 سطر باستخراج `AttendanceKpiSummary.tsx`, `DailyAttendanceTable.tsx`, `AttendanceExceptionsTable.tsx`, `ManualAttendanceModal.tsx`.
      - **تصنيفات المنتجات (`ProductCategoriesPage.tsx`):** من 613 إلى 337 سطر باستخراج `CategoriesDataTable.tsx`, `CategoryFormModal.tsx`, `CategoryTransferProductsModal.tsx`, `CategoryTransferWarehouseModal.tsx`.
      - **الأصول الثابتة والإهلاك (`AccountingFixedAssetsPage.tsx`):** من 598 إلى 265 سطر باستخراج `AddFixedAssetModal.tsx`, `DepreciateModals.tsx`, `FixedAssetsTable.tsx`, `FixedAssetsLogsTable.tsx`.
      - **تخصيص وسداد الفواتير (`PaymentAllocationPage.tsx`):** من 592 إلى 257 سطر باستخراج `PartnerSelectorBar.tsx`, `UnallocatedPaymentsCard.tsx`, `OpenInvoicesCard.tsx`.
      - **إقرار ضريبة القيمة المضافة (`VatDeclarationPage.tsx`):** من 576 إلى 194 سطر باستخراج `VatPeriodSelector.tsx`, `VatSalesTable.tsx`, `VatPurchasesTable.tsx`, `VatSummaryBox.tsx`.
      - **شاشة العميل (`CustomerFacingDisplayPage.tsx`):** من 564 إلى 203 سطر باستخراج `CfdHeader.tsx`, `CfdIdleView.tsx`, `CfdScanningView.tsx`, `CfdCompletedView.tsx`.
      - **نواقص الصيدلية (`PharmacyShortagesPage.tsx`):** من 549 إلى 198 سطر باستخراج `ShortagesKpiGrid.tsx`, `ShortageQuickAddBar.tsx`, `ShortageFilterBar.tsx`, `ShortagesTable.tsx`, `ShortageDetailModal.tsx`.
      - **تعديل بيانات الموظف (`EmployeeEditPage.tsx`):** من 541 إلى 217 سطر باستخراج أقسام البيانات الأساسية، التعويضات والرواتب، بيانات الوظيفة، سياسة الحضور، والبيانات البنكية.
      - **إنشاء وتعديل تركيبة المنتج BOM (`NewBomPage.tsx` & `EditBomPage.tsx`):** من 536 و 526 سطر إلى 253 و 249 سطر عبر استخراج مكونات مشتركة `BomLinesTable.tsx`, `BomCostSummaryCard.tsx`, `bom-types.ts`.
      - **تقارير الموارد البشرية (`HrReportsPage.tsx`):** من 532 إلى 173 سطر باستخراج `HrReportsKpiBar.tsx`, `HrReportsFiltersToolbar.tsx`, `HrReportsOverviewGrid.tsx`, `HrReportsDetailSections.tsx`.
      - **مجموعات خيارات وإضافات المنتجات (`ProductModifiersPage.tsx`):** من 512 إلى 216 سطر باستخراج `ModifierGroupCard.tsx` و `ModifierGroupModal.tsx`.
      - **الروشتات والتأمين الصحي (`PharmacyPrescriptionsPage.tsx`):** من 510 إلى 151 سطر باستخراج `PrescriptionsKpiGrid.tsx`, `PrescriptionsFilterBar.tsx`, `PrescriptionsTable.tsx`, `PrescriptionModal.tsx`.
  11. **القضاء التام على وميض الإطار الأسود العابر عند تحميل الصفحات وتوحيد صفحة قوائم الأسعار (Global Focus Stroke Suppression & PriceLists Page Standardization):**
      - **حل جذري لمشكلة الستروك الأسود (Zero Transient Focus Ring):** إزالة محددات `:where(...)` ذات الأولوية الصفرية في `app.css` و `base.css` وتطبيق محددات مباشرة فائقة الأولوية مع `!important` تمنع المتصفح من إظهار أي إطار تركيز عابر (`outline: none !important; outline-color: transparent !important;`) على الحاويات والبطاقات (`div`, `section`, `article`, `main`, `.card`, `.document-prototype-section`, إلخ) عند تبديل الصفحات أو انتهاء التحميل غير المتزامن.
      - **إزالة الوسوم المتداخلة `<main>`:** استبدال وسم `<main>` الداخلي بـ `<div>` في `PriceListsPage`, `QuotationsPage`, `InstallmentsPage` لمنع ارتباك المتصفح في توجيه التركيز التلقائي.
      - **توحيد صفحة قوائم الأسعار (`PriceListsPage.tsx`):** ترقية الصفحة لتطابق الدستور البصري الموحد بالكامل عبر إضافة بطاقات الإحصائيات الذكية `StatsGrid` (إجمالي القوائم، القوائم المفعلة، القائمة الافتراضية، إجمالي القواعد)، تغليف المحتوى داخل `.document-prototype-section` القياسي، واستخدام مكون الزر الرسمي `Button` في الحالة الفارغة.
      - الالتزام التام بكافة معايير النظام البصري: اتجاه RTL، أيقونات SVG رسمية حصرياً، نوافذ عبر `StandardDialog` و `DialogShell` (صفر أخطاء clipping أو أوفري عشوائي)، واستبعاد كلاسات تيلويند نهائياً.
  12. **التحصين الوقائي للعمليات التشغيلية واللانشر (Defensive Hardening for User Operations & Launcher):**
      - **إرشاد المستخدم عند حذف الحسابات (`users.service.ts`):** تحويل خطأ قاعدة البيانات العام لتعارض المفتاح الأجنبي عند محاولة حذف مستخدم مسجل بحركات مالية أو مخزنية سابقة إلى رسالة عربية إرشادية واضحة ومباشرة: *"لا يمكن حذف هذا المستخدم لوجود فواتير أو حركات مخزنية مسجلة باسمه. يمكنك تعطيل حسابه بدلاً من الحذف للحفاظ على السجلات المالية"* بكود خطأ `USER_HAS_TRANSACTIONS` (400) بدلاً من استثناء قاعدة البيانات العام.
      - **التحقق المسبق من مسار النسخ الاحتياطي (`settings-backup.service.ts`):** فحص مسار مجلد النسخ الاحتياطي وتطهيره من الرموز الممنوعة (`?`, `*`, `<`, `>`, `|`) ومنع مسارات ويندوز المشوهة مثل `\\?`، وترجمة أي تعذر في الكتابة لخطأ `400` معتمد بدلاً من حدوث خطأ خادم غير معالج 500 في السجلات.
      - **قفل التشغيل المتزامن في اللانشر المحمول (`Start-ZS.ps1`):** إضافة آلية قفل مؤقت (`starting.lock`) لمنع إطلاق عمليات خلفية مكررة واصطدام البورت 3001 (`EADDRINUSE`) عند الضغط المزدوج السريع على اختصار تشغيل النسخة المحمولة.
  13. **تسريع فائق لإقلاع نسخة الإلكترون والنسخة المحمولة (Electron & Portable Startup Optimization):**
      - **تفعيل كاش التجميع V8 المدمج (`NODE_COMPILE_CACHE`):** تفعيل كاش البايت كود المدمج لمحرك Node 22+ في كل من `backend/src/main.ts`، وعملية الإلكترون الرئيسية `frontend/electron/main.cjs`، واللانشر المحمول `Start-ZS.ps1`، مما يخفض وقت تحميل موديولات NestJS والفرونت إند بنسبة تصل إلى 40% عند الإقلاع المتكرر.
      - **فحص جهوزية قاعدة البيانات عبر مآخذ TCP غير المتزامنة (`postgres-manager.cjs`):** استبدال استدعاءات `execSync("psql.exe")` المتكررة التي كانت تحجب مسار الـ Event Loop بفحص مباشر لمقبس TCP (`net.Socket`) كل 100ms، مما يوفر مئات المللي ثوانٍ ويقضي على أي تجميد عابر أثناء شاشة البداية.
      - **المصافحة اللحظية لجاهزية الخادم عبر IPC (`main.cjs`):** التقاط إشارة الجاهزية اللحظية (`ready`) المرسلة من الباك إند عبر قنوات الـ IPC المباشرة وإظهار النافذة الرئيسية دون انتظار دورات الاستطلاع الشبكي، مع التحديد الديناميكي لمنفذ الخادم.
  14. **معالجة وتصحيح التحقق من الصفر وأسعار الأصناف في أوامر الشراء والتحويلات المخزنية (Purchase & Stock Transfers Zero-Price Validation Hardening):**
      - **الصفر الآمن الافتراضي لكافة الأصناف (`useNewPurchaseOrderController.ts`):** تحصين دوال اختيار الأصناف (`handleProductSelect`, `addProductAsLine`, `incrementProductByBarcode`, `handleProductCreateSuccess`) بحيث تسند رقماً صحيحاً `0` في حال كان الصنف مسجلاً بدون سعر تكلفة أو تم إنشاؤه حديثاً، لمنع تواجد قيمة `undefined` في كائن البند.
      - **مرونة دالة التحقق وقبول السعر الصفري (`validateBeforeConfirm`):** تعديل دالة فحص الفاتورة لاعتبار السعر الفارغ أو غير المحدد مساوياً للصفر المقبول (0.00 ج.م) دعماً لحركات النقل والصرف المخزني المجرد من الأسعار، واقتصار الخطأ فقط على القيم السالبة الصريحة (`< 0`) للقضاء تماماً على مشكلة تعليق وحبس المؤشر في خانة السعر عند الحفظ.
      - **تحسين خانة إدخال السعر ومنع تكرار الصفر (`PurchaseOrderItemsTable.tsx`):** إضافة التحديد التلقائي لكامل محتوى الخانة عند التركيز (`onFocus.select`) وتسوية القيمة عند الخروج (`onBlur`) لمنع تحول الصفر إلى `00` عند محاولة المستخدم كتابة صفر إضافي.
  15. **إحكام عزل باقات الاشتراك والباقة الأساسية (Subscription Plans Feature Isolation & Gating):**
      - **ترحيل موديول الخدمات والمصنعيات:** ربطه بباقة النمو (الاحترافية Pro) وتثبيت شارة القفل ونافذة الترقية الموحدة ومنع تفعيله في الباقة الأساسية.
      - **ترحيل تحديد الطاولة والعميل بالسلة (`posShowCartMeta`):** ربطه بالباقة المتكاملة (Ultimate ERP) مع شارة القفل الرسمية.
      - **إحكام مسار ولوحة التحكم الرئيسية (`/` و `DashboardPage.tsx`):** ربط لوحة التحكم ومسار البداية بميزة `reports`, بحيث يتم إخفاء "الرئيسية" تماماً من السايد بار في الباقة الأساسية، وتوجيه المشترك فور تسجيل الدخول أو عند زيارة مسار البداية تلقائياً إلى شاشة نقاط البيع السريعة (`/pos`).
      - **إثراء وتفصيل بطاقات الباقات وجدول المقارنة الكامل (`SubscriptionPlansCards.tsx` & `DetailedPlanFeaturesMatrix.tsx`):** إعادة صياغة بطاقات الباقات الأربع بمحتوى تسويقي مؤسسي مكثف وشامل يعكس القيمة الحقيقية لكل باقة، مع إضافة جدول تفصيلي تفاعلي متكامل يغطي أكثر من 45 ميزة ونظاماً فرعياً مقسمة إلى 9 قطاعات تشغيلية مع إمكانية الطي والفتح السلس لمساعدة العميل على المقارنة والترقية بثقة.
  16. **معالجة ومزامنة موديولات الإعدادات مع الباقات وحظر الشيك بوكس النشط للموديولات المقفلة (Modules Settings Plan Sync & Strict Locked UI Enforcement):**
      - **تصحيح القيم الافتراضية بمخطط ونموذج الإعدادات (`settings.schema.ts` & `SettingsMainForm.tsx`):** ضبط قيم الموديولات المتقدمة الافتراضية (الأصول الثابتة، التقسيط، الإقرار الضريبي، أسطول التوصيل، المتجر الإلكتروني، الموارد البشرية) لتكون `false` كقيمة افتراضية، وقصر `true` كافتراضي على نقاط البيع والمشتريات والمخازن.
      - **ربط حالة الاختيار الصارم لكافة الموديولات العشرين (`ModulesSettingsTab.tsx`):** ربط خاصية `checked={Boolean(isXActive)}` صراحة لكافة مربعات الاختيار مع شرط الترخيص `hasFeature`, بحيث تظهر الموديولات غير المشمولة في باقة العميل بحالة غير مفعلة (`[ ]`) ومقفلة بالكامل (`disabled`) مع إيقاف أي تلوين أخضر نشط.
      - **المزامنة التلقائية لموديولات المنشأة عند تبديل الباقة (`saas-admin.service.ts` & `DeveloperActivationPanel.tsx`):** استدعاء دالة `syncTenantModuleSettingsForPlan` تلقائياً عند تغيير أو ترقية الباقة لتعطيل الموديولات غير المسموح بها في الباقة الجديدة وحفظ الحالة الصحيحة فورياً في جدول الإعدادات بقاعدة البيانات.
  17. **تطوير وتنسيق قسم الاستيراد والحاويات والشراكة وتوحيد النوافذ المنبثقة القياسية (Import & Shipments & Partner Profit Pool Enterprise Polish):**
      - **ترقية نافذة إضافة حاوية شحن (`NewShipmentDialog.tsx`):** ترقيتها إلى `StandardDialog` بعرض `580px` وشبكة حقول متناسقة (2-Column Grid) مع هيدر قياسي وزر إغلاق رسمي وأزرار حفظ وإلغاء مؤسسية مع شارة التحميل.
      - **ترقية نافذة إضافة صنف للحاوية (`AddShipmentItemDialog.tsx`):** ترقيتها إلى `StandardDialog` بعرض `640px` مع محدد الأصناف السحابي `SearchableCombobox` وحقول الكمية وسعر الشراء بالدولار.
      - **تطوير صفحة إدارة الحاويات والشحنات (`ShipmentsManager.tsx`):** إضافة 3 كروت مؤشرات أداء (حاويات في البحر، في الجمارك، مكتملة التكلفة بالمخازن) مع جدول شحنات مؤسسي وشارات حالات شحن ملونة وأزرار تفاصيل مدمجة.
      - **تطوير صفحة محفظة سداد موردي الخارج وتدبير العملة (`SupplierCredit.tsx`):** استبدال كلاسات تيلويند غير المدعومة بنظام كروت مؤسسي ناصع، 3 كروت KPI للمديونيات بالدولار والسيولة المتاحة، نموذج تسجيل حوالة متناسق، وجدول سجل حوالات أجنبية مع حالة فارغة أنيقة.
      - **ترقية نافذة إدارة الشركاء وتوزيع النسب (`ManagePartnersDialog.tsx`):** ترقيتها إلى `StandardDialog` بعرض `min(860px, 95vw)` مع نموذج إضافة شريك بشبكة حقول متجاوبة وربط بالخزائن البنكية، جدول شركاء مؤسسي بحسابات مبالغ ونسب الأرباح، زر إعادة حساب النسب آلياً من رأس المال، كشف حساب الشريك، وحساب الإجمالي مع تنبيهات التحقق من 100%.
      - **ترقية نوافذ حركات رأس المال وكشف الحساب (`PartnerLedgerComponents.tsx`):** ترقية `CapitalTransactionDialog` و `PartnerLedgerDialog` إلى `StandardDialog` مع شارات ملونة للإيداع والسحب وصرف الأرباح، وتوجيه آلي لحركات الخزينة.
      - **ترقية مجمع أرباح الشركاء وتصفية الحسابات (`ProfitPool.tsx`):** تثبيت العرض القياسي 1280px، إضافة 3 كروت إحصائية مؤسسية (إجمالي الإيرادات، إجمالي التكلفة والمصاريف مع التفصيل، صافي الربح المتاح للتوزيع)، جدول توزيع أرباح الشركاء بحسابات حقيقية دقيقة، نافذة منبثقة معيارية لصرف دفعات الأرباح (`PartnerPayoutModal`) مع خيار ملء كامل الرصيد المتبقي بضغطة زر بدلاً من النوافذ البدائية للمتصفح.
      - **توحيد عرض صفحات النظام على 1280px:** تثبيت العرض القياسي الموحد لكافة صفحات النظام والتقارير وشجرة الحسابات والصيدليات والصيانة لمنع أي تباين في أبعاد الكروت.
  18. **ربط محدد الأصناف الذكي في قوائم الأسعار والشرائح (Customer Price Lists Product Selector & ID Binding):**
      - **ترقية حقل اختيار الصنف في نافذة قوائم الأسعار (`PriceListModal.tsx`):** تحويل خانة الصنف من مجرد حقل نصي حر إلى محدد أصناف سحابي ذكي متكامل `SearchableCombobox` مرتبط بقاعدة بيانات المنتجات `useProductsQuery`.
      - **البحث السريع بالاسم والباركود والكود:** دعم البحث المتطابق باللغة العربية `matchesArabic` مع إظهار الباركود وسعر البيع الحالي الافتراضي لكل صنف كمرجع تسعيري فوري.
      - **ربط وحفظ المعرف الحقيقي للصنف (`product_id`):** تمرير `product_id` بدقة إلى كائن `PriceListItem` في قاعدة البيانات لضمان التقاط ومطابقة الصنف آلياً بنسبة 100% في محرك التسعير ونقاط البيع (`calculateEffectivePrice`).
  19. **سجل التدقيق الجنائي غير القابل للتلاعب وسلاسل التجزئة التشفيرية (Tamper-evident Cryptographic Audit Trail):**
      - **الرصد على مستوى محرك قاعدة البيانات (PostgreSQL Triggers):** قوادح آلية `AFTER INSERT OR UPDATE OR DELETE` على 11 جدولاً حرجاً في النظام (`journal_entries`, `journal_entry_lines`, `accounting_accounts`, `accounting_settings`, `sales`, `sale_items`, `purchases`, `purchase_items`, `treasuries`, `treasury_transactions`) لتوثيق أي عملية تتم من التطبيق أو من داخل السيرفر و `psql` مباشرة.
      - **الحماية القصوى وجدول القيد الإضافي الحصري (Append-Only Immutable Table):** قادح حماية `fn_tamper_audit_prevent_tamper` يمنع رفضاً قاطعاً أي أمر `UPDATE` أو `DELETE` على جدول `tamper_audit_logs`.
      - **سلاسل التجزئة التشفيرية المتسلسلة (SHA-256 Hash Chaining):** حساب بصمة رقمية لكل حركة مشتقة من الهاش السابق `sha256(prev_hash || tenant_id || table_name || record_id || op || diff || new)` لمحاكاة كتل البلوكشين (Merkle Chain)، مع خوارزمية فحص النزاهة `verifyChainIntegrity` لكشف أي تلاعب أو انقطاع في السلسلة.
      - **شاشة تدقيق وتحليل جنائي متكاملة:** تبويب مخصص في شاشة `/audit` مع بطاقة فحص النزاهة التشفيرية اللحظية، فلاتر الجداول والعمليات، نافذة منبثقة معيارية `TamperAuditDiffModal` لاستعراض الفوارق الحقلية (Field-Level Diff) بلونين للأحمر والأخضر ونسخ أكواد الهاش الرقمية.
  20. **حزمة التفوق المؤسسي وسلاسل الإمداد والمحاسبة المتقدمة (Enterprise Accounting & Procurement Powerhouse - Odoo & Dynamics BC Parity):**
      - **محرك سير عمل الموافقات متعدد المستويات (Multi-Tier Approval Workflow Engine):**
        - نظام حوكمة واعتمادات هرمي متدرج عبر المسار `/approvals` وجداول `approval_rules`, `approval_requests`, `approval_request_logs`.
        - دعم أنواع مستندات متعددة (`purchase_order`, `sale_discount`, `journal_entry`, `expense_payout`, `employee_advance`) مع شروط مالية تعتمد على تجاوز سقف المبالغ `min_amount`.
        - تصعيد آلي متعدد المستويات (Multi-tier Escalation) بين الرتب الإدارية (`supervisor`, `branch_manager`, `finance_manager`, `admin`) مع إشعار واتساب تلقائي عبر `WhatsappGatewayService` للمدير المعني.
        - نافذة مراجعة واعتماد ورفض تفاعلية وفق معيار `StandardDialog` مع تبرير إلزامي عند الرفض وتنفيذ الخطافات البرمجية لتفعيل المستند الأصلي عند الاعتماد النهائي.
      - **الجدولة المؤتمتة لقيود إهلاك الأصول الثابتة (Automated Depreciation Scheduler):**
        - محرك جدولة خلفي دوري `FixedAssetsSchedulerService` يفحص نهاية كل شهر ميلادي لكافة المنشآت والشركات المفعلة تلقائياً.
        - احتساب أقساط الإهلاك بدقة بنظامي القسط الثابت والمتناقص المزدوج وتوليد قيود اليومية المتوازنة وحفظ سجل العمليات.
        - كارت تحكم إداري مباشر في شاشة `/accounting/fixed-assets` يتيح تفعيل/تعطيل الجدولة الآلية، ومعاينة تاريخ التشغيل القادم وآخر شهر تم تشغيله، وزر للتشغيل الفوري بنقرة واحدة.
      - **مصفوفة وقوالب توزيع مراكز التكلفة بالنسب المئوية (Hierarchical Cost Center Allocation Matrix):**
        - محرك توزيع محاسبي تحليلي مالي عبر جداول `cost_center_allocations` و `cost_center_allocation_splits`.
        - تبويب مخصص في شاشة مراكز التكلفة `/accounting/cost-centers` بتصميم مؤسسي ناصع (1280px) لإدارة القوالب وقواعد التوزيع.
        - شريط توزيع لوني مرئي تفاعلي، محاكي مالي فوري لاحتساب المبالغ الموزعة لحظياً مع تحقق صارم من اكتمال النسبة 100%.
      - **محرك تقييم العملات الأجنبية وأرباح وخسائر فروق الصرف IAS 21 (Multi-Currency FX Revaluation Engine):**
        - تطبيق معيار المحاسبة الدولي IAS 21 لإعادة تقييم الأرصدة والحسابات المقومة بالنقد الأجنبي عبر المسار `/accounting/forex`.
        - مسح وتجميع فوري لكافة أرصدة الحسابات النقدية والبنكية وحسابات العملاء والموردين، وحساب فروق أسعار الصرف غير المحققة (Unrealized FX Gain/Loss).
        - توليد قيد تسوية محاسبي آلي متزن في الأستاذ العام وترحيله بنقرة واحدة مع توثيق دورات التقييم في `forex_revaluation_runs` وسطور التقييم في `forex_revaluation_lines`.
      - **تكامل وتدقيق دورة عروض أسعار الموردين وسلسلة الإمداد (Vendor RFQs & Comparison Matrix):**
        - دورة مشتريات وتوريد متكاملة تضاهي Odoo 17 و Dynamics 365 BC عبر المسار `/purchases/rfqs` وربط مباشر عبر زر هيدر المشتريات `PurchasesWorkspace.tsx`.
        - دورة كاملة: إنشاء طلب تسعير ➔ دعوة الموردين ➔ تسجيل العروض والمدد والشروط ➔ مصفوفة مقارنة بصرية تحليلية تبرز العرض الأفضل سعراً والأسرع توريداً ➔ ترسية العرض الفائز وتحويله لأمر شراء رسمي معتمد (PO).
  21. **تأسيس منشأة المنصة المركزية المستقلة `zs` وعزل صلاحيات السوبر أدمن الصارم (Dedicated Platform Root Tenant & Super Admin Isolation):**
      - **منشأة المنصة المركزية المستقلة (`zs`):** تأسيس منشأة المنصة المستقلة بالمعرف الرسمي `zs` في جدول `tenants` بحالة نشطة دائمة، ونقل وتعيين حساب المطور ومسؤول المنصة `zs` بداخلها برتبة `super_admin` عبر المايجريشن رقم 74 (`2040000000074_establish_zs_platform_tenant_and_superadmin_isolation.ts`).
      - **حصرية إنشاء رتبة `super_admin` داخل منشأة `zs` فقط:** تمكين إنشاء وتعيين مستخدمين برتبة `super_admin` حصراً داخل منشأة المنصة المركزية `zs` عبر الواجهة (`UserManagementEditorCard.tsx`) والباك إند (`users.service.ts`).
      - **عزل المتاجر والشركات المستضافة (Multi-Tenant Demotion):** حظر وتخفيض رتبة `super_admin` تلقائياً إلى `admin` في أي منشأة أو متجر آخر خارج منشأة المنصة المركزية حتى لو حمل المستخدم اسم `zs`، مع إخفاء مسارات وقوائم الساس بالكامل عن أي مستخدم خارج منشأة المنصة.
      - **تنظيف شامل للاستثناءات الفردية:** إزالة كافة الشروط القديمة التي كانت تعتمد على فحص اسم المستخدم `username === 'zs'` واستبدالها بنظام عزل نظيف وموحد يعتمد على دالة التحقق الرسمية المزدوجة `isPlatformAdmin(user)`.
  22. **اكتمال محرك هيئة الزكاة والضريبة (ZATCA Phase 2) وجسر التوقيع المصري (ETA USB Token) والطباعة الحرارية المباشرة (ESC/POS Hardware):**
      - **محرك هيئة الزكاة والضريبة والربط التشفيري الذري (ZATCA Phase 2 & EGS Units):**
        - إنشاء جدول `zatca_egs_units` (المايجريشن 75) لتسجيل وتتبع وحدات الفوترة الإلكترونية مع توليد مفاتيح التشفير ECDSA secp256k1 وتوليد شهادات CSR المطابقة لمعايير الهيئة.
        - ربط السلسلة التشفيرية الحية للفواتير عبر الهاش السابق (PIH) والعداد المتسلسل (ICV) وحفظ حقول ZATCA الرسمية في جدول `sales` (`zatca_uuid`, `zatca_hash`, `zatca_prev_hash`, `zatca_icv`, `zatca_status`, `zatca_qr`, `zatca_ubl_xml`).
        - معالج تسجيل وربط تفاعلي متكامل بالـ OTP عبر منصة فاتورة `ZatcaOnboardingWizardModal.tsx` وخدمة `ZatcaOnboardingService` لإصدار شهادة الامتثال (Compliance CSID) وتفعيل شهادة الإنتاج (Production CSID).
      - **جسر توقيع الفاتورة المصرية بالتوكن المحلي (ETA USB Token CAdES-BES Signer Bridge):**
        - خدمة `EtaSignatureBridgeService` لتوليد الـ Canonical JSON المعياري للوثيقة وحساب الـ SHA-256 Hash.
        - نافذة `EtaTokenSignerModal.tsx` تدعم الفحص التلقائي لجسر التوقيع المحلي على المنفذ 8585 مع عرض مؤشر الاتصال الأخضر وبيانات الشهادة، وإمكانية التوقيع والختم بضغطة زر واحدة (1-Click Auto Sign).
        - أداة سطح المكتب المستقلة `tools/zs-eta-signer/` بحجم خفيف (~16KB كملف تنفيذي `zs-eta-signer.exe` مبني بـ C# .NET المدمج بدون أي متطلبات تثبيت، بالإضافة لنسخة Node.js) تعمل كـ Microservice على `http://127.0.0.1:8585` مع مسارات `/health`, `/certificates`, `/sign` وتدعم بطاقات وشهادات Egypt Trust ومصر للمقاصة.
      - **الطباعة الحرارية المباشرة وفتح درج النقدية الصامت (ESC/POS Direct Hardware Bridge):**
        - محرك `escpos-printer.ts` الذي يدعم بروتوكولات WebUSB و WebSerial لإرسال أوامر ESC/POS المباشرة إلى طابعات الإيصالات الحرارية وفتح درج النقدية التلقائي بدون الاعتماد على نافذة حوار المتصفح التقليدية.
  23. **تطهير وحذف المنشآت القديمة المكررة وقصر شارة المنصة المركزية حصراً على `zs` (Legacy Platform Tenants Cleanup & Strict SaaS Isolation):**
      - **حذف وتطهير المنشآت القديمة المكررة (Migration 78):** مايجريشن قاعدة البيانات رقم 78 (`2040000000078_purge_legacy_duplicate_platform_tenants.ts`) لحذف المنشآت القديمة المكررة من فترات التطوير السابقة (`default`, `zsystems`, `zsystems-main`, `karimzakaria-demo`) وكافة سجلاتها التابعة بأمان عبر خوارزمية مسح دورية متعددة المراحل (Multi-pass cascade sweep) مع الحفاظ الصارم بنسبة 100% على المنشأة المركزية الرسمية `zs` ومنشآت العملاء الحقيقيين (`elmohandis`).
  24. **تسريع وتحسين أداء المنظومة لنسختي الساس والديسكتوب (High-Performance Optimization & Zero-Lag Architecture):**
      - **تفكيك حزمة البدء والتحميل الكسول للنوافذ (`root-router.tsx`):** تحويل استيراد صفحات التفعيل ونوافذ الدفع السريع والسلف والعروض إلى استيراد ديناميكي كسول (`React.lazy` و `Suspense`) مما عزل وحدات الحسابات والـ HR والمنتجات عن حزمة الإقلاع الأساسية وخفّض زمن التحميل الأولي.
      - **ترقية نظام التحميل المسبق الذكي التدرجي (`lazy-route.tsx`):** إعادة بناء دالة `prefetchAllRouteModules` لتعمل بجدولة تدريجية ناعمة (Staggered Queue) خلال فترات خمول المتصفح (`requestIdleCallback`) وتأخير بدئها حتى انتهاء استعلامات الإقلاع الرئيسية، لمنع تشبع قنوات الشبكة (Network Congestion) وضمان سرعة فائقة لاستجابة الـ API.
      - **الحفاظ على كاش V8 وتسريع إقلاع الديسكتوب (`frontend/electron/main.cjs`):** حظر المسح الإجباري لكاش كروميوم `clearCache()` عند كل إقلاع وحصره فقط بحالات الترقية الصريحة، مما حافظ على كاش الأكواد البرمجية (V8 Bytecode Cache) وأسرع إقلاع تطبيق الديسكتوب بنسبة 40%.
      - **تجزئة كتل المكتبات الخارجية الضخمة (`vite.config.ts`):** إضافة قواعد تقسيم يدوي للمكتبات الثقيلة (Sentry, i18next, html5-qrcode, image-compression) لتحميلها المتوازي وتخزينها المستقل في كاش المتصفح.
      - **التحميل اللانهائي الذكي لكروت أصناف الكاشير (`PosProductsPanel.tsx`):** تفعيل التحميل التراكمي الناعم لبطاقات الأصناف بالـ `IntersectionObserver` بدفعات متتالية (60 صنفاً لكل دفعة) عند التمرير، لمنع تضخم الـ DOM وتفادي أي تهنيج أو ثقل في واجهة الكاشير عند وجود آلاف المنتجات.
      - **الفحص الاستباقي لصلاحية شهادة الفاتورة المصرية بالـ USB Token (`EtaTokenSignerModal.tsx`):** قراءة تاريخ صلاحية الشهادة وتنبيه المستخدم مسبقاً قبل الانتهاء بـ 45 يوماً مع منع التوقيع بشهادة منتهية وتوضيح السبب بكارت تحذيري أحمر رسمي لتجنب أخطاء نظام التشغيل وبوابة الضرائب.
      - **سياسة تدوير وتطهير سجلات اللوج لـ 90 يوماً في الديسكتوب (`frontend/electron/main.cjs`, `postgres-manager.cjs`):** تطبيق آلية أرشفة وتدوير ذكية تضمن الاحتفاظ بملفات السجلات والنسخ الاحتياطية لـ 90 يوماً على الأقل (3 أشهر) أو فور التأكد من رفعها ومزامنتها بنجاح مع السيرفر، مع منع تضخم ملفات اللوج الفعالة وحمايتها من التلف.
      - **إعادة تصميم شاشة الإقلاع والتهيئة لنسخة الديسكتوب بالهوية المؤسسية الفاخرة (`loading.html`, `main.cjs`):** إلغاء الخلفيات القاتمة والشبكات ومؤثرات التوهج الدائرية المستعارة من قوالب الذكاء الاصطناعي، واستبدالها بتصميم مؤسسي ناصع وراقٍ مستوحى 100% من لوحة تحكم المنظومة، بكانفاس هادئ (`#f8fafc`)، وبطاقة بيضاء نقية بحدود وظلال مؤسسية ناعمة، وشعار Z-Systems الكحلي الملكي المعتمد (`#170e5e`), وشريط تقدم أنيق بدون ألوان متنافرة، وبادج إصدار رسمي يقضي تماماً على أي وميض مظلم أثناء الإقلاع.
  25. **حماية وترميم منشأة وبيانات المتاجر في نسخة الديسكتوب واستقلاليتها الصارمة عن الساس (Desktop Store Tenant Protection & Zero Data Loss Architecture):**
      - **صمامات أمان المايجريشن 74 و 78:** تحصين المايجريشن 74 والمايجريشن 78 باشتراطات أمان قاطعة تمنع تنفيذهما نهائياً في بيئات الديسكتوب والإلكترون المستقلة (`APP_MODE === 'SELF_CONTAINED'` أو `IS_ELECTRON === 'true'`) لحماية منشأة المتجر المحلي `default` وكافة جداولها (الأصناف، المبيعات، الإعدادات، المستخدمين) من أي حذف أو تعديل، مع اشتراط عدم وجود أي أصناف أو مبيعات حقيقية قبل السماح بأي تنظيف.
      - **مايجريشن الحماية والترميم رقم 79 (`2040000000079_desktop_tenant_protection_and_restoration.ts`):** إنشاء مايجريشن وقائي يضمن استقرار منشأة المتجر المحلي `default` وتفعيل اشتراكها الدائم، واسترجاع اسم المحل من الإعدادات، وإعادة ربط المستخدمين بمنشأة المتجر المحلي، وحذف أي منشأة `zs` فارغة تم إنشاؤها بالخطأ في قواعد بيانات الديسكتوب.
      - **توجيه تسجيل الدخول المباشر في الديسكتوب (`session.service.ts`):** إلغاء اشتراط كود المنشأة في وضع الديسكتوب، وتوجيه عملية المصادقة فورياً إلى المنشأة المحلية الحقيقية `default` لكافة المستخدمين المسجلين، مع تجاوز استثناء تعارض المنشآت المتعددة لضمان فتح المنظومة مباشرة على بيانات المتجر.
      - **تطهير واجهة الدخول من كود المنشأة في الديسكتوب (`useLoginForm.ts`, `LoginPage.tsx`):** إخفاء بادج "تسجيل الدخول لمنشأة..." وحقل كود المنشأة وزر تحديده بالكامل في بيئة الإلكترون، مع مسح أي أكواد منشآت قديمة مخزنة في الذاكرة المحلية تلقائياً عند الإقلاع.
      - **تثبيت متغيرات بيئة إلكترون (`frontend/electron/main.cjs`):** تمرير `IS_ELECTRON: 'true'` و `PORTABLE_MODE: 'true'` و `TENANT_ID: 'default'` و `ACCOUNT_ID: 'default'` بشكل دائم وثابت للباك إند.

---
*تم إعداد وتحديث هذا السجل ليكون المرجع الأول والأخير لأي مطور أو مساعد ذكاء اصطناعي عند تحليل أو تعديل كود المشروع.*

---

## 25. موديول الشحن واللوجستيات (Freight & Logistics Module)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% (Production Ready)
* **كود الفيتشر:** `maritime_freight`
* **مفتاح الإعداد:** `maritimeFreightModuleEnabled`
* **الباقات المدعومة:** `plan_ultimate`, `plan_omnichannel` (وكافة الأسماء البديلة)
* **مسارات الكود — Backend:** `backend/src/modules/maritime-freight/`
* **مسارات الكود — Frontend:** `frontend/src/features/maritime-freight/`
* **الجداول في قاعدة البيانات (Migration 080):** `shipping_ports`, `shipping_lines`, `maritime_rfqs`, `maritime_rfq_bids`, `maritime_quotations`, `maritime_jobs`, `maritime_containers`, `maritime_job_milestones`
* **المعيار المرجعي:** DCSA (Digital Container Shipping Association) — 9 مراحل تتبع موحدة
* **بيانات أولية مدرجة:** 15 ميناء مصري ودولي (Alexandria, Port Said, Damietta, Singapore, Rotterdam, Jeddah, ...) + 10 خطوط شحن عالمية (MSC, Maersk, CMA CGM, ...)

### الملفات المنشأة

| النوع | الملف | الوصف |
| :--- | :--- | :--- |
| **Types** | `maritime-freight.types.ts` | تعريفات TypeScript، معايير DCSA، 9 مراحل تتبع |
| **DTOs** | `dto/create-rfq.dto.ts` | بيانات إنشاء طلب التسعير |
| **DTOs** | `dto/submit-bid.dto.ts` | بيانات تقديم عرض شركة الشحن |
| **DTOs** | `dto/create-quotation.dto.ts` | بيانات إنشاء عرض سعر العميل |
| **DTOs** | `dto/create-job.dto.ts` | بيانات تحويل العرض لأمر تشغيل |
| **DTOs** | `dto/update-container.dto.ts` | بيانات تحديث حالة الحاوية |
| **Service** | `maritime-freight.service.ts` | كامل منطق RFQs، توليد الأكواد `[RFQ-YYYY-XXXX]`، إرسال بريد بروابط سحرية، مقارنة الأسعار، تطبيق الهامش، إنشاء مركز تكلفة، إدارة الحاويات، حساب الديمراج |
| **Controller** | `maritime-freight.controller.ts` | Endpoints محمية بـ `SessionAuthGuard` |
| **Controller** | `maritime-public-tracking.controller.ts` | Endpoint عام لتتبع الشحنات بدون مصادقة |
| **Module** | `maritime-freight.module.ts` | مسجل في `app.module.ts` |
| **API** | `api/maritime-freight.api.ts` | خدمة API Frontend |
| **Component** | `CreateRfqModal.tsx` | نافذة إنشاء طلب تسعير جديد |
| **Component** | `ApplyMarginModal.tsx` | نافذة تطبيق الهامش على أسعار الشحن |
| **Component** | `CarrierBidEntryModal.tsx` | نافذة إدخال عرض شركة الشحن يدوياً |
| **Component** | `JobDetailsModal.tsx` | نافذة تفاصيل أمر التشغيل والمراحل |
| **Component** | `ContainerReturnModal.tsx` | نافذة تسجيل إعادة الحاوية الفارغة |
| **Tab** | `MaritimeRfqTab.tsx` | تبويب طلبات التسعير (Carrier RFQs) |
| **Tab** | `MaritimeMatrixTab.tsx` | تبويب مصفوفة مقارنة الأسعار |
| **Tab** | `MaritimeQuotationsTab.tsx` | تبويب عروض أسعار العملاء |
| **Tab** | `MaritimeJobsTab.tsx` | تبويب أوامر الشحن والتشغيل |
| **Tab** | `MaritimeContainersTab.tsx` | تبويب الحاويات وتتبع الإعادة |
| **Tab** | `MaritimeMasterDataTab.tsx` | تبويب دليل الشركاء والموانئ |
| **Page** | `MaritimeWorkspacePage.tsx` | الصفحة الرئيسية للموديول (URL-driven tabs بـ `?tab=`) |
| **Page** | `PublicShipmentTrackingPage.tsx` | صفحة تتبع الشحنة العامة (بدون تسجيل دخول) |
| **Icons** | `AppIcons.tsx` | أُضيفت `ShipIcon` و `ContainerIcon` |

### التوصيل في النظام (Wiring)

| الملف | ما تم |
| :--- | :--- |
| `routes.tsx` | تصدير `maritimeFreightRouteModule` بنمط `FeatureRouteModule` + `FeatureGate` + 6 عناصر تنقل بـ `?tab=` |
| `registry.ts` | تسجيل `maritimeFreightRouteModule` |
| `root-router.tsx` | مسار عام `/public/track/:token` لتتبع الشحنات |
| `access.ts` | إضافة `maritime` + 6 مسارات فرعية في `routePermissionMap` + `routeFeatureMap` |
| `app-shell.tsx` | أيقونة `ship` + 6 أيقونات فرعية في `iconPathMap`، مجموعة السايدبار `maritime-group`، منطق gating في `visibleNavigationItems` |
| `settings.schema.ts` | `maritimeFreightModuleEnabled: z.boolean().default(false)` |
| `contracts.ts` | ربط `maritimeFreightModuleEnabled` |
| `modular-presets.ts` | تسجيل في `SYSTEM_MODULES` |
| `session.service.ts` | إضافة `maritime_freight` في `FALLBACK_PLAN_FEATURES` |
| `saas-admin.service.ts` | إضافة في كافة مصفوفات الباقات + `FEATURE_TO_MODULE_MAP` |
| `DeveloperActivationPanel.tsx` | إضافة في `AVAILABLE_FEATURES` + كافة مصفوفات `STANDARD_TIER_FEATURES` |
| `ModulesSettingsTab.tsx` | `hasMaritimeFreightFeature` hook + `isMaritimeFreightActive` + بطاقة toggle في الإعدادات |
| **Migration 080** | تسجيل الفيتشر في جدول `features` + ربطه بـ `plan_ultimate` و `plan_omnichannel` في `plan_features` |

| الميزة التفصيلية | الحالة | نسبة الإنجاز | الملفات الأساسية |
| :--- | :---: | :---: | :--- |
| **طلبات التسعير من شركات الشحن (Carrier RFQs)** | 🟢 | 100% | `CreateRfqModal.tsx`, `MaritimeRfqTab.tsx`, `maritime-freight.service.ts` |
| **توليد أكواد RFQ تلقائياً** | 🟢 | 100% | `maritime-freight.service.ts` — نمط `[RFQ-2026-0001]` |
| **إرسال بريد إلكتروني بروابط سحرية لشركات الشحن** | 🟢 | 100% | `maritime-freight.service.ts` — Magic Links للـ Carriers |
| **إدخال عروض شركات الشحن (Bid Entry)** | 🟢 | 100% | `CarrierBidEntryModal.tsx`, `submit-bid.dto.ts` |
| **مصفوفة مقارنة الأسعار التلقائية** | 🟢 | 100% | `MaritimeMatrixTab.tsx` — مقارنة متعددة الأبعاد |
| **تطبيق الهامش وإصدار عرض سعر العميل** | 🟢 | 100% | `ApplyMarginModal.tsx`, `MaritimeQuotationsTab.tsx` |
| **تحويل عرض السعر لأمر تشغيل (Job Conversion)** | 🟢 | 100% | `MaritimeJobsTab.tsx`, `create-job.dto.ts` |
| **تتبع 9 مراحل شحن وفق معيار DCSA** | 🟢 | 100% | `JobDetailsModal.tsx`, `MaritimeJobsTab.tsx`, `maritime-freight.types.ts` |
| **إدارة الحاويات وتتبع مواعيد الإعادة** | 🟢 | 100% | `MaritimeContainersTab.tsx`, `ContainerReturnModal.tsx` |
| **حساب الديمراج التلقائي** | 🟢 | 100% | `maritime-freight.service.ts` |
| **إنشاء مركز تكلفة تلقائي لكل أمر شحن** | 🟢 | 100% | `maritime-freight.service.ts` — `dimension = 'project'` |
| **دليل الموانئ والخطوط البحرية** | 🟢 | 100% | `MaritimeMasterDataTab.tsx` + بذر 15 ميناء + 10 خطوط |
| **صفحة تتبع عام للشحنة (Public Tracking)** | 🟢 | 100% | `PublicShipmentTrackingPage.tsx`, `maritime-public-tracking.controller.ts` |
| **عزل المستأجرين (Multi-Tenant Isolation)** | 🟢 | 100% | جميع استعلامات DB بـ `tenant_id` |
| **Feature Gating في السايدبار** | 🟢 | 100% | `app-shell.tsx` — `maritime-group` محمي بـ `maritimeFreightModuleEnabled` + `maritime_freight` feature |
| **بطاقة تفعيل/تعطيل في الإعدادات** | 🟢 | 100% | `ModulesSettingsTab.tsx` |
| **دعم كامل في لوحة المطور** | 🟢 | 100% | `DeveloperActivationPanel.tsx` |

---

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

## 78. محرك التخصيص والعزل الرأسي للأنشطة والقطاعات (Industry Vertical Isolation Engine)

### نظرة عامة
تطوير منظومة عزل وفصل ثنائية الاتجاه (Bidirectional Vertical Isolation Engine) تجعل النظام يتكيف بالكامل مع طبيعة نشاط العميل وتمنحه شعوراً مطلقاً بأن المنظومة صُممت له خصيصاً كمنظومة مؤسسية متخصصة (ERP SaaS)، مع إخفاء تام وشامل لكافة الشاشات والمفاهيم والمصطلحات الدخيلة:

1. **قطاع المقاولات والهندسة (`contracting`):**
   - بيئة عمل مخصصة بالكامل للمشاريع، المقايسات (BOQ)، المستخلصات (IPC)، عقود الباطن، والتقارير اليومية.
   - إخفاء تام لنقاط البيع (POS)، درج الكاشير، الورديات، شاشات المطبخ (KDS)، المبيعات السريعة، وأنشطة الشحن والعيادات.
   - ترتيب هرمي علوي لمجموعات السايدبار يبدأ بالمقاولات ثم المشتريات ومستودعات المواقع ومحاسبة المشاريع.
   - تخصيص أزرار الوصول السريع في أعلى التطبيق: (لوحة التحكم، المشاريع، المستخلصات، جداول الكميات).

2. **قطاع الشحن البحري واللوجستيات (`maritime`):**
   - بيئة عمل مخصصة لأوامر التشغيل، الحاويات وفترات السماح (Demurrage)، ومصفوفة مقارنة الخطوط الملاحية.
   - إخفاء تام للـ POS، الورديات، تجزئة المنتجات، المقاولات، الصيدليات، والمطاعم.
   - أزرار وصول سريع مخصصة: (لوحة التحكم، أوامر التشغيل، تتبع الحاويات، عروض الأسعار).

3. **قطاعات التجزئة والمتاجر المتخصصة والتقسيط والتركيبات والتجارة الإلكترونية:**
   - تغطية شاملة لـ 16 نمطاً قطاعياً ومؤسسياً: (المقاولات، الشحن واللوجستيات، المتاجر الرقمية والتجارة الإلكترونية، الاستيراد والتصدير والرسائل الجمركية، السوبرماركت والمواد الغذائية، العطارة والمحامص، التجزئة العامة، معارض الأجهزة الكهربائية والتقسيط، الملابس والأزياء، العطور ومستحضرات التجميل والتركيبات، الصيدليات والرقابة الدوائية، الموبايل والإلكترونيات والصيانة، المطاعم والكافيهات، المكاتب والشركات الخدمية، تجارة الجملة والتوزيع، والتصنيع الخفيف والورش).
   - حظر وعزل قاطع لموديولات المقاولات والشحن البحري والتصنيع الثقيل والعيادات عن الأنشطة غير المعنية.
   - تركيز كامل على متطلبات كل قطاع (من بوابات الدفع والتجارة الإلكترونية، وحسابات التقسيط والكمبيالات، وتكاليف الحاويات والجمارك، إلى موازين الباركود وتتبع التشغيلات FEFO).

4. **العزل الذكي للبحث الشامل (Global Search Isolation):**
   - محرك البحث الفوري (`Ctrl + /`) يقوم بفلترة شاشات التنقل والبيانات بحيث لا تظهر نتائج مقاولات أو شحن لأصحاب أنشطة التجزئة والعطارة، ولا تظهر شاشات الكاشير لشركات المقاولات.

### الملفات المعدلة
| الملف | الدور |
| :--- | :--- |
| `backend/src/modules/saas-admin/dto/saas-admin.dto.ts` | إضافة خاصية نمط النشاط `businessIndustry` في DTO إنشاء المستأجرين الجدد |
| `backend/src/modules/saas-admin/trial-tenant-provisioning.service.ts` | بذر إعدادات الموديولات القطاعية آلياً في جدول `settings` عند إنشاء المستأجر مباشرة عبر `getIndustrySettingsPatch` لـ 16 نمطاً قطاعياً |
| `frontend/src/features/saas-admin/api/saas-admin.api.ts` | تمرير `businessIndustry` إلى واجهة برمجة تطبيقات السوبر أدمن |
| `frontend/src/features/saas-admin/components/CreateTrialTenantModal.tsx` | اعتماد المكون القياسي الموحد `CustomSelect` (وفق نظام `combobox-system.css`) وتغطية الـ 16 نمطاً قطاعياً شاملاً مع باقات الميزات |
| `frontend/src/shared/layout/app-shell.tsx` | محرك العزل في السايدبار والشريط العلوي والترتيب الهرمي `preferredOrder` |
| `frontend/src/shared/components/GlobalSearchModal.tsx` | الفلترة الذكية لمحرك البحث حسب النشاط الفعلي لمنع تسريب الموديولات |
| `frontend/src/features/settings/schemas/settings.schema.ts` | اعتماد `contracting` و `maritime` في الـ schema الرسمية للأنشطة |
| `frontend/src/features/settings/components/modular-configurator/modular-presets.ts` | قوالب التكوين القطاعية الذكية الـ 16 وخوارزميات التعطيل المتبادل وحساب الباقة |
| `frontend/src/features/settings/components/modular-configurator/SmartModularQuickBar.tsx` | إدراج قوالب المقاولات والشحن البحري في شريط التخصيص السريع |
| `frontend/src/features/settings/components/forms/tabs/GeneralSettingsTab.tsx` | الأتمتة التلقائية ومحرك التهيئة `applyIndustryAutomation` عند تغيير النشاط |
| `frontend/src/features/settings/components/forms/tabs/ModulesSettingsTab.tsx` | عزل وحجب بطاقات الموديولات غير الملائمة لكل قطاع (POS، مقاولات، شحن، تصنيع، مطاعم، صيدليات، موازين) مع الحفاظ على رؤية السوبر أدمن التامة |
| `frontend/src/features/settings/components/modular-configurator/SmartModularConfiguratorModal.tsx` | أيقونات وعروض الموديولات في نافذة التكوين الذكي |
| `frontend/src/features/activation/components/onboarding/PresetIcon.tsx` | أيقونات SVG مؤسسية معتمدة لكافة القطاعات |

### جدول التحقق والجاهزية
| المتطلب | الحالة | النسبة | التفاصيل |
| :--- | :--- :---: | :---: | :--- |
| **اختيار النمط أثناء إنشاء حساب المستأجر (SaaS Admin)** | 🟢 | 100% | قائمة منسدلة بمكون `CustomSelect` الموحد تضم 16 نمطاً تجارياً وصناعياً وخدمياً ولوجستياً تغطي 100% من قدرات المنظومة |
| **البذر التلقائي لإعدادات الموديولات بالباك إند** | 🟢 | 100% | تفعيل وتعطيل الموديولات المناسبة فورياً في قاعدة البيانات بقيم صريحة لكافة الأنماط الـ 16 |
| **العزل التام في الإعدادات الداخلية (ModulesSettingsTab)** | 🟢 | 100% | منع ظهور أي موديول خارج تخصص العميل مع إتاحة التحكم الكامل للسوبر أدمن |
| **العزل الهرمي في السايدبار والشريط العلوي** | 🟢 | 100% | تخصيص مسميات وأولويات التنقل وإخفاء المجموعات غير ذات الصلة نهائياً |
| **عزل محرك البحث الشامل (Global Search)** | 🟢 | 100% | منع نتائج وروابط الموديولات غير المفعلة في شريط البحث السريع |
| **الامتثال لمعايير التصميم وخلو تام من الإيموجيز** | 🟢 | 100% | التزام كامل بـ `AppIcons` و `StandardDialog` و `CustomSelect` ودستور التيبوجرافي |

---

## 79. معمارية المسارات والصفحات المستقلة لموديولات المقاولات والشحن البحري (Modular Sub-Route Architecture)

### نظرة عامة
تمت إعادة هيكلة موديولي **المقاولات الإنشائية (`contracting`)** و **الشحن البحري واللوجستيات (`maritime-freight`)** معمارياً من أسلوب الصفحة الواحدة المتضخمة المحملة بالتابات (Monolithic Workspace Tabs) إلى **معمارية المسارات الفرعية المستقلة (Modular Sub-Routes with Layout & Context)**:

1. **القضاء على عبء تحميل الـ Bundle والـ Monolithic State:**
   - تم تحويل الصفحات الأحادية إلى Layout مركزي خفيف مع سياق مشترك (`ContractingContext` و `MaritimeContext`).
   - تفعيل التحميل الكسول الحقيقي (True Code-Splitting & Lazy Loading) عبر `createLazyRoute` لكل شاشة فرعية مستقلة، بحيث لا يتم تنزيل كود شاشة المستخلصات أو الحاويات إلا عند زيارتها فعلياً.

2. **هيكلة موديول المقاولات (`contracting`):**
   - **الـ Layout الموحد:** `ContractingLayout.tsx` (يحتوي على الـ PageHeader، بطاقات KPIs المالية، شريط اختيار المشروع النشط المشترك، وشريط التبويبات).
   - **الصفحات المستقلة:**
     - `/contracting` & `/contracting/projects` -> `ContractingProjectsPage.tsx`
     - `/contracting/boq` -> `ContractingBoqPage.tsx`
     - `/contracting/gantt` -> `ContractingGanttPage.tsx`
     - `/contracting/change-orders` -> `ContractingChangeOrdersPage.tsx`
     - `/contracting/invoices` -> `ContractingInvoicesPage.tsx`
     - `/contracting/subcontracts` -> `ContractingSubcontractsPage.tsx`
     - `/contracting/materials` -> `ContractingMaterialsPage.tsx`
     - `/contracting/daily-logs` -> `ContractingDailyLogsPage.tsx`
     - `/contracting/rfis` -> `ContractingRfiPage.tsx`
   - **التوافق العكسي:** تحويل تلقائي لأي زيارات قديمة تعتمد `?tab=...` إلى المسار النظيف الجديد.

3. **هيكلة موديول الشحن البحري (`maritime-freight`):**
   - **الـ Layout الموحد:** `MaritimeLayout.tsx` (يحتوي على الـ PageHeader، بطاقات KPIs التشغيلية، وشريط التبويبات مع العدادات الحية).
   - **الصفحات المستقلة:**
     - `/maritime` & `/maritime/rfqs` -> `MaritimeRfqsPage.tsx`
     - `/maritime/matrix` -> `MaritimeMatrixPage.tsx`
     - `/maritime/quotations` -> `MaritimeQuotationsPage.tsx`
     - `/maritime/jobs` -> `MaritimeJobsPage.tsx`
     - `/maritime/containers` -> `MaritimeContainersPage.tsx`
     - `/maritime/lines` & `/maritime/master` -> `MaritimeLinesPage.tsx`
   - **التوافق العكسي:** توجيه تلقائي من `/maritime?tab=xxx` إلى المسار النظيف.

### جدول التحقق والجاهزية
| المتطلب | الحالة | النسبة | التفاصيل |
| :--- | :---: | :---: | :--- |
| **تقسيم صفحات موديول المقاولات إلى Sub-Routes** | 🟢 | 100% | 9 صفحات فرعية مستقلة مع Lazy Loading وسياق مشروع مشترك |
| **تقسيم صفحات موديول الشحن البحري إلى Sub-Routes** | 🟢 | 100% | 6 صفحات فرعية مستقلة مع عدادات وإدارة حالة مستقلة |
| **تخفيف أحجام ملفات الصفحات الرئيسية** | 🟢 | 100% | تفتيت الملفات من 750 سطر إلى صفحات بمتوسط 60-120 سطر فقط |
| **التوافق العكسي التام (Backward Compatibility)** | 🟢 | 100% | دعم الروابط القديمة `?tab=...` والتحويل التلقائي السلس |
| **خلو تام من أخطاء TypeScript** | 🟢 | 100% | فحص مزدوج للباك إند والفرونت إند بـ 0 أخطاء |



---

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

## 80. بنك بنود المقاولات المرجعي الشامل ومحرك الاستيراد لكافة التخصصات (Multi-Trade Master BOQ Library & 1-Click Importer)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Procore Master Items Catalog / Trimble WinEst & HeavyBid Multi-Trade Cost Database.
* **روابط وشاشات الوصول:**
  1. شاشة بنك البنود المرجعي المستقلة: `/contracting/master-boq` (القائمة الجانبية وشريط التبويبات العلوي: المقاولات ➔ بنك البنود المرجعي).
  2. زر الاستيراد السريع بجدول الكميات: `/contracting/boq` (زر "بنك البنود المرجعي" وزر "سحب تخصصات جاهزة" بالحالة الفارغة).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000083_contracting_master_boq_library.ts`, جدول `contracting_master_boq_library` مُحمّل مسبقاً بـ 62 بنداً معيارياً واقعياً عبر 10 تخصصات إنشائية وكهروميكانيكية كاملة.
  * **الباك إند:** `backend/src/modules/contracting/contracting.service.ts` (`getMasterBoqTrades`, `getMasterBoqLibrary`, `createMasterBoqItem`, `updateMasterBoqItem`, `deleteMasterBoqItem`, `importMasterBoqItemsToProject`), `contracting.controller.ts`, `contracting.dto.ts`.
  * **الفرونت إند:**
    - `frontend/src/features/contracting/components/ImportMasterBoqModal.tsx` (نافذة الاستيراد المتعدد التفاعلية مع فلترة التخصصات والبحث والأسعار المرجعية).
    - `frontend/src/features/contracting/components/CreateMasterBoqItemModal.tsx` (نافذة إضافة وتعديل بند مرجعي مخصص).
    - `frontend/src/features/contracting/pages/ContractingMasterBoqPage.tsx` (شاشة العرض والإدارة الشاملة لبنك البنود مع بطاقات الـ KPIs والتصدير لإكسيل).
    - `frontend/src/features/contracting/pages/ContractingLayout.tsx` (تنسيق الهيدر ووضع شريط التبويبات القياسي في الأعلى وبنر المشروع النشط أسفله مباشرة وفق طلب المستخدم).
* **التخصصات الإنشائية والكهروميكانيكية المشمولة (10 تخصصات):**
  1. أعمال الحفر والإحلال والخرسانات والخوازيق (`civil_concrete`)
  2. أعمال المباني والعزل المائي والحراري والفوم (`masonry_insulation`)
  3. أعمال التشطيبات الداخلية والمعمارية (`finishes`)
  4. أعمال النجارة والألوميتال والواجهات والكلادينج (`doors_windows_facades`)
  5. الإنشاءات والجمالونات المعدنية والساندوتش بانل (`steel_structures`)
  6. أعمال التغذية والشبكات والكهرباء والإنارة (`electrical`)
  7. أنظمة التيار الخفيف والمراقبة والسمارت هوم والإنذار (`smart_systems_elv`)
  8. الأعمال الصحية والسباكة والصرف ومحطات الرفع (`plumbing`)
  9. التكييف المركزي والمخفي ومكافحة الحريق (`hvac_firefighting`)
  10. أعمال الموقع العام واللاندسكيب والإنترلوك وشبكات الري (`landscape_infrastructure`)
* **القدرات التشغيلية:**
  - سحب تخصص كامل أو بنود محددة بضغطة زر واحدة لمقايسة أي مشروع جديد لتعبئة الكميات فقط.
  - إمكانية إضافة بنود مخصصة للشركة وتعديل تكلفة وأسعار السوق لأي بند مرجعي.
  - تصدير كامل بنك البنود المرجعي إلى Excel بضغطة زر.

---

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

## 86. تحصين حقول الإدخال الرقمية والكميات ودعم الأرقام العربية (Numeric Input Hardening & Eastern Arabic Digit Support)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **المشكلات المعالجة:**
  1. **معالجة إعادة التهيئة عند كل ضربة مفتاح (Zero Re-render Overwrites):**
     - كان تمرير مصفوفة فارغة كقيمة افتراضية `existingItems = []` في بارامترات المكون يُنشئ مرجع مصفوفة جديد مع كل رندر، مما يدفع `useEffect` للعمل عند كل حرف يكتبه المستخدم وإعادة تعيين الحقل إلى القيمة الصفرية الأصلية وإلغاء ما كتبه.
     - تم تحصين المكون بمؤشر `hasInitializedRef` مع مرجع ثابت `EMPTY_ITEMS` لضمان تشغيل التهيئة مرة واحدة فقط عند فتح النافذة ومنع أي إعادة تعيين أثناء الكتابة.
  2. **دعم الأرقام العربية الشرقية (Eastern Arabic Numerals `٠-٩`):**
     - استبدال `type="number"` الذي يرفضه المتصفح عند الكتابة بلوحة مفاتيح عربية بـ `type="text"` مع `inputMode="decimal"` ودالة تطهير وتحويل تلقائي `cleanNumberInput` تحول الأرقام الشرقية والفارسية إلى أرقام قياسية وتدعم الفواصل العشرية.
  3. **تحسين تجربة إدخال الكميات الصفرية:**
     - عند فتح نافذة تعديل بند مستورد بكمية صفرية، تُترك الخانة فارغة مع `placeholder="0.00"` وتركيز تلقائي `autoFocus` وتحديد كامل النص `onFocus.select` ليتمكن المستخدم من كتابة الكمية فوراً دون الحاجة لمسح الصفر يدوياً.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/components/UniversalBoqItemModal.tsx` (تحصين التهيئة، cleanNumberInput، ترقية حقول الكمية والتسعير والهامش).

---

## 87. القضاء التام على وميض ورعشة التبديل بين تابات المقاولات واستقرار الهيكل (Zero Tab Layout Flicker & Persistent Workspace Standard)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Persistent Layout Architecture & Instant In-Memory Route Transitions.
* **المشكلات المعالجة والتطويرات:**
  1. **القضاء على دورة الهدم وإعادة البناء (Eliminate Route Unmount & Shimmer Fallback):**
     - كان كل تبويب من تابات المقاولات الخمسة مسجلاً كمسار كسول مستقل (`createLazyRoute`) يغلف داخله نسخة جديدة من `ContractingLayout`. عند النقر على أي تبويب، كان المتصفح يهدم الهيكل بالكامل ويطلق شاشة الانتظار اللحظية (`RouteLoadingFallback` بارتفاع 60vh مع وميض رمادي `routeShimmer`) ثم يعيد تركيب الهيدر وبطاقات المؤشرات وشريط التابات من الصفر، مما يسبب "رزعة أو ريفريش خفيف" مزعج للعين.
     - تم توحيد بيئة المقاولات تحت مسار دائم ومستمر واحد `ContractingWorkspaceLazy` على مسارات `contracting` و `contracting/*`، بحيث يظل الهيكل العلوي (الهيدر، بطاقات الـ KPI الأربعة، شريط التابات، وشريط اختيار المشروع) ثابتاً في شجرة React بدون أي إلغاء تثبيت (Zero Unmount).
  2. **التبديل اللحظي لمحتوى التابات بالذاكرة (Instant In-Place Tab Switching):**
     - تم دمج الصفحات الفرعية الخمس للتابات (`ContractingProjectsPage`, `ContractingBoqPage`, `ContractingFinancialsPage`, `ContractingProcurementPage`, `ContractingFieldPage`) وتفعيل دالة التبديل الفوري `renderTabContent()` في جسم الصفحة اعتماداً على المسار الفرعي الفعلي للعنوان `currentSubPath`.
     - النقر على أي تبويب يقوم بتحديث الرابط وبدء رندر التبويب في أجزاء من الملي ثانية (0ms delay) بدون أي حركة أو وميض أو ريفريش في النصف العلوي للشاشة نهائياً.
  3. **فصل طلبات الشبكة الزائدة عن التنقل (Decouple Reload From Tab Navigation):**
     - في `ContractingContext.tsx`، كانت دالة `reloadProjects` تعتمد على معاملات المشروع `[selectedProjectId, projectParam]`، مما كان يدفعها لجلب قائمة المشاريع والمؤشرات من الباك إند عبر الشبكة وتعيين `loading = true` مع كل تنقل بين التابات.
     - تم فصل الدالة لتُحمّل المشاريع مرة واحدة فقط عند فتح الشاشة (`on mount`) أو عند طلب التحديث اليدوي الصريح، مما وفر استهلاك الشبكة ومنع أي اهتزاز في مؤشرات الأداء.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/routes.tsx` (توحيد المسارات تحت ContractingWorkspaceLazy الدائم).
  - `frontend/src/features/contracting/pages/ContractingLayout.tsx` (استيراد التابات والتبديل الموضعي renderTabContent وتطبيع المسارات).
  - `frontend/src/features/contracting/context/ContractingContext.tsx` (فصل reloadProjects ومنع إعادة الجلب الشبكي عند التبديل).

---

## 88. موديول الشحن البحري واللوجستيات ودورة الأتمتة الكاملة (End-to-End Maritime Freight & Mail Automation Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** DCSA Standards & End-to-End Digital Freight Forwarding (Inquiry ➔ RFQ ➔ Quotation ➔ Job ➔ DCSA Journey ➔ DLVR ➔ Container Return).
* **مسارات الكود الأساسية:**
  - الباك إند: `backend/src/modules/maritime-freight` (`maritime-freight.service.ts`, `maritime-mail.service.ts`, `maritime-freight.controller.ts`, `maritime-freight.module.ts`, `maritime-freight.types.ts`).
  - الهجرة وقاعدة البيانات: `backend/src/database/migrations/2040000000084_maritime_workflow_automation.ts`, `backend/src/database/database.types.ts`.
  - الفرونت إند: `frontend/src/features/maritime-freight` (`MaritimeLayout.tsx`, `MaritimeWorkflowStepper.tsx`, `MaritimeInquiriesTab.tsx`, `MaritimeInquiriesPage.tsx`, `MaritimeSettingsTab.tsx`, `MaritimeSettingsPage.tsx`, `CreateInquiryModal.tsx`, `MaritimeRfqTab.tsx`, `MaritimeQuotationsTab.tsx`, `ApplyMarginModal.tsx`, `JobDetailsModal.tsx`, `MaritimeContainersTab.tsx`, `maritime-freight.api.ts`, `routes.tsx`).
* **الجداول في قاعدة البيانات:**
  - `maritime_inquiries` (استفسارات وطلبات شحن العملاء مع كافة التفاصيل والربط المتسلسل).
  - `maritime_rfqs` (طلبات استقصاء أسعار الخطوط الملاحية والوكلاء).
  - `maritime_rfq_bids` (عروض الأسعار الواردة من الخطوط الملاحية وتفاصيل النولون ومصاريف الموانئ THC وأيام السماح).
  - `maritime_quotations` (عروض أسعار العملاء متضمنة هوامش الربح Markup وسعر الصرف).
  - `maritime_jobs` (أوامر التشغيل، ملفات الشحنات، بوالص الشحن MBL/HBL، وربط مراكز التكلفة المحاسبية).
  - `maritime_containers` (رادار الحاويات، أيام السماح Free Days، غرامات الأرضيات، وتأمينات التوكيلات).
  - `maritime_job_milestones` (محطات التتبع القياسية وفق معيار DCSA العالمي).
  - `settings` (تخزين وتشفير إعدادات خوادم البريد الصادر SMTP والوارد IMAP).

* **المصفوفة التفصيلية لميزات الموديول المؤتمت:**
| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **استفسارات وطلبات الشحن للعملاء (Client Freight Inquiries)** | 🟢 | 100% | `CreateInquiryModal.tsx`, `MaritimeInquiriesTab.tsx`, `maritime-freight.service.ts` | نقطة الانطلاق الأولى لتسجيل طلبات العملاء (اسم العميل، الهاتف، الإيميل، المسار، الحاويات، الوزن، CBM، الجاهزية CRD، الشروط التجارية Incoterms، وشروط الدفع Prepaid/Collect). |
| **التكامل المباشر في القائمة الجانبية (Sidebar Direct Navigation)** | 🟢 | 100% | `app-shell.tsx`, `routes.tsx` | إدراج رابط "طلبات الشحن (Inquiries)" في صدارة قائمة الشحن البحري، ورابط "إعدادات البريد والأتمتة" في نهايتها للوصول بضغطة واحدة من أي مكان في النظام دون الحاجة لفتح تبويب آخر أولاً. |
| **التحويل الفوري بضغطة زر لطلب تسعير خطوط (1-Click Convert to RFQ)** | 🟢 | 100% | `convertInquiryToRfq`, `MaritimeInquiriesPage.tsx` | تمرير بيانات طلب العميل آلياً وتوليد كود تسلسلي رسمي لطلب التسعير الملاحي (RFQ) وإتاحته للإرسال المباشر لشركات الملاحة. |
| **دليل الشركاء والخطوط ووكلاء الشحن (Partners Directory & Trade Desks)** | 🟢 | 100% | `MaritimeMasterDataTab.tsx`, `PartnerFormModal.tsx`, `2040000000085_maritime_partners_directory.ts` | سجل مؤسسي متكامل لجهات الاتصال مقسم لـ 3 تبويبات: (1) الخطوط والتوكيلات الملاحية ومكاتب تسعير الممرات الملاحية (Trade Lanes: الصين، أوروبا، الخليج، أمريكا)، (2) وكلاء الشحن بالخارج مع فلتر الدولة (الصين، تركيا، ألمانيا، إيطاليا...)، (3) دليل الموانئ؛ مع زر نسخ الإيميلات وربط ذكي بنافذة الـ RFQ. |
| **شريط مسار الشحن المؤتمت (Maritime Workflow Stepper)** | 🟢 | 100% | `MaritimeWorkflowStepper.tsx` | شريط مرئي تفاعلي يوضح للشركة مراحل دورة الشحن الست الكاملة وتسهيل التنقل اللحظي بينها. |
| **إعدادات خوادم البريد وأتمتة Outlook و IMAP/SMTP** | 🟢 | 100% | `MaritimeSettingsTab.tsx`, `maritime-mail.service.ts` | ضبط حساب Outlook / Microsoft 365 أو Gmail أو الخوادم الخاصة للشركة؛ خادم الإرسال SMTP لإرسال طلبات التسعير، وخادم الاستقبال IMAP لقراءة الردود. |
| **مركز الفحص اللحظي والمزامنة الذاتية لصندوق الوارد** | 🟢 | 100% | `testMailConnection`, `sendTestEmail`, `syncInboundBids` | فحص فوري ومصادقة كلا الخادمين وإظهار زمن الاستجابة، إرسال بريد تجريبي، ومزامنة صندوق الوارد بالذكاء الاصطناعي لاستخراج عروض الخطوط وإدراجها في مصفوفة المقارنة. |
| **مصفوفة المفاضلة وتطبيق الهامش الربحي (Matrix & Pricing)** | 🟢 | 100% | `MaritimeMatrixTab.tsx`, `ApplyMarginModal.tsx` | مقارنة عروض الخطوط الملاحية جنباً إلى جنب، تطبيق الهامش الربحي (مبلغ ثابت أو نسبة مئوية)، احتساب سعر الصرف، وإرسال عرض السعر للعميل عبر واتساب. |
| **التعميد الآلي وفتح ملف الشحنة ومركز التكلفة (Auto Convert to Job)** | 🟢 | 100% | `autoConvertQuotationToJob`, `MaritimeQuotationsPage.tsx` | بنقرة زر واحدة عند اعتماد العميل، يتم إنشاء أمر التشغيل وتوليد كود الشحنة الرسمي وتأسيس مركز التكلفة المحاسبي وربط الحاويات ومراحل DCSA. |
| **محطات التتبع البحري DCSA ومحطة التسليم النهائي (DLVR Milestone)** | 🟢 | 100% | `JobDetailsModal.tsx`, `maritime-freight.types.ts` | تتبع حركة السفينة والحاويات (BOOK, GTI, LOAD, DEPT, ARRI, DISC, CUST, GTO, DLVR, RETN)، وتحديث حالة التسليم النهائي للعميل مع تنبيه مباشر للرادار. |
| **إشعارات الواتساب اللحظية لمراحل الشحن (Milestone WhatsApp Alerts)** | 🟢 | 100% | `getJobWhatsAppAlert`, `JobDetailsModal.tsx` | إرسال إشعار فوري للعميل عبر واتساب عند وصول السفينة أو الإفراج الجمركي أو تسليم البضاعة مع رابط التتبع السحابي المباشر. |
| **رادار الحاويات وإدارة تأمين الفارغ (Demurrage & Deposit Refund)** | 🟢 | 100% | `MaritimeContainersTab.tsx`, `ContainerReturnModal.tsx` | رادار احتساب فترات السماح المتبقية ومنع غرامات الأرضيات والتأخير، وإدارة استرداد مبالغ التأمين وإيداعها في الخزينة. |
| **تطهير الواجهات الشامل من الإيموجيز (Zero-Emoji Compliance)** | 🟢 | 100% | كافة مكونات الشحن البحري | تطهير كافة الشاشات والنوافذ والرسائل الصادرة من أي رموز كرتونية أو إيموجيز، والاعتماد الحصري على أيقونات النظام الرسمية في `AppIcons`. |

---

## 89. دستور الضبط المتوازي للنصوص والمواصفات الهندسية الطويلة (Strict Multi-line Text Justification Standard)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Editorial Typography & Institutional Contract Formatting Standard (Rule 12).
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **تأسيس القاعدة رقم 12 في دستور المنظومة (`GEMINI.md`):**
     - إلزامية تطبيق الضبط المتوازي الكامل للأسطر (`text-align: justify; text-justify: inter-word; text-align-last: start;`) على كافة النصوص والفقرات متعددة السطور، وبيانات الأعمال والمواصفات الهندسية، وبنود العقود، ويوميات الموقع.
  2. **القضاء التام على التعرج والتفاوت في الحواف (Zero Ragged Edges):**
     - في بيئة العرض العربية (RTL)، كانت نهايات الأسطر اليسرى تنتهي بأطوال وفراغات متفاوتة وعشوائية تسبب تشتتاً بصرياً.
     - تم توحيد ضبط الأسطر لتملأ العرض المتاح بدقة متناهية وتشكل كتلة مستقيمة متوازية الحواف على الجانبين (Block Alignment) مع ارتفاع سطر مريح `line-height: 1.6` يمنح النصوص مظهراً وثائقياً مؤسسياً متزناً يشبه كراسات الشروط وعقود الفيديك (FIDIC).
  3. **تأسيس كلاسات الـ CSS المركزية:**
     - إضافة كلاسات قياسية موحدة في `frontend/src/styles/partials/base.css` (`.text-justify`, `.prose-justified`, `.spec-description`) قابلة لإعادة الاستخدام في سائر شاشات وموديلات المنظومة.
  4. **التطبيق الشامل على شاشات المقاولات:**
     - جدول المقايسة الفعلي لمشاريع المقاولات (`ContractingBoqTab.tsx`).
     - بنك البنود المرجعي العام (`ContractingMasterBoqPage.tsx`).
     - جدول بنود عروض أسعار العملاء (`ClientQuotationModal.tsx`).
     - تحليل ربحية وتكاليف البنود (`BoqProfitabilityModal.tsx`).
     - بيان الأعمال المنفذة وملاحظات الموقع في اليوميات الميدانية (`ContractingDailyLogsTab.tsx`).
* **الملفات المحدثة:**
  - `d:/zn/GEMINI.md` (إضافة القاعدة الرسمية رقم 12).
  - `frontend/src/styles/partials/base.css` (تعريف الكلاسات القياسية `.text-justify`, `.spec-description`).
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx` (تطبيق الضبط المتوازي على بيان الأعمال والمواصفات).
  - `frontend/src/features/contracting/pages/ContractingMasterBoqPage.tsx` (تطبيق الضبط على مواصفات بنك البنود).
  - `frontend/src/features/contracting/components/ClientQuotationModal.tsx` (تطبيق الضبط على جدول عروض الأسعار).
  - `frontend/src/features/contracting/components/BoqProfitabilityModal.tsx` (تطبيق الضبط على بطاقة الربحية).
  - `frontend/src/features/contracting/components/ContractingDailyLogsTab.tsx` (تطبيق الضبط على الأعمال المنفذة باليوميات).

---

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

## 86. تحصين حقول الإدخال الرقمية والكميات ودعم الأرقام العربية (Numeric Input Hardening & Eastern Arabic Digit Support)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **المشكلات المعالجة:**
  1. **معالجة إعادة التهيئة عند كل ضربة مفتاح (Zero Re-render Overwrites):**
     - كان تمرير مصفوفة فارغة كقيمة افتراضية `existingItems = []` في بارامترات المكون يُنشئ مرجع مصفوفة جديد مع كل رندر، مما يدفع `useEffect` للعمل عند كل حرف يكتبه المستخدم وإعادة تعيين الحقل إلى القيمة الصفرية الأصلية وإلغاء ما كتبه.
     - تم تحصين المكون بمؤشر `hasInitializedRef` مع مرجع ثابت `EMPTY_ITEMS` لضمان تشغيل التهيئة مرة واحدة فقط عند فتح النافذة ومنع أي إعادة تعيين أثناء الكتابة.
  2. **دعم الأرقام العربية الشرقية (Eastern Arabic Numerals `٠-٩`):**
     - استبدال `type="number"` الذي يرفضه المتصفح عند الكتابة بلوحة مفاتيح عربية بـ `type="text"` مع `inputMode="decimal"` ودالة تطهير وتحويل تلقائي `cleanNumberInput` تحول الأرقام الشرقية والفارسية إلى أرقام قياسية وتدعم الفواصل العشرية.
  3. **تحسين تجربة إدخال الكميات الصفرية:**
     - عند فتح نافذة تعديل بند مستورد بكمية صفرية، تُترك الخانة فارغة مع `placeholder="0.00"` وتركيز تلقائي `autoFocus` وتحديد كامل النص `onFocus.select` ليتمكن المستخدم من كتابة الكمية فوراً دون الحاجة لمسح الصفر يدوياً.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/components/UniversalBoqItemModal.tsx` (تحصين التهيئة، cleanNumberInput، ترقية حقول الكمية والتسعير والهامش).

---

## 87. القضاء التام على وميض ورعشة التبديل بين تابات المقاولات واستقرار الهيكل (Zero Tab Layout Flicker & Persistent Workspace Standard)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Persistent Layout Architecture & Instant In-Memory Route Transitions.
* **المشكلات المعالجة والتطويرات:**
  1. **القضاء على دورة الهدم وإعادة البناء (Eliminate Route Unmount & Shimmer Fallback):**
     - كان كل تبويب من تابات المقاولات الخمسة مسجلاً كمسار كسول مستقل (`createLazyRoute`) يغلف داخله نسخة جديدة من `ContractingLayout`. عند النقر على أي تبويب، كان المتصفح يهدم الهيكل بالكامل ويطلق شاشة الانتظار اللحظية (`RouteLoadingFallback` بارتفاع 60vh مع وميض رمادي `routeShimmer`) ثم يعيد تركيب الهيدر وبطاقات المؤشرات وشريط التابات من الصفر، مما يسبب "رزعة أو ريفريش خفيف" مزعج للعين.
     - تم توحيد بيئة المقاولات تحت مسار دائم ومستمر واحد `ContractingWorkspaceLazy` على مسارات `contracting` و `contracting/*`، بحيث يظل الهيكل العلوي (الهيدر، بطاقات الـ KPI الأربعة، شريط التابات، وشريط اختيار المشروع) ثابتاً في شجرة React بدون أي إلغاء تثبيت (Zero Unmount).
  2. **التبديل اللحظي لمحتوى التابات بالذاكرة (Instant In-Place Tab Switching):**
     - تم دمج الصفحات الفرعية الخمس للتابات (`ContractingProjectsPage`, `ContractingBoqPage`, `ContractingFinancialsPage`, `ContractingProcurementPage`, `ContractingFieldPage`) وتفعيل دالة التبديل الفوري `renderTabContent()` في جسم الصفحة اعتماداً على المسار الفرعي الفعلي للعنوان `currentSubPath`.
     - النقر على أي تبويب يقوم بتحديث الرابط وبدء رندر التبويب في أجزاء من الملي ثانية (0ms delay) بدون أي حركة أو وميض أو ريفريش في النصف العلوي للشاشة نهائياً.
  3. **فصل طلبات الشبكة الزائدة عن التنقل (Decouple Reload From Tab Navigation):**
     - في `ContractingContext.tsx`، كانت دالة `reloadProjects` تعتمد على معاملات المشروع `[selectedProjectId, projectParam]`، مما كان يدفعها لجلب قائمة المشاريع والمؤشرات من الباك إند عبر الشبكة وتعيين `loading = true` مع كل تنقل بين التابات.
     - تم فصل الدالة لتُحمّل المشاريع مرة واحدة فقط عند فتح الشاشة (`on mount`) أو عند طلب التحديث اليدوي الصريح، مما وفر استهلاك الشبكة ومنع أي اهتزاز في مؤشرات الأداء.
* **الملفات المحدثة:**
  - `frontend/src/features/contracting/routes.tsx` (توحيد المسارات تحت ContractingWorkspaceLazy الدائم).
  - `frontend/src/features/contracting/pages/ContractingLayout.tsx` (استيراد التابات والتبديل الموضعي renderTabContent وتطبيع المسارات).
  - `frontend/src/features/contracting/context/ContractingContext.tsx` (فصل reloadProjects ومنع إعادة الجلب الشبكي عند التبديل).

---

## 88. موديول الشحن البحري واللوجستيات ودورة الأتمتة الكاملة (End-to-End Maritime Freight & Mail Automation Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** DCSA Standards & End-to-End Digital Freight Forwarding (Inquiry ➔ RFQ ➔ Quotation ➔ Job ➔ DCSA Journey ➔ DLVR ➔ Container Return).
* **مسارات الكود الأساسية:**
  - الباك إند: `backend/src/modules/maritime-freight` (`maritime-freight.service.ts`, `maritime-mail.service.ts`, `maritime-freight.controller.ts`, `maritime-freight.module.ts`, `maritime-freight.types.ts`).
  - الهجرة وقاعدة البيانات: `backend/src/database/migrations/2040000000084_maritime_workflow_automation.ts`, `backend/src/database/database.types.ts`.
  - الفرونت إند: `frontend/src/features/maritime-freight` (`MaritimeLayout.tsx`, `MaritimeWorkflowStepper.tsx`, `MaritimeInquiriesTab.tsx`, `MaritimeInquiriesPage.tsx`, `MaritimeSettingsTab.tsx`, `MaritimeSettingsPage.tsx`, `CreateInquiryModal.tsx`, `MaritimeRfqTab.tsx`, `MaritimeQuotationsTab.tsx`, `ApplyMarginModal.tsx`, `JobDetailsModal.tsx`, `MaritimeContainersTab.tsx`, `maritime-freight.api.ts`, `routes.tsx`).
* **الجداول في قاعدة البيانات:**
  - `maritime_inquiries` (استفسارات وطلبات شحن العملاء مع كافة التفاصيل والربط المتسلسل).
  - `maritime_rfqs` (طلبات استقصاء أسعار الخطوط الملاحية والوكلاء).
  - `maritime_rfq_bids` (عروض الأسعار الواردة من الخطوط الملاحية وتفاصيل النولون ومصاريف الموانئ THC وأيام السماح).
  - `maritime_quotations` (عروض أسعار العملاء متضمنة هوامش الربح Markup وسعر الصرف).
  - `maritime_jobs` (أوامر التشغيل، ملفات الشحنات، بوالص الشحن MBL/HBL، وربط مراكز التكلفة المحاسبية).
  - `maritime_containers` (رادار الحاويات، أيام السماح Free Days، غرامات الأرضيات، وتأمينات التوكيلات).
  - `maritime_job_milestones` (محطات التتبع القياسية وفق معيار DCSA العالمي).
  - `settings` (تخزين وتشفير إعدادات خوادم البريد الصادر SMTP والوارد IMAP).

* **المصفوفة التفصيلية لميزات الموديول المؤتمت:**
| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **استفسارات وطلبات الشحن للعملاء (Client Freight Inquiries)** | 🟢 | 100% | `CreateInquiryModal.tsx`, `MaritimeInquiriesTab.tsx`, `maritime-freight.service.ts` | نقطة الانطلاق الأولى لتسجيل طلبات العملاء (اسم العميل، الهاتف، الإيميل، المسار، الحاويات، الوزن، CBM، الجاهزية CRD، الشروط التجارية Incoterms، وشروط الدفع Prepaid/Collect). |
| **التكامل المباشر في القائمة الجانبية (Sidebar Direct Navigation)** | 🟢 | 100% | `app-shell.tsx`, `routes.tsx` | إدراج رابط "طلبات الشحن (Inquiries)" في صدارة قائمة الشحن البحري، ورابط "إعدادات البريد والأتمتة" في نهايتها للوصول بضغطة واحدة من أي مكان في النظام دون الحاجة لفتح تبويب آخر أولاً. |
| **التحويل الفوري بضغطة زر لطلب تسعير خطوط (1-Click Convert to RFQ)** | 🟢 | 100% | `convertInquiryToRfq`, `MaritimeInquiriesPage.tsx` | تمرير بيانات طلب العميل آلياً وتوليد كود تسلسلي رسمي لطلب التسعير الملاحي (RFQ) وإتاحته للإرسال المباشر لشركات الملاحة. |
| **دليل الشركاء والخطوط ووكلاء الشحن (Partners Directory & Trade Desks)** | 🟢 | 100% | `MaritimeMasterDataTab.tsx`, `PartnerFormModal.tsx`, `2040000000085_maritime_partners_directory.ts` | سجل مؤسسي متكامل لجهات الاتصال مقسم لـ 3 تبويبات: (1) الخطوط والتوكيلات الملاحية ومكاتب تسعير الممرات الملاحية (Trade Lanes: الصين، أوروبا، الخليج، أمريكا)، (2) وكلاء الشحن بالخارج مع فلتر الدولة (الصين، تركيا، ألمانيا، إيطاليا...)، (3) دليل الموانئ؛ مع زر نسخ الإيميلات وربط ذكي بنافذة الـ RFQ. |
| **شريط مسار الشحن المؤتمت (Maritime Workflow Stepper)** | 🟢 | 100% | `MaritimeWorkflowStepper.tsx` | شريط مرئي تفاعلي يوضح للشركة مراحل دورة الشحن الست الكاملة وتسهيل التنقل اللحظي بينها. |
| **إعدادات خوادم البريد وأتمتة Outlook و IMAP/SMTP** | 🟢 | 100% | `MaritimeSettingsTab.tsx`, `maritime-mail.service.ts` | ضبط حساب Outlook / Microsoft 365 أو Gmail أو الخوادم الخاصة للشركة؛ خادم الإرسال SMTP لإرسال طلبات التسعير، وخادم الاستقبال IMAP لقراءة الردود. |
| **مركز الفحص اللحظي والمزامنة الذاتية لصندوق الوارد** | 🟢 | 100% | `testMailConnection`, `sendTestEmail`, `syncInboundBids` | فحص فوري ومصادقة كلا الخادمين وإظهار زمن الاستجابة، إرسال بريد تجريبي، ومزامنة صندوق الوارد بالذكاء الاصطناعي لاستخراج عروض الخطوط وإدراجها في مصفوفة المقارنة. |
| **مصفوفة المفاضلة وتطبيق الهامش الربحي (Matrix & Pricing)** | 🟢 | 100% | `MaritimeMatrixTab.tsx`, `ApplyMarginModal.tsx` | مقارنة عروض الخطوط الملاحية جنباً إلى جنب، تطبيق الهامش الربحي (مبلغ ثابت أو نسبة مئوية)، احتساب سعر الصرف، وإرسال عرض السعر للعميل عبر واتساب. |
| **التعميد الآلي وفتح ملف الشحنة ومركز التكلفة (Auto Convert to Job)** | 🟢 | 100% | `autoConvertQuotationToJob`, `MaritimeQuotationsPage.tsx` | بنقرة زر واحدة عند اعتماد العميل، يتم إنشاء أمر التشغيل وتوليد كود الشحنة الرسمي وتأسيس مركز التكلفة المحاسبي وربط الحاويات ومراحل DCSA. |
| **محطات التتبع البحري DCSA ومحطة التسليم النهائي (DLVR Milestone)** | 🟢 | 100% | `JobDetailsModal.tsx`, `maritime-freight.types.ts` | تتبع حركة السفينة والحاويات (BOOK, GTI, LOAD, DEPT, ARRI, DISC, CUST, GTO, DLVR, RETN)، وتحديث حالة التسليم النهائي للعميل مع تنبيه مباشر للرادار. |
| **إشعارات الواتساب اللحظية لمراحل الشحن (Milestone WhatsApp Alerts)** | 🟢 | 100% | `getJobWhatsAppAlert`, `JobDetailsModal.tsx` | إرسال إشعار فوري للعميل عبر واتساب عند وصول السفينة أو الإفراج الجمركي أو تسليم البضاعة مع رابط التتبع السحابي المباشر. |
| **رادار الحاويات وإدارة تأمين الفارغ (Demurrage & Deposit Refund)** | 🟢 | 100% | `MaritimeContainersTab.tsx`, `ContainerReturnModal.tsx` | رادار احتساب فترات السماح المتبقية ومنع غرامات الأرضيات والتأخير، وإدارة استرداد مبالغ التأمين وإيداعها في الخزينة. |
| **تطهير الواجهات الشامل من الإيموجيز (Zero-Emoji Compliance)** | 🟢 | 100% | كافة مكونات الشحن البحري | تطهير كافة الشاشات والنوافذ والرسائل الصادرة من أي رموز كرتونية أو إيموجيز، والاعتماد الحصري على أيقونات النظام الرسمية في `AppIcons`. |

---

## 89. دستور الضبط المتوازي للنصوص والمواصفات الهندسية الطويلة (Strict Multi-line Text Justification Standard)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Editorial Typography & Institutional Contract Formatting Standard (Rule 12).
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **تأسيس القاعدة رقم 12 في دستور المنظومة (`GEMINI.md`):**
     - إلزامية تطبيق الضبط المتوازي الكامل للأسطر (`text-align: justify; text-justify: inter-word; text-align-last: start;`) على كافة النصوص والفقرات متعددة السطور، وبيانات الأعمال والمواصفات الهندسية، وبنود العقود، ويوميات الموقع.
  2. **القضاء التام على التعرج والتفاوت في الحواف (Zero Ragged Edges):**
     - في بيئة العرض العربية (RTL)، كانت نهايات الأسطر اليسرى تنتهي بأطوال وفراغات متفاوتة وعشوائية تسبب تشتتاً بصرياً.
     - تم توحيد ضبط الأسطر لتملأ العرض المتاح بدقة متناهية وتشكل كتلة مستقيمة متوازية الحواف على الجانبين (Block Alignment) مع ارتفاع سطر مريح `line-height: 1.6` يمنح النصوص مظهراً وثائقياً مؤسسياً متزناً يشبه كراسات الشروط وعقود الفيديك (FIDIC).
  3. **تأسيس كلاسات الـ CSS المركزية:**
     - إضافة كلاسات قياسية موحدة في `frontend/src/styles/partials/base.css` (`.text-justify`, `.prose-justified`, `.spec-description`) قابلة لإعادة الاستخدام في سائر شاشات وموديلات المنظومة.
  4. **التطبيق الشامل على شاشات المقاولات:**
     - جدول المقايسة الفعلي لمشاريع المقاولات (`ContractingBoqTab.tsx`).
     - بنك البنود المرجعي العام (`ContractingMasterBoqPage.tsx`).
     - جدول بنود عروض أسعار العملاء (`ClientQuotationModal.tsx`).
     - تحليل ربحية وتكاليف البنود (`BoqProfitabilityModal.tsx`).
     - بيان الأعمال المنفذة وملاحظات الموقع في اليوميات الميدانية (`ContractingDailyLogsTab.tsx`).
* **الملفات المحدثة:**
  - `d:/zn/GEMINI.md` (إضافة القاعدة الرسمية رقم 12).
  - `frontend/src/styles/partials/base.css` (تعريف الكلاسات القياسية `.text-justify`, `.spec-description`).
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx` (تطبيق الضبط المتوازي على بيان الأعمال والمواصفات).
  - `frontend/src/features/contracting/pages/ContractingMasterBoqPage.tsx` (تطبيق الضبط على مواصفات بنك البنود).
  - `frontend/src/features/contracting/components/ClientQuotationModal.tsx` (تطبيق الضبط على جدول عروض الأسعار).
  - `frontend/src/features/contracting/components/BoqProfitabilityModal.tsx` (تطبيق الضبط على بطاقة الربحية).
  - `frontend/src/features/contracting/components/ContractingDailyLogsTab.tsx` (تطبيق الضبط على الأعمال المنفذة باليوميات).

---

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

## 43. الشحن البحري وإدارة عروض أسعار الخطوط (Maritime Freight & Carrier RFQs)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/maritime-freight`, `frontend/src/features/maritime-freight`
* **الجداول في قاعدة البيانات:** `maritime_rfqs`, `maritime_rfq_bids`, `shipping_lines`, `shipping_ports`, `maritime_inquiries`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **نافذة التأكيد وتحديد جهات الإرسال لطلبات التسعير (Selective Carrier RFQ Dispatch Modal)** | 🟢 | 100% | `DispatchRfqModal.tsx`, `MaritimeRfqTab.tsx`, `MaritimeRfqsPage.tsx`, `maritime-freight.service.ts`, `maritime-freight.controller.ts` | نافذة منبثقة تفاعلية تفتح عند الضغط على زر "إرسال" لطلب التسعير؛ تعرض ملخصاً شاملاً لبيانات الشحنة ومسار الرحلة (POL/POD) ونوع وعدد الحاويات والبضاعة وشروط التعاقد، مع قائمة تفاعلية بكافة الخطوط والوكلاء الملاحيين مزودة ببحث سريع وفلاتر جغرافية وتصنيفية (صين، أوروبا، خطوط، وكلاء)، مع إمكانية تحديد واستبعاد الخطوط عبر Checkboxes، ومعاينة لنص وموضوع الرسالة الرسمية والرابط السحري قبل الإطلاق. |
| **محرك الإرسال المتوازي عبر SMTP مع كشف الردود بالذكاء الاصطناعي** | 🟢 | 100% | `maritime-freight.service.ts`, `maritime-mail.service.ts`, `settings` | إرسال رسائل RFQ عبر خادم البريد المخصص للمنشأة بمهلات اتصال سريعة وتوليد روابط سحرية مخصصة ومتابعة واستقبال الردود آلياً عبر IMAP. |

---

## 91. معمارية القوائم المنسدلة الموحدة والكومبوبوكس المركزي (Centralized Universal Combobox & CustomSelect Standard)
* **حالة المعيار العام:** 🟢 معتمد ومكتمل 100%
* **ملفات التنفيذ الأساسية:** `frontend/src/styles/partials/combobox-system.css`, `frontend/src/shared/ui/custom-select.tsx`

| الميزة والمعيار | الحالة | نسبة الإنجاز | ملفات التنفيذ | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **المكون العام الموحد (CustomSelect)** | 🟢 | 100% | `custom-select.tsx` | مكون React شامل للقوائم المنسدلة والكومبوبوكس بديل قطعي للـ native select التقليدي. يدعم البحث اللحظي، تطبيع الحروف العربية والإنجليزية (`matchesArabic`)، التنقل بلوحة المفاتيح (الأسهم، Enter، Escape، Tab)، الشارات التوضيحية (`hint`)، والأيقونات. |
| **نظام التنسيق المركزي (combobox-system.css)** | 🟢 | 100% | `combobox-system.css` | مصدر الحقيقة الأوحد لمتغيرات وتنسيقات القوائم المنسدلة (`--combobox-*`)، وظلال القوائم العائمة (`box-shadow`)، وحسابات السكرول بار الانسيابي فائق النحافة (`slim-scrollbar: 5px`)، والتأثيرات الحركية، وعزل طبقات الـ Z-Index لمنع تداخل القوائم مع البطاقات المجاورة. |
| **حظر عناصر select التقليدية** | 🟢 | 100% | `GEMINI.md` (قاعدة 13) | فرض استخدام `CustomSelect` و `combobox-system.css` في كافة الشاشات والنوافذ المنبثقة وحظر عناصر HTML البدائية لمنع تشوه الواجهات وضمان المظهر المؤسسي البريميوم (Enterprise SaaS). |

---

## 92. العزل القطاعي الشامل والتهيئة الذكية للمودات الـ 16 (Total Vertical Isolation & 16-Mode Industry Automation)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (Zero Leaks, Zero Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:**
  - الفرونت إند: `frontend/src/features/settings/components/forms/tabs/GeneralSettingsTab.tsx`, `frontend/src/features/settings/components/forms/tabs/SalesInventorySettingsTab.tsx`, `frontend/src/features/settings/components/forms/tabs/PrintingSettingsTab.tsx`, `frontend/src/shared/layout/app-shell.tsx`, `frontend/src/features/saas-admin/components/CreateTrialTenantModal.tsx`, `frontend/src/features/settings/schemas/settings.schema.ts`
  - الباك إند: `backend/src/modules/saas-admin/trial-tenant-provisioning.service.ts`
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **الشمولية الكاملة لكافة الأنشطة (16 Business Industry Modes):**
     - التغطية الفورية لـ 16 قطاعاً ونشاطاً تشغيلياً: نشاط تجاري عام، تجزئة ومحلات، سوبر ماركت ومواد غذائية، مطاعم ومأكولات، كافيهات ومقاهي، صيدليات وأدوية، إلكترونيات وأجهزة، صيانة وهواتف، عطارة ومحامص، عطور ومستحضرات، ملابس وموضة، شحن بحري ولوجستيات، مقاولات وإنشاءات، أجهزة كهربائية وتقسيط، استيراد وتصدير وتخليص جمركي، خدمات واستشارات وإدارة أعمال.
  2. **القضاء التام على تسريب إعدادات نقاط البيع (Zero-Leak POS Settings Gating):**
     - تم إغلاق وحجب كافة إعدادات نقاط البيع (`showPosSettings`) عن الأنشطة غير المعتمدة على الكاشير كالمقاولات والشحن والخدمات والاستيراد، وشمل ذلك: إقفال الوردية الإجباري، خيارات وسقف خصم الكاشير، رسوم التوصيل والدليفري، أجهزة نقاط البيع ومدفوعات البطاقات POS Terminals، وبرامج نقاط المكافآت والولاء.
  3. **عزل الرقابة المخزنية وتنبيهات الجرد للقطاع الخدمي:**
     - حجب إعدادات تنبيهات الجرد والحد الأدنى للنواقص (`showPhysicalInventory`) عن الشركات الاستشارية والخدمية التي لا تتعامل مع بضاعة ملموسة.
  4. **أقسام إعدادات متخصصة لكل قطاع استثماري:**
     - **المقاولات:** ضبط نسبة الدفعة المقدمة المستقطعة، ونسبة ضمان الأعمال المحتجز (Retention).
     - **الشحن واللوجستيات:** ضبط أيام السماح المجانية لتأخير الحاويات (Demurrage Free Days)، وتحديد عملة تسعير النولون الدولية القياسية.
     - **الاستيراد والتصدير:** أساس توزيع تكاليف الشحن والمصاريف الجمركية على الشحنات (قيمة / وزن / حجم)، والربط الآلي لمصروفات الاعتمادات المستندية.
     - **الخدمات والاستشارات:** نمط الفوترة المعتمد (دفعات إنجاز مراحل / اشتراكات مستمرة Retainer)، وتنبيهات تجديد العقود السنوية الدورية.
  5. **عزل إعدادات الطباعة والفواتير:**
     - حصر خيارات الطابعات الحرارية وإيصالات الكاشير وطابعات المطبخ KOT على أنشطة التجزئة والمطاعم، وضبط نوع الفاتورة الافتراضي للأنشطة الكبرى والخدمية على الورق الرسمي A4.
  6. **عزل القوائم الجانبية ومساحات العمل المستقلة (Dedicated Workspaces):**
     - تخصيص مساحات عمل منفصلة بالقائمة الجانبية والشريط السريع لكل نشاط (`isDedicatedContractingOnly`, `isDedicatedMaritimeOnly`, `isDedicatedImportOnly`, `isDedicatedServicesOnly`) مع حجب كافة الروابط الشاذة عن كل نشاط ليشعر كل عميل أن النظام صُمم خصيصاً له وحده.
  7. **الالتزام بالقاعدة 13 وتحويل كافة القوائم المنسدلة إلى CustomSelect:**
     - استبدال كافة عناصر `<select>` التقليدية في فورم الإعدادات ونافذة إنشاء الشركات التجريبية بالمكون الموحد `CustomSelect` لتحقيق تجربة مستخدم مؤسسية متسقة.
  8. **العزل الديناميكي لشريط وتبويبات الإعدادات العامة (Dynamic Settings Tabs Gating):**
     - **التجارة الإلكترونية والمنصات (`storefront` & `marketplaces`):** حجب التبويب بالكامل وتوجيه مساراته تلقائياً إذا لم يكن موديول المتجر الإلكتروني مفعلاً في إعدادات المنشأة أو باقة المستأجر (`storefrontModuleEnabled`).
     - **المراقبة ورصد السيرفر (`monitoring` - APM):** حصر التبويب بسوبر أدمن منصة الإدارة المركزية وحجبه عن كافة المستأجرين.
     - **الإصدارات والتحديثات والشبكة المحلية (`system-updates` & `lan-network`):** إخفاؤها تلقائياً على خوادم السحابة (Cloud VPS) وحصرها بالنسخ الأوفلاين المكتبية (`isDesktopOfflineApp`).

---

## 93. دستور بيئات العمل التفاعلية ومنع وميض وتصفير العدادات (Workspace Keep-Alive & Anti-Flicker Architecture)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري والمعماري (Zero-Flicker, Keep-Alive State & Instant Memory Cache).
* **مسارات الكود الأساسية:**
  - توجيه المسارات الموحد: `frontend/src/features/maritime-freight/routes.tsx`, `frontend/src/features/contracting/routes.tsx`
  - تخطيط بيئة العمل الحية بالذاكرة: `frontend/src/features/maritime-freight/pages/MaritimeLayout.tsx`, `frontend/src/features/contracting/pages/ContractingLayout.tsx`
  - كاش الذاكرة والـ Session Storage: `frontend/src/features/maritime-freight/context/MaritimeContext.tsx`
  - التوثيق والدستور: `GEMINI.md` (البند 15)، `AGENTS.md` (البند 5)
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **القضاء التام على وميض وتصفير أرقام وشارات التابات (Zero Badge Flicker):**
     - تم القضاء نهائياً على مشكلة إعادة تصفير العدادات (`Counts resetting to 0`) عند التنقل بين أقسام بيئة العمل (مثل استفسارات العملاء، طلبات التسعير RFQs، مقارنة عروض الخطوط، عروض الأسعار، أوامر التشغيل، وتتبع الحاويات).
  2. **معمارية المسار الموحد للموديول (Single Unified Route):**
     - منع تسجيل تابات الموديول كمسارات منفصلة تعيد هدم وبناء شجرة المكونات والـ Providers (`Unmount/Remount`)، والاعتماد حصرياً على مسار بيئة العمل الموحد (`workspace` و `workspace/*`).
  3. **تقنية التابات الحية بالذاكرة (Keep-Alive via CSS Display):**
     - الحفاظ على كائن كل صفحة حياً في شجرة الدوم وتبديل العرض عبر `style={{ display: isTabActive(tabId) ? 'block' : 'none' }}`، مما يوفر تنقلاً لحظياً وفورياً بزمن استجابة **0 مللي ثانية** مع الحفاظ على مدخلات النماذج غير المحفوظة وحالة التمرير.
  4. **كاش الذاكرة والتخزين اللحظي للعدادات (Memory & Session Hydration):**
     - بدء حالة الـ Context بقيم كاش الذاكرة والـ Session Storage (`zs_maritime_counts`) لتجنب ظهور الرقم صفر نهائياً حتى عند فتح الصفحة لأول مرة أو بعد التحديث (Reload).
  5. **التحديث الهادئ في الخلفية (Silent Background Revalidation):**
     - جلب العدادات في الخلفية وتحديثها بسلاسة دون تشويش على المستخدم أو إظهار شاشات انتظار وسيطة تقطع تدفق العمل.

---

## 94. دستور العرض القياسي الموحد 1280px وحظر تذبذب العرض وضغط الجداول (Universal 1280px Layout & Zero-Jumping Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري والمعماري (Universal 1280px Width, Zero Width-Jumping & Compressed Clean Cards).
* **مسارات الكود الأساسية:**
  - معيار الحاويات العام: `frontend/src/styles/partials/document-form-prototype.css` (`.document-prototype-column`)
  - تخطيط بيئات العمل: `frontend/src/features/contracting/pages/ContractingLayout.tsx`
  - التابات المحدثة والمضغوطة: `frontend/src/features/contracting/components/ContractingProjectsTab.tsx`, `ContractingBoqTab.tsx`, `ContractingFinancialsPage.tsx`, `ContractingProcurementPage.tsx`, `ContractingFieldPage.tsx`
  - التوثيق والدستور: `GEMINI.md` (البند 16)، `AGENTS.md` (البند 6)
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **تثبيت العرض القياسي الموحد (Universal 1280px Container):**
     - تم توحيد الحد الأقصى لعرض كافة الشاشات وبيئات العمل والتابات الداخلية في المنظومة ليكون دائماً **1280px** (`max-width: 1280px; width: min(100%, 1280px); margin: 0 auto;`).
  2. **القضاء النهائي على تذبذب وتغير عرض الصفحة عند التنقل بين التابات (Zero Width-Jumping):**
     - حل مشكلة تمدد الـ Grid الأب بسبب محتوى الجداول العريضة في بعض التابات، عبر تطبيق `grid-template-columns: minmax(0, 1fr);` مع `min-width: 0` لكافة الحاويات الفرعية والتابات، مما يمنع الجداول من دفع الحاوية الأب للتمدد ويحافظ على ثبات العرض بنسبة 100% عند التبديل بين التابات.
  3. **الضغط المؤسسي للجداول واحتواء البيانات داخل البطاقة (Zero Clipping Table Fit):**
     - ضغط واختصار عناوين أعمدة الجداول الكبرى (مثل سجل المشاريع) إلى مسميات موجزة وواضحة (مثل: `الكود`، `المشروع والموقع`، `العميل`، `المدير`، `التعاقد الأصلي`، `القيمة المعدلة`، `الدفعة المقدمة`، `الحالة`، `الصحة`، `الإجراءات`).
     - ضبط المسافات الأفقية للخلايا (`padding: 10px 8px`) وتحديد نسب توزيع الأعمدة عبر `<colgroup>` بدقة بالغة (إجمالي عرض ~1070px داخل بطاقة الـ 1280px)، واختصار أزرار الإجراءات السريعة إلى كبسولات مضغوطة أنيقة (`المقايسة`, `المستخلصات`, `تراخيص`) لضمان ظهور كافة البيانات وأزرار التحكم بالكامل داخل البطاقة مع انعدام أي اقتطاع (0px Clipping) أو حاجة للتمرير الأفقي غير المرغوب فيه.

---

## 95. دستور وثبات أبعاد النوافذ المنبثقة التلقائي (Universal Anti-Ballooning & Anti-Shrink Modal Architecture)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومدمج في البنية التحتية المركزية للمنظومة (Zero Layout Shift, Automatic Stable Sizing, Universal Anti-Ballooning & Anti-Shrinking Standard).
* **مسارات الكود الأساسية والبنية الجذرية:**
  - المكون الجذري الموحد: `frontend/src/shared/components/StandardDialog.tsx`
  - محرك غلاف النوافذ: `frontend/src/shared/components/dialog-shell.tsx`
  - التنسيقات المركزية الموحدة: `frontend/src/styles/partials/global-dialog-shell.css`
  - التوثيق الدستوري الإلزامي: `GEMINI.md` (البند 17)، `AGENTS.md` (البند 7)
* **القاعدة الهندسية المركزية (Universal Foundation Standard):**
  بدلاً من معالجة كل نافذة منبثقة يدوياً، تم نقل وتعميم القواعد الرياضية والهندسية لثبات الأبعاد إلى صلب المكون الجذري `StandardDialog` والتنسيق العام `global-dialog-shell.css` بحيث ترثها كافة بوب-أبات المنظومة تلقائياً:
  1. **الأبعاد المتزنة الافتراضية التلقائية (Default Pre-balanced Dimensions):**
     - تم ضبط القيمة الافتراضية لارتفاع أي بوب اب في النظام تلقائياً لتكون `minHeight = 'min(560px, 85vh)'` والعرض `min(840px, 95vw)` في الفريم الأول (Frame 0)، وممنوع نهائياً أن تفتح أي نافذة بحجم منخسف (100px) ثم تتضخم (Anti-Ballooning).
     - يمكن تجاوز هذه القيمة فقط للنوافذ التأكيدية الصغيرة المخصصة عبر `minHeight="auto"`.
  2. **تثبيت جسم النافذة ومساحة التنفس (`.standard-dialog-body`):**
     - فرض `flex: 1` و `minHeight: 280px` تلقائياً على جسم النافذة، مما يمنع انكماش النافذة لأسفل عند خلو البيانات أو قلة السطور (Anti-Shrinking).
  3. **دعم خاصية التحميل المركزية التلقائية (`loading` & `loadingText`):**
     - دعم خاصية `loading={boolean}` في المكون الأب `StandardDialog` مباشرة لعرض مؤشر تحميل مركزي متناسق مع تثبيت الأبعاد، دون حاجة المطور لكتابة سبينرات مكررة.
  4. **المعيار التلقائي لجداول النوافذ المنبثقة (Universal Modal Tables CSS):**
     - أي جدول يوضع داخل أي نافذة منبثقة يأخذ تلقائياً في الـ CSS العام:
       - تثبيت رأس الجدول `position: sticky; top: 0; z-index: 2; background: #f8fafc;`
       - حد أقصى للتمرير الداخلي في حاويات الجداول مع `overflow-y: auto`.
  5. **جاهزية واستقرار كافة نوافذ المقايسة والمقاولات (`/contracting/boq`):**
     - تطهير كافة نوافذ المقايسة: حصر الخامات MRP، تسعير البنود AutoPricing، عرض سعر العميل المالي الرسمي، تجميد خط الأساس Baseline Lock، حصر كميات الكاد Takeoffs، تجهيز الموقع Mobilization، تتبع المعدات، دليل الموردين، واستيراد الإكسيل بنسبة 100% ودون أدنى رعشة بصرية.

---

## 96. منظومة أتمتة البريد الملاحي والأرشفة التلقائية في مجلد المرسل (Maritime Email Automation & IMAP Sent Archiving)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في خوادم الشحن واللوجستيات (Auto Inbound Bids Parsing, Multi-carrier RFQ Dispatch & IMAP Sent Folder Archiving).
* **مسارات الكود الأساسية:**
  - خدمة البريد الملاحي: `backend/src/modules/maritime-freight/maritime-mail.service.ts`
  - محرك الشحن البحري: `backend/src/modules/maritime-freight/maritime-freight.service.ts`
  - موديول الخدمات: `backend/src/modules/maritime-freight/maritime-freight.module.ts`
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **الأرشفة التلقائية في مجلد البريد المرسل (`IMAP APPEND to Sent Folder`):**
     - حل المشكلة التي كانت تجعل مجلد "Sent" في الويب ميل (مثل هوستنجر أو آوتلوك) فارغاً عند إرسال طلبات التسعير بالـ SMTP البرمجي.
     - تطوير محرك `appendSentEmailToImap` الذي يكتشف تلقائياً مجلد المرسل الخاص بالسيرفر (سواء كان `INBOX.Sent` أو `Sent` أو يحمل راية `\Sent`)، وينسخ نسخة طبق الأصل من الرسالة (RFC822) فوراً في مجلد المرسل.
     - ظهور كافة المراسلات الصادرة في هواتف الموظفين وتطبيقات Outlook وموقع الويب ميل بشفافية وسجل تدقيق قانوني (Audit Trail) كامل.
  2. **محرك الاستقبال وفك التشفير الآلي لردود الخطوط الملاحية (Inbound IMAP Parser):**
      - قراءة وفحص صندوق الوارد آلياً واستخراج أسعار النولون البحري (Ocean Freight)، أيام السماح (Free Days)، مصاريف الموانئ (Origin/Dest THC)، ومدة الإبحار، وإدراجها مباشرة في مصفوفة عروض الأسعار للمقارنة واتخاذ القرار.

---

## 97. التطوير البريميوم لنافذة إصدار عرض سعر العميل الملاحي (Maritime Freight Quotation & Profit Margin Modal)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق تماماً لدستور النظام البصري (0 Emojis, Clean Enterprise SaaS, Universal Select & Dialog Shell Standards).
* **مسارات الكود الأساسية:**
  - المكون المحدث: `frontend/src/features/maritime-freight/components/ApplyMarginModal.tsx`
  - شاشة الوصول: مسار مصفوفة الشحن البحري `/maritime/matrix` (زر "تطبيق الهامش وإصدار عرض السعر").
* **الترقيات والتحسينات البصرية والتشغيلية المطبقة:**
  1. **التخلص التام من البنرات القاتمة (Elimination of Dark Banners):**
     - استبدال الصندوق البنفسجي/الكحلي الداكن بنظام البطاقات المؤسسية الساطعة (Enterprise SaaS White Cards) ذات الإطار الكحلي الخفيف والحد العلوي الملكي المميز (`borderTop: 3px solid #170e5e`)، وفقاً للبند 4 في `GEMINI.md`.
  2. **اعتماد نظام الكومبوبوكس الموحد (`CustomSelect`):**
     - استبدال عنصر HTML التقليدي `<select>` بمكون الكومبوبوكس القياسي الموحد `CustomSelect` لتحديد نوع الهامش (مبلغ مقطوع ثابت أو نسبة مئوية) مع دعم التطبيع والبحث ومنع تشوه الواجهة، وفقاً للبند 13 في `GEMINI.md`.
  3. **بطاقة ملخص تسعيرة الخط الملاحي المعتمد:**
     - عرض بطاقة علوية متزنة وأنيقة توضح اسم الخط الملاحي بأيقونة السفينة الرسمية (`ShipIcon`)، رقم طلب الـ RFQ، والتكلفة الأصلية بالدولار، ومسار الشحن (POL إلى POD)، والحمولة، وأيام السماح، ومصاريف الـ THC.
  4. **بطاقة المعاينة المالية الثلاثية الفورية (3-Column Financial Matrix):**
     - تقسيم مالي متزن ومحكم بدون أي تشويش لوني:
       - عمود التكلفة الأصلية للخط الملاحي (Base Cost).
       - عمود هامش الربح المستهدف (Margin Markup) باللون الأخضر المؤسسي المتزن.
       - عمود إجمالي عرض السعر النهائي للعميل بالدولار، مع المعادِل التلقائي بالعملة المحلية للمنشأة (باستخدام `useSystemCurrency`).
  5. **إعادة هيكلة أزرار الإجراءات في تذييل النافذة (Unified Footer Actions):**
     - التخلص من الزر الأخضر الفاقع العشوائي الذي كان يشغل مساحة عريضة داخل جسم النافذة.
     - دمجه بانسيابية في فوتر النافذة القياسي بجانب زر الإلغاء، وزر "حفظ وتوليد عرض السعر" الأساسي، مع تفعيل المشاركة اللحظية المنظمة عبر واتساب برسالة منسقة احترافية تتضمن كافة تفاصيل ومراجع العرض.

---

## 98. منظومة إشعارات التوست المؤسسية ودرع اعتراض الـ Alerts الخام (Universal Toast Framework & Global Alert Shield)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومدمج في جذر التطبيق المركزي (Zero Native Alerts, Thread-Safe, Global Browser Alert Interceptor & High-End Enterprise Toasts).
* **مسارات الكود الأساسية:**
  - محرك التوست والتنبيهات الموحد: `frontend/src/shared/components/system-alert.tsx`
  - التنسيقات المركزية: `frontend/src/styles/partials/global-dialog-shell.css`
  - مزود الجذر: `frontend/src/app/providers.tsx`
  - التوثيق الدستوري: `GEMINI.md` (البند 18)، `AGENTS.md` (البند 8).
* **المشكلة المعمارية المعالجة (The Native Browser Alert Anti-Pattern):**
  - ظهور نوافذ المتصفح الرمادية البدائية `localhost:5173 says` التي تجمد خيط الواجهة (UI Freezing) وتقطع عمل المستخدم وتكسر التناسق المؤسسي، مع وجود أكثر من 70 استدعاء لـ `alert()` متفرقة في شاشات المبيعات، الحسابات، الشحن، والمخازن.
* **الحلول والترقيات المنفذة:**
  1. **درع الاعتراض العام التلقائي (Global Alert Interceptor Shield):**
     - تم تفعيل معترض تلقائي في `SystemAlertProvider` يقوم باعتراض أي استدعاء قديم أو غير مقصود لدالة `window.alert(...)` في أي موديول في المنظومة بالكامل فورياً، وتحويله تلقائياً دون أي تجميد للشاشة إلى إشعار Toast أنيق.
     - فاحص ذكي للنصوص (Smart Heuristic Analyzer) يحدد تلقائياً نوع التوست (أحمر للخطأ عند وجود كلمات مثل "فشل/تعذر/خطأ"، أخضر للنجاح عند وجود كلمات مثل "تم/بنجاح/حفظ"، برتقالي للتحذير عند وجود "يرجى/تنبيه"، وكحلي للمعلومات العامة).
  2. **منظومة التوست الموحدة للمطورين (`toast` API):**
     - توفير واجهة برمجية فائقة البساطة وسريعة الاستدعاء:
       - `toast.success('رسالة النجاح', 'عنوان اختياري')`
       - `toast.error('رسالة الخطأ')`
       - `toast.warning('تنبيه للمستخدم')`
       - `toast.info('معلومة عامة')`
  3. **الهوية البصرية المتوافقة مع الدستور:**
     - ظهور التوست في أعلى منتصف الشاشة (`top: 24px`) بتصميم مؤسسي نظيف بخلفية بيضاء نقية وظلال ناعمة وإطار ملون هادئ وأيقونات SVG رسمية من `@/shared/components/icons/AppIcons`، واختفاء تلقائي بانسيابية بعد 3.5 إلى 5 ثوانٍ، مع زر إغلاق فوري (X).
  4. **تطهير شامل لملفات الشحن واللوجستيات:**
     - استبدال كافة استدعاءات `alert` في شاشات الملاحية (`MaritimeMatrixPage`, `MaritimeInquiriesPage`, `MaritimeQuotationsPage`, `MaritimeMasterDataTab`, `JobDetailsModal`, `PublicCarrierQuotePage`) بالـ `toast` الصريح بنسبة 100%.

---

## 99. معيار أزرار التحديث التفاعلية الحية وتزامن البيانات (Interactive Live Refresh Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في بيئات العمل (Interactive Spin Animation, Multi-layer Data Invalidation & Toast Confirmation).
* **مسارات الكود الأساسية:**
  - موديول الشحن الملاحي: `MaritimeLayout.tsx`, `MaritimeContext.tsx`, `MaritimeMatrixPage.tsx`, `MaritimeInquiriesPage.tsx`, `MaritimeQuotationsPage.tsx`, `MaritimeRfqsPage.tsx`, `MaritimeJobsPage.tsx`, `MaritimeContainersPage.tsx`.
  - موديول المقاولات: `ContractingLayout.tsx`.
  - موديول المشتريات: `PurchaseOrdersPage.tsx`.
  - موديول المبيعات: `SalesOrdersPage.tsx`.
  - موديول الاستيراد والشحنات: `ShipmentsManager.tsx`.
* **المشكلة المعالجة (The Phantom Refresh Button Anti-Pattern):**
  - وجود زر "تحديث" في هيدر الصفحات بدون أي تفاعل بصري (لا يدور، ولا يتغير نصه، ولا يظهر أي إشعار توست)، مما يعطي انطباعاً زائفاً للمستخدم بأنه "معطل ولا يعمل".
  - الاكتفاء بتحديث عدادات الكروت العلوية في الخلفية دون إعادة جلب بيانات الجداول المعروضة في التبويب النشط.
* **الحلول والترقيات المنفذة:**
  1. **التغذية البصرية اللحظية (Immediate Visual Feedback):**
     - عند النقر على "تحديث"، تبدأ أيقونة `RefreshCwIcon` بالدوران الانسيابي فائق السرعة عبر CSS Animation (`animation: spin 0.7s linear infinite`).
     - تحول نص الزر مؤقتاً إلى `جارٍ التحديث...` مع تعطيل النقر المتكرر (`cursor: wait` و `disabled={isRefreshing}`).
  2. **إعادة جلب عميقة وشاملة (Deep Cascade Revalidation):**
     - إدخال مفتاح التحديث اللحظي (`refreshKey`) في سياق العمل (`MaritimeContext`)؛ فور انتهاء التحديث يتم رفع قيمة المفتاح مما يطلق تلقائياً طلبات إعادة الجلب لكافة جداول التبويبات النشطة (عروض الأسعار، طلبات التسعير، أوامر التشغيل، الحاويات).
  3. **إشعار التأكيد السريع بالتوست (Success Toast Confirmation):**
     - بمجرد اكتمال الجلب، تظهر رسالة توست خضراء راقية (`toast.success('تم تحديث البيانات والمؤشرات بنجاح')`) تؤكد للمستخدم اكتمال التحديث وتختفي بعد ثانيتين ونصف.

---

## 100. منظومة نوافذ التأكيد التفاعلية المؤسسية وتطهير المتصفح من confirm البدائية (Universal Promise-based systemConfirm & Zero Native Confirm Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومدمج في جذر التطبيق المركزي (Promise-based Async Confirmation Modal, Thread-Safe, RTL, 0 Emojis & High-End Royal Navy Z-Systems Identity).
* **مسارات الكود الأساسية:**
  - محرك النوافذ والتأكيدات المركزي: `frontend/src/shared/components/system-alert.tsx`
  - شاشة عروض أسعار الشحن: `frontend/src/features/maritime-freight/pages/MaritimeQuotationsPage.tsx`
  - نافذة تفاصيل أمر التشغيل الملاحي وإذن التسليم: `frontend/src/features/maritime-freight/components/JobDetailsModal.tsx`
  - تبويب الدليل القياسي للشحن وحذف الشركاء: `frontend/src/features/maritime-freight/components/MaritimeMasterDataTab.tsx`
  - التوثيق الدستوري: `GEMINI.md` (البند 18)، `AGENTS.md` (البند 8).
* **المشكلة المعمارية المعالجة (The Native confirm() Anti-Pattern):**
  - عند قيام المستخدم بالنقر على زر "تحويل لأمر تشغيل" أو "اعتماد إذن التسليم الملاحي D/O" أو "حذف شريك ملاحي"، كان يظهر مربع حوار المتصفح الرمادي البدائي `localhost:5173 says: هل ترغب في تعميد عرض السعر... [OK] [Cancel]`.
  - هذا السلوك يكسر التجربة المؤسسية للـ Enterprise SaaS ويتعارض مع روح وهوية المنظومة المعتمدة.
* **الحلول والترقيات المنفذة:**
  1. **محرك التأكيد غير المتزامن المعتمد على الـ Promise (`systemConfirm` API):**
     - تم بناء وتصدير دالة `systemConfirm(options: ConfirmOptions | string): Promise<boolean>` من `@/shared/components/system-alert`.
     - الدالة تقبل إما نصاً بسيطاً أو كائناً يحتوي على:
       - `title`: عنوان النافذة التوضيحي (مثال: 'تعميد عرض السعر وأمر التشغيل').
       - `message`: نص رسالة التأكيد الواضحة والمحاذاة بدقة.
       - `confirmText`: نص زر الإجراء الأساسي (مثال: 'تأكيد التحويل وأمر التشغيل').
       - `cancelText`: نص زر التراجع (مثال: 'تراجع').
       - `variant`: النمط البصري (`primary` الملكي الكحلي `#170e5e` أو `danger` القرمزي `#dc2626`).
     - ترجع الدالة `Promise<boolean>` يتم حله فور نقر المستخدم على "تأكيد" (`true`) أو "إلغاء" (`false`) دون تجميد المتصفح.
  2. **الهوية البصرية المؤسسية الفاخرة (Executive Z-Systems Modal Standard):**
     - النافذة تعتمد حصرياً على `DialogShell` النظيف بخلفية بيضاء نقية وإطار ناعم وظلال مدروسة بعناية (`width="min(520px, 94vw)"`).
     - **حاوية الأيقونة التنفيذية (Executive Icon Container):** إطار مربع مستدير الحواف (`56x56px` مع `borderRadius: 16px`) بتدرج لوني ناعم وظلال خفيفة وإطار مزدوج، وأيقونات رسمية موحدة من `@/shared/components/icons/AppIcons` (0 Emojis).
     - **كبسولة الكود المرجعي (Monospace Pill Badge):** إبراز رقم العرض أو أمر التشغيل أو كود الشريك تلقائياً في شارة كود مستقلة بلون كحلي بارز (`fontFamily: monospace`) لتمييز الكود فورياً.
     - **بطاقة الأثر التشغيلي (Operational Impact Sub-card):** صندوق معلومات خفيف ومؤسسي (`#f8fafc`) يوضح للمستخدم بشكل نقاط واضحة النتائج المترتبة على قراره (مثل: فتح ملف شحنة رسمي، تحويل حالة العرض إلى معتمد، بدء مراحل تتبع DCSA).
     - **توازن وفخامة أزرار التحكم:** زر التراجع الثانوي بحدود هادئة (`#cbd5e1` بارتفاع `42px`)، وزر التأكيد الأساسي الكحلي الملكي (`#170e5e`) بظل ناعم ثلاثي الأبعاد يعطي وقاراً وهيبة للمنظومة.
  3. **تطهير شامل لملفات الشحن الملاحي:**
     - استبدال كافة استدعاءات `confirm(...)` و `window.confirm(...)` في `MaritimeQuotationsPage.tsx`, `JobDetailsModal.tsx`, و `MaritimeMasterDataTab.tsx` بمحرك `await systemConfirm(...)` المطور.
  4. **درع الحماية الشامل واعتراض الـ confirm البدائي (Dual Global Persistence & Zero-Native Shield):**
     - ربط محرك `systemConfirm` بكائن `window.__ZS_GLOBAL_CONFIRM__` لضمان صموده أمام أي إعادة تحميل لحظي (Vite HMR) أثناء التطوير دون أن يتصفر إلى `null`.
     - استئصال كود الـ Fallback الذي كان يستدعي `window.confirm` البدائية نهائياً.
     - اعتراض استدعاءات `window.confirm(...)` على مستوى كائن المتصفح العالمي ومنع ظهور المربع الرمادي الخام للمتصفح تحت أي ظرف، وتحويله تلقائياً للنافذة المؤسسية أو التوست الفوري.
  5. **إزالة زر استعادة الدليل الافتراضي الخطير (Dangerous Reset Button Elimination):**
     - تم حذف زر "استعادة الدليل القياسي" من الشريط العلوي لشاشة الخطوط والوكلاء نهائياً لمنع أي نقرات عشوائية تعيد توليد الخطوط الافتراضية فوق التعديلات المخصصة للمنشأة، حيث يتم توليد الدليل الافتراضي تلقائياً عند أول تشغيل للمنشأة في الباك إند فقط.

---

## 101. معيار المحاذاة العمودية الصارمة لأزرار الإجراءات وشارات الجداول (Strict Column Alignment & Action Grid Slots Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات المنظومة (Fixed Table Layout, Colgroup Geometry, 3-Column Action Grid & Center-aligned Badges).
* **مسارات الكود الأساسية:**
  - جدول عروض أسعار الشحن: `frontend/src/features/maritime-freight/components/MaritimeQuotationsTab.tsx`
* **المشكلة البصرية المعالجة (The Floating Action Button Anti-Pattern):**
  - عند اختلاف حالات السجلات (مثل تحول عرض سعر إلى أمر تشغيل)، كانت الأزرار غير المتاحة تختفي دون حجز مساحتها، مما يتسبب مع `justify-content: center` في طفو زر "واتساب" المتبقي في منتصف الخلية، وتذبذب مواقع الأزرار بين السطور وعدم محاذاتها رأسياً تحت بعضها، مما يكسر الاتساق البصري للجدول.
* **الحلول والترقيات المنفذة:**
  1. **هندسة الجدول الثابت وتوزيع الأعمدة (`tableLayout: fixed` & `<colgroup>`):**
     - فرض أبعاد صارمة لكل عمود في الجدول (`الحالة`: 130px، `الإجراءات`: 275px) مع محاذاة موحدة للرؤوس والخلايا.
  2. **نظام خانات الإجراءات الشبكي الثابت (3-Column Action Grid Slots):**
     - تحويل حاوية الأزرار إلى شبكة منضبطة بأعمدة ثابتة: `gridTemplateColumns: '115px 64px 64px'` مع فجوة متناسقة `6px`.
     - **الخانة 1 (115px):** مخصصة دائماً للإجراء التشغيلي الرئيسي (زر "تحويل لأمر تشغيل" الكحلي في المسودات، أو زر "عرض أمر التشغيل" البنفسجي عند التعميد لنقل المستخدم فوراً لملف الشحنة عبر `navigate`).
     - **الخانة 2 (64px):** مخصصة دائماً لزر "واتساب" الأخضر في نفس الموضع الأفقي بالضبط لكل السطور.
     - **الخانة 3 (64px):** مخصصة لزر "اعتماد" في المسودات، مع حجز نفس العرض فارغاً (Placeholder) في العروض المعتمدة لمنع أي زحزحة للأزرار المجاورة.
  3. **محاذاة شارات الحالة في المنتصف تماماً:**
     - توسيط شارات الحالة ("مسودة"، "تحول لأمر تشغيل"، "مرسل للعميل") رأسياً وأفقياً تحت عنوان العمود دون أي انحراف جانبي.
  4. **السنترة الأفقية والرأسية الشاملة لكافة أعمدة الجدول (Full Horizontal & Vertical Centering):**
      - ضبط محاذاة كافة رؤوس الأعمدة (`th`) وخلايا البيانات (`td`) لتكون في المنتصف تماماً أفقياً ورأسياً (`textAlign: 'center'`, `verticalAlign: 'middle'`).
      - شمل ذلك: كود ورقم العرض، اسم العميل وهاتفه، التكلفة الأساسية، الهامش الربحي (مع تطهير الكسور الزائدة ليظهر `100%` بدلاً من `100.0000%`)، السعر النهائي، الحالة، والإجراءات.

---

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

## 103. معيار ثبات أبعاد نافذة أمر التشغيل وتوحيد ارتفاع التابات (JobDetailsModal Stable-Sizing & Anti-Shrink Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات الشحن الملاحي (Pre-balanced Min-Height, Zero Tab-Jumping, CustomSelect Milestone Dropdown & Pre-flight Loading Shell).
* **مسارات الكود الأساسية:**
  - نافذة ملف أمر التشغيل الملاحي: `frontend/src/features/maritime-freight/components/JobDetailsModal.tsx`
* **المشكلة البصرية المعالجة (The Shrinking & Jumping Popup Anti-Pattern):**
  - عند فتح نافذة ملف أمر التشغيل `JobDetailsModal` والتنقل بين التبويبات الأربعة (`بيانات الرحلة والحجز`، `الحاويات`، `مسار التتبع DCSA`، `ربحية العملية`):
  - كان حجم النافذة ينكمش بشدة عند الانتقال لتبويب الحاويات أو الربحية في حال قلة العناصر (حاوية واحدة أو اثنتين) ليصل إلى ~350px، ثم يتمدد ويقفز فجأة إلى ~650px عند الانتقال لتبويب مسار التتبع أو بيانات الرحلة، مما يسبب اهتزازاً بصرياً مزعجاً وانعداماً للاستقرار.
* **الحلول والترقيات الهندسية المنفذة:**
  1. **التحديد الصارم للأبعاد المؤسسية الموسعة (`width="min(1080px, 95vw)"` و `height="min(760px, 90vh)"`):**
     - تم تطوير المكون المعياري `DialogShell` و `StandardDialog` لدعم خاصية `height` الصريحة وليس فقط `minHeight`، وتوسيع أبعاد النافذة إلى 1080px عرضاً و 760px ارتفاعاً، مما يضمن عرض جدول الحسابات بالكامل وبطاقات المؤشرات وشريط مركز التكلفة بدون أي سكرول مزعج (Zero Scroll Standard) مع الاستفادة الكاملة من شاشات سطح المكتب.
  2. **احتواء التمرير الداخلي للتبويبات (`flex: 1; overflow-y: auto`):**
     - تثبيت الهيدر وأزرار التبويبات وأزرار الفوتر في أماكنها تماماً، مع جعل منطقة محتوى التبويب تتمدد لملء الارتفاع المتبقي (`flex: 1; min-height: 0`) وتتعامل مع المحتوى الداخلي عبر التمرير النظيف، مما يمنع نهائياً تضخم أو انكماش النافذة عند اختلاف كثافة البيانات بين التبويبات.
  3. **هيكل التحميل المسبق المتزن (Pre-flight Loading Shell):**
     - فتح النافذة فوراً بأبعادها النهائية الكاملة مع سبينر التحميل المعتمد أثناء جلب تفاصيل العملية الملاحية من السيرفر، لمنع فتح النافذة بهيكل فارغ ثم تمددها على مرحلتين.
  4. **ترقية قائمة اختيار المرحلة الملاحية (CustomSelect Dropdown):**
     - استبدال عنصر `<select>` التقليدي في تبويب التتبع DCSA بالقائمة المنسدلة المؤسسية الموحدة `CustomSelect` المتوافقة مع هوية المنظومة.
  5. **الترقية البريميوم لتبويب ربحية العملية (Executive Job P&L Dossier & Zero Dark Banners):**
     - إلغاء البانر الكحلي الداكن ذو الأرقام الفوسفورية الذي يخالف دستور النظام البصري، واستبداله بـ 3 بطاقات مؤشرات بيضاء ناصعة (`Clean White KPI Cards`) بحدود علوية ملونة تعكس الإيرادات والتكاليف وهامش الربح الحقيقي.
     - بناء جدول تفصيلي مؤسسي للحسابات الملاحية (`Financial Ledger Breakdown`) يفكك نولون الشحن، مصروفات الموانئ والـ THC، وتأمينات الحاويات المستردة مع أطرافها وحالاتها المحاسبية.
     - إعادة تصميم شريط مركز التكلفة والربط مع دليل الحسابات العام (`GL Integration Bar`) بتصميم شبكي ووسوم استحقاق القيود المزدوجة بدلاً من النص الرمادي الخام.


---

## 104. ترقية وإكمال تبويبات الشحن البحري التشغيلية (Maritime Freight Operational Tabs Upgrade)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات الشحن الملاحي (Maritime Containers Tracking, Master Data & Email Automation).
* **مسارات الكود الأساسية:**
  - رادار تتبع الحاويات وفترات السماح: `frontend/src/features/maritime-freight/components/MaritimeContainersTab.tsx`
  - نافذة تحديث محطات دورة حياة الحاوية: `frontend/src/features/maritime-freight/components/ContainerMilestoneModal.tsx`
  - صفحة الحاويات الميدانية: `frontend/src/features/maritime-freight/pages/MaritimeContainersPage.tsx`
  - دليل الخطوط والوكلاء والموانئ: `frontend/src/features/maritime-freight/components/MaritimeMasterDataTab.tsx`
  - أتمتة المراسلات والبريد وإعدادات الربط: `frontend/src/features/maritime-freight/components/MaritimeSettingsTab.tsx`
* **الميزات والتحسينات المضافة:**
  1. **رادار فترات السماح المرئي وشريط الفلاتر السريعة (Maritime Containers Radar):**
     - شريط فلاتر سريع بنقرة واحدة لتصفية: [الكل]، [حاويات حرجة ≤ 3 أيام]، [متأخرة بغرامات أرضيات]، [تأمينات محتجزة لدى الخطوط]، و [تم إرجاعها].
     - شريط تقدم بصري أفقي (Progress Bar) يوضح نسبة الأيام المستهلكة من إجمالي فترة السماح (مثلاً 5 من أصل 14 يوماً) مع تغيير اللون ديناميكياً (أخضر للمتبقي الآمن، برتقالي للحالات الحرجة، أحمر للغرامات المتراكمة).
     - زر تصدير كشف الحاويات والغرامات والتأمينات إلى ملف Excel/CSV مع دعم الترميز العربي (BOM) لمطابقتها مع الخطوط الملاحية والعملاء.
  2. **نافذة تحديث محطات الحاوية التشغيلية (Container Milestone Modal):**
     - نافذة منبثقة معيارية سريعة لتسجيل وتحديث محطات حركة الحاوية مباشرة من جدول الرادار: تاريخ التفريغ بالميناء (Discharge Date)، تاريخ خروج البوابة للساحة (Gate-Out Date)، رقم السيل/الختم الملاحي، وملاحظات الفحص والتشغيل بنقرة واحدة ودون الحاجة للدخول لملف أمر الشغل.
  3. **دليل الخطوط والوكلاء والموانئ التفاعلي (Interactive Master Data Directory):**
     - إضافة زر تصدير الدليل إلى Excel/CSV للخطوط والوكلاء والموانئ والمواصفات القياسية.
     - تحويل أرقام الهواتف والواتساب لأزرار تفاعلية تفتح محادثات واتساب مباشرة (`https://wa.me/...`) مع مسؤولي الخطوط والوكلاء الدوليين.
     - إظهار كبسولات مسارات الشحن الملاحية والتغطية (Trade Lanes Badges) تحت كل خط ملاحي.
  4. **تحسين تجربة إعدادات المراسلات وفحص الربط (Email Settings & Diagnostic Hub):**
     - نقل مركز الفحص والاختبار والتشغيل المباشر ليكون أسفل بطاقات بيانات الدخول لـ SMTP و IMAP مباشرة لتيسير اختبار الاتصال وإرسال البريد التجريبي دون الحاجة للتمرير لأسفل الصفحة.
     - دعم كامل لخدمات بريد الشركات المخصصة (Custom Private Mail Server) وخوادم الأعمال المختلفة مع حفظ مشفر لبيانات الاعتماد واختبار فوري للاتصال.

---

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

## 106. المرحلة الأولى لأتمتة وربط الشحن الملاحي محاسبياً وجدولة المزامنة الذكية (Maritime Freight Phase 1: GL Financial Ledger Automation, Background Scheduler & Universal Combobox)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات الشحن الملاحي والباك إند (Double-Entry General Ledger Posting, Background Automation Cron Engine & Universal CustomSelect UI).
* **مسارات الكود الأساسية:**
  - الباك إند وخدمات الترحيل المحاسبي: `backend/src/modules/maritime-freight/maritime-freight.service.ts`
  - خدمة الجدولة الآلية والمزامنة الخلفية: `backend/src/modules/maritime-freight/maritime-automation-scheduler.service.ts`
  - وحدة الشحن الملاحي: `backend/src/modules/maritime-freight/maritime-freight.module.ts`
  - متحكم الشحن الملاحي: `backend/src/modules/maritime-freight/maritime-freight.controller.ts`
  - واجهة برمجة التطبيقات للفرونت إند: `frontend/src/features/maritime-freight/api/maritime-freight.api.ts`
  - تفاصيل أمر الشغل والقيود المحاسبية الحية: `frontend/src/features/maritime-freight/components/JobDetailsModal.tsx`
  - مكونات الواجهة المطهرة بنظام CustomSelect: `CreateRfqModal.tsx`, `CarrierBidEntryModal.tsx`, `ContainerReturnModal.tsx`, `CreateInquiryModal.tsx`, `MaritimeMatrixTab.tsx`, `MaritimeInquiriesTab.tsx`, `MaritimeMasterDataTab.tsx`, `MaritimeSettingsTab.tsx`, `PartnerFormModal.tsx`, `ImportCarriersModal.tsx`, `PublicCarrierQuotePage.tsx`.
* **الميزات والترقيات الهندسية المنفذة:**
  1. **الترحيل المالي المحاسبي المزدوج لأوامر الشغل الملاحية (Real Double-Entry GL Ledger Posting):**
     - إصدار فاتورة المبيعات للعميل (`issueJobSalesInvoice`): توليد قيد يومية متزن نظامي بقيد مدين على حـ/ العملاء المدينين (`1130`) وقيد دائن على حـ/ إيرادات الشحن والخدمات (`4200` / `4100`) مع ربط طرف القيد بمركز تكلفة الشحنة (`cost_center_id`) وتحديث إجمالي المفوتر للعميل وصافي الربحية.
     - تسجيل إذن صرف مصروفات الشحنة والخط الملاحي (`recordJobExpenseVoucher`): توليد قيد يومية متزن نظامي بقيد مدين على حـ/ مصروفات الشحن والنولون (`6400` / `5100`) مربوط بمركز التكلفة وقيد دائن على حـ/ الخط الملاحي أو المورد (`2110`) أو الخزينة النقدية (`1110`) أو البنك (`1120`).
     - عرض دفتر الأستاذ المالي الحي للشحنة (`JobDetailsModal - Finance Tab`) يوضح أرقام القيود اليومية المنشأة، أطراف القيد المدينة والدائنة، أكواد الحسابات، والمطابقة المحاسبية بدقة.
  2. **خدمة الجدولة الآلية الخلفية للشحن الملاحي (Maritime Automation Background Scheduler):**
     - بناء وتشغيل `MaritimeAutomationSchedulerService` عبر `@nestjs/schedule` كمهام مجدولة (Cron Jobs).
     - مهمة دورية للمزامنة البريدية الذكية (IMAP Bids Sync) تقرأ وتفحص عروض أسعار الخطوط الواردة لكل مشترك لديه الإعداد مفعل دون تدخل بشري.
     - مهمة يومية صباحية لفحص رادار الحاويات ورصد ومراقبة الحاويات الحرجة التي يقترب انتهاء فترات سماحها (Free Days ≤ 3 أيام) لتجنب غرامات الأرضيات (Demurrage).
  3. **التطهير الشامل وتوحيد القوائم المنسدلة (Strict Universal CustomSelect Standard):**
     - إزالة وتطهير 100% من عناصر `<select>` التقليدية في كافة ملفات ومكونات موديول الشحن واللوجستك واستبدالها بالمكون الموحد البريميوم `CustomSelect`.

---

## 107. الأتمتة الكاملة لموديول الشحن واللوجستك: إشعارات الواتساب السحابية، بوابة التتبع المباشر، محرك بوالص e-B/L ومستندات الموانئ، ورادار الأقمار الصناعية (Maritime Freight Complete Automation: Cloud WhatsApp, Public Tracking Portal, e-B/L Engine & AIS Satellite Radar)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في الباك إند والفرونت إند (End-to-End Enterprise Freight Automation, Automated WhatsApp Milestones, Public DCSA Tracking Portal, FIATA/BIMCO e-B/L & D/O Engine, and Live AIS Satellite Tracking).
* **معيار المقارنة الدولي:** Freightos / Flexport / Portcast / CargoWise End-to-End Maritime Logistics & Multimodal Tracking.
* **روابط وشاشات الوصول:**
  - نافذة إدارة وتتبع العملية ومستندات الشحن: `/logistics/ocean-freight` ➔ (انقر على أي عملية ➔ تبويب "بيانات الرحلة"، "مسار التتبع"، "مستندات الشحن وبوالص B/L").
  - بوابة التتبع العامة للعملاء: `/public/track/:token` و `/track/:token` و `/track`.
* **مسارات الكود الأساسية:**
  - الباك إند:
    - `backend/src/modules/maritime-freight/maritime-freight.module.ts`: ربط وحدة الإعدادات وخدمة `WhatsAppGatewayService`.
    - `backend/src/modules/maritime-freight/maritime-freight.service.ts`: الربط السحابي لإرسال رسائل الواتساب اللحظية عند تسجيل محطات DCSA، نقطة البحث الشامل في بوابة التتبع العام عبر التوكن أو رقم البوليصة أو الحاوية أو الحجز، وخدمة الإرسال المباشر.
    - `backend/src/modules/maritime-freight/maritime-automation-scheduler.service.ts`: الأتمتة الذكية لإنذارات الأرضيات (Demurrage Proactive Alerts) عبر إرسال رسائل تحذيرية تلقائية للعملاء عبر الواتساب للحاويات التي يتبقى عليها $\le 3$ أيام سماح بالميناء.
    - `backend/src/modules/maritime-freight/maritime-freight.controller.ts`: تسجيل نقطة `POST /api/maritime-freight/jobs/:id/send-whatsapp` ونقطة بوابة التتبع العامة `GET /api/public/freight-tracking/:token`.
  - الفرونت إند:
    - `frontend/src/features/maritime-freight/api/maritime-freight.api.ts`: دوال `sendJobMilestoneWhatsApp` و `getPublicTracking`.
    - `frontend/src/features/maritime-freight/utils/maritime-documents.ts`: محرك توليد وطباعة وثائق الشحن الرسمية المتوافقة مع FIATA و BIMCO (بوليصة الشحن البحرية HBL، إذن التسليم الملاحي D/O مع مربعات أختام الإفراج والجمارك، وإشعار وصول الشحنة Consignee Arrival Notice).
    - `frontend/src/features/maritime-freight/pages/PublicShipmentTrackingPage.tsx`: بوابة التتبع العامة المتطابقة مع معايير DCSA، توضح خط سير المحطات، حالة ومواصفات الحاويات، عد تنازلي لمهل الأرضيات، ورابط رادار الأقمار الصناعية المباشر.
    - `frontend/src/features/maritime-freight/components/JobDetailsModal.tsx`: تكامل كامل لتبويب مستندات الشحن، بطاقة رادار AIS الحي لتتبع السفينة (MarineTraffic / VesselFinder)، وأزرار الإرسال السحابي واليدوي للواتساب.
    - `frontend/src/app/router/root-router.tsx`: تسجيل مسارات التتبع العامة.
* **الميزات والترقيات الهندسية المنفذة:**
  1. **الأتمتة التامة لإشعارات الواتساب السحابية والميدانية (Automated WhatsApp Milestones & Proactive Demurrage Alerts):**
     - إرسال سحابي تلقائي لرسائل الواتساب إلى هاتف العميل عبر `WhatsAppGatewayService` فور تسجيل أي محطة ملاحية (مثل خروج البضاعة من المصنع، وصول الحاويات للميناء، إبحار السفينة، وصول الميناء، إصدار إذن التسليم D/O).
     - جدولة ذكية ترسل تلقائياً إنذار استباقي للعميل عبر الواتساب عند اقتراب انتهاء أيام السماح للحاويات ($\le 3$ أيام) لتفادي غرامات الأرضيات والتأخير.
     - أزرار إرسال سحابية فورية مباشرة في واجهة متابعة الشحنة مع زر احتياطي للفتح في تطبيق واتساب مباشرة (`wa.me`).
  2. **بوابة التتبع الملاحي العامة للعملاء (Customer Self-Service Tracking Portal):**
     - صفحة عامة بريميوم ذات هوية مؤسسية وتصميم RTL احترافي، خالية من أي إيموجيز ومعتمدة على `AppIcons`.
     - دعم البحث المرن والفوري برمز التتبع الفريد، رقم العملية Job #، رقم بوليصة الشحن الرئيسية MBL، رقم بوليصة الشحن الداخلية HBL، أو رقم الحجز Booking #.
     - عرض حي لمسار الرحلة POL ➔ POD، جدول محطات DCSA التفاعلي، بطاقات الحاويات مع عداد أيام السماح ومهلة الإرجاع، وبيانات السفينة والخط الملاحي.
  3. **محرك إصدار وطباعة بوالص الشحن والمستندات الملاحية (e-B/L & Maritime Documents Engine):**
     - **بوليصة الشحن البحري القياسية (FIATA/BIMCO Compliant House B/L):** وثيقة دولية قياسية بمقاس A4 تتضمن تفاصيل الشاحن، المستلم، جهة الإخطار، السفينة، الرحلة، مواصفات الحاويات، الأوزان الإجمالية، الحجم بالمتر المكعب CBM، وأختام الناقل.
     - **إذن التسليم الملاحي الرسمي (Delivery Order - D/O):** مستند إفراج رسمي موجه لسلطات الموانئ والجمارك ومحطات الحاويات، يتضمن جدول الحاويات ومربعات توقيع واعتماد الفحص الجمركي وجهات التخليص.
     - **إشعار وصول الشحنة (Consignee Arrival Notice):** إخطار رسمي للعميل بموعد وصول السفينة وتفريغ البضائع وتفاصيل المستندات المطلوبة لاستلام إذن التسليم.
  4. **رادار الأقمار الصناعية لتتبع السفن الحية (Live Satellite AIS Vessel Radar):**
     - بطاقة ملاحية مدمجة في ملف العملية تتيح تتبع السفينة مباشرة عبر رادار الأقمار الصناعية وأنظمة AIS العالمية (MarineTraffic & VesselFinder) بنقرة واحدة بمجرد إدخال اسم السفينة ورقم الرحلة.
