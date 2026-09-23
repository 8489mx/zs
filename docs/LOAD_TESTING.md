# دليل اختبارات الحمل والإجهاد (Load & Stress Testing with k6)

> **الغرض:** توفير منظومة اختبارات أداء وحمل مؤسسية دقيقة تحاكي أقصى ضغوط التشغيل الواقعية على سيرفر المنظومة (Oracle Cloud VPS) وقاعدة بيانات PostgreSQL، والتحقق الحاسم من ثبات النظام، وسرعة الاستجابة، وخلو العمليات المتزامنة تماماً من الاستعصاء القفلي (Deadlocks - SQLSTATE 40P01).

---

## 1. الثوابت المعمارية المحروسة في اختبارات الحمل

| # | الثابت المعماري | الهدف من اختبار الحمل | السيناريو المقابل |
|---|---|---|---|
| **1** | **PERF-2 & PERF-9** (`PERFORMANCE_CONSTITUTION.md`) | حماية زمن استجابة مزامنة كتالوج الكاشير ($p95 < 150ms$ لفحص النسخة، $p95 < 600ms$ للكتالوج الشامل)، ومنع أي حلقة O(N×M) أو تجميد للخادم عند تزامن عشرات الكاشيرات | `pos-catalog-sync.js` |
| **2** | **الترتيب القانوني للأقفال (§2.1)** (`ARCHITECTURE_INVARIANTS.md`) | حظر استعصاء ABBA والـ Deadlocks نهائياً؛ قفل `products` تصاعدياً قبل `product_location_stock` عند تزامن عشرات طلبات الشراء الإلكتروني على نفس الأصناف | `storefront-checkout.js` |
| **3** | **عزل حدود محاولات الدخول (O72)** | التأكد من أن الهجمات وحزم محاولات تسجيل الدخول المتلاحقة يتم حجبها بـ HTTP 429 دون التأثير على المستخدمين الشرعيين أو مشاركة الدلو بالخطأ | `auth-login-burst.js` |
| **4** | **الإجهاد الشامل للمنصة (Full Stress)** | محاكاة يوم تشغيلي كامل يجمع بين الكاشيرات والمتسوقين ومسابير الصحة معاً للتأكد من توازن الاستهلاك | `stress-all.js` |

---

## 2. هيكل مجلد اختبارات الحمل (`load-tests/`)

```
load-tests/
├── config.js                       # الإعدادات المشتركة، المتغيرات، ودوال توليد البيانات
├── runner.cjs                      # مشغل اختبارات الحمل عبر Node.js
├── run.bat                         # سكريبت تشغيل سريع لبيئة ويندوز
├── run.sh                          # سكريبت تشغيل سريع لبيئة لينكس وماك والسيرفر
└── scenarios/
    ├── pos-catalog-sync.js         # محاكاة مزامنة 50 كاشير لنقطة البيع بالتوازي
    ├── storefront-checkout.js      # محاكاة 50 مشتري ينفذون طلبات شراء متزامنة
    ├── auth-login-burst.js         # محاكاة هجوم تخمين ومحاولات دخول متسارعة (Rate Limit)
    └── stress-all.js               # اختبار الإجهاد الشامل لكافة قطاعات النظام
```

---

## 3. متطلبات وطرق التشغيل

لا تتطلب المنظومة أي تعديل على كود الإنتاج. يمكن تشغيل الاختبارات بطريقتين:

### الطريقة الأولى: عبر أداة k6 المثبتة محلياً (الموصى بها للمطورين)

1. **تثبيت k6:**
   - **ويندوز (عبر winget أو Chocolatey):**
     ```powershell
     winget install k6 --source winget
     # أو
     choco install k6
     ```
   - **لينكس (Ubuntu / Debian):**
     ```bash
     sudo gpg -k
     sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
     echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
     sudo apt-get update && sudo apt-get install k6
     ```
   - **ماك (macOS via Homebrew):**
     ```bash
     brew install k6
     ```

2. **التشغيل الفوري:**
   ```bash
   # تشغيل السيناريو الشامل
   npm run test:load

   # أو عبر السكريبت المباشر
   ./load-tests/run.sh scenarios/storefront-checkout.js
   # على ويندوز:
   load-tests\run.bat scenarios\pos-catalog-sync.js
   ```

---

### الطريقة الثانية: عبر حاوية Docker (بدون تثبيت أي أدوات)

في حال عدم توفر أداة `k6` مثبتة على الجهاز، المشغل المرفق (`run.bat` / `run.sh` / `runner.cjs`) يكتشف تلقائياً وجود Docker ويقوم بتشغيل صورة `grafana/k6` الرسمية فورياً:

```bash
docker run --rm -i -v "$PWD:/work" -w /work/load-tests --network=host grafana/k6 run scenarios/stress-all.js
```

---

## 4. توجيه الاختبار نحو بيئة محددة (Local / Staging / Production)

تعتمد كافة السيناريوهات على متغيرات البيئة المعرفة في `config.js`. يمكن توجيه الاختبار لأي سيرفر عبر تمرير `TARGET_URL`:

```bash
# استهداف سيرفر التطوير المحلي
k6 run -e TARGET_URL=http://localhost:3001 load-tests/scenarios/pos-catalog-sync.js

# استهداف بيئة الاختبار التجريبية / السيرفر
k6 run -e TARGET_URL=https://app.zsystemai.com -e STOREFRONT_SLUG=almhnds load-tests/scenarios/storefront-checkout.js
```

---

## 5. قراءة وتحليل النتائج ومؤشرات النجاح (SLA Thresholds)

عند اكتمال أي اختبار حمل، تعرض أداة k6 تقريراً إحصائياً دقيقاً. المعايير المعتمدة للمنظومة هي:

1. **`storefront_deadlocks_detected`:** **يجب أن تكون `0` تماماً (count == 0).** أي رقم أكبر من الصفر يعني حدوث خرق للترتيب القانوني للأقفال.
2. **`pos_version_duration_ms`:** **95% من الطلبات أقل من 150ms.** إثبات عمل الـ Trigger السريع وعدم حساب الأرصدة مجدداً.
3. **`pos_full_sync_duration_ms`:** **95% من الطلبات أقل من 600ms** حتى تحت ضغط 50 كاشيراً متزامناً.
4. **`http_req_failed`:** نسبة الأخطاء العامة أقل من 1%.
5. **`login_429_rate_limited_count`:** تأكيد اعتراض المحاولات السريعة وإرجاع كود 429 بعد تجاوز المعدل المسموح.
