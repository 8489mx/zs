# E2E testing

هذه الاختبارات تعمل ضد باك اند شغال فعليًا وقاعدة بيانات حقيقية/تجريبية.

## المطلوب قبل التشغيل
- شغّل backend محليًا
- تأكد أن `/health` يعمل
- ضع يوزر صالح في `.env` أو في متغيرات البيئة:
  - `E2E_USERNAME`
  - `E2E_PASSWORD`
- يمكن تغيير الرابط عبر:
  - `E2E_BASE_URL=http://127.0.0.1:3001`

## الأوامر
- `npm run test:e2e:auth`
- `npm run test:e2e:catalog`
- `npm run test:e2e:flows`
- `npm run test:e2e`

## ما الذي تغطيه
- login / me / logout
- category / supplier / customer / product
- purchase
- sale
- sale return
- purchase return
- dashboard / reports / treasury / audit

## ملاحظات
- الاختبارات تنشئ بيانات جديدة بأسماء فريدة في كل تشغيل
- يفضل تشغيلها على قاعدة بيانات تجريبية
