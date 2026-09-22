# Z Systems Deployment Pipeline (Oracle Cloud VPS)

> ⚠️ **تنبيه حاسم:** المنظومة بالكامل (Frontend، Backend، Database - PostgreSQL) مستضافة وتعمل حصرياً على **سيرفر أوراكل (Oracle Cloud VPS)**. تم إنهاء استخدام أي استضافة أخرى نهائياً.

---

## 1. مرجع كود الإنتاج (Source of Truth)

يعتمد خط الإنتاج حصرياً على فرع رئيسي موحد:
```text
GitHub branch: main
```

- أي دمج (Merge) في فرع `main` يُطلق تلقائياً خط التحقق من الكود (`ci.yml`).
- فور نجاح فحوصات الـ CI (Build, Typecheck, Tests, Migrations, Env Safety)، يتم تفعيل خط النشر التلقائي (`deploy-oracle.yml`) بدون تدخل يدوي.

---

## 2. معمارية خط النشر المستمر المؤتمت (Automated CI/CD Workflow)

يعمل ملف `.github/workflows/deploy-oracle.yml` بالتسلسل التالي (منذ 22 سبتمبر 2026):

1. **الاعتماد على نجاح الـ CI:** لا يتم تنفيذ النشر إذا فشلت فحوصات الكود أو الاختبارات، ويُنشر نفس الـ commit الذي نجح في الـ CI بالضبط (`workflow_run.head_sha`).
2. **البناء على GitHub وليس على السيرفر:** يُبنى الباك إند (`nest build`) والفرونت إند (Vite) على جهاز GitHub، ويُحزَّم الناتج في `release.tgz` ويُرفع للسيرفر بـ `scp`.
   - **السبب:** السيرفر نواة واحدة و6 جيجا رام بلا Swap؛ البناء عليه كان يجمّد الكاشيرات لدقائق، وكان `rm -rf dist` قبل البناء يُسقط الباك إند طوال مدة البناء (سجّل PM2 أكثر من 1700 إعادة تشغيل فاشلة بخطأ `Cannot find module dist/main.js`).
   - متغيرات بناء الفرونت إند تأتي من GitHub Variables (`VITE_API_BASE_URL`, `VITE_CSRF_COOKIE_NAME`, `VITE_PLATFORM_TENANT_ID`) مع قيم افتراضية مطابقة لملف `frontend/.env.production` الموجود على السيرفر.
3. **على السيرفر:**
   - `git reset --hard <sha>` (المصدر مطلوب لأن الهجرات تعمل بـ `ts-node`).
   - `npm ci` للباك إند **فقط** إذا تغيّر `package-lock.json` (بصمة محفوظة في `node_modules/.zs-lock-hash`).
   - فك الحزمة في `/var/www/zsystems/.deploy-stage` ثم تشغيل الهجرات **قبل** تبديل الكود.
   - تبديل `backend/dist` و`frontend/dist` بعملية `mv` (النسخة السابقة تبقى في `dist.prev`).
4. **إعادة التحميل:** `pm2 reload zsystems-backend --update-env`.
5. **فحص الصحة مع رجوع تلقائي:** فحص `/api/health/live` و`/api/health/ready`؛ إن فشل تُعاد `dist.prev` للمكان ويُعاد تحميل PM2 ويفشل الإجراء.
6. **إعادة تحميل Nginx** ثم إشعار تليجرام.

> ملاحظة: `/var/www/zsystems/update.sh` القديم على السيرفر ما زال يبني على السيرفر نفسه — لا تستخدمه إلا للطوارئ.

### 2-b. النسخ الاحتياطي

