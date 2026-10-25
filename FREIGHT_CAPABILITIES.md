# قدرات الشحن واللوجستيات الدولية

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **الشحن واللوجستيات الدولية** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/maritime-freight/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المحاسبة والخزينة والقيود](ACCOUNTING_CAPABILITIES.md) · [العملاء والتحصيل والولاء](PARTNERS_CAPABILITIES.md) · [تكاملات شركات الشحن](SHIPPING_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [25. موديول الشحن واللوجستيات (Freight & Logistics Module)](#cap-107)
- [88. موديول الشحن البحري واللوجستيات ودورة الأتمتة الكاملة (End-to-End Maritime Freight & Mail Automation Engine)](#cap-120)
- [43. الشحن البحري وإدارة عروض أسعار الخطوط (Maritime Freight & Carrier RFQs)](#cap-125)
- [96. منظومة أتمتة البريد الملاحي والأرشفة التلقائية في مجلد المرسل (Maritime Email Automation & IMAP Sent Archiving)](#cap-131)
- [97. التطوير البريميوم لنافذة إصدار عرض سعر العميل الملاحي (Maritime Freight Quotation & Profit Margin Modal)](#cap-132)
- [103. معيار ثبات أبعاد نافذة أمر التشغيل وتوحيد ارتفاع التابات (JobDetailsModal Stable-Sizing & Anti-Shrink Standard)](#cap-138)
- [104. ترقية وإكمال تبويبات الشحن البحري التشغيلية (Maritime Freight Operational Tabs Upgrade)](#cap-139)
- [106. المرحلة الأولى لأتمتة وربط الشحن الملاحي محاسبياً وجدولة المزامنة الذكية (Maritime Freight Phase 1: GL Financial Ledger Automation, Background Scheduler & Universal Combobox)](#cap-141)
- [107. الأتمتة الكاملة لموديول الشحن واللوجستك: إشعارات الواتساب السحابية، بوابة التتبع المباشر، محرك بوالص e-B/L ومستندات الموانئ، ورادار الأقمار الصناعية (Maritime Freight Complete Automation: Cloud WhatsApp, Public Tracking Portal, e-B/L Engine & AIS Satellite Radar)](#cap-142)
- [108. محرك مسارات الأتمتة الملاحية وهوامش الربح ومحطات التوقف البشرية (Autonomous Freight Pipeline, Margins Engine & Human-in-the-Loop Checkpoints)](#cap-143)
- [109. دليل الخطوط والوكلاء الموسع (59 جهة) ونظام الفرز والتحديد الهرمي الذكي (Two-Tier Hierarchical Carrier/Agent Selection Engine)](#cap-144)
- [154. موديول اللوجستيات وحركات المناديب والأسطول والشحن ودستور الترقيم الموحد (Phase 8: Logistics, Fleet & Maritime Invariants & Universal Document Numbering)](#cap-183)
- [154. موديول اللوجستيات وحركات المناديب والأسطول والشحن ودستور الترقيم الموحد (Phase 8: Logistics, Fleet & Maritime Invariants & Universal Document Numbering)](#cap-186)
- [160. إغلاق فجوات موديول اللوجستيات والشحن البحري مقارنة بـCargoWise/GoFreight (Freight Forwarding Gap-Closing)](#cap-191-1)
- [161. تكامل الشحن متعدد الوسائط (بحري / جوي / بري) في واجهات الفرونت إند (Multimodal Freight UI Integration)](#cap-192)
- [Maritime Freight & Multimodal Logistics Complete Architectural Closure (6 October 2026)](#cap-236)
- [B2B Customer Self-Service Freight Portal - بوابة الخدمة الذاتية لعملاء الشحن (7 October 2026)](#cap-237)
- [162. التدقيق التشغيلي الشامل والاختبار الآلي لدورة الشحن البحري الدولي (End-to-End Sea Freight Verification & Hardening - 7 October 2026)](#cap-238)
- [164. منظومة الشحن الجوي الدولي ومطابقة معايير إياتا (International Air Freight, IATA Resolution 502 & Cargo iQ Standards - 8 October 2026)](#cap-240)
- [165. منظومة الشحن البري والنقل الداخلي والموانئ الجافة (Road Freight, Inland Trucking & Dry Ports Architecture - 8 October 2026)](#cap-241)
- [43. تكامل روابط التنقل المباشر لمود الشحن واللوجستيات في القائمة الجانبية (Maritime Freight Sidebar Navigation Integration)](#cap-242)
- [206. تطهير واجهات التدقيق والاشتراكات وإلغاء تكييف الفروع في قطاع الشحن (Maritime Audit & Settings Purification)](#cap-247)
- [246. جناح الاختبارات العدائية ومحاكاة التخريب الشامل للشحن واللوجستيات وسد الثغرات (Logistics Chaos Monkey & Multimodal Freight Adversarial Hardening Suite - 20 October 2026)](#cap-292)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-107"></a>
<!-- migrated:cap-107:start -->
## 25. موديول الشحن واللوجستيات (Freight & Logistics Module)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% (Production Ready)
* **كود الفيتشر:** `maritime_freight`
* **مفتاح الإعداد:** `maritimeFreightModuleEnabled`
* **الباقات المدعومة:** `plan_ultimate`, `plan_omnichannel` (وكافة الأسماء البديلة)
* **مسارات الكود — Backend:** `backend/src/modules/maritime-freight/`
* **مسارات الكود — Frontend:** `frontend/src/features/maritime-freight/`
* **الجداول في قاعدة البيانات (Migrations 080, 122, 124, 125, 126, 200):** `shipping_ports`, `shipping_lines`, `maritime_rfqs`, `maritime_rfq_bids`, `maritime_quotations`, `maritime_jobs`, `maritime_containers`, `maritime_job_milestones`, `maritime_rate_cards`, `maritime_customs_declarations`, `maritime_customs_declaration_items`, `maritime_carrier_invoices`, `maritime_carrier_disputes`, `maritime_cargo_insurances`, `maritime_warehouse_receipts`, `maritime_quotation_charges`, `maritime_job_charges`, `maritime_job_documents`, `maritime_agent_settlements`, `maritime_inland_trucking_trips`, `maritime_carrier_api_events`
* **المعايير المرجعية الدولية والمحلية:** DCSA (Digital Container Shipping Association) — مسار التتبع البحري وأحداث التتبع الحي عبر واجهات الخطوط الملاحية (Live Carrier API Sync)، IATA (International Air Transport Association) — نسبة الوزن الحجمي 1:6000 وخوارزمية Modulo-7 لبوالص الشحن الجوي AWB ومحطات تتبع Cargo iQ، معايير التأمين البحري الدولي لمعهد المكتتبين بلندن (Institute Cargo Clauses ICC A/B/C & All Risks)، FIATA & BIMCO لنماذج بوالص الشحن البحري، منظومة نافذة المصرية للتسجيل المسبق للشحنات (Egyptian Nafeza ACI / ACID - 19 digits)، وبوالص النقل البري الداخلي (Inland CMR Waybill).
* **بيانات أولية مدرجة:** 15 ميناء مصري ودولي (Alexandria, Port Said, Damietta, Singapore, Rotterdam, Jeddah, ...) + 10 خطوط شحن عالمية (MSC, Maersk, CMA CGM, ...)

### الملفات المنشأة

| النوع | الملف | الوصف |
| :--- | :--- | :--- |
| **Migration** | `2040000000125_maritime_carrier_invoice_audit.ts` | ترحيل قاعدة البيانات لتدقيق فواتير الخطوط الملاحية والنزاعات الناتجة عنها |
| **Migration** | `2040000000126_multimodal_freight_insurance_and_warehousing.ts` | ترحيل قاعدة البيانات للشحن متعدد الوسائط، تأمين البضائع الشامل، وأذون استلام مستودعات الترانزيت والإيداع الجمركي (MWR) |
| **Migration** | `2040000000200_maritime_complete_enterprise_expansion.ts` | التوسعة المؤسسية الشاملة للشحن الدولي: بنود الرسوم المفصلة (Charges)، تفكيك العملات وشرط سعر الصرف التعاقدي (ROE Clause)، منظومة نافذة ACI، التجميع المشترك LCL، الحافظة الرقمية الإلكترونية e-Folder، مواعيد إغلاق التصدير Cut-Offs، النقل البري الداخلي، تسويات الوكلاء الخارجيين ونسبة الأرباح 50/50، ورادار الربط الحي لخطوط الملاحة DCSA API |
| **Engine** | `engines/freight-audit.engine.ts` | محرك تدقيق فواتير الناقل النقي، مطابقة التعرفة المتعاقد عليها (Contracted Rate Card vs Billed)، حوكمة الاستثناءات (Maker-Checker Separation) |
| **Engine** | `engines/air-freight.engine.ts` | محرك الشحن الجوي النقي وفق معايير IATA: حساب الوزن الحجمي 1:6000 والوزن الخاضع للتحصيل، خوارزمية التحقق Modulo-7 لبوالص الشحن الجوي، ومحطات تتبع Cargo iQ التسع |
| **Unit Tests** | `engines/freight-audit.engine.spec.ts` | اختبارات وحدة حسابية صارمة لمحرك تدقيق الفواتير وتأكيد الفصل الإداري وحساب الفروقات |
| **Unit Tests** | `engines/air-freight.engine.spec.ts` | اختبارات وحدة حسابية صارمة لمحرك الشحن الجوي وتأكيد صحة معادلات IATA و Modulo-7 |
| **Types** | `maritime-freight.types.ts` | تعريفات TypeScript، معايير DCSA، معايير IATA للشحن الجوي ومحطات Cargo iQ، وتأمين البضائع والمستودعات |
| **DTOs** | `dto/create-rfq.dto.ts` | بيانات إنشاء طلب التسعير للشحن متعدد الوسائط (بحري/جوي/بري) |
| **DTOs** | `dto/submit-bid.dto.ts` | بيانات تقديم عرض شركة الشحن |
| **DTOs** | `dto/create-quotation.dto.ts` | بيانات إنشاء عرض سعر العميل متعدد الوسائط مع شرط سعر الصرف والـ ACID وبنود الرسوم |
| **DTOs** | `dto/create-job.dto.ts` | بيانات تحويل العرض لأمر تشغيل للشحن الجوي والبحري مع الـ Cut-Offs والتجميع المشترك |
| **DTOs** | `dto/itemized-charges.dto.ts` | بنود الرسوم والتسعير التفصيلي (O/F, BAF, THC, BL Fee, Inland, Customs, Insurance) بالعملة الأصلية والمحلية والضريبة |
| **DTOs** | `dto/job-document.dto.ts` | الحافظة الرقمية الإلكترونية للشحنة (e-Folder Binder) للأرشفة الرقمية والتحميل والمعاينة |
| **DTOs** | `dto/agent-settlement.dto.ts` | حسابات وتسويات الوكلاء الخارجيين في موانئ الشحن والوصول (SOA, Profit Share 50/50, DN/CN) |
| **DTOs** | `dto/inland-trucking.dto.ts` | رحلات النقل البري الداخلي والترحيل وتوجيه الشاحنات والسائقين وبوالص CMR |
| **DTOs** | `dto/carrier-tracking.dto.ts` | تتبع الخطوط الملاحية الحي عبر واجهات DCSA API وسجل أحداث الحاويات |
| **DTOs** | `dto/cargo-insurance.dto.ts` | بيانات إصدار وثائق تأمين البضائع وتسجيل المطالبات التأمينية |
| **DTOs** | `dto/warehouse-receipt.dto.ts` | بيانات إصدار أذون استلام وإيداع المستودع وأوامر الإفراج والتسليم |
| **DTOs** | `dto/update-container.dto.ts` | بيانات تحديث حالة الحاوية |
| **Service** | `maritime-freight.service.ts` | كامل منطق RFQs، مقارنة الأسعار، عروض الأسعار، إدارة العمليات والحاويات، حساب الديمراج، تدقيق فواتير الناقل، إصدار وثائق التأمين، أذون المستودعات MWR، بنود الرسوم المفصلة وتفكيك العملات، إدارة الشحنات المجمعة والهاوس، الحافظة الرقمية e-Folder، كشوف حسابات الوكلاء والتسويات، رحلات النقل البري، ومزامنة أحداث التتبع الحي |
| **Engine** | `engines/cargo-insurance.engine.ts` | بوابتا مطالبة التأمين النقيتان: منع تجاوز القيمة المؤمَّن عليها (`insured_value` كانت تُخزَّن ولا تُقرأ في أي منطق فتمر أي مطالبة مهما بلغت)، ومنع تسجيل مطالبة ثانية تستبدل الأولى بصمت. يستوردها جناح `test/critical/maritime-cargo-insurance.spec.ts` من الإنتاج |
| **Controller** | `maritime-freight.controller.ts` | Endpoints محمية بـ `SessionAuthGuard` لكافة العمليات بما فيها الحسابات والوثائق والنقل والوكلاء والتتبع |
| **Controller** | `maritime-public-tracking.controller.ts` | Endpoint عام لتتبع الشحنات بدون مصادقة |
| **Module** | `maritime-freight.module.ts` | مسجل في `app.module.ts` |
| **API** | `api/maritime-freight.api.ts` | خدمة API Frontend متكاملة تشمل كافة وظائف الشحن الجوي والبحري والتأمين والمستودعات والوكلاء والنقل والحافظة |
| **Component** | `CreateRfqModal.tsx` | نافذة إنشاء طلب تسعير جديد مع محول النمط الثلاثي (بحري/جوي/بري) |
| **Component** | `ApplyMarginModal.tsx` | نافذة تطبيق الهامش مع إدخال شرط سعر الصرف (ROE Clause) ورقم القيد الجمركي المسبق (ACID) |
| **Component** | `CarrierBidEntryModal.tsx` | نافذة إدخال عرض شركة الشحن يدوياً |
| **Component** | `JobDetailsModal.tsx` | نافذة تفاصيل أمر التشغيل الشاملة المتضمنة بطاقات الامتثال الثلاث (ACI, Cut-offs, ROE) والتبويبات المتخصصة للرسوم والتجميع والنقل والحافظة الرقمية |
| **Job Component** | `job-details/JobEgyptianAciCard.tsx` | بطاقة منظومة نافذة المصرية للتسجيل المسبق (ACI / ACID) مع فحص 19 رقماً ومؤقت انتهاء الصلاحية |
| **Job Component** | `job-details/JobExportCutoffsCard.tsx` | بطاقة مواعيد إغلاق التصدير (VGM, SI, Customs, Port Cut-offs) مع عداد تنازلي فوري |
| **Job Component** | `job-details/JobRoeForexCard.tsx` | بطاقة شرط ومحدد سعر الصرف (ROE Clause) وتفكيك العملات الأجنبية والمحلية |
| **Job Component** | `job-details/JobChargesTab.tsx` | تبويب بنود الرسوم والتسعير التفصيلي مع احتساب الضرائب وهوامش الربح لكل بند |
| **Job Component** | `job-details/JobDocumentsTab.tsx` | الحافظة الرقمية الإلكترونية للشحنة (e-Folder Binder) للأرشفة ومركز طباعة النماذج القياسية |
| **Job Component** | `job-details/JobConsolidationTab.tsx` | إدارة تجميع الشحنات والحاويات المشتركة (Master vs House B/Ls) وإصدار الشحنات الفرعية |
| **Job Component** | `job-details/JobInlandTruckingTab.tsx` | إدارة وتوجيه رحلات النقل البري الداخلي وتوجيه السائقين وطباعة بوالص CMR لأمر التشغيل |
| **Tab** | `MaritimeAgentsTab.tsx` | تبويب حسابات وتسويات الوكلاء الخارجيين ومشاركة الأرباح وإشعارات المدين والدائن (SOA & Profit Share 50/50) |
| **Tab** | `CarrierTrackingHubTab.tsx` | مركز التتبع الحي الموحد وواجهات ربط الخطوط الملاحية المتوافقة مع معايير DCSA API |
| **Tab** | `InlandTruckingTab.tsx` | المركز الرئيسي لرحلات النقل والترحيل الداخلي وإدارة أسطول الشاحنات وسائقي المقطورات |
| **Component** | `ContainerReturnModal.tsx` | نافذة تسجيل إعادة الحاوية الفارغة |
| **Documents** | `maritime-documents.ts` | طباعة وتوليد بوالص الشحن البحري والجوي الرسمية مع بنود ACI، الفاتورة الملاحية المعتمدة بتفكيك العملات وبنود الرسوم، شهادات التأمين، أذون المستودع MWR، بوالص النقل البري، شهادات VGM، وإرشادات الشحن SI |
| **Tab** | `MaritimeRfqTab.tsx` | تبويب طلبات التسعير (Carrier RFQs) |
| **Tab** | `MaritimeMatrixTab.tsx` | تبويب مصفوفة مقارنة الأسعار |
| **Tab** | `MaritimeQuotationsTab.tsx` | تبويب عروض أسعار العملاء |
| **Tab** | `MaritimeJobsTab.tsx` | تبويب أوامر الشحن والتشغيل |
| **Tab** | `MaritimeContainersTab.tsx` | تبويب الحاويات وتتبع الإعادة |
| **Tab** | `MaritimeMasterDataTab.tsx` | تبويب دليل الشركاء والموانئ |
| **Page** | `MaritimeWorkspacePage.tsx` | الصفحة الرئيسية للموديول (URL-driven tabs بـ `?tab=`) |
| **Page** | `PublicShipmentTrackingPage.tsx` | صفحة تتبع الشحنة العامة (بدون تسجيل دخول) |
| **Icons** | `AppIcons.tsx` | أُضيفت `ShipIcon`, `ContainerIcon`, `PlaneIcon` |

### التوصيل في النظام (Wiring)

| الملف | ما تم |
| :--- | :--- |
| `routes.tsx` | تصدير `maritimeFreightRouteModule` بنمط `FeatureRouteModule` + `FeatureGate` + 6 عناصر تنقل بـ `?tab=` |
| `registry.ts` | تسجيل `maritimeFreightRouteModule` |
| `root-router.tsx` | مسار عام `/public/track/:token` لتتبع الشحنات |
| `access.ts` | إضافة `maritime` + 6 مسارات فرعية في `routePermissionMap` + `routeFeatureMap` |
| `app-shell.tsx` | أيقونة `ship` + 6 أيقونات فرعية في `iconPathMap`، مجموعة السايدبار `maritime-group`، منطق gating في `visibleNavigationItems` |
| `settings.schema.ts` | `maritimeFreightModuleEnabled: z.boolean().default(false)` |
| `contracts.ts` | ربط `maritimeFreightModuleEnabled` |
| `modular-presets.ts` | تسجيل في `SYSTEM_MODULES` |
| `session.service.ts` | إضافة `maritime_freight` في `FALLBACK_PLAN_FEATURES` |
| `saas-admin.service.ts` | إضافة في كافة مصفوفات الباقات + `FEATURE_TO_MODULE_MAP` |
| `DeveloperActivationPanel.tsx` | إضافة في `AVAILABLE_FEATURES` + كافة مصفوفات `STANDARD_TIER_FEATURES` |
| `ModulesSettingsTab.tsx` | `hasMaritimeFreightFeature` hook + `isMaritimeFreightActive` + بطاقة toggle في الإعدادات |
| **Migration 080** | تسجيل الفيتشر في جدول `features` + ربطه بـ `plan_ultimate` و `plan_omnichannel` في `plan_features` |

| الميزة التفصيلية | الحالة | نسبة الإنجاز | الملفات الأساسية |
| :--- | :---: | :---: | :--- |
| **طلبات التسعير من شركات الشحن (Carrier RFQs)** | 🟢 | 100% | `CreateRfqModal.tsx`, `MaritimeRfqTab.tsx`, `maritime-freight.service.ts` |
| **توليد أكواد RFQ تلقائياً** | 🟢 | 100% | `maritime-freight.service.ts` — نمط `[RFQ-2026-0001]` |
| **إرسال بريد إلكتروني بروابط سحرية لشركات الشحن** | 🟢 | 100% | `maritime-freight.service.ts` — Magic Links للـ Carriers |
| **إدخال عروض شركات الشحن (Bid Entry)** | 🟢 | 100% | `CarrierBidEntryModal.tsx`, `submit-bid.dto.ts` |
| **مصفوفة مقارنة الأسعار التلقائية** | 🟢 | 100% | `MaritimeMatrixTab.tsx` — مقارنة متعددة الأبعاد |
| **تطبيق الهامش وإصدار عرض سعر العميل** | 🟢 | 100% | `ApplyMarginModal.tsx`, `MaritimeQuotationsTab.tsx` |
| **تحويل عرض السعر لأمر تشغيل (Job Conversion)** | 🟢 | 100% | `MaritimeJobsTab.tsx`, `create-job.dto.ts` |
| **تتبع 9 مراحل شحن بحري وفق معيار DCSA** | 🟢 | 100% | `JobDetailsModal.tsx`, `MaritimeJobsTab.tsx`, `maritime-freight.types.ts` |
| **الشحن الجوي والنقل متعدد الوسائط (Air Freight & Multimodal)** | 🟢 | 100% | `air-freight.engine.ts`, `maritime-freight.service.ts`, `JobDetailsModal.tsx`, `maritime-documents.ts` — دعم معايير IATA (نسبة 1:6000)، وخوارزمية Modulo-7 للتحقق من أرقام بوالص الشحن الجوي AWB، وتتبع 9 محطات Cargo iQ، وتوليد بوليصة الشحن الجوي الموحدة Neutral IATA AWB |
| **تأمين البضائع الشامل وإدارة المطالبات (Cargo Insurance & Claims)** | 🟢 | 100% | `maritime-freight.service.ts`, `JobDetailsModal.tsx`, `maritime-documents.ts` — إصدار وثائق التأمين البحري/الجوي لكافة شروط التغطية (All Risks, ICC A/B/C)، وحساب الأقساط، وتسجيل مطالبات التعويض، وطباعة شهادة التأمين المعتمدة |
| **أذون استلام وإيداع مستودعات الترانزيت والجمركية (Transit & Bonded Warehouse Intake - MWR)** | 🟢 | 100% | `maritime-freight.service.ts`, `JobDetailsModal.tsx`, `maritime-documents.ts` — ترقيم موحد `MWR-YYMMDD-XXXX`، تخصيص مواقع التخزين والأرفف (Bay/Rack/Bin)، مراقبة الطرود والأوزان والأحجام، وإصدار أذون الإفراج والتسليم وطباعة إذن الإيداع |
| **إدارة الحاويات وتتبع مواعيد الإعادة** | 🟢 | 100% | `MaritimeContainersTab.tsx`, `ContainerReturnModal.tsx` |
| **حساب الديمراج التلقائي وتجميد الغرامات عند الإعادة** | 🟢 | 100% | `maritime-freight.service.ts` — حساب دقيق لمهل السماح، تثبيت وتجميد الغرامات المتراكمة عند تسجيل إعادة الحاوية الفارغة لمنع تصفيرها بصمت |
| **إنشاء مركز تكلفة تلقائي لكل أمر شحن** | 🟢 | 100% | `maritime-freight.service.ts` — `dimension = 'project'` وفحص مسبق لمنع خطأ إحباط المعاملة في بوستجريس |
| **الترحيل المحاسبي متعدد العملات (Multi-Currency GL Postings)** | 🟢 | 100% | `maritime-freight.service.ts` — ترحيل فواتير وسندات الشحن بالعملات الأجنبية (USD/EUR) مع التحويل الدقيق لعملة المنشأة الأساسية (EGP) في قيود اليومية |
| **شهادة الوزن الإجمالي المعتمد للحاويات (SOLAS VGM Certificate)** | 🟢 | 100% | `maritime-documents.ts`, `JobDetailsModal.tsx` — إصدار شهادة VGM الرسمية وفق المعيار الدولي IMO SOLAS VI/2 بالطريقتين (Method 1: الوزن الكامل، Method 2: وزن البضاعة + وزن الحاوية الفارغة Tare Weight) |
| **تعليمات الشحن والتوجيه الدولي (Shipping Instructions - S/I)** | 🟢 | 100% | `maritime-documents.ts`, `JobDetailsModal.tsx` — إصدار وثيقة تعليمات الشحن المعتمدة وفق معايير FIATA الدولية لمطابقة بيانات الشاحن والمستلم والإخطار والموانئ والبضاعة |
| **تدقيق ومطابقة فواتير الخطوط الملاحية متعددة العملات (Freight Audit Engine)** | 🟢 | 100% | `freight-audit.engine.ts`, `maritime-freight.service.ts`, `JobDetailsModal.tsx` — تدقيق تلقائي فوري لأي فاتورة ومقارنتها بالتعرفة مع دعم تحويل العملات المختلفة وكشف التجاوزات |
| **محرك الشحن الجوي المتقدم (IATA Air Cargo Engine)** | 🟢 | 100% | `air-freight.engine.ts` — دعم المعيار المزدوج (شحن جوي 6000 وبريد سريع 5000)، وخوارزمية التقريب لنصف كيلوجرام للأعلى وفق معيار IATA Resolution 502 |
| **حوكمة استثناءات فروق الفواتير (Maker-Checker Variance Override)** | 🟢 | 100% | `freight-audit.engine.ts`, `maritime-freight.service.ts`, `JobDetailsModal.tsx` — منع منشئ الفاتورة من تجاوز الفروق بنفسه (`userId !== createdBy`) واشتراط رتبة مالية/إدارية وتبرير كتابي لا يقل عن 10 أحرف |
| **إدارة النزاعات والمطالبات مع الخطوط الملاحية (Carrier Dispute Management)** | 🟢 | 100% | `maritime-freight.service.ts`, `JobDetailsModal.tsx`, `maritime-documents.ts` — فتح ومتابعة النزاعات الرسمية مع الناقلين، ترقيم موحد `DISP-YYMMDD-XXXX`، وإصدار إشعار نزاع رسمي قابل للطباعة (Carrier Dispute Note) مع تعليق الفاتورة لحين التسوية |
| **دليل الموانئ والخطوط البحرية** | 🟢 | 100% | `MaritimeMasterDataTab.tsx` + بذر 15 ميناء + 10 خطوط |
| **صفحة تتبع عام للشحنة (Public Tracking)** | 🟢 | 100% | `PublicShipmentTrackingPage.tsx`, `maritime-public-tracking.controller.ts` |
| **عزل المستأجرين (Multi-Tenant Isolation)** | 🟢 | 100% | جميع استعلامات DB بـ `tenant_id` |
| **Feature Gating في السايدبار** | 🟢 | 100% | `app-shell.tsx` — `maritime-group` محمي بـ `maritimeFreightModuleEnabled` + `maritime_freight` feature |
| **بطاقة تفعيل/تعطيل في الإعدادات** | 🟢 | 100% | `ModulesSettingsTab.tsx` |
| **دعم كامل في لوحة المطور** | 🟢 | 100% | `DeveloperActivationPanel.tsx` |

---


<!-- migrated:cap-107:end -->

<a id="cap-120"></a>
<!-- migrated:cap-120:start -->
## 88. موديول الشحن البحري واللوجستيات ودورة الأتمتة الكاملة (End-to-End Maritime Freight & Mail Automation Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** DCSA Standards & End-to-End Digital Freight Forwarding (Inquiry ➔ RFQ ➔ Quotation ➔ Job ➔ DCSA Journey ➔ DLVR ➔ Container Return).
* **مسارات الكود الأساسية:**
  - الباك إند: `backend/src/modules/maritime-freight` (`maritime-freight.service.ts`, `maritime-mail.service.ts`, `maritime-freight.controller.ts`, `maritime-freight.module.ts`, `maritime-freight.types.ts`).
  - الهجرة وقاعدة البيانات: `backend/src/database/migrations/2040000000084_maritime_workflow_automation.ts`, `backend/src/database/database.types.ts`.
  - الفرونت إند: `frontend/src/features/maritime-freight` (`MaritimeLayout.tsx`, `MaritimeWorkflowStepper.tsx`, `MaritimeInquiriesTab.tsx`, `MaritimeInquiriesPage.tsx`, `MaritimeSettingsTab.tsx`, `MaritimeSettingsPage.tsx`, `CreateInquiryModal.tsx`, `MaritimeRfqTab.tsx`, `MaritimeQuotationsTab.tsx`, `ApplyMarginModal.tsx`, `JobDetailsModal.tsx`, `MaritimeContainersTab.tsx`, `maritime-freight.api.ts`, `routes.tsx`).
* **الجداول في قاعدة البيانات:**
  - `maritime_inquiries` (استفسارات وطلبات شحن العملاء مع كافة التفاصيل والربط المتسلسل).
  - `maritime_rfqs` (طلبات استقصاء أسعار الخطوط الملاحية والوكلاء).
  - `maritime_rfq_bids` (عروض الأسعار الواردة من الخطوط الملاحية وتفاصيل النولون ومصاريف الموانئ THC وأيام السماح).
  - `maritime_quotations` (عروض أسعار العملاء متضمنة هوامش الربح Markup وسعر الصرف).
  - `maritime_jobs` (أوامر التشغيل، ملفات الشحنات، بوالص الشحن MBL/HBL، وربط مراكز التكلفة المحاسبية).
  - `maritime_containers` (رادار الحاويات، أيام السماح Free Days، غرامات الأرضيات، وتأمينات التوكيلات).
  - `maritime_job_milestones` (محطات التتبع القياسية وفق معيار DCSA العالمي).
  - `settings` (تخزين وتشفير إعدادات خوادم البريد الصادر SMTP والوارد IMAP).

* **المصفوفة التفصيلية لميزات الموديول المؤتمت:**
| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **استفسارات وطلبات الشحن للعملاء (Client Freight Inquiries)** | 🟢 | 100% | `CreateInquiryModal.tsx`, `MaritimeInquiriesTab.tsx`, `maritime-freight.service.ts` | نقطة الانطلاق الأولى لتسجيل طلبات العملاء (اسم العميل، الهاتف، الإيميل، المسار، الحاويات، الوزن، CBM، الجاهزية CRD، الشروط التجارية Incoterms، وشروط الدفع Prepaid/Collect). |
| **التكامل المباشر في القائمة الجانبية (Sidebar Direct Navigation)** | 🟢 | 100% | `app-shell.tsx`, `routes.tsx` | إدراج رابط "طلبات الشحن (Inquiries)" في صدارة قائمة الشحن البحري، ورابط "إعدادات البريد والأتمتة" في نهايتها للوصول بضغطة واحدة من أي مكان في النظام دون الحاجة لفتح تبويب آخر أولاً. |
| **التحويل الفوري بضغطة زر لطلب تسعير خطوط (1-Click Convert to RFQ)** | 🟢 | 100% | `convertInquiryToRfq`, `MaritimeInquiriesPage.tsx` | تمرير بيانات طلب العميل آلياً وتوليد كود تسلسلي رسمي لطلب التسعير الملاحي (RFQ) وإتاحته للإرسال المباشر لشركات الملاحة. |
| **دليل الشركاء والخطوط ووكلاء الشحن (Partners Directory & Trade Desks)** | 🟢 | 100% | `MaritimeMasterDataTab.tsx`, `PartnerFormModal.tsx`, `2040000000085_maritime_partners_directory.ts` | سجل مؤسسي متكامل لجهات الاتصال مقسم لـ 3 تبويبات: (1) الخطوط والتوكيلات الملاحية ومكاتب تسعير الممرات الملاحية (Trade Lanes: الصين، أوروبا، الخليج، أمريكا)، (2) وكلاء الشحن بالخارج مع فلتر الدولة (الصين، تركيا، ألمانيا، إيطاليا...)، (3) دليل الموانئ؛ مع زر نسخ الإيميلات وربط ذكي بنافذة الـ RFQ. |
| **شريط مسار الشحن المؤتمت (Maritime Workflow Stepper)** | 🟢 | 100% | `MaritimeWorkflowStepper.tsx` | شريط مرئي تفاعلي يوضح للشركة مراحل دورة الشحن الست الكاملة وتسهيل التنقل اللحظي بينها. |
| **إعدادات خوادم البريد وأتمتة Outlook و IMAP/SMTP** | 🟢 | 100% | `MaritimeSettingsTab.tsx`, `maritime-mail.service.ts` | ضبط حساب Outlook / Microsoft 365 أو Gmail أو الخوادم الخاصة للشركة؛ خادم الإرسال SMTP لإرسال طلبات التسعير، وخادم الاستقبال IMAP لقراءة الردود. |
| **مركز الفحص اللحظي والمزامنة الذاتية لصندوق الوارد** | 🟢 | 100% | `testMailConnection`, `sendTestEmail`, `syncInboundBids` | فحص فوري ومصادقة كلا الخادمين وإظهار زمن الاستجابة، إرسال بريد تجريبي، ومزامنة صندوق الوارد بالذكاء الاصطناعي لاستخراج عروض الخطوط وإدراجها في مصفوفة المقارنة. |
| **مصفوفة المفاضلة وتطبيق الهامش الربحي (Matrix & Pricing)** | 🟢 | 100% | `MaritimeMatrixTab.tsx`, `ApplyMarginModal.tsx` | مقارنة عروض الخطوط الملاحية جنباً إلى جنب، تطبيق الهامش الربحي (مبلغ ثابت أو نسبة مئوية)، احتساب سعر الصرف، وإرسال عرض السعر للعميل عبر واتساب. |
| **التعميد الآلي وفتح ملف الشحنة ومركز التكلفة (Auto Convert to Job)** | 🟢 | 100% | `autoConvertQuotationToJob`, `MaritimeQuotationsPage.tsx` | بنقرة زر واحدة عند اعتماد العميل، يتم إنشاء أمر التشغيل وتوليد كود الشحنة الرسمي وتأسيس مركز التكلفة المحاسبي وربط الحاويات ومراحل DCSA. |
| **محطات التتبع البحري DCSA ومحطة التسليم النهائي (DLVR Milestone)** | 🟢 | 100% | `JobDetailsModal.tsx`, `maritime-freight.types.ts` | تتبع حركة السفينة والحاويات (BOOK, GTI, LOAD, DEPT, ARRI, DISC, CUST, GTO, DLVR, RETN)، وتحديث حالة التسليم النهائي للعميل مع تنبيه مباشر للرادار. |
| **إشعارات الواتساب اللحظية لمراحل الشحن (Milestone WhatsApp Alerts)** | 🟢 | 100% | `getJobWhatsAppAlert`, `JobDetailsModal.tsx` | إرسال إشعار فوري للعميل عبر واتساب عند وصول السفينة أو الإفراج الجمركي أو تسليم البضاعة مع رابط التتبع السحابي المباشر. |
| **رادار الحاويات وإدارة تأمين الفارغ (Demurrage & Deposit Refund)** | 🟢 | 100% | `MaritimeContainersTab.tsx`, `ContainerReturnModal.tsx` | رادار احتساب فترات السماح المتبقية ومنع غرامات الأرضيات والتأخير، وإدارة استرداد مبالغ التأمين وإيداعها في الخزينة. |
| **تطهير الواجهات الشامل من الإيموجيز (Zero-Emoji Compliance)** | 🟢 | 100% | كافة مكونات الشحن البحري | تطهير كافة الشاشات والنوافذ والرسائل الصادرة من أي رموز كرتونية أو إيموجيز، والاعتماد الحصري على أيقونات النظام الرسمية في `AppIcons`. |

---


<!-- migrated:cap-120:end -->

<a id="cap-125"></a>
<!-- migrated:cap-125:start -->
## 43. الشحن البحري وإدارة عروض أسعار الخطوط (Maritime Freight & Carrier RFQs)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/maritime-freight`, `frontend/src/features/maritime-freight`
* **الجداول في قاعدة البيانات:** `maritime_rfqs`, `maritime_rfq_bids`, `shipping_lines`, `shipping_ports`, `maritime_inquiries`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **نافذة التأكيد وتحديد جهات الإرسال لطلبات التسعير (Selective Carrier RFQ Dispatch Modal)** | 🟢 | 100% | `DispatchRfqModal.tsx`, `MaritimeRfqTab.tsx`, `MaritimeRfqsPage.tsx`, `maritime-freight.service.ts`, `maritime-freight.controller.ts` | نافذة منبثقة تفاعلية تفتح عند الضغط على زر "إرسال" لطلب التسعير؛ تعرض ملخصاً شاملاً لبيانات الشحنة ومسار الرحلة (POL/POD) ونوع وعدد الحاويات والبضاعة وشروط التعاقد، مع قائمة تفاعلية بكافة الخطوط والوكلاء الملاحيين مزودة ببحث سريع وفلاتر جغرافية وتصنيفية (صين، أوروبا، خطوط، وكلاء)، مع إمكانية تحديد واستبعاد الخطوط عبر Checkboxes، ومعاينة لنص وموضوع الرسالة الرسمية والرابط السحري قبل الإطلاق. |
| **محرك الإرسال المتوازي عبر SMTP مع كشف الردود بالذكاء الاصطناعي** | 🟢 | 100% | `maritime-freight.service.ts`, `maritime-mail.service.ts`, `settings` | إرسال رسائل RFQ عبر خادم البريد المخصص للمنشأة بمهلات اتصال سريعة وتوليد روابط سحرية مخصصة ومتابعة واستقبال الردود آلياً عبر IMAP. |

---


<!-- migrated:cap-125:end -->

<a id="cap-131"></a>
<!-- migrated:cap-131:start -->
## 96. منظومة أتمتة البريد الملاحي والأرشفة التلقائية في مجلد المرسل (Maritime Email Automation & IMAP Sent Archiving)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في خوادم الشحن واللوجستيات (Auto Inbound Bids Parsing, Multi-carrier RFQ Dispatch & IMAP Sent Folder Archiving).
* **مسارات الكود الأساسية:**
  - خدمة البريد الملاحي: `backend/src/modules/maritime-freight/maritime-mail.service.ts`
  - محرك الشحن البحري: `backend/src/modules/maritime-freight/maritime-freight.service.ts`
  - موديول الخدمات: `backend/src/modules/maritime-freight/maritime-freight.module.ts`
* **القدرات التشغيلية والمشكلات المعالجة:**
  1. **الأرشفة التلقائية في مجلد البريد المرسل (`IMAP APPEND to Sent Folder`):**
     - حل المشكلة التي كانت تجعل مجلد "Sent" في الويب ميل (مثل هوستنجر أو آوتلوك) فارغاً عند إرسال طلبات التسعير بالـ SMTP البرمجي.
     - تطوير محرك `appendSentEmailToImap` الذي يكتشف تلقائياً مجلد المرسل الخاص بالسيرفر (سواء كان `INBOX.Sent` أو `Sent` أو يحمل راية `\Sent`)، وينسخ نسخة طبق الأصل من الرسالة (RFC822) فوراً في مجلد المرسل.
     - ظهور كافة المراسلات الصادرة في هواتف الموظفين وتطبيقات Outlook وموقع الويب ميل بشفافية وسجل تدقيق قانوني (Audit Trail) كامل.
  2. **محرك الاستقبال وفك التشفير الآلي لردود الخطوط الملاحية (Inbound IMAP Parser):**
      - قراءة وفحص صندوق الوارد آلياً واستخراج أسعار النولون البحري (Ocean Freight)، أيام السماح (Free Days)، مصاريف الموانئ (Origin/Dest THC)، ومدة الإبحار، وإدراجها مباشرة في مصفوفة عروض الأسعار للمقارنة واتخاذ القرار.

---


<!-- migrated:cap-131:end -->

<a id="cap-132"></a>
<!-- migrated:cap-132:start -->
## 97. التطوير البريميوم لنافذة إصدار عرض سعر العميل الملاحي (Maritime Freight Quotation & Profit Margin Modal)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومطابق تماماً لدستور النظام البصري (0 Emojis, Clean Enterprise SaaS, Universal Select & Dialog Shell Standards).
* **مسارات الكود الأساسية:**
  - المكون المحدث: `frontend/src/features/maritime-freight/components/ApplyMarginModal.tsx`
  - شاشة الوصول: مسار مصفوفة الشحن البحري `/maritime/matrix` (زر "تطبيق الهامش وإصدار عرض السعر").
* **الترقيات والتحسينات البصرية والتشغيلية المطبقة:**
  1. **التخلص التام من البنرات القاتمة (Elimination of Dark Banners):**
     - استبدال الصندوق البنفسجي/الكحلي الداكن بنظام البطاقات المؤسسية الساطعة (Enterprise SaaS White Cards) ذات الإطار الكحلي الخفيف والحد العلوي الملكي المميز (`borderTop: 3px solid #170e5e`)، وفقاً للبند 4 في `GEMINI.md`.
  2. **اعتماد نظام الكومبوبوكس الموحد (`CustomSelect`):**
     - استبدال عنصر HTML التقليدي `<select>` بمكون الكومبوبوكس القياسي الموحد `CustomSelect` لتحديد نوع الهامش (مبلغ مقطوع ثابت أو نسبة مئوية) مع دعم التطبيع والبحث ومنع تشوه الواجهة، وفقاً للبند 13 في `GEMINI.md`.
  3. **بطاقة ملخص تسعيرة الخط الملاحي المعتمد:**
     - عرض بطاقة علوية متزنة وأنيقة توضح اسم الخط الملاحي بأيقونة السفينة الرسمية (`ShipIcon`)، رقم طلب الـ RFQ، والتكلفة الأصلية بالدولار، ومسار الشحن (POL إلى POD)، والحمولة، وأيام السماح، ومصاريف الـ THC.
  4. **بطاقة المعاينة المالية الثلاثية الفورية (3-Column Financial Matrix):**
     - تقسيم مالي متزن ومحكم بدون أي تشويش لوني:
       - عمود التكلفة الأصلية للخط الملاحي (Base Cost).
       - عمود هامش الربح المستهدف (Margin Markup) باللون الأخضر المؤسسي المتزن.
       - عمود إجمالي عرض السعر النهائي للعميل بالدولار، مع المعادِل التلقائي بالعملة المحلية للمنشأة (باستخدام `useSystemCurrency`).
  5. **إعادة هيكلة أزرار الإجراءات في تذييل النافذة (Unified Footer Actions):**
     - التخلص من الزر الأخضر الفاقع العشوائي الذي كان يشغل مساحة عريضة داخل جسم النافذة.
     - دمجه بانسيابية في فوتر النافذة القياسي بجانب زر الإلغاء، وزر "حفظ وتوليد عرض السعر" الأساسي، مع تفعيل المشاركة اللحظية المنظمة عبر واتساب برسالة منسقة احترافية تتضمن كافة تفاصيل ومراجع العرض.

---


<!-- migrated:cap-132:end -->

<a id="cap-138"></a>
<!-- migrated:cap-138:start -->
## 103. معيار ثبات أبعاد نافذة أمر التشغيل وتوحيد ارتفاع التابات (JobDetailsModal Stable-Sizing & Anti-Shrink Standard)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات الشحن الملاحي (Pre-balanced Min-Height, Zero Tab-Jumping, CustomSelect Milestone Dropdown & Pre-flight Loading Shell).
* **مسارات الكود الأساسية:**
  - نافذة ملف أمر التشغيل الملاحي: `frontend/src/features/maritime-freight/components/JobDetailsModal.tsx`
* **المشكلة البصرية المعالجة (The Shrinking & Jumping Popup Anti-Pattern):**
  - عند فتح نافذة ملف أمر التشغيل `JobDetailsModal` والتنقل بين التبويبات الأربعة (`بيانات الرحلة والحجز`، `الحاويات`، `مسار التتبع DCSA`، `ربحية العملية`):
  - كان حجم النافذة ينكمش بشدة عند الانتقال لتبويب الحاويات أو الربحية في حال قلة العناصر (حاوية واحدة أو اثنتين) ليصل إلى ~350px، ثم يتمدد ويقفز فجأة إلى ~650px عند الانتقال لتبويب مسار التتبع أو بيانات الرحلة، مما يسبب اهتزازاً بصرياً مزعجاً وانعداماً للاستقرار.
* **الحلول والترقيات الهندسية المنفذة:**
  1. **التحديد الصارم للأبعاد المؤسسية الموسعة (`width="min(1080px, 95vw)"` و `height="min(760px, 90vh)"`):**
     - تم تطوير المكون المعياري `DialogShell` و `StandardDialog` لدعم خاصية `height` الصريحة وليس فقط `minHeight`، وتوسيع أبعاد النافذة إلى 1080px عرضاً و 760px ارتفاعاً، مما يضمن عرض جدول الحسابات بالكامل وبطاقات المؤشرات وشريط مركز التكلفة بدون أي سكرول مزعج (Zero Scroll Standard) مع الاستفادة الكاملة من شاشات سطح المكتب.
  2. **احتواء التمرير الداخلي للتبويبات (`flex: 1; overflow-y: auto`):**
     - تثبيت الهيدر وأزرار التبويبات وأزرار الفوتر في أماكنها تماماً، مع جعل منطقة محتوى التبويب تتمدد لملء الارتفاع المتبقي (`flex: 1; min-height: 0`) وتتعامل مع المحتوى الداخلي عبر التمرير النظيف، مما يمنع نهائياً تضخم أو انكماش النافذة عند اختلاف كثافة البيانات بين التبويبات.
  3. **هيكل التحميل المسبق المتزن (Pre-flight Loading Shell):**
     - فتح النافذة فوراً بأبعادها النهائية الكاملة مع سبينر التحميل المعتمد أثناء جلب تفاصيل العملية الملاحية من السيرفر، لمنع فتح النافذة بهيكل فارغ ثم تمددها على مرحلتين.
  4. **ترقية قائمة اختيار المرحلة الملاحية (CustomSelect Dropdown):**
     - استبدال عنصر `<select>` التقليدي في تبويب التتبع DCSA بالقائمة المنسدلة المؤسسية الموحدة `CustomSelect` المتوافقة مع هوية المنظومة.
  5. **الترقية البريميوم لتبويب ربحية العملية (Executive Job P&L Dossier & Zero Dark Banners):**
     - إلغاء البانر الكحلي الداكن ذو الأرقام الفوسفورية الذي يخالف دستور النظام البصري، واستبداله بـ 3 بطاقات مؤشرات بيضاء ناصعة (`Clean White KPI Cards`) بحدود علوية ملونة تعكس الإيرادات والتكاليف وهامش الربح الحقيقي.
     - بناء جدول تفصيلي مؤسسي للحسابات الملاحية (`Financial Ledger Breakdown`) يفكك نولون الشحن، مصروفات الموانئ والـ THC، وتأمينات الحاويات المستردة مع أطرافها وحالاتها المحاسبية.
     - إعادة تصميم شريط مركز التكلفة والربط مع دليل الحسابات العام (`GL Integration Bar`) بتصميم شبكي ووسوم استحقاق القيود المزدوجة بدلاً من النص الرمادي الخام.


---


<!-- migrated:cap-138:end -->

<a id="cap-139"></a>
<!-- migrated:cap-139:start -->
## 104. ترقية وإكمال تبويبات الشحن البحري التشغيلية (Maritime Freight Operational Tabs Upgrade)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات الشحن الملاحي (Maritime Containers Tracking, Master Data & Email Automation).
* **مسارات الكود الأساسية:**
  - رادار تتبع الحاويات وفترات السماح: `frontend/src/features/maritime-freight/components/MaritimeContainersTab.tsx`
  - نافذة تحديث محطات دورة حياة الحاوية: `frontend/src/features/maritime-freight/components/ContainerMilestoneModal.tsx`
  - صفحة الحاويات الميدانية: `frontend/src/features/maritime-freight/pages/MaritimeContainersPage.tsx`
  - دليل الخطوط والوكلاء والموانئ: `frontend/src/features/maritime-freight/components/MaritimeMasterDataTab.tsx`
  - أتمتة المراسلات والبريد وإعدادات الربط: `frontend/src/features/maritime-freight/components/MaritimeSettingsTab.tsx`
* **الميزات والتحسينات المضافة:**
  1. **رادار فترات السماح المرئي وشريط الفلاتر السريعة (Maritime Containers Radar):**
     - شريط فلاتر سريع بنقرة واحدة لتصفية: [الكل]، [حاويات حرجة ≤ 3 أيام]، [متأخرة بغرامات أرضيات]، [تأمينات محتجزة لدى الخطوط]، و [تم إرجاعها].
     - شريط تقدم بصري أفقي (Progress Bar) يوضح نسبة الأيام المستهلكة من إجمالي فترة السماح (مثلاً 5 من أصل 14 يوماً) مع تغيير اللون ديناميكياً (أخضر للمتبقي الآمن، برتقالي للحالات الحرجة، أحمر للغرامات المتراكمة).
     - زر تصدير كشف الحاويات والغرامات والتأمينات إلى ملف Excel/CSV مع دعم الترميز العربي (BOM) لمطابقتها مع الخطوط الملاحية والعملاء.
  2. **نافذة تحديث محطات الحاوية التشغيلية (Container Milestone Modal):**
     - نافذة منبثقة معيارية سريعة لتسجيل وتحديث محطات حركة الحاوية مباشرة من جدول الرادار: تاريخ التفريغ بالميناء (Discharge Date)، تاريخ خروج البوابة للساحة (Gate-Out Date)، رقم السيل/الختم الملاحي، وملاحظات الفحص والتشغيل بنقرة واحدة ودون الحاجة للدخول لملف أمر الشغل.
  3. **دليل الخطوط والوكلاء والموانئ التفاعلي (Interactive Master Data Directory):**
     - إضافة زر تصدير الدليل إلى Excel/CSV للخطوط والوكلاء والموانئ والمواصفات القياسية.
     - تحويل أرقام الهواتف والواتساب لأزرار تفاعلية تفتح محادثات واتساب مباشرة (`https://wa.me/...`) مع مسؤولي الخطوط والوكلاء الدوليين.
     - إظهار كبسولات مسارات الشحن الملاحية والتغطية (Trade Lanes Badges) تحت كل خط ملاحي.
  4. **تحسين تجربة إعدادات المراسلات وفحص الربط (Email Settings & Diagnostic Hub):**
     - نقل مركز الفحص والاختبار والتشغيل المباشر ليكون أسفل بطاقات بيانات الدخول لـ SMTP و IMAP مباشرة لتيسير اختبار الاتصال وإرسال البريد التجريبي دون الحاجة للتمرير لأسفل الصفحة.
     - دعم كامل لخدمات بريد الشركات المخصصة (Custom Private Mail Server) وخوادم الأعمال المختلفة مع حفظ مشفر لبيانات الاعتماد واختبار فوري للاتصال.

---


<!-- migrated:cap-139:end -->

<a id="cap-141"></a>
<!-- migrated:cap-141:start -->
## 106. المرحلة الأولى لأتمتة وربط الشحن الملاحي محاسبياً وجدولة المزامنة الذكية (Maritime Freight Phase 1: GL Financial Ledger Automation, Background Scheduler & Universal Combobox)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في شاشات الشحن الملاحي والباك إند (Double-Entry General Ledger Posting, Background Automation Cron Engine & Universal CustomSelect UI).
* **مسارات الكود الأساسية:**
  - الباك إند وخدمات الترحيل المحاسبي: `backend/src/modules/maritime-freight/maritime-freight.service.ts`
  - خدمة الجدولة الآلية والمزامنة الخلفية: `backend/src/modules/maritime-freight/maritime-automation-scheduler.service.ts`
  - وحدة الشحن الملاحي: `backend/src/modules/maritime-freight/maritime-freight.module.ts`
  - متحكم الشحن الملاحي: `backend/src/modules/maritime-freight/maritime-freight.controller.ts`
  - واجهة برمجة التطبيقات للفرونت إند: `frontend/src/features/maritime-freight/api/maritime-freight.api.ts`
  - تفاصيل أمر الشغل والقيود المحاسبية الحية: `frontend/src/features/maritime-freight/components/JobDetailsModal.tsx`
  - مكونات الواجهة المطهرة بنظام CustomSelect: `CreateRfqModal.tsx`, `CarrierBidEntryModal.tsx`, `ContainerReturnModal.tsx`, `CreateInquiryModal.tsx`, `MaritimeMatrixTab.tsx`, `MaritimeInquiriesTab.tsx`, `MaritimeMasterDataTab.tsx`, `MaritimeSettingsTab.tsx`, `PartnerFormModal.tsx`, `ImportCarriersModal.tsx`, `PublicCarrierQuotePage.tsx`.
* **الميزات والترقيات الهندسية المنفذة:**
  1. **الترحيل المالي المحاسبي المزدوج لأوامر الشغل الملاحية (Real Double-Entry GL Ledger Posting):**
     - إصدار فاتورة المبيعات للعميل (`issueJobSalesInvoice`): توليد قيد يومية متزن نظامي بقيد مدين على حـ/ العملاء المدينين (`1130`) وقيد دائن على حـ/ إيرادات الشحن والخدمات (`4200` / `4100`) مع ربط طرف القيد بمركز تكلفة الشحنة (`cost_center_id`) وتحديث إجمالي المفوتر للعميل وصافي الربحية.
     - تسجيل إذن صرف مصروفات الشحنة والخط الملاحي (`recordJobExpenseVoucher`): توليد قيد يومية متزن نظامي بقيد مدين على حـ/ مصروفات الشحن والنولون (`6400` / `5100`) مربوط بمركز التكلفة وقيد دائن على حـ/ الخط الملاحي أو المورد (`2110`) أو الخزينة النقدية (`1110`) أو البنك (`1120`).
     - عرض دفتر الأستاذ المالي الحي للشحنة (`JobDetailsModal - Finance Tab`) يوضح أرقام القيود اليومية المنشأة، أطراف القيد المدينة والدائنة، أكواد الحسابات، والمطابقة المحاسبية بدقة.
  2. **خدمة الجدولة الآلية الخلفية للشحن الملاحي (Maritime Automation Background Scheduler):**
     - بناء وتشغيل `MaritimeAutomationSchedulerService` عبر `@nestjs/schedule` كمهام مجدولة (Cron Jobs).
     - مهمة دورية للمزامنة البريدية الذكية (IMAP Bids Sync) تقرأ وتفحص عروض أسعار الخطوط الواردة لكل مشترك لديه الإعداد مفعل دون تدخل بشري.
     - مهمة يومية صباحية لفحص رادار الحاويات ورصد ومراقبة الحاويات الحرجة التي يقترب انتهاء فترات سماحها (Free Days ≤ 3 أيام) لتجنب غرامات الأرضيات (Demurrage).
  3. **التطهير الشامل وتوحيد القوائم المنسدلة (Strict Universal CustomSelect Standard):**
     - إزالة وتطهير 100% من عناصر `<select>` التقليدية في كافة ملفات ومكونات موديول الشحن واللوجستك واستبدالها بالمكون الموحد البريميوم `CustomSelect`.

---


<!-- migrated:cap-141:end -->

<a id="cap-142"></a>
<!-- migrated:cap-142:start -->
## 107. الأتمتة الكاملة لموديول الشحن واللوجستك: إشعارات الواتساب السحابية، بوابة التتبع المباشر، محرك بوالص e-B/L ومستندات الموانئ، ورادار الأقمار الصناعية (Maritime Freight Complete Automation: Cloud WhatsApp, Public Tracking Portal, e-B/L Engine & AIS Satellite Radar)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في الباك إند والفرونت إند (End-to-End Enterprise Freight Automation, Automated WhatsApp Milestones, Public DCSA Tracking Portal, FIATA/BIMCO e-B/L & D/O Engine, and Live AIS Satellite Tracking).
* **معيار المقارنة الدولي:** Freightos / Flexport / Portcast / CargoWise End-to-End Maritime Logistics & Multimodal Tracking.
* **روابط وشاشات الوصول:**
  - نافذة إدارة وتتبع العملية ومستندات الشحن: `/logistics/ocean-freight` ➔ (انقر على أي عملية ➔ تبويب "بيانات الرحلة"، "مسار التتبع"، "مستندات الشحن وبوالص B/L").
  - بوابة التتبع العامة للعملاء: `/public/track/:token` و `/track/:token` و `/track`.
* **مسارات الكود الأساسية:**
  - الباك إند:
    - `backend/src/modules/maritime-freight/maritime-freight.module.ts`: ربط وحدة الإعدادات وخدمة `WhatsAppGatewayService`.
    - `backend/src/modules/maritime-freight/maritime-freight.service.ts`: الربط السحابي لإرسال رسائل الواتساب اللحظية عند تسجيل محطات DCSA، نقطة البحث الشامل في بوابة التتبع العام عبر التوكن أو رقم البوليصة أو الحاوية أو الحجز، وخدمة الإرسال المباشر.
    - `backend/src/modules/maritime-freight/maritime-automation-scheduler.service.ts`: الأتمتة الذكية لإنذارات الأرضيات (Demurrage Proactive Alerts) عبر إرسال رسائل تحذيرية تلقائية للعملاء عبر الواتساب للحاويات التي يتبقى عليها $\le 3$ أيام سماح بالميناء.
    - `backend/src/modules/maritime-freight/maritime-freight.controller.ts`: تسجيل نقطة `POST /api/maritime-freight/jobs/:id/send-whatsapp` ونقطة بوابة التتبع العامة `GET /api/public/freight-tracking/:token`.
  - الفرونت إند:
    - `frontend/src/features/maritime-freight/api/maritime-freight.api.ts`: دوال `sendJobMilestoneWhatsApp` و `getPublicTracking`.
    - `frontend/src/features/maritime-freight/utils/maritime-documents.ts`: محرك توليد وطباعة وثائق الشحن الرسمية المتوافقة مع FIATA و BIMCO (بوليصة الشحن البحرية HBL، إذن التسليم الملاحي D/O مع مربعات أختام الإفراج والجمارك، وإشعار وصول الشحنة Consignee Arrival Notice).
    - `frontend/src/features/maritime-freight/pages/PublicShipmentTrackingPage.tsx`: بوابة التتبع العامة المتطابقة مع معايير DCSA، توضح خط سير المحطات، حالة ومواصفات الحاويات، عد تنازلي لمهل الأرضيات، ورابط رادار الأقمار الصناعية المباشر.
    - `frontend/src/features/maritime-freight/components/JobDetailsModal.tsx`: تكامل كامل لتبويب مستندات الشحن، بطاقة رادار AIS الحي لتتبع السفينة (MarineTraffic / VesselFinder)، وأزرار الإرسال السحابي واليدوي للواتساب.
    - `frontend/src/app/router/root-router.tsx`: تسجيل مسارات التتبع العامة.
* **الميزات والترقيات الهندسية المنفذة:**
  1. **الأتمتة التامة لإشعارات الواتساب السحابية والميدانية (Automated WhatsApp Milestones & Proactive Demurrage Alerts):**
     - إرسال سحابي تلقائي لرسائل الواتساب إلى هاتف العميل عبر `WhatsAppGatewayService` فور تسجيل أي محطة ملاحية (مثل خروج البضاعة من المصنع، وصول الحاويات للميناء، إبحار السفينة، وصول الميناء، إصدار إذن التسليم D/O).
     - جدولة ذكية ترسل تلقائياً إنذار استباقي للعميل عبر الواتساب عند اقتراب انتهاء أيام السماح للحاويات ($\le 3$ أيام) لتفادي غرامات الأرضيات والتأخير.
     - أزرار إرسال سحابية فورية مباشرة في واجهة متابعة الشحنة مع زر احتياطي للفتح في تطبيق واتساب مباشرة (`wa.me`).
  2. **بوابة التتبع الملاحي العامة للعملاء (Customer Self-Service Tracking Portal):**
     - صفحة عامة بريميوم ذات هوية مؤسسية وتصميم RTL احترافي، خالية من أي إيموجيز ومعتمدة على `AppIcons`.
     - دعم البحث المرن والفوري برمز التتبع الفريد، رقم العملية Job #، رقم بوليصة الشحن الرئيسية MBL، رقم بوليصة الشحن الداخلية HBL، أو رقم الحجز Booking #.
     - عرض حي لمسار الرحلة POL ➔ POD، جدول محطات DCSA التفاعلي، بطاقات الحاويات مع عداد أيام السماح ومهلة الإرجاع، وبيانات السفينة والخط الملاحي.
  3. **محرك إصدار وطباعة بوالص الشحن والمستندات الملاحية (e-B/L & Maritime Documents Engine):**
     - **بوليصة الشحن البحري القياسية (FIATA/BIMCO Compliant House B/L):** وثيقة دولية قياسية بمقاس A4 تتضمن تفاصيل الشاحن، المستلم، جهة الإخطار، السفينة، الرحلة، مواصفات الحاويات، الأوزان الإجمالية، الحجم بالمتر المكعب CBM، وأختام الناقل.
     - **إذن التسليم الملاحي الرسمي (Delivery Order - D/O):** مستند إفراج رسمي موجه لسلطات الموانئ والجمارك ومحطات الحاويات، يتضمن جدول الحاويات ومربعات توقيع واعتماد الفحص الجمركي وجهات التخليص.
     - **إشعار وصول الشحنة (Consignee Arrival Notice):** إخطار رسمي للعميل بموعد وصول السفينة وتفريغ البضائع وتفاصيل المستندات المطلوبة لاستلام إذن التسليم.
  4. **رادار الأقمار الصناعية لتتبع السفن الحية (Live Satellite AIS Vessel Radar):**
     - بطاقة ملاحية مدمجة في ملف العملية تتيح تتبع السفينة مباشرة عبر رادار الأقمار الصناعية وأنظمة AIS العالمية (MarineTraffic & VesselFinder) بنقرة واحدة بمجرد إدخال اسم السفينة ورقم الرحلة.

---


<!-- migrated:cap-142:end -->

<a id="cap-143"></a>
<!-- migrated:cap-143:start -->
## 108. محرك مسارات الأتمتة الملاحية وهوامش الربح ومحطات التوقف البشرية (Autonomous Freight Pipeline, Margins Engine & Human-in-the-Loop Checkpoints)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل في الباك إند والفرونت إند (Autonomous RFQ Pipeline, Default Markup Engine, Bidding Cut-off Timers, Early Awarding Triggers & Granular Human Checkpoints).
* **مسارات الكود الأساسية:**
  - الباك إند:
    - `backend/src/database/migrations/2040000000088_maritime_automation_pipeline.ts`: إضافة حقول الأتمتة (`urgency_level`, `cut_off_deadline`, `auto_awarded`, `target_rate_max`) وفهرس البحث السريع في `maritime_rfqs`.
    - `backend/src/database/database.types.ts`: تحديث تعريف جدول `MaritimeRfqTable`.
    - `backend/src/modules/maritime-freight/maritime-freight.types.ts`: واجهة `MaritimePipelineConfig` والقيم الافتراضية `DEFAULT_PIPELINE_CONFIG`.
    - `backend/src/modules/maritime-freight/dto/create-rfq.dto.ts`: استقبال خيارات الأولوية والمهل الزمنية وسقف السعر.
    - `backend/src/modules/maritime-freight/maritime-freight.service.ts`: محرك حفظ واسترجاع الإعدادات `getPipelineSettings` و `savePipelineSettings`، ودالة معالجة الأتمتة الدورية `processAutomatedPipelineForTenant`.
    - `backend/src/modules/maritime-freight/maritime-freight.controller.ts`: تسجيل مسارات `GET /api/maritime-freight/pipeline-settings` و `POST /api/maritime-freight/pipeline-settings` و `POST /api/maritime-freight/pipeline/trigger`.
    - `backend/src/modules/maritime-freight/maritime-automation-scheduler.service.ts`: تشغيل محرك الأتمتة والترسية تلقائياً في الخلفية فور مزامنة البريد وفي دورات الجدولة التلقائية.
  - الفرونت إند:
    - `frontend/src/features/maritime-freight/api/maritime-freight.api.ts`: دوال استدعاء وضبط مسار الأتمتة `getPipelineSettings` و `savePipelineSettings` و `triggerPipeline`.
    - `frontend/src/features/maritime-freight/components/MaritimePipelineSettingsTab.tsx`: شاشة إعدادات متكاملة واحترافية للتحكم في النمط التشغيلي (أتمتة كاملة / هجين ذكي / يدوي)، وضبط هوامش الربح الآلية، ومؤقت المهل، ومصفوفة محطات التوقف البشرية، وقنوات الإرسال المباشر.
    - `frontend/src/features/maritime-freight/pages/MaritimeSettingsPage.tsx`: شريط تبويبات علوي متجاوب يوفر التبديل السلس بين "قواعد مسار الأتمتة وهامش الربح" و"خوادم البريد والمراسلات".
    - `frontend/src/features/maritime-freight/components/CreateRfqModal.tsx`: قسم مخصص لاختيار أولوية الطلب (عادي 24 ساعة / عاجل 6 ساعات)، والمهلة المخصصة بالساعات، وسقف السعر للترسية المبكرة.
    - `frontend/src/features/maritime-freight/components/MaritimeMatrixTab.tsx`: بطاقة تفاصيل معززة بمؤقت عد تنازلي حي (Cut-off Countdown Badge) يوضح الوقت المتبقي لغلق المزايدة أو جاهزية الطلب للترسية، مع شارات الأولوية والترسية الآلية.
    - `frontend/src/features/maritime-freight/pages/MaritimeLayout.tsx`: تحديث مسمى تبويب الإعدادات إلى "قواعد الأتمتة والمراسلات".
* **الميزات والترقيات الهندسية المنفذة:**
  1. **الأنماط التشغيلية الثلاثة (Master Automation Modes):**
     - **أتمتة كاملة ذاتية (Full Zero-Touch):** جمع العروض، فرز أفضل قيمة، تطبيق الهامش، وإصدار وإرسال العرض للعميل دون أي تدخل يدوي.
     - **هجين ذكي (Smart Hybrid):** السستم يدير الاستقصاء والفرز التلقائي ويتوقف عند محطات مراجعة الهامش للموافقة البشرية.
     - **تحكم يدوي كلاسيكي (Manual Control):** تحكم يدوي في كل إجراء وزر.
  2. **محرك هوامش الربح الآلي (Autonomous Margin & Markup Engine):**
     - دعم كامل لهامش المبلغ المقطوع الثابت ($/TEU) أو النسبة المئوية المضافة (%)، مع حد أدنى للأمان الربحي (Margin Floor) لمنع أي بيع بخسارة.
  3. **مؤقت المهل الزمنية والترسية المبكرة (Cut-off Timers & Early Awarding):**
     - تحديد مهلة الردود تلقائياً للشحنات العادية (24 ساعة) والعاجلة (6 ساعات) مع عداد حي في تبويب المصفوفة.
     - دعم الترسية الفورية المبكرة إذا قدم أي خط ملاحي معتمد سعراً يقل عن سقف العميل المستهدف مع 14 يوماً سماح دون انتظار انقضاء الساعات.
  4. **مصفوفة محطات التوقف والمراجعة البشرية (Human-in-the-Loop Checkpoints):**
     - إمكانية تفعيل أو تعطيل التوقف البشري في أي مرحلة من المراحل الأربع (إرسال الـ RFQ، اعتماد الهامش والترسية، وإرسال العرض النهائي للعميل).

---


<!-- migrated:cap-143:end -->

<a id="cap-144"></a>
<!-- migrated:cap-144:start -->
## 109. دليل الخطوط والوكلاء الموسع (59 جهة) ونظام الفرز والتحديد الهرمي الذكي (Two-Tier Hierarchical Carrier/Agent Selection Engine)
* **حالة الوحدة العامة:** 🟢 مكتمل 100% ومدمج في شاشات إنشاء وإرسال طلبات التسعير الملاحي (RFQ Creation & Dispatch Modals).
* **مسارات الكود الأساسية:**
  - الباك إند:
    - `backend/src/modules/maritime-freight/maritime-defaults.data.ts`: توسيع الدليل الملاحي الافتراضي ليشمل 59 جهة كاملة (20 خط وتوكيل ملاحي معتمد + 39 وكيل شحن دولي بالخارج يغطون كافة أقاليم التجارة العالمية).
    - `backend/src/database/migrations/2040000000089_maritime_expand_directory_to_59.ts`: ميجريشن ترقية قاعدة البيانات لتسجيل وتحديث جهات الإرسال الـ 59 لكافة المستأجرين مع منع التكرار.
    - `backend/src/modules/maritime-freight/maritime-freight.service.ts`: ضمان التعبئة التلقائية (Self-Healing Master Data) لأي جهة مفقودة لضمان إتاحة الـ 59 جهة دائماً لكل مستأجر.
  - الفرونت إند:
    - `frontend/src/features/maritime-freight/components/CarrierSelectionGrid.tsx`: مكون موحد فائق الذكاء يدير نظام الفرز والتحديد متعدد الطبقات (Two-Tier Selection Engine).
    - `frontend/src/features/maritime-freight/components/CreateRfqModal.tsx`: دمج المكون الموحد في قسم استهداف وتحديد الخطوط والوكلاء عند إنشاء الـ RFQ الجديد.
    - `frontend/src/features/maritime-freight/components/DispatchRfqModal.tsx`: دمج المكون الموحد في نافذة مراجعة وإرسال إيميلات التسعير وتوزيعها.
* **الميزات والترقيات الهندسية المنفذة:**
  1. **المستوى الأول للفرز والتحديد الكلي (Level-1 Category Selection with Independent Checkboxes):**
     - التبويب الأول والأولوية: **وكلاء الشحن الدوليين بالخارج** مع شيك بوكس مستقل لتحديد/إلغاء تحديد كل وكلاء الشحن بنقرة واحدة مع عداد رقمي فوري.
     - التبويب الثاني: **الخطوط والتوكيلات الملاحية** مع شيك بوكس مستقل لتحديد/إلغاء تحديد كافة الخطوط الملاحية فوراً.
     - التبويب الثالث: **الكل (الخطوط والوكلاء معاً)** مع شيك بوكس شامل للتحكم في كافة الـ 59 جهة بنقرة واحدة.
  2. **المستوى الثاني للفرز الإقليمي والتحديد الجغرافي (Level-2 Regional Sub-filters with Regional Checkboxes):**
     - عند النقر على تبويب وكلاء الشحن (بدون لمس الشيك بوكس)، تظهر تلقائياً فلاتر الأقاليم الجغرافية:
       - الصين والشرق الأقصى (Far East & China)
       - أوروبا والمتوسط (Europe & Med)
       - الخليج والبحر الأحمر (Gulf & Red Sea)
       - تركيا والشرق الأوسط (Turkey & Middle East)
       - الهند وجنوب آسيا (India & South Asia)
       - أمريكا والأمريكتين (Americas)
     - كل إقليم جغرافي مزود بزر شيك بوكس مدمج بجوار اسمه، يتيح تحديد أو إلغاء تحديد كافة وكلاء ذلك الإقليم تحديداً بنقرة زر واحدة دون التأثير على بقية الأقاليم.
  3. **البحث المزدوج الفوري وتنسيق البطاقات المريح:**
     - حقل بحث مباشر يبحث في الاسم العربي والإنجليزي، الكود، الدولة، المدينة، والبريد الإلكتروني.
     - بطاقات تفاعلية أنيقة توضح كود الجهة، نوعها، ودولتها، مع إبراز حالة تفعيل البريد الإلكتروني وخيارات التحديد الفردي والجماعي.

---


<!-- migrated:cap-144:end -->

<a id="cap-183"></a>
<!-- migrated:cap-183:start -->
## 154. موديول اللوجستيات وحركات المناديب والأسطول والشحن ودستور الترقيم الموحد (Phase 8: Logistics, Fleet & Maritime Invariants & Universal Document Numbering)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Phase 8 Production-Ready & Invariant-Audited).
* **المعايير الهندسية والتشغيلية المعتمدة:** Rule 10 Universal Document Numbering (`PREFIX-YYMMDD-XXXX`) / Rule 13 Financial & Operational Audit Protocol / Pessimistic Row Locking (`forUpdate`) / Race-Condition Prevention (Pattern F1) / Atomic Numbering via Returning Identity (Pattern F6) / Single Source of Truth / 0 Emojis Policy.
* **المسارات في الكود:**
  - `backend/src/modules/delivery-reps/delivery-reps.service.ts`:
    1. تحصين دالة تسوية أوردرات المناديب `settleOrder` بنقل استعلام الفاتورة لداخل المعاملة `this.db.transaction()` مع فرض قفل تشاؤمي `forUpdate()`، مما يقضي جذرياً على خطر التسوية المزدوجة المتزامنة وحركات الخزينة والقيود المحاسبية المضاعفة (Pattern F1).
    2. تحصين دالة تسليم المندوب الميدانية `driverSettleOrder` وتغليفها بمعاملة ذرية وقفل تشاؤمي لمنع التكرار المتزامن عند النقر المتكرر.
  - `backend/src/modules/delivery-reps/van-sales.service.ts`:
    1. توحيد وإلزام معيار الترقيم الموحد للوثائق `formatDailyDocumentNumber` لجميع حركات مبيعات سيارات التوزيع:
       - فواتير البيع الميداني: `VAN-YYMMDD-XXXX`.
       - سندات التحصيل النقدي الميداني: `COL-YYMMDD-XXXX`.
       - أذونات مرتجعات العملاء الميدانية: `RET-YYMMDD-XXXX`.
    2. القضاء على نمط الترقيم العشوائي بـ `Date.now().slice(-6)` وربط أرقام الوثائق بالمعرف الذاتي الحقيقي في جدول المبيعات والمدفوعات والأستاذ المساعد.
  - `backend/src/modules/maritime-freight/maritime-freight.service.ts`:
    1. القضاء التام على ثغرة ترقيم `COUNT(*) + 1` (Open Item O9 / Pattern F6) في كافة عمليات الشحن البحري:
       - طلبات الاستفسار الملاحي: `INQ-YYMMDD-XXXX`.
       - طلبات عروض الأسعار للخطوط: `RFQ-YYMMDD-XXXX`.
       - عروض أسعار العملاء: `QUO-YYMMDD-XXXX`.
       - أوامر تشغيل الشحنات: `JOB-YYMMDD-XXXX`.
  - `backend/src/database/database.types.ts`: تعريف الأنواع والجداول `ContractingSubcontractorTable` و `ContractingSubcontractorPaymentTable` وربطها بواجهة قاعدة البيانات المركزية.
  - `backend/src/modules/contracting/dto/contracting.dto.ts`: إضافة كائنات نقل البيانات `CreateSubcontractorDto` و `UpdateSubcontractorDto` و `CreateSubcontractorPaymentDto` مع التحقق الصارم من صحة الحقول.
  - `backend/src/modules/contracting/contracting.service.ts` & `contracting.controller.ts`: محرك إدارة مقاولي الباطن (CRUD)، محرك كشف الحساب المالي التحليلي اللحظي `getSubcontractorLedger` لحساب ما له وما عليه وصافي المستحق، ومحرك تسجيل سندات الصرف `createSubcontractorPayment` مع التوليد التسلسلي الموحد.
  - `frontend/src/features/contracting/contracting.types.ts`: تعريف الأنواع للواجهات الأمامية `ContractingSubcontractor` و `ContractingSubcontractorPayment` و `SubcontractorLedgerResponse`.
  - `frontend/src/features/contracting/api/contracting.api.ts`: دوال الاستدعاء والربط السحابي للخدمات المالية ودليل المقاولين وسندات الصرف.
  - `frontend/src/features/contracting/components/SubcontractorsDirectoryModal.tsx`: دليل وسجل مقاولي الباطن مع شريط تصفية التخصصات المهنية والبحث الفوري وعرض ملخص العقود وصافي المستحقات.
  - `frontend/src/features/contracting/components/CreateSubcontractorModal.tsx`: نافذة تسجيل مقاول باطن جديد بالتخصص والبيانات الضريبية والتجارية والبنكية.
  - `frontend/src/features/contracting/components/SubcontractorLedgerModal.tsx`: كشف حساب مقاول الباطن («ما له وما عليه») مع 5 بطاقات KPI فورية، سجل حركات تفصيلي برصيد تراكمي Running Balance، خيارات فلترة بالمشروع والتاريخ، وطباعة كشف حساب معتمد.
  - `frontend/src/features/contracting/components/RecordSubcontractorPaymentModal.tsx`: نافذة تسجيل وصرف دفعات مقاولي الباطن نقداً أو بتحويل بنكي أو شيك، مع تحديث فوري لكشف الحساب وعقود الإسناد.
  - `frontend/src/features/contracting/components/CreateSubcontractModal.tsx`: ربط أوامر الإسناد الحصري بدليل مقاولي الباطن بدلاً من قائمة الموردين، مع زر إضافة مقاول سريع (+ مقاول جديد) والتحديد التلقائي.
  - `frontend/src/features/contracting/components/ContractingSubcontractsTab.tsx`: أزرار الوصول السريع لدليل المقاولين وصرف الدفعات بأعلى الشاشة، وأزرار سريعة بكل سطر عقد لكشف الحساب والصرف الفوري، مع ضبط توزيع الأعمدة `<colgroup>`.
* **القدرات والوظائف المعتمدة:**
  1. **الفصل المعماري الصارم بين الموردين ومقاولي الباطن (Suppliers vs Subcontractors Isolation):**
     - التمييز الجوهري بين موردي الخامات (مواد، أسمنت، حديد، أجهزة) ومقاولي الباطن (أصحاب الحزم التخصصية والمصنعيات)، وإنشاء سجل مستقل تماماً بمحددات وبيانات متخصصة لمقاولي الباطن.
  2. **دليل وسجل مقاولي الباطن التخصصي (Subcontractors Master Directory):**
     - سجل مركزي يضم التخصص المهني (خرسانات، مباني، لياسة، كهرباء، صحي، عزل، تكييف، دهانات، سيراميك، واجهات، مصاعد)، السجل التجاري، الرقم الضريبي، الحساب البنكي والـ IBAN، التقييم، والحالة.
  3. **كشف الحساب المالي التحليلي اللحظي («ما له وما عليه» - Real-Time Ledger):**
     - كشف حساب تراكمي دقيق يحسب:
       - **ما له (Credits):** مستخلصات الأعمال المعتمدة (IPCs).
       - **ما عليه (Debits):** الدفعات والتحويلات المسددة للمقاول + الخصومات والتحميلات الميدانية (Back-charges).
       - **المبالغ المحتجزة:** ضمان الأعمال المحتجز (Retention Held).
       - **صافي الرصيد المستحق (Net Balance Due):** رصيد لحظي يبين بدقة المتبقي للمقاول أو عليه.
  4. **سجل الحركات والرصيد التراكمي (Chronological Running Balance Ledger):**
     - جدول حركات مالي مرتب زمنياً يعرض نوع الحركة (مستخلص، دفعة مسددة، خصم ميداني)، رقم السند والمستند، المشروع، المدين والدائن، والرصيد التراكمي بعد كل حركة مع فلترة متقدمة بالمشروع والتاريخ وزر طباعة مخصص.
  5. **سندات صرف ودفعات مقاولي الباطن (Subcontractor Disbursements Engine):**
     - نافذة متكاملة لتسجيل صرف الدفعات نقدياً أو عبر تحويل بنكي أو شيك مع توثيق رقم الحوالة/الشيك وتاريخ الاستحقاق والخصم المباشر من مستحقات المقاول وتحديث كشف الحساب لحظياً.
  6. **التوليد التسلسلي الموحد لسندات الصرف (`SPAY-YYMMDD-XXXX`):**
     - التزام تام بدستور الترقيم الموحد لجميع سندات الصرف الصادرة من المنظومة.
  7. **تكامل الإسناد الفوري (+ مقاول جديد داخل نافذة الإسناد):**
     - إمكانية إنشاء مقاول باطن جديد مباشرة من داخل شاشة إسناد الأعمال واختياره تلقائياً دون الحاجة لمغادرة الشاشة أو فقدان البيانات المدخلة.

---


<!-- migrated:cap-183:end -->

<a id="cap-186"></a>
<!-- migrated:cap-186:start -->
## 154. موديول اللوجستيات وحركات المناديب والأسطول والشحن ودستور الترقيم الموحد (Phase 8: Logistics, Fleet & Maritime Invariants & Universal Document Numbering)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Phase 8 Production-Ready & Invariant-Audited).
* **المعايير الهندسية والتشغيلية المعتمدة:** Rule 10 Universal Document Numbering (`PREFIX-YYMMDD-XXXX`) / Rule 13 Financial & Operational Audit Protocol / Pessimistic Row Locking (`forUpdate`) / Race-Condition Prevention (Pattern F1) / Atomic Numbering via Returning Identity (Pattern F6) / Single Source of Truth / 0 Emojis Policy.
* **المسارات في الكود:**
  - `backend/src/modules/delivery-reps/delivery-reps.service.ts`:
    1. تحصين دالة تسوية أوردرات المناديب `settleOrder` بنقل استعلام الفاتورة لداخل المعاملة `this.db.transaction()` مع فرض قفل تشاؤمي `forUpdate()`، مما يقضي جذرياً على خطر التسوية المزدوجة المتزامنة وحركات الخزينة والقيود المحاسبية المضاعفة (Pattern F1).
    2. تحصين دالة تسليم المندوب الميدانية `driverSettleOrder` وتغليفها بمعاملة ذرية وقفل تشاؤمي لمنع التكرار المتزامن عند النقر المتكرر.
  - `backend/src/modules/delivery-reps/van-sales.service.ts`:
    1. توحيد وإلزام معيار الترقيم الموحد للوثائق `formatDailyDocumentNumber` لجميع حركات مبيعات سيارات التوزيع:
       - فواتير البيع الميداني: `VAN-YYMMDD-XXXX`.
       - سندات التحصيل النقدي الميداني: `COL-YYMMDD-XXXX`.
       - أذونات مرتجعات العملاء الميدانية: `RET-YYMMDD-XXXX`.
    2. القضاء على نمط الترقيم العشوائي بـ `Date.now().slice(-6)` وربط أرقام الوثائق بالمعرف الذاتي الحقيقي في جدول المبيعات والمدفوعات والأستاذ المساعد.
  - `backend/src/modules/maritime-freight/maritime-freight.service.ts`:
    1. القضاء التام على ثغرة ترقيم `COUNT(*) + 1` (Open Item O9 / Pattern F6) في كافة عمليات الشحن البحري:
       - طلبات الاستفسار الملاحي: `INQ-YYMMDD-XXXX`.
       - طلبات عروض الأسعار للخطوط: `RFQ-YYMMDD-XXXX`.
       - عروض أسعار العملاء: `QUO-YYMMDD-XXXX`.
       - أوامر تشغيل الشحنات: `JOB-YYMMDD-XXXX`.
    2. اعتماد الترقيم الذري عبر المعاملات وبمعرف السجل الذاتي (`returningAll()`)، والربط المباشر مع مراكز التكلفة المحاسبية بنظام الأبعاد.
  - `backend/src/modules/bosta/bosta.service.ts` & `gcc-shipping/gcc-shipping.service.ts`:
    - التحقق التدقيقي من عزل المستأجرين الصارم `tenant_id` وحساب مبالغ التحصيل COD بدقة (تصفير مبالغ الشحنات المسددة إلكترونياً واعتماد قيمة الفاتورة لطلبات الدفع عند الاستلام).
  - `backend/test/critical/phase8-logistics.spec.ts`:
    - إنشاء جناح اختبارات تدقيقي صارم يغطي 6 سيناريوهات حتمية: الترقيم الموحد لجميع الوثائق، حساب هوامش البيع ومنع البيع السالب، تسوية المناديب وحساب عمولات أسطول المتجر والمناديب المستقلين، وقواعد COD لبوسطة، ومطابقة حركة الأستاذ المساعد لمدفوعات ومردودات العملاء، وحراس حظر التسوية المكررة.
* **فحص الجودة والسلامة البرمجية:**
  - جناح الاختبارات الحاسم `npm run test:critical` (27 جناح اختبار): **اجتياز بنسبة 100% بنجاح تام (Exit code 0)**.

---


<!-- migrated:cap-186:end -->

<a id="cap-191-1"></a>
<!-- migrated:cap-191-1:start -->
### 160. إغلاق فجوات موديول اللوجستيات والشحن البحري مقارنة بـCargoWise/GoFreight (Freight Forwarding Gap-Closing)
* **حالة الإغلاق:** 🟢 فجوتان من أربع أُغلقتا بالكامل (Rate Management + Customs)، وفجوتان مؤجَّلتان بقرار واعٍ (تكامل EDI/AIS حي يحتاج اشتراكات مدفوعة من العميل — O18؛ بوابة حجز ذاتي تحتاج سطح مصادقة جديد — O19).
* **معيار المقارنة الدولي:** CargoWise Rate Management, Customs & Compliance modules — بحث فعلي.
* **الميزات المُنجزة:**
  1. **إدارة التعرفات والعقود (Rate Management):** `backend/src/database/migrations/2040000000122_maritime_rate_cards.ts` (+ إصلاح تفرد في `2040000000123`) — جدول `maritime_rate_cards` بالناقل/المسار/الحاوية/الصلاحية. خدمات `listRateCards`, `findBestRate` (أرخص تعرفة سارية فورية)، `createRateCard`, `createRateCardFromBid` (تحويل عرض RFQ فائز لتعرفة قابلة لإعادة الاستخدام)، `updateRateCardStatus`, `deleteRateCard` في `maritime-freight.service.ts`. واجهة: `RateCardsModal.tsx` مربوطة بزر "تعرفات وعقود الأسعار" في صفحة RFQ.
  2. **البيانات الجمركية وأكواد HS (Customs Declarations):** `backend/src/database/migrations/2040000000124_maritime_customs_declarations.ts` — جدولا `maritime_customs_declarations` → `maritime_customs_declaration_items` (كود HS، قيمة جمركية، نسبة/مبلغ رسم محسوب آلياً). خدمات القسم المخصص في `maritime-freight.service.ts`. واجهة: `CustomsDeclarationModal.tsx` مربوطة بكارت "البيان الجمركي" في تبويب المستندات بـ`JobDetailsModal.tsx`. **نطاق متعمَّد:** تسجيل داخلي فقط، لا تقديم حي لبوابة جمركية حكومية (O18).
* **درس مُستخلص:** فهرس تفرد خاطئ في الهجرة الأولى (كان يمنع ناقلين مختلفين من تسعير نفس المسار في نفس اليوم) اكتُشف بسكربت SQL فعلي فور الهجرة وأُصلح بهجرة تصحيحية فورية — راجع `ARCHITECTURE_INVARIANTS.md` القسم 5-ب للتفصيل الكامل.
* **فحص الجودة والسلامة البرمجية:** `npx tsc --noEmit` (Backend + Frontend) نظيف؛ `npm run test:critical` (31 جناح) 100%؛ الهجرات 122-124 نُفِّذتا بنجاح، وتحقَّقت قيود الـSchema (تفرد التعرفة، CHECK على نسبة الرسم والحالات) بسكربتات SQL فعلية.
* **بنود مفتوحة متعمَّدة:** O18 (EDI/AIS حي)، O19 (بوابة حجز ذاتي).

---


<!-- migrated:cap-191-1:end -->

<a id="cap-192"></a>
<!-- migrated:cap-192:start -->
## 161. تكامل الشحن متعدد الوسائط (بحري / جوي / بري) في واجهات الفرونت إند (Multimodal Freight UI Integration)
* **حالة الموديول العامة:** 🟢 مكتمل ومربوط 100% (Production Ready).
* **المعايير الهندسية والتشغيلية المعتمدة:** IATA Standard Air Freight Formula / 0 Emojis Policy (اعتماد `AppIcons.Plane`, `AppIcons.Ship`, `AppIcons.Truck`) / Universal 1280px Layout / Zero Width-Jumping Standard.
* **المسارات والملفات المنفذة:**
  - `frontend/src/features/maritime-freight/maritime-freight.types.ts`:
    - إضافة حقول الشحن الجوي والبري والوسائط المتعددة لواجهة `MaritimeInquiry`: نمط النقل (`transport_mode: 'sea' | 'air' | 'road' | 'multimodal'`)، تصنيف البضاعة الجوية (`air_cargo_type`)، الوزن الحجمي (`volumetric_weight_kg`)، الوزن الخاضع للرسوم (`chargeable_weight_kg`)، عدد الطرود (`package_count`)، رقم الرحلة وتاريخها، وبوالص الشحن الجوي (`mawb_number`, `hawb_number`).
  - `frontend/src/features/maritime-freight/components/CreateInquiryModal.tsx`:
    - شريط اختيار وسيلة الشحن التفاعلي (بحري / جوي / بري) بأيقونات تشغيلية نظيفة.
    - تحويل ديناميكي لحقول الإدخال عند اختيار الشحن الجوي: مطارات الشحن الدولية (CAI, DXB, JED, FRA...)، شروط تسليم FCA، وتصنيف البضائع الجوية (عامة، سريعة التلف، خطرة DG، أدوية، قيّمة)، مع حساب فوري لمعادلة IATA الدولية للوزن الحجمي ($1\text{ CBM} = 166.67\text{ kg}$) وتحديد الوزن الخاضع للرسوم ($\max(\text{gross}, \text{volumetric})$).
    - تحويل ديناميكي للشحن البري: موانئ ومحطات برية، شروط تسليم CPT، أنواع الشاحنات، ونمط النقل FTL/LTL.
  - `frontend/src/features/maritime-freight/components/MaritimeInquiriesTab.tsx`:
    - إضافة فلتر وسيلة الشحن في شريط التصفية (`الكل` / `بحري` / `جوي` / `بري`).
    - شارات وسيلة النقل بجانب كود الاستفسار، وتحديث عمود البضاعة ليعرض للطرود والأوزان المحتسبة في الجوي والبري بدلاً من اقتصاره على الحاويات.
  - `frontend/src/features/maritime-freight/components/MaritimeMasterDataTab.tsx`:
    - إضافة تبويبين فرعيين مستقلين: شركات الطيران للشحن (Airlines) ومطارات الشحن الدولية (Cargo Airports).
    - جداول متكاملة لعرض شركات الطيران مع بادئات بوالص الشحن الجوي (AWB Prefix)، وبريد طلبات التسعير والحجز، وبيانات التواصل، وجداول المطارات بأكواد IATA / ICAO.
    - أزرار إضافة سريعة وتحديث تصدير ملفات الـ CSV للنواقل الجوية والمطارات.
  - `frontend/src/features/maritime-freight/components/MaritimeJobsTab.tsx`:
    - إضافة فلاتر وسيلة الشحن وشارات الوسيلة بجانب كود العملية، وعرض رقم الرحلة وبوليصة الشحن الجوي AWB والوزن المحتسب للشحنات الجوية.
  - `frontend/src/features/maritime-freight/components/MaritimeQuotationsTab.tsx`:
    - إضافة شارة وسيلة الشحن بجانب رقم عرض السعر، وتخصيص نص المشاركة عبر واتساب وفق نوع الشحن (الجوي / البحري / البري).
  - `frontend/src/features/maritime-freight/pages/MaritimeLayout.tsx`:
    - تحديث مسمى التبويب الرئيسي إلى "دليل النواقل والموانئ والمطارات" وتحديث وصف الموديول للشحن متعدد الوسائط.
* **فحص الجودة والسلامة البرمجية:**
  - فحص الـ TypeScript المكتبي: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit` — اجتياز نظيف بنسبة 100% بدون أي أخطاء تجميعية (`Exit code 0`).

---


<!-- migrated:cap-192:end -->

<a id="cap-236"></a>
<!-- migrated:cap-236:start -->
## Maritime Freight & Multimodal Logistics Complete Architectural Closure (6 October 2026)

- **Complete Standalone Views & Dashboards Delivered:**
  - `MaritimeFreightDashboard.tsx`: Executive Multimodal Dashboard with responsive 2-column KPI and analytical cards (revenue vs direct carrier cost breakdown, net profit margin %, multimodal mode distribution [Sea FCL/LCL vs Air Cargo vs Road CMR], top carrier spend ranking, and pipeline flow funnel).
  - `DemurrageRadarTab.tsx` & `MaritimeRadarPage.tsx`: Dedicated operations command center for Demurrage & Detention Radar tracking. Visual countdown gauges, overdue fine rate accumulation, container deposit tracking, and direct WhatsApp alerts to customers.
  - `FreightAuditTab.tsx` & `MaritimeAuditPage.tsx`: Company-wide Carrier Freight Audit Center. Enables financial auditors to review all carrier invoices across all shipment jobs in a single unified interface with rate-card reconciliation, Maker-Checker override governance, and carrier dispute note generation.
- **Backend API & Service Enhancements:**
  - Added `listAllCarrierInvoices` in `maritime-freight.service.ts` and `GET /api/maritime-freight/carrier-invoices` in `maritime-freight.controller.ts` with tenant isolation, status filtering (`overcharge`, `matched`, `disputed`, `approved_override`, `undercharge`), and company-wide summary KPIs.
  - Linked new views into `MaritimeLayout.tsx`, `MaritimeWorkspacePage.tsx`, `routes.tsx`, and `index.ts`.
- **Status:** 100% Production Ready and fully wired across both backend and frontend.


<!-- migrated:cap-236:end -->

<a id="cap-237"></a>
<!-- migrated:cap-237:start -->
## B2B Customer Self-Service Freight Portal - بوابة الخدمة الذاتية لعملاء الشحن (7 October 2026)

- **حالة الوحدة العامة:** 🟢 مكتمل 100% ومفعل بالكامل (End-to-End B2B Customer Self-Service Freight Portal).
- **مسارات الكود الأساسية:**
  - الباك إند: `backend/src/modules/maritime-freight/maritime-customer-portal.controller.ts`, `backend/src/modules/maritime-freight/maritime-customer-portal.service.ts`
  - قاعدة البيانات: `backend/src/database/migrations/2040000000201_maritime_customer_portal.ts`, `backend/src/database/database.types.ts`
  - الفرونت إند: `frontend/src/features/maritime-freight/pages/MaritimeCustomerPortalPage.tsx`, `frontend/src/features/maritime-freight/api/maritime-freight.api.ts`, `frontend/src/app/router/root-router.tsx`, `frontend/src/features/maritime-freight/routes.tsx`
- **القدرات التشغيلية والميزات المنفذة:**
  1. **المصادقة والأمان متعدد المستأجرين (Multi-Tenant Secure Customer Auth):**
     - تسجيل دخول العميل برقم الهاتف المسجل والرمز السري (PIN) أو عبر رابط وصول سحري مباشر (`/freight-portal?token=...`).
     - توقيع وإصدار رموز الجلسة عبر `signPortalToken` و `verifyPortalToken` المعززة بخوارزمية HMAC و `timingSafeEqual` و `LoginAttemptLimiter` للحماية من هجمات التخمين.
     - عزل صارم للبيانات بحسب `tenant_id` و `customer_id` دون أي تسريب بيانات بين العملاء.
  2. **لوحة المؤشرات ونظرة عامة على الحساب (Executive Customer KPIs Dashboard):**
     - بطاقات مؤشرات حية: الشحنات الجارية، عروض الأسعار قيد المراجعة، الشحنات المكتملة بالأرشيف، الرصيد المستحق (المديونية)، والحد الائتماني المتاح.
  3. **التتبع اللحظي للشحنات والرادار (Live Radar & Shipment Tracking):**
     - عرض كافة شحنات العميل (بحري، جوي، بري) مع جهة الشحن (POL) وجهة الوصول (POD)، اسم الخط الملاحي، السفينة، والرحلة.
     - رادار فترات السماح (Free Time & Demurrage Indicator): احتساب وتنبيه بأيام السماح المتبقية ومؤشرات الغرامات تلقائياً.
     - مراحل التتبع الموحدة DCSA Milestones (تأكيد الحجز، دخول الميناء، التحميل، الإبحار، وصول الميناء، التسليم).
     - تفاصيل الحاويات، الأوزان الإجمالية، الحجم CBM، ورقم التسجيل المسبق للشحنات المصرية (ACID).
  4. **طلب تسعير شحنة جديدة إلكترونياً (Online Freight Booking / RFQ):**
     - نموذج طلب تسعير متكامل: وسيلة النقل (بحري FCL/LCL، جوي، بري)، نوع الحاوية والكميات بعدادات RTL القياسية ([+] يميناً و [-] يساراً)، الشروط التجارية (Incoterms)، ومواصفات البضاعة.
     - توليد تسلسلي موحد لرقم الطلب بصيغة `INQ-YYMMDD-XXXX` متوافق مع دستور الترقيم الموحد.
  5. **استعراض واعتماد عروض الأسعار إلكترونياً (Quotations & Instant Approval):**
     - استعراض عروض الأسعار مع تفصيل كامل للرسوم والنولون والخدمات المحلية.
     - زر **"اعتماد وتعميد العرض (Approve & Book)"** الفوري مع تسجيل أمر الشراء (PO)، ملاحظات الاعتماد، البصمة الزمنية، وعنوان IP.
     - التحويل الآلي الفوري لعرض السعر المعتمد إلى أمر تشغيل شحن رسمي (`maritime_jobs`) وربطه بالشحنات الجارية.
  6. **مركز المستندات والبوالص والطباعة الرسمية (Digital Document Center):**
     - تحميل وطباعة فورية للمستندات الرسمية بصيغة PDF مع باركود التتبع QR:
       - بوليصة الشحن البحري (House Bill of Lading - HBL) وفق معايير FIATA.
       - بوليصة الشحن الجوي (Air Waybill - AWB).
       - إذن التسليم الملاحي الجمركي (Delivery Order - D/O).
       - إخطار وصول الشحنة وبدء فترات السماح (Arrival Notice - A/N).
       - فاتورة ومطالبة رسوم الشحن (Freight Billing Invoice).
  7. **كشف الحساب والمديونيات (Statement of Account & Ledgers):**
     - كشف حساب مالي تفصيلي بالرصيد الحالي، الحد الائتماني، وفواتير ومطالبات الشحن المسجلة مع إمكانية الطباعة المباشرة.






<!-- migrated:cap-237:end -->

<a id="cap-238"></a>
<!-- migrated:cap-238:start -->
## 162. التدقيق التشغيلي الشامل والاختبار الآلي لدورة الشحن البحري الدولي (End-to-End Sea Freight Verification & Hardening - 7 October 2026)

- **حالة الموديول:** 🟢 مكتمل ومختبر آلياً 100% من البداية للنهاية عبر 10 مراحل تشغيلية كاملة (`Exit code 0`).
- **جناح الاختبار الآلي المرجعي:** `backend/test/test-sea-freight-full-lifecycle.ts`
- **المعالجات والتحصينات الهندسية المنفذة:**
  1. **حل أزمة مزامنة التابات وتحديث القوائم الحية (Tab Sync & Keep-Alive):**
     - تم إصلاح سبب ظهور "1 طلب" في عداد الهيدر بينما الجدول فارغ في شاشة `maritime/inquiries`.
     - السبب: معمارية Keep-Alive تمنع الـ Unmount للمكونات، وكان زر الإضافة في الهيدر يستدعي `refreshCounts()` فقط دون زيادة العداد التفاعلي `refreshKey`، مما يبقي حالة الصفحة على مصفوفة فارغة `[]`.
     - الإصلاح: تم تحديث `MaritimeContext.tsx` ليقوم برفع `refreshKey` تلقائياً مع كل تحديث للعدادات، وتحديث `MaritimeLayout.tsx` لربط الإضافة بـ `refreshAll()`.
  2. **منع فقدان البيانات عند تحويل الاستفسار لمناقصة (Inquiry-to-RFQ Forwarding):**
     - تم إصلاح دالة `convertInquiryToRfq` في `maritime-freight.service.ts` بتمرير كافة الخصائص التشغيلية المتعددة الوسائط: `transportMode`، `airCargoType`، `grossWeightKg`، `volumetricWeightKg`، `chargeableWeightKg`، `totalCbm`، `packageCount`، `flightNumber`، `flightDate`.
  3. **تحصين وتطهير قارئ إيميلات عروض الخطوط الملاحية (Carrier Email AI Parser Regex Hardening):**
     - تم حل ثغرة التصادم بين تواريخ أرقام الوثائق (مثل `RFQ-261007-0010`) وأسعار الشحن البحري، حيث كان القارئ يستخرج `261007` كنولون شحن بحري بالخطأ.
     - تم تطهير النص من كافة أرقام الوثائق الرسمية (`RFQ`, `INQ`, `QUO`, `JOB`, `MSK`, `BKG`) قبل تطبيق مطابقة الأسعار، وإحكام أنماط مطابقة النولون (`BAS`, `O/F`, `ocean freight`).
  4. **صمود ومرونة إرسال الإيميلات في البيئات التجريبية (SMTP Sandbox Resilience):**
     - تم إضافة نظام معالجة ذكي في `dispatchRfqEmails` يلتقط أخطاء مزودي البريد الخارجيين في بيئات الاختبار غير الإنتاجية ويسجل الإرسال كمحاكاة موثقة (`simulated dispatch`) بدلاً من إيقاف دورة العمل بخطأ 500.
  5. **استكمال حقول نموذج عروض الخطوط (Carrier Bid Entry Modal):**
     - تم ربط حقل عوائد التفريغ بميناء الوصول `thcDestination` في الواجهة عند فك شفرة الإيميل.
- **تفاصيل المراحل الـ 10 المختبرة بنجاح:**
  1. **تسجيل استفسار بحري:** إنشاء `INQ-261007-0008` (حاويتان 40HC من ميناء شنغهاي إلى الإسكندرية).
  2. **التحويل لمناقصة RFQ:** إنشاء `RFQ-261007-0012` وتوجيهه لـ 3 خطوط ملاحية (MSC, Maersk, CMA CGM).
  3. **بث المناقصة:** إرسال إيميلات المناقصة للخطوط الثلاثة وتوثيق الإرسال.
  4. **استقبال وفك شفرة العروض:** فك شفرة رد MSC ($2,450 نولون، $180 عوائد شحن، $260 عوائد وصول، 14 يوم سماح) وتسجيل عرض منافس من Maersk ($3,000 إجمالي، 21 يوم سماح).
  5. **المقارنة والترسية:** مقارنة العروض في المصفوفة وترسية المناقصة على عرض MSC الأقل تكلفة.
  6. **تسعير العميل:** إصدار عرض سعر العميل `QUO-261007-0005` بهامش ربح $500 وسعر صرف 48.5 ج.م/$ (إجمالي $6,280 = 304,580 ج.م).
  7. **التحويل لأمر تشغيل وتخصيص الحاويات:** إنشاء `JOB-261007-0002`، فتح مركز تكلفة محاسبي تحليلي تلقائياً `[JOB-261007-0002]`، وتخصيص الحاويات `MSKU2039803` و `MSKU3939898`.
  8. **مراحل التتبع DCSA:** تسجيل واختبار كافة معالم التتبع التسعة (الحجز، دخول الميناء، التحميل، الإبحار، الوصول، التفريغ، الإفراج الجمركي، الخروج، والتسليم).
  9. **رادار الغرامات وتأمين الحاويات:** فحص رادار فترات السماح وإثبات إعادة الحاويات واسترداد التأمين للخزينة (`refunded_to_treasury`).
  10. **إصدار إذن التسليم وإغلاق الشحنة:** إصدار إذن التسليم الملاحي الجمركي (D/O) بنجاح وإغلاق وأرشفة الشحنة بالكامل.



<!-- migrated:cap-238:end -->

<a id="cap-240"></a>
<!-- migrated:cap-240:start -->
## 164. منظومة الشحن الجوي الدولي ومطابقة معايير إياتا (International Air Freight, IATA Resolution 502 & Cargo iQ Standards - 8 October 2026)

- **حالة الموديول:** 🟢 مكتمل بنسبة 100% ومختبر آلياً برحلة تشغيلية حقيقية كاملة.
- **معيار الامتثال الدولي:**
  - معيار الاتحاد الدولي للنقل الجوي **IATA Resolution 502** لحساب الوزن الحجمي والوزن الخاضع للرسوم (Volumetric Ratio 1:6000 cm³/kg / 1 CBM = 166.67 kg).
  - خوارزمية التحقق الرسمية لبوالص الشحن الجوي **IATA Modulo-7 Check Digit Rule** (IATA Resolution 600a - الصيغة القياسية: `PPP-SSSS SSSC`).
  - معايير تتبع الشحنات الجوية لمبادرة **Cargo iQ** التابعة لمنظمة IATA عبر محطات المسار المعتمدة (`BKD`, `RCS`, `MAN`, `DEP`, `ARR`, `RCF`, `CUST`, `NFD`, `AWD`, `DLV`).
- **الملفات والمحركات الأساسية:**
  - المحرك الحسابي البحت: `backend/src/modules/maritime-freight/engines/air-freight.engine.ts`.
  - خدمة العمليات واللوجستيات: `backend/src/modules/maritime-freight/maritime-freight.service.ts`.
  - المتحكم والمسارات: `backend/src/modules/maritime-freight/maritime-freight.controller.ts`.
  - تعريفات الأنواع في الباك والفرونت: `backend/src/modules/maritime-freight/maritime-freight.types.ts` و `frontend/src/features/maritime-freight/maritime-freight.types.ts`.
  - جناح الاختبار الآلي الحاكم: `backend/test/test-air-freight-full-lifecycle.ts` (11 مرحلة ناجحة 100% - Exit code 0).
- **المعالجات والتحصينات الهندسية المنفذة:**
  1. **توصيل المحرك الحسابي البحت لمنظومة الشحن الجوي (Wired Air Freight Calculation Engine):**
     - تم ربط دوال `calculateAirChargeableWeight` و `calculateAirFreightCost` و `validateIataAwbNumber` مباشرة في مسارات الخدمة: `createInquiry` و `createRfq` و `createQuotation` و `createJob` و `updateJob`.
     - الاستنتاج التلقائي للوزن الخاضع للرسوم (Chargeable Weight) وفق معيار إياتا: في حال إدخال الوزن الإجمالي بالأطنان أو الكيلوغرام والحجم بالمتر المكعب CBM دون تحديد الوزن الخاضع للرسوم، يقوم النظام آلياً بحساب الوزن الحجمي بدقة ومقارنته بالوزن الفعلي وتطبيق قاعدة التقريب الصاعد لأقرب نصف كيلوغرام (0.5 kg).
  2. **دستور خلو الشحنات الجوية من الحاويات البحرية (Zero Ocean Containers Invariant - MARITIME-INV-13):**
     - تم القضاء نهائياً على ثغرة توليد حاويات بحرية وهمية (`MSKU...` / 40HC مع تأمين 5000 ج.م) عند تحويل عروض أسعار الشحن الجوي إلى أوامر تشغيل في `autoConvertQuotationToJob`.
     - الشحنات الجوية أصبحت تنشأ بدقة مع مصفوفة حاويات فارغة بالكامل (`containers: []`) لتعقب الطرود والأوزان والرحلات فقط، مما يمنع تشغيل رادار غرامات الأرضيات البحرية أو حجز تأمينات غير حقيقية.
  3. **بوابة التحقق الصارمة من بوالص الشحن الجوي إياتا مودولو 7 (IATA Modulo-7 Gate - MARITIME-INV-14):**
     - فحص رقم بوليصة الشحن الجوي الماستر (MAWB) والتأكد من مطابقة خانة التحقق: `serialNumber % 7 === checkDigit`.
     - حظر الأرقام غير المطابقة مع رمي استثناء رسمي `400 Bad Request` باللغة العربية يوضح الرقم المتوقع والرقم المسجل.
     - التنسيق القياسي التلقائي للبوليصة بالصيغة الدولية المعتمدة: `077-1234 5675`.
  4. **مواءمة مراحل التتبع مع مبادرة Cargo iQ (Cargo iQ Milestones Parity):**
     - تم إدراج معالم Cargo iQ باللغتين العربية والإنجليزية في دوال التتبع `addJobMilestone` و `getMilestoneWhatsAppMessage` بدلاً من الاقتصار على معالم DCSA البحرية.
     - تحديد المعلم الأولي للشحنة الجوية فور فتح أمر التشغيل كـ `BKD` (Air Cargo Booking Confirmed).
  5. **إصدار إذن التسليم الجوي (Air Cargo Delivery Order Release):**
     - تم تعديل `releaseDeliveryOrder` لتميز تلقائياً بين الشحنات البحرية والجوية: في الشحن الجوي يتم تسجيل المعلم `AWD` ("تسليم إذن التسليم والمستندات - Documents Delivered") بدلاً من خروج الحاوية من بوابة الميناء `GTO`.
  6. **رسائل تنبيهات الواتساب متعددة الوسائط (Multimodal WhatsApp Alerts):**
     - صياغة نصوص التنبيهات لتخاطب العميل بمفردات الشحن الجوي ("شحنتكم الجوية"، رقم الرحلة الجوية، مطار الشحن، قرية البضائع، ومطار الوصول).
- **تفاصيل المراحل الـ 11 المختبرة بنجاح في الجناح الآلي:**
  1. **البيانات المرجعية:** التحقق من وجود مصر للطيران للشحن الجوي (كود MS وبادئة 077)، طيران الإمارات (كود EK وبادئة 176)، مطار القاهرة الدولي CAI، ومطار دبي الدولي DXB.
  2. **المحرك الحسابي:** التحقق من حساب 500 كجم و4 م3 ينتج 667 كجم كوزن خاضع للرسوم، وحساب النولون الإجمالي مع إضافي الوقود FSC والتأمين SSC ومصاريف البوليصة.
  3. **استفسار شحن جوي:** إنشاء الاستفسار `INQ-261008-0010` (مطار القاهرة إلى مطار دبي - 15 طرد أجهزة طبية).
  4. **مناقصة شركات الطيران:** إنشاء المناقصة `RFQ-261008-0014` وتوجيهها لشركتي مصر للطيران والإمارات.
  5. **عروض شركات الطيران:** تقديم عرض مصر للطيران ($2,084.35 شامل كافة الإضافيات) وعرض الإمارات ($2,317.60).
  6. **الترسية:** ترسية المناقصة على مصر للطيران في مصفوفة المقارنة.
  7. **تسعير العميل:** إصدار عرض السعر `QUO-261008-0007` بهامش ربح $500 وسعر صرف 48.5 ج.م/$ (إجمالي $2,584.35).
  8. **التحويل لأمر تشغيل جوي:** إنشاء `JOB-261008-0005`، إثبات 0 حاويات بحرية، وفتح مركز تكلفة تحليلي تلقائياً `[JOB-261008-0005]`.
  9. **حجز الرحلة والتحقق من البوليصة:** حجب البوليصة الخاطئة `077-12345674` وقبول وتنسيق البوليصة الصحيحة `077-1234 5675` على الرحلة `MS-801`.
  10. **مسار مراحل Cargo iQ:** تتبع المراحل `RCS` (استلام قرية البضائع) ➔ `MAN` (مانيفست الرحلة) ➔ `DEP` (إقلاع الرحلة) ➔ `ARR` (وصول الرحلة) ➔ `RCF` (تفريغ البضائع) ➔ `CUST` (الإفراج الجمركي) ➔ `NFD` (إشعار المستلم).
  11. **إذن التسليم وإغلاق العملية:** إصدار إذن التسليم الجوي `AWD` وإثبات التسليم النهائي `DLV` وإغلاق الشحنة بنجاح 100%.



<!-- migrated:cap-240:end -->

<a id="cap-241"></a>
<!-- migrated:cap-241:start -->
## 165. منظومة الشحن البري والنقل الداخلي والموانئ الجافة (Road Freight, Inland Trucking & Dry Ports Architecture - 8 October 2026)

- **حالة الموديول:** 🟢 مكتمل بنسبة 100% ومختبر آلياً برحلة تشغيلية حقيقية كاملة.
- **معيار الامتثال التشغيلي والدولي:**
  - معيار النقل البري الدولي للبضائع **CMR Convention** واتفاقية النقل البري بالترانزيت الدولي **TIR CarNet**.
  - محرك متعدد القيود لمطابقة سعات الشاحنات والمقطورات وتحديد عدد السيارات المطلوب وفق الوزن والحجم وعدد الطبليات القياسية (120x80 سم Euro Pallets).
  - معايير مراحل دورة النقل البري المعتمدة: (`TRK_ASSIGN`, `TRK_GATE_IN`, `TRK_LOADED`, `TRK_DISPATCH`, `TRK_BORDER`, `TRK_ARRIVED`, `TRK_UNLOADED`, `TRK_POD`).
  - معيار الموانئ الجافة والمناطق اللوجستية والمستودعات المركزية (6th of October Dry Port ODPO, 10th of Ramadan Logistics Terminal).
- **الملفات والمحركات الأساسية:**
  - المحرك الحسابي البحت: `backend/src/modules/maritime-freight/engines/road-freight.engine.ts`.
  - جناح الاختبارات الحسابية للمحرك: `backend/src/modules/maritime-freight/engines/road-freight.engine.spec.ts` (10 سيناريوهات ناجحة 100% - Exit code 0).
  - خدمة العمليات واللوجستيات: `backend/src/modules/maritime-freight/maritime-freight.service.ts`.
  - البيانات المرجعية المسبقة: `backend/src/modules/maritime-freight/maritime-defaults.data.ts` (شركات النقل البري: النيل للنقل البري، الخليج للنقل الدولي، الدلتا لأسطول النقل الثقيل، والموانئ الجافة).
  - تعريفات الأنواع في الباك والفرونت: `backend/src/modules/maritime-freight/maritime-freight.types.ts`.
  - جناح الاختبار الآلي الحاكم للدورة التشغيلية الكاملة: `backend/test/test-road-freight-full-lifecycle.ts` (11 مرحلة ناجحة 100% - Exit code 0).
- **المعالجات والتحصينات الهندسية المنفذة:**
  1. **المحرك الحسابي البحت للنقل البري (Pure Road Freight Engine):**
     - بناء المحرك `road-freight.engine.ts` بمواصفات الشاحنات القياسية: التريلا المسطحة/الفرش (Flatbed 28T / 33 pallets)، التريلا الستارة/الطربال (Curtainsider 26T / 86 CBM / 34 pallets)، الشاحنة المقفلة (Box 25T / 82 CBM)، الشاحنة المبردة (Reefer 22T / 76 CBM)، اللوبد للحمولات الثقيلة (Lowbed 50T)، سيارات الجامبو (Jumbo 6.5T)، وسيارات البيك أب (Pickup 1.8T).
     - دالة حل القيود المتعددة `calculateTrucksRequired`: حساب عدد الشاحنات اللازمة للشحنة بالمفاضلة بين سقف الوزن، الحجم بالمتر المكعب، وعدد الطبليات المتجاورة (`Math.max(byWeight, byVolume, byPallets)`) مع استخراج نسبة الإشغال الفعلية والسبب الحاكم للزيادة (`limitingFactor: 'weight' | 'volume' | 'pallets'`).
     - دالة حساب تكلفة النولون البري `calculateRoadFreightCost`: دعم التسعير بالرحلة/المشوار (`per_trip`)، بالطن (`per_ton`)، أو بالكيلومتر (`per_km`) مع تفنيد دقيق لبنود غرامات المبيت والانتظار (Detention Daily Rates)، كارتات وموازين الطرق، رسوم العبور الجمركي والمنافذ البرية، ومصاريف الحراسة وتصاريح الأوزان الشاذة.
     - دالة فحص وتنسيق بوالص الشحن البري `validateCmrWaybillNumber` والتحقق من التنسيق الدولي والمحلي.
  2. **دستور خلو الشحنات البرية من الحاويات البحرية (Zero Ocean Containers Invariant - MARITIME-INV-18):**
     - تم حصر توليد الحاويات البحرية (`MSKU...`) في `autoConvertQuotationToJob` حصرياً على الشحن البحري (`if (transportMode === 'sea')`).
     - الشحنات البرية أصبحت تنشأ بصفر حاويات بحرية (`containers: []`) لمنع أي تسريب لأرقام خطوط ملاحية وهمية أو حجز تأمينات حاويات غير حقيقية أو استدعاء رادار الغرامات البحرية.
  3. **ترقيم رحلات النقل البري المقاوم للتصادم (Collision-Proof Sequence Numbering - MARITIME-INV-20):**
     - تم إصلاح دالة `createInlandTruckingTrip` واستبدال التوليد العشوائي القديم بآلية الإدراج المؤقت ثم الترقيم التسلسلي اليومي الموحد: `TRIP-YYMMDD-XXXX`.
  4. **المزامنة الحية التلقائية لحالات الرحلات مع معالم أمر التشغيل (Real-Time Trip Status Auto-Progression):**
     - تم ربط تحديث حالة رحلة النقل البري في `updateInlandTruckingTripStatus` بالمعالم التشغيلية لأمر الشحن:
       - حالة `loading` ➔ تسجل تلقائياً المعلم `TRK_LOADED` ("إتمام تحميل وتربيط البضاعة بالشاحنة").
       - حالة `in_transit` ➔ تسجل تلقائياً المعلم `TRK_DISPATCH` ("انطلاق الشاحنة على مسار النقل").
       - حالة `delivered` ➔ تسجل تلقائياً المعلم `TRK_POD` وتحدث حالة الشحنة إلى `TRK_POD`.
  5. **إثراء تفاصيل الشحنة في `getJobById`:**
     - تضمين جدول رحلات النقل البري `truckingTrips` مع بيانات السائق ورقم السيارة والمقطورة وتكلفة الرحلة وقيمتها ضمن الرد الموحد للشحنة، مع إرفاق قاموس معالم الشحن البري `roadFreightDefinitions`.
  6. **إصدار إذن التسليم البري وإثبات الاستلام (Road Freight POD Release):**
     - تم تعديل `releaseDeliveryOrder` لتسجل المعلم `TRK_POD` ("توقيع بوليصة الشحن البري وتأكيد استلام وتسليم البضاعة - Signed Waybill / POD") للشحنات البرية بدلاً من المعلم البحري `GTO`.
  7. **قوالب تنبيهات الواتساب المتخصصة للنقل البري:**
     - دعم كامل لمعالم الشحن البري الثمانية (`TRK_ASSIGN`, `TRK_GATE_IN`, `TRK_LOADED`, `TRK_DISPATCH`, `TRK_BORDER`, `TRK_ARRIVED`, `TRK_UNLOADED`, `TRK_POD`) مع صياغة رسائل موجهة توضح نوع وسيلة النقل البرية ورابط التتبع المباشر.
- **تفاصيل المراحل الـ 11 المختبرة بنجاح في الجناح الآلي (`test-road-freight-full-lifecycle.ts`):**
  1. **البيانات المرجعية:** التحقق من غرس شركات النقل المعتمدة (شركة النيل للنقل البري TRK-NILE، الخليج للنقل الدولي TRK-GULF) والموانئ الجافة (ميناء 6 أكتوبر الجاف EGSOC، العاشر من رمضان اللوجستي EGTRD).
  2. **المحرك الحسابي:** التحقق من حساب 54,000 كجم تتطلب شاحنتين مسطحة 28 طن بنسبة إشغال 96.43%، وحساب النولون الإجمالي مع غرامة المبيت والكارتات والوقود ($15,700 ج.م)، والتحقق من صحة أرقام CMR.
  3. **استفسار شحن بري:** إنشاء الاستفسار `INQ-YYMMDD-XXXX` لنقل 54 طن قطع غيار ومعدات من ميناء 6 أكتوبر الجاف للعاشر من رمضان.
  4. **مناقصة شركات النقل:** إنشاء طلب التسعير `RFQ-YYMMDD-XXXX` وتوجيهه لشركة النيل للنقل البري.
  5. **عرض شركة النقل:** تقديم عرض شركة النيل (شاحنتان تريلا مسطحة بإجمالي 12,000 ج.م).
  6. **ترسية وتسعير العميل:** ترسية العرض وتوليد عرض سعر العميل `QUO-YYMMDD-XXXX` بهامش ربح وربط النمط البري.
  7. **تحويل لأمر تشغيل بري:** إنشاء `JOB-YYMMDD-XXXX`، إثبات صفر حاويات بحرية، بدء المعلم تلقائياً بـ `TRK_ASSIGN`، وفتح مركز تكلفة تحليلي تلقائياً.
  8. **تسيير رحلة النقل البري:** إنشاء الرحلة `TRIP-YYMMDD-XXXX` ببيانات السائق والشاحنة والمقطورة.
  9. **مزامنة الحالات الحية:** تحديث الرحلة إلى `loading` (تسجيل `TRK_LOADED`)، ثم `in_transit` (تسجيل `TRK_DISPATCH`)، ثم `delivered` (تسجيل `TRK_POD`).
  10. **إثراء تفاصيل الشحنة:** التحقق من استرجاع `truckingTrips` و `roadFreightDefinitions` من `getJobById`.
  11. **إذن التسليم والواتساب:** التحقق من تسجيل `TRK_POD` في `releaseDeliveryOrder` وتوليد قوالب الواتساب البرية بنجاح 100%.

---


<!-- migrated:cap-241:end -->

<a id="cap-242"></a>
<!-- migrated:cap-242:start -->
## 43. تكامل روابط التنقل المباشر لمود الشحن واللوجستيات في القائمة الجانبية (Maritime Freight Sidebar Navigation Integration)
- **الحالة:** مكتملة بنسبة 100% ومختبرة آلياً (AppShell & Vertical Scope Unit Tests).
- **التفاصيل التشغيلية:**
  - تم إبراز بندين تشغيليين محوريين كروابط وصول مباشر في السايدبار تحت قسم «الشحن واللوجستيات»:
    1. **مقاصة الوكلاء (SOA) (`maritime-agents`):** مسار `/maritime/agents` لإدارة حسابات ومقاصة الوكلاء الدوليين (Statement of Account) وإشعارات الخصم والإضافة Debit/Credit Notes.
    2. **النقل البري والترحيل (`maritime-trucking`):** مسار `/maritime/trucking` لإدارة رحلات النقل البري وأساطيل الشاحنات وترحيل الحاويات والبضائع بين الموانئ والمستودعات.
  - تم تخصيص أيقونات SVG تشغيلية دقيقة في `iconPathMap` (`maritime-agents`, `maritime-trucking`, `maritime-radar`, `maritime-audit`, `maritime-portal`).
  - تم تحديث مصفوفة الترتيب `maritimeOrder` ومصفوفة المجموعات `sidebarGroups` في `app-shell.tsx` ومصفوفة التنقل `navigation` في `routes.tsx`.
- **الملفات المعدلة:**
  - `frontend/src/features/maritime-freight/routes.tsx`
  - `frontend/src/shared/layout/app-shell.tsx`
- **الاختبارات:**
  - `frontend/src/shared/layout/app-shell.spec.tsx` (4/4 passed).
  - `frontend/src/shared/verticals/vertical-scope.spec.ts` (4/4 passed).

---


<!-- migrated:cap-242:end -->

<a id="cap-247"></a>
<!-- migrated:cap-247:start -->
## 206. تطهير واجهات التدقيق والاشتراكات وإلغاء تكييف الفروع في قطاع الشحن (Maritime Audit & Settings Purification)

- **الحالة:** مكتمل ومعتمد 100% (Completed & Verified).
- **نسبة الإنجاز:** 100%.
- **الوصف التشغيلي:**
  1. **تطهير صفحة التدقيق والمراجعة (`/audit`):**
     - إخفاء تبويب ومكون رادار كشف التلاعب ومنع الخسائر المباشر (`fraudRadar` / `CashierFraudRadarSection`) عن قطاعات الشحن والمقاولات والخدمات لعدم وجود نقاط بيع أو كاشيرات.
     - تصفية قائمة فلاتر نوع النشاط في سجل العمليات لإخفاء الأنشطة غير المعنية (مثل تذاكر صيانة الأجهزة والمحلات) عند تفعيل نمط الشحن أو المقاولات.
  2. **تطهير كبسولات سعة الباقات (`CapacityPills`):**
     - عزل مؤشرات السعة في بطاقات الباقات (`SubscriptionPlansCards`)؛ تظهر الحاويات الشهرية للشحن فقط (`containersPerMonth`)، وتظهر المشاريع للمقاولات فقط (`activeProjects`)، مع حجب الفروع وطرفيات الكاشير عن القطاعات المؤسسية.
  3. **إلغاء التكييف القسري للفروع والمخازن وحجب `settings/reference` للشحن:**
     - تطبيقاً لقاعدة عدم تكييف ما ليس له استخدام في النشاط: تم حظر مسار `settings/reference` في نمط الشحن الملاحي (`vertical === 'maritime'`) وإخفاء تبويب الفروع والمخازن التجزئية؛ حيث تُدار الموانئ والخطوط الملاحية ومحطات الحاويات عبر شاشاتها المخصصة والمستقلة في موديول الشحن (`/maritime/lines` و `/maritime/containers`).
  4. **تسجيل باقات المؤسسات الكبرى والشحن في قاعدة البيانات:**
     - إدراج باقات Band 5 المؤسسية (`BAND5_L1`, `BAND5_L2`, `BAND5_L3`) عبر الهجرة المعتمدة `2040000000202_band5_enterprise_plans.ts` ومطابقة كود الباقة باشتراك المنشأة.
- **الملفات المعدلة:**
  - `backend/src/database/migrations/2040000000202_band5_enterprise_plans.ts`
  - `frontend/src/features/audit/pages/AuditPage.tsx`
  - `frontend/src/features/settings/components/subscription/SubscriptionPlansCards.tsx`
  - `frontend/src/features/settings/pages/SettingsSectionTabs.tsx`
  - `frontend/src/shared/verticals/vertical-scope.ts`

---


<!-- migrated:cap-247:end -->

<a id="cap-292"></a>
<!-- migrated:cap-292:start -->
## 246. جناح الاختبارات العدائية ومحاكاة التخريب الشامل للشحن واللوجستيات وسد الثغرات (Logistics Chaos Monkey & Multimodal Freight Adversarial Hardening Suite - 20 October 2026)
- **الحالة:** مكتملة بنسبة 100% ومطبقة ومحمية في الباك إند مع تغطية كاملة (31 من 31 هجمة محظورة وصمود 100%).
- **التفاصيل التشغيلية:**
  1. **محرك الفحص التخريبي والعدائي الشامل (`backend/test/chaos-logistics-adversarial-sabotage.ts`):**
     - تشغيل بيئات عمل ومستأجرين وهميين معزولين تماماً لاختبار قدرة التحمل ومقاومة التخريب في موديول الشحن واللوجستيات المتعدد (بحري، جوي، بري، مستودعات جمركية، وتأمينات).
     - دمج أمر التشغيل المباشر داخل `package.json` عبر `npm --prefix backend run test:logistics:chaos`.
  2. **تغطية 12 حملة اختراق وتخريب تشغيلي (31 سيناريو عدائي):**
     - **عزل المستأجرين (Tenant Isolation):** منع قراءة أو تعديل الشحنات أو سرقة أرصدة العملاء الدائنة عبر الشركات المستضافة.
     - **النزاهة المالية ومطرقة السحب المزدوج (Double-Spend Hammer):** إطلاق 5 طلبات متزامنة لسحب 500,000 ج.م ضد رصيد ائتماني 150,000 ج.م، تم صده بالقفل التشاؤمي (Pessimistic Row-Locking)، ومنع الفواتير وأسعار الصرف السالبة.
     - **رادار غرامات الحاويات وتأميناتها (Demurrage & Deposits):** منع التواريخ غير المنطقية، وأيام السماح والغرامات السالبة، ومنع إعادة فتح تأمين حاوية تمت تسويته في الخزينة.
     - **التأمين على البضائع (Cargo Insurance):** فرض سقف المطالبات التأمينية ومنع المطالبات السالبة والتكرار.
     - **المستودعات الجمركية (Bonded Warehousing):** حظر الإفراج المزدوج عن نفس إيصال المستودع الجمركي.
     - **رادار تدقيق فواتير الخطوط (Carrier Invoice Freight Audit):** كشف وحظر فواتير النواقل المغالى فيها (+200% انحراف) وتضارب العملات.
     - **الشحن الجوي وبوالص IATA:** التحقق الرياضي الإلزامي من خانة التحقق Modulo-7 لبوالص الطيران ومنع الأبعاد السالبة.
     - **الشحن البري (Road Freight):** حل قيود التحميل الفيزيائي ومنع التحميل الزائد على أسطول الشاحنات والتحقق من صيغة بوليصة CMR.
     - **الأمان وحقن الشيفرات (SQL Injection & XSS):** صد هجمات SQL Injection وXSS والمدخلات النصية الضخمة (25,000 حرف).
     - **دستور الترقيم الموحد:** مطابقة أرقام الشحنات لصيغة `PREFIX-YYMMDD-XXXX`.
  3. **سد وترقيع 3 ثغرات حقيقية تم كشفها أثناء التدقيق:**
     - **القفل الذري لتحويل عروض الأسعار (Atomic CAS Quotation Lock):** استبدال التحويل العادي بتحديث ذري `UPDATE maritime_quotations SET status = 'converted_to_job' WHERE id = :id AND status != 'converted_to_job' RETURNING *` لمنع تكرار إنشاء أوامر التشغيل عند النقر المتزامن المزدوج.
     - **حظر مبالغ عروض أسعار النواقل السالبة (Negative Freight Bids Guard):** حظر أي قيم سالبة في نولون البحر أو الجو أو البر أو الرسوم الأرضية في `submitBid`.
     - **منع تكرار تحويل الاستفسارات (Inquiry Replay Guard):** حظر تحويل الاستفسار إلى مناقصة RFQ أكثر من مرة في `convertInquiryToRfq`.
- **الملفات المنفذة والمعدلة:**
  - `backend/test/chaos-logistics-adversarial-sabotage.ts`
  - `backend/src/modules/maritime-freight/maritime-freight.service.ts`
  - `backend/package.json`




<!-- migrated:cap-292:end -->
