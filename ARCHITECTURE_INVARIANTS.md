# دستور الثوابت المعمارية وسجل التدقيق (Architecture Invariants & Audit Ledger)

> **الغرض:** هذا الملف ليس حصراً للميزات (ذلك في `SYSTEM_CAPABILITIES.md`). هذا الملف يجيب على أسئلة مختلفة:
> **ما الذي يجب ألا يُكتب أبداً؟ وأين المصدر الوحيد للحقيقة؟ وما الثوابت المفروضة؟ وماذا دُقِّق وماذا لم يُدقَّق بعد؟**
>
> **لمن يقرأ هذا الملف بعد انقطاع (بشر أو مساعد ذكي):** ابدأ من القسم 1 ثم القسم 2. القسم 2 وحده يمنع أكثر من نصف الأخطاء التي رصدناها فعلياً في هذا المشروع.
>
> **قاعدة إلزامية:** أي إصلاح لثغرة بنيوية، أو ثابت جديد يُفرض، أو نمط يُحظر — يُوثَّق هنا فوراً.

**آخر تحديث:** سبتمبر 2026 · **المراحل المغلقة بالعمق:** 0 · نقطة البيع · 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 11 · **12 (آلية عزل المستأجرين والحُرّاس)** · **13 (البند O2 — مواضع `UPDATE`/`DELETE` بلا `tenant_id`)** — والباقي مصنَّف في القسم 7

---

## 1. كيف تقرأ هذا المشروع قبل أن تكتب فيه سطراً

| # | السؤال | الملف |
|---|---|---|
| 1 | ما الحدود المعمارية (سحابة/ديسكتوب، عزل المستأجرين)؟ | `SAAS_ELECTRON_ISOLATION_CONSTITUTION.md` |
| 2 | ما قواعد الواجهة العربية والتصميم؟ | `GEMINI.md` |
| 3 | ما الميزات الموجودة فعلاً (لتجنب إعادة بناء منجز)؟ | `SYSTEM_CAPABILITIES.md` |
| 4 | **ما المحرمات والثوابت وأين دقَّقنا؟** | **هذا الملف** |
| 5 | قواعد العمل والتدقيق الحسابي | `AGENTS.md` (Rule 13) |

### الدرس الحاكم المستخلص من كل جولات التدقيق

> **النمط الأخطر في هذا المشروع ليس المنطق الخاطئ، بل المنطق الصحيح غير الموصول.**

تكرر هذا النمط في خمسة مواضع مستقلة على الأقل:

| الموضع | الصيغة كانت صحيحة | ولم تُنفَّذ لأن |
|---|---|---|
| استرداد الدفعة المقدمة (مقاولات) | نافذة `clamp` مكتوبة بدقة | الواجهة كانت ترسل النسبة دائماً فتقفز فوق الفرع |
| MATCH-1 (مشتريات) | المحرك يدعم `historicalInvoicedLines` | المستدعي لم يمرره إطلاقاً |
| MATCH-2 (مشتريات) | منطق فرق السعر سليم | أعمدة `po_id` لم تُنشأ في الهجرة |
| إعادة تقييم العملات | الحساب صحيح | الاستعلام يشير لأعمدة وجداول غير موجودة، مخفية بـ`as any` |
| `reconciliationDiscrepancy` | محسوب بدقة | لم يُفحص في أي شرط |

**لذلك:** لا تكتفِ بقراءة المنطق. **تتبَّع المسار من الواجهة إلى المحرك إلى قاعدة البيانات، وشغِّل الاختبار.** `tsc` يثبت اتساق الأنواع، لا أن المال يُخصم.

---

## 2. المصادر الوحيدة للحقيقة — لا تلتفّ عليها

هذه دوال/وحدات **إلزامية**. أي كتابة مباشرة بديلة عنها أنتجت خطأ حقيقياً في الماضي.

### 2.1 حركة المخزون → `applyStockDelta`

**الملف:** `backend/src/common/utils/location-stock-ledger.ts`

```ts
await applyStockDelta(trx, { productId, delta, branchId, locationId, tenantId, accountId, ... });
```

**محظور:** كتابة `product_location_stock` أو `products.stock_qty` بـ`UPDATE`/`INSERT` مباشر.

**لماذا:** الالتفاف عليها سبَّب ثلاث فئات من الأعطال فعلياً:
1. **انحراف الرصيد العام** — `van-sales` كان يكتب المواقع فقط ولا يمس `products.stock_qty` ولا `stock_movements`. الرصيد العام كان ينفصل عن مجموع المواقع في كل رحلة.
2. **استعصاء ABBA** — الترتيب القانوني هو `products` ثم `product_location_stock`. القفل بالعكس يُسبب Deadlock مع مسار متزامن.
3. **تجاوز `ensureNonNegativeStock`** ومنطق تفريغ الرصيد غير المخصص.

**ترتيب الأقفال القانوني (لا يُخالَف):**
```
products (FOR UPDATE)  →  product_location_stock (FOR UPDATE)
```
وفي مسار البيع يُستدعى `lockProductRow()` قبل حلقة المواقع لضمان هذا الترتيب.
**وبنود الفاتورة تُرتَّب تصاعدياً بـ`productId`** قبل حلقة المخزون — ترتيب العميل عشوائي ويُسبب Deadlock.

### 2.2 القيود المحاسبية → `insertPostedJournal`

**الملف:** `backend/src/modules/accounting/accounting-posting.service.ts`

يوفّر ثلاثة أشياء لا يوفرها الإدراج اليدوي:
- **حارس التوازن المركزي** (`:421-425`) يرفض أي قيد مدين ≠ دائن.
- **فحص قفل الفترة** بثلاث طبقات (`lock_date_all` / `lock_date_non_adviser` / `lock_date_tax`).
- **ترقيم آمن:** رقم مؤقت ثم إعادة تسمية بالمعرّف.

**محظور:** `COUNT(*) + 1` لتوليد `entry_no`. سبَّب تضارب أرقام قيود تحت التزامن في مسارين (GRN والتكاليف الإضافية).

**محظور:** `if (account) { ...post... }` — التخطي الصامت للقيد. سبَّب اختلال ميزانية بكامل قيمة إذن الاستلام بلا خطأ ولا أثر. استخدم `resolveAccountByCode` الذي **يُنشئ الحساب الناقص** أو يرمي استثناءً.

**مقارنة التواريخ:** دائماً بنص `YYYY-MM-DD`، لا بكائنات `Date`. المقارنة بـ`Date` جعلت إذن استلام الساعة 09:00 في يوم القفل يمر في مسار ويُحجب في آخر.

### 2.3 محركات الحساب النقية

| المحرك | الملف | يفرض |
|---|---|---|
| `computeIpc` | `modules/contracting/ipc-calculation.engine.ts` | I1, I2, I3, I6, I7, I12 |
| `assertAdvancePaymentGate` | `modules/contracting/guarantee-gateway.engine.ts` | G1, G1-C |
| `computeThreeWayMatch` | `modules/purchases/three-way-match.engine.ts` | MATCH-1, MATCH-2, MATCH-3 |
| `computeCarrierInvoiceAudit`, `validateVarianceOverride` | `modules/maritime-freight/engines/freight-audit.engine.ts` | AUDIT-1, AUDIT-2, MC-1, MC-2 |
| `planWebhookOrderLookup`, `selectUnambiguousOrder` | `modules/storefront/engines/webhook-order-resolution.engine.ts` | WH-1 |

**القاعدة (AGENTS.md Rule 13):** المنطق المالي يُستخرج في **دالة نقية** تستوردها الخدمة **ويستوردها الاختبار من الإنتاج**. نسخة مكررة داخل ملف الاختبار = اختبار لا يحرس شيئاً.

### 2.4 سجل التدقيق → أكواد ثابتة لا نصوص

```ts
await this.audit.log('نص عربي للبشر', details, auth, { eventCode: AUDIT_EVENT_CODES.POS_CART_ITEM_REMOVED });
```

**محظور:** بناء منطق كشف على `action LIKE '%نص عربي%'`. إعادة صياغة رسالة واحدة كانت تُعمي رادار الاحتيال بصمت. نفس النمط تكرر في `computeThreeWayMatch` (تحديد الحالة بـ`includes` على الرسائل) وأُصلح بأكواد `BlockingCode`.

---

### 2.4-ب نطاق المستأجر داخل الخدمات → `requireTenantScope` لا `resolveTenantContext`

**الملف:** `backend/src/core/auth/utils/tenant-boundary.ts`

```ts
const { tenantId, accountId } = requireTenantScope(auth);   // ✅ يرمي 403 إن غاب أي منهما
```

الملف نفسه **سليم ومراجَع سطراً بسطر** (23 سطراً، لا فروع خفية، يقصّ المسافات ويرفض الفراغ).
قوّته الحقيقية أنه **يفشل بصوت عالٍ**، وهذا بالضبط ما يميّزه عن جاره:

| الدالة | عند غياب `tenantId` | متى تُستخدم |
|---|---|---|
| `requireTenantScope` | **يرمي `TENANT_SCOPE_REQUIRED` (403)** | كل مسار مُصادَق — 616 موضعاً اليوم |
| `resolveTenantContext` | **يرجع بصمت `TENANT_ID` من البيئة أو `'default'`** | حصراً عند اشتقاق هوية المستخدم وقت تسجيل الدخول (3 مواضع) |

**محظور:** استدعاء `resolveTenantContext(config, req.authContext)` في مسار خدمة.
مسار بلا حارس يُنتج `authContext = undefined` → يسقط صامتاً إلى المستأجر `'default'` فيكتب/يقرأ
في بيانات مستأجر آخر بلا أي خطأ. هذا هو نمط F13 بعينه.

### 2.5 رموز بوابات الأطراف الخارجية → `portal-token.ts`

**الملف:** `backend/src/core/auth/utils/portal-token.ts`

بوابات الموظف (`api/hr/portal`) والمندوب (`api/driver-portal`) والبصمة (`api/hr/mobile-punch`)
تعمل **عمداً** بلا `SessionAuthGuard` وبلا صف في `sessions` — الموظف/المندوب ليس مستخدم نظام.
هويتهم تأتي حصراً من رمز HMAC. لذلك هذا الملف هو **مصدر الحقيقة الوحيد** لتوقيع تلك الرموز:

```ts
const token = signPortalToken({ employeeId, tenantId, accountId }, PORTAL_TOKEN_TTL_MS);
const payload = verifyPortalToken<T>(authHeader, PORTAL_TOKEN_ERRORS);
```

يفرض ثلاثة أشياء لا يوفّرها التوقيع اليدوي:
- **فشل آمن على السر:** في `CLOUD_SAAS` غياب `SESSION_SECRET` (أو سر أقصر من 16 محرفاً) **يرفض
  الإصدار والتحقق معاً** (`PORTAL_TOKEN_SECRET_MISSING`). لا يوجد سر افتراضي في السحابة إطلاقاً.
- **مقارنة ثابتة الزمن:** `timingSafeEqual`، لا `signature !== expected`.
- **عمر موحّد:** `iat`/`exp` تُضافان في مكان واحد بدل ثلاث نسخ متباينة.

**محظور:** `createHmac(...)` مباشرة لتوقيع رمز بوابة، وأي `process.env.SESSION_SECRET || '<ثابت>'`.

**وهذا لا يكفي وحده:** التوقيع يثبت أن الرمز صدر منّا، لا أن حامله ما زال مخوّلاً. الرمز بلا
حالة وعمره 30 يوماً، فكل `verifyToken`/`verifyDriverToken` **يعيد التأكد من قاعدة البيانات** أن
الموظف/المندوب ما زال `active` **داخل نفس المستأجر المذكور في الرمز**، ويشتق `tenantId`/`branchId`
من صف قاعدة البيانات لا من حمولة الرمز.

---

## 3. الأنماط المحظورة (كل واحد سبَّب خطأ حقيقياً)

