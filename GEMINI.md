# Project Rules & Guidelines for Z-Systems (d:\zn)

## 1. Strict Build & Push Rule
- **NEVER** run `npm run build` or any production bundle build command automatically unless the user explicitly commands it (e.g. "رن بيلد", "اعمل بيلد وبوش", "build").
- **NEVER** run `git push` automatically unless the user explicitly requests it (e.g. "اعمل بوش", "بوش للـ main", "push").

## 2. Arabic & RTL UI
- RTL layout by default for Arabic UI elements (`dir="rtl"`).
- Chat responses wrapped in `<div dir="rtl">...</div>`.

## 3. Consultation Mode
- If user prompt contains `?` or `؟`, act purely as advisor without running modifying code or execution commands until instructed with "نفذ".

## 4. UI & Design System Consistency (Z-Systems Visual Constitution)
- **Full Width & Grid Standard**:
  - NEVER restrict internal settings or dashboard pages with narrow arbitrary wrappers (`max-width: 800px` or `1000px`). All pages must stretch naturally to the full responsive container width matching `settings/core` (Image 1) and `settings/reference` (Image 4).
  - Use balanced symmetrical 2-column cards (`display: grid; grid-template-columns: 1fr 1fr; gap: 16px;`) or full-width stacked cards.
- **Clean Enterprise Cards & No Dark Banners**:
  - The canvas is always the clean system background (`#f8fafc` or `#f1f5f9`).
  - Cards are always crisp white (`#ffffff`), subtle borders (`1px solid #e2e8f0` or `#e5e7eb`), rounded corners (`12px` to `16px`), and soft subtle shadows.
  - **NEVER insert dark black, obsidian, or heavy gradient banners inside internal ERP dashboard/settings pages**. Internal pages must be bright, clean, institutional ERP SaaS.
- **Buttons & Brand Colors**:
  - Primary action buttons: deep royal navy (`#170e5e`), matching the "حفظ الإعدادات" button in `settings/core`.
  - Clean input fields with clear labels above them matching the system standard.

## 5. System Capability Verification Rule (سجل قدرات النظام ومنع تكرار الميزات)
- **ممنوع نهائياً** اقتراح ميزات أو التخمين بوجود أو عدم وجود ميزة من الذاكرة أو تقديم اقتراحات لميزات معمولة بالفعل عند سؤال المستخدم عن "ما ينقص النظام".
- **قاعدة التحديث الإلزامي:** أي ميزة أو شاشة أو منطق جديد يتم إضافته أو تعديله في النظام يجب فوراً توثيقه وتحديث حالته ونسبته وملفاته في `SYSTEM_CAPABILITIES.md`.

## 6. Infrastructure & Deployment Environment (سيرفر أوراكل حصرياً - Oracle Cloud VPS)
- تم نقل المنظومة بالكامل (Frontend, Backend, Database - PostgreSQL) إلى سيرفر **Oracle Cloud VPS** (لا وجود لهوستنجر نهائياً).
- ممنوع نهائياً البحث أو الرجوع إلى أي ملفات أو إعدادات قديمة تخص هوستنجر (Hostinger). المرجع الوحيد لبيئة الإنتاج السحابية وقواعد البيانات هو سيرفر أوراكل.

## 7. Strict UI Icon & Clean Enterprise Policy (حظر الأيقونات الكرتونية والإيموجيز نهائياً)
- **ممنوع نهائياً وبشكل قاطع** إضافة أو استخدام أي إيموجيز أو رموز كرتونية (مثل 📦, 🚚, 💰, ⚠️, ❌, ✅, ⭐, إلخ) في أي واجهة مستخدم (سواء صفحة قديمة يتم تعديلها أو صفحة ومكون جديد يتم إنشاؤه، وسواء في النصوص أو الأزرار أو الإشعارات).
- **الاستبدال الحصري بالأيقونات الرسمية:** يتم استخدام أيقونات SVG بريميوم موحدة واحترافية حصرياً من مكتبة `@/shared/components/icons/AppIcons` عند الحاجة الوظيفية والملحة للأيقونة فقط.
- **الاعتماد على النصوص والتصميم المؤسسي:** في حال عدم وجود ضرورة ملحة للأيقونة، يُعتمد على نصوص واضحة ومباشرة وتصميم مؤسسي نظيف (Enterprise SaaS) متوافق مع دستور النظام البصري.
- **قائمة الصفحات المطهرة:** الصفحات والمكونات التي تم تطهيرها وتوثيقها في `SYSTEM_CAPABILITIES.md` تعتبر منتهية ومعتمدة (0 Emojis) بنسبة 100%، ولا يجوز إعادة مسحها أو فحصها أو إضافة أي رموز غير قياسية إليها مستقبلاً.

