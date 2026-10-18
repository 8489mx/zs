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