| # | النمط المحظور | الخطأ الذي سبَّبه |
|---|---|---|
| F1 | قراءة ثم كتابة بلا `forUpdate()` داخل معاملة | عكس قيد مرتين · إلغاء فاتورة يُرجع المخزون مرتين · إقفال سنة مالية مزدوج |
| F2 | حساب خارج المعاملة ثم الكتابة داخلها | إقفال سنة مالية على أرقام قديمة — قيود مُرحَّلة بينهما تُستبعد من قيد الإقفال |
| F3 | `(db as any)` على استعلام | أخفى 3 أخطاء مخطط في `forex-revaluation` (عمودا `name`/`type` وجدول `treasuries` غير موجودين) — الميزة كانت ميتة بالكامل |
| F4 | توليد مفتاح إدمبوتنسي جديد عند إعادة المحاولة | ازدواج فواتير نقطة البيع عند مزامنة الأوفلاين |
| F5 | فرع يتحكم فيه المستدعي حول بوابة رقابية | تجاوز بوابة G1 بترك قائمة منسدلة على قيمتها الافتراضية |
| F6 | `COUNT(*) + 1` للترقيم | تضارب أرقام قيود تحت التزامن |
| F7 | تخطٍّ صامت (`if (x) { post } `) | اختلال دفاتر بلا خطأ ولا تحذير |
| F8 | مطابقة نصوص عربية لتحديد حالة/تصنيف | تصنيف يتغير بصمت عند إعادة صياغة رسالة |
| F9 | `UPDATE`/`DELETE` بلا `tenant_id` في الشرط | مخالفة دستورية؛ آمن اليوم بفضل فحص ملكية سابق لكنه هش |
| F10 | حقل مُخزَّن لا يُقرأ في أي منطق | 10 أعمدة خصم كانت تُحفظ ولا تُخصم — واجهة توحي بالخصم ولا تخصم |
| F11 | نقطة نهاية "محاكاة/Sandbox" تُترك قابلة للاستدعاء المباشر دون حارس أو فحص بيئة | `sandbox-checkout/complete` كان بلا `SessionAuthGuard` ويقرأ `tenantId`/`planId`/`amount` من جسم الطلب مباشرة، فيتيح لأي طرف (حتى مجهول) ترقية أي باقة اشتراك مجاناً بلا أي دفع فعلي، حتى مع تفعيل مفاتيح بوابة حقيقية |
| F12 | تحقق توقيع Webhook بقيمة افتراضية `isValid = true` عند غياب السر (`if (secret && signature) { تحقق } ` بلا `else`) | فشل آمن معكوس (Fail-Open): أي Webhook غير موقّع يُقبل تلقائياً إن لم يُضبط سر التحقق في البيئة، مما يسمح بتزوير "دفعة ناجحة" لأي مستأجر بلا أي تحقق تشفيري (xpay/paymob/stripe) |
| F13 | مسار في Controller يقرأ `req.authContext?.tenantId` دون أي `@UseGuards` يملأ `authContext` أصلاً | `mobile-attendance.controller.ts`: مسارا `branches/:id/geofence` و`employees/:id/pin` بلا حارس ولا تحقق توكن يدوي — `authContext` دائماً `undefined`، فيسقط `tenantId` صامتاً لقيمة افتراضية؛ الأول كان بلا شرط `tenant_id` في الاستعلام إطلاقاً → كتابة عابرة للمستأجرين بلا مصادقة |
| F14 | قبول "PIN افتراضي" معروف (`'1234'` أو آخر 4 أرقام من الهاتف) كبديل عند عدم ضبط بيانات اعتماد صريحة، مع غياب أي حد لمحاولات الدخول على بوابة PIN قصيرة (4 أرقام) | `employee-portal.controller.ts` login: انكشاف رواتب/سلف/عُهد الموظفين بتخمين PIN افتراضي معروف بلا أي عائق تقني (10,000 احتمال بلا Throttling) |
| F15 | مسار عام (Public) يتحقق من الهوية بمفتاح أساسي تسلسلي مشترك بين كل المستأجرين (`BIGINT IDENTITY`) بلا أي رمز سرّي مرافق | `maritime-public-tracking.controller.ts`: `rfq/:id` و`rfq/:id/bid` كانا يستعلمان `WHERE id = :id` مباشرة — بعكس مسار `track/:token` بنفس الملف الذي يتحقق بشكل سليم من `tracking_token`/أرقام مستندات — يتيح تعداد وقراءة/حقن بيانات مناقصات أي مستأجر |
| F16 | سر توقيع بقيمة افتراضية مكتوبة في الكود (`process.env.X \|\| '<ثابت>'`) لمفتاح يُثبت **الهوية** | ثلاث بوابات (`employee-portal`, `mobile-attendance`, `delivery-reps`) كانت توقّع رموزها بـ`SESSION_SECRET \|\| 'zs-...-2026'`. السر منشور في المستودع، فإن لم يُضبط `SESSION_SECRET` على الخادم يستطيع **أي شخص** تزوير رمز بأي `employeeId` و**أي `tenantId`** وقراءة رواتب وسلف وعُهد موظفي أي منشأة. هذه نسخة F12 (الفشل الآمن المعكوس) مطبَّقة على المصادقة لا على الـWebhook |
| F17 | استعلام داخل بوابة خارجية يُرشِّح بـ`employee_id`/`rep_id` وحده بلا `tenant_id` | `employee-portal.service.ts`: كل استعلامات الرواتب والحضور والإجازات والسلف والعهد كانت `WHERE employee_id = ?` فقط، و`getDashboard` كان **يستقبل** `tenantId` ولا يستخدمه إطلاقاً (F10). و`hr_leave_types` كان يُقرأ بـ`WHERE is_active = true` بلا أي نطاق — تسريب كتالوج إجازات كل المستأجرين لأي مستخدم بوابة بلا أي تزوير |
| F18 | `INSERT` يغفل `tenant_id`/`account_id` على جدول عمودُه `NOT NULL DEFAULT ''` | هجرات التوسعة أضافت `tenant_id TEXT NOT NULL DEFAULT ''`، فالإغفال **لا يرمي خطأ** بل يكتب الصف بمستأجر `''`. `requestLeave` و`requestAdvance` كانا يكتبان طلبات الإجازات والسلف (سجل **مالي**) بلا نطاق → الطلب يختفي نهائياً من شاشة الموارد البشرية التي تُرشِّح بـ`tenant_id`، بلا خطأ ولا أثر. النوع في Kysely `string \| undefined` عند الإدراج فلا يحرسه `tsc` |
| F19 | بناء شرط الاستعلام **شرطياً** من حمولة خارجية (`if (tenantId) q = q.where(...)`) في مسار عام | الشرط الغائب لا يُرفض، بل **يُحذف النطاق**. أربع نقاط Webhook عامة في `storefront-payment.service.ts` كانت تبني بحث الطلب هكذا، فحمولة بلا إشارة مستأجر تنتج `WHERE order_number = ?` على كل المستأجرين، والجملة التالية تقلب الصف الناتج إلى `paid`. و`online_orders.order_number` تسلسلي **لكل مستأجر** (`ON-YYMMDD-0001`، فهرس `(tenant_id, order_number)` غير فريد) فليس هوية. القاعدة: غياب النطاق يجب أن **يُضيّق** الخيارات أو يرفض، لا أن يوسّعها — وهذا ما يفرضه محرك `planWebhookOrderLookup` النقي (الثابت WH-1) |
| F20 | الاعتماد على `database.types.ts` لتحديد ما إذا كان الجدول مُنطَّقاً بمستأجر | الأنواع **تسبق** المخطط ولا تطابقه: `OfflineReleaseTable` و`ManufacturingBomLineTable` تعلنان `tenant_id`/`account_id` بينما العمودان **غير موجودين في قاعدة البيانات إطلاقاً**. إضافة `.where('tenant_id', ...)` اعتماداً على النوع تمر من `tsc` ثم تنفجر وقت التشغيل على عمود غير موجود. المصدر الوحيد للحقيقة هنا هو **ملفات الهجرة**، لا ملف الأنواع (نسخة من F3: النوع يخفي المخطط) |
| F21 | إضافة `AND tenant_id = ?` إلى `DELETE`/`UPDATE` على جدول كاتبُه يغفل العمود (F18) | الإصلاح الجماعي "الآمن ظاهرياً" يكسر الميزة: صفوف قديمة بـ`tenant_id = ''` تتوقف عن المطابقة. `updateLoan` كان سيُنتج **جدول أقساط مكرراً** عند كل تعديل لو أُضيف الشرط بلا إصلاح الـ`INSERT` وبلا هجرة ترميم. القاعدة: قبل تضييق أي شرط، افحص **كل كاتب** للجدول أولاً، ورمِّم الصفوف القائمة في هجرة، أو استخدم `(tenant_id = ? OR tenant_id = '')` حين يكون المفتاح الأب مُتحقَّقاً منه أصلاً |

---

## 4. سجل الثوابت المفروضة

### مقاولات — المستخلص (`computeIpc`)
| # | الثابت |
|---|---|
| I1 | `Σ استرداد الدفعة المقدمة ≤ الدفعة المصروفة` — سقف على **كل** المسارات بما فيها التجاوز اليدوي |
| I2 | المحتجز على `grossWorkDone` فقط (خارج MOS والتعديل السعري)، بسقف `retention_cap` |
| I3 | غرامة التأخير مقيدة بـ`ld_cap_pct` |
| I6 | `net_payable ≥ 0`؛ السالب يُرحَّل كرصيد مدين ويُسحب آلياً في المستخلص التالي |
| I7 | التراكمي يُشتق من دفتر القاعدة لا من إدخال الواجهة |
| I12 | `Σ سطور الخصومات التفصيلية = العمود المجمّع` وإلا يُرفض المستخلص |

### مقاولات — الضمانات (`guarantee-gateway.engine`)
| # | الثابت |
|---|---|
| G1 | لا صرف دفعة مقدمة بلا ضمان `active` يغطي المبلغ والتاريخ |
| G1-C | `Σ الدفعات المقدمة السابقة + المطلوبة ≤ قيمة الضمان` (الصرف المجزأ) |

### مشتريات — المطابقة الثلاثية (`three-way-match.engine`)
| # | الثابت |
|---|---|
| MATCH-1 | `الكمية المفوترة التراكمية ≤ الكمية المستلمة المقبولة` — تشمل الفواتير السابقة **وسطور نفس الفاتورة** |
| MATCH-2 | تجاوز السعر لأعلى فقط يُحجب؛ الفرق المواتي للمشتري يمر |
| MATCH-3 | البند الخدمي يتطلب شهادة إنجاز |
| RECON | `إجمالي الفاتورة = تصفية GRNI + فرق السعر` — **يحجب الترحيل** ولا يُقبل تجاوزه |
| نطاق التجاوز | `price_only` لا يُسقط حجب الكمية؛ `full` يتطلب صلاحية admin؛ السبب ≥ 10 أحرف |

### محاسبة عامة
| # | الثابت |
|---|---|
| — | `EXCLUDE USING gist` يمنع تداخل السنوات المالية على مستوى القاعدة |
| — | إقفال السنة يُعيد احتساب الإيراد/المصروف **داخل المعاملة** ويرفض الإقفال إن تغيّرت الأرقام |
| — | إقفال السنة **يجب** أن يضع قفل الفترة (إنشاء صف الإعدادات إن لزم) |
| — | IAS 21: إعادة التقييم للبنود **النقدية فقط** (`is_monetary = true`) وبعملة محددة (`revaluation_currency`) |

### نقطة البيع والورديات
| # | الثابت |
|---|---|
| C1 | **يُمنع** تصافي عجز وردية مع زيادة أخرى — حسابان مختلفان (7200 / 7100) |
| C2 | عجز فوق حد التسامح → ذمة مدينة (1135) باسم أمين الصندوق، لا مصروف |
| C3 | العد الأعمى مفروض على **حمولة الـAPI** لا على الواجهة |

### اللوجستيات والشحن — تدقيق فواتير الناقل (`freight-audit.engine`)
| # | الثابت |
|---|---|
| AUDIT-1 | مطابقة فاتورة الناقل آلياً مع التعرفة المتعاقد عليها (Contracted Rate Card) وعرض السعر الفائز واكتشاف البنود غير المتفق عليها |
| AUDIT-2 | حظر ترحيل الفواتير التي بها زيادة غير مبررة (Overcharge Blocking) ما لم يتم اعتماد استثناء موثق أو فتح نزاع رسمي |
| MC-1 | حوكمة Maker-Checker: لا يجوز لمنشئ الفاتورة تجاوز أو اعتماد الفروق بنفسه (`userId !== createdBy`) |
| MC-2 | التجاوز يتطلب صلاحية إدارية/مالية (`admin`, `super_admin`, `finance_manager`) مع تبرير إلزامي ≥ 10 أحرف |
| DISP-1 | الترقيم الموحد لإشعارات النزاع `DISP-YYMMDD-XXXX` مع تعليق الفاتورة لحين التسوية |

### عزل المستأجرين في الكتابة (البند O2 — المرحلة 13)
| # | الثابت |
|---|---|
| WH-1 | **لا تصل نقطة Webhook عامة إلى صف إلا بإثبات ملكيته.** وجود إشارة مستأجر ⇒ الاستعلام **ملزم** بـ`tenant_id`؛ غيابها ⇒ لا يُقبل إلا معرّف صادر من البوابة، وبشرط أن يطابق **صفاً واحداً بالضبط** (`.limit(2)` تكشف الالتباس). `order_number` ليس هوية عابرة للمستأجرين. المحرك النقي: `modules/storefront/engines/webhook-order-resolution.engine.ts` |
| T1 | **كل `INSERT` على جدول فيه `tenant_id` يكتبه صراحةً.** العمود `NOT NULL DEFAULT ''` لا يرمي عند الإغفال، و`tsc` لا يحرسه — فالإغفال يُنتج صفاً بمستأجر `''` يختفي من كل بوابة تُرشِّح بالعمود (F18) |
| T2 | **كل `UPDATE`/`DELETE` يحمل شرط `tenant_id` في نفس الجملة**، لا في فحص ملكية سابق. الاستثناءات الوحيدة المقبولة موثَّقة بالاسم في القسم 8 (البند O2): جداول بلا عمود مستأجر، ومسارات المنصة المركزية، والهجرات |
| T3 | **قبل تضييق شرط، افحص كل كاتب للجدول.** إضافة `tenant_id` لشرط `DELETE` بينما الـ`INSERT` يغفله يكسر الميزة بصمت (F21) |

---

## 5. سجل الهجرات البنيوية (100 – 127)

| # | الهجرة | الغرض |
|---|---|---|
| 100 | `contracting_phase0_reconciliation_and_schema_hardening` | تفكيك `other_deductions` + أعمدة الشروط التعاقدية + `NOT VALID` |
| 101 | `contracting_phase0_closure_composite_fks_and_checks` | مفاتيح مركبة `(tenant_id, id)` + `ON DELETE RESTRICT` + قيود `CHECK` |
| 102 | `contracting_phase0_backfill_mapping_and_reconciliation` | ترحيل هوية مقاولي الباطن + تسوية قبلية/بعدية + `VALIDATE` |
| 103 | `contracting_guarantees_and_gateway_g1` | جدول الضمانات + بوابة G1 |
| 104 | `contracting_g1_cumulative_and_composite_fks` | `payment_category` + الغطاء التراكمي + مفتاح المشاريع المركب |
| 105 | `contracting_field_indirect_cost_allocation` | أوعية التكلفة غير المباشرة *(عمل متوازٍ)* |
| 106 | `goods_receipt_notes_and_three_way_matching` | إذن الاستلام + جدول المطابقة *(عمل متوازٍ)* |
| 108 | `cashier_shift_variance_resolution` | مسار تسوية فروق الوردية |
| 109 | `audit_logs_event_code` | أكواد أحداث ثابتة + ترحيل السجلات التاريخية |
| 110 | `journal_partner_type_employee` | توسيع `partner_type` لدعم ذمم الموظفين |
| 111 | `fiscal_year_overlap_exclusion` | منع تداخل السنوات المالية (يرفض التثبيت فوق بيانات مخالفة) |
| 112 | `accounting_accounts_monetary_flag` | `is_monetary` + `revaluation_currency` (IAS 21) |
| 113 | `purchase_order_linkage_and_match_integrity` | `po_id` / `po_item_id` + أكواد الحجب + نطاق التجاوز |
| 114 | `stock_transfer_transit_variance` | `dispatched_qty`/`received_qty`/`variance_qty` لتسجيل فاقد النقل |
| 115 | `stock_global_counter_reconciliation` | **تسوية لمرة واحدة** لعداد المخزون العام + `stock_reconciliation_log` + تأكيد بعدي |
| 116 | `journal_entries_pdc_and_wht_uniq` | مؤشرات تفرد قيود أوراق القبض والدفع والخصم والإضافة |
| 117 | `hr_eos_accounting_uniqueness` | مؤشرات تفرد قيود نهاية الخدمة وترقيم المستندات |
| 118 | `customer_installments_pricing_crm_hardening` | مؤشرات تفرد خطط وأقساط العملاء وموجات التسعير |
| 119 | `maritime_rfq_public_quote_token` | رمز سرّي عشوائي لمناقصات الشحن العامة |
| 120 | `contracting_documents_and_meetings` | سجل المخططات والمستندات ومحاضر الاجتماعات |
| 121 | `contracting_schedule_resource_loading` | الجدولة المحمّلة بالموارد وتوزيع العمالة والمعدات |
| 122 | `maritime_rate_cards` | مصفوفة التعرفات وعقود الشحن المحفوظة |
| 123 | `maritime_rate_cards_unique_carrier_name` | إصلاح تفرد التعرفات لدعم عدة خطوط ملاحية |
| 124 | `maritime_customs_declarations` | بنود وبيانات الإفراج الجمركي والرسوم |
| 125 | `maritime_carrier_invoice_audit` | جداول فواتير الناقل وتدقيق التعرفة والنزاعات المالية |
| 126 | `multimodal_freight_insurance_and_warehousing` | الشحن الجوي وتأمين البضائع وأذون المستودعات |
| 127 | `hr_child_tables_tenant_backfill` | **ترميم F18:** يشتق `tenant_id`/`account_id` من الصف الأب لـ`hr_attendance_exceptions` و`hr_leave_requests` و`hr_employee_assets` (من `hr_employees`) و`hr_employee_loan_installments` (من `hr_employee_loans`) و`hr_payroll_item_adjustments` (من `hr_payroll_run_items`)، + فهرس `(tenant_id, employee_id, work_date)`. بلا هذا الترميم تبقى الصفوف القائمة غير مرئية للبوابات التي تُرشِّح بالعمود. الـ`down` **لا** يعكس الترميم عمداً |