## 8. Strict Multi-Tenant Isolation & Zero-Mock Data Policy (عزل المستأجرين الصارم وحظر البيانات الوهمية نهائياً)
- **عزل السوبر أدمن ومنصة الساس:**
  - رتبة `super_admin` مخصصة حصرياً وفقط لمنصة الإدارة المركزية (`zs` أو `default` أو `dev-tenant` أو المعرف في `PLATFORM_TENANT_ID`).
  - يُمنع نهائياً وبشكل قاطع إنشاء أي مستخدم في أي شركة مستضافة (Tenant) برتبة `super_admin` أو السماح له برؤية لوحة إدارة المشتركين أو مسارات `/saas-admin/*`، ويجب أن تكون رتبة مالك المنشأة المستضافة دائماً `admin`.
  - أي فحص برمجي للوصول لصلاحيات المنصة المركزية بالباك إند أو الفرونت إند يجب أن يشترط فحصاً مزدوجاً: الرتبة `role === 'super_admin'` + كون الشركة هي منصة الإدارة المركزية `isPlatformTenant`.
- **حظر البيانات والنسب الوهمية (Zero-Mock Policy):**
  - يُمنع منعاً باتاً وضع أي قيم افتراضية وهمية (Mock Fallbacks) مثل أرقام مبيعات أو نسب تحصيل افتراضية في شاشات الإحصائيات أو الداشبورد أو الرسوم البيانية عند صفرية المبيعات.
  - في حال عدم وجود عمليات، يجب دائماً عرض حالة فارغة مؤسسية نظيفة (Enterprise Empty State) بدون أي أرقام مضللة.

## 9. Strict No-Tailwind Policy & Universal Modal Standard (حظر كلاسات تيلويند ومعيار النوافذ المنبثقة الصارم)
- **حظر كلاسات Tailwind نهائياً:**
  - مكتبة Tailwind CSS **غير مثبتة وغير مفعلة** في هذا المشروع، واستخدام كلاساتها (مثل `p-6`, `space-y-4`, `flex`, `grid-cols-2`, `px-3`, `py-1`, `border-slate-200`) يفشل بصمت ويجعل النوافذ متآكلة الأطراف (`0px padding`) والأزرار كلاسيكية وبدائية بدون تنسيق.
  - جميع التنسيقات يجب أن تعتمد حصرياً على كلاسات النظام الأساسية في ملفات الـ CSS أو على `style={{ ... }}` المباشرة المحكمة.
- **معيار النوافذ المنبثقة الصارم (Zero-Clipping Standard):**
  - **ممنوع نهائياً** استخدام overlays يدوية مثل `fixed inset-0`، بل يُستخدم حصرياً المكون القياسي الموحد `DialogShell` (من `@/shared/components/dialog-shell`) أو `StandardDialog` (من `@/shared/components/StandardDialog`).
  - كل نافذة منبثقة يجب أن تحتوي على:
    1. هيدر قياسي `.standard-dialog-header` يحتوي على عنوان النافذة `.standard-dialog-title` مع الخط الكحلي المميز (`#170c5c`) ووصف توضيحي `.standard-dialog-subtitle` وزر إغلاق رسمي `.standard-dialog-close-btn` بأيقونة `<XIcon size={18} />`.
    2. جسم النافذة `.standard-dialog-body` بمسافات داخلية محكمة وشبكة حقول متناسقة.
    3. فوتر قياسي `.standard-dialog-footer` بأزرار مؤسسية منسقة (زر الإلغاء الرمادي `secondary` وزر الإجراء الكحلي الأساسي `#170e5e`).
  - النموذج المرجعي القياسي المعتمد للنوافذ هو: `frontend/src/shared/components/StandardModalExample.tsx`.

