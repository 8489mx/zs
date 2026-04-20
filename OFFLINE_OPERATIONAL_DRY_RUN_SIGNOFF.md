# Offline Operational Dry-Run Signoff

## معلومات التشغيل
- التاريخ:
- المنفذ:
- البيئة (جهاز/VM):
- إصدار الحزمة:

## سيناريو التنفيذ الكامل (Install → Start → First-run → Backup → Upgrade → Rollback)
- [ ] 1) تثبيت النسخة (Installer أو offline install script)
- [ ] 2) تشغيل الخدمة وفتح الواجهة
- [ ] 3) إكمال first-run setup وإنشاء أول حساب إداري
- [ ] 4) اختبار login/admin access
- [ ] 5) أخذ backup ناجح
- [ ] 6) تنفيذ upgrade ناجح
- [ ] 7) تنفيذ rollback ناجح
- [ ] 8) التأكد من استقرار الخدمة بعد rollback

## نتائج الفحوص الأساسية
- [ ] `/health` = OK
- [ ] `/health/ready` = OK
- [ ] لا أخطاء حرجة في logs أثناء التشغيل
- [ ] البيانات الأساسية سليمة بعد rollback

## أدلة الإثبات
- مسار backup المستخدم:
- مسار pre-upgrade backup:
- screenshots / logs:

## قرار الاعتماد
- الحالة: PASS / FAIL
- ملاحظات:
- توقيع المسؤول:
