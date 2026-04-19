# Windows Easy-Run Layer Plan (No Electron) + Dual Runtime Modes

## الهدف
إضافة طبقة تشغيل سهلة على ويندوز (Launcher + Installer) فوق نفس الكودbase الحالي،
مع دعم **وضعين تشغيل رسميين** من نفس المشروع بدون fork:
1) `offline` لنسخة العميل المحلية
2) `online` لنسخة الاستضافة/الهوست

## مبادئ التنفيذ
1. لا تعديل معماري على backend/frontend.
2. لا fork ولا codebase منفصل.
3. التبديل بين الوضعين يتم من خلال `.env` فقط.
4. الحفاظ على offline scripts الحالية وعدم كسرها.
5. عدم hardcode سلوك يمنع hosted mode مستقبلًا.

---

## تصميم أوضاع التشغيل

### متغير التحكم الرئيسي
- `APP_MODE=offline|online`

### السلوك العام حسب الوضع
- **offline**:
  - DB داخل `docker-compose.offline.yml` (service: `postgres`).
  - migrations تلقائية عند التشغيل.
  - لا اعتماد على Supabase أو أي DB خارجية.
- **online**:
  - DB خارجية/مستضافة (VPS/Cloud/Managed PG).
  - نفس التطبيق، نفس build، نفس modules.
  - يظل قابل للتشغيل عبر `docker-compose.prod.yml` أو deployment لاحق.

---

## أقل env variables مطلوبة للتبديل

### مشتركة (الحد الأدنى)
- `APP_MODE=offline|online`
- `NODE_ENV=production`
- `APP_HOST`
- `APP_PORT`
- `SESSION_CSRF_SECRET`

### DB (مطلوبة في الوضعين)
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `DATABASE_SSL_CA_CERT` (اختياري حسب مزود DB)

---

## قواعد Guard لمنع أخطاء الإعدادات (بدون كسر hosted mode)

### Offline guards
- إذا `APP_MODE=offline`:
  - `DATABASE_HOST` لازم يكون `postgres` (داخل compose offline).
  - `DATABASE_SSL=false` افتراضيًا.
  - رفض أي إعداد host خارجي بالخطأ في launcher/install.

### Online guards
- إذا `APP_MODE=online`:
  - السماح بـ `DATABASE_HOST` خارجي.
  - السماح/توقع `DATABASE_SSL=true` حسب الاستضافة.
  - التحقق من وجود env الأساسية قبل الإقلاع.

### Guards عامة
- فشل مبكر برسالة واضحة لو env ناقصة/متضاربة.
- بدون أي guard يمنع online mode طالما env صحيحة.

---

## كيف نحافظ على offline scripts الحالية؟
- `scripts/offline/*` تظل كما هي (install/start/stop/backup/restore/upgrade/rollback).
- إضافة فحص خفيف داخل launcher فقط للتأكد من `APP_MODE=offline`.
- عدم تغيير واجهة الأوامر الحالية حتى لا نكسر التشغيل عند العملاء.

---

## كيف يظل باب الاستضافة مفتوحًا؟
- نفس backend/frontend يشتغلان في online بمجرد `.env` مناسبة.
- `docker-compose.prod.yml` يظل مسار الاستضافة الرسمي.
- لا يوجد branch أو fork منفصل لنسخة الاستضافة.

---

## الخطة التنفيذية (خطوات صغيرة قابلة للمراجعة)

### Step 1 — Mode contract + env documentation (Plan/Docs first)
**المخرجات:**
- توثيق `APP_MODE` وقيم env المطلوبة لكل mode.
- جدول واضح offline vs online.

### Step 2 — Config guards implementation
**المخرجات:**
- validation واضحة في startup (offline/online rules).
- رسائل خطأ مفهومة للمشغل.

### Step 3 — Windows launcher (offline UX)
**المخرجات:**
- `windows/Start-ZS.bat` / `windows/Stop-ZS.bat`
- يتحقق من `APP_MODE=offline` ويشغّل stack وي فتح المتصفح.

### Step 4 — Inno Setup installer
**المخرجات:**
- installer مع shortcuts (Start/Stop)
- بدون أوامر ترمنال للعميل قدر الإمكان.

### Step 5 — Offline/Online smoke checklist
**المخرجات:**
- checklist تحقق:
  - offline local PG يعمل
  - online external PG يعمل
  - نفس الكودbase بدون fork

---

## نقاط تحتاج موافقتك قبل التنفيذ
1. نعتمد `APP_MODE` كاسم رسمي؟
2. في offline نثبت `DATABASE_HOST=postgres` بشكل صارم؟
3. نضيف ملفين env جاهزين:
   - `.env.offline.example`
   - `.env.online.example` ؟