## 10. Strict Typography Hierarchy Standard (دستور التيبوجرافي القياسي وأحجام الخطوط الموحدة)
- **ممنوع نهائياً وبشكل قاطع** استخدام أحجام خطوط عشوائية أو عناوين متضخمة تكسر التناسق المؤسسي.
- المنظومة تعتمد سلماً هرمياً صارماً وموحداً للتيبوجرافي (Typography Hierarchy) معرفاً عبر متغيرات الـ CSS (`base.css`):
  1. **عنوان الصفحة الرئيسي (Page Title - H1 / `.page-header-title`):**
     - الحجم: `var(--font-page-title)` = `1.15rem` (18.4px) | الوزن: `800` (Extra Bold) | اللون: `#0f172a` | ارتفاع السطر: `1.25`.
  2. **عنوان القسم أو البطاقة (Section / Card Title - H2, H3 / `.section-title`):**
     - الحجم: `var(--font-section-title)` = `0.98rem` (15.6px) | الوزن: `700` (Bold) | اللون: `#1e293b` | ارتفاع السطر: `1.35`.
  3. **العنوان الفرعي والوصف التوضيحي (Subtitle / Description - `.page-header-description`):**
     - الحجم: `var(--font-subtitle)` = `0.8125rem` (13px) | الوزن: `400` (Regular) | اللون: `#64748b` | ارتفاع السطر: `1.5`.
  4. **هيدر وأعمدة الجداول (Table Headers - `thead th`, `th`):**
     - الحجم: `var(--font-table-head)` = `0.78rem` (12.5px) | الوزن: `600` (Semi-Bold) | اللون: `#475569` | الخلفية: `#f8fafc` | الحشو: `10px 14px`.
  5. **نصوص وخلايا الجداول والمدخلات (Body / Table Cells / Inputs - `td`, `input`):**
     - الحجم: `var(--font-body)` = `0.8125rem` (13px) | الوزن: `500` - `600` | اللون: `#0f172a`.
  6. **الشارات والحالات والكبسولات (Badges / Status Pills - `.badge`, `.nav-pill`):**
     - الحجم: `var(--font-badge)` = `0.72rem` (11.5px) | الوزن: `600` (Semi-Bold) | الحشو: `3px 8px`.
  7. **التلميحات والنصوص المصغرة والباركود (Micro-copy / Captions - `small`, `.text-micro`):**
     - الحجم: `var(--font-micro)` = `0.6875rem` (11px) | الوزن: `500` | اللون: `#94a3b8`.

## 11. Strict Single Source of Truth & Zero-Duplicate Modals Policy (حظر تكرار النوافذ البرمجية ومبدأ المكون الموحد الشامل)
- **ممنوع نهائياً وبشكل قاطع** إنشاء نسختين متباينتين أو ملفين منفصلين لأي نافذة منبثقة (Modal/Dialog) تؤدي نفس الوظيفة التشغيلية أو تشترك في نفس الفلسفة (مثل إضافة وتعديل بنود المقايسة، أو إدارة عروض الأسعار، أو الحاويات).
- **المكون الموحد الشامل (Universal Unified Component):**
  - يتم بناء مكون منبثق واحد مشترك (`Universal Modal`) يعتمد على محدد النمط (`mode: 'master' | 'project'` أو السياق التشغيلي).
  - أي زر إضافة أو تعديل في أي صفحة أو تبويب يستدعي حصرياً نفس المكون الموحد بدون كتابة كود مكرر.
  - أي تحسين أو تعديل هندسي أو بصري في نافذة البنود (مثل بطاقة التسعير التفاعلية، حساب هامش الربح، التوليد التسلسلي للأكواد) يصب فوراً وتلقائياً في كافة الشاشات والتبويبات المتصلة دون الحاجة لتكرار الكود.