> **تنبيه:** 105 و106 من عمل متوازٍ. رقّمت هجراتي 108+ لتفادي التصادم. تحقق من آخر رقم قبل إنشاء هجرة جديدة.

---

## 5-ب. سجل الإصلاحات التفصيلي (ابحث هنا قبل أن تُصلح شيئاً)

> **الغرض:** الإجابة على سؤال «هل عولج هذا من قبل؟» بلا إعادة تحقيق.
> الصيغة: *الموضع · ما كان معطلاً · ما صار*

### نقطة البيع والورديات
| الموضع | كان | صار |
|---|---|---|
| `usePosOfflineSync.ts` | يولّد مفتاح إدمبوتنسي **جديد** عند 409/422 → فواتير مكررة وخصم مخزون مضاعف | `sale.id` مفتاح ثابت؛ 409 → إعادة محاولة بنفس المفتاح؛ 422 → استعلام حالة الخادم ثم قرار، وعند تعذر التأكد `failed` للمراجعة اليدوية |
| `sales-write.service.ts` (`createSale`/`updateSale`) | حلقة المخزون بترتيب بنود العميل → استعصاء ABBA بين بيعين متزامنين | ترتيب قانوني تصاعدي بـ`productId` + `lockProductRow()` قبل حلقة المواقع |
| `sales-write.service.ts:cancelSale` | قراءة بلا `forUpdate` → إلغاءان متزامنان يُرجعان المخزون مرتين ويعكسان القيد مرتين | `forUpdate()` + إدمبوتنسي على `POST /sales/:id/cancel` |
| `cash-drawer.service.ts:recordCashMovement` | إدراج + إعادة حساب + تحديث **خارج معاملة** → تحديث ضائع على `expected_cash`؛ والحساب يقرأ من `this.db` داخل معاملة الإغلاق | معاملة واحدة بقفل صف الوردية + تمرير `queryable` عبر سلسلة دوال الحساب الست |
| `cashier-fraud-radar.service.ts` | كشف الاحتيال بمطابقة نصوص عربية (`action LIKE '%خصم%'`) | `audit_logs.event_code` + `AUDIT_EVENT_CODES` + `classifyRadarEvent` (هجرة 109، مع ترحيل السجلات التاريخية) |
| `accounting-posting.service.ts` | عجز الوردية → مصروف 7200 دائماً مهما بلغ | حد تسامح + ذمة مدينة 1135 باسم أمين الصندوق + `variance_resolution` (هجرة 108، و110 لتوسيع `partner_type`) |

### المحاسبة العامة (المرحلة 1)
| الموضع | كان | صار |
|---|---|---|
| `accounting.service.ts:reverseJournalEntry` | حراس `status`/`reversed_by_entry_id` على قراءة غير مقفلة **خارج** المعاملة → عكس القيد مرتين وتضاعف أثره | قراءة مقفلة داخل المعاملة وإعادة فحص الحالتين |
| نفس الدالة | **تتجاوز قفل الفترة تماماً** → عكس داخل سنة مقفلة يُعيد كتابة أرصدتها بعد اعتمادها | `assertPeriodOpenForReversal` بنفس منطق `insertPostedJournal` |
| `accounting.service.ts:1819,1878` | فحص «هل على الحساب قيود؟» يستعلم `journal_entry_lines` **بلا `tenant_id`** | فلتر المستأجر مُضاف |
| `fiscal-year.service.ts` | المعاينة خارج المعاملة · لا قفل صف · قفل الفترة مشروط بـ`if` · تداخل السنوات بـSELECT-ثم-INSERT | قفل + إعادة احتساب داخل المعاملة + `onConflict` للإعدادات + قيد `EXCLUDE USING gist` (هجرة 111) |
| `forex-revaluation.service.ts` | **معطلة بالكامل** — أعمدة `name`/`type` وجدول `treasuries` غير موجودة، مخفية بـ`as any`؛ واختيار الحسابات بمطابقة أسماء لا تميّز النقدي | `is_monetary` + `revaluation_currency` (هجرة 112) واختيار صريح |

### المشتريات (المرحلة 2)
> ملخصها في جدول القسم 7؛ التفصيل الكامل في `SYSTEM_CAPABILITIES.md` تحت بند أذون الاستلام والتكاليف الإضافية.

### المخزون (المرحلة 3)
| الموضع | كان | صار |
|---|---|---|
| `van-sales.service.ts` (7 مواضع) | كتابة `product_location_stock` خام؛ **صفر مساس** بـ`products.stock_qty` و`stock_movements` | `moveVanStock` عبر `applyStockDelta` + حركة رسمية بأرصدة حقيقية + تمييز النقل عن البيع |
| `purchase-orders.service.ts:receiveOrder` | مسار استلام **ثانٍ** يكتب المخزون يدوياً بترتيب أقفال معكوس وبأرصدة حركة `0/qty` مزيفة | `applyStockDelta` + أرصدة حقيقية + `branch_id` مشتق من الموقع |
| `inventory-transfer.service.ts` | `stock_transfer_items.qty` واحدة → **فاقد النقل غير قابل للتسجيل**؛ الوجهة تستلم بالضبط ما أُرسل | `dispatched_qty`/`received_qty`/`variance_qty` (هجرة 114) + شطب العجز من الترانزيت كـ`transfer_transit_loss` يُنقص الرصيد العام |
| `catalog-product.service.ts` | الرصيد الافتتاحي يُكتب في الجدولين بلا حركة في الدفتر المستمر | حركة `opening_balance` مضافة لاتصال الدفتر |

### الموارد البشرية (المرحلة 6)
| الموضع | كان | صار |
|---|---|---|
| `hr.service.ts` (مسارا احتساب الرواتب) | قسط القرض يُسجَّل **بكامل قيمته المجدولة** ثم يُقصَّ صافي الأجر إلى صفر — و`settlePayrollLoanDeductions` يُرصِّد القرض بالمبلغ الكامل → **الشركة تُسقط ديناً لم تستقطعه فعلاً** | أولوية خصومات: القسط يأخذ المتاح فقط (`min(scheduled, grossPay − deductions)`)، ويُسجَّل المستقطع **الفعلي**، والفرق يُؤجَّل بملاحظة موثقة |
| `end-of-service.service.ts:calculateSettlementPreview` | احتساب الثلث والثلثين كنسب عشرية تقريبية (`33.333` و `66.667`) → انحراف سنتات في استحقاقات العامل | احتساب دقيق بكسور القانون الصريحة (`/ 3` و `* 2 / 3`) بدون أي فاقد تقريب |
| `end-of-service.service.ts:postAccountingEntry` | قيد محاسبي غير متوازن (`Unbalanced manual journal entry`): المدين يتجاهل بدل الإنذار والمستحقات الأخرى، والدائن يختل عند وجود استقطاعات عهد أو جزاءات | توازن محاسبي تام عبر `AccountingPostingService.postEndOfServiceSettlement` مع سقف امتصاص الاستقطاعات لمنع اختلال القيد في الحالات الحدية |
| `end-of-service.service.ts:postAccountingEntry` | توجيه قيود نهاية الخدمة إلى تكلفة بضاعة مباعة (5110) واستقطاع السلف من المخزون (1140)! | توجيه سليم: مصروفات الرواتب ومكافأة نهاية الخدمة (6200)، وسلف الموظفين (1160)، وإيرادات استرداد العهد والجزاءات (7100)، وحسابات الخزينة/البنك/الرواتب المستحقة (1110/1120/2140) |
| `end-of-service.service.ts:postAccountingEntry` | سداد السلف بمخالصة نهاية الخدمة لا يُحدِّث `hr_employee_loans` ولا الأقساط ولا `hr_employee_ledger` → بقاء سلف العامل مفتوحة بالـ HR | تحديث فوري لكافة السلف المفتوحة (`paid_amount`, `remaining_amount`, `status`) وإقفال الأقساط المستحقة وتسجيل قيد `loan_repayment` في دفتر الأستاذ المساعد للموظف |
| `end-of-service.service.ts:postAccountingEntry` | السماح بصرف المخالصة لموظف لديه عهد وأصول غير مستردة مع صفر استقطاع وبلا إخلاء طرف | حارس رقابي صارم: حظر ترحيل وصرف المخالصة في حال وجود عهد غير مستردة إلا بوجود إخلاء طرف معتمد (`custody_cleared`) أو استقطاع قيمتها (`assets_deduction > 0`) |
| `end-of-service.service.ts:createSettlement` | ترقيم المستند بـ `COUNT(*)::int + 1` → خطر التصادم والتكرار تحت التزامن | ترقيم تسلسلي قياسي حصين عبر `formatDailyDocumentNumber('EOS', Number(inserted.id))` |
| هجرة 117 | غياب قيد التفرد على قيود المخالصة المحاسبية وترقيم المستندات | مؤشر تفرد جزئي `idx_journal_entries_hr_eos_uniq` لمنع ازدواج الترحيل ومؤشر `idx_hr_eos_tenant_settlement_no_uniq` |

### المتجر والتسعير (المرحلة 7)
| الموضع | كان | صار |
|---|---|---|
| `storefront.service.ts` (الكوبونات) | `times_used = القيمة المقروءة + 1` → **تحديث ضائع**: طلبان متزامنان يقرآن N ويكتبان N+1، فكوبون محدود بـ100 استخدام يُستهلك أضعافاً. وفحص `usage_limit` كان على قراءة غير مقفلة فلا يمنع التجاوز | تحديث شرطي ذري واحد: `times_used = times_used + 1` بشرط `(usage_limit IS NULL OR times_used < usage_limit)`، ورفض الطلب عند صفر صفوف متأثرة |

### منصة SaaS والفوترة السحابية (تدقيق مسار الاستدعاء — المرحلة 11)
> اكتُشفت أثناء تتبع مسار الاستدعاء الفعلي (Controller → Guard → Service) لموديول `tenant-subscription`، المجاور لـ `saas-admin` وضمن نفس حدود منصة الفوترة. `saas-admin.controller.ts` نفسه محكم بالكامل (حارس صفي واحد `SessionAuthGuard + SuperAdminRoleGuard` يغطي 20 مساراً بلا استثناء).

| الموضع | كان | صار |
|---|---|---|
| `tenant-subscription.controller.ts` — `POST /api/tenant-subscription/sandbox-checkout/complete` | **بلا أي حارس مصادقة**، ويقرأ `tenantId`/`planId`/`amount` من جسم الطلب مباشرة ويستدعي `processDirectPayment` فوراً — أي طرف مجهول يعرف `tenantId` (UUID يظهر في رابط صفحة الدفع الخاصة بأي مستخدم) يستطيع ترقية أي باقة اشتراك (حتى Omnichannel) مجاناً بلا دفع فعلي، **حتى في وجود مفاتيح بوابة حقيقية مفعّلة** | `@UseGuards(SessionAuthGuard)` على المسارين (`sandbox-checkout` و`sandbox-checkout/complete`)؛ `tenantId` يُشتق حصراً من `req.authContext.tenantId` ويُتجاهل تماماً ما يصل في الجسم؛ حارس جديد `assertSandboxGatewayUsable()` يرفض الطلب بـ403 إن كانت أي مفاتيح بوابة حقيقية (XPay/Paymob/Stripe) مُفعّلة في البيئة — المحاكاة تعمل فقط في غياب بوابة حقيقية، تماماً كما يوحي اسمها |
| `xpay.gateway.ts` / `paymob.gateway.ts` — `verifyAndParseWebhook` | `isValid` افتراضياً `true`، ولا يتحقق إلا إن وُجد كل من السر والتوقيع معاً — غياب متغير البيئة `XPAY_WEBHOOK_SECRET`/`PAYMOB_HMAC_SECRET` يعني قبول أي Webhook مزوّر بلا أي تحقق تشفيري | `isValid` افتراضياً `false` (فشل آمن Fail-Closed)؛ xpay يتحقق بـ HMAC-SHA256 على **الجسم الخام** (`req.rawBody`) بدلاً من إعادة تسلسل JSON؛ paymob يستخدم `timingSafeEqual` بدلاً من مقارنة نصية مباشرة لمنع هجمات التوقيت |
| `stripe.gateway.ts` — `verifyAndParseWebhook` | `isValid: true` **بلا أي محاولة تحقق توقيع إطلاقاً** — أي جسم JSON يُصدَّق فوراً كدفعة ناجحة | تحقق حقيقي بصيغة Stripe القياسية (`Stripe-Signature: t=...,v1=...`) على الجسم الخام مع HMAC-SHA256 وحماية ضد إعادة التشغيل (رفض التوقيعات الأقدم من 300 ثانية) |
| `main.ts` (بنية تحتية) | لا التقاط للجسم الخام (`rawBody`) — يستحيل التحقق التشفيري الصحيح لأي بوابة تعتمد على البايتات الخام لا على إعادة التسلسل | `json({ verify })` يحفظ `req.rawBody` عالمياً؛ يمر عبر `PaymentManagerService.processWebhook` إلى كل بوابة |

**الدرس المستخلص (Rule 14):** الافتراض الضمني كان "الموديول المجاور (`saas-admin`) مدقَّق فمنصة SaaS بأكملها آمنة". الثغرة الفعلية كانت في موديول شقيق (`tenant-subscription`) لم يُفحص لأنه لا يحمل اسم `saas-admin` — **حدود التدقيق يجب أن تتبع الحدود الرقابية (منصة الفوترة) لا حدود التسمية البرمجية (اسم المجلد/الموديول)**.

### تدقيق مسار الاستدعاء — المراحل 6 إلى 10 (Controllers/بوابات الموبايل)
> فحص شامل لكل Controller في نطاق كل مرحلة: حارس صفي، أي `@Controller` ثانٍ مخفي في نفس الملف، وتحقق يدوي للتوكن (`verifyToken`) في بوابات الموبايل التي تعمل عمداً بلا جلسة Cookie. **نظيف بالكامل:** المرحلة 7 (`customer-installments`, `pricing`, `crm`, `price-lists`, `quotations`, `sales-orders`)، المرحلة 9 (`cash-drawer`, `manufacturing`, `pharmacy`, `tradein`)، المرحلة 10 (`accounting.controller.ts` — 78 مساراً، وتحقق يدوي أن حظر حذف الأصل المُهلَك موصول فعلياً حتى `WHERE tenant_id`).

