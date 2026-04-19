# Windows Easy-Run Layer Plan (No Electron)

## الهدف
إضافة طبقة تشغيل سهلة على ويندوز (Launcher + Installer) فوق المعمارية الحالية بدون تغيير جوهري في السورس،
**ومعها نسخة Offline مستقلة 100% عن Supabase أو أي خدمة خارجية**.

## مبادئ التنفيذ
1. لا تعديل معماري على backend/frontend.
2. الحفاظ على كل offline scripts الحالية كما هي.
3. أي إضافة جديدة تكون wrapper فوق `scripts/offline/*`.
4. الاستمرار في دعم التطوير من السورس (dev workflow لا يتأثر).
5. نسخة العميل Offline لا تعتمد على أي DB/Auth/Storage خارجي.

---

## نطاق النسخة المستهدفة (MVP)
- زر تشغيل عبر **دبل كليك**.
- زر إيقاف عبر **دبل كليك**.
- فحص Docker Desktop وتشغيله لو غير شغّال.
- تشغيل stack offline الحالي.
- فتح المتصفح تلقائيًا على رابط البرنامج.
- Installer لويندوز (Inno Setup) يعمل shortcuts (Desktop + Start Menu).
- PostgreSQL محلية داخل نفس Docker stack للعميل.
- أول تشغيل يجهز DB محليًا تلقائيًا (بدون إعداد يدوي من العميل).

---

## استقلال نسخة العميل Offline عن Supabase (صريح)

### 1) أين ستعمل PostgreSQL بالضبط؟
- داخل خدمة `postgres` في `docker-compose.offline.yml` على جهاز العميل نفسه.
- البيانات محفوظة محليًا في Docker volume (`pgdata_offline`).
- لا اتصال بأي PostgreSQL خارجي (Supabase أو غيره) في مسار Offline.

### 2) كيف سيتم إنشاء قاعدة البيانات أول مرة؟
- عند `offline:install`:
  1) Docker compose يشغّل خدمة `postgres` المحلية.
  2) backend يبدأ ويشغّل migrations تلقائيًا (`npm run migration:run`) قبل التشغيل.
  3) يتم تجهيز schema بالكامل وتصبح النسخة جاهزة للاستعمال.

### 3) كيف سيتم تمرير env الخاصة بنسخة العميل؟
- من ملف محلي فقط: `.env.offline`.
- يتم توليده أول مرة من `.env.offline.example` عبر launcher/install script.
- القيم تكون local-only (مثل `DATABASE_HOST=postgres`) بدون أي secrets خارجية.

### 4) ما الذي سيتغير تحديدًا لإلغاء Supabase من نسخة العميل؟
- إضافة **Offline Env Guard** في plan التنفيذ:
  - منع أي `DATABASE_HOST` خارجي في offline mode.
  - حصر الاتصال بقاعدة البيانات على service name الداخلي `postgres`.
- مراجعة ملفات env/examples/runbooks لتكون local-only صراحة.
- إضافة checklist release تمنع تمرير أي remote DB secrets في حزمة العميل.

### 5) هل يوجد أي كود ما زال يعتمد على remote DB/auth/storage؟
- في نطاق الخطة: سنضيف **audit step** قبل التنفيذ:
  - فحص شامل لأي متغيرات أو clients مرتبطة بخدمات خارجية في مسار Offline.
  - توثيق النتيجة في تقرير صغير (pass/fail) قبل بناء installer.
- القاعدة المستهدفة: Offline client = صفر اعتماد runtime على remote DB/Auth/Storage.

---

## الخطة التنفيذية (خطوات صغيرة قابلة للمراجعة)

### Step 1 — Windows launcher scripts (بدون installer)
**المخرجات:**
- `windows/Start-ZS.bat`
- `windows/Stop-ZS.bat`
- `windows/lib/*.ps1` (وظائف مشتركة)

**السلوك:**
- Start:
  1) التأكد من Docker Desktop (أو تشغيله)
  2) الانتظار لحد docker engine يبقى جاهز
  3) التحقق أن `.env.offline` local-only (بدون remote DB host)
  4) تشغيل `docker-compose.offline.yml` بنفس `.env.offline`
  5) التأكد من نجاح health endpoint
  6) فتح `http://127.0.0.1:8080`
- Stop:
  - تنفيذ down لنفس stack

**مراجعة:** تشغيل start/stop يدويًا على ويندوز بدون ترمنال معقد.

---

### Step 2 — Hardening للـ launcher UX
**المخرجات:**
- رسائل واضحة للمستخدم (نجاح/فشل)
- log files في `%ProgramData%\ZS\logs`
- timeout ورسائل مفهومة لو Docker فشل

**مراجعة:** تجربة حالات الفشل (Docker غير متثبت، بورت محجوز، إلخ).

---

### Step 3 — Inno Setup installer
**المخرجات:**
- `installer/windows/zs-offline.iss`
- إعداد packaging folder

**الوظائف:**
- نسخ الملفات اللازمة للتشغيل
- إنشاء shortcut:
  - Start ZS
  - Stop ZS
- إدراج prerequisites note (Docker Desktop required)
- إتاحة uninstall نظيف

**مراجعة:** build installer + install على VM ويندوز نظيفة.

---

### Step 4 — Update path (بدون كسر السورس)
**المخرجات:**
- `windows/Upgrade-ZS.bat` يلف على `offline:upgrade`
- تحديث الـ installer ليقدر يعمل upgrade in-place

**مراجعة:** ترقية من إصدار n إلى n+1 مع الحفاظ على البيانات.

---

### Step 5 — Offline independence audit + Documentation
**المخرجات:**
- `OFFLINE_SUPABASE_INDEPENDENCE_CHECKLIST.md`
- `WINDOWS_INSTALL_GUIDE.md`
- `WINDOWS_OPERATIONS_GUIDE.md`

**يتضمن:**
- بنود تحقق صريحة: لا remote DB / لا remote auth / لا remote storage
- التثبيت
- التشغيل
- الإيقاف
- التحديث
- troubleshooting

---

## قرار الأدوات
- Installer: **Inno Setup** (مفضل حسب طلبك).
- Launcher: Batch + PowerShell (بدون Electron).

## نقاط تحتاج موافقتك قبل التنفيذ
1. هل نقفل أول نسخة على Docker Desktop كـ prerequisite رسمي؟
2. هل رابط التشغيل الافتراضي يفضل `127.0.0.1:8080`؟
3. اسم المنتج الظاهر في Start Menu: `ZS Offline` ولا اسم آخر؟
