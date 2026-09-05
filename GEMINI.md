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
- **يجب دائماً** مراجعة وفحص الملف المرجعي الموحد: `SYSTEM_CAPABILITIES.md` (والكود الفعلي) لمعرفة حالة كل وحدة وما تم إنجازه بنسبة 100% وما هو جزئي وما هو غير موجود فعلاً.
- **قاعدة التحديث الإلزامي:** أي ميزة أو شاشة أو منطق جديد يتم إضافته أو تعديله في النظام يجب فوراً توثيقه وتحديث حالته ونسبته وملفاته في `SYSTEM_CAPABILITIES.md`.