| الموضع | كان | صار |
|---|---|---|
| `mobile-attendance.controller.ts` — `PUT branches/:id/geofence` | **بلا `@UseGuards` وبلا `verifyToken`**؛ `UPDATE branches ... WHERE id = branchId` بلا `tenant_id` إطلاقاً — أي مجهول يُغيّر نطاق الحضور الجغرافي لأي فرع في أي مستأجر | `@UseGuards(SessionAuthGuard, PermissionsGuard)` + `@RequirePermissions('hrAttendance')`؛ `tenantId` عبر `requireTenantScope(req.authContext)`؛ `WHERE id = branchId AND tenant_id = tenantId` |
| `mobile-attendance.controller.ts` — `PUT employees/:id/pin` | **بلا `@UseGuards` وبلا `verifyToken`**؛ كان يقرأ `req.authContext?.tenantId \|\| 'default'` رغم عدم وجود حارس يملأ `authContext` — غير مستغَلة اليوم بالصدفة فقط (O12) | نفس الحارس والصلاحية أعلاه؛ `tenantId` موثوق من الجلسة الفعلية لا افتراضي صامت |
| `employee-portal.controller.ts` — `POST portal/login` | يقبل PIN افتراضي `'1234'` أو آخر 4 أرقام من الهاتف لأي موظف بلا `pin_code` مضبوط، بلا أي حد لمحاولات الدخول | أُزيل البديل الافتراضي كلياً (يتطلب `pin_code` مضبوطاً صراحة)؛ `LoginAttemptLimiter` جديد (`common/utils/login-attempt-limiter.ts`) يقفل بعد 5 محاولات فاشلة لكل (مُعرّف + نطاق منشأة) لمدة 15 دقيقة |
| `maritime-public-tracking.controller.ts` — `GET/POST rfq/:id[/bid]` | يستعلم `WHERE id = rfqId` مباشرة — `maritime_rfqs.id` تسلسلي (`BIGINT IDENTITY`) مشترك بين كل المستأجرين، بلا أي رمز سرّي، بعكس `track/:token` في نفس الملف | عمود جديد `public_quote_token` (هجرة 119، عشوائي 32 بايت عبر `gen_random_uuid()` مضاعف، فهرس تفرد جزئي) يُنشأ مع كل RFQ ويُضمَّن في رابط دعوة الناقل؛ `assertValidPublicQuoteToken` (type guard) يرفض أي طلب بلا تطابق رمز بـ404 موحدة (لا تكشف وجود المعرّف من عدمه) |

**الدرس المستخلص:** ثلاثة من الأربعة أعطال كانت في **بوابات موبايل/عامة تتعمد العمل بلا `SessionAuthGuard`** (تصميم صحيح للوصول الخارجي) لكنها اعتمدت على انضباط المطوّر اليدوي (استدعاء `verifyToken` أو التحقق من رمز) في **كل** مسار بلا استثناء — تماماً مثل الدرس السابق حول "المنطق الصحيح غير الموصول" (§1)، لكن هنا على طبقة المصادقة نفسها لا المنطق المالي. أي بوابة عامة جديدة يجب أن تُفحص سطراً بسطر — لا يكفي أن يكون بعض مساراتها محمياً لتُصنَّف الفئة كلها آمنة.

### آلية عزل المستأجرين نفسها — قراءة كاملة (البند 1 في `REVIEW_ROADMAP.md`، سبتمبر 2026)

> **النطاق المقروء سطراً بسطر:** `core/auth/utils/tenant-boundary.ts` · `tenant-context.ts` · `csrf-token.ts` ·
> `portal-token.ts` (جديد) · الحُرّاس الخمسة (`session-auth`, `permissions`, `admin-role`, `super-admin-role`,
> `app-bootstrap`) · `session.service.ts:resolveAuthContext` + `auth-cache.service.ts` · **ثم مسح آلي لكل
> 78 Controller و941 مساراً** لتحديد ما يعمل بلا حارس، يليه قراءة يدوية لكل مسار بلا حارس.

**النتيجة الحاكمة:** `tenant-boundary.ts` نفسه **سليم**، والحُرّاس سليمة، و`resolveAuthContext` يفحص
(تطابق `session.tenant_id` مع `user.tenant_id` · `is_active` · `expires_at` · `locked_until` · حالة اشتراك
المستأجر · تنزيل `super_admin` إلى `admin` خارج منصة `zs`). **الثغرات كلها كانت خارج هذه الآلية، في
البوابات التي تلتفّ عليها عمداً** — وهو تكرار ثالث للدرس الحاكم: الخطر ليس في المنطق الخاطئ بل في
المنطق الصحيح الذي لا يمرّ عليه أحد.

| الموضع | كان | صار |
|---|---|---|
| `employee-portal.service.ts` · `mobile-attendance.service.ts` · `delivery-reps.service.ts` — توقيع الرموز | `SESSION_SECRET \|\| 'zs-attendance-mobile-punch-secret-2026'` (ونظيره `'zs-delivery-secret-token-key-2026'`) — سر منشور في المستودع؛ بلا `SESSION_SECRET` مضبوط يستطيع أي طرف تزوير رمز بأي `tenantId` (F16). والمقارنة `signature !== expected` غير ثابتة الزمن رغم وجود `timingSafeEqual` مستخدماً فعلاً في `csrf-token.ts` | ملف واحد `core/auth/utils/portal-token.ts` (§2.5): فشل آمن يرفض الإصدار **والتحقق** في `CLOUD_SAAS` بلا سر ≥ 16 محرفاً، `timingSafeEqual`، وعمر موحّد `PORTAL_TOKEN_TTL_MS` |
| البوابات الثلاث — `verifyToken` / `verifyDriverToken` | تتحقق من التوقيع فقط وتُرجع حمولة الرمز كما هي. الرمز بلا حالة وعمره 30 يوماً ولا يمر على `sessions` → موظف **مفصول** أو مندوب **موقوف** أو مستأجر **موقوف الاشتراك** يحتفظ بوصول كامل شهراً كاملاً، وتغيير الـPIN لا يُبطل شيئاً | صارت `async` وتفحص القاعدة على كل طلب: الصف موجود و`active` **و`tenant_id` مطابق لما في الرمز**؛ `tenantId`/`accountId`/`branchId` تُشتق من صف القاعدة لا من الحمولة |
| `employee-portal.service.ts` — كل استعلامات البوابة | `WHERE employee_id = ?` بلا `tenant_id` في: الحضور، الرواتب، تسويات الرواتب، الإجازات، السلف، العهد، والملف الشخصي. و`getDashboard(employeeId, tenantId)` **يستقبل** `tenantId` ولا يستخدمه (F10/F17) | `tenantId` مُمرَّر من الرمز المُتحقَّق منه إلى **كل** دالة ومضاف لكل استعلام |
| `employee-portal.service.ts:getLeaves` — `hr_leave_types` | `WHERE is_active = true` بلا أي نطاق → أي مستخدم بوابة يقرأ كتالوج أنواع الإجازات لكل المستأجرين (تسريب مباشر بلا تزوير) | `+ WHERE tenant_id = ?` |
| `employee-portal.service.ts:requestLeave` / `requestAdvance` | `INSERT` بلا `tenant_id`/`account_id` على جدولين عمودهما `NOT NULL DEFAULT ''` → طلب الإجازة و**طلب السلفة (سجل مالي)** يُكتبان بمستأجر `''` فيختفيان نهائياً من شاشة الموارد البشرية بلا خطأ (F18). و`leave_type_id: body.leaveTypeId \|\| 1` يقبل معرّف نوع إجازة من العميل بلا تحقق من ملكيته | النطاق مُمرَّر صراحة في الـ`INSERT`؛ ونوع الإجازة يُتحقق من أنه نشط **ويخص نفس المستأجر** وإلا `INVALID_LEAVE_TYPE` |
| `employee-portal.service.ts` — `hr_leave_balances` | الجدول **غير موجود في أي هجرة إطلاقاً**. `getDashboard` و`getLeaves` كانا ينهاران وقت التشغيل، والخطأ مخفي خلف `this.db as any` — نفس نمط `forex-revaluation` بالحرف (F3) | `computeLeaveBalances()` تشتق الرصيد من المصدر الحقيقي `hr_employees.annual_leave_balance` (هجرة `2030000000006`) مخصوماً منه الإجازات المعتمدة هذا العام |
| `mobile-attendance.service.ts` — قراءة `branches` في `getTodayStatus` و`recordPunch` | `WHERE id = user.branchId` بلا `tenant_id` — إحداثيات ونطاق الـgeofence لأي فرع في أي مستأجر، ومع F16 يصير الـbranchId قابلاً للاختيار من داخل رمز مزوَّر | `+ WHERE tenant_id = user.tenantId`، و`branchId` يُقرأ من صف الموظف لا من الرمز |
| `session-auth.guard.ts` — `readSessionId` | يقبل معرّف الجلسة من `?token=` / `?sessionId=` على **كل** الطرق بما فيها `POST/PUT/DELETE`، وبصرف النظر عن `ALLOW_SESSION_ID_HEADER` الذي يمنع المصادقة بالرأس في `CLOUD_SAAS` عمداً. معرّف الجلسة في الـURL يتسرب عبر سجلات الوكيل والخادم وسجل المتصفح ورأس `Referer` | يُقبل على الطرق الآمنة فقط (GET/HEAD) — يحفظ حالة التنزيل المباشر ويزيل سطح تنفيذ العمليات من رابط مسرَّب. (فحص: لا مستدعٍ واحد في الواجهة الأمامية يستخدم `?token=` للجلسة) |

#### ما فُحص ووُجد سليماً (لا تُعِد فحصه بلا سبب)

- **لا يوجد `APP_GUARD` عام** — كل Controller يعلن حارسه بنفسه. المسح الآلي (78 صنفاً / 941 مساراً)
  أرجع **73 مساراً بلا أي حارس**، قُرئت كلها يدوياً: كلها عامة **بالتصميم** (تسجيل دخول، Webhooks
  بوابات الدفع، واجهة المتجر بالـ`slug`، فحوص الصحة، تحديثات الديسكتوب) أو محميّة بتحقق يدوي
  (رموز البوابات، رمز RFQ العام بعد إصلاح F15، `passcode` التحديثات). **لا مسار إداري واحد مكشوف.**
- `permissions.guard.ts` — يرمي عند غياب `@RequirePermissions`/`@RequireAnyPermission`/`@AllowAuthenticated`،
  وفحص الميزة (`requiredFeature`) يسبق فحص الصلاحيات عمداً لمنع تجاوز الحارس. `super_admin` يمر بعد فحص الميزة.
- `super-admin-role.guard.ts` — العزل المزدوج (`role === 'super_admin' && isPlatformTenant`) سليم.
  المسارات التي تستخدمه وحده على مستوى الدالة يحميها `SessionAuthGuard` على مستوى الصنف (حُرّاس Nest تتراكم ولا تتبادل).
- `assertTenantScopeHeadersMatchAuth` — يرفض `x-tenant-id`/`x-account-id` المخالف للجلسة (دفاع في العمق سليم).
- `AuthCacheService` — مُسجَّل في `AuthFoundationModule` وهو `@Global()`، فالنسخة **واحدة** لكل التطبيق
  وإبطال `invalidateTenant` من `saas-admin` يصل فعلاً لكاش الجلسات. (قيمة `= new AuthCacheService()` الافتراضية
  في المُنشئ كود ميت لا يُنفَّذ تحت حاوية Nest — مضلّلة لكنها غير ضارة.)
- **مقارنة رموز CSRF** بـ`timingSafeEqual` (كانت صحيحة أصلاً — وهي ما كشف أن البوابات تخالفها).

### تسوية عداد المخزون العام (هجرة 115)
| البند | التفصيل |
|---|---|
| السبب | مسارات سابقة (`van-sales`، استلام أوامر الشراء) كتبت المواقع دون `products.stock_qty`. المسارات أُصلحت، لكن **الانحراف التاريخي لا يُشفى ذاتياً** |
| مصدر الحقيقة | `SUM(product_location_stock.qty)` لكل `(tenant, account, product)` شاملاً صفوف `location_id IS NULL` — نفس تعريف `trueGlobalQty` داخل `applyStockDelta` |
| الأمان | كل تصحيح يُسجَّل في `stock_reconciliation_log` **قبل** تطبيقه · الأصناف التي لها رصيد عام بلا صفوف مواقع تُحفَظ على الرصيد غير المخصص **ولا تُصفَّر** · تأكيد بعدي يرمي استثناءً إن بقي أي انحراف · `down()` يستعيد الأرصدة من السجل |
| التشغيل | لمرة واحدة، وإعادة تشغيلها لا تُصحِّح شيئاً إضافياً بعد التطابق |

#### الخزينة وأوراق القبض والدفع والتسوية البنكية والخصم والإضافة (المرحلة 5)
| الموضع | كان | صار |
|---|---|---|
| `payment-allocation.service.ts` | حراس AL1 (سقف السند) وAL2 (سقف الفاتورة) موجودان لكن **كل القراءات بلا `forUpdate`** → تخصيصان متزامنان يقرآن نفس الرصيد وكلاهما يمر | `forUpdate()` على قراءات السند والفاتورة الأربع |
| `accounting.service.ts` (`reconcileMatch`) | مطابقة السطور البنكية خارج المعاملة وبلا قفل، ولا فحص لحالة المطابقة السابقة أو تطابق المبالغ | معاملة ذرية + قفل `forUpdate` على سطري البنك والقيد + حظر المطابقة المزدوجة + مطابقة حساب البنك + تسامح 0.01 في المبلغ |
| `accounting.service.ts` (`unreconcileMatch`) | إلغاء المطابقة خارج المعاملة | معاملة ذرية + قفل `forUpdate` وعكس أعلام المطابقة بشكل متزامن |
| `pdc-cheques.service.ts` | دورة حياة الشيكات (استلام، إيداع، تحصيل، ارتداد، تظهير، إصدار، صرف) تتم كبيانات معزولة بلا أي قيود في الأستاذ العام | ربط كامل مع `AccountingPostingService` بـ 8 قيود محاسبية متوازنة (1122/1121/1120/1130/2110/2135) داخل معاملات ذرية وقفل `forUpdate` |
| `withholding-tax.service.ts` | نموذج 41 للخصم والإضافة لا يرحل قيد سداد عند التحويل إلى `paid` | ترحيل قيد سداد فوري لمصلحة الضرائب (`Dr. 2125 / Cr. 1120`) داخل معاملة ذرية وقفل `forUpdate` |
| هجرة 116 | عدم وجود قيد تفرد على قيود أوراق القبض والدفع والخصم والإضافة | مؤشر تفرد `idx_journal_entries_pdc_and_wht_uniq` لمنع ازدواج الترحيل ومؤشرات لتسريع التسوية البنكية |
| `customer-installments.service.ts` | سداد الأقساط والدفعات المقدمة كان يُدرج فقط في `customer_payments` دون تعديل رصيد العميل، ودون قيد في `customer_ledger`، ودون حركة خزينة، ودون ترحيل قيد للأستاذ العام | ربط كامل مع `SalesFinanceService` و `AccountingPostingService` لتخفيض رصيد العميل، إثبات حركة الخزينة، وترحيل قيد متوازن للأستاذ العام؛ فرض قفل تشاؤمي `forUpdate()` على القسط والخطة لمنع التحصيل الزائد وتكرار السداد |
| `pricing.service.ts` | موجات التسعير تحدث الأصناف بترتيب عشوائي والتراجع عنها خارج المعاملة وبلا قفل | تطبيق الترتيب القانوني للأقفال (تصاعدي بـ `productId`) لمنع الـ Deadlocks، وتحصين التراجع الذري بقفل `forUpdate()` على `price_change_runs` |
| `crm.service.ts` | تحويل الفرصة لعميل `convertToCustomer` وحذف الفرصة `deleteDeal` كانا يتمان بدون معاملات ذرية | تغليف كامل داخل معاملات ذرية `trx` مع أقفال صفوف وحذف تسلسلي آمن للأنشطة والفرص |
| هجرة 118 | غياب قيود التفرد على خطط وأقساط العملاء وفهارس موجات التسعير | إنشاء مؤشرات تفرد `idx_customer_installment_plans_tenant_number_uniq` و `idx_customer_installments_tenant_plan_num_uniq` وفهارس تسريع موجات التسعير والمدفوعات |

