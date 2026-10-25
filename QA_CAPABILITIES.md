# قدرات التحقق والتدقيق والسجلات المشتركة

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **التحقق والتدقيق والسجلات المشتركة** المعتمد للتحديثات القادمة. مسارات الملكية: مجال عابر للموديولات؛ راجع الأقسام ومسارات التنفيذ أدناه.

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md) · [الهوية والأمان وعزل الشركات](PLATFORM_CAPABILITIES.md) · [التشغيل والنشر والأداء والنسخ الاحتياطي](RUNTIME_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [سجل قدرات ومنظومة Z-Systems (System Capabilities & Feature Matrix)](#cap-legacy-preface)
- [📐 ملف مصاحب إلزامي: دستور الثوابت المعمارية](#cap-001)
- [قدرة: مصفوفة سيناريوهات ومحاكاة مسارات العمل الشاملة (Master 21-Scenario E2E Simulation Matrix) — ✅ مفعّلة ومختبرة 100% (9 أكتوبر 2026)](#cap-012)
- [دلالات شارات الحالة (Status Badges)](#cap-027)
- [39. ما ينقص النظام فعلياً أو يمكن التوسع فيه مستقبلاً (Optional Future Expansions)](#cap-064)
- [143. الأركان الهندسية الخمسة المتقدمة لإدارة المقاولات الكبرى (Global Tier-1 Benchmark Suite)](#cap-168)
- [155. موديول الوحدات القطاعية ونقاط البيع والورديات والتصنيع والصيدليات والاستبدال (Phase 9: Sectoral Invariants, Manufacturing WAC, Pharmacy FEFO & Universal Numbering)](#cap-187)
- [158. تدقيق مسار الاستدعاء وإصلاحات المصادقة عبر المراحل 6-10 (Cross-Phase Controller/Guard Call-Path Audit)](#cap-190)
- [Operational hardening added 30 September 2026](#cap-224)
- [Commercial core follow-up (5 October 2026)](#cap-231)
- [260. اختبارات القبول التنفيذي لسلامة المحاسبة وقواعد البيانات (Core/accounting Executable Acceptance — 24 October 2026)](#cap-299)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-legacy-preface"></a>
<!-- migrated:cap-legacy-preface:start -->
# سجل قدرات ومنظومة Z-Systems (System Capabilities & Feature Matrix)

> **إصلاحات الحزمة المعمارية 01 — 23 أكتوبر 2026 (بانتظار التحقق):** توحيد بوابة Desktop ومنع أعلامه من تجاوز Cloud، وحماية هوية `zs` في تنقية أدوار المنصة، وتصحيح متغيرات Compose وقاعدة API وفحص الجاهزية، وتقديم رفض الجلسة الصريح على الهوية المحفوظة عند فشل حالة التفعيل. دعم الأوفلاين وكلمة مرور المطور الثابتة باقيان وفق طلب المالك. أضيفت حالات اختبار ولم تُشغّل؛ لا يُعد هذا التحديث إثبات جاهزية إنتاجية.

> **وثيقة مرجعية موحدة ودائمة لكافة ميزات ووحدات النظام**  
> **تاريخ آخر تحديث شامل:** سبتمبر 2026  
> **الغرض:** الحصر الدقيق لكل سطر كود وشاشة ووحدة في النظام (Backend & Frontend) لمنع اقتراح أي ميزة منجزة بالفعل، وتحديد ما هو مكتمل 100%، وما هو جزئي، وما هو متبقي فعلياً.  
> **قاعدة إلزامية:** أي ميزة جديدة يتم إضافتها أو تطويرها في النظام يجب توثيقها وتحديث حالتها في هذا الملف فوراً.

> **تحديث جاهزية البيع (سبتمبر 2026):** أضيف اختبار HTTP محلي في CI للتسجيل التجريبي ودورة حياة المستأجر (إنشاء، تعليق، تفعيل، انتهاء، تجديد وحذف بيانات الاختبار)، مع إصلاح مراجع مستندات فحوص الإصدار المنقولة إلى `docs/archive`، ومنع تفعيل ZATCA أو رفع النسخ الاحتياطية بحالة وهمية أو غير مشفرة. هذه الفحوص لا تثبت تسليم بريد SMTP الحقيقي أو توقيع قبول عميل على الإنتاج؛ راجع `docs/LIVE_SAAS_OPERATIONS_CHECKLIST.md` قبل وصف بيع SaaS العام بأنه مكتمل.

> **تحديث المحاسبة والخزينة (أكتوبر 2026):** القيود العكسية تبقى مع أصولها ضمن الأستاذ، ويُسلسل الترحيل مع إقفال الفترات. تُحجز الحسابات المختارة داخل معاملة الترحيل ويُستعمل رقم مؤقت UUID قبل اشتقاق رقم القيد النهائي من معرف الصف. الإهلاك محدود بتكلفة الأصل وقيمة الخردة وبالأشهر المستحقة. إعادة تقييم العملات تتطلب إدخال الرصيد الأجنبي الفعلي لكل حساب نقدي، وتعيد احتساب الفرق عند الاعتماد. تُفحص ملكية مراجع المصروفات والقيود للمستأجر قبل الحفظ. إحكام دورة الشيكات المؤجلة وحظر الازدواج العكسي ومزامنة دفاتر الأستاذ المساعد للعملاء والموردين لحظياً وهجرة `247` للفهرس الفريد للشيكات المستعادة. ترحيل قيود حركات درج النقدية اليدوية والأرصدة الافتتاحية وفوائد خطط التقسيط. شمول حسابات المقاصة (`contra_revenue` و `contra_expense`) في إقفال السنة المالية وملخص الدخل. واحتساب وعاء ضريبة القيمة المضافة لأسعار شاملة الضريبة وتقارير أعمار الديون بصافي المستحق غير المسدد.

> **تحديث المشتريات والمخزون والأصناف (أكتوبر 2026):** فحص ملكية المورد والمخزن والأصناف في أوامر الشراء، ومنع تكرار رقم فاتورة المورد في فواتير محاضر الاستلام بالتسلسل على سجل المورد. تسويات المخزون تستخدم فرع الموقع الفعلي، ولا تسمح شاشة الصنف بتغيير متوسط تكلفة رصيد قائم. الرصيد الافتتاحي ذو القيمة يولد قيد مخزون مقابل رأس المال ضمن معاملة إنشاء الصنف. التكاليف الإضافية تقتصر على الفواتير المرحلة وتوزع بين المخزون وتكلفة المبيعات وفق بقاء حصة الاستلام في مخزون المتوسط المرجح، ثم ترحل عبر القيد المركزي بتاريخ الاعتماد مع احترام إقفال الفترات.

---


<!-- migrated:cap-legacy-preface:end -->

<a id="cap-001"></a>
<!-- migrated:cap-001:start -->
## 📐 ملف مصاحب إلزامي: دستور الثوابت المعمارية

> هذا الملف يجيب على سؤال **«ماذا يفعل النظام؟»**.
> أما أسئلة **«ما الذي يُمنع كتابته؟ وأين المصدر الوحيد للحقيقة؟ وما الثوابت المفروضة؟ وماذا دُقِّق؟»**
> فإجابتها في **[`ARCHITECTURE_INVARIANTS.md`](./ARCHITECTURE_INVARIANTS.md)**.
>
> **قبل كتابة أي كود مالي أو محاسبي أو يمسّ المخزون، اقرأ القسمين 2 و3 من ذلك الملف.**
> يحتوي على: المحركات التي يجب المرور بها حصراً (`applyStockDelta`، `insertPostedJournal`، محركات
> الحساب النقية)، والأنماط المحظورة مع الخطأ الحقيقي الذي سبَّبه كل نمط، وسجل الثوابت
> (I1–I12 · G1 · G1-C · MATCH-1–3 · C1–C3)، وسجل الهجرات البنيوية، وحالة مراحل التدقيق، والبنود المفتوحة.
>
> **وملف حماية الأداء:** [`PERFORMANCE_CONSTITUTION.md`](./PERFORMANCE_CONSTITUTION.md) — الثوابت PERF-1..PERF-12
> (سرعة كتالوج نقطة البيع، كتالوج المتجر العام، تقسيم حزم الواجهة، الفهارس الساخنة). اقرأه قبل لمس
> `vite.config.ts` أو `main.ts` أو استيرادات الـShell أو الكتالوجات.
>
> **وملف حوكمة المودات والأنشطة والباقات:** [`SYSTEM_MODES_AND_TIERS_MATRIX.md`](./SYSTEM_MODES_AND_TIERS_MATRIX.md) — الدستور المرجعي الشامل لتوزيع المودات والأنشطة والباقات (L1, L2, L3) وعزل الشاشات ومنع التسريب بين الساس والديسكتوب.


<!-- migrated:cap-001:end -->

<a id="cap-012"></a>
<!-- migrated:cap-012:start -->
### قدرة: مصفوفة سيناريوهات ومحاكاة مسارات العمل الشاملة (Master 21-Scenario E2E Simulation Matrix) — ✅ مفعّلة ومختبرة 100% (9 أكتوبر 2026)
- **التغطية الكاملة (All 37 Modules & 82 Controllers):** تغطية شاملة لكافة العمليات المالية والتشغيلية والمخزنية والإدارية والقطاعية للنظام بنسبة 100% عبر 21 ملف محاكاة متكامل في `backend/test/e2e/simulations/` بدون أي بيانات وهمية (Zero Mocks):
  1. الخزينة والبنوك والتحويلات النقدية وتوازن القيود (`treasury-cash-management-simulation.ts`)
  2. محرك التسعير، موجات التعديل، الاستثناءات، والهوامش (`pricing-engine-master-simulation.ts`)
  3. الفاتورة الإلكترونية السعودية ZATCA Phase 2 وتشفير الـ QR (`zatca-einvoicing-master-simulation.ts`)
  4. الموارد البشرية، مسير الرواتب، الحضور، ومكافأة نهاية الخدمة (`hr-payroll-attendance-simulation.ts`)
  5. المصروفات التشغيلية ومراكز التكلفة والقيود المزدوجة (`expenses-management-simulation.ts`)
  6. الجرد الفعلي، معالجة الفروقات، والتسويات المخزنية (`inventory-count-stocktaking-simulation.ts`)
  7. أوامر البيع، حجز المخزون، والتحويل إلى فواتير بيع (`sales-orders-quotation-simulation.ts`)
  8. بوابات العملاء والموردين والموظفين والمناديب (`customer-supplier-portal-simulation.ts`)
  9. محركات التقارير المالية، القوائم الختامية، وأعمار الديون والإقرار الضريبي (`financial-reports-deep-simulation.ts`)
  10. الفواتير والعمليات متعددة العملات وفروق الصرف FX Gain/Loss (`multi-currency-lifecycle-simulation.ts`)
  11. الشحن البحري، الحاويات، تتبع الشحنات وبوالص الشحن وربحية الرحلات (`maritime-cargo-simulation.ts`)
  12. القطاعات المتخصصة: الصيدليات وتتبع الصلاحية FEFO، الأقساط، الاشتراكات، وشاشات المطابخ KDS (`sectoral-industry-simulation.ts`)
  13. محرك الإشعارات، بوابة الواتساب، والملخص التنفيذي اليومي للإدارة (`notifications-alerts-simulation.ts`)
- **إصلاحات البنية التحتية والمخزون:**
  - معالجة قيد الرصيد المخزني غير المعين `uq_product_location_stock_product_unassigned` في `location-stock-ledger.ts`.
  - معالجة تحرير المخزون المحجوز في أوامر البيع وتطابقه مع مستودع الفرع الافتراضي في `sales-orders.service.ts`.
  - ترقية أطوال حقول التجزئة والتشفير وتوافق ترميز سجلات التدقيق UTF-8 في الهجرتين 207 و 208.


<!-- migrated:cap-012:end -->

<a id="cap-027"></a>
<!-- migrated:cap-027:start -->
## دلالات شارات الحالة (Status Badges)
- 🟢 **مكتمل 100% (Production Ready):** الواجهة مكتملة، الـ Backend مكتمل، قاعدة البيانات مربوطة، وتم اختباره واعتماده.
- 🟡 **مكتمل جزئياً (Partial / In Progress):** مكتمل بنسبة محددة (مع توضيح ما ينقصه بدقة).
- 🔴 **غير منجز / مقترح (Planned / Not Started):** فكرة مستقبلية غير مطبقة كوداً حتى الآن.

---


<!-- migrated:cap-027:end -->

<a id="cap-064"></a>
<!-- migrated:cap-064:start -->
## 39. ما ينقص النظام فعلياً أو يمكن التوسع فيه مستقبلاً (Optional Future Expansions)

| الميزة المقترحة / البديل المنفذ | الحالة | نسبة الإنجاز | الملاحظات والبديل المنجز في النظام |
| :--- | :---: | :---: | :--- |
| **دورة الشيكات البنكية وأوراق القبض والدفع (PDC Management)** | 🟢 | 100% | تم إنجازها بالكامل 100% بحافظة متكاملة لأوراق القبض والدفع، إيداع برسم التحصيل، تحصيل وصرف، ارتداد، تظهير، وتنبيهات استحقاق وسندات استلام مطبوعة. |
| **دورة طلب عروض أسعار الموردين والمقارنة (Vendor RFQ)** | 🟡 | اختياري | دورة إرسال طلبات عروض أسعار لعدة موردين ومقارنة عروضهم قبل إصدار أمر الشراء. |
| **تغليف تطبيقات المتاجر الرسمية (Google Play / App Store)** | 🟢 | 100% | بديل PWA الفوري للمناديب والمالك يعمل بكفاءة تامة دون الحاجة للمتاجر، ويمكن تغليفه إلى APK/AAB بنقرة واحدة عند الرغبة التسويقية. |
| **تكامل الشحن الدولي المباشر (DHL / FedEx Direct Webhook)** | 🟡 | اختياري | بعد تكامل بوسطة وأرامكس وسمسا، يمكن إضافة مسار مباشر لبوليصات DHL وFedEx السريعة للمتاجر العالمية. |

---


<!-- migrated:cap-064:end -->

<a id="cap-168"></a>
<!-- migrated:cap-168:start -->
## 143. الأركان الهندسية الخمسة المتقدمة لإدارة المقاولات الكبرى (Global Tier-1 Benchmark Suite)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Enterprise Production Ready - Global Tier-1 Construction ERP Benchmark)
* **معايير المقارنة الدولية المعتمدة:** Procore Submittals Engine, Oracle Primavera/Unifier EVM & S-Curve, Autodesk Build Quality Workflow, RIB iTWO Material Escalation Claims, SAP S/4HANA EC&O Subcontractor Back-Charges, Trimble Viewpoint Heavy Construction Equipment & Fuel Logs.
* **المسارات في الكود:**
  - **قاعدة البيانات:**
    - `backend/src/database/migrations/2040000000096_contracting_submittals_escalation_evm_backcharges_fuel.ts`:
      * جداول: `contracting_submittals`, `contracting_material_escalations`, `contracting_subcontractor_backcharges`, `contracting_equipment_fuel_logs`.
    - `backend/src/database/database.types.ts`.
  - **الباك إند:**
    - `backend/src/modules/contracting/contracting.types.ts`: واجهات وأنواع الـ 5 أركان المتقدمة.
    - `backend/src/modules/contracting/dto/contracting.dto.ts`: DTOs للتحقق من صحة المدخلات.
    - `backend/src/modules/contracting/contracting.service.ts`: محرك حسابات القيمة المكتسبة (EVM Math Engine: BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, VAC, TCPI) وتوليد نقاط منحنيات الـ S-Curve، والعمليات الكاملة للاعتمادات، فروق الأسعار، الخصومات، ويوميات الوقود.
    - `backend/src/modules/contracting/contracting.controller.ts`: 15+ مسار REST API جديد تحت الأقسام 33 إلى 37.
  - **الفرونت إند:**
    - `frontend/src/features/contracting/contracting.types.ts`: واجهات البيانات ومحددات الحالات.
    - `frontend/src/features/contracting/api/contracting.api.ts`: دوال الاستدعاء من 12 إلى 16.
    - `frontend/src/features/contracting/components/MaterialSubmittalsModal.tsx`:
      1. **اعتمادات المواد والمخططات التنفيذية (MAR / MAS / Shop Drawings Submittals - Procore Benchmark):**
         - تسجيل ومتابعة اعتمادات المواد، الكتالوجات، العينات الفيزيائية، المخططات التنفيذية، وطرق التنفيذ (Method Statements).
         - دورة مراجعة واعتماد الاستشاري بأكواد الفيديك المعتمدة (Code A: Approved, Code B: Approved as Noted, Code C: Revise & Resubmit, Code D: Rejected).
    - `frontend/src/features/contracting/components/MaterialPriceEscalationModal.tsx`:
      2. **مطالبات فروق أسعار الخامات والتضخم (Material Price Escalation Claims - RIB iTWO & Egyptian Price Bulletin Benchmark):**
         - حساب آلي لفروق الأسعار بين سعر الأساس التعاقدي وسعر السوق الفعلي المعتمد في النشرات الدورية (حديد تسليح، أسمنت بورتلاندي، خرسانة جاهزة، بيتومين، رمل وسن).
         - معادلة التعويض الفوري: `Total Claim = Executed Qty × Price Difference`.
         - دورة اعتماد وإدراج مباشر في مستخلصات المالك (IPCs).
    - `frontend/src/features/contracting/components/ProjectEvmMetricsModal.tsx`:
      3. **إدارة القيمة المكتسبة ومنحنى الأداء التراكمي (EVM & S-Curve Visualization - Oracle Primavera P6 / Unifier Benchmark):**
         - مؤشرات الأداء اللحظية (BAC, PV, EV, AC, Cost Variance CV, Schedule Variance SV, CPI, SPI, Estimate at Completion EAC, VAC, TCPI).
         - مخطط بياني تفاعلي لمنحنى S-Curve يرسم مسار المخطط (Planned) مقابل المكتسب (Earned) والتكلفة الفعلية (Actual).
    - `frontend/src/features/contracting/components/SubcontractorBackChargesModal.tsx`:
      4. **سجل خصومات ومخالفات مقاولي الباطن (Subcontractor Back-Charges & Penalties - SAP S/4HANA EC&O Benchmark):**
         - إدارة استقطاعات التلفيات وإعادة التنفيذ (Damage & Rework)، مخالفات السلامة والصحة المهنية (HSE Fines)، استهلاك الرافعات والمعدات، ونظافة الموقع.
         - توجيه الخصم آلياً لخصمه من مستخلص مقاول الباطن مع إمكانية تحويل التعويض لمقاول باطن متضرر آخر أو للمقاول العام.
    - `frontend/src/features/contracting/components/EquipmentFuelLogsModal.tsx`:
      5. **سجل استهلاك الوقود وساعات تشغيل المعدات (Heavy Equipment Fuel & Meter Logs - Trimble Viewpoint Benchmark):**
         - تسجيل يوميات العدادات الابتدائية والنهائية وساعات التشغيل الفعلية للمعدات والآليات الثقيلة.
         - متابعة كميات السولار/الديزل وتكلفة التزويد بالوقود وربط التكلفة مباشرة ببنود المقايسة (BOQ).
         - حساب معدلات الاستهلاك اللحظية (لتر/ساعة).
  - `frontend/src/features/contracting/pages/ContractingPlanningPage.tsx`:
    - **فصل معماري كامل للمرحلة 3 (Planning & Mobilization):** إنشاء صفحة مخصصة ومستقلة للمرحلة الثالثة تضم مخطط جانت والمسار الحرج (CPM)، تراخيص البناء والموافقات الحكومية، وتجهيزات الموقع والمرافق (Mobilization) مع عزلها التام عن تابات وأدوات الميدان.
  - `frontend/src/features/contracting/pages/ContractingFieldPage.tsx`:
    - **تطهير واقتصار المرحلة 5 على التنفيذ وضبط الجودة (Field Execution & Quality):** حصر التابات في (يوميات الموقع، الاستفسارات الهندسية RFI)، والأزرار في (استلام الأعمال WIR، حضور العمالة، العهد النقدية، سجل الوقود، وتتبع المعدات)، وإزالة مهام التخطيط وجداول العيوب منها.
  - `frontend/src/features/contracting/pages/ContractingCloseoutPage.tsx`:
    - **إعادة الترتيب الزمني والمنطقي لكروت مؤشرات الإغلاق (FIDIC 4-Step Alignment):** ترتيب بطاقات الـ KPIs الأربع لتطابق المسار الزمني (1. قائمة العيوب والملاحظات Snags -> 2. الاستلام الابتدائي -> 3. الاستلام النهائي وفترة الصيانة -> 4. الإفراج عن ضمان حسن التنفيذ المحتجز).
  - `frontend/src/features/contracting/components/ContractingBoqTab.tsx`:
    - **إعادة ترتيب بطاقات المقايسة:** وضع البطاقات الإحصائية الأربع (قيمة المقايسة، التكلفة المستهدفة، هامش الربح، نسبة الإنجاز) في مقدمة الصفحة مباشرة أعلى شريط الأدوات المتقدمة لمنح المهندس رؤية مالية فورية.
  - `frontend/src/features/contracting/pages/ContractingFinancialsPage.tsx`:
    - **تطهير أزرار المالية:** إزالة زر محاضر الاستلام وترحيله حصرياً لمرحلة التسليم والإغلاق السابعة، وتركيز الأدوات على (EVM S-Curve، خصومات مقاولي الباطن، وتحليل التكاليف).
  - `frontend/src/features/contracting/components/SmartNextActionGuide.tsx`:
    - تحويل شريط الإجراءات المباشرة الذكية في كافة المراحل السبع إلى سطر واحد أفقي محكم (`nowrap`) مع اختصار المسميات وأحجام متناسقة لمنع النزول لسطر ثانٍ نهائياً.
  - **توحيد الهوية البصرية ونظام الأزرار ثنائي المستوى (Two-Tier Button Standard & Clean Palette):**
    - **التخلص التام من بهرجة الألوان العشوائية (Rainbow Buttons):** إزالة الألوان العشوائية (الأزرق الفاقع، الأخضر، البرتقالي، البنفسجي، والأصفر) من الأزرار التشغيلية وأزرار الهيدرات في كافة صفحات وتولبارات الموديول.
    - **نظام الأزرار الموحد:** الزر الرئيسي الوحيد باللون الكحلي الملكي العميق (`#170e5e` بارتفاع `36px`، حواف `8px`، ووزن `700`)، والأزرار الفرعية والتشغيلية بالرمادي المؤسسي الناصع الموحد (`#ffffff` بخط `#334155` وإطار `1px solid #cbd5e1` بارتفاع `36px` ووزن `600`).
    - **قصر الألوان على الحالات والمؤشرات الدلالية فقط (Semantic Status Only):** الأخضر للاعتمادات ونسب الأرباح، الأحمر للتأخيرات والمسار الحرج، والأصفر للبنود المعلقة والاستقطاعات.
    - **تنظيف بطاقات المؤشرات (KPIs):** خلفيات بيضاء نظيفة وإطارات رمادية ناعمة وأيقونات بحاويات رمادية حيادية هادئة (`#f8fafc`).
* **فحص الجودة والسلامة البرمجية:**
  - الالتزام الصارم بدستور واجهات المستخدم (RTL، Zero Emojis، StandardDialog، شريط أحادي السطر Single-Line Row، وفصل دقيق للتابات والأركان وتوافق الشاشات من 14 إلى 32 بوصة بدون سكرول خارجي).

---


<!-- migrated:cap-168:end -->

<a id="cap-187"></a>
<!-- migrated:cap-187:start -->
## 155. موديول الوحدات القطاعية ونقاط البيع والورديات والتصنيع والصيدليات والاستبدال (Phase 9: Sectoral Invariants, Manufacturing WAC, Pharmacy FEFO & Universal Numbering)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Phase 9 Production-Ready & Invariant-Audited).
* **المعايير الهندسية والتشغيلية المعتمدة:** Rule 10 Universal Document Numbering (`PREFIX-YYMMDD-XXXX`) / Rule 13 Financial & Operational Audit Protocol / Pessimistic Row Locking (`forUpdate`) / Race-Condition Prevention (Pattern F1) / Atomic Numbering via Returning Identity (Pattern F6) / Pharmacy FEFO Engine / 0 Emojis Policy.
* **المسارات في الكود:**
  - `backend/src/modules/cash-drawer/helpers/cash-drawer.helper.ts` & `cash-drawer.service.ts`:
    1. توحيد ترقيم وثائق الورديات بصيغة `SHIFT-YYMMDD-XXXX` عبر `formatDailyDocumentNumber('SHIFT', shiftId)`.
    2. فرض القفل التشاؤمي `forUpdate()` على جدول `cashier_shifts` أثناء تسجيل الحركات النقدية وإغلاق الوردية لمنع تضارب التعديلات وفقدان التحديثات (Lost Updates).
    3. آلية الإغلاق الأعمى (Blind Close) للكاشير ومراجعة واعتماد المدير (Maker-Checker Governance).
  - `backend/src/modules/manufacturing/services/manufacturing.service.ts`:
    1. فرض قفل تشاؤمي `forUpdate()` على جدول `products` عند اكتمال أوامر التصنيع `completeWorkOrder` لحماية احتساب متوسط التكلفة المرجح WAC للمنتج التام من التسابق المتزامن.
    2. توحيد ترقيم أوامر التفكيك `createUnbuildOrder` إلى `UB-YYMMDD-XXXX` وربط الحركات المخزونية برقم المعرف الحقيقي `reference_id: unbuildId` بدلاً من القيمة الصفرية.
  - `backend/src/modules/tradein/tradein.service.ts`:
    1. القضاء التام على ثغرة ترقيم `COUNT(*) + 1` واعتماد الترقيم الموحد الذري `TRD-YYMMDD-XXXX`.
    2. ربط حركات المخزون الناتجة عن شراء الأجهزة المستعملة برقم العملية الحقيقي `txnId` مباشرة مع تقييد الأجهزة برقم السيريال IMEI في `product_serials`.
    3. إثبات صرف القيمة من الخزينة بحركة مصروفات فورية.
  - `backend/src/modules/pharmacy/pharmacy.service.ts`:
    1. توحيد ترقيم الروشتات والتشغيلات: `RX-YYMMDD-XXXX` و `BATCH-YYMMDD-XXXX`.
    2. بناء محرك FEFO (First Expired, First Out) المعتمد في `getBatchesFEFO` لصرف التشغيلات الأقرب انتهاءً أولاً واستبعاد أو حجر التشغيلات منتهية الصلاحية قطيعاً.
  - `backend/test/critical/phase9-sectoral.spec.ts`:
    - إنشاء جناح اختبارات تدقيقي يغطي 6 سيناريوهات حتمية: الترقيم الموحد للوثائق القطاعية (SHIFT, UB, TRD, RX, BATCH)، إعادة احتساب WAC في التصنيع، تفكيك المنتجات واستعادة المكونات والتكلفة، عجز وفائض الورديات، محرك FEFO الصيدلاني، وتقييم الاستبدال وحركات الخزينة.
* **فحص الجودة والسلامة البرمجية:**
  - جناح الاختبارات الحاسم `npm run test:critical` (28 جناح اختبار): **اجتياز بنسبة 100% بنجاح تام (Exit code 0)**.

---


<!-- migrated:cap-187:end -->

<a id="cap-190"></a>
<!-- migrated:cap-190:start -->
## 158. تدقيق مسار الاستدعاء وإصلاحات المصادقة عبر المراحل 6-10 (Cross-Phase Controller/Guard Call-Path Audit)
* **حالة التدقيق:** فحص شامل لكل Controller ضمن المراحل 6 (الموارد البشرية)، 7 (الأقساط/التسعير/CRM)، 8 (اللوجستيات/الشحن)، 9 (القطاعيات)، 10 (الأصول/المحاسبة). **نظيف بالكامل:** المراحل 7، 9، 10 (حارس صفي واحد شامل في كل Controller، لا `@Controller` ثانٍ مخفٍ، لا استثناءات).
* **ثغرات مُصلحة (المرحلتان 6 و8):**
  - `mobile-attendance.controller.ts`: مساران إداريان (`branches/:id/geofence`, `employees/:id/pin`) بلا أي حارس مصادقة ولا تحقق توكن — الأول كان بلا شرط `tenant_id` في الاستعلام إطلاقاً (كتابة عابرة للمستأجرين بلا مصادقة). أُصلح بإضافة `SessionAuthGuard` + `PermissionsGuard` + `RequirePermissions('hrAttendance')`، واشتقاق `tenantId` عبر `requireTenantScope`.
  - `employee-portal.controller.ts` (بوابة الموظف): كان يقبل PIN افتراضي معروف (`'1234'` أو آخر 4 أرقام من الهاتف) بلا أي حد لمحاولات الدخول → انكشاف رواتب/سلف/عُهد الموظفين بالتخمين. أُصلح بإزالة البديل الافتراضي كلياً وإضافة `LoginAttemptLimiter` (`common/utils/login-attempt-limiter.ts`، قفل 15 دقيقة بعد 5 محاولات فاشلة).
  - `maritime-public-tracking.controller.ts`: بوابة عروض أسعار الناقلين العامة (`rfq/:id`, `rfq/:id/bid`) كانت تتحقق بالمفتاح الأساسي التسلسلي المشترك بين كل المستأجرين بلا أي رمز سرّي — يتيح تعداد وقراءة/حقن بيانات مناقصات أي مستأجر. أُصلح بعمود جديد `maritime_rfqs.public_quote_token` (هجرة 119) يُضمَّن في رابط دعوة الناقل ويُتحقق منه إلزامياً قبل أي عرض أو إرسال بيانات.
* **فحص الجودة والسلامة البرمجية:** `npx tsc --noEmit` (Backend + Frontend) نظيف بلا أخطاء؛ `npm run test:critical` (30 جناح) اجتياز 100%؛ هجرة 119 نُفِّذت بنجاح على قاعدة التطوير.
* **جولة إغلاق بنود مفتوحة (نفس اليوم):**
  - **O1** (إعادة تقييم العملات): أُضيف `isMonetary`/`revaluationCurrency` إلى `PUT /api/accounting/accounts/:id` — أول مسار كتابة فعلي لهذا العمود منذ هجرة 112.
  - **O3** (مسار استلام مخزون يتجاوز GRNI): تحقَّقتُ أن `POST /api/purchase-orders/:id/receive` **بلا أي مستدعٍ من الواجهة الأمامية إطلاقاً** (كود ميت خطير)، فحذفته بالكامل (Controller + Service + DTO + عميل API الأمامي) بدل توحيده — مسار الاستلام الوحيد الآن هو `convertToBill` ثم `POST /api/purchases/:id/receive-goods` المُحصَّن بالكامل (GRN/GRNI/مطابقة ثلاثية).
  - **O14** (بلا حد محاولات دخول): `LoginAttemptLimiter` نفسه مُفعَّل الآن أيضاً في `driver-portal` (`delivery-reps.service.ts:driverLogin`) و`mobile-punch` (`mobile-attendance.service.ts:employeeLogin`).
  - **O11** (لا اختبار للإصلاحات الأمنية): جناح جديد `test/critical/phase12-billing-security-hardening.spec.ts` (4 اختبارات: XPay/Paymob/Stripe fail-closed، توقيع صحيح، Replay Protection) — الآن 31 جناحاً في `test:critical`، 100% نجاح.
* **بنود مفتوحة متبقية عمداً (قرارات واعية، ليست إهمالاً):** O2 (نطاق `tenant_id` يحتاج مسحاً دقيقاً موضعاً بموضع)، O5 (صيغة تخفيض سقف الضمان قرار تعاقدي غير موثَّق — اختراعها بلا مصدر حقيقة أخطر من تركها)، O6/O7/O8 (ميزات معمارية بحجم مشروع فرعي)، O9 (17+ موضع ترقيم يحتاج مراجعة فردية لكل جدول)، O12 (تغيير معماري في 6 مواضع)، وبقية O15 (اختبار Guard/رمز RFQ العام يحتاج بنية اختبار HTTP/DB غير متوفرة بالنمط الخفيف الحالي). راجع `ARCHITECTURE_INVARIANTS.md` القسم 8 للتفصيل الكامل والمبررات.


<!-- migrated:cap-190:end -->

<a id="cap-224"></a>
<!-- migrated:cap-224:start -->
## Operational hardening added 30 September 2026
- Trial/demo users are issued one-time random credentials and forced to rotate them at first login.
- Platform authorization is isolated from legacy local tenant aliases in cloud mode.
- Demo data deletion fails closed if its automatic backup cannot be written.
- Production startup validation requires SMTP host and sender configuration for SaaS mail flows.
- Deployment creates an encrypted pre-migration backup, and shipping tracking/labels distinguish sandbox simulation from a real carrier shipment.

---


<!-- migrated:cap-224:end -->

<a id="cap-231"></a>
<!-- migrated:cap-231:start -->
## Commercial core follow-up (5 October 2026)

- Sales posting now fails closed on journal errors. Payment allocations reject excess or fractional-cent lines; edit/cancel reversals separate cash receipts from the outstanding customer debt. Cancellation rejects invoices with returns. Cashier expected cash counts actual drawer refund movements rather than noncash store-credit returns.
- Three-way matching serializes verification per purchase and PO/GRN, enforces service classification from product data, requires a different override approver, and blocks linked supplier payments until verification succeeds. Invalid references and quantity overbilling return explicit blocking codes.
- PO creation uses identity-based daily numbers and atomically saves its lines. Legacy direct purchase receipt rejects over-receipts and new partial receipts; use formal GRNs for partial deliveries. Formal GRN-to-bill and GRNI clearing across multiple receipts remains unfinished and requires a dedicated integration before full PO-to-pay sign-off.
- This change was reviewed statically. The local pair must run TypeScript, migration, and transaction verification; no production readiness percentage is claimed.


<!-- migrated:cap-231:end -->

<a id="cap-299"></a>
<!-- migrated:cap-299:start -->
## 260. اختبارات القبول التنفيذي لسلامة المحاسبة وقواعد البيانات (Core/accounting Executable Acceptance — 24 October 2026)
- **الحالة:** مكتملة بنسبة 100% ومحمية في GitHub Actions (`accounting-acceptance.yml`).
- `test:accounting:postgres` executes real production financial services on a fully migrated disposable PostgreSQL database, including simultaneous requests, rollback, WAC, VAT, partner-ledger reconciliation, cheque FX, carrier credits and fiscal close/reopen.
- Credit sales and demo cleanup now keep complete SQL disjunctions within tenant/object scope. Database composite constraints additionally protect new accounting/branch references.
- One-time commercial journal recovery is checked within the posting lock; purchase retries return the normal document response. Inventory transfers and marketplace settlements support a single connection without escaping their transaction for scope/settings reads.
- `check:accounting-integrity -- TENANT_ID` produces an explicit-tenant JSON reconciliation report using a read-only snapshot. Historical discrepancies require review; no automatic ledger rewrite is performed.
- `.github/workflows/accounting-acceptance.yml` keeps the disposable real-database acceptance repeatable. Detailed numerical evidence and remaining production/desktop boundaries are in `docs/audit_packs/2026-10-24-core-accounting-postgres-acceptance.md`.


<!-- migrated:cap-299:end -->
