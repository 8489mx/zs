# Mode Contract (Single Codebase)

## الهدف
توحيد التشغيل على نفس الكودbase عبر متغير بيئة واحد:
- `APP_MODE=LOCAL_PILOT|SELF_CONTAINED|CLOUD_SAAS`

لا يوجد fork للمشروع ولا معماريتين منفصلتين.

---

## القاعدة العامة
1. **LOCAL_PILOT**
   - مخصص لتشغيل نسخة العميل التجريبية محليًا.
   - قاعدة البيانات PostgreSQL محلية (داخل Docker stack pilot).

2. **SELF_CONTAINED**
   - نسخة Installer/Launcher على نفس الكودbase.
   - طبقة packaging إضافية بدون تغيير business logic.

3. **CLOUD_SAAS**
   - مخصص للاستضافة على VPS/Cloud/Host.
   - PostgreSQL خارجية/مستضافة.

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
- التبديل بين modes يتم عبر `.env` فقط (مع دعم legacy aliases: `offline` -> `LOCAL_PILOT`, `online` -> `CLOUD_SAAS`).
- scripts الحالية تبقى كما هي (لا كسر).
- أي guard لاحقًا يجب أن يمنع misconfiguration بدون غلق hosted mode الصحيح.