### موديول المقاولات — إغلاق فجوات مقارنة الكبار (Procore/CMiC/Primavera Benchmark، سبتمبر 2026)
> بعد بحث فعلي في ممارسات Procore وCMiC وViewpoint Vista وAutodesk Build ومقارنتها بالكود (لا بالتوثيق)، حُدِّدت 5 فجوات حقيقية. ثلاثة منها نُفِّذت بالكامل (Backend + Frontend + هجرات + تحقق)، واثنان (الجدولة المحمّلة بالموارد — أُنجز لاحقاً، والبوابة الخارجية) — راجع القسم 8 للتفاصيل والمبررات.

| الفجوة | كانت | صارت |
|---|---|---|
| سجل المخططات والمستندات (Document Register) | `drawing_ref` مجرد حقل نصي داخل شاشة الاعتمادات فقط — لا تاريخ مراجعات، لا Markup، لا سجل توزيع | جداول جديدة (هجرة 120): `contracting_documents` → `contracting_document_revisions` (تاريخ كامل، لا استبدال) → `contracting_document_distributions` (من استلم أي مراجعة ومتى وكيف). ترقيم آمن (Insert-then-rename، ليس COUNT(*)+1) |
| محاضر الاجتماعات (Meeting Minutes) | غير موجودة إطلاقاً | جدولان جديدان (هجرة 120): `contracting_meeting_minutes` (رقم موحد MOM-YYMMDD-XXXX، حضور JSONB) و`contracting_meeting_action_items` (بنود متابعة قابلة للربط بـRFI/أمر تغيير، فتح/إغلاق) |
| التدفق النقدي المتوقع (Cash Flow Forecast) | تقسيم بنسب ثابتة عشوائية (50%/30%/20%) بلا أي علاقة بتواريخ الاستحقاق الفعلية؛ `pendingSupplierInvoices`/`upcomingWages` كانا `0` صامتاً (بيانات وهمية) | تجميع فعلي حسب `payment_due_date` الحقيقي لكل مستخلص (0-30/31-60/61-90/+90 يوماً) + دلو "بلا تاريخ استحقاق" منفصل بدل الدمج الأعمى؛ `pendingSupplierInvoices`/`upcomingWages` أصبحا `null` صراحة (غير مربوطين بعد) بدل صفر مضلِّل — الواجهة تعرض "غير متاح" |
| الجدولة المحمّلة بالموارد (Resource-Loaded Schedule) | `assigned_team` نص حر فقط، بلا أي عدد قابل للتجميع | أعمدة جديدة (هجرة 121): `planned_manpower_count`, `planned_equipment_count`, `resource_trade` على كل مهمة + تقرير Histogram أسبوعي (`getResourceLoadingHistogram`) يُجمِّع العمالة/المعدات لكل أسبوع من كل المهام المتداخلة زمنياً، ويحدد أسبوع الذروة وتوزيع التخصصات |
| بوابة تعاون خارجية (External Collaboration Portal) | كل شيء داخلي بحت | **لم تُبنَ عمداً** — تتطلب سطح مصادقة جديد بالكامل لأطراف خارجية (استشاري/مالك)، وهذا تحديداً نوع القرار الأمني الذي يستحق جلسة تصميم مستقلة لا تنفيذاً متسرعاً وسط جلسة تدقيق — خصوصاً بعد اكتشاف عدة ثغرات مصادقة حقيقية في نفس الجلسة (F11-F15) |

**اكتشاف جانبي أثناء العمل:** `contracting.service.ts` يحوي **172 استخدام لـ`(this.db as any)`** — خرق مباشر لقاعدة F3 ("لا تُخفِ أخطاء المخطط بـ`as any`") المُوثَّقة في هذا الملف نفسه، والتي تسببت سابقاً في تعطل `forex-revaluation` بالكامل بصمت. كل الكود الجديد المُضاف اليوم مكتوب بأنواع Kysely الحقيقية بلا استثناء واحد؛ الدين القديم (172 موضعاً) لم يُمس — يحتاج جلسة مستقلة مخصصة له (راجع O16).

### موديول اللوجستيات والشحن البحري — إغلاق فجوات مقارنة الكبار (CargoWise/GoFreight Benchmark، سبتمبر 2026)
> بعد بحث فعلي في ممارسات CargoWise وGoFreight ومقارنتها بالكود، حُدِّدت 4 فجوات. اثنتان نُفِّذتا بالكامل، وثنتان مؤجَّلتان بقرار واعٍ (O18, O19) لأنهما تتطلبان إما اعتماد/عقد خارجي (EDI حقيقي) أو سطح مصادقة جديد (بوابة حجز ذاتي للعملاء) — بنفس منطق تأجيل بوابة المقاولات الخارجية.

| الفجوة | كانت | صارت |
|---|---|---|
| إدارة التعرفات والعقود (Rate Management) | آلية التسعير الوحيدة كانت RFQ حي (اطلب الآن، انتظر رد الناقل) — لا جدول تعرفات محفوظ يمكن التسعير الفوري منه | جدول جديد `maritime_rate_cards` (هجرة 122، وإصلاح تفرد في هجرة 123 — راجع أدناه) + `findBestRate()` يرجع أرخص تعرفة سارية لنفس المسار/الحاوية فوراً + `createRateCardFromBid()` يحوّل أي عرض فائز من RFQ لتعرفة قابلة لإعادة الاستخدام — بحيث تتراكم قاعدة التسعير تلقائياً مع كل صفقة |
| بيانات الجمارك (Customs & Compliance) | "الجمارك" كانت نصاً وصفياً فقط في دليل الناقلين ("يقدّم تخليص جمركي") — صفر تتبع فعلي لكود HS أو قيمة جمركية أو رسوم | جدولان جديدان (هجرة 124): `maritime_customs_declarations` → `maritime_customs_declaration_items` (كود HS، القيمة الجمركية، نسبة ومبلغ الرسم محسوب تلقائياً). **نطاق متعمَّد:** تسجيل داخلي فقط، وليس تقديماً حياً لبوابة جمركية حكومية (راجع O18) |
| تكامل EDI/API حي مع الناقلين والموانئ | كل المحطات الملاحية (Milestones) تُسجَّل يدوياً بموظف | **لم يُبنَ عمداً — يحتاج مفاتيح API واشتراكات مدفوعة (AIS، EDI الناقل) لا يملكها هذا الجلسة** (O18). "رادار الأقمار الصناعية" الموجود فعلياً هو رابط خارجي لـMarineTraffic/VesselFinder، وليس بيانات AIS حية داخل قاعدتنا — تم التحقق من هذا بالكود لا بالتخمين |
| بوابة حجز ذاتي للعملاء (Self-Service Booking Portal) | العميل يشاهد التتبع فقط عبر رابط عام، لا يحجز شحنة جديدة بنفسه | **لم تُبنَ عمداً** — سطح مصادقة خارجي جديد، نفس القرار الأمني المؤجَّل في بوابة المقاولات الخارجية (O19) |
| تدقيق فواتير الناقل ومطابقة التعرفة (Freight Audit & Reconciliation) | فواتير الناقل تُسجل كمصروف يدوي بلا تدقيق على التعرفة المتعاقد عليها (Rate Card) → تسرب أرباح غير مكتشف (Profit Leakage) مع إمكانية إدخال مبالغ مبالغ فيها وتجاوزها ذاتياً | محرك تدقيق فوري `computeCarrierInvoiceAudit` يقارن مع التعرفة السارية + فحص Maker-Checker صارم (`userId !== createdBy`) + ترقيم موحد للنزاعات `DISP-YYMMDD-XXXX` وإشعار نزاع رسمي قابل للطباعة (هجرة 125) |
| الشحن الجوي والنقل متعدد الوسائط وتأمين البضائع وأذون المستودعات (Multimodal, Air Freight, Cargo Insurance & Warehouse Intake) | غياب دعم الشحن الجوي ومعايير IATA للوزن الحجمي وبوالص AWB، وغياب دورة تأمين البضائع الشامل ضد الأخطار، وعدم وجود أذون استلام وإيداع لمستودعات الترانزيت والإيداع الجمركي (MWR) | محرك شحن جوي نقي `air-freight.engine.ts` بحسابات IATA الدقيقة (نسبة 1:6000) وخوارزمية Modulo-7 لبوالص الشحن الجوي وتتبع محطات Cargo iQ التسع، دورة حياة كاملة لتأمين البضائع ومطالبات التعويض وطباعة شهادة التأمين، وجداول أذون استلام مستودعات الترانزيت والإيداع الجمركي بترقيم موحد `MWR-YYMMDD-XXXX` وتخصيص مواقع التخزين والأرفف (Bay/Rack/Bin) وأوامر الإفراج والتسليم (هجرة 126) |

**درس مُستخلص أثناء البناء (قيمة فحص الـSchema الفعلي وليس فقط `tsc`):** فهرس التفرد الأول في هجرة 122 (`COALESCE(shipping_line_id, 0)`) كان يجمع كل الناقلين **غير المربوطين بسجل** (`shipping_line_id IS NULL` — الحالة الشائعة عند إدخال تعرفة يدوياً) في نفس الحاوية، فيرفض تسجيل تعرفتين من **ناقلين مختلفين** لنفس المسار في نفس اليوم كـ"تكرار" — وهذا يهدم صميم الهدف من الميزة (مقارنة عدة ناقلين). اكتُشف الخطأ بسكربت SQL فعلي مباشرة بعد الهجرة (وليس بمراجعة القراءة)، وأُصلح فوراً بهجرة تصحيحية 123 تستخدم `carrier_name` بدل `shipping_line_id` في مفتاح التفرد. **الدرس:** `tsc` يثبت التوافق النحوي فقط؛ قيود الـSchema (خصوصاً UNIQUE المركّب) يجب اختبارها بإدخال بيانات فعلية تحاكي الحالة الشائعة (هنا: قيمة NULL) قبل اعتبارها صحيحة — بالضبط نفس الدرس الحاكم في §1 من هذا الملف.

### البند O2 — مواضع الكتابة بلا `tenant_id` (المرحلة 13، سبتمبر 2026)

**نطاق المسح:** 707 موضع `updateTable`/`deleteFrom` + كل `sql\`UPDATE/DELETE\`` الخام + كل `INSERT`
في `backend/src` (ما عدا الهجرات). التقدير القديم "~70 موضعاً / ~212 مرشحاً" كان **غير دقيق في الاتجاهين**:
عدد المواضع الحقيقية بلا نطاق كان **90**، لكن أخطرها لم يكن أياً منها — بل كان `INSERT` يغفل العمود.

> **الاكتشاف الحاكم للبند:** خطر O2 الحقيقي ليس شرط `WHERE` الناقص — أغلبها كان آمناً فعلاً بفحص ملكية سابق.
> الخطر هو **عدم تناظر الكاتب والقارئ**: `INSERT` يغفل `tenant_id` (F18) فيكتب الصف بمستأجر `''`،
> ثم قارئ يُرشِّح بـ`tenant_id` فلا يجده أبداً. **أربع ميزات كانت ميتة بصمت** بهذا السبب وحده،
> اثنتان منها بوابتان رقابيتان ماليتان. وهذا يجعل "الإصلاح الجماعي" الذي بدا آمناً **هو الخطر** (F21).

| الموضع | كان | صار |
|---|---|---|
| `storefront-payment.service.ts` — أربع نقاط Webhook عامة (`paymob`/`xpay`/`tap`/`stripe`) | بناء شرط **شرطي**: `if (tenantId) …; if (orderNumber) …` — حمولة بلا إشارة مستأجر تنتج `WHERE order_number = ?` على كل المستأجرين، ثم الجملة التالية تقلب الصف إلى `paid`/`failed`. المسارات عامة بلا حارس بالتصميم، و`order_number` تسلسلي لكل مستأجر فليس فريداً | محرك نقي `webhook-order-resolution.engine.ts` (الثابت WH-1) يفشل مغلقاً: إشارة مستأجر ⇒ نطاق إلزامي؛ بلا إشارة ⇒ معرّف البوابة فقط وبشرط تطابق صف واحد. و12 `UPDATE` على `online_orders` صارت تحمل `tenant_id` صراحةً. جناح `webhook-order-resolution.spec.ts` |
| `van-sales.service.ts:recordFieldCollection` | `tripId` من جسم طلب بوابة المندوب مباشرة إلى `UPDATE van_sales_trips … WHERE id = ?` بلا أي فحص — بعكس جارتيه `recordFieldReturn` و`settleTrip` اللتين تتحققان بـ`vt.tenant_id`. مندوب مستأجر A يضخّم كاش رحلة مستأجر B، وهو الرقم الذي تصالحه `settleTrip` لاحقاً | الرحلة تُحل داخل مستأجر المستدعي وترفض بـ`INVALID_TRIP`؛ وكل كتابات الملف تحمل `tenant_id` |
| `hr.service.ts` — `hr_employee_assets` (F18) | `upsertEmployeeAsset` يكتب العهدة بلا نطاق، بينما **بوابة إخلاء الطرف** في `end-of-service.service.ts:postSettlement` تعدّ العهد غير المستردة بـ`WHERE employee_id = ? AND tenant_id = ?` → ترى صفراً دائماً و**لا تحجب أبداً**: مخالصة نهائية تُرحَّل وتُصرف كاملة لموظف ما زال بعهدته أصول، بلا إخلاء طرف ولا استقطاع. وشاشة المعاينة كانت تقرأ نفس الجدول **بلا** ترشيح فتعرض العهدة التي تتجاهلها البوابة | الإدراج يحمل `tenant_id`/`account_id`؛ المعاينة والبوابة تقرآن بنفس النطاق؛ هجرة 127 ترمّم الصفوف القائمة من `hr_employees` |
| `hr.service.ts` — `hr_leave_requests` (F18) | `createLeaveRequest` (مسار إدارة الموارد البشرية — كاتب البوابة أُصلح في البند 1) يكتب بلا نطاق، بينما `approve`/`reject`/`cancel` تحل الصف بـ`WHERE id = ? AND tenant_id = ?` → الطلب عالق `pending` للأبد، وأيام الإجازة المعتمدة تدخل مسيّر الرواتب | الإدراج يحمل النطاق + ترميم في هجرة 127 |
| `hr.service.ts` — `hr_attendance_exceptions` (F18) | الإدراج بلا نطاق، و`decideAttendanceException` تحل الصف بـ`tenant_id` → **اعتماد أي استثناء حضور مستحيل**. و`late_check_out` من الأنواع القابلة للاعتماد، والرواتب لا تحتسب دقائق الأوفرتايم إلا من استثناء بلغ `approved` → **الأوفرتايم المعتمد لا يصل مسيّر الرواتب أبداً** | الإدراج يحمل النطاق؛ الـ`DELETE`ات الثلاثة بصيغة ذاتية الترميم `(tenant_id = ? OR tenant_id = '')`؛ ترميم + فهرس في هجرة 127 |
| `hr.service.ts` — `hr_payroll_item_adjustments` (F18) | الإدراج بلا نطاق. لم يكشفه أحد حتى أضاف تحصين البند 1 ترشيح `tenant_id` لاستعلام قسيمة الراتب في بوابة الموظف → **تسويات الرواتب اليدوية اختفت من قسيمة الموظف** | الإدراج يحمل النطاق + ترميم من صف `hr_payroll_run_items` |
| `hr.service.ts` — `hr_employee_loan_installments` (F18) | `createLoan`/`updateLoan` يكتبان جدول الأقساط بلا نطاق (كاتب المخالصة كان يكتبه) → الجدول يحمل خليطاً. لا قارئ يُرشِّح بالعمود بعد، فالأثر كامن | الإدراجان يحملان النطاق؛ الـ`DELETE` ذاتي الترميم — **إضافة `tenant_id` وحدها كانت ستُنتج جدول أقساط مكرراً عند كل تعديل قرض** (F21) + ترميم في هجرة 127 |
| `hr.service.ts:setEmployeeAssetStatus` | قراءة **و**تحديث `hr_employee_assets WHERE id = ?` بلا أي شرط مستأجر، وفرع `lost`/`damaged` يُنشئ بعدها **استقطاع راتب** على الموظف الذي وجده | الثلاثة تحمل `tenant_id` |
| 31 موضعاً في 16 ملفاً (شحن بحري، ZATCA، أرفف المخازن، الإعدادات، المتجر، التصنيع، المحاسبة، الكتالوج، الأقساط…) + 3 مواضع اشتراكات | آمنة فعلاً بفحص ملكية **سابق** في جملة منفصلة — الشكل الهش الذي يحظره الدستور | شرط `tenant_id` في نفس الجملة؛ بلا تغيير سلوك |

