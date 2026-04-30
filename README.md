# zs-main

نسخة محسنة وقابلة للتسليم لنظام إدارة مبيعات ومشتريات ومخزون وتقارير.

## المكونات
- `backend/` API مبني بـ NestJS + TypeScript + PostgreSQL
- `frontend/` واجهة React + TypeScript + Vite
- `portable/` مسار تسليم Windows Portable بدون Docker
- `docker-compose.yml` لتشغيل بيئة التطوير/الاختبار محليًا فقط
- `.github/workflows/ci.yml` لتشغيل CI تلقائيًا

## المتطلبات المسبقة للتطوير
- Node.js 22.x
- npm 10.x
- PostgreSQL 16 عند التشغيل المحلي بدون Docker
- Docker Desktop اختياري لبيئة التطوير/اختبارات الـ Docker فقط
- ملف `.nvmrc` مضاف لضبط نفس نسخة Node محليًا (`nvm use`)

## Mode Contract (نفس الكودbase)
- `APP_MODE=LOCAL_PILOT` لنسخة العميل التجريبية محليًا.
- `APP_MODE=SELF_CONTAINED` لنسخة Windows Portable.
- `APP_MODE=CLOUD_SAAS` لنسخة الاستضافة بقاعدة بيانات مستضافة.
- التبديل بين الأوضاع يتم من خلال ملفات البيئة فقط.
- التفاصيل الكاملة في: `MODE_CONTRACT.md`.

## نسخة العميل الحالية: Windows Portable بدون Docker

هذه هي نسخة التسليم الحالية للعميل، وتعتمد على مسار `portable/` فقط.

راجع التفاصيل الكاملة في:

```text
portable/README.md
```

### أوامر التشغيل للعميل
- تشغيل:
```text
portable/tools/launcher/Start-ZS.bat
```

- إيقاف:
```text
portable/tools/launcher/Stop-ZS.bat
```

- نسخ احتياطي:
```text
portable/tools/launcher/Backup-ZS.bat
```

- استرجاع نسخة احتياطية:
```text
portable/tools/launcher/Restore-ZS.bat
```

- فحص وتشخيص:
```text
portable/tools/launcher/Diagnostics-ZS.bat
```

### ملاحظات مهمة للـ Portable
- لا يحتاج العميل إلى Docker.
- يتم تشغيل PostgreSQL من runtime محلي داخل `portable/runtime/postgres/bin`.
- يتم تشغيل backend وfrontend من ملفات build داخل `portable/app`.
- بعد أول تشغيل ناجح، يمكن إعداد التشغيل التلقائي مع Windows Startup حسب منطق الـ launcher الحالي.
- لا يتم تخزين PostgreSQL binaries الفعلية في Git.

## التشغيل السريع بالحاويات للتطوير فقط

هذا المسار مخصص للتطوير والاختبار، وليس تسليم العميل النهائي.

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

عرض السجلات:

```bash
npm run compose:logs
```

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

### اختبارات Backend E2E
```bash
npm run e2e:backend
```

### تشغيل E2E ذاتيًا من سكربت واحد
```bash
npm run e2e:self
```

### عبر بيئة Docker المحلية
```bash
npm run compose:e2e
```

## Sale readiness certification

```bash
npm run qa:sale-ready
```

هذا الأمر يشغّل فحوص الجودة الكاملة، ثم يرفع stack اختباري بالحاويات، ويتحقق من جاهزية backend وfrontend، ثم يشغّل backend E2E ضد خدمة حية، وبعدها ينتج أرشيف تسليم نظيف.

ملاحظة: هذا الأمر ما زال يحتاج Docker لأنه مسار certification/QA، وليس مسار تشغيل العميل النهائي.

راجع أيضًا:

```text
SALE_READY_CHECKLIST.md
```

## تجهيز حزمة Portable

الأوامر المتاحة حاليًا من روت المشروع:

```bash
npm run build
npm run sync:portable-backend
npm run customer:portable:preflight
npm run customer:portable
```

قبل التسليم، راجع:

```text
portable/README.md
SALE_READY_CHECKLIST.md
```

## ما الذي تحسن في هذه النسخة
- إغلاق admin diagnostics endpoints بصلاحيات admin صريحة وقابلة لإعادة الاستخدام.
- إزالة duplication الخاص بمسار `GET /api/branches`.
- إضافة DTO validation في نقاط إعدادات حرجة.
- إصلاح `frontend qa:functional` ليتوافق مع بنية الواجهة الحالية.
- تحسين health endpoints بإتاحة مسارات أوضح للفحص الحي والجاهزية.
- فصل أجزاء من منطق الشركاء والمرتجعات والمبيعات والمشتريات والتقارير إلى helpers مستقلة.
- إضافة اختبارات بنيوية وcritical tests لتغطية الحسابات الحساسة، الجلسات، الصلاحيات، التقارير، والـ operational flows.
- إضافة مسار Windows Portable بدون Docker لتسليم العميل بشكل أبسط وأكثر استقلالًا.

## ملاحظات مهمة
- مسار العميل الحالي هو Windows Portable بدون Docker.
- Docker ما زال مفيدًا للتطوير، CI، و`qa:sale-ready`.
- المشروع مناسب أكثر حاليًا لتشغيل deployment مستقل لكل عميل، وليس SaaS متعدد العملاء من نفس النسخة.
- اختبارات E2E ما زالت تعتمد على وجود PostgreSQL وBackend شغالين.
