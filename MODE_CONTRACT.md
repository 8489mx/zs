# Mode Contract (Single Codebase)

## الهدف
توحيد التشغيل على نفس الكودbase عبر متغير بيئة واحد:
- `APP_MODE=offline|online`

لا يوجد fork للمشروع ولا معماريتين منفصلتين.

---

## القاعدة العامة
1. **Offline mode**
   - مخصص لتشغيل نسخة العميل المحلية.
   - قاعدة البيانات PostgreSQL محلية (داخل Docker stack offline).
   - لا يعتمد على خدمات خارجية runtime.

2. **Online mode**
   - مخصص للاستضافة على VPS/Cloud/Host.
   - PostgreSQL خارجية/مستضافة.
   - نفس التطبيق ونفس build؛ الاختلاف فقط في env.

---

## أقل env مطلوبة

### مشتركة
- `APP_MODE`
- `NODE_ENV`
- `APP_HOST`
- `APP_PORT`
- `SESSION_CSRF_SECRET`

### Database (للوضعين)
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `DATABASE_SSL_CA_CERT` (اختياري)

---

## Policy
- التبديل بين offline وonline يتم عبر `.env` فقط.
- scripts الحالية تبقى كما هي (لا كسر).
- أي guard لاحقًا يجب أن يمنع misconfiguration بدون غلق hosted mode الصحيح.
