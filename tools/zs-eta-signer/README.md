# ZS Local ETA USB Token Signer Bridge
> **أداة التوقيع والختم الإلكتروني المحلي لمنظومة الفواتير المصرية (ETA)**  
> **الإصدار:** 1.0.0 | **المنفذ الافتراضي:** `http://127.0.0.1:8585`

---

## 1. نبذة عن الأداة والغرض منها
نظام Z-Systems هو نظام سحابي (Cloud ERP SaaS). نظراً لأن متصفحات الويب (Chrome / Edge / Firefox) تعمل في بيئة معزولة (Sandbox) ولا تستطيع الوصول المباشر إلى منافذ الـ USB أو قراءة الفلاشة الذكية (USB Token) الخاصة بالتوقيع والختم الإلكتروني لمصلحة الضرائب المصرية (مثل **Egypt Trust** أو **مصر للمقاصة MCDR**)، تعمل هذه الأداة كـ **جسر محلي وسيط (Local Hardware Bridge Microservice)**:
1. تعمل في خلفية جهاز المستخدم وتستمع على `http://127.0.0.1:8585`.
2. تكتشف وجود التوكن والشهادات الرقمية المسجلة في Windows Certificate Store تلقائياً.
3. تستقبل الـ Canonical JSON أو الـ SHA-256 Hash من واجهة الـ ERP السحابية عبر بروتوكول HTTP مع دعم كامل لـ CORS.
4. تقوم بتوقيع الوثيقة واستخراج الختم الرقمي المعياري **CAdES-BES Detached Signature** المتوافق بنسبة 100% مع معايير مصلحة الضرائب المصرية وإعادته للمتصفح ليتم رفعه لمنظومة الضرائب.

---

## 2. كيفية تشغيل الأداة (للمستخدم النهائي)
لا تحتاج الأداة لتثبيت أي برامج إضافية؛ فهي ملف تنفيذي واحد مستقل وصغير جداً (~16 كيلوبايت):
1. قم بتوصيل فلاشة التوقيع الإلكتروني (USB Token) بجهاز الكمبيوتر.
2. تأكد من تثبيت تعريف الفلاشة الرسمي (مثل برنامج **Egypt Trust PKI Manager** أو **MCDR Token Manager**).
3. شغّل الملف التنفيذي `zs-eta-signer.exe` (أو شغّل `server.js` عبر Node.js للمطورين).
4. ستظهر شاشة سوداء تؤكد:
   ```
   [ONLINE] Signer Service listening on http://127.0.0.1:8585/
   [READY] Waiting for requests from Z-Systems ERP Web App...
   [INFO] Detected 1 digital certificate(s): Egypt Trust Commercial Signer
   ```
5. افتح شاشة الفاتورة في نظام Z-Systems واضغط «توقيع بالتوكن»؛ سيتعرف النظام تلقائياً على التوكن ويتم الختم بضغطة زر واحدة.

---

## 3. كيفية بناء وتجميع الملف التنفيذي (Build & Compile)
الأداة مكتوبة بلغة C# وتعتمد على مترجم Microsoft .NET الرسمي المدمج داخل جميع إصدارات Windows (`csc.exe`)، دون الحاجة لتحميل Visual Studio أو .NET SDK:

### طريقة البناء بنقرة واحدة:
- اضغط نقراً مزدوجاً على الملف `build.bat`، وسيتم فوراً إنشاء `zs-eta-signer.exe`.

### طريقة البناء اليدوي عبر سطر الأوامر (PowerShell / CMD):
```cmd
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:exe /optimize+ /r:System.dll /r:System.Security.dll /r:System.Web.Extensions.dll /out:zs-eta-signer.exe Program.cs
```

---

## 4. المسارات البرمجية المتاحة (API Endpoints):

| المسار | الطريقة | الوظيفة |
| :--- | :---: | :--- |
| `GET /health` | GET | فحص عمل الخدمة وحالة توصيل التوكن وعدد الشهادات المكتشفة |
| `GET /certificates` | GET | قراءة قائمة الشهادات الرقمية الصالحة مع الاسم، الرقم التسلسلي، وتاريخ الصلاحية |
| `POST /sign` | POST | استقبال `{ canonicalHash, pin }` وتوليد ختم CAdES-BES Base64 وإرجاعه |
| `OPTIONS *` | OPTIONS | معالجة طلبات الـ CORS Preflight للسماح بالاتصال من المتصفح |

---

## 5. استكشاف الأخطاء وحلها (Troubleshooting):
* **رسالة "No USB Token certificate found":** تأكد من توصيل الفلاشة بالـ USB وتثبيت برنامج إدارتها، وتأكد من أن شهادة الختم لم تنتهِ صلاحيتها.
* **خطأ في المنفذ 8585 (Port in use):** تأكد من عدم تشغيل نسختين من البرنامج في نفس الوقت.