## 12. Strict Multi-line Text Justification Standard (دستور الضبط المتوازي للنصوص والمواصفات الطويلة - Justify Standard)
- **قاعدة عامة إلزامية على مستوى النظام بالكامل:**
  - عند وجود نصوص مطولة، فقرات متعددة الأسطر، أو مواصفات هندسية وبيان أعمال وبنود تعاقدية وشروط فنية وملاحظات ميدانية (مثل عمود "بيان الأعمال والمواصفات" في جداول المقايسة SOV، ومواصفات البنود في بنك البنود المرجعي، وشروط عروض الأسعار، ويوميات الموقع):
    1. **الضبط المتوازي الكامل للأسطر (Full Text Justification):**
       - يجب دائماً تطبيق التنسيق المتوازي للأسطر:
         `text-align: justify; text-justify: inter-word; text-align-last: start;`
       - أو استخدام الكلاسات القياسية المعتمدة في النظام: `.text-justify` أو `.spec-description`.
    2. **ارتفاع السطر المريح ومحاذاة السطر الأخير:**
       - اعتماد `line-height: 1.55` إلى `1.6` مع `word-break: break-word` و `white-space: normal`.
       - ضبط `text-align-last: start` لضمان انتهاء السطر الأخير طبيعياً في اليمين (في بيئات RTL) دون أي تمطيط مشوه للكلمات أو الحروف.
    3. **الغاية الهندسية والبصرية:**
       - القضاء التام على التعرج العشوائي (Ragged Edges) في نهايات السطور اليسرى.
       - ملء عرض العمود أو البطاقة بتناسق هندسي مستقيم على الحافتين، مما يضفي مظهراً وثائقياً مؤسسياً متزناً كالمطبوعات الاستشارية والتقارير التنفيذية الكبرى.
    4. **معيار الاتجاه التلقائي ثنائي اللغة (Bidirectional Text Standard - English LTR / Arabic RTL):**
       - عند عرض نصوص أو مواصفات باللغة الإنجليزية: يجب دائماً تحديد `dir="ltr"` مع ضبط محاذاة السطر الأخير لليسار `text-align-last: left; direction: ltr;`.
       - عند عرض نصوص أو مواصفات باللغة العربية: يُعتمد `dir="rtl"` مع محاذاة السطر الأخير لليمين `text-align-last: right; direction: rtl;`.
       - استخدام الدالة القياسية الموحدة `getTextDirection(text)` من `@/lib/arabic-normalization` لتحديد الاتجاه ديناميكياً بدقة دون أي تخمين يدوي.

## 13. Strict Centralized Combobox & Dropdown Standard (دستور القوائم المنسدلة الموحد وحظر عناصر select التقليدية)
- **حظر عناصر HTML المنسدلة التقليدية البدائية (`<select>`):**
  - **ممنوع نهائياً وبشكل قاطع** استخدام عناصر `<select>` التقليدية في أي شاشة أو نافذة منبثقة (سواء قديمة يتم تحديثها أو شاشات جديدة يتم إنشاؤها).
  - استخدام الـ native select يشوه المظهر المؤسسي، ويفشل في دعم البحث والتصفية، ولا يتناسب مع معايير الـ UI البريميوم للمنظومة.
- **الاعتماد الحصري على نظام الكومبوبوكس الموحد (Single Source of Truth):**
  - **ملف التنسيق الأساسي:** `frontend/src/styles/partials/combobox-system.css` (يحتوي على كافة متغيرات الألوان، البوردر، الشادو، وحسابات الـ Slim Scrollbar وقوائم الخيارات).
  - **المكون البرمجي العام المعتمد:** المكون القياسي `CustomSelect` من `@/shared/ui/custom-select`.
- **المعايير التشغيلية والوظيفية الإلزامية لأي قائمة منسدلة:**
  1. **البحث والتطبيع اللحظي:** تفعيل البحث السريع مع معالجة وتطبيع الحروف العربية والإنجليزية (`matchesArabic`) لسهولة وسرعة الوصول للعناصر.
  2. **الهوية البصرية للمنظومة:** نصوص كحلية ملكية (`#170e5e` أو `#170c5c`)، وزن خط عريض متزن (`fontWeight: 600` أو `700`)، وحواف دائرية أنيقة (`borderRadius: 8px`).
  3. **عزل ودعم طبقات التراكب (Z-Index Isolation):** ضبط حاوية المكون لرفع الـ `z-index` تلقائياً عند فتح القائمة، لضمان طفو الخيارات بانسيابية فوق كافة البطاقات والحقول المجاورة دون أي انقطاع بصري.
  4. **الشارات والأوصاف التوضيحية (Hints & Badges):** استخدام خاصية `hint` أو البادجات الجانبية التوضيحية لعرض أكواد الأصناف أو مسميات الباقات والمودات القطاعية بتناسق هندسي متزن.

