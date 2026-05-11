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
- First-time setup: `portable/tools/launcher/Setup-ZS.bat`
- Start: `portable/tools/launcher/Start-ZS.bat`
- Stop: `portable/tools/launcher/Stop-ZS.bat`
- Install shortcuts: `portable/tools/launcher/Install-ZS-Shortcuts.bat`
- Remove shortcuts: `portable/tools/launcher/Remove-ZS-Shortcuts.bat`
- Install autostart only: `portable/tools/launcher/Install-Autostart-ZS.bat`
- Remove autostart only: `portable/tools/launcher/Remove-Autostart-ZS.bat`
- Install desktop shortcut only: `portable/tools/launcher/Install-Desktop-Shortcut-ZS.bat`
- Remove desktop shortcut only: `portable/tools/launcher/Remove-Desktop-Shortcut-ZS.bat`
- Backup: `portable/tools/launcher/Backup-ZS.bat`
- Restore: `portable/tools/launcher/Restore-ZS.bat <backup.sql>`
- Diagnostics + support report: `portable/tools/launcher/Diagnostics-ZS.bat`
- Release assembly: `portable/scripts/Assemble-Portable.bat`

## أول تشغيل على جهاز العميل
شغّل مرة واحدة:

```text
portable/tools/launcher/Setup-ZS.bat
```

هذا السكربت ينفذ:
1. فحص جاهزية ملفات البورتابل.
2. تثبيت shortcut التشغيل التلقائي مع Windows Startup.
3. تثبيت shortcut على سطح المكتب يفتح رابط البرنامج.
4. تشغيل البرنامج.

بعد ذلك يمكن فتح البرنامج من shortcut سطح المكتب.

## التشخيص والدعم
شغّل:

```text
portable/tools/launcher/Diagnostics-ZS.bat
```

سيعرض ويحفظ تقريرًا داخل `portable/runtime/logs` يشمل:
- حالة Node runtime.
- حالة PostgreSQL runtime.
- حالة backend artifacts.
- حالة frontend artifacts.
- حالة البورتات `8080` و`3001`.
- حالة Startup shortcut.
- حالة Desktop shortcut.
- آخر 50 سطر من `launcher-start.log`.
- آخر 50 سطر من `backend.log`.

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

### Node portable runtime (إلزامي)
داخل `portable/runtime/node` يجب وجود:
- `node.exe`
- `npm.cmd`
- `node_modules/npm/bin/npm-cli.js`

### Backend artifacts (إلزامي)
داخل `portable/app/backend` يجب وجود:
- `dist/main.js` (أو المسار المحدد في `BACKEND_ENTRY`)
- ملفات التشغيل اللازمة للـ backend (مثل `node_modules` + `package.json` حسب طريقة التجميع)

### Frontend artifacts (إلزامي)
داخل `portable/app/frontend` يجب وجود:
- `index.html`
- `assets/*` (build output)

## الأيقونة
اختصار سطح المكتب يستخدم أول أيقونة موجودة من المسارات التالية:
- `APP_ICON` داخل `portable/config/.env.offline`
- `portable/assets/zs.ico`
- `portable/assets/app.ico`
- `portable/tools/launcher/zs.ico`
- `portable/tools/launcher/app.ico`
- `portable/app/frontend/favicon.ico`

المسار المفضل:
```text
portable/assets/zs.ico
```

## ملاحظات
- لا يتم تخزين PostgreSQL binaries الفعلية في Git.
- لا يوجد أي تعديل داخل `frontend/` أو `backend/` في هذا المسار.
- لا تشغّل ملفات launcher كـ Administrator إلا لو النسخة موجودة في مسار محمي مثل `C:\Program Files`.
- التشغيل التلقائي يتم على مستوى مستخدم Windows الحالي.
