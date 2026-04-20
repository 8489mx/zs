# Offline Supabase Independence Checklist

## الهدف
التأكد أن نسخة العميل Offline لا تعتمد runtime على Supabase أو أي DB خارجية.

## Checklist قبل التسليم
- [ ] `APP_MODE=offline` مضبوط في `.env.offline`.
- [ ] `DATABASE_HOST=postgres` في المسار offline.
- [ ] لا توجد أي مفاتيح أو URLs خاصة بـ Supabase ضمن ملفات التشغيل offline.
- [ ] `docker-compose.offline.yml` يشغل PostgreSQL محلية داخل stack.
- [ ] backend يبدأ ويشغّل migrations تلقائيًا في offline flow.
- [ ] start/stop/backup/restore تعمل بدون اتصال خارجي.

## فحص آلي
```bash
bash ./scripts/audit/check-offline-independence.sh
```

## نتيجة الفحص (يتم تعبئتها قبل الإصدار)
- التاريخ:
- المنفذ:
- النتيجة: PASS / FAIL
- ملاحظات:
