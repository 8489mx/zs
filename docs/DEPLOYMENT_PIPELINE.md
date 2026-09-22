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
- **الملف المجمّع (منذ 22 سبتمبر 2026):** الملف `zsystems_backup_<التاريخ>.zip.enc` فيه `full/zsystems_db.sql.gz` (نسخة السيرفر كله) و`tenants/<slug>__<id>.zsbak` (حزمة جاهزة لكل منشأة) و`manifest.json`. بيتعمل بـ `node dist/tools/zs-backup-tool.js bundle`، ومشفّر بكلمة السر اللي في `/etc/zsystems/backup-passphrase`. لو الملف ده مش موجود، الملف المجمّع بيتعمل من غير تشفير ويتكتب تحذير في السجل. ولو التجميع فشل، بيترفع `pg_dump` العادي بدله.
- **الاسترجاع منه مباشرة:** `bash deploy/scripts/zsystems-restore.sh list|full|tenant|tenant-file ...` (التفاصيل في `docs/DISASTER_RECOVERY.md`).
- النسخة خارج السيرفر تُرفع إلى Oracle Object Storage عبر رابط Pre-Authenticated Request (كتابة فقط) محفوظ في `/etc/zsystems/backup-par-url`. بدون هذا الملف تبقى النسخة على السيرفر فقط.
- نسخة ثالثة **خارج حساب أوراكل** (تحمي من إغلاق الحساب نفسه): Google Drive عبر `rclone` بـ remote اسمه `gdrive` للمستخدم `ubuntu`، بصلاحية `drive.file` (يرى فقط الملفات التي أنشأها هو). المجلد `zsystems-backups`، والنسخ الأقدم من 90 يوماً تُحذف منه تلقائياً. الإعداد يتم مرة واحدة بـ `rclone config` عبر نفق SSH على المنفذ 53682.
- الوجهتان الخارجيتان مستقلتان: فشل واحدة لا يمنع الأخرى، والسكربت يخرج بخطأ إن فشلت أي منهما.
- **الاسترجاع والنقل لسيرفر جديد:** `docs/DISASTER_RECOVERY.md` — خطوات كاملة + سجل تجارب الاسترجاع الفعلية. إعداد nginx الفعلي محفوظ في `deploy/nginx/oracle-site.conf`.
- **خلل سابق (أُصلح في 22 سبتمبر 2026):** الـ cron القديم كان يوجّه السجل إلى `/var/log/zsystems_backup.log` الذي لا يملك المستخدم `ubuntu` صلاحية الكتابة عليه، فكانت الـ shell تفشل قبل تشغيل السكربت أصلاً. آخر نسخة فعلية كانت يوم 31 أغسطس 2026. كما كان `docker exec -t` يحقن `\r` في ملف SQL.

### 2-b-2. مراقبة السيرفر من الداخل (`deploy/scripts/zsystems-watch.sh`)

- يُثبَّت في `/var/www/zsystems/watch.sh` ويعمل من crontab المستخدم `ubuntu` مع كل restart (بعد 90 ثانية) وكل يوم 7 الصبح UTC، وسجله في `/var/backups/zsystems/watch.log`.
- **يبعت تنبيه تليجرام لو:** عدد الأنوية أو الرام قل عن المتوقع (بيتسجل أول مرة في `/etc/zsystems/expected-shape`)، أو السيرفر عمل restart، أو مفيش نسخة احتياطية جديدة من أكتر من 26 ساعة أو آخر نسخة فيها ERROR، أو القرص عدّى 85%، أو الباك إند وقف.
- **السبب:** أوراكل خفّضت حد السيرفرات المجانية للنص في يونيو 2026 من غير أي إعلان.
- إعدادات تليجرام في `/etc/zsystems/telegram.env` (`TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID`، صاحب الملف `ubuntu` وصلاحياته 600). من غيرها التنبيهات بتتكتب في السجل بس.
- **كل تنبيهات النظام بتروح لبوت واحد** (`Zsystem Alert`، من 22 سبتمبر 2026): سكربت المراقبة (`/etc/zsystems/telegram.env`)، وتنبيهات الباك إند على مستوى المنصة (`TELEGRAM_ALERTS_ENABLED` / `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` في `backend/.env` على السيرفر)، وإشعارات النشر **عند الفشل أو الرجوع التلقائي بس** (GitHub Secrets بنفس الأسماء؛ النجاح بيبان في GitHub ومش بيتبعت، عشان تليجرام يفضل للحاجات الحرجة). لو غيّرت البوت، غيّره في الأماكن التلاتة.
- **لو السيرفر وقف خالص**، السكربت ده مش هيقدر يبعت حاجة. التنبيه ساعتها بيجي من المراقبة الخارجية `.github/workflows/uptime-watch.yml`: بتشتغل على GitHub كل 5 دقايق (GitHub ممكن يأخرها شوية)، وبتجرب `https://<host>/api/health/live` تلات مرات. بتبعت على نفس البوت (نفس الـ GitHub Secrets) **لما الحالة تتغير بس**: رسالة لما السيرفر يقع، ورسالة لما يرجع. حالة التشغيلة اللي فاتت (نجحت ولا فشلت) هي اللي بتتقارن بيها الحالة الحالية.

### 2-c. سعة السيرفر الحالي (قياس 22 سبتمبر 2026)

- Oracle Ampere A1: **1 OCPU، 5.8 جيجا رام، بلا Swap**، قرص 45 جيجا، و PostgreSQL 16 في Docker على نفس السيرفر.
- الباك إند عملية PM2 واحدة (`fork`). لا يجوز تحويلها إلى `cluster` قبل نقل الحالة الموجودة في الذاكرة (`auth-cache`، `LoginAttemptLimiter`، طابور المهام) إلى تخزين مشترك — انظر O13 في `ARCHITECTURE_INVARIANTS.md`. ومع نواة واحدة لا فائدة منها أصلاً.
- السعة التقديرية كانت 15 إلى 25 عميلاً نشطاً في نفس الوقت بأربعة كاشيرات لكل عميل. **رُفع الـ instance في نفس اليوم إلى 4 OCPU / 24 جيجا** (داخل حد Always Free) وأُضيف Swap 4 جيجا، فصارت السعة التقديرية 40 إلى 80 عميلاً.
- **تصحيح (22 سبتمبر 2026):** حد Always Free لـ Ampere A1 صار **2 OCPU / 12 جيجا** للحساب كله منذ 15 يونيو 2026 (مُطبَّق منذ 18 أغسطس)، وليس 4 / 24 كما كُتب هنا أولاً. الـ 4 / 24 الحالية تعمل على رصيد الفترة التجريبية (Promo) الذي ينتهي نحو 30 سبتمبر 2026، وبعدها قد يوقف أوراكل السيرفر. **صُغِّر فعلاً إلى 2 OCPU / 12 جيجا في نفس اليوم** (تم التحقق: nproc=2، رام 11Gi، Swap 4 جيجا، الباك إند سليم). أي زيادة فوق ذلك تتطلب Pay As You Go ودفع الفرق. السعة التقديرية على 2 / 12 مع الـ Swap: 25 إلى 45 عميلاً نشطاً بأربعة كاشيرات. المصدر: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
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