## 14. Strict SaaS vs Electron Architectural Boundary & Core Safety Constitution (دستور العزل المعماري الصارم وحظر خلط المنطق السحابي والمحلي)
- **المرجع الدستوري الإلزامي:** ملف `SAAS_ELECTRON_ISOLATION_CONSTITUTION.md` هو المرجع السيادي غير القابل للمساس.
- **العزل المطلق بين البيئات:**
  - بيئة الساس السحابية (`APP_MODE=CLOUD_SAAS` على سيرفر أوراكل) هي بيئة متعددة المستأجرين (Multi-Tenant) كاملة. **ممنوع منعاً باتاً** كتابة أي كود يخص الديسكتوب، أو حصر البحث في تينانت محلي، أو استبعاد تينانت المنصة المركزي (`zs`).
  - بيئة الديسكتوب (`APP_MODE=SELF_CONTAINED` أو `IS_ELECTRON=true`) معزولة تماماً في موديولها المحلي ولا تتدخل في كود التوثيق العام أو مسارات السيرفر المركزي.
- **حرمة حساب المنصة المركزي (`zs` / Super Admin):**
  - مستخدم المنصة المركزي `zs` يجب أن يظل متاحاً للتسجيل والمصادقة وإدارة المشتركين السحابيين دائماً وأبداً.
- **حظر المساس بالثوابت الجوهرية:**
  - ممنوع تعديل أو حذف الثوابت المالية والمحاسبية (Double-entry ledgers)، عزل بيانات المستأجرين (`tenant_id`)، أو تشفير كلمات المرور.

## 15. Strict Workspace Keep-Alive & Anti-Flicker Architecture Standard (دستور بيئات العمل التفاعلية ومنع وميض وتصفير العدادات)
- **المشكلة الهندسية المحظورة (The Anti-Pattern):**
  - عند بناء أو صيانة شاشات وبيئات العمل الكبرى متعددة التابات (مثل الشحن واللوجستيات، المقاولات، الحسابات، الموارد البشرية):
  - **يُمنع منعاً باتاً** تسجيل التابات في الـ Router كمسارات مستقلة تعيد تغليف وهدم وبناء الـ Layout والـ Context Provider مع كل نقرة (`Unmount / Remount cycle`).
  - هذا النمط الخاطئ يؤدي إلى:
    1. هدم الـ Context وإعادة تصفير العدادات الإحصائية والشارات الرقمية (`Counts reset to 0`) ثم عودتها بعد ثوانٍ، مما يسبب رعشة بصرية مزعجة (Badge Flicker) تشوه الاحترافية.
    2. إعادة تشغيل طلبات الـ API ومؤشرات التحميل وفقدان مدخلات المستخدم اللحظية في التبويب السابق.
- **المعايير المعمارية الإلزامية لأي موديول متعدد التابات (Mandatory Standards):**
  1. **مسار بيئة العمل الموحدة (Single Unified Workspace Route):**
     - تسجيل مسار رئيسي وفرعي نجمي (`path: 'workspace'` و `path: 'workspace/*'`) يشيران إلى نفس المكون الموحد (`WorkspaceLazy`).
     - يظل الـ Layout والـ Provider حياً ومثبتاً في شجرة React طوال فترة تصفح المستخدم لأقسام الموديول.
  2. **التابات المحفوظة بالذاكرة (Keep-Alive Pattern via CSS Display):**
     - يتم تبديل التابات حصرياً عبر خاصية العرض `style={{ display: isTabActive(tabId) ? 'block' : 'none' }}`.
     - التبديل يصبح فورياً وبزمن استجابة **0 مللي ثانية** مع الحفاظ التام على محتوى ونماذج التابات بدون إعادة بناء الـ DOM.
  3. **التخزين المؤقت اللحظي للعدادات (Memory & Session Hydration):**
     - أي Context يدير مؤشرات أو عدادات رقمية للتابات يجب ألا يبدأ أبداً بالصفر عند التنقل أو إعادة تحميل الصفحة إذا كانت البيانات معروفة مسبقاً.
     - اعتماد كاش الذاكرة (`memoryCachedCounts`) والمزامنة مع `sessionStorage` لقراءة الأرقام فوراً وتجنب ظهور الرقم صفر أثناء انتظار ردود السيرفر.
  4. **التحديث الهادئ في الخلفية (Silent Background Revalidation):**
     - عند استدعاء دوال التحديث مثل `refreshCounts()`، يتم جلب البيانات في الخلفية بهدوء وتحديث القيم مباشرة دون تصفيرها أو إظهار شاشات انتظار وسيطة تقطع عمل المستخدم.

