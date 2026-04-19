# Launch Readiness Gate

## المطلوب قبل الإطلاق
1. نجاح QA الأساسية:
   - `npm --prefix backend run typecheck`
   - `npm --prefix backend run test:critical`
2. نجاح تشغيل offline:
   - `npm run offline:install`
   - `npm run offline:backup`
   - `npm run offline:upgrade -- ./backups`
   - `npm run offline:rollback -- ./backups/pre-upgrade-*.sql`
3. إنشاء حزمة الإصدار والتحقق:
   - `npm run release:bundle -- <version>`
   - `npm run release:verify -- ./release/zs-offline-<version>`

## تعريف جاهزية الإطلاق
- لا توجد أخطاء حرجة في backend tests.
- النسخة offline تعمل من نقطة دخول واحدة.
- backup/restore/upgrade/rollback مجرّبين فعليًا.
- حزمة الإصدار موقعة checksum وقابلة للتحقق.
