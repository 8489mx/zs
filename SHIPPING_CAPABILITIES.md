# قدرات تكاملات شركات الشحن

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **تكاملات شركات الشحن** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/bosta/`، `backend/src/modules/gcc-shipping/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المتجر الإلكتروني والمدفوعات والمنصات](STOREFRONT_CAPABILITIES.md) · [الشحن واللوجستيات الدولية](FREIGHT_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [21. الربط المتكامل مع شركات الشحن الخارجية (Bosta Couriers API Integration)](#cap-047)
- [25. الربط مع شركات الشحن الخليجية الداخلية (Aramex & SMSA Express Gateways)](#cap-051)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-047"></a>
<!-- migrated:cap-047:start -->
## 21. الربط المتكامل مع شركات الشحن الخارجية (Bosta Couriers API Integration)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/bosta`, `frontend/src/features/storefront/components/BostaShipmentModal.tsx`, `frontend/src/features/storefront/components/BostaSettingsCard.tsx`, `frontend/src/features/storefront/api/bosta.api.ts`
* **الجداول في قاعدة البيانات:** `online_orders` (`shipping_carrier`, `bosta_delivery_id`, `bosta_tracking_number`, `bosta_status`, `bosta_awb_url`, `bosta_created_at`), `settings`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **إنشاء بوالص الشحن بضغطة زر من صفحة الطلبات** | 🟢 | 100% | `BostaShipmentModal.tsx`, `bosta.service.ts`, `MerchantOnlineOrdersPage.tsx` | نافذة منبثقة تفاعلية ذكية لحساب الـ COD تلقائياً (تصفير التحصيل للطلبات المسددة أونلاين بالبطاقات، أو تحصيل كامل الفاتورة للدفع عند الاستلام)، مع فحص عنوان العميل وملاحظات المندوب، وإنشاء الشحنة وتوليد رقم التتبع فورياً. |
| **طباعة ملصق الشحن الحراري AWB المعتمد** | 🟢 | 100% | `bosta.controller.ts`, `BostaShipmentModal.tsx` | صفحة مخصصة متوافقة مع طابعات الباركود والملصقات الحرارية مقاس 4x6 والفواتير العادية، تحتوي على باركود بوسطة والبيانات الكاملة بضغطة زر. |
| **تتبع مسار الشحنات المباشر (Shipment Tracking)** | 🟢 | 100% | `bosta.service.ts`, `bosta.controller.ts`, `bosta.api.ts` | ربط مباشر ومتابعة حية لحالات الشحنة (تم استلام الطرد، في المستودع، خرج مع المندوب، تم التسليم) مع رابط مباشر لتتبع بوسطة الرسمي. |
| **البيئة التجريبية والمحاكاة الذكية (Sandbox & Mock Engine)** | 🟢 | 100% | `bosta.service.ts`, `BostaSettingsCard.tsx` | إمكانية التبديل بين وضع المحاكاة التجريبي (Sandbox) والإنتاج الحقيقي، مما يتيح تجربة كافة دورات الشحن وطباعة البوالص دون الحاجة لحساب بوسطة مفعل فورياً. |

---


<!-- migrated:cap-047:end -->

<a id="cap-051"></a>
<!-- migrated:cap-051:start -->
## 25. الربط مع شركات الشحن الخليجية الداخلية (Aramex & SMSA Express Gateways)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/gcc-shipping`, `frontend/src/features/storefront/components/GccShipmentModal.tsx`, `frontend/src/features/storefront/components/GccShippingSettingsCard.tsx`, `frontend/src/features/storefront/api/gcc-shipping.api.ts`
* **الجداول في قاعدة البيانات:** `online_orders` (`gcc_shipping_carrier`, `gcc_shipping_id`, `gcc_tracking_number`, `gcc_shipping_status`, `gcc_awb_url`, `gcc_shipping_created_at`), `settings`
* **مهاجرة قاعدة البيانات:** `2040000000039_gcc_shipping_gateways.ts`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **بوابة شحن أرامكس الخليجية (Aramex Shipping Gateway)** | 🟢 | 100% | `gcc-shipping.service.ts`, `gcc-shipping.controller.ts`, `GccShippingSettingsCard.tsx` | تكامل شامل مع واجهات أرامكس الرسمية لإنشاء الشحنات وتوليد بوالص الشحن (Airway Bills)، دعم الكيانات الجغرافية الخليجية (`RUH`, `DXB`, `KWI`, `DOH`)، حساب الدفع عند الاستلام COD التلقائي، وتتبع الشحنة المباشر بروابط أرامكس الرسمية. |
| **بوابة سمسا إكسبريس السعودية (SMSA Express Gateway)** | 🟢 | 100% | `gcc-shipping.service.ts`, `gcc-shipping.controller.ts`, `GccShippingSettingsCard.tsx` | ربط كامل مع واجهات سمسا إكسبريس (SMSA API) عبر مفتاح المرور `passKey` لخدمة كافة مدن ومحافظات ومراكز المملكة العربية السعودية، مع حساب الرسوم الجمركية وعملة التسوية (SAR). |
| **إنشاء بوالص الشحن الخليجية بنقرة واحدة من إدارة الطلبات** | 🟢 | 100% | `GccShipmentModal.tsx`, `MerchantOnlineOrdersPage.tsx` | نافذة منبثقة تفاعلية تدعم الاختيار السريع بين أرامكس وسمسا، التحقق الذكي من سداد الطلب (تصفير الـ COD لطلبات تاب وسترايب، أو تحصيل كامل الفاتورة للدفع عند الاستلام)، تحديد وزن الطرود وعدد القطع، والتحقق من العنوان ورقم الجوال. |
| **طباعة ملصق الشحن الحراري الموحد مقاس 4×6 (Thermal AWB 4x6)** | 🟢 | 100% | `gcc-shipping.controller.ts` (`/api/gcc-shipping/awb/:trackingNumber`) | صفحة مخصصة متوافقة 100% مع طابعات الملصقات الحرارية لمستودعات الشحن مقاس 4x6 بوصة، تتضمن باركود الشحنة الممسوح ضوئياً، رمز الاستجابة السريعة (QR Code) للتتبع الفوري، بيانات المستودع (Shipper) وبيانات العميل والمحتويات ومبلغ الـ COD. |
| **التتبع الحي والخط الزمني لمسار الشحنة (Live Tracking Timeline)** | 🟢 | 100% | `GccShipmentModal.tsx`, `gcc-shipping.service.ts`, `gcc-shipping.api.ts` | لوحة تتبع لحظية متدرجة (تم إنشاء الشحنة ➔ تم الاستلام من المستودع ➔ في الطريق مع المندوب ➔ تم التسليم للعميل) مع زر إعادة التحديث المباشر ورابط تتبع رسمي خارجي. |
| **محاكي الشحن التجريبي الذكي (GCC Sandbox & Simulation Engine)** | 🟢 | 100% | `gcc-shipping.service.ts`, `GccShippingSettingsCard.tsx` | وضع تجريبي تفاعلي كامل مدمج يتيح للتاجر تجربة كافة دورات الشحن، إصدار البوالص، وطباعة الملصقات الحرارية، ومحاكاة مراحل التتبع دون الحاجة لحساب تجاري معتمد فورياً. |

---


<!-- migrated:cap-051:end -->