- السكربت المرجعي: `deploy/scripts/zsystems-backup.sh`، يُثبَّت على السيرفر في `/var/www/zsystems/backup.sh` ويعمل يومياً 3 فجراً من crontab المستخدم `ubuntu`، وسجله في `/var/backups/zsystems/backup.log`.
- النسخة المحلية في `/var/backups/zsystems` تُحفظ 14 يوماً.
- النسخة خارج السيرفر تُرفع إلى Oracle Object Storage عبر رابط Pre-Authenticated Request (كتابة فقط) محفوظ في `/etc/zsystems/backup-par-url`. بدون هذا الملف تبقى النسخة على السيرفر فقط.
- **خلل سابق (أُصلح في 22 سبتمبر 2026):** الـ cron القديم كان يوجّه السجل إلى `/var/log/zsystems_backup.log` الذي لا يملك المستخدم `ubuntu` صلاحية الكتابة عليه، فكانت الـ shell تفشل قبل تشغيل السكربت أصلاً. آخر نسخة فعلية كانت يوم 31 أغسطس 2026. كما كان `docker exec -t` يحقن `\r` في ملف SQL.

### 2-c. سعة السيرفر الحالي (قياس 22 سبتمبر 2026)

- Oracle Ampere A1: **1 OCPU، 5.8 جيجا رام، بلا Swap**، قرص 45 جيجا، و PostgreSQL 16 في Docker على نفس السيرفر.
- الباك إند عملية PM2 واحدة (`fork`). لا يجوز تحويلها إلى `cluster` قبل نقل الحالة الموجودة في الذاكرة (`auth-cache`، `LoginAttemptLimiter`، طابور المهام) إلى تخزين مشترك — انظر O13 في `ARCHITECTURE_INVARIANTS.md`. ومع نواة واحدة لا فائدة منها أصلاً.
- السعة التقديرية كانت 15 إلى 25 عميلاً نشطاً في نفس الوقت بأربعة كاشيرات لكل عميل. **رُفع الـ instance في نفس اليوم إلى 4 OCPU / 24 جيجا** (داخل حد Always Free) وأُضيف Swap 4 جيجا، فصارت السعة التقديرية 40 إلى 80 عميلاً.
- الحساب Free Tier (بلا وسيلة دفع): أوراكل قد توقف السيرفر إذا بقي خاملاً 7 أيام. الإيقاف لا يمسح البيانات، والتشغيل يتم من اللوحة.

---

## 3. أسرار GitHub المطلوبة (GitHub Actions Secrets)

يتم ضبط الأسرار تحت مسار المستودع:  
`GitHub repo -> Settings -> Secrets and variables -> Actions`

| اسم السر | الوصف | القيمة النموذجية |
| :--- | :--- | :--- |
| `ORACLE_SSH_KEY` | مفتاح SSH الخاص للاتصال بالسيرفر | OpenSSH Private Key |
| `ORACLE_HOST` | عنوان IP لسيرفر أوراكل | `92.5.178.54` (اختياري، يملك قيمة افتراضية) |
| `ORACLE_USER` | اسم المستخدم في السيرفر | `ubuntu` (اختياري، يملك قيمة افتراضية) |
| `ORACLE_PORT` | منفذ الـ SSH | `22` (اختياري، يملك قيمة افتراضية) |

---

## 4. متغيرات بيئة الإنتاج السحابية (Production Env Highlights)

بيئة الباك إند (`backend/.env` على سيرفر أوراكل) تتضمن:
```env
NODE_ENV=production
APP_MODE=CLOUD_SAAS
PLATFORM_TENANT_ID=zsystems
APP_LOGIN_URL=https://app.zsystems.io/login
MAIL_DELIVERY_MODE=smtp
PUBLIC_TRIAL_DEBUG_CREDENTIALS=false
ENABLE_BOOTSTRAP_ADMIN=false
ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION=false
```

بيئة بناء الفرونت إند:
```env
VITE_API_BASE_URL=https://api.zsystems.io
VITE_PLATFORM_TENANT_ID=zsystems
```

---

## 5. روابط الفحص المباشر بعد النشر (Health Check Verification)

- **فحص جاهزية الخادم:** `https://api.zsystems.io/api/health/live`
- **فحص جاهزية قاعدة البيانات:** `https://api.zsystems.io/api/health/ready`
- **لوحة الدخول:** `https://app.zsystems.io/login`
- **بوابة السائقين:** `https://app.zsystems.io/driver`

