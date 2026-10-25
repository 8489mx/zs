# قدرات التقارير والتحليلات

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **التقارير والتحليلات** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/reports/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md) · [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [المبيعات ونقاط البيع](SALES_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [19. لوحات ذكاء الأعمال والرسوم البيانية المتقدمة (Executive BI Charts & Business Intelligence)](#cap-045)
- [45. الملخص التنفيذي واللوجستي اليومي للمدير عبر واتساب (WhatsApp Daily Executive & Logistics Digest)](#cap-070)
- [46. لوحة التحليلات التنفيذية والشبكة المتوازنة (Executive BI Symmetrical Grid)](#cap-071)
- [179. محرك التقارير المحورية وتحليل البيانات المرن (Dynamic Pivot & Custom BI Reports)](#cap-213)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-045"></a>
<!-- migrated:cap-045:start -->
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


<!-- migrated:cap-045:end -->

<a id="cap-070"></a>
<!-- migrated:cap-070:start -->
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


<!-- migrated:cap-070:end -->

<a id="cap-071"></a>
<!-- migrated:cap-071:start -->
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


<!-- migrated:cap-071:end -->

<a id="cap-213"></a>
<!-- migrated:cap-213:start -->
## 179. محرك التقارير المحورية وتحليل البيانات المرن (Dynamic Pivot & Custom BI Reports)
* **حالة الوحدة / المعيار:** 🟢 مكتملة ومحمية بنسبة 100% (29 سبتمبر 2026).
* **المسار:** `/reports/pivot-builder`.
* **المشكلة المعالجة:**
  - القضاء على جمود التقارير الثابتة أحادية البعد؛ وتمكين المحاسبين والمديرين وصناع القرار من استكشاف واستقراء أي مؤشر مالي أو تشغيلي (إجمالي مبيعات، صافي أرباح، كميات، عدد العمليات، متوسط قيمة الفاتورة) وتقاطعه بحرية تامة مع أي أبعاد (الفروع، العملاء، الموردين، المناديب، الأصناف، تصنيفات البضائع، الشهور، الأيام، وطرق السداد) في مصفوفات تفاعلية متعددة المستويات.
* **الهندسة والحلول المنفذة:**
  1. **هجرة قاعدة البيانات (2040000000172_custom_bi_pivot_reports.ts):**
     - إنشاء جدول قوالب التقارير المخصصة (`custom_bi_pivot_reports`) مع عزل المستأجر الصارم (`tenant_id`) ودعم حفظ إعدادات الأبعاد والمصادر والفلاتر وتثبيت التقارير المفضلة لمديري النظام.
  2. **محرك التجميع الرياضي الصافي (pivot-aggregation.engine.ts):**
     - محرك حسابي نقي وخالٍ من الآثار الجانبية يطبق خوارزميات التجميع والجدولة المتقاطعة (Cross-Tabulation Matrix)، واحتساب مجاميع الصفوف، مجاميع الأعمدة، الإجمالي العام، ومتوسطات القيم بدقة سنتورية.
     - ترتيب هرمي تنازلي فوري لصفوف الجدول حسب المساهمة المالية الأعلى.
     - اختبارات وحدة شاملة (`backend/test/pivot-aggregation-engine.spec.ts`) تغطي 6 سيناريوهات للمصفوفات والأرباح والكميات وحالات الصفرية بنجاح 100%.
  3. **خدمة الباك إند متعددة المصادر (dynamic-pivot.service.ts & reports.controller.ts):**
     - استعلام تجميعي ذكي عبر 4 مصادر بيانات رئيسية: المبيعات والفواتير (`sales`) على مستوى الترويسة والأصناف، المشتريات والموردين (`purchases`)، المخزون والمستودعات (`inventory`)، والمصروفات وحركات الخزينة (`expenses`).
     - نقاط نهاية آمنة: `POST /api/reports/pivot/execute`، `GET /api/reports/pivot/templates`، `POST /api/reports/pivot/templates`، و `DELETE /api/reports/pivot/templates/:id`.
  4. **واجهة المستخدم التفاعلية (PivotBuilderPage.tsx & PivotGridTable.tsx):**
     - منشئ تقارير متكامل بعرض 1280px القياسي يتيح اختيار مصدر البيانات، بُعد الصفوف، بُعد الأعمدة، المؤشر المحسوب، والفترة الزمنية.
     - شريط وصول سريع للقوالب المحفوظة يتيح استدعاء أي تقرير مخصص بنقرة واحدة.
     - جدول محوري بريميوم يدعم التظليل الحراري التلقائي (Heatmap) للقيم المرتفعة، والتمرير الأفقي المحمي بدون كسر الصفحة.
     - إمكانية تصدير التقرير المحوري إلى ملف `CSV` منسق باللغة العربية بنقرة واحدة، وخيار الطباعة المباشرة.
     - نافذة معيارية لحفظ القوالب المخصصة (`SavePivotTemplateModal`).
* **الملفات المتصلة:**
  - `backend/src/database/migrations/2040000000172_custom_bi_pivot_reports.ts`
  - `backend/src/database/database.types.ts`
  - `backend/src/modules/reports/engines/pivot-aggregation.engine.ts`
  - `backend/test/pivot-aggregation-engine.spec.ts`
  - `backend/src/modules/reports/dto/dynamic-pivot.dto.ts`
  - `backend/src/modules/reports/services/dynamic-pivot.service.ts`
  - `backend/src/modules/reports/reports.controller.ts`
  - `backend/src/modules/reports/reports.module.ts`
  - `frontend/src/features/reports/api/dynamic-pivot.api.ts`
  - `frontend/src/features/reports/components/pivot/PivotGridTable.tsx`
  - `frontend/src/features/reports/components/pivot/SavePivotTemplateModal.tsx`
  - `frontend/src/features/reports/pages/PivotBuilderPage.tsx`
  - `frontend/src/features/reports/routes.tsx`
* **التحقق البرمجي:**
  - اختبارات الوحدة للمحرك: `backend/test/pivot-aggregation-engine.spec.ts` بنجاح 100% لكافة سيناريوهات التقارير 1D و 2D وحساب الأرباح والكميات.

---


<!-- migrated:cap-213:end -->