**مواضع بقيت بلا شرط `tenant_id` — مصنَّفة صحيحة بالتصميم (لا تُصلَح):**

| الموضع | السبب |
|---|---|
| `offline_releases` (12) · `manufacturing_bom_lines` (2) · `saas_client_diagnostics` (1) · `saas_plans` · `auth_rate_limits` | **العمود غير موجود في قاعدة البيانات أصلاً.** تحذير F20: `database.types.ts` يعلن `tenant_id`/`account_id` على `OfflineReleaseTable` و`ManufacturingBomLineTable` رغم ذلك — فإضافة الشرط تمر من `tsc` وتنفجر وقت التشغيل |
| `saas-admin.service.ts` (8) | مسارات المنصة المركزية تحت `assertPlatformAccess`، تعمل على `tenants`/`users`/`sessions` بمفتاحها الأساسي — عابرة للمستأجرين بالتصميم |
| `session.service.ts` (2 متبقيان) · `db-maintenance` (2) | كتابات `users`/`sessions` أثناء الدخول (الهوية عالمية) وتنظيف الجلسات والسجلات المنتهية — عالمية بالتصميم |
| `activation.service.ts` (1) | تمهيد نسخة الديسكتوب؛ يستكشف وجود أعمدة المستأجر بـ`columnExists` فشرط غير مشروط يكسره |
| الهجرات (4) | بيانات ترحيل عابرة للمستأجرين بالتصميم |
| `contracting.service.ts` (4) | **لم تُمس — لا لأنها آمنة بل لأن جلسة أخرى كانت تعدّل الملف أثناء هذه المراجعة.** فُحصت وصُنِّفت آمنة بفحص ملكية سابق (`tenant_id = X OR tenant_id = ''` لبنك البنود المشترك). **تبقى مفتوحة ضمن البند O2** — انظر القسم 8 |

---

## 6. أجنحة الاختبار وما تحرسه

| الجناح | يحرس |
|---|---|
| `contracting-ipc-invariants.spec.ts` | I1, I2, I3, I12 + **أن المسار الافتراضي يستخدم النافذة المقيدة** |
| `contracting-guarantee-gateway.spec.ts` | G1 (4 حالات) + G1-C (3 حالات) + التشابك مع المستخلص + التنبيهات |
| `purchases-three-way-match.spec.ts` | MATCH-1 (فواتير سابقة + سطور مكررة) · MATCH-2 · نطاق التجاوز · ضريبة السطر · التسوية |
| `freight-audit.engine.spec.ts` | AUDIT-1, AUDIT-2, MC-1, MC-2 (تدقيق فواتير الناقل ومطابقة التعرفة وحوكمة الاستثناءات Maker-Checker) |
| `air-freight.engine.spec.ts` | حسابات الوزن الحجمي IATA (1:6000) والوزن الخاضع للتحصيل، تفكيك تكلفة الشحن الجوي والحد الأدنى، خوارزمية التحقق Modulo-7 لبوالص الشحن الجوي AWB |
| `phase5-treasury-pdc.spec.ts` | ثوابت التسوية البنكية (7 حالات) + قيود دورة حياة الشيكات الـ 7 + قيود توريد نموذج 41 |
| `phase6-hr-eos.spec.ts` | احتساب مكافأة نهاية الخدمة (السعودي والمصري) بدقة الكسور + توازن القيود وامتصاص الاستقطاعات + حارس العهد + تسوية السلف |
| `phase7-pricing-crm.spec.ts` | احتساب جداول الأقساط وامتصاص الفكة في القسط الأخير بدقة السنت + حظر التحصيل الزائد وقفل الصفوف + ربط الدفاتر والخزينة والأستاذ العام + معادلات التسعير والتقريب وترتيب الأقفال + حسابات الـ CRM الاحتمالية والوزنية |
| `phase8-logistics.spec.ts` | معايير الترقيم الموحد للوجستيات + تحصين تسوية المناديب بقفل تشاؤمي لمنع الازدواجية + حساب هوامش البيع الميداني ومنع البيع السالب + تسوية بوسطة وحساب COD |
| `phase9-sectoral.spec.ts` | معايير الترقيم الموحد للقطاعيات (SHIFT, UB, TRD, RX, BATCH) + إعادة احتساب WAC في التصنيع + تفكيك المنتجات واستعادة المكونات والتكلفة + عجز وفائض الورديات + محرك FEFO الصيدلاني لعزل المنتهي وترتيب الأقرب انتهاءً |
| `phase10-governance-assets.spec.ts` | معادلات إهلاك الأصول الثابتة (القسط الثابت والمتناقص) وسقف الأساس القابل للإهلاك + توازن قيود إهلاك الأصول وحظر الحذف الصلب بعد الإهلاك + مصفوفات مراكز التكلفة وحاكم الـ 100% + إعادة تقييم العملات الأجنبية IAS 21 والترقيم الموحد FX-YYMMDD-XXXX |
| `phase11-saas-platform.spec.ts` | العزل المزدوج لمنصة الإدارة المركزية وحساب السوبر أدمن + حماية منصة zs من الحذف أو التعديل + تطهير معرفات المشتركين (slugs) + حراسة حصص الباقات للمستخدمين والفروع + دورة حياة الاشتراكات وفترات السماح + تكامل أكواد التدقيق SAAS_* والترقيم الموحد |
| `portal-token.spec.ts` | **فشل آمن لرموز البوابات الخارجية:** رفض الإصدار والتحقق في `CLOUD_SAAS` بلا `SESSION_SECRET` (أو بسر أقصر من 16 محرفاً) · عمل الديسكتوب بلا سر · الدورة الكاملة توقيع/تحقق · رفض تبديل `tenantId` داخل الحمولة مع إعادة استخدام التوقيع · **رفض أي رمز موقَّع بأي من السرّين الافتراضيين المسرَّبين سابقاً** · الرموز المنتهية والمشوّهة والغائبة |
| `webhook-order-resolution.spec.ts` | **الثابت WH-1:** لا تصل نقطة Webhook عامة إلى صف بلا إثبات ملكية — `order_number` وحده يُرفض، ومعرّف البوابة يُقبل فقط بتطابق صف واحد، وغياب إشارة المستأجر لا يوسّع النطاق أبداً |
| `financial-integrity` · `tenant-boundary` · `idempotency` · `tamper-audit-engine` | ثوابت عامة قائمة |

```bash
cd backend && npx tsx test/critical/<name>.spec.ts
```

---

## 6-ب. تدقيق مُركَّز: وحدة الشحن البحري — فاتورة الناقل (بعد عمل موازٍ)

**السياق:** وحدة أخرى (مساعد ذكي آخر) أضافت محرك تدقيق فواتير الناقلين (`freight-audit.engine.ts`) ومسار Maker-Checker في `maritime-freight.service.ts`، وأغلقت المراحل 5–12 بأجنحة اختبار جديدة (39 جناحاً إجمالاً). تدقيق مركَّز على هذا الكود الجديد تحديداً كشف 3 ثغرات مالية حقيقية **من نفس فئة الأخطاء الموثقة في §3 (F1, F2, F7)** — رغم أن المحرك النقي نفسه (`freight-audit.engine.ts`) مكتوب بشكل ممتاز ويتبع النمط المطلوب (Maker-Checker، فصل واجبات، حد أدنى لسبب التجاوز 10 أحرف، اختبار يستورد من الإنتاج).

| # | الموضع | العطل | الإصلاح |
|---|---|---|---|
| 1 | `createCarrierInvoice` / `overrideCarrierInvoice` | **F7 مكرر:** `if (expenseAccId && creditAccId)` يتخطى ترحيل القيد بصمت عند غياب الحسابات 6400/5100/2110 — ومع ذلك: (أ) `carrier_cost_total` للعملية كان يُحدَّث **بلا شرط** خارج هذا الفحص، و(ب) رسالة النجاح في مسار التجاوز تدّعي «تم ... ترحيل القيد المحاسبي بنجاح» حتى لو لم يُرحَّل شيء | استُخرج `postCarrierInvoiceJournal` (دالة خاصة مشتركة) **ترمي استثناءً** بدل التخطي، وتحديث تكلفة العملية أصبح **داخل** نجاح الترحيل فقط |
| 2 | نفس الموضعين | **F1 مكرر + سباق حقيقي:** لا `this.db.transaction()` إطلاقاً — القيد + سطوره + تحديث العملية + إدراج الفاتورة خمس عبارات مستقلة؛ وفي `overrideCarrierInvoice` تحديداً: لا `forUpdate()` على قراءة الفاتورة، **فطلبا تجاوز متزامنان من معتمِدَين مختلفين يمران معاً** وينشئان قيدين مزدوجين لنفس الفاتورة | كل الكتابات داخل معاملة واحدة (`this.db.transaction().execute`) + `forUpdate()` على قراءة الفاتورة في `overrideCarrierInvoice` |
| 3 | `overrideCarrierInvoice` | **لا فحص لحالة الفاتورة الحالية إطلاقاً** — يمكن استدعاء `/override` على فاتورة `matched` أو `disputed` أو مُعتمَدة تجاوزاً بالفعل، وتُنقَل قسراً لـ`approved_override` | حارس صريح: `if (invoice.audit_status !== 'overcharge') throw ...` |
| 4 | نفس الفئة، موضعان أقدم (يسبقان العمل الموازي) | `issueJobSalesInvoice` (فاتورة إيراد العميل) و`recordJobExpenseVoucher` — **نفس أنماط F7/F1 الثلاثة** بالضبط: تخطٍّ صامت لحسابات 1130/4200 أو 6400/2110، وتحديث `client_invoiced_total`/`carrier_cost_total` بلا شرط، وبلا معاملة ولا فحص قفل فترة | نفس المعالجة: رمي استثناء بدل التخطي، معاملة كاملة، وفحص قفل فترة عبر `assertMaritimeJournalPeriodOpen` (دالة مشتركة تُستخدم في الأربعة مواضع الآن) |

**الحكم:** ما لم يظهر في أي جناح اختبار (لأن الاختبارات تفحص المحرك النقي المعزول، لا مسار الخدمة الكامل) هو بالضبط ما وُجد هنا — تأكيد إضافي لدرس §1: اختبار المحرك النقي يثبت أن **الحساب** صحيح، لا أن **الترحيل** صحيح ولا أن الكتابة **ذرية**.

**فحص إضافي:** بحث نصي عن نمط `TMP-${Date.now()}...` (الترقيم غير الآمن قبل هذا الإصلاح) عبر المشروع كله يكشف أن نفس النمط موجود في وحدات أخرى لم تُفحص بعد (خارج نطاق هذه الجولة) — أُضيف كبند مفتوح O11.

### كشف إضافي: كسر بناء الفرونت إند (غير مالي، لكن حاجب)

عند هذا التدقيق، `npx tsc -b` في الفرونت إند كان يفشل فعلياً (Exit 1) بـ5 أخطاء حقيقية من عمل الشحن البحري الموازي — **وليست تحذيرات تجميلية**:
- `PartnerFormModal.tsx` و`MaritimeMasterDataTab.tsx`: نوع الحالة المحلي بقي مُضيَّقاً على قيمتين (`'shipping_line' | 'overseas_agent'`) بعد أن وُسِّع نموذج البيانات في `maritime-freight.api.ts` ليشمل `'airline' | 'trucking'` — فأي شراكة محمَّلة من الـAPI بنوع ناقل جوي أو بري كانت تفشل في التجميع عند فتحها للتعديل.
- `JobDetailsModal.tsx`: ثلاثة متغيرات حالة تحميل (`loadingInsurances`, `loadingWarehouseReceipts`) مُعرَّفة ولا تُضبط أبداً في `fetchJob` رغم أن القوائم المقابلة تُحمَّل فيها فعلاً — فمؤشر التحميل لا يظهر أبداً.
- `StandardDialog.tsx`: `subtitle` بقي مُعرَّفاً كـ`string` بينما `title` المجاور وُسِّع إلى `ReactNode` — استخدام جديد يمرر JSX (شارة نوع النقل) في `subtitle` كان يكسر البناء.

**كل الأربعة أُصلحت**: توسيع الأنواع لتطابق نموذج البيانات الفعلي، ربط أعلام التحميل بعملية الجلب الفعلية (بنفس نمط `fetchLedger`/`fetchCarrierInvoices` المجاور)، وتوسيع `subtitle` إلى `ReactNode` مع تغيير الوسم من `<p>` إلى `<div>` (لأن `<p>` لا يصح تعشيشه بعناصر Block — `<div>` — وفق HTML). **`npx tsc -b` نظيف الآن (Exit 0).**

---

## 7. حالة التدقيق حسب المرحلة

