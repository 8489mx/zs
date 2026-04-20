# Offline / Online Smoke Checklist

## 1) Offline mode smoke
1. `cp .env.offline.example .env.offline`
2. `npm run compose:offline:up`
3. افتح `http://127.0.0.1:8080`
4. تحقق من `/health`
5. نفّذ:
   - `npm run offline:backup`
   - `npm run offline:upgrade -- ./backups`
   - `npm run offline:rollback -- ./backups/<pre-upgrade-file>.sql`
6. `npm run compose:offline:down`

## 2) Online mode smoke
1. جهّز `.env.production` بقيم DB خارجية صحيحة.
2. `APP_MODE=online` مؤكد.
3. `npm run compose:prod:up`
4. تحقق من `/health` و flow تسجيل الدخول.
5. `npm run compose:prod:down`

## 3) شرط النجاح
- نفس الكودbase ينجح في الوضعين بدون تغيير كود.
- Offline يعمل بقاعدة محلية فقط.
- Online يعمل بقاعدة خارجية فقط من env.
