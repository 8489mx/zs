# Windows Easy-Run Layer Plan (No Electron)

## الهدف
إضافة طبقة تشغيل سهلة على ويندوز (Launcher + Installer) فوق المعمارية الحالية بدون تغيير جوهري في السورس.

## مبادئ التنفيذ
1. لا تعديل معماري على backend/frontend.
2. الحفاظ على كل offline scripts الحالية كما هي.
3. أي إضافة جديدة تكون wrapper فوق `scripts/offline/*`.
4. الاستمرار في دعم التطوير من السورس (dev workflow لا يتأثر).

---

## نطاق النسخة المستهدفة (MVP)
- زر تشغيل عبر **دبل كليك**.
- زر إيقاف عبر **دبل كليك**.
- فحص Docker Desktop وتشغيله لو غير شغّال.
- تشغيل stack offline الحالي.
- فتح المتصفح تلقائيًا على رابط البرنامج.
- Installer لويندوز (Inno Setup) يعمل shortcuts (Desktop + Start Menu).

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
  3) تشغيل `docker-compose.offline.yml` بنفس `.env.offline`
  4) فتح `http://127.0.0.1:8080`
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

### Step 5 — Documentation
**المخرجات:**
- `WINDOWS_INSTALL_GUIDE.md`
- `WINDOWS_OPERATIONS_GUIDE.md`

**يتضمن:**
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
