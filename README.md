# zs-main

نسخة محسنة وقابلة للتسليم لنظام إدارة مبيعات ومشتريات ومخزون وتقارير.

## المكونات
- `backend/` API مبني بـ NestJS + TypeScript + PostgreSQL
- `frontend/` واجهة React + TypeScript + Vite
- `docker-compose.yml` لتشغيل البيئة محليًا
- `.github/workflows/ci.yml` لتشغيل CI تلقائيًا

## المتطلبات المسبقة
- Node.js 22.x (نفس نسخة CI و Docker)
- npm 10.x
- PostgreSQL 16 عند التشغيل المحلي بدون Docker
- ملف `.nvmrc` مضاف لضبط نفس النسخة محليًا (`nvm use`)

## Mode Contract (نفس الكودbase)
- `APP_MODE=offline` لنسخة العميل المحلية (local PostgreSQL).
- `APP_MODE=online` لنسخة الاستضافة (hosted PostgreSQL).
- التبديل بين الوضعين يتم من خلال `.env` فقط.
- التفاصيل الكاملة في: `MODE_CONTRACT.md`.

## التشغيل السريع بالحاويات
```bash
npm run compose:up
```

الخدمات الافتراضية:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`
- Health: `http://localhost:3001/health`
- Readiness: `http://localhost:3001/health/ready`
- Liveness: `http://localhost:3001/health/live`

لإيقاف البيئة:
```bash
npm run compose:down
```

## تشغيل Production بنقطة دخول واحدة (Gateway)
هذا الوضع يجهّز المشروع للبيع/الاستضافة بحيث الواجهة والخلفية يشتغلوا من نفس الـ IP/Domain.

تشغيل:
```bash
npm run compose:prod:up
```

مراجعة ملف الـ compose النهائي:
```bash
npm run compose:prod:config
```

السجلات:
```bash
npm run compose:prod:logs
```

إيقاف:
```bash
npm run compose:prod:down
```

## نسخة Offline جاهزة للتثبيت عند العميل
1) جهّز ملف البيئة:
```bash
cp .env.offline.example .env.offline
```

2) تثبيت وتشغيل أول مرة:
```bash
npm run offline:install
```

3) أوامر الإدارة اليومية:
```bash
npm run offline:start
npm run offline:stop
npm run offline:backup
npm run offline:restore -- ./backups/your-backup.sql
npm run offline:upgrade -- ./backups
npm run offline:rollback -- ./backups/pre-upgrade-YYYYMMDD-HHMMSS.sql
```

4) فحص تكوين compose:
```bash
npm run compose:offline:config
```

### تشغيل ويندوز بدون ترمنال (Step 3)
- Start: `windows\\Start-ZS.bat`
- Stop: `windows\\Stop-ZS.bat`
- logs: `%ProgramData%\\ZS\\logs`

> ملاحظة: launcher يتوقع `APP_MODE=offline` داخل `.env.offline`.

### Installer لويندوز (Step 4)
- ملف Inno Setup: `installer/windows/zs-offline.iss`
- بناء installer (على ويندوز مع Inno Setup 6):
  - `installer\\windows\\build-installer.bat`
- الناتج المتوقع في مجلد `release/` باسم قريب من:
  - `zs-offline-installer.exe`

## تجهيز حزمة إصدار للبيع (Offline Package)
إنشاء حزمة إصدار:
```bash
npm run release:bundle -- 1.0.0
```

التحقق من سلامة الملفات بعد النقل:
```bash
npm run release:verify -- ./release/zs-offline-1.0.0
```

### Offline independence audit (Step 5)
```bash
npm run audit:offline-independence
```

راجع أيضًا:
- `OFFLINE_SUPABASE_INDEPENDENCE_CHECKLIST.md`
- `OFFLINE_ONLINE_SMOKE_CHECKLIST.md`

