# Final Release Gate

لا تعتبر النسخة جاهزة للبيع إلا إذا كانت هذه العناصر كلها خضراء:

- `npm run build`
- `npm run test:infra`
- `npm run check:readiness`
- `npm run check:permissions`
- تسجيل الدخول يعمل
- إنشاء بيع/شراء/مرتجع يعمل
- لا توجد أخطاء console/blocking في الواجهة
- `.env` production مضبوط
- backup/restore steps موثقة
