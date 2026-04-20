# Mode Contract (Single Codebase)

## الهدف
تثبيت وضعَي التشغيل الرسميين لنفس الكودbase عبر متغير بيئة واحد:
- `APP_MODE=offline|online`

لا يوجد fork للمشروع ولا مسار business logic منفصل.

---

## الأوضاع الرسمية
1. **offline**
   - نسخة العميل المحلية (Windows launcher/installer path).
   - قاعدة البيانات PostgreSQL محلية داخل `docker-compose.offline.yml`.
   - لا اعتماد runtime مطلوب على قواعد بيانات خارجية.

2. **online**
   - نسخة الاستضافة (SaaS/Hosted) على VPS/Cloud.
   - قاعدة البيانات PostgreSQL خارجية/مستضافة.
   - نفس backend/frontend ونفس business modules.

---

## Environment Contract (الحد الأدنى)

### مشتركة
- `APP_MODE` (القيم المسموحة رسميًا: `offline|online`)
- `NODE_ENV`
- `APP_HOST`
- `APP_PORT`
- `SESSION_CSRF_SECRET`

### قاعدة البيانات (في الوضعين)
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `DATABASE_SSL_CA_CERT` (اختياري)

---

## Guard Rules (توثيق مرحلي قبل التنفيذ)
### عند `APP_MODE=offline`
- `DATABASE_HOST` يجب أن يكون `postgres` داخل مسار compose offline.
- `DATABASE_SSL=false` افتراضيًا.
- أي host خارجي لقاعدة البيانات يُعتبر misconfiguration.

### عند `APP_MODE=online`
- يسمح بـ `DATABASE_HOST` خارجي.
- يسمح/يتوقع `DATABASE_SSL=true` حسب مزود الاستضافة.
- يجب التحقق من اكتمال env الإلزامية قبل startup.

### قواعد عامة
- Fail-fast عند نقص/تعارض env مع رسالة واضحة.
- عدم إضافة guard يعطل hosted mode الصحيح.

---

## Policy
- التبديل بين `offline` و`online` يتم عبر `.env` فقط.
- طبقة Windows launcher/installer هي طبقة تشغيل فقط، وليست معمارية بديلة.
- `frontend/` و`backend/` يظلان نظيفين وقابلين للإرسال/الضغط بشكل منفصل.
