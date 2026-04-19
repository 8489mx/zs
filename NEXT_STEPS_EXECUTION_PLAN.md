# Next Steps Execution Plan

## الهدف الحالي
تحويل الإصلاحات الأمنية المنفذة إلى نشر آمن وقابل للمتابعة بدون رجوع regressions.

## الخطوة 1 (مباشرة) — تثبيت الإعدادات في بيئة التشغيل
1. ضبط المتغيرات التالية في staging/production:
   - `DATABASE_SSL=true`
   - `DATABASE_SSL_REJECT_UNAUTHORIZED=true`
   - `DATABASE_SSL_CA_CERT` (شهادة CA الصحيحة من مزود قاعدة البيانات)
2. التأكد أن `BUSINESS_TIMEZONE` مضبوط صراحة حسب نشاط العميل.
3. التأكد أن بيئة production لا تشغل backend بدون `KYSELY_DB` متاح (عشان fail-closed في rate-limit).

## الخطوة 2 — اختبار قبل النشر (Release Gate مصغر)
نفّذ بالترتيب:
1. `npm --prefix backend run typecheck`
2. `npm --prefix backend run test:critical`
3. `npm --prefix backend run check:architecture`
4. smoke على endpoints:
   - `/health`
   - `/health/ready`
   - `/api/dashboard/overview`

## الخطوة 3 — تشغيل مراقبة بعد النشر (24-48 ساعة)
1. متابعة أخطاء الاتصال بقاعدة البيانات (خصوصًا SSL handshake).
2. متابعة أي spikes في 429/5xx على مسارات auth.
3. مقارنة dashboard/report outputs قبل/بعد الإصلاح على نفس عينات البيانات.

## الخطوة 4 — تحسينات تكميلية (Sprint قصيرة)
1. إضافة alert واضح عند تفعيل fallback غير متوقع في rate-limit خارج production.
2. إضافة check CI يتأكد أن `DATABASE_SSL_REJECT_UNAUTHORIZED` لا يساوي `false` في production manifests.
3. إضافة integration test يثبت قراءة timezone من config وليس من env المباشر داخل helpers.

## تعريف النجاح
- لا توجد أخطاء SSL في staging/production.
- جميع critical tests خضراء.
- لا يوجد سلوك مختلف في التقارير اليومية بسبب timezone بعد النشر.
