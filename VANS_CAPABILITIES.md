# قدرات التوزيع الميداني والفان

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **التوزيع الميداني والفان** المعتمد للتحديثات القادمة. مسارات الملكية: مجال عابر للموديولات؛ راجع الأقسام ومسارات التنفيذ أدناه.

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [التوصيل وأجور المناديب](DELIVERY_CAPABILITIES.md) · [المبيعات ونقاط البيع](SALES_CAPABILITIES.md) · [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [الموارد البشرية والرواتب](HR_CAPABILITIES.md) · [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [قدرة: العزل الشامل بين حسابات المناديب للعميل المشترك وتفصيل إجمالي المشرف والمالك (Rep-to-Rep Customer Account & Collection Isolation — VAN-12) — ✅ مفعّلة ومحروسة (أكتوبر 2026)](#cap-020)
- [قدرة: منظومة التحصين الهجومي الشامل لكافة أنماط التوزيع الميداني (Van Sales Exhaustive Adversarial Governance) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)](#cap-021)
- [قدرة: بوابة الفحص الإلزامي للـ GPS ومنع بدء الزيارات أو البيع الميداني عند إغلاق الموقع (Mandatory GPS Visit Gate & Action Enforcement) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)](#cap-022)
- [قدرة: جدولة زيارات العملاء وتخصيص المناديب المتعددين وجداول الأيام المستقلة (Multi-Rep Assignment & Rep-Specific Itinerary Schedules) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)](#cap-023)
- [قدرة: منظومة صلاحيات وضوابط المناديب في الميدان (Field Rep Permissions & Operational Governance) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)](#cap-024)
- [قدرة: المركز المالي الموحد لتسويات وعجوزات وبونص مناديب التوزيع والربط بمسير الرواتب (Van Rep Financial Ledger, Shortages Settlement Hub & HR Payroll Bridge) — ✅ مفعّلة ومكتملة 100% (أكتوبر 2026)](#cap-025)
- [36. مبيعات وتوزيع سيارات الفان الميدانية وأسطول الشركة (Van Sales & Fleet Management) 🚚📦](#cap-061)
- [54. مركز البوابات الموحد وإدارة السائقين ومبيعات الفان الميدانية (Portals Hub & Driver Portal & Van Sales Navigation)](#cap-079)
- [175. منظومة توزيع الفان وجملة السلع الاستهلاكية السريعة الميدانية وإدارة وصيانة أسطول المركبات (Wholesale Van Sales & FMCG Route Distribution & Fleet Maintenance)](#cap-206)
- [قدرة: منظومة أذونات تحميل سيارات الفان الموحدة والإسناد المباشر بدون بوب اب (Unified Van Load Requisitions & Direct Dispatch Engine)](#cap-207)
- [قدرة: محرك الطباعة الحرارية 80 مم لفواتير الفان سيلز الميدانية والمشاركة اللحظية (POS 80mm Thermal Receipt & Instant WhatsApp Sharing)](#cap-208)
- [قدرة: نظام تخصيص وتوزيع خطوط السير والمناديب للمشرف (Supervisor Route & Rep Assignment System)](#cap-209)
- [189. منظومة تعبئة أذونات التحميل الميداني ووحدات التوزيع المتعددة (Van Sales Load Requisition Multi-Unit Packaging Standard)](#cap-223)
- [234. الترقية المؤسسية المتكاملة لقطاع الفان وتوزيع الجملة (Wholesale & Van Distribution Enterprise Enhancements)](#cap-278)
- [235. رادار مكافحة الشبهات والتلاعب لمناديب التوزيع وعزل مديونيات العملاء المشتركين (Van Sales Fraud Radar & Multi-Rep Isolated Balances)](#cap-279)
- [236. محرك العروض الترويجية الشرائحية المركبة والتحسين الرياضي لمسارات السير (FMCG Tiered Promotions & TSP Route Optimization)](#cap-280)
- [237. جناح التنفيذ الميداني لمبيعات الفان والتسويق التجاري والطباعة الحرارية وتتبع الزيارات ومعدل الضرب (FMCG Van Sales Execution, Trade Marketing, Direct Bluetooth ESC/POS & Live Fleet Supervisor)](#cap-281)
- [238. جناح السوق المصري المتخصص لشركات التوزيع وسيارات الفان FMCG (Egyptian FMCG Van Sales Suite: InstaPay Segregation, Digital Signature on Glass, Live Target Booster & Field Damaged Goods Swap)](#cap-282)
- [239. حوكمة خطوط السير متعددة المناديب، صلاحيات المناديب الميدانية، وتخصيص إلزامية رمز المشرف (PIN) لتصفية الورديات من الإعدادات](#cap-283)
- [240. المركز المالي وكشف حساب المناديب والربط الآلي مع مسير الرواتب (Rep Financial Ledger, Variance Settlement Hub & HR Payroll Bridge)](#cap-284)
- [241. درع الحماية اللحظي ومنع تكرار الفواتير والتحصيلات في مبيعات الفان الميدانية (Van Sales Concurrency, Deduplication & Idempotency Shield)](#cap-285)
- [242. جناح المشاركة الفورية عبر واتساب لفواتير الميدان وكشوف حسابات العملاء (Van Sales Direct WhatsApp Sharing & One-Click Statement Dispatch)](#cap-286)
- [243. حوكمة أذونات شحن البضاعة ومنع تكرار الطلبات المعلقة مع استرجاع الأصناف ودعم الشحن الإضافي (Van Single Pending Requisition Governance, Cancellation Recovery & Supplementary Load Support)](#cap-287)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-020"></a>
<!-- migrated:cap-020:start -->
### قدرة: العزل الشامل بين حسابات المناديب للعميل المشترك وتفصيل إجمالي المشرف والمالك (Rep-to-Rep Customer Account & Collection Isolation — VAN-12) — ✅ مفعّلة ومحروسة (أكتوبر 2026)
- **عزل أرصدة العملاء لكل مندوب (`aggregateCustomerBalancesByRep` & `resolveIsolatedRepCustomerBalance`):** عند تعامل أكثر من مندوب مبيعات مع نفس المحل أو المنفذ (مثل «محل البركة» كود `0002` — مندوب 1 له `500 ج.م` ومندوب 2 له `2,000 ج.م`)، يفصل محرك العزل في `rep-target.engine.ts` و `van-common.util.ts` (`getCustomerRepBalancesMap`) حركات الأستاذ المساعد (`customer_ledger`) حسب كل مندوب (`COALESCE(vt.rep_id, s.delivery_rep_id, vfr.rep_id)`).
- **بوابة المندوب (`getActiveTrip` و `getDriverTodayItinerary` و `createDriverCustomer`):** يرى كل مندوب حصراً مديونيته المعزولة لدى المحل (`repBalance`: مندوب 1 يرى `500 ج.م` فقط ومندوب 2 يرى `2,000 ج.م` فقط)، مع دعم التعيين المتعدد للمناديب على نفس المحل (`assigned_rep_ids`) دون مسح تعيين المندوب الآخر.
- **عزل التحصيل الميداني (`recordFieldCollection` & `validateIsolatedRepCollection`):** يمنع النظام أي مندوب من تحصيل مبلغ يتجاوز مديونيته المعزولة لدى العميل المشترك (`REP_ISOLATED_BALANCE_EXCEEDED`) لمنع تداخل حسابات وعهد المناديب، ويعيد إيصال التحصيل الرصيد السابق والجديد الخاص بعهدة المندوب (`repPreviousBalance` / `repNewBalance`).
- **عزل الفواتير والمرتجعات الميدانية (`getCustomerEligibleSales` & `submitFieldReturn`):** تقتصر الفواتير المتاحة للمرتجع في بوابة المندوب على فواتير المندوب نفسه فقط مع حظر إرجاع أصناف على فاتورة مندوب آخر (`SALE_REP_MISMATCH`).
- **رؤية المشرف وصاحب المكان الشاملة والمفصلة (`VanRoutesKpiAdminTab.tsx` و `CustomersRegisterCard.tsx` و `CustomerEditorCard.tsx`):** عند بحث المشرف أو المالك باسم المحل («البركة») أو بكوده (`0002` / `C-0002`) في شاشة خطوط السير أو شاشة العملاء، يظهر إجمالي مديونية المحل للمنشأة (`2,500 ج.م`) وتحته شارات تفصيلية واضحة بحساب كل مندوب على حدة (`مندوب 1: 500.00 ج.م` | `مندوب 2: 2,000.00 ج.م`).


<!-- migrated:cap-020:end -->

<a id="cap-021"></a>
<!-- migrated:cap-021:start -->
### قدرة: منظومة التحصين الهجومي الشامل لكافة أنماط التوزيع الميداني (Van Sales Exhaustive Adversarial Governance) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)
- **محرك تدقيق وحوكمة المرتجعات الميدانية (`evaluateFieldReturnGovernance`):** محرك نقي 100% يغلق كافة ثغرات المرتجعات الميدانية:
  1. حظر تضخيم كمية المرتجع فوق الكمية المباعة (`RETURN_QTY_EXCEEDS_SOLD`).
  2. حظر تكرار المرتجع التراكمي (تتبع المرتجع التراكمي عبر سندات المرتجع السابقة ومنع استنزاف السطر المباع).
  3. حظر التلاعب بسعر المرتجع فوق سعر البيع الصافي بعد الخصم (`RETURN_PRICE_EXCEEDS_NET`).
  4. حظر المرتجع العابر للعملاء (`SALE_CUSTOMER_MISMATCH`) أو المرتجع العابر للمناديب على فواتير زميل آخر (`SALE_REP_MISMATCH`).
  5. حظر الأصناف الوهمية غير المدرجة بالفاتورة الأصلية (`ITEM_NOT_IN_SALE`).
  6. حظر المرتجعات غير المربوطة بفاتورة دون سابقة مبيعات لهذا المندوب مع العميل (`NO_REP_SALES_HISTORY_FOR_RETURN`).
  7. حظر الصرف النقدي الفوري للمرتجع إذا تجاوز النقدية المحصلة فعلياً بالرحلة (`INSUFFICIENT_REP_CASH_FOR_REFUND`).
- **حوكمة التحصيل الميداني الجزئي والكلي (`validateIsolatedRepCollection`):** يدعم السداد الجزئي للديون، والتصفية الكاملة، ويمنع منعاً باتاً استيلاء أي مندوب على مديونية زميل آخر لنفس العميل المشترك (`REP_ISOLATED_BALANCE_EXCEEDED`).
- **حوكمة خطوط السير والزيارات السلبية والإيجابية (`evaluateItineraryVisitRules`):**
  1. مطابقة يوم الزيارة المجدول بالعربية والإنجليزية (`isScheduledToday`) وتمييز الزيارات العارضة خارج الخط.
  2. تدقيق أسباب الزيارة السلبية الستة المعتمدة تشغيلياً (`no_cash`, `shop_closed`, `sufficient_stock`, `item_unavailable`, `postponed`, `other`) وحظر الأسباب غير المعتمدة.
  3. كشف الزيارات السلبية المتكررة (3 زيارات متتالية) وتصعيد تنبيه فوري لمشرف المبيعات للتحقيق في أسباب تعطل المنفذ.
  4. درع مكافحة الزيارات الوهمية الجغرافية (Ghost Visits) بربط الزيارة بنطاق 300 متر من إحداثيات الدكان المسجلة.
- **فرز وتوزيع أذونات التحميل الصباحية آلياً عبر المستودعات (`splitRequisitionByWarehouse`):** تقسيم أصناف إذن التحميل آلياً حسب المستودع المصدري وإصدار أذونات منفصلة لكل مستودع مع المحافظة على الترقيم القياسي (`REQ-YYMMDD-XXXX`).
- **شهادة إخلاء الطرف وإيصال التوريد الحراري 80mm (`buildVanSettlementThermalReceiptHtml` & `formatVanSettlementSummaryText`):** تدقيق فروق النقدية بالمليم (عجز/فائض/مطابق)، احتساب فروق الجرد الفعلي لبضاعة السيارة بالتكلفة، وإصدار إيصال حراري رسمي ورسائل واتساب موثقة.
- **إصلاح استخراج إحداثيات Google Maps من روابط الاتجاهات (`extractCoordinatesFromCustomerLocation`):** دعم كامل لمعاملات المسارات والاتجاهات (`destination` و `saddr`) لمنع تخطي فحص النطاق الجغرافي عند مشاركة العميل لموقعه عبر روابط الاتجاهات بواتساب.
- **الحراسة الآلية المستمرة والتدقيق الجنائي (30 سيناريو اختراق):** تغطية 100% بكافة الملفات الثلاثة `van-sales-adversarial-sabotage.spec.ts` و `van-sales-deep-adversarial-all-modes.spec.ts` و `van-sales-claude-audit.spec.ts` ضمن حراس النظام (`test:critical`).



<!-- migrated:cap-021:end -->

<a id="cap-022"></a>
<!-- migrated:cap-022:start -->
### قدرة: بوابة الفحص الإلزامي للـ GPS ومنع بدء الزيارات أو البيع الميداني عند إغلاق الموقع (Mandatory GPS Visit Gate & Action Enforcement) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)
- **بوابة فحص الـ GPS الصارمة (`VanGpsMandatoryModal`):** منع بدء أي زيارة ميدانية لعميل في خط السير، أو إصدار فاتورة بيع جديدة، أو تسجيل مرتجع، أو تحصيل نقدية، أو جرد رف، أو استبيان، أو استبدال توالف إلا بعد التحقق الفعلي من فتح وتشغيل خدمة الـ GPS والتقاط إحداثيات المتجر (`latitude`, `longitude`).
- **نافذة التوجيه المؤسسية المانعة (`VanGpsMandatoryModal.tsx`):** في حال إغلاق الـ GPS في الهاتف أو رفض صلاحية المتصفح، تظهر نافذة قياسية تمنع إتمام الإجراء وتوضح للمندوب خطوات التفعيل السريعة مع زر «إعادة الفحص والتقاط الموقع الآن» لإعادة المحاولة فور تشغيله دون تعطيل أو قفل البرنامج ككل.
- **التوثيق اللحظي للزيارة مع الإحداثيات (`checkInVisit` & `activeVisit`):** توثيق إحداثيات الوصول لحظياً وتخزينها في جلسة الزيارة النشطة وإرسالها لخادم المنظومة مع مطابقتها بالنطاق الجغرافي للعميل عبر `FmcgVisitExecutionEngine` وتسجيل أي شبهة تباعد عبر `VanFraudRadarService`.
- **ملفات الكود المعتمدة:** `frontend/src/features/delivery-reps/components/VanGpsMandatoryModal.tsx`، `frontend/src/features/delivery-reps/components/VanItineraryTab.tsx`، `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`، `backend/src/modules/delivery-reps/fmcg-visit-execution.engine.ts`.


<!-- migrated:cap-022:end -->

<a id="cap-023"></a>
<!-- migrated:cap-023:start -->
### قدرة: جدولة زيارات العملاء وتخصيص المناديب المتعددين وجداول الأيام المستقلة (Multi-Rep Assignment & Rep-Specific Itinerary Schedules) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)
- **محرك توحيد وقفل أيام الزيارات (`van-routes-schedule.util.ts`):** محرك موحد للتعامل مع أيام الأسبوع وتطبيع الاختلافات الإملائية بالهمزة (مثل `الإثنين` / `الاثنين` / `الاتنين`، `الأربعاء` / `الاربعاء`، `الجمعة` / `الجمعه`) وربطها بالمفتاح القانوني الموحد (`sunday` .. `saturday`) ومراعاة التوقيت المحلي المصري (`Africa/Cairo`) لمنع أي انزياح زمني مع توقيت UTC.
- **تخصيص العميل لأكثر من مندوب وجدولة أيام مستقلة لكل مندوب (`metadata.rep_schedules`):** تمكين تعيين أكثر من مندوب لنفس المحل (مثل: مندوب الألبان يزوره الأحد ومندوب الجاف يزوره الخميس)، بحيث يظهر المحل في خط سير كل مندوب في الأيام المخصصة له حصراً، مع دعم التعيين الموحد لجميع المناديب في نفس الأيام عند الرغبة.
- **إعادة هيكلة وتطوير بطاقة تعديل العميل المؤسسية (`CustomerEditorCard.tsx`):**
  - توسيع النافذة إلى العرض القياسي (`900px`) وإلغاء الزر الأحمر الطافي العشوائي ونقله لفوتر الإجراءات السفلي المحمي بـ `ActionConfirmDialog`.
  - تقسيم الشاشة إلى 3 أقسام رصينة: (1) بيانات المحل والاتصال، (2) السياسة المالية والائتمانية مع تفصيل مديونية المناديب المعزولة، (3) التوزيع الميداني وخط السير وتعيين المناديب مع مفتاح التبديل الذكي بين الجدول الموحد وجداول المناديب المستقلة.
- **التزامن الكامل بين صيغة المفرد والجمع (`visit_day` و `visit_days` و `rep_schedules`):** مزامنة الحقول لحظياً في الباك إند (`partners.service.ts`، `van-sales.service.ts`، `van-routes.service.ts`، `rep-target.engine.ts`).
- **فلترة خط السير الصارمة بحسب اليوم (`customerMatchesDay` في `VanItineraryTab.tsx`):** استبعاد أي عميل غير مجدول لليوم الحالي استبعاداً صارماً، واستيفاء اليوم الفعلي للمندوب بناءً على جدول المناديب المستقل أو الجدول العام.
- **حارس الاختبارات الصارم (`van-customer-schedule-itinerary.spec.ts`):** اختبارات وحدة تنفيذية تثبت التطبيع الإملائي، ومطابقة الأيام، وتمايز جداول المناديب المتعددين لنفس المحل بدقة 100%.
- **ملفات الكود المعتمدة:** `backend/src/modules/delivery-reps/van-routes-schedule.util.ts`، `backend/src/modules/delivery-reps/services/van-routes.service.ts`، `backend/src/modules/delivery-reps/rep-target.engine.ts`، `backend/src/modules/delivery-reps/van-sales.service.ts`، `backend/src/modules/partners/partners.service.ts`، `frontend/src/features/customers/components/CustomerVisitDaysPicker.tsx`، `frontend/src/features/customers/components/CustomerEditorCard.tsx`، `frontend/src/features/customers/pages/CustomersPage.tsx`، `backend/test/critical/van-customer-schedule-itinerary.spec.ts`.


<!-- migrated:cap-023:end -->

<a id="cap-024"></a>
<!-- migrated:cap-024:start -->
### قدرة: منظومة صلاحيات وضوابط المناديب في الميدان (Field Rep Permissions & Operational Governance) — ✅ مفعّلة ومحروسة 100% (أكتوبر 2026)
- **قاعدة بيانات مهيكلة لصلاحيات المناديب (`delivery_representatives.permissions`):** هجرة قاعدة البيانات رقم `2040000000224` لإضافة عمود `permissions JSONB` و `metadata JSONB` لجدول المناديب.
- **لوحة تحكم الصلاحيات الميدانية في نافذة المندوب (`UpsertDeliveryRepModal.tsx`):** إضافة قسم رصين يتيح لصاحب العمل والمشرف ضبط صلاحيات المندوب:
  1. `can_edit_routes`: تعديل خطوط السير وأيام الزيارات (افتراضياً: معطل - محجوز للإدارة والمشرفين لمنع التلاعب بالجغرافيا).
  2. `can_add_customers`: تسجيل محلات جديدة في الميدان (افتراضياً: مفعل).
  3. `require_gps_on_visit`: إلزامية فتح الـ GPS لبدء وتأكيد الزيارات (افتراضياً: مفعل).
  4. `can_collect_cash`: تحصيل دفعات نقدية وإصدار سندات قبض (افتراضياً: مفعل).
  5. `can_sell_over_credit_limit`: تجاوز سقف المديونية للمحل (افتراضياً: معطل).
  6. `can_give_discount`: منح خصومات نقدية على الفاتورة مع تحديد الحد الأقصى للخصم (`max_discount_percent`).
- **التكامل مع جلسة المندوب:** إرجاع الصلاحيات فور تسجيل دخول المندوب `driverLogin` لتطبيق القيود التشغيلية على تطبيق الهاتف لحظياً.
- **معمارية النافذة ثنائية الأعمدة بدون سكرول (Zero-Scroll 2-Column Responsive Layout):** إعادة هندسة نافذة إضافة وتعديل المندوب (`UpsertDeliveryRepModal.tsx`) وفق دستور ملاءمة الشاشات من 14 إلى 32 بوصة (Zero-Scroll Standard):
  - توسيع النافذة إلى `min(1060px, 96vw)` وتقسيم البيانات إلى عمودين متوازيين متزنين (الأيمن: طبيعة العمل، البيانات الأساسية، الهوية والضمان؛ الأيسر: المركبة والأسطول، شبكة الصلاحيات الست الميدانية).
  - دمج شارة وزر حالة الحساب (نشط / موقوف) داخل شريط الترويسة الرئيسي بجوار العنوان، مما وفر ~65 بكسل رأسية وقضى تماماً على السكرول الخارجي على شاشات اللابتوب الصغيرة 14 بوصة فما فوق.
  - إحكام ارتفاع الحقول (`32px`) والأزرار التشغيلية (`34px`) لضمان ظهور كافة الخيارات وأزرار الحفظ والإلغاء في شاشة واحدة متكاملة دون تحريك الفأرة.
- **ملفات الكود المعتمدة:** `backend/src/database/migrations/2040000000224_delivery_rep_permissions_and_metadata.ts`، `backend/src/database/database.types.ts`، `backend/src/modules/delivery-reps/delivery-reps.service.ts`، `backend/src/modules/delivery-reps/dto/upsert-delivery-rep.dto.ts`، `frontend/src/shared/api/delivery-reps.api.ts`، `frontend/src/shared/components/delivery-reps/UpsertDeliveryRepModal.tsx`.


<!-- migrated:cap-024:end -->

<a id="cap-025"></a>
<!-- migrated:cap-025:start -->
### قدرة: المركز المالي الموحد لتسويات وعجوزات وبونص مناديب التوزيع والربط بمسير الرواتب (Van Rep Financial Ledger, Shortages Settlement Hub & HR Payroll Bridge) — ✅ مفعّلة ومكتملة 100% (أكتوبر 2026)
- **قاعدة بيانات مهيكلة لحركات وذمم مناديب التوزيع (`van_rep_financial_settlements`):** هجرة قاعدة البيانات رقم `2040000000225` لإنشاء جدول التسويات الموحد مع ربطه بالمنشأة (`tenant_id`), المندوب (`rep_id`), الرحلة (`trip_id`), ونوع الحركة (`cash_shortage`, `stock_shortage`, `cash_overage`, `commission`, `bonus`, `cash_reimbursement`), وحالة التسوية (`pending`, `settled`, `waived`, `pushed_to_payroll`).
- **المزامنة والترحيل التلقائي من تصفية الرحلات (`settleTrip`):** عند إغلاق رحلة التوزيع وظهور عجز كاش أو عجز بضاعة محمل على المندوب، يتم تقييده آلياً كبند عجز مالي معلق في كشف حساب المندوب.
- **إثبات السداد النقدي بالخزينة وسندات القبض الرسمية:** تسجيل السداد النقدي بنقرة واحدة وإصدار سند قبض موحد بالصيغة القياسية الدستورية (`REC-YYMMDD-XXXX`).
- **الإعفاء والتسوية الإدارية المبررة:** تسجيل الإعفاء الإداري المعتمد من الإدارة مع تدوين المبررات دون خصمه أو مطالبة المندوب به.
- **الربط المباشر مع مسير الرواتب والأجور (HR Payroll Bridge):** ترحيل العجوزات المعلقة دفعة واحدة كاستقطاعات رسمية في مسير الشهر المحدد (`targetMonth`), مع الربط الآلي أو اليدوي لملف الموظف المقابل في الموارد البشرية (`hr_employees`).
- **نافذة الربط الذكي بموظف HR بنقرة واحدة (`linkingRep`):** إمكانية ربط أي مندوب توزيع بملف موظف HR أو فك الارتباط من خلال نافذة تفاعلية منبثقة وسريعة مع قراءة قائمة موظفي الموارد البشرية النشطين.
- **تبويب لوحة القيادة في سطرين متوازيين (6x2 Balanced Grid):** تقسيم كافة تابات إدارة مبيعات الفان الـ 12 إلى سطرين متناسقين (6 تابات في كل سطر) لمنع انضغاط النصوص مع الالتزام الصارم بدستور ثبات الخط (`Zero Font-Shift Standard`).
- **ملفات الكود المعتمدة:** `backend/src/database/migrations/2040000000225_van_rep_financial_ledger_and_settlements.ts`، `backend/src/database/database.types.ts`، `backend/src/modules/delivery-reps/van-sales.service.ts`، `backend/src/modules/delivery-reps/van-sales.controller.ts`، `frontend/src/features/delivery-reps/api/van-sales.api.ts`، `frontend/src/features/delivery-reps/components/VanFinancialLedgerAdminTab.tsx`، `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`.

---


<!-- migrated:cap-025:end -->

<a id="cap-061"></a>
<!-- migrated:cap-061:start -->
## 36. مبيعات وتوزيع سيارات الفان الميدانية وأسطول الشركة (Van Sales & Fleet Management) 🚚📦
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:**
  * **الباك إند والخدمات:** `backend/src/modules/delivery-reps/van-sales.service.ts`, `backend/src/modules/delivery-reps/van-sales.controller.ts`, `backend/src/modules/delivery-reps/rep-target.engine.ts`, `backend/src/modules/delivery-reps/delivery-reps.service.ts`, `backend/src/modules/delivery-reps/delivery-reps.controller.ts`, `backend/src/database/migrations/2040000000045_van_sales_and_mobile_stock.ts`, `backend/src/database/migrations/2040000000153_fleet_vehicles_and_shift_assignments.ts`, `backend/src/database/migrations/2040000000155_van_sales_target_returns_and_requisitions.ts`, `backend/src/database/migrations/2040000000160_sync_fleet_vehicle_drivers_and_reps.ts`
  * **الاختبارات الحرجة:** `backend/test/critical/rep-target-engine.spec.ts`
  * **الفرونت إند والواجهات:** `frontend/src/features/delivery-reps/api/van-sales.api.ts`, `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`, `frontend/src/features/delivery-reps/components/VanTripsTab.tsx`, `frontend/src/features/delivery-reps/components/VanLoadRequisitionsAdminTab.tsx`, `frontend/src/features/delivery-reps/components/VanFieldReturnsAdminTab.tsx`, `frontend/src/features/delivery-reps/components/VanRepTargetsAdminTab.tsx`, `frontend/src/features/delivery-reps/components/FleetVehiclesTab.tsx`, `frontend/src/features/delivery-reps/components/DriverLoadRequisitionModal.tsx`, `frontend/src/features/delivery-reps/components/VanInventoryTab.tsx`, `frontend/src/features/delivery-reps/components/VanSaleTab.tsx`, `frontend/src/features/delivery-reps/components/VanCollectionTab.tsx`, `frontend/src/features/delivery-reps/components/UpsertFleetVehicleModal.tsx`, `frontend/src/features/delivery-reps/components/AssignDriverModal.tsx`, `frontend/src/shared/components/delivery-reps/UpsertDeliveryRepModal.tsx`, `frontend/src/shared/components/delivery-reps/DeliveryRepsList.tsx`, `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`
* **الجداول في قاعدة البيانات:** `fleet_vehicles`, `fleet_vehicle_drivers`, `van_sales_trips`, `van_load_requisitions`, `van_field_returns`, `delivery_rep_targets`, `delivery_representatives`, `stock_locations`, `product_location_stock`, `sales`, `sale_items`, `customer_ledger`, `customer_payments`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **أسطول سيارات الشركة وربط المستودع المتنقل (Company Fleet Vehicles)** | 🟢 | 100% | `fleet_vehicles`, `van-sales.service.ts`, `UpsertFleetVehicleModal.tsx` | سجل كامل لأسطول سيارات الشركة يشمل: رقم اللوحة، الموديل، النوع، الشاسيه، قراءة العداد، الوقود، وتاريخ انتهاء الرخصة، مع التوليد الآلي لموقع مخزني متنقل (`van_stock`) لكل سيارة. |
| **تخصيص السائق والوردية وقراءة العداد والمزامنة الشاملة (Driver & Shift Assignment & Unified Fleet Sync)** | 🟢 | 100% | `fleet_vehicles`, `fleet_vehicle_drivers`, `van_sales_trips`, `AssignDriverModal.tsx`, `van-sales.service.ts`, `delivery-reps.service.ts`, `2040000000160_sync_fleet_vehicle_drivers_and_reps.ts` | إسناد السائق للمركبة وتحديد اسم الوردية ومواعيدها، وتتبع قراءة عداد الكيلومترات عند فتح الرحلة وعند إغلاقها (`start_odometer`, `end_odometer`) لكشف الاستهلاك ومعدل الوقود.<br/>**المزامنة الحية الشاملة وحل تعارض اللوحات (هجرة 160):** ربط نافذة تخصيص السائق والورديات بالمنظومة بالكامل؛ حيث تنعكس لوحة السيارة والمستودع المتنقل فوراً على بيانات المندوب (`delivery_representatives`) سواء كان سائقاً أساسياً أو مخصصاً لوردية صباحية/مسائية في `fleet_vehicle_drivers`. مع تطبيق استعلام ديناميكي ذكي (`COALESCE`) في قائمة المناديب وأذونات التحميل يقرأ اللوحة من الوردية أولاً ثم السائق المعين ثم السجل المباشر، وتحديث الكاش تلقائياً بدون إعادة تحميل الصفحة. |
| **التمييز الموحد لنوع المندوب (Rep Type Differentiation)** | 🟢 | 100% | `UpsertDeliveryRepModal.tsx`, `delivery-reps.service.ts` | نافذة موحدة شاملة تطبق مبدأ المصدر الموحد (Rule 11) تتيح التحديد الصريح بين: طيار دليفري (`delivery`)، مندوب توزيع فان (`van`)، أو مندوب شامل (`both`). |
| **مركز إدارة ومتابعة الفان سداسي التبويبات (6-Tab Van Sales Hub)** | 🟢 | 100% | `VanSalesAdminManagementPage.tsx` | شاشة إدارة متكاملة 1280px بـ 6 تبويبات سريعة: 1) رحلات وورديات التوزيع، 2) أذونات تحميل الصباح، 3) مرتجعات البيع الميداني، 4) تارجت ومستهدفات المناديب، 5) أسطول سيارات الشركة، 6) مناديب وسائقي الفان، مع عدادات حية للطلبات والمرتجعات المعلقة. |
| **أذونات تحميل الصباح وسير عمل الصرف والاعتماد وحفظ المسودة التلقائي (Morning Load Requisitions & Auto-Draft Engine)** | 🟢 | 100% | `van_load_requisitions`, `DriverNewLoadRequisitionView.tsx`, `VanLoadRequisitionsAdminTab.tsx`, `useDriverLoadRequisition.ts`, `use-form-draft.ts`, `van-sales.service.ts` | دورة عمل مؤسسية ومكون شامل موحد (`DriverNewLoadRequisitionView.tsx`) يعمل عند المندوب والمشرف: إنشاء طلب التحميل، مراجعة الإدارة ومطابقة الكميات مع رصيد المستودع الفعلي، أو الإسناد والصرف الإداري الفوري بنقرة واحدة وتحميل السيارة وبدء الرحلة.<br/>**محرك حفظ المسودات التلقائي (Auto-Draft):** ربط الشاشة بمحرك `useFormDraft` لحفظ الأصناف والكميات والمستودع والملاحظات والمندوب لحظياً في التخزين المحلي، وحظر مسح المسودة مطلقاً عند التنقل بين الصفحات أو إغلاق التبويب، واسترجاعها تلقائياً مع مزامنة حية للأرصدة والأسعار المحدثة، وحظر التفريغ إلا عند الصرف الناجح أو النقر الصريح على "حذف المسودة" وتأكيدها. |
| **مرتجع البيع الميداني مع اشتراط موافقة الإدارة (Admin-Approved Field Returns)** | 🟢 | 100% | `van_field_returns`, `VanCollectionTab.tsx`, `VanFieldReturnsAdminTab.tsx`, `van-sales.service.ts`, `accounting-posting.service.ts` | تسجيل المرتجع بحالة معلقة (`pending_approval`) دون أي أثر مالي أو مخزني حتى تتم مراجعته من الإدارة. عند الاعتماد (`approve`)، يتم قيد الحركة المخزنية وإشعار الدائن للعميل تلقائياً وترحيل قيد محاسبي عاكس (إيراد وتكلفة بضاعة مباعة)، مع دعم الرفض المسبب (`reject`).<br/>**تحصين سبتمبر 2026 (نفس يوم البناء):** مسار قديم (`recordFieldReturn` عبر `POST /returns`) كان لسه شغالاً **جنب** المسار الجديد على نفس بوابة المندوب — أي طلب مباشر له كان يسجّل المرتجع فوراً بلا أي موافقة، فيلتف كلياً على الميزة. أُزيل نهائياً (لا الخدمة ولا المسار). وكان فحص السعر الصافي مقابل الفاتورة موجوداً بلا أي سقف على الكمية — مندوب يقدر يرد أكتر من المباع، أو نفس الكمية مرتين عبر طلبين منفصلين. صار محسوباً بدالة مشتركة (`المباع ناقص كل مرتجع سابق pending أو معتمد`) وترفض أي تجاوز. وكان الاعتماد يحدّث المخزون وحساب العميل فقط بلا أي قيد محاسبي — صار يستدعي `postVanFieldReturn` (عكس إيراد + عكس تكلفة بضاعة مباعة بتكلفة الصنف الفعلية لا بسعر الرد). هجرة 156، جناح `test/e2e/van-field-returns.e2e.ts`. |
| **أسباب المرتجع القياسية المؤسسية (Standardized Return Reasons)** | 🟢 | 100% | `van_field_returns`, `VanCollectionTab.tsx`, `VanFieldReturnsAdminTab.tsx` | تصنيف المرتجعات الميدانية إلى 6 أسباب معتمدة: بضاعة تالفة / كسر (`damaged`)، منتهية الصلاحية (`expired`)، عيب صناعة / تعبئة (`manufacturing_defect`)، بضاعة راكدة (`stagnant`)، خطأ في التوريد (`order_mismatch`)، ورغبة العميل (`customer_request`). |
| **التحقق الصارم من أسعار وكميات الفاتورة الأصلية (Invoice Price Verification)** | 🟢 | 100% | `van-sales.service.ts:getCustomerEligibleSales`, `VanCollectionTab.tsx` | استرجاع فواتير العميل مع احتساب السعر الصافي الفعلي بعد الخصم (`netUnitPrice = total / qty`) والتحقق من الكميات المتبقية القابلة للرد، لمنع المندوب من رد أي صنف بسعر أعلى مما دفعه العميل أو تجاوز الكمية المشتراة. |
| **محرك مستهدفات المبيعات واستبعاد الجمع والعطلات (Sales Target & Daily Quota Engine)** | 🟢 | 100% | `rep-target.engine.ts`, `rep-target-engine.spec.ts`, `VanRepTargetsAdminTab.tsx`, `VanSalesMobilePage.tsx` | محرك حسابي مستقل يحدد المستهدف الشهري، نسبة التحقيق الفعلية MTD، المتبقي، وحساب المستهدف اليومي الصافي المطلوب بقسمة المتبقي على أيام العمل المتبقية مع استبعاد أيام الجمعة والعطلات الرسمية آلياً. |
| **إحداثيات GPS الجغرافية على الفواتير والسندات وروابط Google Maps** | 🟢 | 100% | `sales`, `customer_ledger`, `van-sales.service.ts`, `VanTripsTab.tsx` | التقاط إحداثيات GPS لموقع المندوب الجغرافي لحظة إصدار فاتورة البيع ولحظة تحصيل السند النقدي، وعرض أزرار فتح الموقع المباشر على Google Maps في نافذة تفاصيل الرحلة بالإدارة. |
| **رؤية مخزون المستودع الرئيسي المتزامن (Main Warehouse vs Van Stock)** | 🟢 | 100% | `van-sales.service.ts:getActiveTrip`, `VanInventoryTab.tsx` | إظهار رصيد المستودع الرئيسي المتاح بجانب رصيد سيارة الفان لحظياً في شاشة جرد السيارة لمساعدة المندوب على معرفة توفر الأصناف بالمستودع الأم قبل طلبها أو بيعها. |
| **البيع النقدي والآجل وقيد المديونيات الميدانية** | 🟢 | 100% | `van-sales.service.ts`, `VanSaleTab.tsx` | دعم البيع النقدي والآجل لمحلات البقالة المسجلة بخط السير أو محلات جديدة تُسجل بالشارع، مع قيد المديونية فورياً في كشف حساب العميل والتقاط GPS. |
| **تحصيل ديون العملاء الميداني (Field Collections)** | 🟢 | 100% | `van-sales.service.ts`, `VanCollectionTab.tsx` | إمكانية استلام دفعات نقدية لسداد ديون قديمة، توليد سند قبض فوري، وتخفيض مديونية العميل في قاعدة البيانات لحظياً مع زيادة كاش الفان والتقاط GPS. |
| **تصفية اليومية الذكية وجرد الفان وتوريد الكاش (End-of-Day Settlement & Financial Ledger)** | 🟢 | 100% | `van-sales.service.ts`, `VanSettleTab.tsx`, `VanCollectionTab.tsx`, `migration: 164` | بيان تسوية محاسبي شامل وشفاف: تفصيل مبيعات الكاش والآجل، وسندات التحصيل النقدية، وتحديد طريقة رد المرتجع (كاش فوري من السيارة يخصم من كاش العهدة vs خصم من رصيد العميل الآجل)، وحساب صافي النقدية المتوقعة بدقة رياضية ومطابقتها مع الكاش الفعلي المعدود (مؤشرات كاش مطابق/عجز/زيادة)، واستكشاف فوري لحركة رحلة اليوم (فواتير البيع، سندات التحصيل، أذونات المرتجع، وكشف المخزون المتبقي) مع شبكة متجاوبة متوافقة مع الشاشات من 14 إلى 32 بوصة (`1280px`) وخيار تفريغ البضاعة المتبقية تلقائياً بنقرة واحدة. |
| **نمط نشاط تجارة وتوزيع الجملة وأسطول الفان (Wholesale & Van Profile)** | 🟢 | 100% | `industry-profiles.ts`, `trial-tenant-provisioning.service.ts`, `IndustryModeSelectorCard.tsx`, `settings.service.ts`, `SettingsMainForm.tsx`, `UpdateTenantPlanModal.tsx`, `app-shell.tsx`, `access.ts`, `migration: 167`, `migration: 168` | نمط نشاط قطاعي متكامل لشركات التوزيع وتجارة الجملة، يعطل تلقائياً نقاط البيع والكاشير الصامت (`posModuleEnabled: false`) لتصفية واجهة العمل، ويفعل أسطول الفان والمستودعات المتنقلة وإدارة المناديب (`delivery-reps`)، ويعيد ترتيب القائمة لتتصدر مبيعات وتوزيع الفان وإدارة المناديب والمخازن، مع المعالجة الشاملة لكافة صيغ المود وأسماء المنشآت بالسحابة (SaaS Admin Provisioning) وإتاحة اختيار نمط المنشأة والمود القطاعي مباشرة مع الباقة من نافذة إدارة المشتركين بالسحابة وحظر أي رجوع افتراضي للتجزئة العامة. |
| **سجل بيانات ومواقع عملاء التوزيع والمحلات (Distribution Customer Master Data & Dual Import Templates)** | 🟢 | 100% | `customer-profiles.ts`, `CustomerForm.tsx`, `CustomerEditorCard.tsx`, `CustomersRegisterCard.tsx`, `VanSaleTab.tsx`, `SettingsBackupImportSection.tsx`, `ImportWorkbench.tsx`, `settings-page.helpers.tsx`, `settings-import.service.ts` | منظومة متكاملة لبيانات المحلات ومنافذ التوزيع تشمل: كود المحل الفريد (`customer_code`)، خط السير والمسار (`route`)، الحي والمنطقة (`district`)، يوم وأيام الزيارة الأسبوعية (`visit_day` / `visit_days`)، ترتيب خط السير (`route_sequence`)، المندوب المسؤول المخصص (`assigned_rep_name` / `assigned_rep_id`)، فئة السعر (`price_tier`)، نوع النشاط (`category`)، ورابط خرائط Google Maps والـ GPS، مع ظهورها في جدول العملاء وبوابة المندوب الميدانية بالشارع.<br/>**قوالب استيراد العملاء المنفصلة (التجزئة vs الجملة وتوزيع الفان):** إتاحة خيارين صريحين لتحميل قوالب الاستيراد بضغطة زر: 1) «قالب تجزئة ونقدي» مبسط لعملاء القطاعي والمستهلكين، 2) «قالب جملة وتوزيع (فان)» شامل لكافة الحقول التشغيلية للفان مع أمثلة واقعية جاهزة للتعبئة، مع التعرف التلقائي الذكي على كافة مرادفات الأعمدة وحفظ وتحديث البيانات في `customers.metadata` دون فقدان أي بيانات سابقة. |
| **مركز صيانة الأسطول وتتبع الوقود والزيوت والرخص (Fleet Maintenance, Oil & Fuel Hub)** | 🟢 | 100% | `FleetVehiclesTab.tsx`, `OilChangeModal.tsx`, `FuelRefillModal.tsx`, `SendToMaintenanceModal.tsx`, `CompleteMaintenanceModal.tsx` | مركز صيانة ومتابعة شامل لأسطول المركبات: تتبع استهلاك الوقود وحساب معدل الاستهلاك (كم/لتر) والمسافة المقطوعة بين كل تفويلة وأخرى، وسجل غيارات الزيت وتحديد الكيلومترات (بفلتر وبدون فلتر) مع إشعارات استباقية للمدير والسائق، وتنبيهات انتهاء تراخيص المركبات قبل موعدها بـ 30 يوماً، ومتابعة المركبات بالورشة وإتمام الصيانة وتسجيل التكاليف وتحديث قراءة العداد فوراً. |
| **إثبات تسليم البضاعة بالكاميرا وعدادات الكراتين والقطع (Proof of Delivery Photo & Carton Counters)** | 🟢 | 100% | `VanSaleNewInvoiceModal.tsx`, `small-receipt-printer.ts`, `whatsapp.ts` | شريط عدادات صريح داخل فاتورة البيع الميداني يشمل: عدد البنود، إجمالي القطع، وإجمالي الكراتين (حساب آلي من سعة الكرتونة أو تعديل يدوي)، مع ميزة التقاط أو إرفاق صورة البضاعة المسلمة للمحل مباشرة عبر كاميرا الهاتف لإثبات التسليم وربطها بالفاتورة، وإدراج إجمالي الكراتين والقطع والبنود في الإيصال الحراري الصغير ورسالة الواتساب. |
| **مركز قيادة المندوب الدائم وبدء الرحلة المباشر (Driver Cockpit & Standalone Mobile Workspace)** | 🟢 | 100% | `VanSalesMobilePage.tsx`, `van-sales.service.ts`, `van-sales.api.ts` | ترقية شاشة المندوب الميدانية (`/van-sales`) لتصبح مركز قيادة تشغيلي دائم (Driver Cockpit) يتيح فحص حالة المركبة (اللوحة، العداد، الوقود، وتنبيهات الزيت والرخصة)، بدء الرحلة فوراً بالبضاعة المحملة بالفعل بالسيارة (`startTripMutation`)، وتصفح خط السير وبضاعة السيارة وسجلات الوقود وأذونات التحميل بحرية تامة دون اشتراط وجود رحلة نشطة مفتوحة، مع زر انتقال سريع للمشرف. |
| **سلاسة اختيار الأصناف ومنع قفز التبويبات الفجائي ودستور العدادات (Zero-Jumping Cart & RTL Stepper Standard)** | 🟢 | 100% | `VanInventoryTab.tsx`, `VanSaleTab.tsx`, `VanSalesMobilePage.tsx`, `VanLoadRequisitionsAdminTab.tsx`, `DriverLoadRequisitionModal.tsx` | القضاء التام على التنقل الفجائي المزعج بين التبويبات عند إضافة الأصناف في بوابة بيع الفان بالشارع: 1) داخل الفاتورة: إتاحة إضافة الأصناف مباشرة عبر قائمة منسدلة سريعة أو نافذة منتقي الأصناف المجمعة (`StandardDialog`) دون مغادرة الفاتورة، 2) داخل بضاعة السيارة: إضافة الأصناف وزيادة ونقصان الكميات بسلاسة مع البقاء في التبويب، وشريط سفلي عائم يوضح عدد الأصناف والقطع والإجمالي مع زر صريح للمتابعة عند الانتهاء.<br/>**دستور أزرار العدادات والكميات في الواجهات العربية (Strict RTL Stepper Standard):** اعتماد وتطبيق المعيار القياسي لكافة عدادات الكمية في النظام بحيث يكون زر الزائد (`+`) دائماً على اليمين وزر الناقص (`-`) دائماً على اليسار `[+] (الكمية) [-]` ليتوافق بدقة مع حركة العين والبدء الطبيعي للقراءة باللغة العربية RTL. |
| **الربط الفوري لعميل خط السير بفاتورة البيع (1-Click Itinerary to Sale Binding)** | 🟢 | 100% | `VanSalesMobilePage.tsx`, `VanItineraryTab.tsx`, `VanSaleTab.tsx`, `van-sales.service.ts` | الربط الفوري الشامل بين خط السير وفاتورة البيع الميداني: عند النقر على "+ إصدار فاتورة بيع" على أي محل أو عميل في خط السير (من بين كافة العملاء الـ 1000+)، ينتقل المندوب فوراً لتبويب الفاتورة مع تثبيت واختيار العميل تلقائياً في القائمة المنسدلة، وعرض بطاقة خضراء تأكيدية بارزة توضح اسم المحل، كود العميل، خط السير، المديونية الحالية، سقف الائتمان، ورابط خرائط جوجل، دون الحاجة للبحث عن اسمه يدوياً. |


---


<!-- migrated:cap-061:end -->

<a id="cap-079"></a>
<!-- migrated:cap-079:start -->
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
  5. **معيار مناطق الأمان للهواتف والنوتش (Mobile Safe-Area Insets Standard):** حماية الترويسات العلوية المثبتة (`<header sticky>`) في مركز البوابات الرقمية (`PortalsHubPage`)، وبورتال مبيعات الفان (`VanSalesMobilePage`)، وبوابة الموظفين (`EmployeePortalPage`)، وبوابة السائقين (`DriverPortalPage`) عبر خاصية `env(safe-area-inset-top, 0px)` المتوافقة مع `viewport-fit=cover`؛ مما يمنع نهائياً تداخل الساعة أو الكاميرا الأمامية أو النوتش (Notch / Dynamic Island) مع عناصر الهيدر على الهواتف الفعلية مع الحفاظ التلقائي على أبعادها الطبيعية على أجهزة الحواسب.
  6. **شريط الفلاتر الموحد فائق الانضغاط (Strict Single-Line Filter Pills):** جمع تبويبات تصفية البوابات الـ 5 (`الكل (10)`، `خدمة ذاتية`، `ميداني`، `صالة`، `إدارة`) على سطر أفقي واحد قطعي بدون أي سكرول وبدون التفاف لسطر ثانٍ عبر توزيع مرن متساوٍ (`flex: 1 1 0`, `minWidth: 0`) ومصطلحات تشغيلية مباشرة وموجزة.

---


<!-- migrated:cap-079:end -->

<a id="cap-206"></a>
<!-- migrated:cap-206:start -->
## 175. منظومة توزيع الفان وجملة السلع الاستهلاكية السريعة الميدانية وإدارة وصيانة أسطول المركبات (Wholesale Van Sales & FMCG Route Distribution & Fleet Maintenance)
* **حالة الوحدة / المعيار:** 🟢 مكتملة ومحكمة بنسبة 100% (27 سبتمبر 2026).
* **المعايير الهندسية والتشغيلية المعتمدة:**
  - هجرة قاعدة البيانات: `2040000000158_fleet_maintenance_visits_and_transfers.ts`.
  - معيار الترقيم الموحد للوثائق: `XFR-YYMMDD-XXXX` (مناقلات الشارع)، `VAN-YYMMDD-XXXX` (فواتير البيع)، `REQ-YYMMDD-XXXX` (أذونات التحميل).
  - الأمان المالي والمخزوني: مناقلات بضاعة الشارع تمر حصرياً عبر محرك النقل القانوني `moveVanStock` لضمان صحة القيود والأقفال القانونية في قاعدة البيانات.
  - سياسة حظر الإيموجيز الكرتونية والأيقونات غير المؤسسية (0 Emojis & Clean Enterprise SVG).
  - دستور ثبات التابات ومنع الرعشة الأفقية (Zero Font-Shift: وزن 600 ثابت).
* **الميزات والقدرات التشغيلية الميدانية والإدارية:**
  1. **إدارة الوقود وصيانة الأسطول:**
     - تسجيل تفويل الوقود (قراءة العداد، الكمية باللتر، سعر اللتر، إجمالي التكلفة، حساب المسافة منذ آخر تفويل، ومعدل الاستهلاك كم/لتر).
     - تسجيل غيارات الزيت والفلتر، مع كتابة حد التنبيه يدوياً بالكيلومتر المسبق (`alert_km_before`) وفق رغبة المستخدم واختياراته المخصصة.
     - تنبيه تلقائي لانتهاء رخصة المركبة قبل 30 يوماً من تاريخ الانتهاء.
     - تخصيص أكثر من سائق ووردية لنفس السيارة بمواعيد الورديات (صباحية، مسائية، ليلية).
  2. **خطوط السير والزيارات الميدانية:**
     - استعراض خط السير اليومي المنظم للمندوب حسب جدول المحلات.
     - تسجيل الزيارات الإيجابية (بفاتورة بيع) أو السلبية (مع تحديد السبب: محل مغلق، لا توجد نقدية، بضاعة كافية، صنف غير متوفر، تأجيل لموعد محدد مع إحداثيات الـ GPS).
     - تنبيه رقابي صارم للإدارة والمشرف فور تكرار الزيارة السلبية 3 مرات لنفس المحل.
  3. **التحويل بين سيارتين في الشارع (مناقلات الميدان اللحظية):**
     - شاشة فورية للمناقلة بين سيارتين بموافقة الطرفين (إرسال طلب ➔ قبول/رفض من المندوب الزميل).
     - شريط رقابي مباشر ودائم في لوحة المشرف لتوثيق جميع تحويلات الشارع وأصنافها وكمياتها وحالتها.
  4. **إثبات التسليم وتفقيط الطرود:**
     - التقاط صورة إثبات تسليم البضاعة بالكاميرا للمحل أثناء إصدار الفاتورة.
     - تفقيط عدد الكراتين والقطع والبنود المفرغة وطباعتها وتوثيقها في الإيصال.
  5. **طباعة إذن الصرف والتحميل:**
     - زر طباعة رسمي لإذن التحميل الصباحي بعد اعتماد المشرف، متضمناً جدول الأصناف المصرح بها وبيانات السيارة والمندوب والمستودع، مع التواقيع الثلاثية الرسمية (أمين المستودع، السائق، المشرف).
  6. **لوحة الإدارة والرقابة المركزية (KPIs):**
     - تبويب مستقل جديد: "خطوط السير والرقابة الميدانية (KPIs)" يوضح معدل إنجاز الزيارات، نسبة الضربات الناجحة (Strike Rate %)، تحليل أسباب الرفض، واستهلاك وقود الأسطول، مع جدول جدولة خطوط سير المحلات.
  7. **مركز قيادة المندوب الدائم وبدء الرحلة المباشر (Driver Cockpit & Standalone Mobile Workspace):**
     - ترقية شاشة المندوب الميدانية (`/van-sales`) لتصبح مركز قيادة تشغيلي دائم (Driver Cockpit) قبل وأثناء رحلة التوزيع.
     - بطاقة فحص المركبة الدائمة (لوحة السيارة، الموديل، قراءة العداد الحالية، نوع الوقود، تنبيهات الزيت والرخصة مع أزرار سريعة لتسجيل الوقود والزيوت).
     - إتاحة زر مباشر للانطلاق وبدء الرحلة فوراً (`startTripMutation`) بالبضاعة المتوفرة بالسيارة بالفعل، مع إبقاء زر إذن التحميل الصباحي.
     - إتاحة تصفح خط السير، فحص بضاعة السيارة الحالية، أذونات التحميل، وسجلات الوقود والأسطول دون اشتراط وجود رحلة نشطة مفتوحة.
     - إضافة زر انتقال مباشر في الهيدر إلى لوحة المشرف المركزية (`/inventory/van-sales`).
* **الملفات المتصلة:**
  - `backend/src/database/migrations/2040000000158_fleet_maintenance_visits_and_transfers.ts`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`
  - `frontend/src/features/delivery-reps/components/VanItineraryTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanFleetTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanTransferModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanRoutesKpiAdminTab.tsx`
  - `frontend/src/features/delivery-reps/components/VehicleMaintenanceModal.tsx`
  - `frontend/src/features/delivery-reps/components/AssignDriverModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanLoadRequisitionsAdminTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanSaleTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanSalesReceiptModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanInventoryTab.tsx`
  - `frontend/src/features/delivery-reps/components/FleetVehiclesTab.tsx`
  - `frontend/src/features/delivery-reps/components/DriverNewLoadRequisitionView.tsx`
* **التحقق:**
  - نجاح الفحص النوعي للفرونت إند والباك إند (`tsc` بنسبة 100% و `Exit code 0`).
  - اجتياز حراس الباك إند (`npm run guards:backend`) بنجاح تام 100%.

---


<!-- migrated:cap-206:end -->

<a id="cap-207"></a>
<!-- migrated:cap-207:start -->
### قدرة: منظومة أذونات تحميل سيارات الفان الموحدة والإسناد المباشر بدون بوب اب (Unified Van Load Requisitions & Direct Dispatch Engine)
* **الحالة:** مكتملة 100% معتمدة وفق دستوري Single Source of Truth و Zero-Popup Full Width Standard.
* **المسارات:** `/inventory/van-sales` (لوحة المشرف - تبويب أذونات التحميل)، `/van-sales` (بوابة المندوب الميدانية).
* **الملفات المنفذة والداعمة:**
  - **الواجهات الموحدة:** `frontend/src/features/delivery-reps/components/DriverNewLoadRequisitionView.tsx` (تم تصديره كـ `UnifiedLoadRequisitionView`)، `frontend/src/features/delivery-reps/components/VanLoadRequisitionsAdminTab.tsx`.
  - **طبقة الاتصال بالبيانات:** `frontend/src/features/delivery-reps/api/van-sales.api.ts`، `frontend/src/features/delivery-reps/hooks/useDriverLoadRequisition.ts`.
  - **محرك الباك إند والكنترولر:** `backend/src/modules/delivery-reps/van-sales.service.ts` (`createLoadRequisitionByAdmin`)، `backend/src/modules/delivery-reps/van-sales.controller.ts` (`@Get('warehouses')`, `@Post('requisitions')`).
* **المعايير التشغيلية والوظيفية المنفذة:**
  1. **المكون الموحد الشامل (Single Source of Truth - Rule 11):** توحيد شاشة طلب وإعداد إذن التحميل الصباحي بين المندوب والمشرف في مكون قياسي واحد `DriverNewLoadRequisitionView` (`UnifiedLoadRequisitionView`) يعمل بنمطين (`mode="driver" | "admin"`).
  2. **إلغاء النوافذ المنبثقة (Zero-Popup Standard):** استبدال البوب اب بالكامل في شاشة المشرف بعرض كارت وشاشة فسيحة كاملة العرض (1280px View Switch عبر `viewMode`) تتيح للمشرف رؤية جدول الأصناف والبحث الذكي بالاسم والباركود ورصيد المخازن اللحظي براحة بصرية تامة.
  3. **مسار الإسناد المباشر للسائقين:** تمكين المشرف من إعداد إذن التحميل بالنيابة عن المندوب واختيار السائق من قائمة المناديب مع جلب لوحة سيارته تلقائياً.
  4. **خياران تشغيليان للمشرف:**
     - «حفظ كإذن معلق»: تسجيل الإذن كمسودة بانتظار المراجعة والاعتماد لاحقاً.
     - «صرف وتحميل السيارة فوراً وبدء الرحلة»: تنفيذ آلي متكامل يخصم البضاعة من مستودع الصرف ويحولها لعهدة سيارة المندوب ويفتح رحلة التوزيع فوراً في خطوة واحدة.
  5. **شاشة نجاح تشغيلية واضحة:** عرض رقم إذن التحميل ورقم الرحلة المنطلقة وإمكانية العودة السلسة للقائمة بدون أي تكرار أو تعليق في الواجهة.
  6. **معيار الأداء الفائق ومنع التجمد (Zero-Freeze & Instant 0ms Architecture):** القضاء التام على بطء وتجمد الشاشة عند اختيار المندوب أو الصنف عبر:
     - تحسين `SearchableCombobox`: منع تصفية وفلترة مصفوفة الأصناف بالكامل عند إغلاق القائمة (`!isOpen`) عبر إرجاع مصفوفة فارغة ثابتة فوراً، وإضافة خاصية الإيقاف المبكر (`Early Break at 8 matches`) عند البحث بدل فحص كافة الأصناف بالكامل.
     - عزل وتغليف أسطر جدول الأصناف بمكون مميز ومحفوظ الذاكرة `RequisitionLineRow` مع `React.memo` ودوال استدعاء ثابتة `useCallback` ومساعدات بحث مستقرة خارج جسم المكون، مما منع إعادة تصيير أسطر الجدول نهائياً عند تغيير المندوب أو المخزن في الهيدر، وجعل الانتقال واستجابة الحقول لحظية (0ms) لكل من شاشة المندوب وشاشة المشرف معاً في المكون المشترك.
  7. **التنقل فائق السرعة عبر لوحة المفاتيح والتركيز التلقائي على الكمية (Auto-Focus & Auto-Select Qty on Product Selection):**
     - بمجرد اختيار الصنف بالماوس أو بالأسهم وزر Enter، ينتقل التركيز فورياً وبشكل تلقائي إلى حقل الكمية (`qty`) ويحدد الرقم الافتراضي (`1`) بالكامل عبر `select()`.
     - يتيح ذلك للمندوب أو المشرف كتابة العدد المطلوب مباشرة (مثال: `9`) دون الحاجة للنقر بالماوس أو مسح الرقم القديم.
     - عند الضغط على `Enter` في حقل الكمية، يتم تلقائياً فتح سطر جديد ونقل مؤشر التركيز مباشرة إلى حقل بحث الصنف التالي، مما يتيح إدخال الأصناف تباعاً بالكامل عبر الكيبورد بسرعة وسلاسة.



---


<!-- migrated:cap-207:end -->

<a id="cap-208"></a>
<!-- migrated:cap-208:start -->
### قدرة: محرك الطباعة الحرارية 80 مم لفواتير الفان سيلز الميدانية والمشاركة اللحظية (POS 80mm Thermal Receipt & Instant WhatsApp Sharing)
* **الحالة:** 🟢 مكتملة 100% ومختبرة بوحدات فحص برمجية (`van-sales-receipt.spec.ts`).
* **المسارات:** `/van-sales` (بوابة مبيعات الفان الميدانية - نافذة إيصال الفاتورة).
* **الملفات المنفذة والداعمة:**
  - **محرك وأدوات الطباعة:** `frontend/src/features/delivery-reps/utils/van-sales-receipt.utils.ts` (`buildVanSaleThermalReceiptHtml`, `printVanSaleThermalReceipt`, `formatVanSaleShareMessage`).
  - **محرك الطباعة الحرارية الصغير:** `frontend/src/lib/small-receipt-printer.ts` (دعم خطوط Cairo، مقاس 80 مم القياسي بعرض 72-74 مم الفعلي، وحماية حظر النوافذ المنبثقة عبر الـ Hidden Iframe).
  - **نافذة تأكيد الإيصال:** `frontend/src/features/delivery-reps/components/VanSalesReceiptModal.tsx`.
  - **شاشة مبيعات الفان:** `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`.
  - **اختبارات الوحدة:** `frontend/src/features/delivery-reps/utils/van-sales-receipt.spec.ts`.
* **المعايير التشغيلية والوظيفية المنفذة:**
  1. **العزل الطباعي التام لطابعات الـ 80 مم (Thermal Isolation):** القضاء الجذري على مشكلة تكسر الحروف رأسياً وطباعة خلفية المودال؛ حيث يتم توليد مستند حراري نقي مخصص لطابعات الإيصالات (POS80) بعرض ورق 80 مم (منطقة طباعة فعلية 74 مم) مع خط `Cairo` وهوامش صفرية لعدم إهدار الورق الحراري.
  2. **تفصيل كامل لبيانات الفاتورة الميدانية:** يشمل الإيصال اسم المؤسسة، رقم الفاتورة الموحد (`VAN-YYMMDD-XXXX`)، التاريخ والوقت، بيانات العميل وكوده وهاتفه، اسم المندوب ورقم لوحة السيارة، تفقيط الطرود (كراتين / قطع / بنود)، جدول الأصناف المباعة (الاسم، الكمية، السعر، والإجمالي لكل سطر)، الإجمالي العام بالعملة الرسمية، وطريقة السداد (نقدي / آجل).
  3. **توليد باركود الفاتورة القياسي (Code 128 SVG):** طباعة باركود SVG نقي في أسفل الإيصال لرقم الفاتورة لتسهيل مسحه وقراءته فورياً عبر الماسحات الضوئية في المحلات ولدى الحسابات.
  4. **مشاركة الإيصال عبر الواتساب (WhatsApp Receipt Sharing):** زر مباشر لمشاركة تفاصيل الفاتورة وتفقيط الطرود وبنودها المالية عبر محادثة واتساب العميل بنقرة واحدة.
  5. **حماية النوافذ المنبثقة (Popup Blocker Resilience):** في حال قام متصفح الجوال بحظر النوافذ المنبثقة (`window.open`)، يقوم المحرك تلقائياً بالتحويل لطباعة الـ Iframe المخفي بدون أي توقف أو رسائل خطأ للمندوب.

---


<!-- migrated:cap-208:end -->

<a id="cap-209"></a>
<!-- migrated:cap-209:start -->
### قدرة: نظام تخصيص وتوزيع خطوط السير والمناديب للمشرف (Supervisor Route & Rep Assignment System)
* **الحالة:** 🟢 مكتملة 100% معتمدة ومفعلة بالسيرفر والواجهة الميدانية.
* **المسارات:** `/inventory/van-sales` (لوحة المشرف - تبويب «خطوط السير والرقابة» - قسم «تخصيص خطوط السير والمناديب»).
* **الملفات المنفذة والداعمة:**
  - **محرك الباك إند والكنترولر:** `backend/src/modules/delivery-reps/van-sales.service.ts` (`getSupervisorCustomerRoutes`, `bulkAssignCustomerRoutes`, `setCustomerRouteSchedule`), `backend/src/modules/delivery-reps/van-sales.controller.ts` (`@Get('supervisor/customer-routes')`, `@Post('supervisor/customer-routes/bulk-assign')`, `@Post('customers/:id/route-schedule')`).
  - **طبقة الاتصال بالبيانات:** `frontend/src/features/delivery-reps/api/van-sales.api.ts` (`getSupervisorCustomerRoutes`, `bulkAssignCustomerRoutes`, `setCustomerRouteSchedule`, `SupervisorCustomerRouteItem`).
  - **واجهة المشرف:** `frontend/src/features/delivery-reps/components/VanRoutesKpiAdminTab.tsx`.
* **المعايير التشغيلية والوظيفية المنفذة:**
  1. **قاعدة بيانات المتاجر المركزية (Direct Customer Base Integration):** جلب كامل قاعدة بيانات متاجر التوزيع والعملاء مباشرة من جدول `customers` مع عزل المستأجر الصارم (`tenant_id`) واستخراج بيانات خط السير والمندوب من حقل `metadata` (يشمل `assigned_rep_id`, `assigned_rep_name`, `route`, `route_sequence`, `visit_days`, والرصيد الحالي).
  2. **شريط فلاتر المشرف الذكي (Supervisor Multi-Filter Strip):**
     - فلترة بالمندوب المسؤول (`CustomSelect`): عرض كافة المناديب، أو المتاجر غير المخصصة لمندوب (`unassigned`)، أو مندوب محدد.
     - فلترة بخط السير (`CustomSelect`): تجميع خطوط السير المتاحة ديناميكياً والتصفية بخط سير محدد.
     - البحث الفوري اللحظي بالاسم، الكود، رقم الهاتف، أو اسم خط السير.
  3. **التخصيص الفردي لخط ومندوب المتجر (Single Assignment Modal):** نافذة معيارية `StandardDialog` تدعم اختيار المندوب من قائمة `CustomSelect`، تحديد اسم خط السير، رقم ترتيب المحل في مسار السيارة، واختيار أيام الزيارة الأسبوعية المحددة بأزرار تفاعلية أنيقة.
  4. **شريط التخصيص الجماعي الذكي (Bulk Assignment Action Bar & Modal):**
     - إمكانية تحديد كافة المتاجر بنقرة واحدة («تحديد الكل») أو اختيار مجموعة متاجر محددة عبر الـ Checkbox.
     - ظهور شريط الإجراء الجماعي تلقائياً يعرض عدد المتاجر المختارة وزر التخصيص الجماعي.
     - نافذة التخصيص الجماعي تتيح للمشرف نقل أو إسناد المتاجر المختارة لمندوب جديد دفعة واحدة أو تفريغ المندوب، وتوحيد اسم خط السير، وتوحيد أيام الزيارة الأسبوعية بنقرة زر.
  5. **الربط العضوي الفوري بتطبيق المندوب الميداني (Driver Cockpit Automatic Sync):** بمجرد تخصيص المتاجر أو تحديث خطوط سيرها، تنعكس التعديلات فورياً في خط سير المندوب (`driver-itinerary`) وتطبيق التوزيع الميداني لتبدأ زيارتها وفق الخطة اليومية.

---


<!-- migrated:cap-209:end -->

<a id="cap-223"></a>
<!-- migrated:cap-223:start -->
## 189. منظومة تعبئة أذونات التحميل الميداني ووحدات التوزيع المتعددة (Van Sales Load Requisition Multi-Unit Packaging Standard)
* **الحالة / الإنجاز:** 🟢 مكتمل 100% ومتحقق ببناء نظيف (Clean Build) للباك إند والفرونت إند (30 سبتمبر 2026).
* **المسار:** `/driver` (شاشة طلب إذن التحميل للمندوب)، `/delivery-reps` (تبويب أذونات التحميل للمشرف وإسناد الصرف المباشر).
* **المرجعية المعمارية والتشغيلية:**
  - معالجة طبيعة شركات التوزيع والمندوبين الميدانيين (FMCG / Van Sales) حيث يتم طلب وتحميل البضائع بالكرتونة والقطع المنفردة والأصناف الوزنية (كجم/جرام) بدلاً من الاقتصار على القطع المفردة.
  - الحفاظ الصارم على ثابت الرصيد المخزني الأساسي (Base Unit Invariant): يتعامل المخزن وخصم الكميات بالوحدة الأساسية (إجمالي القطع المخزنية أو الكيلوجرامات) مع تمثيل تشغيلي وبصري فائق السلاسة (Packaging Breakdown: `X كرتونة + Y قطعة = Z قطعة إجمالية`).
* **التفاصيل التقنية المنفذة:**
  1. **الباك إند (`van-sales.service.ts`):**
     - ربط `getDriverAvailableProducts` و `listLoadRequisitions` بجدول وحدات التعبئة `product_units` لجلب مضاعف الكرتونة (`packagingUnit: { name, multiplier }`) وتمييز الأصناف الوزنية (`isWeight: true` لـ كجم/جرام).
     - الحساب التلقائي لتفاصيل التعبئة للأذونات السابقة والجديدة وتوليد النص الوصفي المعتمد (`packingText` مثل `5 كرتونة + 4 قطعة`).
  2. **واجهات وشاشات إذن التحميل الميداني (`DriverNewLoadRequisitionView.tsx`):**
     - ضغط الصفحة بالكامل لتصبح انسيابية ومدمجة، ودمج بيانات المندوب والمركبة في سطر مدمج واحد.
     - الالتزام الصارم بدستور أزرار العدادات والكميات في الواجهات العربية (Strict RTL Stepper Standard): الزائد `+` دائماً على اليمين برمجياً وبصرياً، والناقص `-` دائماً على اليسار: `[ + ] (الكمية) [ - ]`.
     - دعم عدادين متجاورين في صف واحد للأصناف ذات الكراتين: عداد الكراتين `[+] (كرتونة) [-]` وبجواره عداد القطع الفرط `[+] (قطع) [-]` مع حساب إجمالي القطع المخزنية لحظياً.
     - دعم الأصناف الوزنية بالكسور العشرية (مثل `12.5 كجم`) والأصناف العادية بالقطعة.
     - كروت الموبايل المضغوطة: عرض الرصيد والمطلوب وعدادات الكراتين والقطع وزر الحذف في صفوف متوازنة بدون أي سكرول عرضي.
  3. **لوحة تحكم ومراجعة المشرف ونماذج الطباعة (`VanLoadRequisitionsAdminTab.tsx`):**
     - دعم تعديل الكراتين والقطع في نافذة مراجعة واعتماد المشرف بعدادات RTL متناسقة.
     - قوالب الطباعة الرسمية: تضمين بيان التعبئة الفعلي (`packingText`) في الإيصال الحراري للمستودع (80mm) وفي النموذج الحكومي والرسمي بحجم A4 في عمود مستقل مع توقيعات أمين المستودع والمندوب ومشرف الحركة.
  4. **نظام حفظ المسودة التلقائي (Draft Persistence):** حفظ بنود وأصناف إذن التحميل محلياً فور إدخالها ومنع فقدان البيانات عند الخروج العرضي أو إعادة تحميل الصفحة.
* **الملفات المتصلة:**
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/DriverNewLoadRequisitionView.tsx`
  - `frontend/src/features/delivery-reps/components/VanLoadRequisitionsAdminTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanCollectionTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanItineraryTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanSaleCheckoutModal.tsx`

---


<!-- migrated:cap-223:end -->

<a id="cap-278"></a>
<!-- migrated:cap-278:start -->
## 234. الترقية المؤسسية المتكاملة لقطاع الفان وتوزيع الجملة (Wholesale & Van Distribution Enterprise Enhancements)
* **الحالة / الإنجاز:** مكتمل ومتحقق بنسبة 100% (أكتوبر 2026).
* **المسار:** مساحة عمل الفان وتوزيع الجملة `/van-sales` وبوابة المندوب `/driver` وإعدادات القطاعات `vertical-scope.ts`.
* **الهدف:** إغلاق الحلقة التشغيلية والمحاسبية والرقابية الكاملة بين الحجز المسبق (Pre-Sales) وأذونات التحميل وفواتير الجملة، وبناء محرك عمولات وحوافز المندوبين وصرفها بقيد مزدوج، وتفعيل الرقابة الجغرافية (Geofencing) بالمتر بين إحداثيات المندوب وإحداثيات العميل، وتتبع الصلاحية والتشغيلات (FEFO) لبضاعة السيارات، وتنقية إعدادات قطاع الجملة والفان.
* **المحرك والميزات المنفذة:**
  1. **إغلاق الحلقة بين أوامر الحجز المسبق المعتمدة وأذونات التحميل وفواتير الجملة (`VAN-7`):**
     - **تجميع الأوامر في إذن تحميل فان صباحي (`POST /api/van-sales/admin/pre-sales-orders/consolidate-to-requisition`):** اختيار عدة أوامر Pre-Sales معتمدة (`approved`) وتجميع أصنافها وكمياتها آلياً في إذن تحميل (`VL-YYMMDD-XXXX`) لمندوب التوزيع والمستودع المختار، مع فك الحجز المخزني المبدئي (`releaseLocationStock`) بالترتيب القانوني التصاعدي لـ `productId` لتفادي الازدواج عند صرف البضاعة لعهدة الفان، وتحويل حالة الأوامر المصدرية إلى `converted` (تم التحويل).
     - **التحويل المباشر بنقرة واحدة إلى فاتورة بيع جملة مرحلة (`POST /api/van-sales/admin/pre-sales-orders/:id/convert-to-invoice`):** تحويل أمر الحجز المعتمد مباشرة إلى فاتورة مبيعات جملة رسمية في `SalesWriteService.createSale` مع تمرير `SystemApprovedSaleTerms` للحفاظ على أسعار وخصومات المشرف المعتمدة، وإعادة الحجز تلقائياً (Compensating Re-reservation) في حال فشل الترحيل.
  2. **محرك عمولات وحوافز مناديب المبيعات والتحصيل وصرفها محاسبياً (`VAN-8`):**
     - محرك حسابي نقي `calculateRepCommissionMetrics` في `rep-target.engine.ts` يحسب عمولة المبيعات (`% من المبيعات الفعلية`)، وعمولة التحصيل النقدي (`% من التحصيل الفعلي`)، ومكافأة تحقيق التارجت الإضافية (`% إضافية عند تحقيق تارجت المبيعات بنسبة >= 100%`)، مع خصم المبالغ المنصرفة سابقاً وإظهار الرصيد المتبقي للصرف (`remainingPayableCommission`).
     - إمكانية ضبط نسب العمولات (افتراضياً على مستوى المنشأة أو مخصصة لكل مندوب في نافذة ضبط التارجت)، وزر **"صرف العمولة"** في تبويب `VanRepTargetsAdminTab.tsx` الذي يستدعي `POST /api/van-sales/admin/targets/settle-commission` لتوليد سند مصروف رسمي وحركة خزينة وقيد يومية محاسبي مزدوج متوازن (`AccountingPostingService.postExpense`).
  3. **التحقق الجغرافي الدقيق بالمتر ومطابقة النطاق الجغرافي للعميل (`Geofencing Verification - VAN-9`):**
     - محرك استخراج الإحداثيات الذكي `extractCoordinatesFromCustomerLocation` من حقول `gps_lat`/`gps_lng` أو من روابط خرائط جوجل (`@lat,lng` و `?q=lat,lng`) مع حفظ الإحداثيات تلقائياً في بطاقة العميل عند تحديث جدول خطوط السير.
     - حساب المسافة الدقيقة بالمتر عبر معادلة Haversine (`calculateHaversineDistanceMeters` و `evaluateGeofenceCompliance` بنطاق قياسي 300 متر) وعرض شارة المطابقة الجغرافية (`داخل النطاق (X م)` باللون الزمردي أو `خارج النطاق (X كم)` باللون الأحمر التحذيري) في جدول الزيارات الميدانية وبطاقة KPI الالتزام الجغرافي (`VanRoutesKpiAdminTab.tsx`) وفي نافذة تفاصيل رحلة الفان للفواتير والتحصيلات (`VanTripsTab.tsx`).
  4. **الوعي بتواريخ الصلاحية والتشغيلات لبضاعة الفان والمستودع (`FEFO Batch & Expiry Awareness - VAN-10`):**
     - دالة نقية `evaluateBatchExpiryStatus` تقيم أقرب تشغيلة فعالة (`pharmacy_batches` مرتبة تصاعدياً حسب `expiry_date` أو بيانات الصلاحية في `products.metadata`) وتصنفها إلى (`expired`, `near_expiry` خلال 60 يوماً، `valid`, `no_expiry`).
     - إظهار شارات التنبيه البصرية (`منتهي الصلاحية`، `FEFO قريب الانتهاء (X يوم)`، `صلاحية: YYYY-MM-DD`) للمندوب والمشرف في شاشة بيع الفان الميدانية (`VanSaleTab.tsx`) وفي شاشة طلب وأذونات التحميل الموحدة (`DriverNewLoadRequisitionView.tsx`) لتطبيق مبدأ الصرف للأقرب انتهاءً أولاً (FEFO).
  5. **تنقية إعدادات نمط الفان وتوزيع الجملة (`VAN-11`):**
     - تحديث `vertical-scope.ts` لإخفاء تبويبات التجارة الإلكترونية الاستهلاكية (`storefront` و `marketplaces`) افتراضياً في نمط `wholesale_van` ما لم يتم تفعيل المتجر الإلكتروني صراحةً (`settings?.storefrontModuleEnabled === true`).
* **الملفات المنفذة:**
  - `backend/src/modules/delivery-reps/rep-target.engine.ts`
  - `backend/test/critical/rep-target-engine.spec.ts`
  - `backend/src/modules/delivery-reps/services/van-pre-sales.service.ts`
  - `backend/src/modules/delivery-reps/services/van-targets.service.ts`
  - `backend/src/modules/delivery-reps/services/van-routes.service.ts`
  - `backend/src/modules/delivery-reps/services/van-requisitions.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/VanPreSalesAdminTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanRepTargetsAdminTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanRoutesKpiAdminTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanTripsTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanSaleTab.tsx`
  - `frontend/src/features/delivery-reps/components/DriverNewLoadRequisitionView.tsx`
  - `frontend/src/shared/verticals/vertical-scope.ts`

---


<!-- migrated:cap-278:end -->

<a id="cap-279"></a>
<!-- migrated:cap-279:start -->
## 235. رادار مكافحة الشبهات والتلاعب لمناديب التوزيع وعزل مديونيات العملاء المشتركين (Van Sales Fraud Radar & Multi-Rep Isolated Balances)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق ومختبر E2E بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة إدارة الفان والجملة `/van-sales/management` (تبويب "رادار الشبهات") وجرس إشعارات المالك العلوي وتطبيق بوابة المندوب الميداني.
* **الهدف:** توفير حصانة تامة ضد كافة أشكال السرقة والتلاعب وسد جميع الثغرات الميدانية التي قد يستغلها مندوب التوزيع، والتفوق التقني والرقابي الصارم على برامج التوزيع المتخصصة (مثل QuickSales و SalesNuzz)، مع تمكين خدمة العميل الواحد بواسطة أكثر من مندوب وعزل مديونية كل مندوب منعاً للخلط والسرقة.
* **المحرك والميزات المنفذة:**
  1. **رادار الشبهات وصمامات الأمان الـ 13 الحتمية لمنع السرقة والتلاعب:**
     - **صمام 1 - كسر السعر المعتمد (Price Manipulation):** حظر تعديل أو بيع أي صنف بأقل من السعر المعتمد بالنظام إلا برمز PIN معتمد للمشرف (`PRICE_DISCOUNT_REQUIRES_SUPERVISOR_PIN`).
     - **صمام 2 - البونص والعينات المجانية (Unauthorized Bonus):** حظر إعطاء أي صنف مجاني أو بسعر صفر إلا في وجود عرض ترويجي نشط أو اعتماد مشرف (`BONUS_REQUIRES_SUPERVISOR_PIN`).
     - **صمام 3 - فصل المهام والاعتماد الذاتي (Maker-Checker Self-Approval):** منع المندوب من إدخال رمزه الشخصي لاعتماد تجاوزاته التشغيلية بنفسه (`MAKER_CHECKER_SELF_APPROVAL`).
     - **صمام 4 - تخمين الرمز السري (Invalid PIN):** حظر أي محاولات إدخال رموز عشوائية أو غير صحيحة للمشرف وتوثيق محاولة التخمين فورياً (`INVALID_SUPERVISOR_PIN`).
     - **صمام 5 - الدفع الإلكتروني الوهمي (Fake Card Payment):** إلزام تسجيل رقم الإيصال البنكي / التفويض لمدفوعات الشبكة والبطاقات لمنع تسجيل مبيعات نقدية كمدفوعات إلكترونية وهمية بدون إيصال (`CARD_PAYMENT_REQUIRES_SUPERVISOR_PIN`).
     - **صمام 6 - البيع الآجل لعملاء الكاش (Cash-Only Credit):** حظر البيع الآجل لأي عميل مصنف نقدي (`credit_limit = 0`) بدون موافقة المشرف برمز PIN (`CASH_ONLY_CUSTOMER`).
     - **صمام 7 - الديون الوهمية لعملاء جدد (New Customer Credit Bypass):** حظر فتح حساب آجل لعميل ميداني جديد غير مسجل مسبقاً لمنع المندوب من تسجيل مبيعات وهمية بأسماء محلات وهمية (`NEW_CUSTOMER_CREDIT_REQUIRES_SUPERVISOR_PIN`).
     - **صمام 8 - المرتجع العيني لأصناف لم تُبَع (Unlinked Return Fraud):** فحص السجل البيعي التاريخي ورفض مرتجع أي صنف لم يشتره العميل من المندوب (`RETURN_QTY_EXCEEDS_SOLD`).
     - **صمام 9 - تضخيم سعر المرتجع (Inflated Return Price):** إلزام المرتجع بسعر لا يتجاوز صافي سعر البيع التاريخي للعميل (`RETURN_PRICE_EXCEEDS_NET`).
     - **صمام 10 - سقف رد النقدية الفوري (Cash Refund Cap):** حظر رد نقدية في المرتجع يتجاوز إجمالي النقدية المحصلة فعلياً في السيارة في تلك الرحلة (`INSUFFICIENT_REP_CASH_FOR_REFUND`).
     - **صمام 11 - حوكمة مصاريف الطريق (Road Expenses Abuse):** حظر المصاريف الفردية أو التراكمية التي تتجاوز سقف الحوكمة (مثل 150 ج.م للبنزين) بدون اعتماد المشرف (`EXPENSE_REQUIRES_SUPERVISOR_PIN`).
     - **صمام 12 - تدوير العداد للخلف (Odometer Rollback):** رفض أي قراءة لعداد الكيلومترات النهائي تقل عن قراءة بداية الرحلة (`INVALID_ODOMETER`).
     - **صمام 13 - الزيارات الوهمية الجغرافية (Ghost Visits / Geofence Violation):** فحص إحداثيات GPS وحساب البعد عن العميل، ورصد أي زيارة تتجاوز الحد المسموح (300 متر) كشبهة تلاعب جغرافية.
  2. **العزل التام لمديونيات المناديب على العميل المشترك (Multi-Rep Isolated Customer Debt Balances):**
     - عند اشتراك أكثر من مندوب في خدمة نفس العميل، يحسب النظام تلقائياً رصيد مديونية مستقل لكل مندوب على حدة (`isolated.repBalance`)، مع عرض شفاف لمديونية زملائه وإجمالي رصيد الشركة.
     - **حظر التحصيل المتقاطع:** يُمنع منعاً باتاً لأي مندوب تحصيل مليم واحد من مديونية تخص مندوباً آخر (`REP_ISOLATED_BALANCE_EXCEEDED`).
     - **رؤية المشرف الموحدة:** يرى المشرف في الداشبورد تفصيلاً دقيقاً لكل مندوب ورصيده لدى العميل مع إجمالي الشركة.
  3. **حظر إبراء الذمة الذاتي للرحلات (Maker-Checker Trip Settlement):**
     - المندوب يسلم فقط إقرار رحلته (`submitTripSettlement`).
     - التصفية النهائية والاعتماد المالي والمخزني وإبراء الذمة (`settleTrip`) محظورة على المندوب وتتم حصراً بواسطة المشرف أو الإدارة.
  4. **لوحة متابعة رادار الشبهات وإشعارات المالك الفورية:**
     - تبويب مخصص `رادار الشبهات` في شاشة إدارة الفان والجملة (`VanFraudRadarAdminTab.tsx`) يعرض مؤشرات الخطر وسجل العمليات وتصنيف المناديب عالي الخطورة.
     - إرسال إشعار فوري لجرس المالك/المشرف في شريط النظام العلوي (`ManagerNotificationsBell`) يوجه بنقرة واحدة إلى `/van-sales/management?tab=radar`.
     - إرسال تنبيه WhatsApp فوري للمالك عبر `WhatsAppGatewayService` في الشبهات الحرجة.
  5. **الاختبار والتحقق الشامل المؤتمت E2E:**
     - اختبار ومحاكاة كافة سيناريوهات المندوب الحرامي والتخريب والتحصيل المشترك بنسبة نجاح 100% عبر:
       `backend/test/e2e/van-sales-rogue-rep-and-multi-rep.e2e.ts`.
* **الملفات المنفذة:**
  - `backend/src/core/audit/audit.service.ts`
  - `backend/src/modules/delivery-reps/services/van-fraud-radar.service.ts`
  - `backend/src/modules/delivery-reps/services/van-returns.service.ts`
  - `backend/src/modules/delivery-reps/services/van-transfers.service.ts`
  - `backend/src/modules/delivery-reps/services/van-routes.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `backend/src/modules/accounting/accounting-posting.service.ts`
  - `backend/src/modules/manager-actions/manager-actions.service.ts`
  - `backend/src/modules/manager-actions/helpers/manager-actions.helper.ts`
  - `frontend/src/features/dashboard/components/ManagerNotificationsBell.tsx`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/VanFraudRadarAdminTab.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`
  - `backend/test/e2e/van-sales-rogue-rep-and-multi-rep.e2e.ts`

---


<!-- migrated:cap-279:end -->

<a id="cap-280"></a>
<!-- migrated:cap-280:start -->
## 236. محرك العروض الترويجية الشرائحية المركبة والتحسين الرياضي لمسارات السير (FMCG Tiered Promotions & TSP Route Optimization)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق ومختبر حسابياً وتشغيلياً بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة إدارة الفان والجملة `/van-sales/management` (تبويب "العروض والخلطات" + زر "أقصر مسار خط سير" في تبويب مسارات التوزيع) وبوابة المندوب الميداني `/driver` (سلة البيع مع تطبيق العروض الفوري وتنبيهات البيع الإضافي Upsell + تبويب خط سير اليوم مع تحسين الترتيب الرياضي بالـ GPS).
* **الهدف:** تزويد منظومة الفان وتوزيع الجملة بأقوى أدوات الشركات العالمية للأغذية والاستهلاك السريع (FMCG):
  1. محرك عروض شرائحية وترويجية مرنة (Mix & Match و Buy X Get Y وشرائح الكمية والحد الأدنى للفاتورة) لزيادة متوسط حجم الفاتورة وسرعة دوران المخزون، مع محفزات ذكية تنبه المندوب لحظياً لتحفيز العميل على الشراء الإضافي.
  2. محرك رياضي لحل معضلة البائع المتجول (TSP) لخطوط سير المناديب لترتيب محطات الزيارات بأقصر مسافة وأقل زمن استهلاكاً للوقود.
* **المحرك والميزات المنفذة:**
  1. **محرك العروض والخصومات الشرائحية المركبة (FMCG Promotions Engine):**
     - **المحرك النقي:** `backend/src/modules/delivery-reps/fmcg-promotions.engine.ts` يقيم سلة المبيعات بسرعة فائقة (0ms) وبدون DB I/O مباشر، مما يتيح استدعاءه الفوري عند كل تغيير كمية في سلة المندوب.
     - **أنماط العروض المدعومة:**
       - **شرائح الكمية المتصاعدة (`tiered_qty`):** تحديد شرائح متعددة للصنف الواحد (مثال: من 10 إلى 24 كرتونة بخصم 5%، من 25 إلى 49 كرتونة بخصم 10% وبونص 2 كرتونة، 50 كرتونة فما فوق بخصم 15% وبونص 5 كرتونة مجانية).
       - **الخلطات المركبة (`mix_and_match`):** اشتراط شراء باقة أصناف محددة بكميات دنيا (مثال: 3 صنف A + 2 صنف B) للحصول على مكافأة (خصم مالي أو بونص عيني مجاني).
       - **شريحة القيمة الإجمالية للفاتورة (`invoice_threshold`):** مكافأة المشتريات ذات القيمة المرتفعة بخصم فوري أو هدايا عينية فور تجاوز صافي الفاتورة حداً محدداً.
     - **فصل أصناف البونص العيني:** تمييز بنود الهدايا بـ `isBonus: true` واستبعادها التلقائي من شروط التأهيل لتفادي الحلقات اللانهائية.
     - **محفزات البيع الإضافي الذكية (Upsell Nudges):** عند وصول سلة العميل إلى ما بين 40% و 70% من شريحة العرض التالية، يولد المحرك نصيحة استباقية بالكمية الناقصة وقيمة الوفر أو الهدية المتوقعة، مع زر نقرة واحدة للمندوب لإضافة الصنف فورياً للسلة.
     - **حوكمة العروض والميزانيات:** تقييد العروض بنوع العميل (`retail`, `wholesale`, `half_wholesale`, `key_account`) وقناة البيع وفترة السريان، وسقف مرات الاستخدام الأقصى (`max_usage_limit`).
     - **لوحة إدارة العروض للمشرف:** تبويب متكامل `العروض والخلطات` في `/van-sales/management` (`VanPromotionsAdminTab.tsx`) يشمل بطاقات KPI، وجدول العروض، ونافذة بناء شروط العرض ومكافآته وشرائحه، والتعطيل والتفعيل الفوري.
  2. **محرك التحسين الرياضي لمسارات السير (TSP Dynamic Route Optimization):**
     - **المحرك الرياضي النقي:** `backend/src/modules/delivery-reps/route-optimization.engine.ts` يحل معضلة البائع المتجول (TSP) لخط سير المندوب.
     - **خوارزمية الجار الأقرب + 2-Opt:** توليد مسار مبدئي باستخدام Greedy Nearest Neighbor بدءاً من موقع المندوب الحالي بالـ GPS أو المستودع، متبوعاً بخوارزمية التحسين المحلي للتقاطعات (2-Opt Local Search Heuristic) بحد أقصى 50 تكرار لفك تشابك الخطوط وتقليل المسافات البينية بالاعتماد على مسافة هافرسين الجيوديسية (Haversine Formula).
     - **الحفاظ التام على العملاء غير المحددين جغرافياً:** العملاء الذين لا تتوفر لهم إحداثيات GPS يُحفظون في ذيل المسار بعلامة واضحة `isUnmappedGps: true` لمنع سقوطهم من الزيارة الميدانية.
     - **حساب التوفير التشغيلي والزمن:** حساب مسافة المسار الحالي والمحسن بدقة، وإظهار وفر الكيلومترات ونسبة التوفير المئوية (`distanceSavedKm`, `savingsPercentage`) والزمن التقديري للتنقل.
     - **التحسين الميداني بنقرة واحدة:** زر "أقصر مسار (TSP)" في تبويب خط سير المندوب (`VanItineraryTab.tsx`) يستدعي الموقع الجغرافي للمندوب عبر المتصفح/الهاتف، ويعرض نافذة مقارنة المسارين وخريطة المحطات، مع إمكانية اعتماد الترتيب الجديد وحفظه فورياً في قاعدة البيانات بجدول `van_customer_routes.stop_sequence`.
     - **دعم المشرف:** إمكانية تحسين مسار أي خط سير في تبويب مسارات التوزيع من لوحة الإدارة (`VanRoutesKpiAdminTab.tsx`).
  3. **قاعدة البيانات والهجرة:**
     - جدول `fmcg_promotions` وهجرة `2040000000221_fmcg_promotions_and_route_optimization.ts` مع فهارس الأداء على `(tenant_id, is_active, start_date, end_date)`.
  4. **الاختبار والتحقق الحسابي الشامل:**
     - تغطية المحركين الرياضيين بنسبة 100% عبر:
       `backend/test/critical/van-fmcg-promotions-and-route-opt.spec.ts`.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000221_fmcg_promotions_and_route_optimization.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/delivery-reps/fmcg-promotions.engine.ts`
  - `backend/src/modules/delivery-reps/route-optimization.engine.ts`
  - `backend/src/modules/delivery-reps/services/van-promotions.service.ts`
  - `backend/src/modules/delivery-reps/services/van-routes.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `backend/src/modules/delivery-reps/delivery-reps.module.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/VanPromotionsAdminTab.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`
  - `frontend/src/features/delivery-reps/components/VanItineraryTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanRoutesKpiAdminTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanSaleTab.tsx`
  - `backend/test/critical/van-fmcg-promotions-and-route-opt.spec.ts`

---


<!-- migrated:cap-280:end -->

<a id="cap-281"></a>
<!-- migrated:cap-281:start -->
## 237. جناح التنفيذ الميداني لمبيعات الفان والتسويق التجاري والطباعة الحرارية وتتبع الزيارات ومعدل الضرب (FMCG Van Sales Execution, Trade Marketing, Direct Bluetooth ESC/POS & Live Fleet Supervisor)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق ومختبر حسابياً وتشغيلياً بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة إدارة الفان والجملة `/van-sales/management` (تبويب "التتبع والميدان" الجديد مع مؤشرات Strike-Rate وخريطة مسار الخبز Breadcrumbs وسجل الزيارات والتفتيش) وبوابة المندوب الميداني `/driver` (تبويب خط السير مع أزرار بدء الزيارة بالـ GPS، جرد الرفوف الاختياري، تفتيش الأصول والمنافسين، وإصدار الفواتير مع زر طباعة حرارية لاسلكية بلوتوث ESC/POS مباشرة 58mm/80mm).
* **الهدف:** استكمال تفوق المنظومة على منصات FMCG الرائدة (SalesBuzz و QuickSales) بسد كافة الفجوات الميدانية عبر خمس ركائز تشغيلية محكمة:
  1. حوكمة الزيارة الميدانية خطوة بخطوة (Structured Store Visit Workflow): تسجيل الحضور الجغرافي بالـ GPS مع التحقق من سياج 300 متر (Geofencing)، وإتاحة جرد الرفوف كخطوة اختيارية غير إجبارية منعاً لتعطيل المندوب، وإلزامية تسجيل أسباب عدم البيع المعيارية، وحساب زمن المكوث الدقيق ومعدل الضرب (Strike-Rate).
  2. التسويق التجاري ورقابة الأصول وثلاجات الشركة وأسعار المنافسين (Trade Marketing, Cooler Inspection & Competitor Price Survey).
  3. الطباعة الحرارية المحمولة المباشرة عبر البلوتوث (Direct Bluetooth ESC/POS Printing): طباعة الإيصالات والفواتير الميدانية من متصفح الهاتف مباشرة على طابعات الحزام (58mm/80mm) وطابعات Sunmi/iMin بدون برامج وسيطة.
  4. محرك المزامنة غير المتصلة (Offline-First Driver Van Sales Sync): طابور محلي في المتصفح (IndexedDB) يتيح البيع والجرد وتسجيل الزيارات بدون إنترنت مع مزامنة ذرية عند عودة الاتصال.
  5. تتبع الأسطول الميداني اللحظي ومعدل الضرب للمشرفين (Supervisor Live Breadcrumbs & Strike-Rate Analytics): لوحة تحكم تفاعلية للمشرفين توفر مؤشرات معدل النجاح/الضرب، وسجل زيارات المتاجر، والتفتيش التسويقي، ومسار تحركات المندوب اللحظي.
* **المحرك والميزات المنفذة:**
  1. **محرك حوكمة الزيارة ومعدل الضرب الجيوديسي النقي (FMCG Visit Execution Engine):**
     - **المحرك النقي:** `backend/src/modules/delivery-reps/fmcg-visit-execution.engine.ts` يحسب المسافات بصيغة هافرسين الجيوديسية، ويفحص سياج الـ 300 متر، ويحسب زمن المكوث بالدقائق، ويحلل أسباب عدم البيع ومعدل الضرب (Strike Rate) بشكل نقي 100% بدون أي اعتماديات خارجية.
     - **السياج الجغرافي ورادار الشبهات:** عند بعد المندوب أكثر من 300 متر عن العميل، يتم توثيق اختراق السياج (`is_geofence_breached: true`) وإرسال بلاغ فوري لرادار الشبهات (`VAN_SUSPICION_GEOFENCE_VIOLATION`) دون قطع عمل المندوب الميداني.
     - **جرد الرفوف الاختياري السريع:** زر "جرد الرف (اختياري)" في شريط الإجراءات السريعة يفتح نافذة تفاعلية (`VanStoreInventoryModal.tsx`) تلتزم بدستور RTL (+ يميناً و - يساراً) وبحث فوري في الكتالوج، مع إمكانية التخطي المباشر إلى البيع.
     - **حوكمة إنهاء الزيارة وأسباب عدم البيع:** لا يُسمح بإغلاق الزيارة بدون بيع إلا باختيار سبب رسمي موثق (`stock_sufficient`, `shop_closed`, `decision_maker_absent`, `no_cash`, `credit_limit_exceeded`, `competitor_promotions`, `price_objection`, `damaged_goods_issue`, `other`).
  2. **مسح التسويق التجاري وثلاجات الشركة وأسعار المنافسين:**
     - نافذة فحص ميدانية متكاملة (`VanTradeSurveyModal.tsx`) تشمل فحص سلامة أصول وثلاجات الشركة ونظافتها ودرجة برودتها، والتأكد من خلوها من منتجات المنافسين (`is_pure_company_cooler`)، بالإضافة لجدول ديناميكي لرصد أسعار المنافسين في السوق والتقاط الصور الفوتوغرافية التوثيقية.
  3. **محرك الطباعة الحرارية البلوتوث المباشرة ESC/POS:**
     - أداة `escpos-printer.util.ts` لتوليد أوامر ESC/POS الخام المتوافقة مع طابعات الحزام 58 مم و 80 مم وأجهزة كاشير أندرويد الذكية.
     - اتصال مباشر بالبلوتوث عبر Web Bluetooth API (`navigator.bluetooth`) مع تقسيم البيانات إلى حزم 512 بايت (Chunking & Flow Control) لمنع اختناق الطابعات المحمولة.
     - زر مخصص "بلوتوث ESC/POS (58mm)" في نافذة إيصال البيع (`VanSalesReceiptModal.tsx`) يطبع الإيصال فورياً بضغطة زر واحدة شاملاً باركود الفاتورة وتفقيط الطرود وطرق الدفع.
  4. **محرك المزامنة غير المتصلة (Offline-First Sync):**
     - مكتبة `van-offline-sync.util.ts` المعتمدة على IndexedDB لتخزين طابور المبيعات والتحصيلات والزيارات محلياً ومزامنتها الذرية مع خادم الأوراكل السحابي فور استقرار الاتصال.
  5. **لوحة تتبع المشرف والميدان (Supervisor Visits & Strike-Rate Admin Tab):**
     - تبويب "التتبع والميدان" (`VanVisitsTrackingAdminTab.tsx`) في لوحة إدارة الفان `/van-sales/management` يعرض:
       - بطاقات KPI: معدل الضرب (Strike-Rate %)، إجمالي الزيارات، الزيارات الإيجابية الناجحة، الزيارات المخترقة للسياج، والزيارات السلبية.
       - جدول زيارات المتاجر مع إظهار أوقات الدخول والخروج وزمن المكوث بالدقائق وشارات التحقق الجغرافي.
       - جدول مسح الثلاجات والتسويق التجاري وفحص درجات الحرارة ونقاء الثلاجة وأسعار المنافسين.
       - عارض مسار الخبز والتحركات اللحظية (Live Breadcrumbs Trail Visualizer) للمناديب.
  6. **قاعدة البيانات والهجرة:**
     - هجرة `2040000000222_fmcg_field_execution_suite.ts` أضافت 3 جداول متخصصة مع فهارس أداء مركبة:
       - `van_store_visits`: توثيق الحضور والانصراف، الإحداثيات، السياج، زمن المكوث، أسباب عدم البيع، وجرد الرفوف.
       - `van_trade_marketing_surveys`: فحص الثلاجات والأصول، النظافة، الحرارة، حصرية العرض، وأسعار المنافسين.
       - `van_rep_live_breadcrumbs`: تتبع مسار المندوب اللحظي (خط العرض، خط الطول، السرعة كم/س، ومستوى البطارية).
  7. **الاختبار والتحقق الحسابي:**
     - اختبارات نقية شاملة لجميع صيغ هافرسين، السياج، زمن المكوث، ومعدل الضرب بنسبة 100% عبر:
       `backend/test/critical/van-fmcg-visit-execution.spec.ts` (5/5 اختبارات ناجحة).
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000222_fmcg_field_execution_suite.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/delivery-reps/fmcg-visit-execution.engine.ts`
  - `backend/src/modules/delivery-reps/services/van-field-execution.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `backend/src/modules/delivery-reps/delivery-reps.module.ts`
  - `frontend/src/features/delivery-reps/utils/escpos-printer.util.ts`
  - `frontend/src/features/delivery-reps/utils/van-offline-sync.util.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/VanSalesReceiptModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanStoreInventoryModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanTradeSurveyModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanItineraryTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanVisitsTrackingAdminTab.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`
  - `backend/test/critical/van-fmcg-visit-execution.spec.ts`

---


<!-- migrated:cap-281:end -->

<a id="cap-282"></a>
<!-- migrated:cap-282:start -->
## 238. جناح السوق المصري المتخصص لشركات التوزيع وسيارات الفان FMCG (Egyptian FMCG Van Sales Suite: InstaPay Segregation, Digital Signature on Glass, Live Target Booster & Field Damaged Goods Swap)
* **الحالة / الإنجاز:** 🟢 مكتمل ومتحقق ومختبر حسابياً وتشغيلياً بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة المندوب الميداني `/driver` (تبويب خط السير مع بلاطة "استبدال تالف / كسر"، عداد التارجت والعمولة الحية في الهيدر، خيارات الدفع عبر إنستاباي والمحافظ الإلكترونية، ولوحة التوقيع الحي بالأصبع وهوية المستلم عند اعتماد الفاتورة) وشاشة تصفية اليومية `/van-sales/management` و `/driver` (عزل تحويلات إنستاباي عن كاش المندوب).
* **الهدف:** تلبية المتطلبات الحرجة والحتمية لشركات توزيع الأغذية والمشروبات والسلع الاستهلاكية سريعة الدوران (FMCG) في السوق المصري، والتي تتفوق بها المنظومة تفوقاً تاماً ومحكماً:
  1. **المدفوعات الإلكترونية عبر إنستاباي والمحافظ والمحافظة على النقدية الورقية (InstaPay & Mobile Wallets Segregation):**
     - عزل مالي تام لمبيعات وتحصيلات إنستاباي وفودافون كاش عن النقدية الورقية المحصلة في يد المندوب (`cash_collected` / `expectedCashToRemit`).
     - تسجيل رقم المرجع البنكي للتحويل (`transfer_reference`) وصورة إيصال التحويل (`transfer_receipt_url`).
     - تصفية العهدة اليومية تطالب المندوب حصرياً بالنقدية الورقية الفعلية في يده، مع إظهار بطاقة منفصلة للتحويلات البنكية المحققة عبر إنستاباي لتسويتها مركزياً مع حساب الشركة البنكي.
  2. **التوقيع الرقمي الحي وهوية المستلم (Digital Signature on Glass & Recipient Identity):**
     - لوحة توقيع إلكتروني تفاعلية (`VanSignaturePadModal.tsx`) تتيح توقيع مستلم البضاعة بإصبعه على شاشة الهاتف، وتخزين التوقيع كصورة متجهة مشفرة مرتبطة بالفاتورة.
     - تسجيل الاسم الثلاثي للمستلم، ورقم هاتفه، وصفته في المحل (صاحب المحل، شريك، مدير، كاشير، عامل مستلم).
     - توفير الحماية القانونية الكاملة للشركة من إنكار استلام البضاعة أو التهرب من سداد المبيعات الآجلة.
  3. **عداد التارجت والعمولة الحية في يد المندوب (Live Target & Commission Booster Widget):**
     - شريط تقدم ذكي وتفاعلي (`VanLiveTargetBoosterWidget.tsx`) يظهر للمندوب في أعلى شاشته نسبة تحقيق التارجت الشهري، والمبلغ المتبقي، ومعدل المبيعات اليومي المطلوب لإدراك الهدف.
     - احتساب فوري للعمولة النقدية المكتسبة حتى اللحظة ومكافأة تخطي التارجت بالجنيه المصري اعتماداً على محرك الشرائح النقي `rep-target.engine.ts` لتحفيز المندوب لزيادة قيمة مبيعاته عند كل محطة.
  4. **استبدال التالف والكسر والمعيب الفوري في الشارع (Instant Damaged Goods Field Swap):**
     - بلاطة سريعة في مركز إجراءات العميل ومودال تشغيلي متكامل (`VanDamagedSwapModal.tsx`) مع عدادات RTL قياسية (+ يميناً و - يساراً) لتبديل البضاعة التالفة أو المكسورة أو منتهية الصلاحية بمنتجات سليمة من الفان فورياً.
     - ترتيب الأقفال القانوني (Canonical Lock Order) بترتيب معرّفات الأصناف تصاعدياً وحجزها بهذا الترتيب لمنع حدوث تعليق أو أقفال ميتة (SQL Deadlocks).
     - محرك حساب الفارق المالي النقي (`evaluateDamagedSwap`): احتساب فارق القيمة بين التالف والبديل وتقييده آلياً على كشف حساب العميل (مديونية أو دائنية).
     - حركة مخزنية مزدوجة: خصم البديل من بضاعة السيارة الجاهزة للبيع (`van_swap_out`) وإضافة التالف كحركة تالفة (`van_swap_damaged_in`) مع توثيق سبب التلف بدقة في جدول `van_damaged_swaps`.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000223_egypt_fmcg_instapay_signature_swap.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/delivery-reps/van-trip-reconciliation.engine.ts`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/VanSignaturePadModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanDamagedSwapModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanLiveTargetBoosterWidget.tsx`
  - `frontend/src/features/delivery-reps/components/VanSaleCheckoutModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanItineraryTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanSettleTab.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`
  - `backend/test/critical/van-egypt-market-fmcg.spec.ts`


<!-- migrated:cap-282:end -->

<a id="cap-283"></a>
<!-- migrated:cap-283:start -->
## 239. حوكمة خطوط السير متعددة المناديب، صلاحيات المناديب الميدانية، وتخصيص إلزامية رمز المشرف (PIN) لتصفية الورديات من الإعدادات
* **الحالة / الجاهزية:** تم الإنجاز والتطبيق الشامل بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة تعديل العميل المحدثة (`CustomerEditorCard.tsx`)، ومودال إدارة المندوب وصلاحياته الميدانية (`UpsertDeliveryRepModal.tsx`)، وشاشة الإعدادات العامة للمبيعات والمخزون (`SalesInventorySettingsTab.tsx`)، ومركز إدارة الفان (`VanSalesAdminManagementPage.tsx`)، وتطبيق المندوب الميداني (`VanSalesMobilePage.tsx` / `VanSettleTab.tsx`).
* **الوصف والمزايا المنجزة:**
  1. **جدولة خطوط السير متعددة المناديب للعميل الواحد (Multi-Rep Route Scheduling Engine):**
     - تمكين إسناد أكثر من مندوب لنفس العميل في أيام مختلفة (مثلاً: مندوب أ يزور المحل الأحد والخميس، ومندوب ب يزوره الإثنين) وتخزينها بهيكل معياري في `metadata.rep_schedules`.
     - فلترة خط سير المندوب اليومي (`getDriverTodayItinerary`) بدقة طبقاً لليوم الفعلي وزيارة كل مندوب، ومنع ظهور عملاء الأيام الأخرى.
  2. **حوكمة وصلاحيات المناديب الميدانية (Field Delivery Rep Governance & Permissions):**
     - هجرة قاعدة البيانات `2040000000224_delivery_rep_permissions_and_metadata.ts` لإضافة حقلين معياريين `permissions JSONB` و `metadata JSONB` لجدول `delivery_representatives`.
     - 6 صلاحيات ميدانية دقيقة في مودال إنشاء وتعديل المندوب: تعديل خط السير، إضافة عملاء جدد، إلزامية الحضور بموقع GPS، تحصيل النقدية، البيع فوق سقف الائتمان، ومنح خصومات مع تحديد الحد الأقصى لنسبة الخصم.
  3. **التحكم المرن في إلزامية رمز المشرف (Supervisor PIN) للتصفية من الإعدادات:**
     - إضافة مفتاح إعداد نظامي `vanSettlementRequireSupervisorPin`:
       - عند التفعيل (`true`): يلزم إدخال الرمز السري للمشرف أو أمين الخزينة على هاتف المندوب لإبراء ذمته وتصفية الوردية واستلام الكاش طبقاً لقواعد فصل المهام (Maker-Checker).
       - عند التعطيل (`false`): يختفي حقل الـ PIN من تطبيق المندوب ويقفل المندوب ورديته مباشرة، وتتم مراجعة واستلام النقدية واعتمادها من شاشة المشرف في لوحة الإدارة.
     - تكامل الإعداد في مكانين رئيسيين: شاشة الإعدادات العامة (`SalesInventorySettingsTab.tsx`) ومودال سريع من هيدر مركز إدارة الفان (`VanSalesAdminManagementPage.tsx`).
  4. **نظام التوريد والجرد العمياني لكاش المناديب (Blind Cash Settlement):**
     - إضافة مفتاح إعداد نظامي `vanSettlementBlindMode` (معطل افتراضياً):
       - **النمط الشفاف (Transparent - الافتراضي):** يرى المندوب أرقام مبيعاته وتحصيلاته وصافي النقدية المتوقع تسليمها وزر "مطابقة المتوقع" لتسريع وتسهيل إغلاق اليومية الميدانية.
       - **النمط العمياني (Blind Cash Settlement):** يتم رقابياً حجب صافي النقدية المتوقعة، إخفاء زر "مطابقة المتوقع"، حجب مبالغ الكاش في كروت التصفية، وإلزام المندوب بعدّ وفرز النقدية الفعلية بيده وإدخالها، وتُحتسب فروقات العجز والزيادة آلياً في الخزينة دون كشفها للمندوب لمنع التستر على العجز أو الاستيلاء على الفائض النقدي (Anti-Skimming).
     - تكامل التفعيل والتعطيل بسلاسة من شاشة الإعدادات ومودال حوكمة الفان الإداري.
  5. **هندسة التصفية الميدانية فائقة التكيف (Ultra-Compact Mobile Layout & Adaptive Typography):**
     - وضع أزرار الإجراءات السريعة (تسجيل مصروف رحلة / حركة فوارغ) جنباً إلى جنب (50% / 50%) على سطر واحد مستحيل الالتفاف الرأسي عبر Flexbox.
     - ضبط سطر "الكاش الفعلي للتوريد" في سطر واحد ثابت مع زر المطابقة أو شارة الجرد العمياني الإلزامي، باستخدام دالة `clamp()` التكيفية لمنع تكسير رمز العملة `(ج.م)` على أي مقاس شاشة موبايل.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000224_delivery_rep_permissions_and_metadata.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/delivery-reps/services/van-routes.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `backend/src/modules/delivery-reps/dto/upsert-delivery-rep.dto.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/VanSettleTab.tsx`
  - `frontend/src/features/delivery-reps/components/VanCustomerStatementModal.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`
  - `frontend/src/features/settings/schemas/settings.schema.ts`
  - `frontend/src/features/settings/components/forms/tabs/SalesInventorySettingsTab.tsx`
  - `frontend/src/types/domain-models/settings.ts`
  - `frontend/src/features/customers/components/CustomerEditorCard.tsx`
  - `frontend/src/shared/components/delivery-reps/UpsertDeliveryRepModal.tsx`


<!-- migrated:cap-283:end -->

<a id="cap-284"></a>
<!-- migrated:cap-284:start -->
## 240. المركز المالي وكشف حساب المناديب والربط الآلي مع مسير الرواتب (Rep Financial Ledger, Variance Settlement Hub & HR Payroll Bridge)
* **الحالة / الجاهزية:** تم الإنجاز والاعتماد بنسبة 100% (أكتوبر 2026).
* **المسار:** مركز إدارة سيارات التوزيع وأسطول الفان (`/inventory/van-sales`) ➔ تبويب "تسويات وحسابات المناديب" (`VanFinancialLedgerAdminTab.tsx`).
* **الدافع والمشكلة المحلولة:**
  - القضاء التام على البحث اليدوي والجمع بالآلات الحاسبة عن عجوزات أو مكافآت كل رحلة على حدة من جدول الرحلات العام.
  - توفير كشف حساب مالي مركزي وموحد يجمع كل ما يتعلق بذمة المندوب المالية (عجز كاش، عجز جرد مخزني، مكافآت تارجت، عمولات مبيعات، وسدادات نقدية).
  - الربط الآلي المحكم مع موديول الرواتب (HR Payroll) لترحيل العجوزات غير المسددة كاستقطاعات رسمية في مسير الشهر بضغطة زر واحدة.
* **المزايا والوظائف المنجزة:**
  1. **شريط مؤشرات الأداء المالي المركزي (Enterprise 5-KPI Strip):**
     - بطاقة إجمالي العجوزات المعلقة (مطالب بها المناديب ولم تسدد).
     - بطاقة المبالغ المسددة نقداً بالخزينة بموجب سندات قبض رسمية.
     - بطاقة العجوزات المرحلة لمسير الرواتب ومثبتة كاستقطاعات معتمدة.
     - بطاقة إجمالي العمولات ومكافآت التارجت المستحقة للمناديب.
     - بطاقة صافي رصيد الذمة المعلقة (Net Rep Balance).
  2. **فلترة وتحليل شامل لكل مندوب (Per-Rep Ledger & Summary Breakdown):**
     - إمكانية استعراض الموقف المالي العام لكافة المناديب في بطاقات ملخصة، أو تصفية كشف حساب تفصيلي لمندوب محدد.
     - فلترة بالحالة (المعلقة فقط / المسددة بالخزينة / المرحلة للرواتب / المعفاة إدارياً) وبالفترة الزمنية (من - إلى) وبحث نصي فوري.
  3. **جدول الحركات المالي التفصيلي (Detailed Financial Ledger):**
     - تاريخ ووقت الحركة، اسم المندوب وربطه بالموظف في HR، رقم الرحلة والمركبة، نوع الحركة بكبسولات ملونة، المبلغ، البيان والمبرر، حالة التسوية ورقم سند القبض أو شهر المسير.
  4. **إجراءات التسوية الذكية المباشرة (Smart 1-Click Settlement Actions):**
     - **سداد نقدي بالخزينة (Cash Handover):** نافذة منبثقة تثبت استلام المبلغ نقداً في الخزينة وتولد رقم سند قبض رسمي وفق دستور الترقيم الموحد (`REC-YYMMDD-XXXX`) وتصفر العجز فوراً.
     - **إعفاء وتسوية إدارية (Waiver):** إعفاء المندوب بنسبة العجز المقبولة أو بمبرر تشغيلي معتمد وتسجيل الملاحظات وهوية المشرف المعتمد.
     - **قيد مكافأة / بونص تارجت للمندوب:** إضافة مكافأة تميز أو عمولة بيع لحساب المندوب وتظهر في كشف حسابه.
  5. **الكوبري الآلي مع الرواتب والأجور (Automated HR-Payroll Bridge):**
     - تمكين التحديد الفردي أو الجماعي (Bulk Selection) للعجوزات المعلقة وترحيلها لمسير رواتب شهر محدد (مثال: `2026-10`).
     - مطابقة المندوب مع جدول الموظفين `hr_employees` وتحديث حالة البنود إلى `pushed_to_payroll` وتثبيتها للاستقطاع الرسمي من الراتب.
* **الملفات المنفذة:**
  - `backend/src/database/migrations/2040000000225_van_rep_financial_ledger_and_settlements.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/components/VanFinancialLedgerAdminTab.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesAdminManagementPage.tsx`


<!-- migrated:cap-284:end -->

<a id="cap-285"></a>
<!-- migrated:cap-285:start -->
## 241. درع الحماية اللحظي ومنع تكرار الفواتير والتحصيلات في مبيعات الفان الميدانية (Van Sales Concurrency, Deduplication & Idempotency Shield)
* **الحالة / الجاهزية:** تم الإنجاز والاعتماد بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة المندوب الميداني `/driver` وتطبيق الفان سيلز والباك إند `van-sales.service.ts`.
* **القدرات التشغيلية والتقنية:**
  1. **قفل الواجهة الفوري المتزامن (Instant Synchronous UI Lock):**
     - إضافة حارس فوري `isCheckoutProcessingRef` و `isCollectionProcessingRef` ينشطان في زمن 0ms بمجرد اللمس، وقبل البدء في طلب إحداثيات الـ GPS غير المتزامن (`navigator.geolocation.getCurrentPosition`).
     - تعطيل أزرار التأكيد فوراً وتحويل النص إلى `جاري الإصدار...`، مع حظر نقري مزدوج (Double-Tap) في `VanSaleCheckoutModal.tsx` و `VanSalesMobilePage.tsx`.
     - توليد مفتاح معاملة فريد حتمي (`clientTxId`) لكل محاولة بيع أو تحصيل وإرساله مع حمولة الطلب.
  2. **قفل التوازي اللحظي في السيرفر (In-Flight Concurrency Promise Lock):**
     - خريطة وعود قيد المعالجة `inFlightSalePromises` و `inFlightCollectionPromises` تشارك نفس الوعد فوراً لأي طلبين متزامنين بنفس السلة والمندوب والعميل حتى لو وصلا بفارق أجزاء من الثانية (Milliseconds)، وإرجاع نفس الفاتورة المحفوظة دون تكرار أي قيد أو خصم مخزون.
  3. **حائط صد التكرار السريع في الذاكرة وقاعدة البيانات (Rapid-Duplicate Safeguard):**
     - تخزين كاش محلي سريع للعمليات الناجحة في الذاكرة لمدة 30 ثانية.
     - فحص أمني في قاعدة البيانات والذاكرة يمنع تكرار أي فاتورة أو سند قبض مالي لنفس المندوب والرحلة والعميل خلال 5 ثوانٍ، وإرجاع نتيجة الفاتورة المسجلة.
* **الملفات المنفذة:**
  - `frontend/src/features/delivery-reps/components/VanSaleCheckoutModal.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`


<!-- migrated:cap-285:end -->

<a id="cap-286"></a>
<!-- migrated:cap-286:start -->
## 242. جناح المشاركة الفورية عبر واتساب لفواتير الميدان وكشوف حسابات العملاء (Van Sales Direct WhatsApp Sharing & One-Click Statement Dispatch)
* **الحالة / الجاهزية:** تم الإنجاز والاعتماد بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة المندوب الميداني `/driver` (نافذة إتمام الفاتورة `VanSaleCheckoutModal.tsx`، نافذة الإيصال الميداني `VanSalesReceiptModal.tsx`، وسجل فواتير اليومية `VanSalesHistoryTab.tsx`، ونافذة كشف حساب العميل `VanCustomerStatementModal.tsx`).
* **القدرات التشغيلية والتقنية:**
  1. **التفعيل التلقائي للمشاركة المباشرة فور الإصدار (Auto-Share WhatsApp Toggle):**
     - إضافة مفتاح تشغيلي ذكي `autoShareWhatsApp` في نافذة السداد الميداني `VanSaleCheckoutModal.tsx` يُفعل تلقائياً عند توفر هاتف العميل، لفتح محادثة واتساب فورية وإرسال الفاتورة بنقرة واحدة بمجرد اعتمادها.
  2. **بطاقة إرسال واتساب السريعة ونسخ الحافظة في إيصال الفاتورة (Instant WhatsApp Share Card):**
     - بطاقة مخصصة في نافذة الإيصال `VanSalesReceiptModal.tsx` تعرض خانة رقم هاتف العميل مع زر مباشر عالي الوضوح (`#16a34a`) وزر إضافي "نسخ النص" لنسخ تفاصيل الفاتورة فورياً ومشاركتها عبر أي وسيلة.
     - تشغيل تلقائي ذكي يحمي من حظر النوافذ المنبثقة وينسق الرقم طبقاً للمعيار المصري عبر `cleanWhatsAppPhone`.
  3. **قالب نصي منسق واحترافي وشامل (Structured WhatsApp Invoice Template):**
     - تنسيق الفاتورة بدقة مع دعم اسم المنشأة، رقم الفاتورة وتاريخها بالدقيقة، كود واسم العميل، اسم المندوب ورقم السيارة، تفقيط البنود مع الوحدات (كرتونة/قطعة) وأسعارها وخصوماتها، شارات البونص المجاني `[بونص مجاني 0.00]`، إجمالي الفاتورة، طرق السداد وتفاصيل إنستاباي/فودافون كاش، وإجمالي الرصيد المتبقي على حساب العميل.
  4. **مشاركة ونسخ كشف حساب ومطابقة الرصيد بنقرة واحدة (One-Click Customer Statement Dispatch):**
     - تمكين المندوب في `VanCustomerStatementModal.tsx` من إرسال كشف الحساب ومطابقة الرصيد وأمانات الفوارغ وآخر فواتير وسندات تحصيل لواتساب العميل أو نسخ النص بضغطة زر.
* **الملفات المنفذة:**
  - `frontend/src/features/delivery-reps/utils/van-sales-receipt.utils.ts`
  - `frontend/src/features/delivery-reps/components/VanSalesReceiptModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanSaleCheckoutModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanCustomerStatementModal.tsx`
  - `frontend/src/features/delivery-reps/components/VanSalesHistoryTab.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`
  - `frontend/src/features/delivery-reps/utils/van-sales-receipt.spec.ts`


<!-- migrated:cap-286:end -->

<a id="cap-287"></a>
<!-- migrated:cap-287:start -->
## 243. حوكمة أذونات شحن البضاعة ومنع تكرار الطلبات المعلقة مع استرجاع الأصناف ودعم الشحن الإضافي (Van Single Pending Requisition Governance, Cancellation Recovery & Supplementary Load Support)
* **الحالة / الجاهزية:** تم الإنجاز والاعتماد بنسبة 100% (أكتوبر 2026).
* **المسار:** شاشة المندوب الميداني `/driver` (بوابة التحميل `DriverNewLoadRequisitionView.tsx`، شاشة التوزيع `VanSalesMobilePage.tsx`) ولوحة الإدارة `VanLoadRequisitionsAdminTab.tsx` ومحرك الباك إند `van-requisitions.service.ts` و `van-sales.service.ts`.
* **المشكلة المعالجة:**
  - كان بإمكان المندوب إرسال عدة أذونات تحميل متتالية في نفس اليوم تظل جميعها بحالة معلقة (`pending`) وتغرق شاشة المشرف بطلبات متكررة ومتضاربة.
  - عند رغبة المندوب في تعديل الكميات أو إضافة صنف بعد إرسال الطلب، لم تكن لديه وسيلة لسحب أو إلغاء الطلب المعلق، مما كان يدفعه لإرسال طلب جديد إضافي من الصفر.
  - عند قيام المشرف باعتماد طلب تحميل لمندوب لديه بالفعل رحلة يومية مفتوحة في الميدان، كان النظام يفشل برسالة خطأ (`TRIP_ALREADY_OPEN`) بدلاً من إضافة البضاعة كشحن إضافي (استعواض أثناء اليوم).
* **القدرات التشغيلية والتقنية:**
  1. **قاعدة الإذن المعلق الواحد الصارمة (Single Pending Requisition Invariant):**
     - إضافة قفل تشغيلي حاسم في السيرفر `submitLoadRequisition` يمنع المندوب من إرسال أي إذن تحميل جديد إذا كان لديه طلب سابق بحالة `pending` قيد انتظار مراجعة المشرف، ويعيد خطأ تشغيلياً صريحاً (`PENDING_REQUISITION_EXISTS`).
  2. **إلغاء الطلب المعلق واسترجاع الأصناف بنقرة واحدة (Driver Requisition Cancellation & Items Recovery):**
     - توفير نقطة نهاية آمنة `@Delete('requisitions/:id')` و `@Post('requisitions/:id/cancel')` تمكّن المندوب من إلغاء طلبه المعلق بنفسه.
     - عند الإلغاء، يقوم السيرفر بحذف السجل المعلق وإرجاع مصفوفة الأصناف السابقة `previousItems` مع المستودع والملاحظات، ليقوم الفرونت إند تلقائياً بإعادة تعبئتها في سلة التحميل دون إجبار المندوب على إعادة اختيار الأصناف من الصفر.
  3. **بانر تنبيهي ذكي وتعديل فوري في شاشات المندوب (Pending Requisition Alert & Action Banner):**
     - إضافة بانر تحذيري كهرماني مؤسسي في أعلى شاشة `DriverNewLoadRequisitionView.tsx` يوضح رقم الطلب المعلق وحالته، مع زر بارز «إلغاء الطلب المعلق وتعديل الأصناف» يسترجع الأصناف فوراً إلى السلة، مع تحويل أزرار الإرسال إلى زر الإلغاء والتعديل طالما يوجد طلب معلق.
     - إضافة زر إلغاء وتجهيز مباشر في بطاقات الأذونات المعلقة بشاشة المندوب `VanSalesMobilePage.tsx`.
  4. **دعم الشحن الإضافي والاستعواض على الرحلات المفتوحة (Supplementary Load on Active Open Trips):**
     - ترقية محرك الاعتماد والصرف `approveAndDispatchRequisition` في `van-sales.service.ts`: إذا كان لدى المندوب رحلة مفتوحة بالفعل، لا يتم رفض العملية، بل يتم نقل المخزون من المستودع إلى سيارة المندوب طبقاً لترتيب الأقفال القياسي (`Canonical Lock Order`) وتحديث حقل `loaded_amount` بالزيادة وتوليد القيد المحاسبي إن وُجد، وربط الإذن بالرحلة المفتوحة بحالة `dispatched` وعلم `isSupplementary: true`.
     - إشعار المشرف في لوحة الإدارة برسالة نجاح واضحة: «تم اعتماد وصرف البضاعة وتحميل السيارة بنجاح كشحن إضافي على الرحلة المفتوحة #X».
* **الملفات المنفذة:**
  - `backend/src/modules/delivery-reps/services/van-requisitions.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.service.ts`
  - `backend/src/modules/delivery-reps/van-sales.controller.ts`
  - `frontend/src/features/delivery-reps/api/van-sales.api.ts`
  - `frontend/src/features/delivery-reps/hooks/useDriverLoadRequisition.ts`
  - `frontend/src/features/delivery-reps/components/DriverNewLoadRequisitionView.tsx`
  - `frontend/src/features/delivery-reps/components/VanLoadRequisitionsAdminTab.tsx`
  - `frontend/src/features/delivery-reps/pages/VanSalesMobilePage.tsx`


<!-- migrated:cap-287:end -->
