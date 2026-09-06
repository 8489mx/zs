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
  - رتبة `super_admin` مخصصة حصرياً وفقط لمنصة الإدارة المركزية (`default` أو `dev-tenant` أو المعرف في `PLATFORM_TENANT_ID`).
  - يُمنع نهائياً وبشكل قاطع إنشاء أي مستخدم في أي شركة مستضافة (Tenant) برتبة `super_admin` أو السماح له برؤية لوحة إدارة المشتركين أو مسارات `/saas-admin/*`، ويجب أن تكون رتبة مالك المنشأة المستضافة دائماً `admin`.
  - أي فحص برمجي للوصول لصلاحيات المنصة المركزية بالباك إند أو الفرونت إند يجب أن يشترط فحصاً مزدوجاً: الرتبة `role === 'super_admin'` + كون الشركة هي منصة الإدارة المركزية `isPlatformTenant`.
- **حظر البيانات والنسب الوهمية (Zero-Mock Policy):**
  - يُمنع منعاً باتاً وضع أي قيم افتراضية وهمية (Mock Fallbacks) مثل أرقام مبيعات أو نسب تحصيل افتراضية في شاشات الإحصائيات أو الداشبورد أو الرسوم البيانية عند صفرية المبيعات.
  - في حال عدم وجود عمليات، يجب دائماً عرض حالة فارغة مؤسسية نظيفة (Enterprise Empty State) بدون أي أرقام مضللة.


