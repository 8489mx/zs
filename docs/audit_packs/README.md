# Z-Systems Enterprise Architecture Audit Packs (دليل حزم التدقيق المعماري)

> **الغرض:** حزم تدقيق هندسية وتشغيلية مكثفة ومجهزة خصيصاً للاستشارة والتدقيق العميق مع نماذج الذكاء الاصطناعي المتقدمة (مثل Claude 3.5 Sonnet / Claude Opus / GPT-4o) لكشف أي فجوات تشغيلية أو أخطاء تعاقدية ومالية قبل الإنتاج.

---

## 1. فهرس الملفات والحزم المتوفرة

| رقم الحزمة | اسم الملف | الموديول المستهدف | المحاور والمجالات التي يغطيها |
| :---: | :--- | :--- | :--- |
| **01** | `01_CONTRACTING_AUDIT_PACK.md` | **إدارة المقاولات والمشاريع الإنشائية** | كراسة الشروط والمناقصات، المقايسة وحسابات التكلفة والأرباح، إسناد الأعمال لمقاولي الباطن، كشوف الحسابات ومستخلصات مقاولي الباطن، الاستقطاعات والدفعات المقدمة وضمان الأعمال، أوامر التغيير وفروق الأسعار، محرك الجداول الزمنية WBS/CPM التخصصي (16 حزمة)، يوميات الموقع والعمالة، محاضر الفحص WIR والاستلام الابتدائي TOC والنهائي FAC. |
| **02** | `02_LOGISTICS_AUDIT_PACK.md` | **الشحن البحري واللوجستيات والموانئ** | دورة الشحن الدولي (استيراد وتصدير)، طلبات عروض أسعار النولون البحري RFQ، مناقصات الخطوط الملاحية والتوكيلات، تسعير وحساب هوامش الربح للعملاء، ملف الشحنة Master Job File، بوالص الشحن MBL و HBL، إذن التسليم Delivery Order، شهادات الوزن VGM، تتبع الحاويات وأحداث DCSA، حساب غرامات التأخير والأرضيات Demurrage/Detention، تأمين الحاويات واسترداد الودائع، ومحاضر فحص الحاوية الفارغة EIR. |
| **03** | `03_COMMERCIAL_ERP_AUDIT_PACK.md` | **منظومة التجارة والمخازن والحسابات العامة** | بطاقة الصنف وتعدد وحدات القياس UOM، دورة المشتريات من أمر الشراء PO لمحضر الاستلام GRN، رسملة وتوزيع تكاليف الشحن والجمارك على المخزون (Landed Cost)، التحويلات بين الفروع والمخزن العابر، الجرد الفعلي ومعالجة العجز والتالف، دورة المبيعات وحجز المخزون (Stock Reservation)، الفاتورة الضريبية والإلكترونية (ZATCA / ETA)، ورديات الكاشير والـ POS، إقفال الورديات الأعمى Blind Close، قيود اليومية المزدوجة التلقائية، ميزان المراجعة، وتقارير أعمار الديون AR/AP. |

---

## 2. كيفية الاستخدام مع كلود (Claude) بأعلى كفاءة وبدون استهلاك زائد للتوكنز

1. **افتح محادثة جديدة في كلود (يفضل Claude 3.5 Sonnet أو Claude 3.7 Sonnet).**
2. **ارفع الملف المطلوب كـ Attachment:**
   - إذا كنت تريد تدقيق المقاولات: ارفع ملف `01_CONTRACTING_AUDIT_PACK.md`.
   - إذا كنت تريد تدقيق الشحن واللوجستيات: ارفع ملف `02_LOGISTICS_AUDIT_PACK.md`.
   - إذا كنت تريد تدقيق التجارة والحسابات: ارفع ملف `03_COMMERCIAL_ERP_AUDIT_PACK.md`.
3. **انسخ وألصق البرومبت المرافق أدناه في الشات:**

```markdown
Hello Claude,

Please find attached the architectural and operational audit pack for our enterprise ERP module.
I need you to act in your designated role specified in Section 1 of the attached document.

Please review the 12-step operational lifecycle, database entities, and specific audit probes outlined in the document, and deliver a ruthless, deep-dive operational audit structured around the 5 deliverables requested in Section 4:

1. Gap Analysis Matrix (Missing steps, missing documents, or unhandled field realities).
2. Industry & Contractual Traps (Specific operational pitfalls, failure modes, or financial leakage points).
3. Exact Mathematical / Accounting Formula Proofs required for this domain.
4. Risk Mitigation Architecture (Safeguards, validation gates, and credit/cashflow controls).
5. Concrete Database Schema Recommendations (Normalized tables, status enums, or columns to add).

Focus purely on practical domain depth, construction/shipping/accounting standards, and edge cases.
```

---

## 3. نصائح للحصول على أدق إجابة:
- **ركز على ملف واحد في كل محادثة:** لا ترفع الملفات الثلاثة معاً في شات واحد حتى لا يشتت كلود انتباهه؛ خصص شات كامل للمقاولات، وشات كامل للشحن، وشات كامل للحسابات والتجارة.
- **ناقشه في كل نقطة:** بعد أن يرد عليك كلود بالتقرير الأول، اسأله عن أكثر نقطة لفتت انتباهك بقولك: *"في النقطة رقم 2 بخصوص كذا، كيف تقترح بناء شاشتها بالتفصيل في الفرونت إند والباك إند؟"*.
