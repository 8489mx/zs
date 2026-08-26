# Production Sale Plan — 2026-04-19

## التقييم الحالي
- **التقييم: 8.6 / 10**
- النظام قوي جدًا وظيفيًا، وفيه اختبارات حرجة، لكن قبل البيع التجاري المباشر يحتاج حزمة نشر موحّدة وسيناريو تثبيت واضح.

## هدف البيع الفعلي
تقديم نسختين رسميتين من نفس المنتج:
1. **نسخة Offline On-Prem** (تتثبت على جهاز/سيرفر العميل داخل الشركة).
2. **نسخة Hosted** (ترفع على استضافة VPS/Cloud مع دومين وSSL ونسخ احتياطي).

---

## المسار A — نسخة Offline (تثبيت محلي عند العميل)

### A1) الشكل النهائي للتسليم
- حزمة واحدة (ZIP/Installer) تشمل:
  - backend
  - frontend build
  - postgres (إما embedded أو Docker)
  - سكربت start/stop/backup/restore
- واجهة التشغيل تكون من نفس عنوان محلي واحد (مثلاً `http://127.0.0.1:8080`) عبر reverse proxy داخلي.

### A2) متطلبات تقنية
1. جعل frontend static build يخدمه backend أو Nginx محلي.
2. إلغاء الاعتماد على تشغيل frontend بترمنال منفصل في بيئة العميل.
3. ربط backend + frontend عبر proxy داخلي بدل IPs متعددة.
4. توفير migration + seed + health checks في سكربت تثبيت واحد.

### A3) مخرجات لازمة قبل البيع
- `install.sh` / `install.ps1`
- `start.sh` / `start.ps1`
- `backup.sh` / `restore.sh`
- دليل دعم فني مختصر (كيف تبدأ/توقف/تحدث النظام)

---

## المسار B — نسخة Hosted (استضافة)

### B1) الشكل النهائي للتسليم
- خدمة backend + frontend خلف Nginx/Caddy على دومين واحد:
  - `https://app.customer-domain.com`
- PostgreSQL managed أو self-hosted مع نسخ احتياطي يومي.

### B2) متطلبات تقنية
1. SSL/TLS إجباري + HSTS.
2. Secrets في manager آمن (مش في ملفات plain text على السيرفر).
3. مراقبة logs + uptime + alerts.
4. سياسة تحديث وإصدار (versioning + rollback plan).

### B3) مخرجات لازمة قبل البيع
- `docker-compose.prod.yml` أو manifests جاهزة.
- Runbook نشر + Rollback.
- backup policy + restore drill موثق.

---

## ما يجب إنجازه الآن (أولوية التنفيذ)
1. **توحيد نقطة الدخول**: frontend + backend تحت domain/IP واحد.
2. **بناء حزمة production واحدة** بدل تشغيل جزئين يدويًا.
3. **تثبيت آلي** (offline + hosted) مع health checks.
4. **ترخيص وتفعيل** (لو هتبيع نسخ متعددة) مع آلية binding للجهاز/العميل.
5. **توثيق التشغيل التجاري**: SLA، backup، recovery، update policy.

## Definition of Done للبيع
- العميل يقدر يثبت/يشغل النظام من دليل 10-15 دقيقة بدون تدخل مطور.
- Backup/restore مجرّب فعليًا.
- نسخة hosted شغالة بدومين وSSL وmonitoring.
- نسخة offline شغالة local بالكامل بدون إنترنت (عدا التفعيل لو مطلوب).
- QA/release gate ناجح قبل التسليم.
