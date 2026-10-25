# قدرات المطاعم والأغذية

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **المطاعم والأغذية** المعتمد للتحديثات القادمة. مسارات الملكية: مجال عابر للموديولات؛ راجع الأقسام ومسارات التنفيذ أدناه.

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المبيعات ونقاط البيع](SALES_CAPABILITIES.md) · [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md) · [التسعير والعروض](PRICING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## المرجع القطاعي السابق

المحتوى التالي محفوظ بترتيبه وروابطه؛ التفاصيل التاريخية الإضافية بعده. عند وجود تكرار، حدّث الوصف المرجعي هنا واربط السجل التاريخي به بدلاً من تحديث نسختين.

# وثيقة قدرات ومعمارية موديول المطاعم والأغذية (Restaurant & F&B Capabilities)
## Z-Systems ERP — الفهرس المرجعي الهندسي الموحد لمود المطاعم

> **تاريخ التحديث:** أكتوبر 2026  
> **الحالة:** مكتمل ومفعّل 100%  
> **الهدف الهندسي:** توفير منظومة متكاملة لقطاع الأغذية والمشروبات (F&B) تجمع بين سرعة وسلاسة فودكس (Foodics) والعمق المحاسبي والمخزني الصارم لأودو (Odoo)، مع التوطين الكامل لأسواق الخليج ومصر.

---

## 📑 فهرس المحتويات
1. [خريطة المعمارية والملفات](#1-خريطة-المعمارية-والملفات)
2. [قدرات الصالة والطاولات والخرائط التفاعلية](#2-قدرات-الصالة-والطاولات-والخرائط-التفاعلية)
3. [قدرات المنيو والإضافات والكومبو وعروض الساعات السعيدة](#3-قدرات-المنيو-والإضافات-والكومبو-وعروض-الساعات-السعيدة)
4. [قدرات المطبخ، الـ KDS، محطة Expo، ومسارات التقديم](#4-قدرات-المطبخ-الـ-kds-محطة-expo-ومسارات-التقديم)
5. [قدرات الحساب وتقسيم الفواتير الكسري والدفع الذاتي](#5-قدرات-الحساب-وتقسيم-الفواتير-الكسري-والدفع-الذاتي)
6. [محرك المخزون، هدر المطبخ، رادار التكلفة، والقيود المحاسبية](#6-محرك-المخزون-هدر-المطبخ-رادار-التكلفة-والقيود-المحاسبية)
7. [بوابة منصات التوصيل الخليجية وترحيل السائقين الداخليين](#7-بوابة-منصات-التوصيل-الخليجية-وترحيل-السائقين-الداخليين)
8. [التوطين المحلي (الكويت، السعودية، الخليج، ونظام البيجر)](#8-التوطين-المحلي-الكويت-السعودية-الخليج-ونظام-البيجر)
9. [محطة النادل المتجاوبة، وضع الأوفلاين، وتطبيق الأندرويد](#9-محطة-النادل-المتجاوبة-وضع-الأوفلاين-وتطبيق-الأندرويد)
10. [منظومة شاشات العرض الخمس وطباعة ملصقات الباريستا والولاء](#10-منظومة-شاشات-العرض-الخمس-وطباعة-ملصقات-الباريستا-والولاء)
11. [سجل هجرات قاعدة البيانات (Database Migrations)](#11-سجل-هجرات-قاعدة-البيانات-database-migrations)
12. [خارطة الميزات المتقدمة المستلهمة من فودكس (Roadmap)](#12-خارطة-الميزات-المتقدمة-المستلهمة-من-فودكس-roadmap)

---

## 1. خريطة المعمارية والملفات

### 🎨 واجهات الفرونت إند (Frontend Components):
* **خريطة الصالة ومصمم الطاولات 2D:**  
  `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`  
  `frontend/src/features/pos/components/pos-workspace/PosVisualFloorCanvas.tsx`
* **تقسيم الفاتورة الكسري ونقل الأصناف:**  
  `frontend/src/features/pos/components/pos-workspace/PosSplitBillModal.tsx`  
  `frontend/src/features/pos/components/pos-workspace/PosTransferItemModal.tsx`
* **معالج الوجبات التجميعية والإضافات:**  
  `frontend/src/features/pos/components/pos-workspace/PosComboMealModal.tsx`  
  `frontend/src/features/products/components/ComboComponentsEditor.tsx`  
  `frontend/src/features/products/components/ProductModifiersPage.tsx`  
  `frontend/src/features/products/components/ModifierGroupModal.tsx`  
  `frontend/src/features/products/components/ModifierGroupCard.tsx`
* **شاشات المطبخ، محطة Expo، ومحطة النادل:**  
  `frontend/src/features/pos/pages/KitchenDisplayPage.tsx`  
  `frontend/src/features/pos/components/kds/KdsTicketCard.tsx`  
  `frontend/src/features/pos/components/kds/KdsFilterBar.tsx`  
  `frontend/src/features/pos/pages/WaiterStationPage.tsx`  
  `frontend/src/features/pos/pages/OrderStatusBoardPage.tsx` (شاشة جاهزية الطلبات والبيجر للعملاء)
* **عمليات المطعم المتقدمة ونوافذ العمليات الموحدة (`RestaurantOperationsDialog`):**  
  `frontend/src/features/pos/components/pos-workspace/PosRestaurantOperationsModal.tsx`  
  `frontend/src/features/pos/components/pos-workspace/PosFoodWasteModal.tsx` (تسجيل هدر المطبخ)  
  `frontend/src/features/pos/components/pos-workspace/PosPlateCostRadarModal.tsx` (رادار تكلفة الأطباق وهوامش الربح)  
  `frontend/src/features/pos/components/pos-workspace/KitchenDailyPrepSheetModal.tsx` (ورقة التحضير اليومية)  
  `frontend/src/features/pos/components/pos-workspace/PosTipPoolModal.tsx` (مجمع الإكراميات وتوزيع التبس)  
  `frontend/src/features/pos/components/pos-workspace/PosDeliveryAggregatorsModal.tsx` (منصات التوصيل)  
  `frontend/src/features/pos/components/pos-workspace/RestaurantDeliveryDispatcherModal.tsx` (ترحيل طلبات سائقي المطعم)  
  `frontend/src/features/pos/components/pos-workspace/PosDriveThruModal.tsx` (طابور طلبات السيارات Drive-Thru)  
  `frontend/src/features/pos/components/pos-workspace/PosCustomerPunchCardModal.tsx` (كرت الأختام والولاء للمطاعم)  
  `frontend/src/features/pos/components/pos-workspace/PosSmartUpsellModal.tsx` (العروض الذكية والبيع التبادلي)  
  `frontend/src/features/pos/components/pos-workspace/PosManagerCompModal.tsx` (ضيافة الإدارة والخصم الخاص بـ PIN المشرف)  
  `frontend/src/features/pos/components/pos-workspace/Pos86ItemsModal.tsx` (محرك الاستبعاد الفوري 86)  
  `frontend/src/features/pos/components/pos-workspace/PosTableReservationsModal.tsx` (حجوزات الطاولات وقائمة الانتظار Walk-In)
* **تقارير المطاعم المعزولة:**  
  `frontend/src/features/reports/components/FoodCostVarianceReportSection.tsx` (انحراف تكلفة الطعام الفعلي مقابل النظري)

### ⚙️ خدمات الباك إند (Backend Services & APIs):
* `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts` (محرك 86، مجمع التبس، تقسيم المناطق، أوراق التحضير)
* `backend/src/modules/sales/services/restaurant-food-waste.service.ts` (هدر المطبخ وربطه بقيود اليومية المحاسبية)
* `backend/src/modules/sales/services/kds.service.ts` (إدارة تذاكر المطبخ ومحطة Expo وحقن طلبات التوصيل)
* `backend/src/modules/sales/services/delivery-aggregators.service.ts` (إدارة منصات التوصيل الخليجية وحساب العمولات)
* `backend/src/modules/sales/services/table-service-calls.service.ts` (استدعاء الويتر وطلب الحساب عبر كيو آر الطاولة)
* `backend/src/modules/sales/services/table-reservations.service.ts` (حجوزات الطاولات وقوائم الانتظار اللحظية)
* `backend/src/modules/delivery-reps/services/delivery-reps.service.ts` (إسناد طلبات التوصيل لسائقي المطعم الداخليين)

---

## 2. قدرات الصالة والطاولات والخرائط التفاعلية

* **محرر ومخطط الصالة المرئي التفاعلي (2D Visual Floor Plan Canvas & Table Geometry Designer):**
  * جدول `restaurant_table_layouts` في الهجرة `2040000000220_restaurant_apex_visual_floor_and_expo.ts`.
  * مبدل عرض فوري (مخطط الصالة 2D التفاعلي مقابل شبكة الطاولات السريعة `grid`).
  * وضع تصميم كامل (`isDesignMode`) يتيح لمدير المطعم تحريك الطاولات بالماوس سحب وإفلات حر (Drag & Drop) مع حفظ الإحداثيات (`x_pos`, `y_pos`, `width`, `height`).
  * دعم الأشكال الهندسية الأربعة: **مربعة (`square`)، دائرية (`round`)، مستطيلة (`rectangle`)، كنب/كابينة (`booth`)**.
  * التحكم بعدد المقاعد (`seats`)، التدوير 90° (`rotation`)، وتوزيع الطاولات التلقائي أو اليدوي.
  * تقسيم الصالة لمناطق (Zones: الصالة الرئيسية، التراس الخارجي، العائلات، صالة VIP) مع ربط كل منطقة بحد أدنى للإنفاق إن وجد (`minimumSpend`).
* **عمليات الطاولات الذكية:**
  * نقل أوردر كامل من طاولة لأخرى (`onTransferTable`).
  * دمج طاولتين في حساب واحد (`onMergeTable`).
  * نقل أصناف محددة بين الطاولات المفتوحة عبر [`PosTransferItemModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-workspace/PosTransferItemModal.tsx).
  * شارة توهج فورية وتنبيه ضوئي عند طلب النادل أو الحساب من باركود الطاولة (`pendingCallsByTable`).
* **إدارة قائمة الانتظار والحجوزات (Walk-In Waitlist & Reservations):**
  * دعم الحجوزات المسبقة وقوائم الانتظار بدون حجز (`reservation_type: 'reservation' | 'waitlist'`).
  * احتساب دقيق لوقت الانتظار المنقضي للعميل في الصالة (`منذ X د`).
  * زر إجلاس فوري وتسكين الطاولة بنقرة واحدة (1-Click Seating) يربط الضيف بالطاولة ويفتحها مباشرة في الكاشير.

---

## 3. قدرات المنيو والإضافات والكومبو وعروض الساعات السعيدة

* **محرك الإضافات والمعدلات (Modifiers & Recipe Depletion):**
  * ربط خيارات الإضافات بالمخزن (`component_product_id`, `consumption_qty`, `unit_name`) لخصم المواد الخام لحظياً عند البيع مع امتصاص تكلفتها في تكلفة البضاعة المباعة (COGS).
  * شارات الخصم المخزني التلقائي (`خصم مخزني: X [وحدة] من [المادة الخام]`) على بطاقات الإضافات.
  * ضبط القواعد: إجباري / اختياري، الحد الأدنى والأقصى للاختيار (`minimum_options`, `maximum_options`)، وعدد الخيارات المجانية (`free_options`).
* **معالج الوجبات التجميعية (PosComboMealModal):**
  * معالج ذكي من 3 خطوات متتابعة يمنع أخطاء الكاشير:
    1. اختيار الوجبة الرئيسية.
    2. اختيار الطبق الجانبي مع احتساب فروق الأسعار التلقائية (`priceDelta`).
    3. اختيار المشروب مع دعم الخيارات الصحية والمياه والدايت.
* **محرك استبعاد الأصناف الفوري (Fast 86 Engine):**
  * زر سريع لاستبعاد الصنف النافذ فوراً (`is_86ed = true`).
  * دعم الاستعادة التلقائية بعد عدد ساعات محدد (`autoRestoreHours`).
  * إشعار فوري لمنصات التوصيل لوقف استلام الطلبات على الصنف فوراً لمنع الغرامات.
* **عروض الساعات السعيدة المجدولة (Time-based Happy Hour):**
  * ضبط فترات الساعات السعيدة (`happy_hour_start`, `happy_hour_end`, `days_of_week`) في جدول `product_offers`، مع تطبيق الخصم التلقائي خلال تلك الأوقات.

---

## 4. قدرات المطبخ، الـ KDS، محطة Expo، ومسارات التقديم

* **شاشة المطبخ المتطورة (Kitchen Display System - KDS):**
  * استعراض التذاكر المباشرة وتصنيفها حسب المحطة (شواية، مقبلات، بار، حلويات).
  * تصنيف التذاكر حسب نوع الطلب (صالة، سفري، سيارات، منصات توصيل).
  * حقن طلبات منصات التوصيل (جاهز، هنقرستيشن، طلبات...) تلقائياً في الشاشة مع شارة كل منصة.
* **محطة منسق التسليم والتجميع المركزي (Kitchen Expediter Pass / Expo Station Mode):**
  * شريط تحكم Expo لمراقبة تذاكر الوجبات المكتملة عبر كافة محطات المطبخ المتفرقة.
  * زر تجميع وتسليم فوري (Expo Ready & Release) بمؤشر إنجاز محطات الصنف لضمان خروج الأطباق كاملة للزبون.
* **إدارة مسارات التقديم (Dining Course Firing Action):**
  * تقسيم الطلب لمسارات: (مقبلات ⬅️ أطباق رئيسية ⬅️ حلويات).
  * زر إطلاق المسار التالي بنقرة واحدة (1-Click Fire Next Course) يرسل إشعاراً فورياً للمطبخ ويعيد حالة التذكرة في KDS إلى `cooking` لتنبيه الشيف مرئياً مع شارة المسار، مع الحفاظ على التوقيت الزمني الكلي للطلب.

---

## 5. قدرات الحساب وتقسيم الفواتير الكسري والدفع الذاتي

* **نافذة تقسيم الشيك الشاملة (PosSplitBillModal):**
  * **التقسيم بالأصناف (`splitMode: 'items'`):** نقل الأطباق بين عدة شيكات وسداد كل شيك مستقلاً.
  * **تجزئة الصنف الواحد كسرياً (Fractional Item Splitting):** تجزئة أي طبق تشاركي إلى نصفين (½) أو أثلاث (⅓) أو أرباع (¼) وتوزيعه بالتساوي على الشيكات مع ضبط دقيق لأجزاء السنتات والفلس المحاسبي.
  * **التقسيم بالتساوي (`splitMode: 'even'`):** تقسيم إجمالي الحساب على 2 إلى 12 ضيفاً بالتساوي مع معالجة كسور التقريب في الضيف الأخير.
* **الدفع الذاتي عند الطاولة عبر الباركود (Dine-In Self-Checkout via QR):**
  * مسارات السداد الإلكتروني: `GET /api/storefront/:slug/table/:tableNumber/bill` و `POST /api/storefront/:slug/table/:tableNumber/pay-bill`.
  * واجهة العميل عند مسح الباركود `TableBillModal.tsx` و `PublicStorefrontPage.tsx`: استعراض أصناف الطاولة الحية، رسوم الخدمة، الضريبة، الإكرامية، والسداد الفوري ببطاقة الدفع أو Apple Pay.
  * انتقال حالة الطاولة آلياً في خريطة الكاشير ومحطة النادل لشارة `💳 مسدد إلكترونياً!` باللون الزمردي فور نجاح السداد.
* **محرك توزيع الإكراميات (Tip & Gratuity Allocation Engine):**
  * دعم حقل `tip_amount` في المبيعات، ومجمع إكراميات يوزع التبس بالتساوي، بالساعات، أو حسب الأوزان الوظيفية (كابتن، ويتر، باريستا، شيف).

---

## 6. محرك المخزون، هدر المطبخ، رادار التكلفة، والقيود المحاسبية

* **إدارة هدر المطبخ والتالف المالي المزدوج (Food Waste & Double-Entry Ledger):**
  * تسجيل الهالك اليومي والتالف ومتبقيات الإعداد في `restaurant_food_waste_logs`.
  * خصم المواد الخام من المستودع بحركات `damaged`.
  * **القيد المحاسبي المالي التلقائي:**
    * مدين: حساب `5300` (مصروفات وخسائر وتالف الأغذية).
    * دائن: حساب `1140` (مخزون السلع والمواد الخام).
* **تقرير انحراف تكلفة الطعام (Theoretical vs. Actual Food Cost Variance Report):**
  * قسم تقرير متخصص معزول ومحجوب 100% عن أنشطة التجزئة العامة تحت مسار `/reports`.
  * احتساب الاستهلاك النظري للوجبات ومكوناتها وإضافاتها من واقع فواتير البيع ومقارنته بالجرد الفعلي لكشف السرقات ونزيف المواد الخام ونسب الانحراف.
* **رادار تكلفة الأطباق وهوامش الربح (`PosPlateCostRadarModal.tsx`):**
  * استعراض فوري لمدير المطعم لتكلفة كل طبق، هامش الربح الإجمالي، وحساسية أسعار المواد الخام.
* **ورقة التحضير اليومية للمطبخ (`KitchenDailyPrepSheetModal.tsx`):**
  * إعداد وجدول كميات التحضير المسبق (Prep Levels / Par Levels) للصوصات واللحوم والخضار اليومية قبل فتح الشفت.

---

## 7. بوابة منصات التوصيل الخليجية وترحيل السائقين الداخليين

* **منصات التوصيل التجميعية الموحدة (GCC Delivery Aggregators Hub):**
  * المنصات المدعومة: جاهز (Jahez)، هنقرستيشن (Hungerstation)، طلبات (Talabat)، كاري (Cari بنموذج 0% عمولة)، دليفرو (Deliveroo)، كيتا (Keeta)، كريم (Careem)، تويو (ToYou).
  * احتساب العمولات، وصافي المستحقات، والحقن المباشر في KDS.
* **منصة ترحيل طلبات التوصيل لسائقي المطعم (In-House Driver Dispatcher Console):**
  * واجهة `RestaurantDeliveryDispatcherModal.tsx` لإسناد الطلبات الجاهزة دفعة واحدة لسائقي المطعم الداخليين (`delivery_representatives`).
  * توليد رسائل واتساب للعميل ببيانات السائق بنقرة واحدة، ومتابعة التحصيل النقدي والتسوية المالية للسائق عند عودته.

---

## 8. التوطين المحلي (الكويت، السعودية، الخليج، ونظام البيجر)

* **الكويت (Kuwait F&B Localization & K-NET Engine):**
  * زر دفع مخصص لـ **كي نت (K-NET)** مع توثيق `cardScheme: 'knet'` في المدفوعات وإيصالات 80mm.
  * دعم دقة الدينار الكويتي (3 خانات عشرية - 1000 فلس).
  * إلغاء ضريبة القيمة المضافة لبيئة الكويت (0% VAT).
  * روابط سداد واتساب سريعة تدعم أرقام الهواتف الكويتية (+965).
* **المملكة العربية السعودية (SFDA Nutritional & Allergen Compliance):**
  * الإفصاح الغذائي الإلزامي: السعرات الحرارية (`calories`)، مسببات الحساسية (`allergens` كـ JSONB)، حار (`is_spicy`)، نباتي (`is_vegetarian`)، خالٍ من الجلوتين (`is_gluten_free`).
  * فواتير ZATCA الضريبية الإلكترونية مع QR Code مشفر للمرحلة الثانية.
* **نظام نداء واستدعاء العميل (Pager / Buzzer System):**
  * حقل `pager_number` في المبيعات، مع إدخال رقم البيجر في نافذة الدفع للطلبات الخارجية والسفري، وعرض شارة البيجر فوراً في تذاكر المطبخ وشاشة حالة الطلبات التلفزيونية للعملاء `OrderStatusBoardPage.tsx`.

---

## 9. محطة النادل المتجاوبة، وضع الأوفلاين، وتطبيق الأندرويد

* **محطة النادل المتكيفة (`WaiterStationPage.tsx`):**
  * معمارية متجاوبة 100% مع كافة الأجهزة (هواتف 6"، تابلت 8"-10"، وشاشات لمس ثابتة).
  * تسجيل دخول سريع برمز PIN لكل ويتر.
  * استقبال إشعارات استدعاء الطاولات وحلها بنقرة واحدة (1-Click Resolve).
  * **طابور محلي للعمل أوفلاين (`offlineQueueCount`):** استمرار تسجيل الأوردرات بدون انقطاع عند ضعف الشبكة ومزامنتها فور عودة الاتصال.
  * تطبيق أندرويد جاهز ومبني كحزمة APK في المشروع (`Z-Systems-ERP.apk`).

---

## 10. منظومة شاشات العرض الخمس وطباعة ملصقات الباريستا والولاء

* **الترقية الشاملة لمنظومة شاشات العرض الخمس (Master 5-Screen Unified Display Suite):**
  1. **لوحة جاهزية الطلبات والاستلام (`/pos/order-status`):** شاشة تلفزيونية بالهوية البيضاء المضيئة تعرض أرقام الطلبات والبيجر للعملاء.
  2. **محطة الويتر وكابتن الصالة (`/pos/waiter`):** واجهة تابلت وهاتف سريعة لأخذ الطلبات وإرسالها للمطبخ.
  3. **شاشة العروض والأسعار وصالة العرض (`/signage`):** مزامنة لحظية صفر-لاغ (0ms Real-Time Offer Sync) عبر معمارية هجينة مع سحب خلفي صامت كل 25 ثانية لشاشات التلفاز الذكية.
  4. **شاشة المطبخ والشيف (`/kds`):** شاشة تذاكر ومسارات إعداد ومحطة Expo.
  5. **شاشة العميل عند الكاشير (`/pos/customer-display`):** شاشة ثانوية تعرض الأصناف والإجمالي وQR الدفع.
* **أدوات الكاشير والباريستا المتقدمة:**
  * **ملصقات الأكواب والعلب للباريستا:** طباعة ستيكرات 40×30mm لكل كوب متضمنة الإضافات واسم العميل.
  * **طابور طلبات السيارات (Drive-Thru Mode):** واجهة مخصصة في [`PosDriveThruModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-workspace/PosDriveThruModal.tsx).
  * **كرت الأختام والولاء للمطاعم (Punch Card):** في [`PosCustomerPunchCardModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-workspace/PosCustomerPunchCardModal.tsx) لمكافآت (اشترِ X وجبات واحصل على وجبة مجانية).
  * **العروض الذكية والبيع التبادلي (Smart Upsell):** في [`PosSmartUpsellModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-workspace/PosSmartUpsellModal.tsx) لاقتراح صنف حلو أو إكسترا تلقائياً للكاشير.
  * **ضيافة الإدارة والخصم الخاص (Manager Comp):** في [`PosManagerCompModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-workspace/PosManagerCompModal.tsx) باشتراط رمز PIN المشرف.

---

## 11. سجل هجرات قاعدة البيانات (Database Migrations)

| رقم الهجرة | اسم الهجرة | الوصف والمسؤولية |
| :--- | :--- | :--- |
| **2030000000000** | `add_restaurant_fields` | حقول المطاعم الأساسية في جداول المبيعات |
| **2040000000210** | `pos_restaurant_fnb_advanced_features` | جداول مجمعات التوصيل، طلبات المنصات، وسجل هدر الأغذية |
| **2040000000211** | `pos_terminal_ecr_metadata` | حقول الربط المالي المباشر ECR في `sales` و `sale_payments` |
| **2040000000212** | `restaurant_service_charge_and_guest_operations` | رسوم الخدمة والعمليات على الضيوف |
| **2040000000213** | `restaurant_table_reservations` | حجز وإدارة الطاولات وقائمة الانتظار Walk-In |
| **2040000000215** | `restaurant_sfda_nutrition_service_calls_tips_waitlist` | الإفصاح الغذائي SFDA، نداءات الخدمة عبر QR، وتوزيع الإكراميات |
| **2040000000216** | `restaurant_pay_at_table_and_dispatch` | الدفع على الطاولة وإدارة وترحيل مناديب التوصيل |
| **2040000000220** | `restaurant_apex_visual_floor_and_expo` | جدول `restaurant_table_layouts` لمصمم الصالة 2D ومحطة Expo |
| **2040000000226** | `restaurant_pager_and_kuwait_features` | نظام البيجر وخصائص السوق الكويتي وسداد كي نت K-NET |
| **2040000000227** | `restaurant_foodics_killer_frontiers` | دعم نصفي البيتزا `is_splittable_in_half`، نسب زيادة منصات التوصيل `price_markup_percentage`، وخيارات الحصص والأوقات `pos_modifier_options` |

---

## 12. منظومة ميزات التفوق على فودكس (Foodics-Beating Frontiers - تم التنفيذ بالكامل ✅)

1. **تقسيم الإضافات والمعدلات لنصفي البيتزا والفطائر (`is_splittable_in_half`):**
   * دعم مجموعات الإضافات المقسمة للأنصاف في مطاعم البيتزا والوجبات الإيطالية والفطائر.
   * خيار التحديد الثلاثي السريع للكاشير: `[كامل (100% السعر) | نصف أيمن (50% السعر) | نصف أيسر (50% السعر)]`.
   * تخزين الحصة (`portion: 'whole' | 'left' | 'right'`) مع تسمية دقيقة تنعكس فوراً على تذاكر المطبخ وشاشات الـ KDS لمنع أي لبس لدى الشيف.
   * المكون البرمجي: [`PosItemModifiersModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-cart-panel/PosItemModifiersModal.tsx).

2. **ترقية أحجام وجبات الكومبو السريعة (Combo Meal Upsizing):**
   * معالج وجبات الكومبو السريعة خطوة بخطوة: الصنف الرئيسي ➔ الطبق الجانبي ➔ المشروب.
   * شريط ترقية الحجم اللحظي (Combo Upsize):
     * عادي (Regular): فارق سعر 0 ج.م
     * كبير (Large / Upsize): فارق سعر +8 ج.م (ترقية تلقائية لحجم البطاطس والمشروب)
     * ميجا / عائلي (Mega): فارق سعر +16 ج.م (حجم جامبو)
   * إضافة فرق السعر لـ `totalComboPrice` وتوثيق حجم الوجبة كمعدّل رسمي في السلة والفاتورة.
   * المكون البرمجي: [`PosComboMealModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-workspace/PosComboMealModal.tsx).

3. **التسعير الذكي لتعويض عمولات منصات التوصيل (Aggregator Price Markup):**
   * إمكانية تحديد نسبة مئوية لزيادة السعر (`price_markup_percentage`) لكل منصة توصيل (مثلاً: جاهز +15%، طلبات +20%، هنقرستيشن +18%).
   * مدخل رقمي سريع ومباشر في تبويب "منصات التوصيل والعمولات" يحفظ تلقائياً عند الخروج (onBlur).
   * يضمن تعويض رسوم المنصات تلقائياً مع حماية هوامش أرباح المطعم الصافية.
   * المكون البرمجي: [`PosDeliveryAggregatorsModal.tsx`](file:///D:/zn/frontend/src/features/pos/components/pos-workspace/PosDeliveryAggregatorsModal.tsx).

4. **تخصيص الحصص المسموحة وأوقات تحضير الإضافات (`pos_modifier_options`):**
   * حقول `portion_allowed` ('both' / 'half_only' / 'whole_only') للتحكم في ما يمكن تقسيمه وما لا يجوز تقسيمه.
   * حقل `preparation_time_minutes` لكل خيار إضافي لتنسيق خروج الأطباق المعقدة في الـ KDS.
   * الخدمة الخلفية: [`AddonsService.ts`](file:///D:/zn/backend/src/modules/addons/addons.service.ts).


## فهرس الأقسام المنقولة

- [قدرة: منظومة بونات وملاحظات المطبخ الذكية ثنائية اللغة وشاشات KDS (Bilingual Kitchen Order System & Quick Modifier Tags Hub) — ✅ مفعّلة ومكتملة 100% (أكتوبر 2026)](#cap-006)
- [قدرة: منظومة الأغذية والمشروبات التنافسية (Foodics F&B Killer Platform) — ✅ مفعّلة ومكتملة 100%](#cap-013)
- [34. شاشة المطبخ التفاعلية للمطاعم والكافيهات (Interactive Kitchen Display System - KDS) 🍳📱](#cap-059)
- [37. الطلب الذاتي من الطاولة بالـ QR للمطاعم والكافيهات (Dine-In QR Table Ordering) 🍽️📲](#cap-062)
- [74. مصفوفة خيارات ومعدلات الأصناف ونقاط البيع (POS Item Modifiers & Fast Combos Matrix)](#cap-099)
- [206. منظومة تقرير انحراف تكلفة الطعام الفعلي مقابل النظري للمطاعم وسحق فودكس (Restaurant Theoretical vs. Actual Food Cost Variance Report)](#cap-250)
- [207. منظومة طباعة الشيك المبدئي وشارات تسليم الحساب (Guest Check / Proforma Bill & Delivered Badges)](#cap-251)
- [208. منظومة احتساب رسوم خدمة الصالة التلقائية للطلبات الداخلية (Dine-in Service Charge System)](#cap-252)
- [209. عداد الضيوف ومؤشر متوسط إنفاق الفرد في قطاع المطاعم (Covers Count & Spend Per Guest KPI)](#cap-253)
- [210. منظومة حجوزات الطاولات وإدارة تدفق الضيوف (Table Reservations & Hostess Management)](#cap-254)
- [211. شاشة إعلان جاهزية الطلبات للعملاء وسائقي التوصيل (Customer Pickup / Order Status Display Board)](#cap-255)
- [212. محطة كابتن الصالة والويتر الميداني السريع (Handheld Waiter / Captain Station)](#cap-256)
- [213. معالج وجبات الكومبو السريعة بنظام الخطوات (Step-by-Step Combo Meals Builder)](#cap-257)
- [214. مصفوفة هندسة قائمة الطعام وتحليل الربحية والشعبية (Menu Engineering Matrix - BCG F&B Analysis)](#cap-258)
- [215. شبكة طابعات المطبخ والبار وتوجيه البونات حسب المحطة (Multi-Printer Network KOT Routing)](#cap-259)
- [216. شاشة منسق تسليم المطبخ وتتبع جاهزية الأصناف (Kitchen Expediter / Expo KDS Station)](#cap-260)
- [217. محرك الاستبعاد اللحظي للأصناف النافذة بالمطبخ والكاشير (Fast 86'd Items Engine & KDS Integration)](#cap-261)
- [218. مجمع الإكراميات وتوزيع حصص الوردية على طاقم الصالة والمطبخ (Tip Pooling & Shift Distribution Engine)](#cap-262)
- [219. خريطة الصالة متعددة الأجنحة وتخصيص الطاولات (Multi-Zone Floor Plan & Dining Sections)](#cap-263)
- [220. جدول التحضير اليومي للمطبخ المركزي والأصناف نصف المصنعة (Daily Prep Sheet & Central Commissary Engine)](#cap-264)
- [221. كروت الأختام الرقمية وبرنامج ولاء المقاهي والمطاعم (Digital Stamp Loyalty & Punch Cards)](#cap-265)
- [222. رادار تذبذب تكلفة الأطباق وهوامش الربح الحية (Live Plate Cost & Food Inflation Radar)](#cap-266)
- [223. نقل الأصناف الفردية بين الطاولات وفصل الفواتير (Item-Level Table Transfer & Split-Destination Engine)](#cap-267)
- [224. طباعة ملصقات الأكواب والوجبات السريعة الحرارية 50x30 مم (Sticky Cup & Box Label Thermal Printing)](#cap-268)
- [225. وضع كشك الخدمة الذاتية الرأسي التفاعلي للعملاء (Self-Ordering Kiosk Mode - Portrait Touch UX)](#cap-269)
- [226. محرك ضيافة الإدارة والخصومات الرسمية والتوثيق المحاسبي (Manager Comps & House Accounts Engine)](#cap-270)
- [227. رادار تقييم العميل اللحظي عند الطاولة وتنبيه الإنقاذ الفوري (Table QR Post-Payment Rating & Rescue Alert)](#cap-271)
- [228. توقيت الطهي الذكي وتنسيق خروج أطباق الطلب معاً (Kitchen Pacing & Staggered Prep Scheduling)](#cap-272)
- [229. طلب المقاعد الفردية والتقسيم التلقائي للفاتورة حسب المقعد (Seat-Level Ordering & 1-Click Split by Seat)](#cap-273)
- [230. محرك الاقتراح والترقية الذكية وزيادة متوسط الفاتورة (Smart Upselling & Cross-Sell Engine)](#cap-274)
- [231. طابور طلبات السيارات ومؤشر سرعة الخدمة (Drive-Thru Lane & Speed of Service Timer - SOS)](#cap-275)
- [232. ملصقات صلاحية وسلامة الأغذية المحضرة بالمطبخ (Kitchen Day-Dots & HACCP Prep Expiry Labels 50x30mm)](#cap-276)
- [233. فرض الحد الأدنى لإنفاق الطاولات ومناطق الصالة (Table Zone Minimum Spend Enforcer)](#cap-277)
- [244. محرك التوطين الإقليمي لدولة الكويت والتهيئة التلقائية المتسلسلة للمطاعم والضيافة (Kuwait Regional Profile, Country Cascading Engine & PACI/K-NET F&B Localization)](#cap-288)
- [222. إعادة هيكلة كشك الخدمة الذاتية للمطاعم ودستور الدفع فائق السرعة (Restaurant Self-Ordering Kiosk Overhaul & 3-Second Checkout)](#cap-290)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-006"></a>
<!-- migrated:cap-006:start -->
### قدرة: منظومة بونات وملاحظات المطبخ الذكية ثنائية اللغة وشاشات KDS (Bilingual Kitchen Order System & Quick Modifier Tags Hub) — ✅ مفعّلة ومكتملة 100% (أكتوبر 2026)
- **الطباعة ثنائية اللغة لبونات المطبخ وفواتير الكاشير (`frontend/src/lib/pos-printing/kitchen.ts` & `template.ts`):**
  - دعم تخصيص لغة طباعة بونات المطبخ KOT عبر إعداد `posKitchenLanguage`:
    - `dual`: إبراز الاسم الإنجليزي للصنف وتحته العربي (ملائم تماماً لطواقم المطابخ الآسيوية غير الناطقة بالعربية في أسواق الخليج والكويت).
    - `en`: طباعة الاسم الإنجليزي فقط في المطبخ.
    - `ar`: طباعة الاسم العربي فقط.
  - دعم إدراج الاسم الإنجليزي تحت اسم الصنف في فواتير الكاشير الحرارية عبر خيار `printBilingualItemNames` أو تلقائياً عند ضبط العملة على الدينار الكويتي (KWD).
- **نافذة الملاحظات والتعديلات السريعة الذكية للأصناف (`PosItemNotesDialog.tsx`):**
  - استبدال نافذة `window.prompt` القديمة المخالفة لدستور النظام بنافذة مؤسسية متكاملة عبر `DialogShell` (0 Emojis, 0 Native Alerts).
  - توفير بنك وسوم سريعة جاهزة بضغطة زر مقسمة تصنيفياً (استبعادات: بدون بصل، بدون طماطم، بدون ثوم، إلخ / درجة الحار: حار، وسط، بارد / إضافات: زيادة صوص، زيادة جبن / تحضير: مقرمش، ويل دن / تعبئة وتغليف: سفري، تيك أواي).
  - كل وسم يحمل صياغة ثنائية ذكية (عربي / إنجليزي) تظهر للكاشير بالعربية وتُترجم وتُطبع فوراً لطاقم المطبخ باللغة الإنجليزية المقابلة.
  - خانة ملاحظة مخصصة إضافية لكتابة أي طلب استثنائي للزبون.
- **محرك معالجة الملاحظات والترجمة اللحظية (`frontend/src/features/pos/utils/kitchen-notes.util.ts`):**
  - دمج وسوم المطبخ القياسية `KITCHEN_TAG_CATEGORIES` مع خرائط المطابقة والتعرف اللحظي.
  - دوال `formatKitchenNote` لتحويل الملاحظات حسب النمط المطلوب (`dual`, `en`, `ar`).
  - إبراز الملاحظات في بون المطبخ على هيئة شارات مميزة محاطة بحدود (`.kitchen-tag-pill`).
- **شاشات عرض المطبخ التفاعلية (`KdsTicketCard.tsx`):**
  - دعم العرض الثنائي للملاحظات على مستوى بنود الطلب وعلى مستوى الطلب ككل، لتمكين الشيف وطاقم التجهيز من قراءة الطلب دون عوائق لغوية.
- **لوحة الإعدادات والحوكمة (`PrintingSettingsTab.tsx`):**
  - إضافة خيارات تحكم مرنة في تبويب إعدادات الطباعة:
    - قائمة منسدلة `posKitchenLanguage` (ثنائي عربي وإنجليزي / إنجليزي فقط / عربي فقط).
    - خانة اختيار `printBilingualItemNames` لطباعة الأسماء باللغتين في فواتير الكاشير.
- **حزم الاختبارات القياسية:**
  - `kitchen-notes.util.spec.ts` (12 اختبار وحدة)
  - `kitchen.spec.ts` (4 اختبارات لبونات المطبخ)
  - `template.spec.ts` (9 اختبارات لفواتير الكاشير)


<!-- migrated:cap-006:end -->

<a id="cap-013"></a>
<!-- migrated:cap-013:start -->
### قدرة: منظومة الأغذية والمشروبات التنافسية (Foodics F&B Killer Platform) — ✅ مفعّلة ومكتملة 100%
> 📖 **المرجع القطاعي الموحد والمستقل:** تم استخراج وتوثيق كافة مواصفات، مكونات، واجهات، وهجرات قطاع الأغذية والمشروبات والمطاعم في الوثيقة المستقلة: [`RESTAURANT_CAPABILITIES.md`](./RESTAURANT_CAPABILITIES.md).
- **الخلاصة التنفيذية للقدرات المكتملة:**
  - **الصالة والطاولات:** محرر 2D تفاعلي بالسحب والإفلات (`PosVisualFloorCanvas.tsx`)، 4 أشكال هندسية، تقسيم مناطق وحد أدنى للإنفاق.
  - **المنيو والكومبو:** معالج كومبو 3 خطوات، استبعاد فوري 86 مع مؤقت استعادة، وربط الإضافات بالمخزن لحظياً لخصم الـ BOM وتكلفة الـ COGS.
  - **المطبخ و KDS:** شاشات مطبخ متعددة المحطات، محطة تجميع Expo، ومسارات تقديم الوجبات بنقرة واحدة (1-Click Fire Course).
  - **الحسابات والتقسيم:** تقسيم كسري للأطباق (½, ⅓, ¼)، تقسيم شيكات بالأصناف والتساوي، دفع ذاتي بكيو آر الطاولة، وتوزيع التبس.
  - **الرقابة والمخزون:** تسجيل هدر المطبخ بقيد محاسبي مزدوج (5300/1140)، وتقرير انحراف تكلفة الطعام (Theoretical vs Actual).
  - **التوطين والمنصات:** جاهز، هنقرستيشن، طلبات، كاري، نظام البيجر والاستدعاء، سداد كي نت (K-NET)، وتوافق SFDA الغذائي.
  - **شاشات العرض والويتر:** 5 شاشات عرض موحدة (لوحة الطلبات، شاشة المطبخ، شاشة العميل، الشاشات الإعلانية، ومحطة الويتر المتجاوبة مع طابور أوفلاين وحزمة أندرويد APK).
  - *للتفاصيل الفنية الكاملة وأسماء الملفات والهجرات الـ 9، يرجى مراجعة [وثيقة قدرات المطاعم](./RESTAURANT_CAPABILITIES.md).*


<!-- migrated:cap-013:end -->

<a id="cap-059"></a>
<!-- migrated:cap-059:start -->
## 34. شاشة المطبخ التفاعلية للمطاعم والكافيهات (Interactive Kitchen Display System - KDS) 🍳📱
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/sales/services/kds.service.ts`, `backend/src/modules/sales/controllers/kds.controller.ts`, `backend/src/modules/sales/sales.module.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/pos/api/kds.api.ts`, `frontend/src/features/pos/pages/KitchenDisplayPage.tsx`, `frontend/src/app/router/root-router.tsx`, `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
* **الجداول في قاعدة البيانات:** `sales`, `sale_items`, `settings`, `users`, `customers`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **سحب التذاكر اللحظي ومزامنة الصالة والدليفري** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | التقاط فوري لطلبات وفواتير الصالة وطاولات المطعم والطلبات الخارجية، وتوليد بطاقات تذاكر متجاوبة ومحدثة لحظياً كل 5 ثوانٍ. |
| **التحكم بمسارات الأطباق وإطلاق الوجبات (Dining Course Firing Action & Floor Plan Sync)** | 🟢 | 100% | `PosWorkspaceHeader.tsx`, `PosTablesFloorPlanDialog.tsx`, `kds.service.ts`, `kds.controller.ts`, `sales-write.service.ts`, `KitchenDisplayPage.tsx` | تحكم كامل للنادل والكاشير بمسار تقديم الأطباق (مقبلات، أطباق رئيسية، حلويات) من هيدر الكاشير وخريطة الصالة التفاعلية للطاولات، مع زر إطلاق المسار التالي بنقرة واحدة (Fire Next Course) لمزامنة تذاكر المطبخ في KDS فورياً، وإعادة حالة التذكرة إلى الطهي للتنبيه دون إعادة تصفير توقيت الطلب الكلي، وتصفية التذاكر بحسب المسار. |
| **عداد زمني ومؤشر لوني ديناميكي يرصد التأخير (Urgency Clock)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | عداد زمني حي يحسب دقائق وثواني التجهيز بدقة: الأخضر أقل من 8 دقائق، الأصفر 8-15 دقيقة، الأحمر الوامض لأكثر من 15 دقيقة لتنبيه الشيف والمشرف لتفادي تأخر الزبائن. |
| **منبه صوتي ذكي عند ورود طلب جديد (Web Audio Chime)** | 🟢 | 100% | `KitchenDisplayPage.tsx` | رنين تنبيه موسيقي ثنائي النغمة متولد برمجياً عبر Web Audio API دون الحاجة لملفات صوت خارجية، ينبه الطهاة فورياً بمجرد إصدار تذكرة جديدة مع إمكانية الكتم والتشغيل. |
| **آلة حالات دورة تجهيز الوجبات (KDS State Machine)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | تدرج منطقي سلس للطلب بلمسة واحدة: ورد للتو ➔ بدء التجهيز ➔ جاهز للاستلام ➔ تم التسليم بنجاح وحفظ الحالة فورياً عبر الأجهزة المختلفة. |
| **فرز وتوجيه المحطات (Stations Routing & Split)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | إمكانية تصفية التذاكر والأصناف بحسب محطة العمل بالمطبخ: الكل، المطبخ الساخن، المشويات، المشروبات والبار، أو المخبوزات والحلويات لتوزيع العمل بدقة. |
| **شطب وتجهيز الأصناف الفردية (Item Strikethrough)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | النقر على أي صنف داخل التذكرة لوضع خط شطب عليه مع شارة تم لتنظيم تحضير الوجبات المتعددة ضمن نفس الطلب. |
| **استرجاع آخر طلب تم تسليمه (Recall Last Served Ticket)** | 🟢 | 100% | `kds.service.ts`, `KitchenDisplayPage.tsx` | زر استرجاع فوري بضغطة واحدة لإعادة فتح آخر تذكرة تم تسليمها بالخطأ أو تعديلها من الأرشيف مباشرة. |

---


<!-- migrated:cap-059:end -->

<a id="cap-062"></a>
<!-- migrated:cap-062:start -->
## 37. الطلب الذاتي من الطاولة بالـ QR للمطاعم والكافيهات (Dine-In QR Table Ordering) 🍽️📲
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/storefront/storefront.service.ts`, `backend/src/modules/storefront/storefront-public.controller.ts`, `backend/src/modules/storefront/dto/create-online-order.dto.ts`, `backend/src/database/migrations/2040000000046_qr_table_ordering_and_gps_attendance.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/storefront/pages/PublicStorefrontPage.tsx`, `frontend/src/features/storefront/components/StorefrontCheckoutModal.tsx`, `frontend/src/features/storefront/types/storefront.types.ts`, `frontend/src/app/router/root-router.tsx`
* **الجداول في قاعدة البيانات:** `online_orders` (أعمدة `order_type`, `table_number`, `kitchen_draft_sale_id` — هجرة 133), `sales` (مسودة المطبخ `status='draft'`), `sale_items`, `products`, `tenants`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **توليد وتخصيص ملصقات واستيكرات الـ QR لكل طاولة** | 🟢 | 100% | `storefront.service.ts`, `storefront-public.controller.ts` | نقطة نهاية `/st/:slug/tables-qr` لتوليد مصفوفة روابط وباركودات الطاولات دفعة واحدة (من طاولة 1 إلى طاولة 50) للطباعة واللصق على طاولات الصالة. |
| **التعرف التلقائي على رقم الطاولة بالرابط المباشر** | 🟢 | 100% | `PublicStorefrontPage.tsx`, `root-router.tsx` | عند مسح كود الطاولة عبر كاميرا هاتف العميل يفتح الرابط `/st/:slug?table=5` أو `/st/:slug/table/5` تلقائياً مع شريط تنبيه أخضر علوي بارز يوضح رقم الطاولة. |
| **تنزيل طلب المتجر في سلة الكاشير بخصمه وأسعاره** | 🟢 | 100% | `storefront.service.ts:prepareOrderForPos`, `sales-write.service.ts:resolveOnlineOrderTerms`, `pos/contracts.ts` | الكاشير ينزّل الطلب في السلة ويعدّل عليه، وخصم الكوبون وأسعار السطور اللي المتجر ثبّتها بتعدي من غير ما يطلب PIN مدير، لأن السيرفر بيقراها من الطلب المخزَّن نفسه. الطلب الملغي أو اللي اتحول لفاتورة قبل كده مابيعتمدش أي خصم |
| **رابط مستقل لكل متجر على سب دومين (`almhnds.zsystemai.com`)** | 🟢 | 100% | `store-public-url.engine.ts`, `frontend/src/lib/store-public-url.ts`, `root-router.tsx`, `PublicStorefrontPage.tsx`, `deploy/nginx/zsystemai-subdomains.conf` | كل متجر يفتح على `https://<slug>.<root>` بنفس قاعدة البيانات (الاسم بيتقري من الدومين بدل المسار). رابط المتجر في الإعدادات وصفحة الطلبات ومشاركة المنتج وروابط QR الطاولات ورابط تتبع الطلب ومعاينة واتساب ورد بوت الذكاء الاصطناعي كلها من محرك واحد (SF-10). الأسماء المحجوزة (`app`، `www`، `api`، ...) مرفوضة. الروابط القديمة `/st/` و`/store/` و`/shop/` بتتحول تلقائياً. **الحالة:** مفعّل في الإنتاج من 22 سبتمبر 2026. الجذر `zsystemai.com` بقى الموقع التسويقي، فالروابط القديمة على الجذر مابقتش بتفتح المتجر (مفيش روابط اتوزعت على عملاء)؛ `app.zsystemai.com/st/<slug>` بيحوّل للسب دومين. الديسكتوب ومن غير المتغيرين: `/st/<slug>` كما كانت |
| **إسقاط رسوم التوصيل وعنوان الشارع لطلبات الصالة** | 🟢 | 100% | `StorefrontCheckoutModal.tsx`, `storefront.service.ts` | إلغاء مصاريف التوصيل وتصفيرها تماماً، واستبدال حقل عنوان الشارع ببطاقة خضراء أنيقة تثبت رقم الطاولة لمنع أي لبس أو إدخال بيانات غير ضرورية للزبون. |
| **التوجيه التلقائي لشاشات المطبخ (KDS) والكاشير فور الإرسال** | 🟢 | 100% | `storefront.service.ts`, `KitchenDisplayPage.tsx` | بمجرد تأكيد الزبون للطلب من هاتفه، يُنشئ النظام آلياً سجل بيع معتمد برقم الطاولة وينزل فوراً بشاشة المطبخ KDS مع تنبيه صوتي وتحديد رقم الطاولة لتحضيرها فوراً.<br/>**تصحيح سبتمبر 2026 (O53):** «سجل البيع المعتمد» كان فاتورة `posted` تُكتب مباشرة بلا خصم مخزون ولا قيد ولا دفع — إيراد في التقارير لا يعرفه الأستاذ، والطلب لا يمكن تنزيله في الكاشير. صار الطلب يُنشئ **مسودة للمطبخ** (`status='draft'`، تظهر فوراً على KDS بلا أي أثر مالي) في نفس معاملة الطلب. الكاشير ينزّل الطلب في السلة كطلب صالة لنفس الطاولة ويرحّله عبر محرك المبيعات، فتُحذف المسودة تلقائياً وتنتقل حالة التذكرة (قيد التحضير/جاهز) للفاتورة الحقيقية. الإلغاء يزيل التذكرة. العميل لا يستطيع إلغاء/تعديل طلب الطاولة بعد إرساله (يطلبه من فريق الخدمة). فواتير الطاولة القديمة قبل التصحيح موثقة في O61. |
| **تتبع حالة الوجبة من هاتف الزبون ونافذة نجاح الطلب (Order Success & Meal Tracking)** | 🟢 | 100% | `StorefrontSuccessModal.tsx`, `StorefrontMyOrdersModal.tsx` | إمكانية متابعة العميل لحالة تجهيز طلبه من هاتفه مباشرة (قيد التجهيز بالمطبخ -> جاهز للتسليم على الطاولة).<br/>**ترقية أكتوبر 2026:** توسيع نافذة النجاح لـ `520px`، منع انكسار الأسعار والعملة عمودياً (`whiteSpace: 'nowrap'`)، وضمان ثبات واستقرار جدول الأصناف والفاتورة وتناسق زر الانتقال الفوري لـ «طلباتي». |
| **سلايدر بنرات المتجر فائق العرض (Panoramic 4:1 Banner Carousel)** | 🟢 | 100% | `StorefrontBannerCarousel.tsx`, `StorefrontSettingsTab.tsx`, `storefront-media-url.ts`, `storefront-public.controller.ts` | دعم بنرات إعلانية بانورامية فائقة العرض بنسبة 4:1 وأبعاد 1600×400 بكسل تملأ كادر المتجر بالكامل بنمط Contain دون قص، مع قوالب برومبت ذكية للذكاء الاصطناعي (ChatGPT / Midjourney) بقاعدة الأمان 60/20/20، ودعم ترويسات CORP/CORS لضمان عدم انكسار الصور في بيئة التطوير أو النطاقات المخصصة. |
| **رفع وتخصيص لوجو المتجر الرسمي (Storefront Official Logo Upload)** | 🟢 | 100% | `StorefrontSettingsTab.tsx`, `StorefrontHeader.tsx`, `StorefrontFooter.tsx`, `storefront.service.ts`, `update-storefront-settings.dto.ts` | دعم رفع لوجو رسمي للمتجر من إعدادات المتجر مع ضغط فوري WebP ومعاينة مباشرة، وظهوره بدقة في هيدر وفوتر المتجر مع بديل مونوغرام ذكي بحرف المتجر وخلفية العلامة في حال عدم رفع لوجو، مع ضبط أبعاد الأزرار العلوية ومنع تزاحم شريط التنقل. |
| **الفوتر المؤسسي وشريط الثقة المعتمد ورابط مشغل بواسطة (Enterprise Footer & Powered by Link)** | 🟢 | 100% | `StorefrontFooter.tsx`, `PublicStorefrontPage.tsx` | تصميم فوتر مؤسسي أنيق (Option 2 Clean Enterprise Light) يتضمن شريط ثقة مدمج وموثوق (شحن سريع، أصالة المنتجات، دفع مرن، خدمة عملاء)، دليل روابط سريع، دعم فوري عبر واتساب، شارات واقعية لوسائل الدفع (Visa, Mastercard, Meeza, كاش عند الاستلام، محافظ ذكية)، مع علامة تجارية منسقة "مشغل بواسطة Z-Systems ERP" قابلة للنقر وتفتح رابط المنظومة https://zsystemai.com/erp بنقرة واحدة. |

---


<!-- migrated:cap-062:end -->

<a id="cap-099"></a>
<!-- migrated:cap-099:start -->
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


<!-- migrated:cap-099:end -->

<a id="cap-250"></a>
<!-- migrated:cap-250:start -->
## 206. منظومة تقرير انحراف تكلفة الطعام الفعلي مقابل النظري للمطاعم وسحق فودكس (Restaurant Theoretical vs. Actual Food Cost Variance Report)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** `/reports` ➔ تبويب `انحراف تكلفة الطعام (مطاعم)` (`food_cost_variance`).
* **الهدف:** تفوق مطلق على Foodics و Toast و MarketMan بتقديم تقرير تدقيق مالي وتحليلي لحظي لقطاع الأغذية والمشروبات (F&B Variance Audit) يقضي على الهدر والسرقات وانحرافات التشغيل.
* **المحرك والميزات المنفذة:**
  1. **الاستهلاك النظري التراكمي (Theoretical Usage):**
     - تجميع مبيعات الوجبات والأطباق عبر فترات زمنية محددة وفك معادلات التصنيع (BOM Recipes) لمعرفة الكميات المفترضة للمواد الخام.
     - دمج الاستهلاك الناتج عن إضافات وخيارات الوجبات (Modifiers) تلقائياً عبر `pos_modifier_options`.
  2. **الاستهلاك الفعلي وحركات المستودعات (Actual Consumption):**
     - قراءة صافي حركات الصرف المخزني من واقع `stock_movements`.
     - جلب كميات الهدر والتالف المسجلة في `restaurant_food_waste_logs`.
  3. **تحليل الانحراف المالي ومستويات الخطورة (Variance & Risk Tiers):**
     - احتساب الفارق الكمي: `varianceQty = actualQty - theoreticalQty`.
     - احتساب القيمة المالية للانحراف: `varianceValue = varianceQty * costPrice`.
     - احتساب نسبة الانحراف المئوية وتصنيف البنود تلقائياً:
       - **عجز حرج (Critical Shortage):** انحراف يتجاوز 10% أو 500 ج.م/ريال/درهم عجزاً غير مبرر.
       - **تحذير (Warning):** انحراف بين 3% و 10%.
       - **مطابق (Normal):** انحراف ضمن هامش التسامح الطبيعي (أقل من 3%).
  4. **واجهة مستخدم مؤسسية راقية (Enterprise UI):**
     - بطاقات مؤشرات أداء KPI موجزة (إجمالي التكلفة النظرية، إجمالي التكلفة الفعلية، صافي قيمة الانحراف، ونسبة الانحراف الإجمالية).
     - محدد نطاق زمني فوري (`من` و `إلى`)، بحث سريع باسم المادة الخام أو كودها، وفلاتر حصرية لحالات الخطورة.
     - جدول تحليلي متكامل بتنسيق أرقام دقيق وشارات خطورة لونية مؤسسية وزر تصدير وطباعة.
* **الملفات المنفذة:**
  - `backend/src/modules/reports/reports.service.ts`
  - `backend/src/modules/reports/reports.controller.ts`
  - `frontend/src/features/reports/api/reports.api.ts`
  - `frontend/src/features/reports/pages/reports.page-config.ts`
  - `frontend/src/features/reports/components/ReportsSectionContent.tsx`
  - `frontend/src/features/reports/components/sections/FoodCostVarianceReportSection.tsx`

---


<!-- migrated:cap-250:end -->

<a id="cap-251"></a>
<!-- migrated:cap-251:start -->
## 207. منظومة طباعة الشيك المبدئي وشارات تسليم الحساب (Guest Check / Proforma Bill & Delivered Badges)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ شريط الهيدر، خريطة الصالة والطاولات `PosTablesFloorPlanDialog`، ومحرك الطباعة الحرارية.
* **الهدف:** تمكين طاقم الخدمة والكاشير من طباعة شيك حساب الطاولة غير المسدد بنقرة واحدة لتقديمه للزبون قبل السداد، مع وسم الطاولة فوراً بشارة مرئية "تم تسليم الشيك" لمنع تكرار طلب الحساب أو ارتباك الويترية.
* **المحرك والميزات المنفذة:**
  1. **طباعة الشيك المبدئي المخصص (Guest Check Thermal Engine):**
     - قالب طباعة حراري رسمي واضح وموسوم بـ "شيك حساب طاولة (غير مسدد)" و "للمعاينة ومراجعة الحساب فقط" لمنع استخدامه كفاتورة ضريبية رسمية قبل الدفع.
     - يتضمن تفاصيل الأصناف، الإضافات (Modifiers)، المجموع الفرعي، الخصومات، رسوم خدمة الصالة، الضريبة، والإجمالي النهائي، مع عدد الضيوف ورقم الطاولة.
  2. **الطباعة المباشرة من خريطة الصالة (Floor Plan 1-Click Print):**
     - توفير زر فوري على بطاقات الطاولات المشغولة في خريطة الصالة (`طباعة شيك`) يطبع الشيك المبدئي ويثبت توقيت التسليم دون الحاجة لاسترجاع الفاتورة للسلة أولاً.
  3. **شارة حالة تسليم الحساب (Check Delivered Badge):**
     - ظهور شارة كهرمانية أنيقة `تم تسليم الشيك` على بطاقة الطاولة في خريطة الصالة وعلى زر الهيدر فور إتمام الطباعة، مما يعطي كابتن الصالة رؤية لحظية للطاولات التي تراجع حسابها حالياً.
* **الملفات المنفذة:**
  - `frontend/src/lib/pos-printing.ts`
  - `frontend/src/lib/pos-printing/template.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `frontend/src/features/pos/components/PosWorkspace.tsx`
  - `backend/src/database/migrations/2040000000212_restaurant_service_charge_and_guest_operations.ts`

---


<!-- migrated:cap-251:end -->

<a id="cap-252"></a>
<!-- migrated:cap-252:start -->
## 208. منظومة احتساب رسوم خدمة الصالة التلقائية للطلبات الداخلية (Dine-in Service Charge System)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** `/settings` ➔ تبويب المبيعات والمخزون (Sales & Inventory) + سلة الكاشير `/pos` + احتساب الإجماليات بالباك إند والفرونت إند.
* **الهدف:** دعم معيار المطاعم والكافيهات العالمية والخليجية والمصرية بتطبيق نسبة خدمة الصالة تلقائياً (Service Charge %) على طلبات الصالة (`dine_in`) دون تدخل يدوي من الكاشير.
* **المحرك والميزات المنفذة:**
  1. **تهيئة الإعدادات المركزية (Configurable Settings):**
     - مفتاح تفعيل `restaurantServiceChargeEnabled` وحقل نسبة مئوية مرن `restaurantServiceChargePercent` (افتراضياً 12%) داخل قسم المطاعم والكافيهات.
  2. **التطبيق الآلي الشرطي (Conditional Dine-in Application):**
     - تُطبق الخدمة تلقائياً بمجرد اختيار نوع الطلب `صالة (dine_in)` وتُستثنى تلقائياً عند التحويل إلى `تيك أواي` أو `دليفري`.
     - تُحسب النسبة على الصافي بعد الخصومات وقبل الضريبة: `serviceCharge = (subTotal - discount) * (serviceChargePercent / 100)`.
  3. **المطابقة المحاسبية الثنائية (Dual Engine Totals):**
     - تكامل متطابق 100% بين محرك الباك إند (`computeInvoiceTotals`) ومحرك الفرونت إند (`usePosWorkspaceDerived`).
     - تخزين قيمة الخدمة في عمود مخصص `service_charge` بجدول `sales` وتضمينها في الإيصالات والفواتير المطبوعة.
* **الملفات المنفذة:**
  - `backend/src/common/utils/invoice-totals.ts`
  - `backend/src/modules/sales/services/sales-write.service.ts`
  - `backend/src/modules/sales/dto/upsert-sale.dto.ts`
  - `backend/src/modules/sales/helpers/sales-payload.helper.ts`
  - `frontend/src/features/settings/components/forms/tabs/SalesInventorySettingsTab.tsx`
  - `frontend/src/features/settings/contracts.ts`
  - `frontend/src/features/settings/schemas/settings.schema.ts`
  - `frontend/src/features/pos/hooks/usePosWorkspaceDerived.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosCheckoutDialogSections.tsx`

---


<!-- migrated:cap-252:end -->

<a id="cap-253"></a>
<!-- migrated:cap-253:start -->
## 209. عداد الضيوف ومؤشر متوسط إنفاق الفرد في قطاع المطاعم (Covers Count & Spend Per Guest KPI)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ شريط الهيدر، مسودات الطاولات المعلقة، وإدخال المبيعات.
* **الهدف:** تمكين إدارات المطاعم ومحاسبي التكاليف من قياس إنتاجية الطاولات ومتوسط استهلاك الزبون الواحد (Average Spend per Cover / Guest) لحظياً.
* **المحرك والميزات المنفذة:**
  1. **عداد الضيوف المتوافق مع دستور الواجهات العربية (Strict RTL Stepper):**
     - عداد ديناميكي مع الالتزام التام بقاعدة `[+] (العدد) [-]` (الزائد يميناً برمجياً وبصرياً، والناقص يساراً).
     - حفظ عدد الضيوف في المسودة المحلية والمسودات المعلقة وقاعدة البيانات في عمود `sales.guest_count`.
  2. **مؤشر متوسط إنفاق الفرد اللحظي (Spend Per Guest):**
     - احتساب وعرض متوسط إنفاق الضيف فورياً بجوار العداد: `متوسط الفرد = إجمالي الفاتورة / عدد الضيوف`.
     - طباعة عدد الضيوف في شيكات المعاينة المبدئية وفواتير البيع الرسمية.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `frontend/src/features/pos/hooks/usePosWorkspaceState.ts`
  - `frontend/src/features/pos/lib/pos.persistence.ts`
  - `frontend/src/features/pos/hooks/usePosWorkspaceEffects.ts`
  - `frontend/src/features/pos/hooks/usePosWorkspace.ts`
  - `backend/src/database/migrations/2040000000212_restaurant_service_charge_and_guest_operations.ts`

---


<!-- migrated:cap-253:end -->

<a id="cap-254"></a>
<!-- migrated:cap-254:start -->
## 210. منظومة حجوزات الطاولات وإدارة تدفق الضيوف (Table Reservations & Hostess Management)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير والمخطط التفاعلي `/pos` ➔ نافذة حجوزات الصالة `PosTableReservationsModal` والـ API `/api/sales/table-reservations`.
* **الهدف:** إدارة شاملة لحجوزات الطاولات المسبقة، منع التضارب مع زبائن الـ Walk-in، وإجلاس الضيوف بنقرة واحدة متفوقاً على تطبيق Foodics Reservations.
* **المحرك والميزات المنفذة:**
  1. **إدارة الحجوزات والجدول الزمني:**
     - تسجيل الحجز: اسم الضيف، الهاتف، موعد الحجز، عدد الأفراد (RTL Stepper)، رقم الطاولة، والمناسبة/الطلبات الخاصة.
     - حالات الحجز: مؤكد (Confirmed)، جالس بالصالة (Seated)، ملغي (Cancelled)، لم يحضر (No-Show).
  2. **التكامل المباشر مع خريطة الصالة (Floor Plan):**
     - تمييز الطاولات المحجوزة لليوم بشارة زرقاء مؤسسية "حجز" واسم الضيف وتوقيت الحجز.
     - زر سريع في هيدر المخطط "حجوزات اليوم (X)" يفتح سجل الحجوزات اليومية.
  3. **إجراء إجلاس الضيف الفوري (1-Click Seat Guest):**
     - نقرة واحدة على "إجلاس الضيف" تحدث حالة الحجز إلى "جالس بالصالة"، وتفتح الطاولة فوراً في الكاشير بعدد الضيوف واسم العميل.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000213_restaurant_table_reservations.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/sales/dto/table-reservation.dto.ts`
  - `backend/src/modules/sales/services/table-reservations.service.ts`
  - `backend/src/modules/sales/controllers/table-reservations.controller.ts`
  - `backend/src/modules/sales/sales.module.ts`
  - `frontend/src/features/pos/api/table-reservations.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosTableReservationsModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`
  - `frontend/src/features/pos/components/PosWorkspace.tsx`

---


<!-- migrated:cap-254:end -->

<a id="cap-255"></a>
<!-- migrated:cap-255:start -->
## 211. شاشة إعلان جاهزية الطلبات للعملاء وسائقي التوصيل (Customer Pickup / Order Status Display Board)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** `/pos/order-status` و `/order-status` و `/pickup-board` ➔ بوابة شاشات العرض `/displays`.
* **الهدف:** شاشة تلفاز أفقية عالية الوضوح بصالة الانتظار والاستلام تعرض حالة الطلبات قيد التحضير والجاهزة للاستلام مع تنبيه صوتي فوري، موازية لشاشات ماكدونالدز وفودكس.
* **المحرك والميزات المنفذة:**
  1. **تقسيم الشاشة الثنائي المتوازي (Dual High-Contrast View):**
     - عمود "قيد التجهيز (Preparing)": يعرض أرقام الطلبات الحالية بالمطبخ باللون الكهرماني.
     - عمود "جاهز للاستلام (Ready for Pickup)": يعرض أرقام الطلبات المجهزة باللون الأخضر المتوهج.
  2. **التنبيه الصوتي النغمي (Web Audio Acoustic Chime):**
     - توليد نغمة ثنائية فورية متناسقة عند تحويل أي طلب إلى "جاهز للاستلام" للفت انتباه الزبائن وسائقي التوصيل (جاهز، هنقرستيشن، طلبات).
  3. **أزرار التحكم والشاشات الذكية:**
     - زر وضع ملء الشاشة الفوري (TV Mode) وساعة رقمية حية ومؤشر عدد الطلبات في كل قسم.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/pages/OrderStatusBoardPage.tsx`
  - `frontend/src/features/pos/pages/DisplaysPortalPage.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `frontend/src/app/router/root-router.tsx`

---


<!-- migrated:cap-255:end -->

<a id="cap-256"></a>
<!-- migrated:cap-256:start -->
## 212. محطة كابتن الصالة والويتر الميداني السريع (Handheld Waiter / Captain Station)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** `/pos/waiter` و `/waiter` ➔ بوابة شاشات العرض `/displays` وقائمة شاشات الهيدر.
* **الهدف:** واجهة خفيفة ومخصصة لهواتف وأجهزة التابلت المحمولة باليد لكابتن الصالة والويتر لأخذ الطلبات من الطاولات وإرسالها للمطبخ بلحظات، مع عزل كامل لصلاحيات الصندوق والتقارير المالية.
* **المحرك والميزات المنفذة:**
  1. **شبكة الطاولات اللمسية السريعة:**
     - استعراض فوري لحالة الطاولات (شاغرة ومتاحة بالأخضر، مشغولة بالأحمر مع إجمالي الحساب).
     - عداد الضيوف المتوافق مع دستور الواجهات العربية `[+] (الضيوف) [-]`.
  2. **أخذ الطلب وملاحظات الأطباق:**
     - شريط تصنيفات أفقي سلس، وبطاقات وجبات كبيرة للمس السريع.
     - نافذة ملاحظات التحضير الفردية لكل طبق (مثل "بدون بصل"، "مستوي جيداً"، "يقدم مع المقبلات").
  3. **الإرسال الفوري للمطبخ (Send to Kitchen):**
     - زر ضخم "إرسال الطلب للمطبخ" يحفظ مسودة الطاولة ويطلق بون المطبخ الحراري (KOT) وتذكرة شاشة المطبخ (KDS) ويعود تلقائياً لشبكة الطاولات للطاولة التالية.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/pages/WaiterStationPage.tsx`
  - `frontend/src/features/pos/pages/DisplaysPortalPage.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `frontend/src/app/router/root-router.tsx`

---


<!-- migrated:cap-256:end -->

<a id="cap-257"></a>
<!-- migrated:cap-257:start -->
## 213. معالج وجبات الكومبو السريعة بنظام الخطوات (Step-by-Step Combo Meals Builder)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "وجبة كومبو" في شريط الهيدر ➔ معالج الوجبات التجميعية `PosComboMealModal`.
* **الهدف:** دعم هندسة وجبات الـ QSR ومطاعم البرجر والوجبات السريعة ببناء الوجبة التجميعية خطوة بخطوة مع فوارق الأسعار وحفظ المكونات.
* **المحرك والميزات المنفذة:**
  1. **المسار التسلسلي للوجبة (3-Step Guided Wizard):**
     - **الخطوة 1:** الصنف الرئيسي (البرجر/الساندوتش).
     - **الخطوة 2:** الصنف الجانبي (بطاطس كلاسيك مجاناً، بطاطس جبنة شيدر +12 ج.م/ريال، حلقات بصل +15 ج.م/ريال، كول سلو +8 ج.م/ريال، ويدجز +10 ج.م/ريال).
     - **الخطوة 3:** المشروب المنعش (مشروبات غازية، مياه، عصائر طبيعية بفوارق الأسعار) وملاحظات الوجبة.
  2. **بطاقة الملخص والتسعير اللحظي:**
     - عرض مباشر لسعر الأساس وفوارق الأصناف والإجمالي النهائي.
     - إضافة الصنف للسلة كبند موحد مفصل بمكوناته وإضافاته وملاحظاته يطبع في بون المطبخ وشيك الحساب.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/components/pos-workspace/PosComboMealModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `frontend/src/features/pos/components/PosWorkspace.tsx`

---


<!-- migrated:cap-257:end -->

<a id="cap-258"></a>
<!-- migrated:cap-258:start -->
## 214. مصفوفة هندسة قائمة الطعام وتحليل الربحية والشعبية (Menu Engineering Matrix - BCG F&B Analysis)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** التقارير المؤسسية `/reports` ➔ تبويب "هندسة المنيو (BCG)" (`menu_engineering`) ➔ نقطة النهاية `/api/reports/restaurant/menu-engineering`؛ **معزول ومحجوب 100% عن أنشطة التجزئة والتجارة العامة** ولا يظهر في تبويبات مركز التقارير إلا عند تفعيل موديول المطاعم والكافيهات (`restaurantModuleEnabled: true`).
* **الهدف:** تطبيق المعيار الأكاديمي والمهني العالمي لهندسة المنيو (Kasavana & Smith Menu Engineering Model) لتقييم كل صنف في القائمة حسب الربحية والشعبية وحساب نسبة تكلفة الغذاء (Food Cost %) وتصنيفه إلى الأقسام الأربعة (النجوم، أحصنة الجر، الألغاز، الأصناف الخاسرة) مع توصيات تجارية لتعظيم الربح.
* **المحرك والميزات المنفذة:**
  1. **معدل العتبة ومعايير التصنيف الأكاديمية (Hurdle Rate Benchmark):**
     - عتبة الشعبية (Popularity Hurdle): تمثل 70% من الحصة المتساوية للأصناف في القائمة `(100 / N) * 0.70`.
     - عتبة الربحية (Profit Margin Benchmark): متوسط هامش الربح للصنف عبر كامل المبيعات `إجمالي الربح / إجمالي الوحدات المباعة`.
  2. **أرباع المصفوفة الأربعة (The 4 BCG Quadrants):**
     - **النجوم (Stars):** أصناف عالية الربحية وعالية الشعبية (أبطال المنيو ➔ الحفاظ على ثبات الجودة وموقع الصدارة).
     - **أحصنة الجر (Plowhorses):** أصناف عالية المبيعات منخفضة الهامش (➔ رفع السعر 5-8% أو تخفيض تكلفة المكونات لتحسين الهامش).
     - **الألغاز (Puzzles):** أصناف عالية الربحية منخفضة المبيعات (➔ إعادة تسليط الضوء عليها في المنيو وتدريب الويترز على الـ Upselling).
     - **الأصناف الخاسرة (Dogs):** أصناف ضعيفة المبيعات وضعيفة الربحية (➔ دراسة استبعادها لتوفير الهدر ومساحات التخزين).
  3. **مؤشرات الأداء الاستراتيجية (KPI Cards):**
     - إجمالي الإيرادات، هامش الربح الإجمالي، نسبة تكلفة الطعام العامة (Overall Food Cost %)، ومتوسط هامش الصنف، وحساب الربح المتوقع تحقيقه من تحسين المنيو (Potential Profit Uplift).
* **الملفات المنفذة:**
  - `backend/src/modules/reports/helpers/reports-menu-engineering.helper.ts`
  - `backend/src/modules/reports/reports.service.ts`
  - `backend/src/modules/reports/reports.controller.ts`
  - `frontend/src/features/reports/api/reports.api.ts`
  - `frontend/src/features/reports/components/sections/MenuEngineeringReportSection.tsx`
  - `frontend/src/features/reports/pages/reports.page-config.ts`
  - `frontend/src/features/reports/components/ReportsSectionContent.tsx`
  - `frontend/src/features/reports/hooks/useReportsWorkspaceMetrics.ts`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts`

---


<!-- migrated:cap-258:end -->

<a id="cap-259"></a>
<!-- migrated:cap-259:start -->
## 215. شبكة طابعات المطبخ والبار وتوجيه البونات حسب المحطة (Multi-Printer Network KOT Routing)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "طابعات المطبخ والبار" بهيدر الصالة ➔ نافذة `PosKitchenPrintersModal` ➔ والـ API `/api/sales/kitchen-printers`.
* **الهدف:** توجيه بونات التحضير (Kitchen Order Tickets - KOT) تلقائياً عبر الشبكة المحلية (Ethernet / WiFi / ESC-POS) حسب محطة التجهيز المحددة للأصناف والتصنيفات (المطبخ الساخن، البار والمشروبات، الشواية، المقليات، الحلويات، والسلطات الباردة).
* **المحرك والميزات المنفذة:**
  1. **إدارة طابعات الشبكة المحلية:**
     - تعريف الطابعة: الاسم، عنوان IP المحلي (مثال: `192.168.1.200`)، المنفذ (افتراضياً 9100)، وعرض الورق (80mm / 58mm).
     - ربط الطابعة بمحطة التحضير المستهدفة: `kitchen`, `bar`, `grill`, `fryer`, `cold`, `dessert`, `expo`.
  2. **التوجيه التلقائي للأصناف والتصنيفات:**
     - إضافة حقل `kitchen_station` للتصنيفات والمنتجات لتحديد محطة التجهيز التلقائية لكل صنف.
     - عزل وتوزيع بنود الفاتورة الواحدة عند إرسال الطلب للمطبخ ليطبع بون المشروبات في البار فقط وبون اللحوم في الشواية فقط وبون الوجبات في المطبخ الرئيسي.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000214_pos_kitchen_printers_and_stations.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/sales/dto/kitchen-printer.dto.ts`
  - `backend/src/modules/sales/services/kitchen-printers.service.ts`
  - `backend/src/modules/sales/controllers/kitchen-printers.controller.ts`
  - `backend/src/modules/sales/sales.module.ts`
  - `frontend/src/features/pos/api/kitchen-printers.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosKitchenPrintersModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts`

---


<!-- migrated:cap-259:end -->

<a id="cap-260"></a>
<!-- migrated:cap-260:start -->
## 216. شاشة منسق تسليم المطبخ وتتبع جاهزية الأصناف (Kitchen Expediter / Expo KDS Station)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة المطبخ `/pos/kds` ➔ فلتر المحطات "منسق التسليم (Expo)" ➔ بطاقات التذاكر `KdsTicketCard`.
* **الهدف:** شاشة مخصصة لمنسق تسليم الأطباق (Kitchen Expediter / Expo Master) تجمع كافة أصناف الطلب المحضرة من المحطات المختلفة وتتحقق من اكتمال الوجبة قبل تسليمها للويتر أو مندوب التوصيل مع شريط تقدم الجاهزية اللحظي.
* **المحرك والميزات المنفذة:**
  1. **محطة الـ Expo المتكاملة:**
     - إضافة محطة "منسق التسليم (Expo)" لشاشات المطبخ الرقمية KDS.
     - إظهار شارات المحطات الملونة بجوار كل طبق (`[بار]`, `[شواية]`, `[مطبخ]`, `[سلطات]`, إلخ).
  2. **شريط تقدم اكتمال الوجبة (Readiness Progress Bar):**
     - عداد ذكي للأصناف الجاهزة مقابل إجمالي الأصناف (مثال: `3 من 5 أصناف جاهزة - 60%`).
     - شريط تقدم ملون يتدرج من الأصفر للبنفسجي للأخضر عند اكتمال جاهزية كافة الأطباق.
     - دعم شطب الأصناف الجاهزة وتفعيل نغمة التنبيه عند اكتمال الطلب بالكامل.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/api/kds.api.ts`
  - `frontend/src/features/pos/components/kds/KdsFilterBar.tsx`
  - `frontend/src/features/pos/components/kds/KdsTicketCard.tsx`

---


<!-- migrated:cap-260:end -->

<a id="cap-261"></a>
<!-- migrated:cap-261:start -->
## 217. محرك الاستبعاد اللحظي للأصناف النافذة بالمطبخ والكاشير (Fast 86'd Items Engine & KDS Integration)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ شريط الهيدر، شاشة المطبخ `/pos/kds` ➔ زر "أصناف 86"، والـ API `/api/sales/restaurant/86-items`.
* **الهدف:** تطبيق المعيار العالمي لإدارة المطابخ (86'd Items) بتمكين الشيف والكاشير من وسم أي صنف أو وجبة بنقرة واحدة بأنها "نافذة بالمطبخ"، وحجبها تلقائياً وفورياً عن سلة الكاشير وأجهزة الويتر والمطبخ لتفادي إحراج طاقم الخدمة مع الزبائن، مع دعم الإعادة التلقائية للخدمة بعد انقضاء ساعات الوردية.
* **المحرك والميزات المنفذة:**
  1. **الوسم الفوري بزر 86 (1-Click Fast 86):**
     - تمييز الصنف فورياً بشارة 86 حمراء مشطوبة، وحفظ سبب الاستبعاد (نفاد الكمية بالمطبخ، تلف المواد الخام، عطل بمعدة الطهي).
     - مؤقت الاستعادة الذاتي (Auto-Restore): إمكانية تحديد إعادة الإتاحة التلقائية بعد 8 ساعات (نهاية الوردية)، 12 ساعة، أو 24 ساعة لصباح اليوم التالي.
  2. **التكامل المزدوج بين المطبخ ونقطة البيع:**
     - زر تفاعلي بهيدر شاشة المطبخ KDS وهيدر الكاشير يعرض عداد الأصناف المستبعدة حياً.
     - نافذة بحث سريعة `Pos86ItemsModal` تمكن الشيف أو الكاشير من استبعاد أو إعادة تفعيل أي صنف بضغطة زر واحدة.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000217_restaurant_advanced_master_suite.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/Pos86ItemsModal.tsx`
  - `frontend/src/features/pos/components/kds/KdsHeader.tsx`
  - `frontend/src/features/pos/pages/KitchenDisplayPage.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`

---


<!-- migrated:cap-261:end -->

<a id="cap-262"></a>
<!-- migrated:cap-262:start -->
## 218. مجمع الإكراميات وتوزيع حصص الوردية على طاقم الصالة والمطبخ (Tip Pooling & Shift Distribution Engine)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "مجمع الإكراميات" بهيدر الصالة ➔ نافذة `PosTipPoolModal` ➔ والـ API `/api/sales/restaurant/tip-pools`.
* **الهدف:** توفير محرك محاسبي وإداري عادل لتجميع كافة إكراميات الوردية (نقدية وبطاقات ودفع إلكتروني للطاولات) في وعاء واحد وتوزيعها بدقة متناهية على طاقم الخدمة والمطبخ متفوقاً على أنظمة Toast و Foodics.
* **المحرك والميزات المنفذة:**
  1. **نماذج التوزيع المرنة الثلاثة:**
     - **أوزان الأدوار الوظيفية (Role-Based Points):** توزيع ذكي بنقاط الخدمة (كابتن صالة 1.5x، ويتر 1.2x، باريستا 1.0x، طاقم المطبخ 0.8x، كاشير 0.8x).
     - **ساعات العمل الفعلية (Hours Worked):** توزيع نسبي بناءً على ساعات عمل كل موظف في الوردية.
     - **التساوي الكامل (Equal Split):** تقسيم المجموع بالتساوي على الحاضرين.
  2. **المطابقة المالية الدقيقة (Zero-Loss Rounding):**
     - خوارزمية توزيع تضمن مطابقة الإجمالي بالمليم مع رصيد المجمع دون أي فوارق تقريب سنتيمية.
     - اعتماد وتوثيق الصرف بجدول `restaurant_tip_pool_distributions` وربطه بالموظف والتاريخ.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000217_restaurant_advanced_master_suite.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosTipPoolModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`

---


<!-- migrated:cap-262:end -->

<a id="cap-263"></a>
<!-- migrated:cap-263:start -->
## 219. خريطة الصالة متعددة الأجنحة وتخصيص الطاولات (Multi-Zone Floor Plan & Dining Sections)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ نافذة خريطة الصالة `PosTablesFloorPlanDialog` ➔ تبويبات أجنحة الصالة.
* **الهدف:** تقسيم صالة المطعم بمرونة عالية إلى أجنحة ومناطق تشغيلية متعددة (الصالة الرئيسية، التراس الخارجي، قسم العائلات، جناح الـ VIP) لتسهيل خدمة المطاعم الضخمة والمنتجعات.
* **المحرك والميزات المنفذة:**
  1. **التبويبات الجغرافية السريعة (Dining Zone Tabs):**
     - شريط تبويبات علوي مدمج في خريطة الصالة يتيح التبديل اللحظي (0ms) بين أقسام المطعم.
     - فلترة الطاولات التابعة لكل جناح مع إحصائيات فورية لعدد الطاولات الشاغرة والمشغولة في كل منطقة.
  2. **هيكلة المناطق بقاعدة البيانات:**
     - جدول `restaurant_table_zones` لتعريف كود المنطقة، اسمها، سعة مقاعدها الافتراضية، ومصفوفة أرقام الطاولات التابعة لها.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000217_restaurant_advanced_master_suite.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`

---


<!-- migrated:cap-263:end -->

<a id="cap-264"></a>
<!-- migrated:cap-264:start -->
## 220. جدول التحضير اليومي للمطبخ المركزي والأصناف نصف المصنعة (Daily Prep Sheet & Central Commissary Engine)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير والمطبخ `/pos` ➔ زر "ورقة التحضير" ➔ نافذة `KitchenDailyPrepSheetModal` ➔ والـ API `/api/sales/restaurant/prep-sheets`.
* **الهدف:** إدارة عمليات المطبخ التحضيري ومحطة التجهيز الصباحية لسلاسل المطابخ والمطاعم لإنتاج المواد نصف المصنعة (تتبيل اللحوم، تقطيع الخضار، تحضير الصوصات باللتر، تجهيز عجين المخبوزات).
* **المحرك والميزات المنفذة:**
  1. **حساب متطلبات التحضير الذاتية (Par Level Engine):**
     - تحديد الكمية المستهدفة (Par Level) للوردية (صباحية، مسائية، ليلية).
     - حساب الفارق التلقائي: `المطلوب تحضيره = المستهدف - المتاح الحالي بالثلاجة`.
  2. **عدادات التحكم المتوافقة مع دستور RTL:**
     - تعديل الكميات المحضرة بعداد `[+] (الكمية) [-]` المتوافق حرفياً مع دستور الواجهات العربية.
     - زر اعتماد إتمام التحضير بنقرة واحدة وتحديث حالة الجاهزية التشغيلية للمطبخ.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000217_restaurant_advanced_master_suite.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/KitchenDailyPrepSheetModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`

---


<!-- migrated:cap-264:end -->

<a id="cap-265"></a>
<!-- migrated:cap-265:start -->
## 221. كروت الأختام الرقمية وبرنامج ولاء المقاهي والمطاعم (Digital Stamp Loyalty & Punch Cards)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "كرت الأختام" ➔ نافذة `PosCustomerPunchCardModal` ➔ والـ API `/api/sales/restaurant/stamp-cards`.
* **الهدف:** دعم نموذج الولاء الأكثر شعبية في الكافيهات ومطاعم الوجبات السريعة (اشترِ N أكواب قهوة واحصل على 1 مجاناً) بصيغة رقمية نقية مرتبطة بملف العميل دون بطاقات ورقية مفقودة.
* **المحرك والميزات المنفذة:**
  1. **الكرت الرقمي التفاعلي:**
     - شبكة أختام رسومية دائرية مع علامات تحقق واضحة للأختام المكتسبة ودوائر منقطة للأختام المتبقية.
     - عرض عدد الكروت المكتملة سابقاً والمكافأة الجاهزة للصرف.
  2. **الختم السريع وصرف المكافأة:**
     - زر مباشر في الكاشير (+1 ختم) يضيف الأختام مع احتساب آلي لاكتمال الكرت وصرف المشروب المجاني وإعادة تصفير العداد للكرت الجديد.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000217_restaurant_advanced_master_suite.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosCustomerPunchCardModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`

---


<!-- migrated:cap-265:end -->

<a id="cap-266"></a>
<!-- migrated:cap-266:start -->
## 222. رادار تذبذب تكلفة الأطباق وهوامش الربح الحية (Live Plate Cost & Food Inflation Radar)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "رادار التكلفة" ➔ نافذة `PosPlateCostRadarModal` ➔ والـ API `/api/sales/restaurant/plate-cost-radar`.
* **الهدف:** رصد أثر الارتفاع اللحظي في أسعار المواد الخام والمشتريات على تكلفة كل وجبة وهامش مساهمتها وحماية أرباح المطعم من التآكل الصامت متفوقاً على أداة Toast xtraCHEF.
* **المحرك والميزات المنفذة:**
  1. **فك الوصفات والتقييم اللحظي للمكونات (Live Recipe BOM Costing):**
     - استخراج التكلفة الحية من واقع أسعار خامات المخزون ومقارنتها بالتكلفة المعيارية للطبق.
     - حساب نسبة التضخم في تكلفة الطبق: `((التكلفة الحية - المعيارية) / المعيارية) * 100`.
  2. **تنبيهات تآكل الهامش واقتراح السعر المثالي:**
     - كشف الأطباق التي هبط هامش ربحها عن 50% وتصنيفها فورياً كأطباق حرجة (Alerts).
     - احتساب السعر البيعي المقترح تلقائياً للحفاظ على الهامش المستهدف للمطاعم (65% هامش ربح): `السعر المقترح = التكلفة الحية ÷ 0.35`.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000217_restaurant_advanced_master_suite.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosPlateCostRadarModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts`

---


<!-- migrated:cap-266:end -->

<a id="cap-267"></a>
<!-- migrated:cap-267:start -->
## 223. نقل الأصناف الفردية بين الطاولات وفصل الفواتير (Item-Level Table Transfer & Split-Destination Engine)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير وخريطة الصالة `/pos` ➔ نافذة الصالة `PosTablesFloorPlanDialog` ➔ زر "نقل أصناف بين الطاولات" أو زر النقل السريع على كارت الطاولة ➔ نافذة `PosTransferItemModal`.
* **الهدف:** تمكين الكاشير والويتر من نقل مشروب أو طبق معين من طاولة إلى أخرى (مثلاً ضيف انتقل لطاولة أصدقائه أو طلب تحويل حسابه لطاولة أخرى) دون ترحيل الفاتورة بأكملها ودون إلغاء وإعادة طلب.
* **المحرك والميزات المنفذة:**
  1. **التحديد الجزئي للكميات والأصناف:**
     - إمكانية تحديد كمية محددة من الصنف ونقلها فقط (مثلاً كوب قهوة واحد من أصل 3) مع عداد تحكم `[+] (الكمية) [-]` المتوافق مع دستور RTL.
  2. **التكامل اللحظي مع مسودة الكاشير وفواتير الصالة المعلقة:**
     - يتم تحديث السلة النشطة مباشرة إذا كانت الطاولة المصدر أو الهدف مفتوحة في شاشة البيع، مع تحديث المسودات المحفوظة `heldDrafts` في الذاكرة دون الحاجة لإعادة تحميل الشاشة.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/components/pos-workspace/PosTransferItemModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`
  - `frontend/src/features/pos/components/PosWorkspace.tsx`

---


<!-- migrated:cap-267:end -->

<a id="cap-268"></a>
<!-- migrated:cap-268:start -->
## 224. طباعة ملصقات الأكواب والوجبات السريعة الحرارية 50x30 مم (Sticky Cup & Box Label Thermal Printing)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ شريط الأدوات العلوي ➔ زر "ملصقات الأكواب" ➔ محرك `printCupLabelsWindow`.
* **الهدف:** طباعة استيكرات لاصقة صغيرة بمقاس 50×30 مم تلصق مباشرة على أكواب القهوة، علب البرجر، ووجبات التيك أواي مع تفاصيل التخصيص والملاحظات لضمان عدم حدوث خطأ في تسليم الطلبات في الكافيهات ومطاعم الخدمة السريعة.
* **المحرك والميزات المنفذة:**
  1. **التوافق التام مع الطابعات الحرارية المخصصة (Thermal Label Printers):**
     - صفحة CSS الطباعة مضبوطة بدقة `50mm x 30mm` مع هوامش 0mm و `@page { size: 50mm 30mm; margin: 0; }`.
     - دعم كسر الصفحات التلقائي (`page-break-after: always`) لطباعة ملصق مستقل لكل قطعة (مثلاً لو الطلب يحتوي 3 أكواب يتم طباعة 3 ملصقات `1/3`, `2/3`, `3/3`).
  2. **بيانات الملصق الاحترافية:**
     - اسم الصنف، الملاحظات الخاصة (سكر زيادة، حليب لوز، بدون بصل)، رقم الطلب، الوقت، ورقم القطعة من الإجمالي.
* **الملفات المنفذة:**
  - `frontend/src/lib/pos-printing/cup-label.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `frontend/src/features/pos/components/PosWorkspace.tsx`

---


<!-- migrated:cap-268:end -->

<a id="cap-269"></a>
<!-- migrated:cap-269:start -->
## 225. وضع كشك الخدمة الذاتية الرأسي التفاعلي للعملاء (Self-Ordering Kiosk Mode - Portrait Touch UX)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** مسارات الراوتر المباشرة `/pos/kiosk` و `/kiosk` ➔ صفحة `SelfOrderingKioskPage`.
* **الهدف:** تقديم تجربة طلب ذاتي فاخرة وسريعة للعملاء داخل المطعم على الشاشات اللمسية الرأسية الكبيرة (Touch Kiosks) أو الأجهزة اللوحية دون الحاجة للوقوف في طابور الكاشير.
* **المحرك والميزات المنفذة:**
  1. **تصميم رأسي مخصص للمس (Portrait Touch Interface):**
     - شاشة بداية ترحيبية تتيح للعميل اختيار نوع الطلب ("تناول داخل المطعم" أو "سفري / استلام خارجي") بنقرة واحدة بحجم عريض.
     - كتالوج أصناف بصري جذاب مع صور وأسعار وتصنيفات سريعة قابلة للتمرير باللمس.
  2. **حقيبة المشتريات والدفع الذاتي:**
     - نافذة استعراض الطلب مع عدادات سريعة مطابقة لدستور RTL `[+] (الكمية) [-]`.
     - اختيار وسيلة الدفع (بطاقة بنكية / جهاز الدفع في الكشك أو الدفع عند الاستلام).
     - شاشة احتفالية بنجاح الطلب ورقم استدعاء بارز مع مؤقت عد تنازلي يعيد الكشك تلقائياً لشاشة البداية لاستقبال العميل التالي.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/pages/SelfOrderingKioskPage.tsx`
  - `frontend/src/app/router/root-router.tsx`

---


<!-- migrated:cap-269:end -->

<a id="cap-270"></a>
<!-- migrated:cap-270:start -->
## 226. محرك ضيافة الإدارة والخصومات الرسمية والتوثيق المحاسبي (Manager Comps & House Accounts Engine)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "ضيافة الإدارة" ➔ نافذة `PosManagerCompModal` ➔ والـ API `/api/sales/restaurant/manager-comps`.
* **الهدف:** تنظيم عمليات ضيافة الملاك والإدارة (Manager Comps)، وجبات الموظفين (Staff Meals)، تذوق الشيف ومراقبة الجودة، وحل شكاوى العملاء (Customer Recovery) بتوثيق محاسبي رسمي ورقابة أمنية برمز PIN لمنع استغلال الخصومات من قبل الكاشير.
* **المحرك والميزات المنفذة:**
  1. **التحقق الأمني برمز المدير (Manager PIN Auth):**
     - لا يمكن تطبيق الضيافة أو الخصم الإداري إلا بإدخال رمز PIN معتمد للمدير.
  2. **التصنيف المحاسبي للضيافة والخصم:**
     - 4 أنواع قانونية للضيافة: `vip_guest` (ضيافة إدارة)، `staff_meal` (وجبة طاقم)، `quality_test` (تذوق وضبط جودة)، و `customer_recovery` (إرضاء عميل).
     - دعم الضيافة بنسبة 100% لكامل الطلب أو بمبلغ جزئي محدد مع كتابة سبب الزيارة أو الملاحظة.
  3. **سجل تدقيق رقابي ومحاسبي (Audit Ledger):**
     - جدول `restaurant_manager_comps` بقاعدة البيانات لحفظ كل عملية مع معرف الطلب، اسم المدير، نوع الضيافة، والمبلغ المحسوم لترحيلها بدقة لحساب المصروفات المناسب في شجرة الحسابات.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000218_restaurant_enterprise_frontiers.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosManagerCompModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `frontend/src/features/pos/components/PosWorkspace.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts`

---


<!-- migrated:cap-270:end -->

<a id="cap-271"></a>
<!-- migrated:cap-271:start -->
## 227. رادار تقييم العميل اللحظي عند الطاولة وتنبيه الإنقاذ الفوري (Table QR Post-Payment Rating & Rescue Alert)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة فاتورة الطاولة الرقمية للعميل `TableBillModal` ➔ والـ API `/api/sales/restaurant/table-ratings` ➔ شاشة خريطة صالة الكاشير `PosTablesFloorPlanDialog`.
* **الهدف:** تمكين العميل الجالس على الطاولة من تقييم تجربته فورياً (1-5 نجوم)، مع إطلاق جرس إنذار فوري (Service Rescue Alert) على شاشة الكاشير والمدير إذا كان التقييم سلبياً (نجمتان أو نجمة واحدة) قبل أن يغادر العميل المطعم أو يكتب مراجعة سلبية على جوجل.
* **المحرك والميزات المنفذة:**
  1. **واجهة التقييم التفاعلية بالنجوم للعميل:**
     - واجهة 5 نجوم لمسية في فاتورة الهاتف المحمول؛ وفي حال اختيار تقييم منخفض (<= 2) تظهر قائمة فورية بالأسباب المحتملة (تأخر الطلب، الطعام بارد، معاملة غير لائقة، نظافة المكان) مع حقل للملاحظات.
  2. **التنبيه التشغيلي الفوري لإنقاذ الموقف (Instant Floor Plan Rescue Banner):**
     - تسجيل التقييم في `restaurant_table_ratings`؛ وإذا كان التقييم <= 2 يتم آلياً إدراج نداء خدمة طارئ من نوع `rescue` في جدول نداءات الطاولات.
     - يظهر شريط تنبيه أحمر نابض بارز فورياً في نافذة خريطة الصالة عند الكاشير يحمل رقم الطاولة، التقييم، والسبب، مع زر "تم التدخل وحل المشكلة" لإغلاق التنبيه فورياً بعد إرضاء العميل.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000218_restaurant_enterprise_frontiers.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/storefront/components/TableBillModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts`

---


<!-- migrated:cap-271:end -->

<a id="cap-272"></a>
<!-- migrated:cap-272:start -->
## 228. توقيت الطهي الذكي وتنسيق خروج أطباق الطلب معاً (Kitchen Pacing & Staggered Prep Scheduling)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة شاشات المطبخ الرقمية KDS `/pos/kds` ➔ بطاقة التذكرة `KdsTicketCard` ➔ والـ API الخاص بـ KDS.
* **الهدف:** حل المعضلة الكبرى في المطابخ الساخنة؛ عندما يطلب العميل ستيك يستغرق 20 دقيقة وسلطة تستغرق 5 دقائق، يجب ألا تُحضَّر السلطة في الدقيقة 5 وتبرد وتذبل في انتظار الستيك، بل يجب تأخير إطلاق تحضير السلطة حتى الدقيقة 15 لتخرج كافة أصناف التذكرة طازجة وساخنة معاً في نفس اللحظة (Coursetimed Pacing).
* **المحرك والميزات المنفذة:**
  1. **حساب التوقيت المتدرج للأصناف (Staggered Prep Calculation):**
     - إضافة حقل `prep_time_minutes` لكل صنف في جدول المنتجات وقراءته في تذاكر KDS.
     - استخراج أطول صنف يستغرق وقتاً في التذكرة (`maxTicketPrep`).
     - حساب زمن التأخير المطلوب لكل صنف: `delay = maxTicketPrep - itemPrepTime`.
  2. **المؤشرات البصرية الواضحة لطاقم الطهي:**
     - الصنف الذي حان وقت طهيه يظهر ببادج خضراء: `ابدأ الطهي الآن (X د)`.
     - الصنف الذي يجب تأخيره يظهر ببادج صفراء مميزة: `انتظار Y د (الطهي X د)`.
     - يضمن هذا التزامن التام لجميع الأطباق ومطابقة كبرى أنظمة المطابخ العالمية (Toast Kitchen Pacing).
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000218_restaurant_enterprise_frontiers.ts`
  - `frontend/src/features/pos/api/kds.api.ts`
  - `frontend/src/features/pos/components/kds/KdsTicketCard.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts`

---


<!-- migrated:cap-272:end -->

<a id="cap-273"></a>
<!-- migrated:cap-273:start -->
## 229. طلب المقاعد الفردية والتقسيم التلقائي للفاتورة حسب المقعد (Seat-Level Ordering & 1-Click Split by Seat)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير سلة الطلبات `PosCartItemsList` ➔ نافذة تقسيم الفاتورة `PosSplitBillModal` ➔ تذاكر المطبخ `KdsTicketCard`.
* **الهدف:** تمكين الكاشير والويتر من تعيين كل صنف يُطلب على الطاولة لمقعد محدد من الجالسين (`مقعد 1`, `مقعد 2`, `مقعد 3`...)، مما يتيح تقديم كل طبق أمام صاحبه بالضبط بدون إحراج، وتوفير زر ذكي بنقرة واحدة يقسم الفاتورة كاملة تلقائياً بحسب المقاعد دون أي حسابات يدوية.
* **المحرك والميزات المنفذة:**
  1. **تخصيص المقاعد في سلة الكاشير (Interactive Seat Picker):**
     - كل صنف في سلة الكاشير يمتلك زراً تفاعلياً أنيقاً يعرض رقم المقعد، والنقر عليه يتنقل فورياً بين المقاعد (`مقعد 1 ➔ مقعد 2 ➔ مقعد 3...`).
  2. **التقسيم الفوري بضغطة زر واحدة (1-Click Seat Split Engine):**
     - في نافذة تقسيم الفاتورة `PosSplitBillModal`، تم تزويد الكاشير بزر **"توزيع فوري حسب المقاعد (Seat Split)"** يقوم بتجميع أصناف كل مقعد في شيك منفصل محسوب بدقة مع الضريبة والخدمة، مع ضمان تصفير أي فروق بنسات (Zero-Penny Invariant).
  3. **إبراز المقعد في شاشة المطبخ KDS:**
     - ظهور شارة المقعد `[مقعد X]` بجانب كل صنف على تذاكر KDS ليعرف المطبخ وسيرفس الصالة توزيع الأطباق فور خروجها.
* **الملفات المنفذة:**
  - `frontend/src/features/pos/types/pos.types.ts`
  - `frontend/src/features/pos/lib/pos.domain.ts`
  - `frontend/src/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions.ts`
  - `frontend/src/features/pos/hooks/usePosWorkspaceActions.ts`
  - `frontend/src/features/pos/components/pos-cart-panel/PosCartItemsList.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosSplitBillModal.tsx`
  - `frontend/src/features/pos/components/kds/KdsTicketCard.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts` (Test 25)

---


<!-- migrated:cap-273:end -->

<a id="cap-274"></a>
<!-- migrated:cap-274:start -->
## 230. محرك الاقتراح والترقية الذكية وزيادة متوسط الفاتورة (Smart Upselling & Cross-Sell Engine)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "عروض ذكية" ➔ نافذة `PosSmartUpsellModal` ➔ كشك الخدمة الذاتية `SelfOrderingKioskPage` ➔ والـ API `/api/sales/restaurant/upsell`.
* **الهدف:** رفع متوسط قيمة الشيك وفاتورة العميل (Check Average Lift) من خلال قواعد ذكية تقترح أوتوماتيكياً إضافات مكملة أو ترقيات جذابة بخصم مشجع عند طلب أصناف معينة (مثل اقتراح بطاطس بالجبنة عند طلب البرجر، أو دونات بخصم عند طلب القهوة).
* **المحرك والميزات المنفذة:**
  1. **محرك القواعد الديناميكي بقاعدة البيانات (`restaurant_upsell_rules`):**
     - دعم ربط مصفوفة أصناف مشغلة (`trigger_product_ids`) بصنف مقترح (`recommended_product_id`) مع نسبة خصم محددة ونصوص تسويقية باللغة العربية.
  2. **الدمج في كشك الخدمة الذاتية (Self-Ordering Kiosk):**
     - عند نقر العميل على "إتمام الطلب" في الكشك، يتم فحص السلة تلقائياً؛ فإذا تطابقت القواعد، تظهر نافذة عروض جذابة تعرض الصنف المقترح مع بيان السعر الأصلي والسعر المخفض وزر "إضافة للطلب" بنقرة واحدة قبل التوجه للدفع.
  3. **الدمج في شاشة كاشير المطاعم POS:**
     - إتاحة زر "عروض ذكية" في شريط الكاشير عند وجود أصناف بالسلة ليقوم الكاشير بعرض الاقتراح ومساعدة العميل على زيادة وجبته بأسعار مميزة.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000219_restaurant_next_level_frontiers.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosSmartUpsellModal.tsx`
  - `frontend/src/features/pos/pages/SelfOrderingKioskPage.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts` (Test 26)

---


<!-- migrated:cap-274:end -->

<a id="cap-275"></a>
<!-- migrated:cap-275:start -->
## 231. طابور طلبات السيارات ومؤشر سرعة الخدمة (Drive-Thru Lane & Speed of Service Timer - SOS)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "طلبات السيارات" ➔ نافذة `PosDriveThruModal` ➔ والـ API `/api/sales/restaurant/drive-thru`.
* **الهدف:** إدارة مسار طلبات السيارات (Drive-Thru Lane) بأعلى كفاءة تشغيلية مع مراقبة حية لسرعة الخدمة (Speed of Service - SOS) لكل مركبة لضمان عدم حدوث اختناقات في المسار ومطابقة المعايير العالمية لسلاسل الفاست فود العالمية.
* **المحرك والميزات المنفذة:**
  1. **تسجيل بيانات المركبة ومسار الطلب:**
     - تسجيل لوحة السيارة، موديل المركبة ولونها، ومحطة الخدمة (`order_taken` عند الميكروفون ➔ `at_window` عند شباك الاستلام ➔ `completed` عند التسليم).
  2. **عداد سرعة الخدمة اللحظي (Live SOS Stopwatch):**
     - احتساب الثواني المنقضية لكل مركبة وتحديث العداد في الواجهة كل ثانية مع تلوين ذكي لحالة المؤشر:
       - أقل من 90 ثانية: أخضر (سرعة ممتازة).
       - من 90 إلى 180 ثانية: كهرماني (تنبيه بالسرعة).
       - أكثر من 180 ثانية: أحمر تحذيري (اختناق في المسار).
  3. **مؤشرات أداء المسار المجمعة (Lane KPIs):**
     - بطاقات علوية تعرض إجمالي المركبات في المسار، المركبات عند الشباك، ومتوسط سرعة الخدمة بالثواني.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000219_restaurant_next_level_frontiers.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosDriveThruModal.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts` (Test 27)

---


<!-- migrated:cap-275:end -->

<a id="cap-276"></a>
<!-- migrated:cap-276:start -->
## 232. ملصقات صلاحية وسلامة الأغذية المحضرة بالمطبخ (Kitchen Day-Dots & HACCP Prep Expiry Labels 50x30mm)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الكاشير `/pos` ➔ زر "ورقة التحضير" ➔ نافذة `KitchenDailyPrepSheetModal` ➔ زر "ملصق (50x30)" ➔ محرك الطباعة الحرارية `prep-day-dot.ts`.
* **الهدف:** الامتثال الصارم لاشتراطات سلامة الغذاء ومواصفات الهيئة العامة للغذاء والدواء ومعايير HACCP الدولية، من خلال طباعة ملصقات لاصقة حرارية قياسية (50x30 مم) لكل دفعة تحضير في المطبخ توضح اسم الصنف، تاريخ وساعة التحضير، تاريخ وساعة انتهاء الصلاحية بدقة الساعات، درجة حرارة الحفظ، واسم الشيف المسؤول.
* **المحرك والميزات المنفذة:**
  1. **حساب مدة الصلاحية التلقائي بالساعات (`shelf_life_hours`):**
     - إضافة حقول الصلاحية ودرجة الحفظ لجدول خامات التحضير `restaurant_prep_sheet_items`.
     - حساب تلقائي لوقت انتهاء الصلاحية بناءً على تاريخ وساعة الإنتاج ومدة الصلاحية بالساعات المحددة لكل صنف.
  2. **نظام اليوم المميز (Kitchen Day-Dots Standard):**
     - تخصيص لون ورمز اليوم باللغة العربية (الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت) لسهولة التمييز البصري الفوري داخل الثلاجات ومستودعات التبريد.
  3. **طباعة حرارية مباشرة بقياس 50x30 مم:**
     - محرك طباعة حراري مخصص بدون أي إيموجيز يطبع ملصقاً عالي التباين بحجم 50×30 مم يحتوي على باركود الدفعة ومعلومات الصلاحية ودرجة الحفظ بدقة مئوية.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000219_restaurant_next_level_frontiers.ts`
  - `backend/src/database/database.types.ts`
  - `frontend/src/lib/pos-printing/prep-day-dot.ts`
  - `frontend/src/features/pos/components/pos-workspace/KitchenDailyPrepSheetModal.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts` (Test 28)

---


<!-- migrated:cap-276:end -->

<a id="cap-277"></a>
<!-- migrated:cap-277:start -->
## 233. فرض الحد الأدنى لإنفاق الطاولات ومناطق الصالة (Table Zone Minimum Spend Enforcer)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة خريطة الصالة `PosTablesFloorPlanDialog` ➔ شريط الكاشير `PosWorkspaceHeader` ➔ والـ API `/api/sales/restaurant/minimum-spend/calculate`.
* **الهدف:** تمكين المطاعم والكافيهات الفاخرة وصالات كبار الشخصيات (VIP Rooms / Terrace Lounges) من فرض حد أدنى للإنفاق على الطاولة (Minimum Spend / Minimum Charge)، مع احتساب آلي لأي عجز كرسوم تكملة الحد الأدنى إذا كان إجمالي طلبات الطاولة أقل من الحد المشروط للمنطقة.
* **المحرك والميزات المنفذة:**
  1. **تعريف الحد الأدنى لكل منطقة في الصالة:**
     - إضافة حقل `minimum_spend` في جدول مناطق الصالة `restaurant_table_zones`، وضبطه بسهولة لكل منطقة (مثل: صالة VIP: 500 ر.س، التراس الخارجي: 200 ر.س، الصالة الرئيسية: 0 ر.س).
  2. **المؤشر اللحظي في شريط الكاشير:**
     - عند فتح أي طاولة في منطقة محدد لها حد أدنى، يظهر شريط ذكي بجوار عدد الضيوف يوضح الحد الأدنى ومبلغ العجز المتبقي باللون الأحمر حتى يتجاوزه الطلب فيتحول للأخضر.
  3. **محرك احتساب عجز الإنفاق (Deficit Surcharge):**
     - نقطة نهاية برمجية `/minimum-spend/calculate` تحسب العجز رياضياً: `deficit = Math.max(0, minimum_spend - current_total)` وإضافته كبند تكميلي عند المحاسبة لضمان الامتثال التام لسياسة الصالة المالية.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000219_restaurant_next_level_frontiers.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/sales/services/restaurant-advanced-fnb.service.ts`
  - `backend/src/modules/sales/controllers/restaurant-advanced-fnb.controller.ts`
  - `frontend/src/features/pos/api/restaurant-advanced-fnb.api.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosTablesFloorPlanDialog.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceHeader.tsx`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts` (Test 29)

---


<!-- migrated:cap-277:end -->

<a id="cap-288"></a>
<!-- migrated:cap-288:start -->
## 244. محرك التوطين الإقليمي لدولة الكويت والتهيئة التلقائية المتسلسلة للمطاعم والضيافة (Kuwait Regional Profile, Country Cascading Engine & PACI/K-NET F&B Localization)
* **الحالة / الجاهزية:** تم الإنجاز والاعتماد بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة الإعدادات العامة `/settings` (`GeneralSettingsTab.tsx`)، نقاط البيع السريعة `/pos` (`PosCheckoutDialogSections.tsx`، `PosPhoneOrderDialog.tsx`)، شاشات المطبخ KDS (`KdsTicketCard.tsx`)، ومحركات الباك إند (`settings.service.ts`).
* **القدرات التشغيلية والتقنية:**
  1. **مفتاح السيادة الإقليمي والتهيئة المتسلسلة (Country Profile Cascading Engine):**
     - إضافة اختيار «دولة المقر / التشغيل» (Country) في الإعدادات العامة يشمل كافة الدول (الكويت KW، السعودية SA، مصر EG، الإمارات AE، قطر QA، البحرين BH، عمان OM).
     - عند اختيار «دولة الكويت» أو تحويل العملة إلى `KWD`، يُطلق النظام محرك التوطين الكويتي المتسلسل تلقائياً:
       * ضبط العملة فوراً إلى دينار كويتي `KWD` وتفعيل نظام الفلس الكويتي (3 خانات عشرية) في كافة الواجهات والإيصالات.
       * تصفير ضريبة القيمة المضافة إلى `0%` وإخفاء الرقم الضريبي والـ QR من الإيصالات طبقاً للقانون الكويتي.
       * ضبط المنطقة الزمنية الرسمية على `Asia/Kuwait`.
       * تفعيل مزود ماكينات الدفع والشبكة البنكية على `knet_pos` وخيار كي نت كخيار افتراضي في الكاشير.
       * ظهور بانر تأكيدي مؤسسي بضمان الملف الإقليمي لدولة الكويت مع الحفاظ الكامل على حرية التعديل اليدوي للمستخدم (Smart Preset with Manual Override).
  2. **نموذج عناوين التوصيل الرسمي الكويتي (PACI Address Model):**
     - ترقية شاشة طلبات الهاتف والدليفري في الكاشير `PosPhoneOrderDialog.tsx` للتعرف التلقائي على بيئة الكويت.
     - تزويد نافذة العميل الجديد بمساعد المعلومات المدنية الكويتية (PACI Builder) المكون من حقول مستقلة متناسقة (المنطقة، القطعة Block، الشارع، الجادة Avenue، المنزل/القسيمة، الدور، والشقة) مع زر توليد العنوان الموحد تلقائياً.
     - تحويل نطاقات التوصيل ورسوم الدليفري إلى قيم الدينار الكويتي (0.500 د.ك للمناطق القريبة، 1.000 د.ك للمنطقة، 1.500 د.ك للمحافظة، 2.000 د.ك للمحافظات البعيدة).
     - توطين خيارات الدفع عند الاستلام لتشمل «كي نت مع المندوب K-NET» و «رابط دفع أونلاين K-NET Link»، مع ضبط فئات الفكة المطلوبة على الدنانير الكويتية (5, 10, 20 د.ك) بدلاً من الجنيه.
  3. **ازدواجية لغة المطبخ لطواقم الطهاة الأجانب (Bilingual Kitchen / KDS):**
     - ترقية بطاقات تذاكر المطبخ `KdsTicketCard.tsx` لعرض الاسم الإنجليزي للصنف والإضافات تلقائياً (من حقول `name_en` أو الأسماء ثنائية اللغة) لضمان فهم الطهاة والعمالة الآسيوية والأجنبية لمكونات الوجبة بدقة وسرعة وبدون أخطاء تحضير.
  4. **دورة البقشيش الإلكتروني المتكاملة وحسابات مستحقات العمالة (End-to-End Digital Tips & Staff Payout Engine):**
     - في شاشة إتمام الدفع بالكاشير `PosCheckoutDialogSections.tsx`، تتحول أزرار البقشيش عند تفعيل الدينار الكويتي إلى الفئات الواقعية: (بدون، ربع دينار 0.250 د.ك، نصف دينار 0.500 د.ك، دينار 1.000 د.ك، ديناران 2.000 د.ك) بخطوة إدخال دقيقة (0.050 د.ك).
     - ربط اختيار البقشيش تلقائياً بإجمالي الفاتورة «المطلوب دفعه» وتزامن مبالغ السحب للبطاقات (K-NET) والتحويلات فورياً، ليرسل المبلغ الإجمالي شاملاً الإكرامية إلى جهاز نقاط البيع EDC.
     - إظهار سطر مستقل «إكرامية / بقشيش» في إيصال العميل المطبوع `template.ts` لضمان الشفافية وتطابق الفاتورة مع رسالة الخصم البنكي للعميل.
     - احتساب وتجميع إجمالي الإكراميات `tipSalesTotal` على مدار الوردية وإبرازها في شاشات إغلاق الوردية وتقارير X و Z المطبوعة `cash-drawer-receipt.ts` لتمكين الإدارة من صرف مستحقات العمالة بدقة.
  5. **جرد ومطابقة ورديات الكاشير وتقارير X و Z بشبكة كي نت (K-NET Shift Settlement & X/Z Reports):**
     - ترقية شاشات إغلاق وجرد الوردية (`CashDrawerFormsPanel.tsx` و `CashDrawerReviewDialog.tsx`) وإيصالات الجرد (`cash-drawer-receipt.ts`) لتتحول ديناميكياً عند تفعيل الدينار الكويتي KWD من مسميات «تحويل إنستاباي» إلى «عمليات كي نت / روابط دفع إلكتروني (K-NET)»، مع إبراز تقارير X الاسترشادية وتقارير Z الختامية الرسمية.
  6. **نظام نداء واستدعاء العميل بالبيجر (Pager / Buzzer System):**
     - تسجيل وتخزين رقم جهاز النداء `pagerNumber` في فواتير المطاعم السريعة، وإبراز شارة البيجر فوراً في تذاكر المطبخ `KdsTicketCard.tsx` وشاشة عرض حالة الطلبات التلفزيونية بصالة المطعم `OrderStatusBoardPage.tsx`.
  7. **نظافة الفواتير الحرارية وإخفاء الضرائب الصفرية (Zero-Tax Invoice Cleanliness):**
      - ترقية قوالب الطباعة الحرارية `template.ts` لإخفاء أسطر ضريبة القيمة المضافة والإجمالي قبل الضريبة تلقائياً عند انعدام الضريبة (0% VAT كما في الكويت)، لمنع تشويه إيصال العميل بمسميات غير مطبقة قانونياً.
  8. **اعتماد الأرقام اللاتينية الإنجليزية ورمز العملة الصريح في إيصالات الكاشير (Foodics Latin Numerals & Explicit Currency Standard):**
      - تفعيل التنسيق اللاتيني القياسي الافتراضي للأرقام (`550.000 د.ك`) في إيصالات نقاط البيع عند اختيار دولة الكويت أو العملة `KWD` (مطابقة لمعيار فودكس وكبرى منظومات نقاط البيع الخليجية)، لمنع التباس الفاصلة العشرية العربية (`٫`) مع فاصلة الآلاف، مع تمكين المستخدم من التبديل للأرقام العربية إن رغب.
      - إبراز رمز العملة الصريح (`د.ك`) في كافة أسطر الإجماليات، المتبقي، المدفوع، والباقي، وطرق الدفع وتفقيط المبالغ.
   9. **تنسيق الفلس والأرقام العشرية بالمتجر الإلكتروني وتوطين الدفع (Storefront Currency & Decimal Cleanliness):**
       - ترقية نافذة إتمام الطلب بالمتجر `StorefrontCheckoutModal.tsx` ونافذة تفاصيل الطلب لدى التاجر `MerchantOrderDetailModal.tsx` لتطبيق التنسيق العشري الدقيق تلقائياً (3 خانات للفلس الكويتي) واقتلاع أي كتابة صامتة لرمز الجنيه (`ج`) أو التصفير القسري للكسور (`toFixed(0)`).
       - توطين خيارات الدفع عند اختيار دولة الكويت أو الدينار الكويتي إلى «تحويل بنكي / رابط دفع» و «دفع إلكتروني (بطاقة / كي نت K-NET)» بدلاً من إنستاباي.
       - التحقق الصارم من صحة أرقام الهواتف الكويتية (8 أرقام تبدأ بـ 2 أو 5 أو 6 أو 9).
   10. **الرقم الآلي للعنوان (PACI 8-Digit Automated Address Number) ومحدد كويت فايندر:**
       - تزويد مساعد العنوان الكويتي بحقل مستقل «الرقم الآلي للعنوان (8 أرقام)» المعتمد من الهيئة العامة للمعلومات المدنية، ليتم تضمينه فوراً في العنوان والملاحظات التشغيلية لتسهيل وصول طياري الدليفري عبر تطبيق كويت فايندر (Kuwait Finder).
    11. **وسم قنوات ومنصات التوصيل التجميعية في الكاشير (Delivery Aggregators Source Tagging):**
        - إضافة محدد سريع في قسم الدليفري بنافذة إتمام البيع `PosCheckoutDialogSections.tsx` لاختيار منصة الطلب: (مباشر / المحل، طلبات Talabat، دليفرو Deliveroo، جاهز Jahez، كاري Cari) مع التحويل التلقائي لحالة التحصيل إلى «خالص أونلاين» وتضمين الوسم في الفاتورة وبون المطبخ.
    12. **حفظ واسترجاع خيارات وملاحظات الأصناف وأرقام المقاعد في الطاولات المعلقة (Table Drafts Item Modifiers, Notes, Seat Numbers & Courses Resilience):**
        - ترقية محرك الفواتير والطاولات المعلقة `sales-write.service.ts` و `sales-query.helper.ts` لتغليف وفك حزم الخيارات الإضافية (`modifiers`) مع رقم المقعد (`seatNumber`) ومرحلة التقديم (`course: appetizer/main/dessert`) وملاحظات الصنف الفردية وحفظها في `held_sale_items`.
        - معالجة ثغرة الفقد في الواجهة الأمامية `createPosWorkspaceAsyncActions.ts` وتأمين إرسال واسترجاع الخيارات والمقاعد بالكامل عند فتح واستكمال طلب الطاولة دون فقد أي تفاصيل تشغيلية.
    13. **تذكرة المطبخ الحرارية المتطورة وشريط الإرسال السريع (Advanced KOT Thermal Ticket & Kitchen Dispatch Bar):**
        - ترقية قالب طباعة بون المطبخ `kitchen.ts` ليتضمن تلقائياً: شارة رقم الطاولة / نوع الطلب العريضة، رقم الطلب المختصر، راية «طلب إضافي ADD-ON» للطلبات المتتالية، اسم الكابتن/الكاشير، عدد الضيوف، شارات المراحل والمقاعد، والخيارات والملاحظات بخط عريض عالي التباين.
        - ترقية زر التعليق السريع `PosWorkspaceDock.tsx` ليتحول تلقائياً إلى «إرسال للمطبخ F4» عند تفعيل مود المطاعم مع إمكانية الطباعة الآلية للمطبخ فور إرسال الطلب.
    14. **قوائم الطعام الموقوتة والوجبات (Timed Menus & Dayparts Engine):**
        - إضافة محدد الوجبات الموقوتة الفوري في `PosProductsPanel.tsx` (جميع الوجبات، الفطور الصباحي 06:00-11:30، وجبات الغداء 11:30-17:00، وجبات العشاء 17:00-02:00، والحلويات والمشروبات) لتمكين الكاشير من تصفية المنيو فوراً بنقرة واحدة خلال ساعات الذروة بما يماثل محرك وجبات فودكس وتوست.
* **الملفات المنفذة:**
  - `frontend/src/features/settings/schemas/settings.schema.ts`
  - `frontend/src/features/settings/components/forms/SettingsMainForm.tsx`
  - `frontend/src/features/settings/components/forms/tabs/GeneralSettingsTab.tsx`
  - `backend/src/modules/settings/settings.service.ts`
  - `frontend/src/features/pos/components/pos-workspace/PosCheckoutDialogSections.tsx`
  - `frontend/src/features/pos/components/kds/KdsTicketCard.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosPhoneOrderDialog.tsx`
  - `frontend/src/features/cash-drawer/components/CashDrawerFormsPanel.tsx`
  - `frontend/src/features/cash-drawer/components/CashDrawerReviewDialog.tsx`
  - `frontend/src/features/cash-drawer/utils/cash-drawer-receipt.ts`
  - `frontend/src/features/pos/pages/OrderStatusBoardPage.tsx`
  - `backend/src/common/utils/invoice-totals.ts`
  - `backend/src/modules/sales/services/sales-write.service.ts`
  - `backend/src/modules/sales/services/sales-query.service.ts`
  - `backend/src/modules/sales/helpers/sales-query.helper.ts`
  - `backend/src/modules/sales/dto/held-sale.dto.ts`
  - `backend/src/modules/cash-drawer/cash-drawer.service.ts`
  - `backend/src/modules/cash-drawer/helpers/cash-drawer.helper.ts`
  - `frontend/src/features/pos/hooks/usePosWorkspaceDerived.ts`
  - `frontend/src/features/pos/hooks/usePosWorkspace.ts`
  - `frontend/src/features/pos/hooks/pos-workspace-actions/createPosWorkspaceBaseActions.helpers.ts`
  - `frontend/src/features/pos/contracts.ts`
  - `frontend/src/features/cash-drawer/components/CashDrawerShiftsCard.tsx`
  - `frontend/src/lib/pos-printing.ts`
  - `frontend/src/lib/pos-printing/shared.ts`
  - `frontend/src/lib/pos-printing/template.ts`
  - `frontend/src/features/storefront/components/StorefrontCheckoutModal.tsx`
  - `frontend/src/features/storefront/components/MerchantOrderDetailModal.tsx`
  - `backend/src/database/migrations/2040000000226_restaurant_pager_and_kuwait_features.ts`
  - `frontend/src/features/pos/hooks/pos-workspace-actions/createPosWorkspaceAsyncActions.ts`
  - `frontend/src/features/pos/components/PosProductsPanel.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceDock.tsx`
  - `frontend/src/features/pos/components/pos-workspace/PosWorkspaceMainContent.tsx`
  - `frontend/src/features/pos/types/pos.types.ts`
  - `frontend/src/lib/pos-printing/kitchen.ts`
  - `backend/test/critical/restaurant-fnb-workflow.spec.ts`

---


<!-- migrated:cap-288:end -->

<a id="cap-290"></a>
<!-- migrated:cap-290:start -->
## 222. إعادة هيكلة كشك الخدمة الذاتية للمطاعم ودستور الدفع فائق السرعة (Restaurant Self-Ordering Kiosk Overhaul & 3-Second Checkout)
* **الحالة:** مكتمل بنسبة 100% ومعتمد لتشغيل الأكشاك اللمسية (Touch Kiosks).
* **الأثر والمبرر التشغيلي:**
  تحويل كشك الخدمة الذاتية من واجهة معقدة ببطاقات متكدسة وقوائم مكررة ومدخلات بطيئة تعطل الطوابير، إلى منصة فاست فود عالمية تنهي الطلب في ثوانٍ معدودة وفق المعايير العالمية لكبرى سلاسل المطاعم (McDonald's / Shake Shack).
* **القدرات والإجراءات المطبقة:**
  1. **معيار الـ 1280 بكسل وتوزيع الأعمدة الثلاثي المتوازن:**
     - حظر التمدد العشوائي على الشاشات العريضة وحصر الحاوية المركزية في `max-width: 1280px` مع ارتفاع `100vh` محكم بدون أي سكرول خارجي.
     - تقسيم الشاشة إلى 3 أعمدة مدروسة لمسياً: شريط الأقسام الرأسي الأيمن (`185px`)، شبكة بطاقات الوجبات الوسطى (`765px`)، ولوحة "صينية طلبك" التفاعلية الحية باليسار (`330px`).
  2. **دستور صور الوجبات البطلة (Hero Food Photography Standard):**
     - تخصيص النسبة الأكبر من بطاقة الوجبة (~70% من الارتفاع، `165px`) لصورة فوتوغرافية احترافية عالية الشهية والوضوح.
     - تقليص الحيز السفلي للنصوص ليكون مدمجاً وأنيقاً يبرز اسم الوجبة والسعر وزر الإضافة اللمسي والعداد الصارم `[+] (qty) [-]`.
  3. **استبدال شريط السلة السفلي القديم بصينية الطلب الحية:**
     - إلغاء كبسولات السلة العائمة التي كانت تحجب ثلث الشاشة، وتوفير صينية طلب يسارية مستمرة تعرض الوجبات المختارة وكمياتها وإجمالي السعر وزر إتمام الدفع بشكل فوري وشفاف.
  4. **منظومة طرق الدفع الثلاثية الحقيقية (Real 3-Pillar Kiosk Payment Architecture):**
     - **المسار الأول (ماكينة الدفع المادية بالكشك - ECR POS Terminal):**
       - فحص اتصال جهاز الدفع بنكياً عبر `HardwareBridgeClient` أو `posApi.listTerminals()`.
       - شاشة انتظار وتمرير البطاقة مع عداد زمني 60 ثانية ومحاكاة حقيقية لردود البنك، وتسجيل تفويض البنك (`authCode` و `rrn`).
       - حظر التخطي المجاني (Zero Free Bypass): في حال عدم وجود جهاز دفع متصل، يتم تنبيه العميل بشفافية ومنعه من إتمام الطلب كمدفوع، مع توجيهه للدفع بـ QR أو الكاونتر.
     - **المسار الثاني (الدفع برمز QR الديناميكي بالهاتف - Dynamic Mobile QR Code):**
       - توليد رمز QR لحظي بقيمة الفاتورة المحددة ورقم المعاملة الفريد، يدعم تطبيقات إنستاباي والمحافظ الذكية (فودافون/أورانج/اتصالات كاش) وتطبيقات البنوك.
       - شاشة مؤقت زمني دقيقتين وزر تأكيد السداد وإصدار التذكرة كـ «مدفوع إلكترونياً».
     - **المسار الثالث (تذكرة غير مدفوعة للمحاسبة عند الكاشير - Unpaid Counter Ticket):**
       - للعملاء الذين لا يملكون بطاقة في الكشك أو يفضلون السداد نقداً/بالفيزا لدى الكاشير.
       - إصدار التذكرة فوراً بحالة «غير مدفوع (Unpaid)» وإظهار تنبيه ملون صريح على شاشة الكشك.
       - طباعة تذكرة حرارية موسومة بختم عريض وواضح: `*** تذكرة غير مدفوعة - UNPAID *** يرجى التوجه للكاشير للمحاسبة قبل استلام الوجبة`.
* **الملفات المعدلة:**
  - `frontend/src/features/pos/hooks/useSelfOrderingKiosk.ts`
  - `frontend/src/features/pos/pages/SelfOrderingKioskPage.tsx`






<!-- migrated:cap-290:end -->