## 16. Strict Universal 1280px Container & Zero-Jumping Standard (دستور عرض الشاشات القياسي 1280px وحظر تذبذب العرض نهائياً)
- **العرض القياسي الإلزامي (1280px Universal Width):**
  - العرض المعتمد والنهائي لكافة الشاشات وبيئات العمل والتابات الداخلية في المنظومة هو **1280px** كحد أقصى ثابت (`max-width: 1280px; width: min(100%, 1280px); margin: 0 auto;`).
  - يُمنع منعاً باتاً تمدد الشاشة إلى ما لا نهاية أو اختلاف العرض عند التنقل بين التابات داخل نفس الموديول.
- **منع تذبذب العرض عند تبديل التابات (Zero Width-Jumping via CSS Grid Sub-tracks):**
  - في حاويات CSS Grid أو الأعمدة الرئيسية، يجب دائماً استخدام `grid-template-columns: minmax(0, 1fr);` مع `min-width: 0` لجميع الحاويات الفرعية والتابات.
  - وجود جداول عريضة (مثل جداول المقايسة أو سجل المشاريع) يجب ألا يفرض على الحاوية الأب التمدد خارج نطاق الـ 1280px، بل تحتفظ الصفحة بعرضها الهندسي الثابت وتتعامل الجداول داخلياً عبر الضغط الذكي للأعمدة أو التمرير الأفقي المحصور داخل بطاقتها فقط (`overflow-x: auto`).
- **ضغط الجداول والعناوين المؤسسية (Card Fitting & Tight Headers):**
  - في الجداول متعددة الأعمدة (مثل سجل المشاريع)، يتم اختصار العناوين الطويلة للأعمدة (مثل: `التعاقد الأصلي`, `القيمة المعدلة`, `المشروع والموقع`) وضبط الـ padding الأفقي (مثلاً `8px` إلى `10px`) مع نسب عرض دقيقة بالأعمدة عبر `<colgroup>` لضمان احتواء كافة الأعمدة وأزرار الإجراءات داخل بطاقة الجدول بنسبة 100% بدون أي قص (0px clipping).

## 17. Strict Stable-Sizing & Anti-Ballooning Modal Standard (دستور ثبات أبعاد النوافذ المنبثقة ومنع التمدد أو الانكماش الفجائي)
- **المشكلة البرمجية المحظورة (The Ballooning & Shrinking Anti-Pattern):**
  - عند فتح النوافذ المنبثقة ومربعات الحوار (Modals / Dialogs):
    1. **التمدد الفجائي على مرحلتين (Open Small then Balloon):** فتح النافذة بحجم صغير جداً (~200px) نتيجة بدء الـ state بـ `loading: false` قبل جلب البيانات، ثم قفزها وتضخمها المفاجئ للأعلى والأسفل إلى 700px بمجرد وصول بيانات السيرفر، مما يعطي إحساساً رديئاً بأنها تفتح على مرحلتين.
    2. **الانكماش المفاجئ (Open Big then Shrink):** فتح النافذة بهيكل أو مساحة تحميل ضخمة، ثم انهيارها وانكماشها المفاجئ عند خلو البيانات أو قلة السطور.
- **المعايير المعمارية الإلزامية لكافة النوافذ المنبثقة:**
  1. **التحديد المسبق للحد الأدنى للأبعاد (`minHeight` و `width`):**
     - كل نافذة منبثقة تجلب بيانات أو تحتوي على جداول أو بطاقات مؤشرات رقمية يجب أن تحدد مسبقاً خاصية `minHeight` متزنة (مثل `minHeight="min(560px, 85vh)"` و `width="min(1080px, 95vw)"`).
     - المكون الأساسي `StandardDialog` و `DialogShell` يفرضان هذا الارتفاع مسبقاً لتفتح النافذة بأبعادها النهائية فوراً.
  2. **البدء بحالة التحميل الصريحة (`loading: true`):**
     - إذا كانت النافذة تعتمد على طلب API عند الفتح، يجب تهيئة الـ state بـ `useState(true)` لضمان عدم رسم حالة الفراغ في الفريم الأول (Frame 0).
  3. **مؤشر التحميل السلس المتمركز (Centered Smooth Spinner):**
     - أثناء انتظار البيانات، يُعرض سبينر التحميل المعتمد في المنتصف تماماً مع حاوية متمددة (`flex: 1; align-items: center; justify-content: center;`) تملأ الارتفاع المخصص بهدوء.
  4. **حماية بطاقات المؤشرات (KPI Cards Guard):**
     - يُمنع وميض الأصفار (`0`) أو القيم غير المكتملة في بطاقات المؤشرات المالية والرقمية أثناء التحميل؛ بل يُعرض رمز الشرطة الهادئ (`—`) حتى استقرار القيم الحقيقية.