| # | المرحلة | الحالة |
|---|---|---|
| 0 | المقاولات: المستخلص والضمانات | ✅ مغلقة (5 جولات) |
| — | نقطة البيع والورديات | ✅ مغلقة — 4 ثغرات مُصلحة |
| 1 | المحاسبة العامة | ✅ مغلقة — 7 ثغرات مُصلحة |
| 2 | المشتريات وإذن الاستلام والمطابقة الثلاثية | ✅ مغلقة — 23 ثغرة مُصلحة |
| 3 | المخزون والحركات والمرتجعات | ✅ مغلقة — 4 ثغرات مُصلحة؛ `returns` و`tradein` و`inventory-count` فُحصت ووُجدت سليمة |
| 4 | محرك التقارير المالية (`reports`) | 🟢 **فُحص ولم تُرصد ثغرة** — التقارير تُرشِّح `status='posted'` و`tenant_id` بشكل صحيح، والميزانية تستبعد غير المُرحَّل |
| 5 | الخزينة والذمم والضرائب | ✅ **مغلقة بالعمق 100%** — التسوية البنكية محكمة (forUpdate + منع الازدواج + تسامح 0.01)؛ أوراق القبض والدفع متصلة بالدفتر العام بـ 8 قيود متوازنة؛ سداد نموذج 41 مرحل لـ ETA؛ هجرة 116 |
| 6 | الموارد البشرية والرواتب | ✅ **مغلقة بالعمق 100%** — مكافأة نهاية الخدمة وفقاً لنظام العمل السعودي والمصري بدقة الكسور؛ توازن قيود الأستاذ العام التام بامتصاص الاستقطاعات؛ ربط تسوية السلف في hr_employee_loans والأقساط والدفتر؛ حارس العهد لمنع الصرف دون إخلاء طرف؛ ترقيم مستندات متسلسل بدون COUNT(*)؛ هجرة 117 |
| 7 | التسعير والمتجر والعملاء والأقساط | ✅ **مغلقة بالعمق 100%** — ربط أقساط العملاء بالدفتر العام والخزينة وأستاذ العميل المساعد بترحيل قيود متوازنة؛ قفل تشاؤمي forUpdate() لمنع التحصيل الزائد وتكرار السداد؛ ترقيم مستندات موحد INST-YYMMDD-XXXX و REC-YYMMDD-XXXX؛ الترتيب القانوني للأقفال في موجات التسعير (تصاعدي بـ productId) وتراجع ذري محصن؛ عمليات CRM الذرية وإلغاء الإيموجيز؛ هجرة 118 |
| 8 | اللوجستيات والشحن وحركات المناديب والأسطول | ✅ **مغلقة بالعمق 100%** — تحصين تسوية المناديب `settleOrder` و `driverSettleOrder` بقفل تشاؤمي لمنع ازدواجية الحركات النقدية والقيود؛ توحيد ترقيم وثائق مبيعات الفان والسندات والمردودات `VAN-YYMMDD-XXXX` و `COL-YYMMDD-XXXX` و `RET-YYMMDD-XXXX`؛ القضاء على ترقيم `COUNT(*) + 1` في الشحن البحري لـ `INQ` و `RFQ` و `QUO` و `JOB` و `DISP` و `MWR`؛ حوكمة COD في بوسطة وعزل شركات الشحن الخليجية؛ تدقيق فواتير الخطوط الملاحية وفصل المهام Maker-Checker (هجرة 125)؛ دعم الشحن الجوي بمعايير IATA وخوارزمية Modulo-7 لبوالص AWB ومحطات Cargo iQ؛ تأمين البضائع الشامل والمطالبات؛ أذون استلام وإيداع مستودعات الترانزيت والإيداع الجمركي MWR (هجرة 126)؛ جناح اختبارات حاسم بنجاح 100% |
| 9 | الوحدات القطاعية (المطاعم، KDS، نقاط البيع، التصنيع، الصيدليات، والاستبدال) | ✅ **مغلقة بالعمق 100%** — توحيد ترقيم وثائق الورديات والتصنيع والاستبدال والروشتات والتشغيلات `SHIFT-YYMMDD-XXXX` و `UB-YYMMDD-XXXX` و `TRD-YYMMDD-XXXX` و `RX-YYMMDD-XXXX` و `BATCH-YYMMDD-XXXX`؛ القضاء على ترقيم `COUNT(*) + 1` وتوليد الترقيم الذري؛ قفل تشاؤمي `forUpdate()` في إعادة احتساب متوسط التكلفة المرجح WAC للتصنيع؛ محرك FEFO الصيدلاني لحظر الأدوية المنتهية وصرف الأقرب انتهاءً أولاً؛ ربط الحركات المخزونية برقم المعرف الذاتي؛ جناح اختبارات حاسم (6 اختبارات) بنجاح 100% |
| 10 | الأصول الثابتة، مراكز التكلفة، العملات، والحوكمة | ✅ **مغلقة بالعمق 100%** — فرض قفل تشاؤمي `forUpdate()` على جدول `fixed_assets` أثناء الإهلاك لمنع تضارب التحديثات وازدواجية القيود؛ إحكام سقف الإهلاك عند الخردة وحظر الحذف الصلب للأصول المهلكة واستبداله بالتقاعد `retired`؛ إحكام حاكم الـ 100% لمصفوفات مراكز التكلفة وإزالة كاستات `as any` الخاطئة؛ تصحيح استعلام حساب الفروق في `forex-revaluation` للعمود الحقيقي `name_ar` وتطبيق معيار الترقيم الموحد `FX-YYMMDD-XXXX`؛ جناح اختبارات حاسم (6 اختبارات) بنجاح 100% |
| 11 | منصة SaaS وإدارة المشتركين السحابية | ✅ **مغلقة بالعمق 100%** — فحص العزل المزدوج لمنصة الإدارة المركزية `role === 'super_admin' && isPlatformTenant`؛ حماية منصة `zs` المركزية من الحذف أو التعطيل أو تعديل الباقة؛ حراسة حدود الباقات للمستخدمين والفروع من واقع بيانات `saas_plans` المشترك بها؛ إبطال كاش المستأجر فورياً لمنع تمديد الجلسات بعد التعديل أو التعطيل؛ اعتماد 14 كود تدقيق موحد `AUDIT_EVENT_CODES.SAAS_*`؛ جناح اختبارات حاسم (6 اختبارات) بنجاح 100% |
| 12 | **آلية عزل المستأجرين نفسها والحُرّاس** (`tenant-boundary.ts` + `tenant-context.ts` + الحُرّاس الخمسة + `resolveAuthContext` + مسح 78 Controller/941 مساراً) | ✅ **مغلقة بالعمق 100%** — الآلية نفسها سليمة؛ **8 ثغرات مُصلحة كلها في البوابات التي تلتفّ عليها عمداً:** سر توقيع افتراضي منشور في الكود يتيح تزوير هوية عابر للمستأجرين (F16) · رموز بلا حالة عمرها 30 يوماً بلا أي إبطال أو إعادة تحقق من القاعدة · كل استعلامات بوابة الموظف بلا `tenant_id` (F17) · تسريب كتالوج `hr_leave_types` لكل المستأجرين · `INSERT` طلبات الإجازات والسلف بمستأجر `''` (F18) · `hr_leave_balances` جدول غير موجود يُنهي البوابة وقت التشغيل خلف `as any` (F3) · قراءة `branches` بلا نطاق في مسار الـgeofence · قبول معرّف الجلسة من الـURL على الطرق غير الآمنة. جناح `portal-token.spec.ts` جديد |
| 13 | **البند O2 — مواضع الكتابة بلا `tenant_id`** (مسح 707 موضع `updateTable`/`deleteFrom` + كل `UPDATE`/`DELETE`/`INSERT` الخام) | ✅ **مغلقة بالعمق** باستثناء 4 مواضع في `contracting.service.ts` (جلسة أخرى كانت تعدّل الملف) — **3 ثغرات عزل حقيقية + 5 ميزات ميتة بصمت مُصلحة:** حل طلب الدفع عابراً للمستأجرين في 4 نقاط Webhook عامة (F19، الثابت WH-1) · `recordFieldCollection` يكتب رحلة أي مستأجر · `setEmployeeAssetStatus` يقرأ ويكتب عهدة أي مستأجر ويُنشئ استقطاعاً · **بوابة إخلاء طرف العهد لا تحجب أبداً** · **الأوفرتايم المعتمد لا يصل الرواتب** · طلبات الإجازة الإدارية عالقة للأبد · تسويات الرواتب تختفي من قسيمة الموظف · جدول أقساط القروض مختلط النطاق. هجرة 127 للترميم؛ جناح `webhook-order-resolution.spec.ts`؛ أنماط جديدة F19/F20/F21 وثوابت WH-1/T1/T2/T3 |

> **صدق في التصنيف:** 🟢 يعني فُحص ولم تُرصد ثغرة. 🟡 يعني عولجت ثغرات محددة **ولم تُقرأ الوحدة سطراً بسطر** كما فُعل في المقاولات ونقطة البيع والمشتريات. لا تفترض أن 🟡 نظيفة.

---

## 8. بنود مفتوحة معروفة (لا تُعد أخطاء جديدة)

> **مراجعة دورية (سبتمبر 2026):** أُعيد فحص كل بند أدناه فعلياً على الكود الحالي (لا افتراضاً) بعد سؤال مباشر "جايز تكون اتقفلت وما اتوثقش". النتيجة: **بند واحد كان مُقفَلاً فعلاً ومُوثَّقاً بالغلط كمفتوح (O4)**، بندان يحتاجان توضيح دقة (O3, O7)، والباقي تأكد أنه لا يزال مفتوحاً فعلاً بالتحقق المباشر من الكود لا بالافتراض.

> **جولة البند 2 (سبتمبر 2026):** **O2 أُغلق** (عدا 4 مواضع في المقاولات) وفُتحت أربعة بنود جديدة اكتُشفت أثناءه: O25 (توقيع Webhook المتجر)، O26 (أعمدة وهمية في ملف الأنواع)، O27 (`van-sales`)، O28 (اشتقاق نطاق المسيّر).

> **جولة إغلاق سابقة (سبتمبر 2026):** نُفِّذت إصلاحات فعلية لست بنود (O1، O3، O4، O11، O13، O14، O15 جزئياً). البقية (O5، O6، O7، O8، O9، O12) **لم تُمس عمداً** — إما لأنها تحتاج قراراً منتجياً/تعاقدياً لا يصح اتخاذه من طرف واحد (O5، O6، O7، O8)، أو لأن حجم العمل الآمن يتطلب مساراً مستقلاً بمراجعة فردية لكل موضع (O2، O9)، أو لأنها تغيير معماري متعمَّد التأجيل (O12).

