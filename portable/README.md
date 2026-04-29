# ZS Portable Layout

هذا المسار مخصص لتشغيل نسخة Windows Portable بدون Docker وبدون Installer.

## Step 2 (Ready-to-run contract)
- Native launcher داخل `portable/tools/launcher`.
- تشغيل PostgreSQL runtime-only من `portable/runtime/postgres/bin`.
- readiness check عبر `pg_isready`.
- first-run bootstrap:
  - `initdb` عند أول تشغيل.
  - إنشاء قاعدة البيانات إذا غير موجودة.
  - تنفيذ `BACKEND_BOOTSTRAP_CMD` مرة واحدة (افتراضيًا: `npm run migration:run`).
- تشغيل backend + frontend static server.
- فتح المتصفح تلقائيًا.

## Step 3 (Operational)
- Backup: `portable/tools/launcher/Backup-ZS.bat`
- Restore: `portable/tools/launcher/Restore-ZS.bat <backup.sql>`
- Diagnostics + log tails: `portable/tools/launcher/Diagnostics-ZS.bat`
- Release assembly: `portable/scripts/Assemble-Portable.bat`

## الملفات المطلوبة للتشغيل
### PostgreSQL portable runtime (إلزامي)
داخل `portable/runtime/postgres/bin` يجب وجود:
- `postgres.exe`
- `pg_ctl.exe`
- `pg_isready.exe`
- `initdb.exe`
- `createdb.exe`
- `psql.exe`
- `pg_dump.exe`

### Backend artifacts (إلزامي)
داخل `portable/app/backend` يجب وجود:
- `dist/main.js` (أو المسار المحدد في `BACKEND_ENTRY`)
- ملفات التشغيل اللازمة للـ backend (مثل `node_modules` + `package.json` حسب طريقة التجميع)

### Frontend artifacts (إلزامي)
داخل `portable/app/frontend` يجب وجود:
- `index.html`
- `assets/*` (build output)

## أوامر التشغيل
- فحص جاهزية المسار قبل التشغيل:
  - `portable/tools/launcher/Check-Portable-Ready.bat`
- التشغيل:
  - `portable/tools/launcher/Start-ZS.bat`
- الإيقاف:
  - `portable/tools/launcher/Stop-ZS.bat`

## ملاحظات
- لا يتم تخزين PostgreSQL binaries الفعلية في Git.
- لا يوجد أي تعديل داخل `frontend/` أو `backend/` في هذا المسار.
