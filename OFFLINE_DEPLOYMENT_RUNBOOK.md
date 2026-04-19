# Offline Deployment Runbook

## 1) تجهيز الجهاز
- Docker Engine + Docker Compose plugin.
- مساحة تخزين كافية لبيانات PostgreSQL والنسخ الاحتياطية.

## 2) خطوات أول تشغيل
```bash
cp .env.offline.example .env.offline
npm run offline:install
```

المنظومة تعمل من عنوان واحد:
- `http://127.0.0.1:8080` (أو حسب `APP_PUBLIC_PORT`).

## 3) التشغيل والإيقاف
```bash
npm run offline:start
npm run offline:stop
```

## 4) النسخ الاحتياطي والاستعادة
نسخ احتياطي:
```bash
npm run offline:backup
```

استعادة:
```bash
npm run offline:restore -- ./backups/<file>.sql
```

> الاستعادة تستبدل محتوى قاعدة البيانات الحالية بالكامل.

## 5) الصحة والمراقبة
- Logs: `npm run compose:offline:logs`
- Health endpoint: `http://127.0.0.1:8080/health`

## 6) الترقية بدون فقدان بيانات
```bash
npm run offline:upgrade -- ./backups
```

الأمر ينفذ تلقائيًا:
1. تشغيل postgres.
2. أخذ نسخة احتياطية قبل الترقية (`pre-upgrade-*.sql`).
3. إعادة بناء backend/frontend.
4. تشغيل الخدمات بالتحديث الجديد.

## 7) الرجوع للإصدار السابق (Rollback)
لو ظهرت مشكلة بعد الترقية:
```bash
npm run offline:rollback -- ./backups/pre-upgrade-YYYYMMDD-HHMMSS.sql
```