### 18. Strict Zero-Native-Alert Standard & Universal System Toast Constitution (دستور حظر الـ alert البدائي واعتماد التوست المؤسسي الموحد)
- **الحظر الصارم للـ `window.alert` الخام والرسائل البدائية (Zero-Native-Alert Standard):**
  - **ممنوع نهائياً وبشكل قاطع** استخدام دالة `window.alert(...)` أو `alert(...)` الخاصة بالمتصفح في أي شاشة، موديول، نافذة منبثقة، أو نموذج إدخال في كامل المنظومة.
  - ظهور مربع الحوار الرمادي الافتراضي للمتصفح مصحوباً بعبارة `localhost says` أو اسم الدومين يُعتبر خرقاً خطيراً لدستور النظام البصري ولمعايير الـ Enterprise SaaS، لأنه يجمد الواجهة (UI Freezing) ويقطع سير عمل المستخدم بصورة منفّرة وبدائية.
- **المعيار الهندسي المعتمد للرسائل التفاعلية (Single Source of Truth for Feedback):**
  1. **إشعارات وتأكيدات العمليات العابرة (Success / Info / Warning Toasts):**
     - الاعتماد الحصري على منظومة التوست الموحدة من `@/shared/components/system-alert`:
       - للنجاح: `toast.success('تم حفظ التعديلات بنجاح', 'عنوان اختياري')`
       - للخطأ: `toast.error('فشل تنفيذ العملية', 'تفاصيل الخطأ')`
       - للتحذير: `toast.warning('يرجى استكمال البيانات المطلوبة')`
       - للمعلومة: `toast.info('إشعار للمستخدم')`
     - تظهر كبسولة التوست في أعلى منتصف الشاشة (`top: 24px`) بتنسيق مؤسسي راقٍ وأنيق يتوافق تماماً مع محاذاة اللغة العربية (RTL) وحدود ملونة هادئة وأيقونات SVG رسمية من `@/shared/components/icons/AppIcons`، وتختفي تلقائياً بعد 3.5 إلى 5 ثوانٍ دون الحاجة لمقاطعة عمل المستخدم.
  2. **التأكيدات الحساسة والعمليات المصيرية (Critical Confirmations & Zero-Native-Confirm):**
     - **ممنوع نهائياً** استخدام `window.confirm(...)` أو `confirm(...)` البدائية التي يظهر معها مربع المتصفح الرمادي.
     - البديل القياسي المعتمد هو محرك التأكيد اللحظي `await systemConfirm({ title, message, confirmText, cancelText, variant })` المصدّر من `@/shared/components/system-alert`، أو المكون المؤسسي `ActionConfirmDialog` / `StandardDialog` بتصميم النظام الكحلي `#170e5e` دون اللجوء لأي نوافذ متصفح خام نهائياً.
  3. **درع الحماية التلقائي المزدوج (Dual Global Alert & Confirm Interceptor Shield):**
     - يوفر مزود المنظومة المركزي `SystemAlertProvider` في جذر المنظومة (`app/providers.tsx`) درع حماية شامل يقوم تلقائياً بالتقاط وتحويل أي استدعاء قديم أو غير مقصود لـ `window.alert` أو `window.confirm` إلى توست مؤسسي أو نافذة تأكيد فورية دون أي تجميد للشاشة.
     - ربط المحرك بكائن `window` العام (`window.__ZS_GLOBAL_CONFIRM__`) وحظر وجود أي fallback يستدعي دوال المتصفح الخام نهائياً لضمان الصمود أمام أي Vite HMR أثناء التطوير.

