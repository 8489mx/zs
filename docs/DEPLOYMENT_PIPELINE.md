# Z Systems Deployment Pipeline (Oracle Cloud VPS)

> ⚠️ **تنبيه حاسم:** المنظومة بالكامل (Frontend، Backend، Database - PostgreSQL) مستضافة وتعمل حصرياً على **سيرفر أوراكل (Oracle Cloud VPS)**. تم إنهاء استخدام أي استضافة أخرى نهائياً.

---

## 1. مرجع كود الإنتاج (Source of Truth)

يعتمد خط الإنتاج حصرياً على فرع رئيسي موحد:
```text
GitHub branch: main
```

- أي دمج (Merge) في فرع `main` يُطلق تلقائياً خط التحقق من الكود (`ci.yml`).
- فور نجاح فحوصات الـ CI (Build, Typecheck, Tests, Migrations, Env Safety)، يتم تفعيل خط النشر التلقائي (`deploy-oracle.yml`) بدون تدخل يدوي.

---

## 2. معمارية خط النشر المستمر المؤتمت (Automated CI/CD Workflow)

يعمل ملف `.github/workflows/deploy-oracle.yml` بالتسلسل التالي:

1. **الاعتماد على نجاح الـ CI:** لا يتم تنفيذ النشر إذا فشلت فحوصات الكود أو الاختبارات.
2. **الاتصال المشفر بالسيرفر عبر SSH:**
   - الاتصال بعنوان السيرفر باستخدام المفتاح السري `ORACLE_SSH_KEY`.
3. **تحديث الكود الذري:**
   - التبديل الآمن والمطابقة التامة مع أحدث Commit على `origin/main`.
4. **بناء الباك إند والمهاجرات بأمان:**
   - تثبيت الاعتماديات عبر `npm ci`.
   - بناء الكود `npm run build`.
   - تنفيذ مهاجرات قاعدة البيانات `npm run migration:run` بعد نجاح البناء حصراً.
5. **بناء الفرونت إند:**
   - تثبيت الاعتماديات وبناء النسخة الإنتاجية `npm run build`.
6. **إعادة التحميل السلس (Zero Downtime PM2 Reload):**
   - تنفيذ `pm2 reload zsystems-backend --update-env` لتحديث الخدمة بدون انقطاع ثانية واحدة للعملاء المتصلين.
7. **التحقق الآلي من صحة الخدمة (Automated Health Probes):**
   - فحص `/api/health/live` و `/api/health/ready` للتأكد من استقرار الخادم واتصاله بقاعدة البيانات.
   - في حال عدم الاستجابة يفشل الإجراء تلقائياً مع طباعة السجلات في الـ Pipeline.
8. **إعادة تحميل خادم الويب Nginx:**
   - `sudo systemctl reload nginx`.

---

## 3. أسرار GitHub المطلوبة (GitHub Actions Secrets)

يتم ضبط الأسرار تحت مسار المستودع:  
`GitHub repo -> Settings -> Secrets and variables -> Actions`

| اسم السر | الوصف | القيمة النموذجية |
| :--- | :--- | :--- |
| `ORACLE_SSH_KEY` | مفتاح SSH الخاص للاتصال بالسيرفر | OpenSSH Private Key |
| `ORACLE_HOST` | عنوان IP لسيرفر أوراكل | `92.5.178.54` (اختياري، يملك قيمة افتراضية) |
| `ORACLE_USER` | اسم المستخدم في السيرفر | `ubuntu` (اختياري، يملك قيمة افتراضية) |
| `ORACLE_PORT` | منفذ الـ SSH | `22` (اختياري، يملك قيمة افتراضية) |

---

## 4. متغيرات بيئة الإنتاج السحابية (Production Env Highlights)

بيئة الباك إند (`backend/.env` على سيرفر أوراكل) تتضمن:
```env
NODE_ENV=production
APP_MODE=CLOUD_SAAS
PLATFORM_TENANT_ID=zsystems
APP_LOGIN_URL=https://app.zsystems.io/login
MAIL_DELIVERY_MODE=smtp
PUBLIC_TRIAL_DEBUG_CREDENTIALS=false
ENABLE_BOOTSTRAP_ADMIN=false
ALLOW_BOOTSTRAP_ADMIN_IN_PRODUCTION=false
```

بيئة بناء الفرونت إند:
```env
VITE_API_BASE_URL=https://api.zsystems.io
VITE_PLATFORM_TENANT_ID=zsystems
```

---

## 5. روابط الفحص المباشر بعد النشر (Health Check Verification)

- **فحص جاهزية الخادم:** `https://api.zsystems.io/api/health/live`
- **فحص جاهزية قاعدة البيانات:** `https://api.zsystems.io/api/health/ready`
- **لوحة الدخول:** `https://app.zsystems.io/login`
- **بوابة السائقين:** `https://app.zsystems.io/driver`