## التشغيل المحلي بدون Docker
### 1) قاعدة البيانات
أنشئ PostgreSQL ثم انسخ القيم من `backend/.env.example` إلى `backend/.env`.

### 2) الخلفية
```bash
cd backend
npm ci
npm run migration:run
npm run build
npm start
```

### 3) الواجهة
```bash
cd frontend
npm ci
npm run dev
```

## فحوص الجودة
### المشروع كاملًا
```bash
npm run qa
```

### الخلفية فقط
```bash
npm run qa:backend
```

### الواجهة فقط
```bash
npm run qa:frontend
```

## E2E
### عبر بيئة Docker المحلية
```bash
npm run compose:e2e
```

### تشغيل E2E ذاتيًا من سكربت واحد
```bash
npm run e2e:self
```

### بوابة تحقق موسعة قبل التسليم
```bash
npm run qa:release
```

### ضد Backend شغال بالفعل
```bash
cd backend
E2E_BASE_URL=http://127.0.0.1:3001 E2E_USERNAME=owner E2E_PASSWORD=OwnerBootstrap2026! npm run test:e2e
```

## ما الذي تحسن في هذه النسخة
- إغلاق admin diagnostics endpoints بصلاحيات admin صريحة وقابلة لإعادة الاستخدام.
- إزالة duplication الخاص بمسار `GET /api/branches`.
- إضافة DTO validation في نقاط إعدادات حرجة.
- إصلاح `frontend qa:functional` ليتوافق مع بنية الواجهة الحالية.
- تصفير تحذيرات lint الظاهرة سابقًا في الواجهة.
- إضافة Dockerfiles و `docker-compose.yml` وملفات بيئة تشغيل محلية.
- إضافة GitHub Actions workflow لتشغيل build + QA + backend E2E.
- إضافة سكربت انتظار HTTP لتبسيط تشغيل E2E محليًا وفي CI.
- تحسين health endpoints بإتاحة مسارات أوضح للفحص الحي والجاهزية.
- فصل منطق قوائم الشركاء إلى helper مستقلة لتقليل التكدس داخل الخدمة.
- فصل mapping/filtering/summary الخاص بقوائم المرتجعات إلى helper مستقلة وأسهل للاختبار.
- إضافة اختبارات بنيوية جديدة تغطي helpers الجديدة لضمان أن refactor ليس شكليًا فقط.
- فصل جزء من منطق المبيعات والمشتريات إلى helpers مستقلة مع اختبارات تغطي الحسابات الحساسة مثل التقريب المالي ومبالغ السداد.

## ملاحظات مهمة
- المشروع مناسب أكثر حاليًا لتشغيل deployment مستقل لكل عميل، وليس SaaS متعدد العملاء من نفس النسخة.
- اختبارات الـ E2E ما زالت تعتمد على وجود PostgreSQL وBackend شغالين، لكن تم تبسيط تشغيلها عبر `npm run compose:e2e`.

- Additional service hardening: extracted reusable helpers for returns write flows and partner ledger aggregation in reports, with dedicated infrastructure tests.


## Current hardening notes
- Added customer/supplier balance helpers in reports to reduce service complexity and improve testability.


## Sale readiness certification
```bash
npm run qa:sale-ready
```

This command runs the full QA suite, boots the dockerized stack, verifies backend and frontend availability, executes backend E2E against the live service, and produces a clean delivery archive.

Additional delivery checklist: see `SALE_READY_CHECKLIST.md`.

- تم فصل جزء إضافي من منطق الدرج النقدي إلى أدوات مساعدة مستقلة مع اختبار بنيوي خاص بها.

- تحسينات إضافية في منطق المشتريات: توحيد تطبيع النطاق والمبالغ والملاحظات وبناء مراجع العمليات داخل helper مستقلة مع تغطية اختبارية.

- منطق إدارة المستخدمين (التطبيع، الفلترة، التلخيص، مزامنة الإدخالات) أصبح مفصولًا جزئيًا إلى helper و DTO مستقلة.