| # | البند | الأثر |
|---|---|---|
| ~~O1~~ | ~~`revaluation_currency` فارغ بعد هجرة 112~~ | ✅ **أُصلح اليوم.** أضيف `isMonetary`/`revaluationCurrency` إلى `UpdateAccountDto` و`accounting.service.ts:updateAccount` (مسموح للحسابات النظامية وغير النظامية، مع رفض تحديد عملة لحساب غير نقدي). **يوجد الآن مسار Backend فعلي**؛ شاشة الواجهة الأمامية المخصصة (بدل الاكتفاء بـ API) لم تُبنَ بعد — متابعة اختيارية |
| ~~O2~~ | ~~عدد كبير من `UPDATE`/`DELETE` بلا `tenant_id` مباشر~~ | ✅ **أُغلق (المرحلة 13) عدا 4 مواضع.** المسح الكامل (707 موضع Kysely + كل الخام + كل `INSERT`) أعطى **90 موضعاً** بلا نطاق لا ~70 ولا ~212. **النتيجة المهمة: أخطر ما في البند لم يكن أياً منها.** أغلب الـ90 كانت آمنة فعلاً بفحص ملكية سابق (هُذِّبت كلها الآن)، بينما الخطر الحقيقي كان **عدم تناظر الكاتب والقارئ** (F18): `INSERT` يغفل `tenant_id` فيكتب بمستأجر `''`، ثم قارئ يُرشِّح بالعمود فلا يجده — **خمس ميزات كانت ميتة بصمت**، منها بوابتان رقابيتان ماليتان (إخلاء طرف العهد، واعتماد الأوفرتايم). التفاصيل الكاملة والتصنيف في القسم 5-ب. **المتبقي:** 4 مواضع في `contracting.service.ts` (`contracting_master_boq_library` ×3 و`contracting_supplier_price_memory` ×1) — فُحصت وصُنِّفت آمنة بفحص ملكية سابق، ولم تُمس **فقط** لأن جلسة أخرى كانت تعدّل نفس الملف أثناء المراجعة. تُغلق مع البند 8 (باقي المقاولات) أو في تمريرة مستقلة قصيرة |
| ~~O3~~ | ~~`purchase-orders` فيه مسار استلام مباشر يكتب المخزون بنفسه~~ | ✅ **أُصلح اليوم بالكامل — إزالة لا توحيد.** تحقَّقتُ أولاً أن `POST /api/purchase-orders/:id/receive` (`receiveGoods`) **بلا أي مستدعٍ من الواجهة الأمامية إطلاقاً** (كود ميت) وبلا أي اختبار يغطيه، فحذفته كلياً (Controller + Service + DTO + عميل API الأمامي الميت) بدل دمجه، تفادياً لتعقيد مسار لا يستخدمه أحد. مسار الاستلام الحقيقي الوحيد الآن: `convertToBill` → `purchases.service.ts:receivePurchaseGoods` (GRN/GRNI/مطابقة ثلاثية بالكامل) |
| ~~O4~~ | ~~`stock_transfer_items` بلا `dispatched_qty` / `received_qty` منفصلين~~ | ✅ **مُعالَج فعلاً منذ هجرة 114 — خطأ توثيق مُصحَّح اليوم.** `inventory-transfer.service.ts` يستخدم الأعمدة الثلاثة فعلياً (`transfer_transit_loss`) |
| O5 | `reduction_schedule` على الضمانات مُخزَّن ولا يُقرأ | **لم يُمس عمداً — قرار واعٍ لا إهمال.** الصيغة الفعلية لتخفيض سقف الضمان (نِسَب مرتبطة بأي معلم: % الإنجاز؟ % الاسترداد؟ تواريخ؟) **قرار تعاقدي/منتجي** غير موثَّق في أي مكان بالكود؛ اختراع صيغة حسابية بنفسي هنا هو بالضبط نوع الخطأ الذي حذّر منه هذا الملف (منطق مالي حساس بلا مصدر حقيقة معتمد) — أخطر من تركه مفتوحاً |
| O6 | لا `fiscal_periods` شهري (السنوي فقط + `lock_date_all`) | **لم يُمس عمداً.** ميزة معمارية كبيرة (جدول جديد + شاشة + تكامل تقارير)، وليست إصلاح ثغرة — تحتاج تخطيطاً مستقلاً |
| O7 | لا حجز مخزون على مستوى الموقع (`reserved_qty`)، و`online_orders` خارج المنظومة كلياً | **لم يُمس عمداً.** يوجد حجز على مستوى الصنف الكلي فعلاً (`sales_orders`)، لكن التوسعة لمستوى الفرع وربط `online_orders` ميزة بحجم مشروع فرعي، ليست إصلاحاً نقطياً |
| O8 | **التصنيع بلا انحرافات** | **لم يُمس عمداً — كما هو مُصنَّف أصلاً: ميزة ناقصة لا ثغرة.** يحتاج مواصفة منتج (أعمدة معيارية/فعلية + شاشة تسجيل + حسابات انحراف) |
| O9 | `COUNT(*)+1` للترقيم في وحدات أخرى (تأكَّد اليوم: 17 موضعاً في `contracting.service.ts` وحدها) | **لم يُمس عمداً.** كل موضع يحتاج فحصاً فردياً (اسم الجدول، قيد التفرد الفعلي إن وُجد، سلوك إعادة الضبط اليومي) قبل استبداله بنمط آمن — إصلاح جماعي متسرع لعشرات المواضع أخطر من تركها موثَّقة كمعروفة |
| ~~O10~~ | ~~انحراف عداد المخزون التاريخي~~ | ✅ **مُعالَج** بهجرة 115 (جرد التسوية) |
| ~~O11~~ | ~~لا جناح اختبار حرج لإصلاحات F11/F12~~ | ✅ **أُصلح اليوم.** `test/critical/phase12-billing-security-hardening.spec.ts` جديد (4 اختبارات: XPay/Paymob/Stripe fail-closed + توقيع صحيح + Replay Protection لـStripe) مُضاف لسلسلة `npm run test:critical` (31 جناحاً الآن، 100% نجاح) |
| O12 | قائمة `['zs','default','dev-tenant', platformTenantId]` لا تزال تُعامل هويتي الديسكتوب التاريخيتين كمنصة مركزية داخل مسارات السحابة | **لم يُمس عمداً.** يحتاج حظراً صريحاً لإنشاء تينانت بهذه الأربعة في `CLOUD_SAAS` + دالة مركزية موحدة بدل التكرار في 6 مواضع — تغيير معماري يستحق مساره الخاص |
| ~~O13~~ | ~~`LoginAttemptLimiter` بالذاكرة فقط~~ | 🟡 **قائم كما هو — قرار واعٍ.** كافٍ لبيئة نسخة خادم واحدة؛ الانتقال لتخزين دائم (عمود على `hr_employees`) مؤجَّل حتى يُقرَّر التوسع الأفقي فعلياً، تفادياً لتعقيد سابق لأوانه |
| ~~O14~~ | ~~`driver-portal`/`mobile-punch` بلا `LoginAttemptLimiter`~~ | ✅ **أُصلح اليوم.** نفس `LoginAttemptLimiter` مُفعَّل الآن في `delivery-reps.service.ts:driverLogin` و`mobile-attendance.service.ts:employeeLogin` (قفل 5 محاولات/15 دقيقة، مفتاح معزول بالهاتف+نطاق المنشأة) |
| O15 | لا جناح اختبار حرج لإصلاحات F13/F14/F15 (حارس مسار الاستدعاء، إزالة PIN الافتراضي، رمز RFQ العام) | **جزئي — تقدّم إضافي.** `LoginAttemptLimiter` مغطى بجناح المرحلة 12، وطبقة **توقيع** رموز البوابات صارت مغطاة بالكامل بـ`portal-token.spec.ts` (بما فيه رفض السرّين المسرَّبين ورفض تبديل `tenantId`). **لا يزال غير مغطى**: إعادة التحقق من القاعدة داخل `verifyToken` (موظف مفصول/مندوب موقوف)، ورفض `mobile-punch/*` الإداري بلا جلسة، ورفض `rfq/:id` بلا `token` مطابق — الثلاثة تحتاج DB/Guard harness غير متوفر بنمط الاختبار الخفيف الحالي (`ts-node` بلا قاعدة وهمية) |
| O16 | `contracting.service.ts` يحوي 172 استخدام لـ`(this.db as any)` — خرق مباشر لـF3 | دين تقني كبير موروث (سابق لهذه الجلسة)، لم يُمس اليوم (كل الكود الجديد مكتوب Typed). يحتاج جلسة مستقلة: إضافة الأنواع الناقصة لـ`database.types.ts` ثم إزالة الـ`as any` تدريجياً موضعاً بموضع مع تشغيل `tsc` بعد كل دفعة — لا يصح فعلها دفعة واحدة على 172 موضعاً بلا مراجعة فردية |
| O17 | بوابة تعاون خارجية لموديول المقاولات (استشاري/مالك يراجعون RFI/الاعتمادات بأنفسهم) لم تُبنَ | قرار واعٍ بالتأجيل: تتطلب سطح مصادقة خارجي جديد، وهو قرار أمني يستحق تصميماً مستقلاً لا تنفيذاً متسرعاً — خصوصاً في نفس الجلسة التي كشفت ثغرات مصادقة حقيقية (F11-F15). عند البدء فيها: إعادة استخدام نمط الرمز السري الآمن المُثبَت في `maritime_rfqs.public_quote_token` (هجرة 119) بدل اختراع نظام حسابات جديد |
| O18 | لا تكامل EDI/API حي مع الناقلين أو الموانئ أو الجمارك الحكومية؛ البيانات الجمركية (هجرة 124) تسجيل داخلي فقط | **لا يمكن تنفيذه بلا مفاتيح API/اشتراكات مدفوعة من العميل** (AIS مباشر، EDI الناقل، بوابة تقديم جمركي حكومي) — قرار تجاري لا هندسي. البنية جاهزة للتوصيل: `maritime_customs_declarations` يخزن كود HS والقيمة والرسوم بانتظار مصدر بيانات حي؛ `addJobMilestone` يقبل إدخالاً يدوياً اليوم ويمكن توصيله بـWebhook خارجي لاحقاً بأقل تغيير |
| O19 | بوابة حجز ذاتي للعملاء (Self-Service Booking) في اللوجستيات لم تُبنَ | قرار واعٍ بالتأجيل لنفس سبب O17 — سطح مصادقة خارجي جديد يستحق تصميماً مستقلاً |
| **O20** | **`hr_employees.pin_code` مُخزَّن نصاً صريحاً** (`VARCHAR(10)`)، ويُعاد ضمن قوائم الموظفين في `hr.service.ts:556,629` | **خرق مباشر للثابت الدستوري "صفر كلمات مرور نصية" (`CLAUDE.md §1`).** لم يُمس في جلسة البند 1 عمداً: الإصلاح يتطلب هجرة تجزئة (bcrypt) **و**إعادة تصميم مسار الدخول في البوابات الثلاث — فمسار `employee-portal:loginInternal` حين لا يُرسَل `companyCode` يجلب موظفي **كل** المستأجرين ثم يقارن الـPIN في JS لحسم التطابق (فرع `MULTIPLE_TENANTS`)، وهو ما يستحيل مع تجزئة بلا إعادة هيكلة. **يُنفَّذ في البند 5 (باقي `hr.service.ts`)**. التخفيف القائم حالياً: `LoginAttemptLimiter` (5 محاولات / 15 دقيقة) |
| **O21** | **18 Controller بـ`SessionAuthGuard` وحده بلا `PermissionsGuard`** — `settings`, `branches`, `purchase-orders`, `goods-receipt`, `purchases/rfqs`, `sales-orders`, `quotations`, `price-lists`, `installments`, `fraud-radar`, `storefront/admin`, `marketplaces`, `approvals`, `ai-copilot`, `bosta`, `gcc-shipping`, `settings-import`, `vat-declaration` | **ليس خرقاً لعزل المستأجرين** (الخدمات خلفها تُرشِّح بـ`tenant_id`)، لكنه فجوة **RBAC**: أي مستخدم مُصادَق من المستأجر — بأي دور — يستطيع استدعاءها. **يُعالَج في البند 10 (`settings`/RBAC)**؛ الإصلاح الجماعي هنا خطر لأن إضافة `PermissionsGuard` بلا `@RequirePermissions` على كل دالة **ترمي عند الإقلاع** بالتصميم |
| **O22** | ثلاث نقاط تشغيلية عامة بلا حارس: `GET health/db-stats` (أسماء كل الجداول وعدد صفوفها) · `GET health/metrics` (ذاكرة/معالج/إصدار Node) · `POST health/telegram-test` (إرسال فعلي لقناة التنبيهات) | **لا تسرّب بيانات مستأجر**، لكنها كشف بنية تحتية + سطح إزعاج لقناة العمليات. `POST health/optimize-db` مُؤمَّن فعلاً بـ`SessionAuthGuard + SuperAdminRoleGuard`. لم تُمس لأن `health` يُستهلك من مسبار المراقبة الخارجي وتغييرها يحتاج تنسيق مع إعداد النشر |
| **O23** | `offline-releases.service.ts:simulateUpdate` — شرط الـ`passcode` هو `requires_passcode !== false && body.passcode !== undefined`: **إغفال الحقل كلياً يتخطى التحقق** (فشل آمن معكوس، نمط F12). و`applyLocalZipUpdate` بوابة وضعه أضعف من جارتها (`&& NODE_ENV === 'production'`) فتسمح بالرفع في بيئة غير إنتاجية | مسارات `api/updates/*` بلا حارس بالتصميم (عملاء أوفلاين). `applyLocalUpdate` **سليم** (يتحقق بلا استثناء). النطاق `settings` — **يُعالَج في البند 10** |
| **O24** | `hr_leave_types` بلا فهرس/قيد يربط `leave_type_id` بنفس مستأجر الصف في `hr_leave_requests`/`hr_leave_balances`؛ الـ`leftJoin` في `getLeaves` يتم على `t.id = req.leave_type_id` بلا شرط نطاق | مُحاصَر اليوم: `requestLeave` صار يتحقق من ملكية نوع الإجازة قبل الكتابة، والـ`leftJoin` لا يكشف غير الاسم لصف يملكه المستأجر أصلاً. الإصلاح الجذري = مفتاح أجنبي مركّب `(tenant_id, id)` كما فُعل في هجرة 101 للمقاولات — **يُنفَّذ مع البند 5** |
| **O25** | **نقاط Webhook المتجر لا تتحقق من توقيع إطلاقاً** — `processXPayWebhook` و`processTapWebhook` و`processStripeWebhook` في `storefront-payment.service.ts` تقبل أي جسم طلب كما هو؛ و`processPaymobWebhook` تتحقق بشرط `if (config.hmacSecret && hmacHeader)` بلا `else` — أي **فشل آمن معكوس** (F12) حين لا يُضبط السر للمستأجر | **نطاق مختلف عن O2 عمداً.** البند 2 أغلق *أي صف* يصل إليه الـWebhook (الثابت WH-1)، وهذه المسألة هي *هل يحق للمتصل أن يصل أصلاً*. لاحظ أن جناح `phase12-billing-security-hardening.spec.ts` يغطي بوابات **اشتراكات المنصة** (`modules/tenant-subscription/gateways/*`) وليس هذا الملف إطلاقاً — سطحان مختلفان بنفس الاسم. **يُنفَّذ في البند 9 (المتجر والتسعير)** بإعادة استخدام نفس نمط الفشل المغلق المُثبَت في بوابات المنصة |
| **O26** | **`database.types.ts` يعلن أعمدة غير موجودة في القاعدة** — `OfflineReleaseTable` و`ManufacturingBomLineTable` تعلنان `tenant_id`/`account_id` بينما الهجرات لم تُنشئهما قط | نمط F20. لا أثر وقت التشغيل اليوم (لا كود يكتبهما أو يُرشِّح بهما)، لكنه **فخ نشط**: أي مراجع يُغلق "موضع O2" على هذين الجدولين سيكتب شرطاً يمر من `tsc` وينفجر على عمود غير موجود. الإصلاح: حذف الحقول من ملف الأنواع، أو إضافة الأعمدة فعلاً في هجرة. **يُنفَّذ في البند 10 (`settings`)** لأن `offline_releases` نطاقه |
| **O27** | **`van-sales`: بيانات مرتبطة لا تُتحقق من نطاقها** — `executeFieldSale` يقرأ `customers` بـ`WHERE id = ?` بلا `tenant_id` (تسريب اسم عميل مستأجر آخر)، ثم تحديث الرصيد **المُنطَّق صحيحاً** لا يطابق شيئاً فيُكتب `balance_after = 0` في `customer_ledger`. ولا أي من دوال الرحلات تتحقق أن الرحلة تخص `repId` المستدعي (تجاوز بين مناديب **داخل** نفس المستأجر) | خارج نطاق O2 (قراءة، وتجاوز داخل المستأجر لا عبره). العزل بين المستأجرين نفسه صار محكماً بعد إصلاح البند 2. **يُنفَّذ مع مراجعة موديول المناديب** |
| **O28** | **`hr.service.ts:rebuildPayrollRunItems` يقرأ `hr_payroll_runs` بـ`WHERE id = ?` بلا `tenant_id`** ويشتق منه `tenantId` الذي تعتمد عليه بقية الدالة | مُحاصَر اليوم: كل المستدعين يتحققون من حالة المسيّر بـ`getPayrollRunStatus(trx, id, auth.tenantId)` قبل النداء. يبقى اشتقاق نطاق من صف غير مُتحقَّق منه شكلاً هشاً. **يُنفَّذ في البند 6 (باقي `hr.service.ts`)** |

---

## 9. قواعد سريعة لمن يبدأ الآن

```
✔ افحص آخر رقم هجرة قبل إنشاء واحدة جديدة
✔ أي منطق مالي جديد → دالة نقية + اختبار يستوردها من الإنتاج
✔ أي كتابة مخزون → applyStockDelta حصراً
✔ أي قيد محاسبي → insertPostedJournal حصراً
✔ أي بوابة رقابية → لا تعتمد على علَم يرسله العميل؛ استنتج من البيانات
✔ أي رمز بوابة خارجية → signPortalToken/verifyPortalToken حصراً
✔ أي استعلام/إدراج → tenant_id صريح؛ في الخدمات استعمل requireTenantScope لا resolveTenantContext
✔ كل INSERT على جدول فيه tenant_id يكتبه صراحةً — العمود NOT NULL DEFAULT '' لا يرمي، وtsc لا يحرسه (T1)
✔ قبل تضييق شرط WHERE بـtenant_id، افحص كل كاتب للجدول أولاً، وارمِّم الصفوف القائمة بهجرة (T3/F21)
✔ هل الجدول مُنطَّق أصلاً؟ الإجابة في ملفات الهجرة فقط، لا في database.types.ts (F20)
✔ شغّل أجنحة test/critical قبل وبعد أي تعديل في نواة مالية

✘ لا تُشغّل npm run build ولا git push تلقائياً (CLAUDE.md §2)
✘ لا تستخدم (db as any) على استعلام — يُخفي أخطاء المخطط
✘ لا تبنِ منطقاً على مطابقة نصوص عربية
✘ لا تكتب process.env.SECRET || '<ثابت>' لأي مفتاح يُثبت هوية — افشل بصوت عالٍ
✘ لا تثق بحمولة رمز بلا حالة: أعد التحقق من القاعدة (نشط؟ نفس المستأجر؟)
✘ لا تبنِ شرط استعلام شرطياً من حمولة خارجية (if (x) q = q.where(...)) — الغياب يحذف النطاق بدل أن يرفض (F19)
```
