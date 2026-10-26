# قدرات المحاسبة والخزينة والقيود

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **المحاسبة والخزينة والقيود** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/accounting/`، `backend/src/modules/cash-drawer/`، `backend/src/modules/treasury/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [المخزون والمستودعات](INVENTORY_CAPABILITIES.md) · [المبيعات ونقاط البيع](SALES_CAPABILITIES.md) · [المشتريات والموردون](PURCHASES_CAPABILITIES.md) · [المرتجعات](RETURNS_CAPABILITIES.md) · [العملاء والتحصيل والولاء](PARTNERS_CAPABILITIES.md) · [الضرائب والتكامل الضريبي](TAX_CAPABILITIES.md)

## التحديثات الحالية

### Foundation P1 — 26 October 2026 (verification pending)
The shared accounting posting adapter now books inventory-adjustment, damaged-stock and food-waste values in authenticated tenant base-currency digits rather than hardcoded cents, with damage posting matching its durable physical `total_cost`. Its line aggregation now accepts the same tenant precision in those paths; edited sales and source-preserving sale/purchase reversal drafts now retain KWD/OMR 0.001 rather than dropping debit/credit lines. The KWD 0.001 source-to-double-entry ledger regression is in `backend/test/acceptance/core-accounting.postgres.spec.ts`; **pending actual PostgreSQL CI on the pushed SHA**. Other 3-decimal payroll and wider domain paths have not been comprehensively certified.


عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

<a id="accounting-join-boundary-p0a"></a>
### Accounting tenant joins — P0-A security follow-up, 2026-10-25
`accounting.service.ts` now joins journal lines/accounts/bank reconciliation rows using both entity ID and tenant ID, so legacy cross-tenant references do not leak through accounting reads.

[Audit evidence](docs/reviews/PLATFORM_CORE_SECURITY_P0A_20261025.md) — code review and tests authored only; **not executed**.

## فهرس الأقسام المنقولة

- [7. المحاسبة والمالية والخزينة (Accounting, Finance & Treasury)](#cap-033)
- [58. حزمة التوطين الخليجي الشاملة وتعدد العملات ومحرك الفلس ثلاثي الخانات (GCC Localization Pack & 3-Decimal Fils Engine)](#cap-083)
- [59. محرك مراكز التكلفة المحاسبية وشجرة مراكز التكلفة وتحليل الربحية (Cost Centers Accounting Engine & P&L Reporting)](#cap-084)
- [61. محرك قفل الفترات المحاسبية المحكم والقيود اليومية اليدوية المتزنة (Fiscal Lock Dates & Manual Journal Entries Engine)](#cap-086)
- [62. إدارة ومتابعة الشيكات المؤجلة وحافظة الشيكات (PDC - Post-Dated Cheques Management)](#cap-087)
- [72. تسوية وتخصيص المدفوعات والقيود العكسية الآلية (Invoice Payment Allocation & Auto-Reversals)](#cap-097)
- [156. موديول الأصول الثابتة ومراكز التكلفة وإعادة تقييم العملات والحوكمة (Phase 10: Fixed Assets, Cost Centers, Forex Revaluation & Accounting Governance)](#cap-188)
- [170. الفترات المحاسبية الشهرية وإقفال الشهور (Monthly Fiscal Periods & Closing — O6)](#cap-201)
- [Phase 6 financial infrastructure hardening (3 October 2026)](#cap-229)
- [Commercial accounting and POS closure update (5 October 2026)](#cap-235)
- [259. منظومة سلامة القيود المحاسبية والتجارية (Accounting and Commercial Integrity — 24 October 2026)](#cap-298)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-033"></a>
<!-- migrated:cap-033:start -->
## 7. المحاسبة والمالية والخزينة (Accounting, Finance & Treasury)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/accounting`, `backend/src/modules/treasury`, `frontend/src/features/accounting`, `frontend/src/features/treasury`
* **الجداول في قاعدة البيانات:** `chart_of_accounts`, `journal_entries`, `journal_entry_lines`, `treasuries`, `bank_accounts`, `treasury_transactions`, `fixed_assets`, `asset_depreciation_logs`, `accounting_fiscal_years`, `tamper_audit_logs`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **دليل الحسابات الشجري (Chart of Accounts)** | 🟢 | 100% | `accounting.service.ts`, `ChartOfAccountsPage.tsx` | أصول، خصوم، حقوق ملكية، إيرادات، ومصروفات بتسلسل محاسبي معتمد.<br/>**تحصين سبتمبر 2026 (المرحلة 1):** فحص «هل على الحساب قيود محاسبية؟» في `updateAccount` و`deleteAccount` كان يستعلم `journal_entry_lines` **بلا فلتر `tenant_id`** — مخالفة لدستور العزل. أُضيف الفلتر. (يبقى الحارس الصحيح القائم: تغيير `account_type` و`normal_balance` ممنوع بعد وجود حركات.) |
| **عكس وإلغاء القيود اليومية (Journal Entry Reversal)** | 🟢 | 100% | `accounting.service.ts:reverseJournalEntry` | إنشاء قيد عكسي مرآتي (تبديل المدين والدائن) وربطه بالأصل عبر `reversal_of_entry_id`/`reversed_by_entry_id` مع إلزام سبب مكتوب.<br/>**تحصين سبتمبر 2026 (المرحلة 1):** (1) كانت حراس «مُرحَّل» و«سبق عكسه» تُفحص على قراءة **غير مقفلة وخارج المعاملة**، فطلبان متزامنان يُنشئان قيدين عكسيين ويتضاعف أثر العكس على الدفتر — أُضيفت قراءة مقفلة (`forUpdate`) داخل المعاملة مع إعادة فحص الحالتين؛ (2) كان العكس **يتجاوز قفل الفترة المحاسبية تماماً** لأنه يُدرج مباشرة في `journal_entries` بلا أي فحص، فأمكن العكس داخل سنة مقفلة وإعادة كتابة أرصدتها بعد اعتمادها — أُضيف `assertPeriodOpenForReversal` بنفس منطق المقارنة المستخدم في `insertPostedJournal`. |
| **التوجيه المحاسبي التلقائي (Automated Posting)** | 🟢 | 100% | `accounting-posting.service.ts` | توليد قيود اليومية آلياً عند كل عملية بيع، شراء، مرتجع، سداد، أو حركة خزينة بدون تدخل بشري. |
| **قيود اليومية اليدوية (Manual Journal Entries)** | 🟢 | 100% | `JournalEntriesPage.tsx`, `accounting.service.ts` | إدخال قيود محاسبية يدوية وتدقيق توازن الطرفين المدين والدائن. |
| **ميزان المراجعة والأستاذ العام (Trial Balance)** | 🟢 | 100% | `TrialBalancePage.tsx`, `GeneralLedgerPage.tsx` | ميزان المراجعة بالمجاميع والأرصدة، وحركات كل حساب في الأستاذ العام. |
| **قائمة الدخل والأرباح والخسائر (P&L Statement)** | 🟢 | 100% | `IncomeStatementPage.tsx` | حساب صافي الربح التشغيلي والنهائي بناءً على المبيعات وتكلفة المبيعات والمصروفات. |
| **الخزائن والحسابات البنكية وحركات النقدية** | 🟢 | 100% | `treasury.service.ts`, `TreasuryPage.tsx` | إدارة عدة خزائن وبنوك، سندات القبض والصرف، والتحويل بين الخزائن. |
| **سجل الأصول الثابتة وكروت الأصول (Fixed Assets Registry)** | 🟢 | 100% | `AccountingFixedAssetsPage.tsx`, `accounting.service.ts`, `2040000000024_fixed_assets.ts` | إدارة كاملة للأصول الثابتة عبر المسار `/accounting/fixed-assets`: تسجيل بيانات الأصل، الكود، التصنيف (سيارات، معدات، أثاث، أجهزة كمبيوتر، مباني، عام)، تاريخ وتكلفة الشراء، القيمة التخريدية (Salvage Value)، والعمر الإنتاجي بالشهور، مع حساب آلي لحظي لصافي القيمة الدفترية ومجمع الإهلاك وإجمالي تكلفة أصول المؤسسة. |
| **محرك الإهلاك التلقائي وقيود اليومية الآلية (Auto-Depreciation Engine)** | 🟢 | 100% | `AccountingFixedAssetsPage.tsx`, `accounting.service.ts`, `fixed-assets-depreciation.spec.ts` | محرك إهلاك مالي دقيق يدعم طريقتي: القسط الثابت (Straight-Line) والقسط المتناقص المزدوج (Double Declining Balance) مع حماية سقف القيمة التخريدية؛ إمكانية تشغيل الإهلاك لأصل منفرد أو تشغيل دورة إهلاك مجمعة لكافة أصول الشركة بنقرة واحدة، مع إنشاء الحسابات تلقائياً (حـ/ مصروف إهلاك 6950، وحـ/ مجمع إهلاك 1290) وتوليد قيود يومية متوازنة آلياً في الأستاذ العام وتسجيل كامل في جدول `asset_depreciation_logs`. |
| **محرك التسوية والمطابقة البنكية الذكية (Smart Bank Reconciliation Engine)** | 🟢 | 100% | `bank-reconciliation.service.ts`, `accounting.controller.ts`, `BankReconciliationPage.tsx`, `2040000000053_bank_reconciliation.ts` | محرك تسوية بنكية متكامل بمعيار أودو 17 و SAP B1 عبر المسار `/accounting/bank-reconciliation`، يشمل استيراد كشوف الحسابات البنكية، المطابقة الآلية الذكية بالسجل والمبلغ (Auto Match)، المطابقة اليدوية المزدوجة بنظام العمودين، احتساب رصيد الإغلاق، وتحديث حالة أسطر اليومية. |
| **نظام إغلاق الفترات المالية المحاسبية (Fiscal Lock Dates & Governance)** | 🟢 | 100% | `accounting-validation.service.ts`, `AccountingSettingsPage.tsx`, `ManualJournalEntryDialog.tsx`, `2040000000052_accounting_lock_dates.ts` | حوكمة محاسبية صارمة تمنع التعديل أو الترحيل في الفترات المقفلة عبر 3 مستويات: إغلاق لكافة المستخدمين، إغلاق للمستخدمين العاديين مع استثناء المستشار المالي، وإغلاق ضريبي للإقرارات، مع نافذة متوازنة للقيود اليومية اليدوية. |
| **الميزانية العمومية وقائمة المركز المالي الرسمية (Balance Sheet / IAS 1 / IFRS)** | 🟢 | 100% | `balance-sheet.service.ts`, `BalanceSheetPage.tsx`, `accounting.controller.ts` | تقرير المركز المالي المعتمد دولياً عبر المسار `/accounting/balance-sheet`: تقسيم قياسي للأصول (متداولة وغير متداولة)، الخصوم (متداولة وطويلة الأجل)، وحقوق الملكية، مع ترحيل آلي لحظي لصافي أرباح الفترة الحالية من قائمة الدخل، وفحص التوازن الذهبي الآلي (`الأصول = الخصوم + حقوق الملكية`)، ومقارنة الفترات السابقة (نفس التاريخ من العام الماضي أو تاريخ مخصص)، وتصدير CSV والطباعة المعتمدة. |
| **قائمة التدفقات النقدية المعيارية (Cash Flow Statement / IAS 7)** | 🟢 | 100% | `cash-flow.service.ts`, `CashFlowStatementPage.tsx`, `accounting.controller.ts` | تقرير حركة السيولة المعياري عبر المسار `/accounting/cash-flow`: تصنيف دقيق للتدفقات النقدية وفق معيار IAS 7 إلى (أنشطة تشغيلية، أنشطة استثمارية، أنشطة تمويلية)، واحتساب صافي التغير في النقدية، مع مطابقة آلية دقيقة 100% مع الأرصدة الفعلية للخزائن والحسابات البنكية، ودعم الفلاتر والاختصارات السريعة وتصدير CSV. |
| **تقرير أعمار الديون التحليلي للعملاء والموردين ومطالبات الواتساب (Aged Receivables & Payables)** | 🟢 | 100% | `aged-debts.service.ts`, `reports-summary.service.ts`, `AgedDebtsPage.tsx`, `accounting.controller.ts` | نظام تحصيل ومتابعة ديون متفوق على أودو و SAP عبر المسار `/accounting/aged-debts`: تبويبان منفصلان لديون العملاء والموردين، تقسيم زمني لـ 5 شرائح معيارية (حالي، 1-30، 31-60، 61-90، +90 يوم حرج)، شارات تقييم المخاطرة اللونية، رصد تاريخ وعدد أيام أقدم فاتورة، احتساب المبالغ المفتوحة الصافية `greatest(0, total - paid_amount)` واستبعاد المسودات وحصرها على `status = 'posted'`، وزر إرسال واتساب فوري للعملاء المتعثرين بنقرة واحدة لرسالة مطالبة ودية منسقة مع تصدير CSV. |
| **حافظة الشيكات البنكية وأوراق القبض والدفع (PDC Cheques Management)** | 🟢 | 100% | `pdc-cheques.service.ts`, `PdcChequesPage.tsx`, `accounting.controller.ts`, `2040000000057_pdc_cheques_management.ts`, `2040000000247_pdc_cheques_unique_index_fix.ts` | دورة متكاملة لإدارة أوراق القبض (شيكات العملاء) وأوراق الدفع (شيكات الموردين) عبر المسار `/accounting/cheques`: 6 بطاقات مؤشرات أداء (إجمالي، في الخزينة، برسم التحصيل، محصلة، مرتدة، تستحق خلال 7 أيام أو متأخرة)، دورة حياة كاملة للشيك (إيداع بنكي برسم التحصيل، تحصيل بنكي، صرف أوراق الدفع، تسجيل الارتداد مع الأسباب والمصاريف، التظهير لموردين آخرين، الاسترجاع للخزينة)، فلاتر متقدمة، معاينة وطباعة سند استلام شيك / إيصال رسمي معتمد، وتصدير CSV.<br/>**تحصين أكتوبر 2026 (نفذه Antigravity):** (1) حظر العكس المزدوج عند إلغاء أو رد شيك مرتد بالفعل؛ (2) ربط تبادلي آلي للقيود العكسية (`reversal_of_entry_id` و `reversed_by_entry_id`) وتحديث الفهرس الفريد (هجرة 247) ليتيح إعادة إيداع الشيكات المستعادة؛ (3) مزامنة تامة ولحظية مع دفاتر الأستاذ المساعد (`customer_ledger` / `supplier_ledger`) وأرصدة الشركاء في كافة حالات دورة حياة الشيك (استلام، إصدار، ارتداد، تظهير، رد، واستعادة). |
| **معالج إقفال السنوات المالية وترحيل الأرباح وحوكمة الفترات (Fiscal Year-End Closing Engine)** | 🟢 | 100% | `fiscal-year.service.ts`, `AccountingFiscalYearsPage.tsx`, `FiscalYearCloseWizardModal.tsx`, `CreateFiscalYearModal.tsx`, `ReopenFiscalYearModal.tsx`, `2040000000068_accounting_fiscal_years.ts` | محرك محاسبي متكامل يضاهي Odoo 17 Enterprise و Microsoft Dynamics 365 BC عبر المسار `/accounting/fiscal-years`: إدارة الفترات المحاسبية السنوية، التدقيق المالي الآلي قبل الإقفال (Pre-Closing Audit) للتحقق من ترحيل كافة المسودات، محاكاة قيد الإقفال السنوي لتصفير أرصدة قائمة الدخل (إيرادات 4xxx ومصروفات 5xxx/6xxx)، ترحيل صافي الأرباح أو الخسائر آلياً إلى حساب الأرباح المحتجزة (3200)، توليد قيد إقفال متزن 100%، تحديث وتأمين تاريخ القفل الشامل للنظام لمنع القيود بأثر رجعي، مع دعم كامل لإعادة فتح السنة المالية بشرط المبرر الإداري والترتيب الزمني العكسي.<br/>**تحصين سبتمبر 2026 (المرحلة 1):** (1) كانت المعاينة تُحسب **خارج** المعاملة ثم يُبنى قيد الإقفال عليها، فأي قيد يُرحَّل بينهما يُستبعد من الإقفال وتبقى حسابات الإيراد والمصروف غير مُصفَّرة والأرباح المحتجزة خاطئة — أُضيف قفل صف السنة (`forUpdate`) وإعادة احتساب الإيراد والمصروف **داخل** المعاملة مع رفض الإقفال عند أي اختلاف؛ (2) فحص «مقفلة بالفعل» كان خارج المعاملة فأمكن إنشاء قيدَي إقفال بطلبين متزامنين؛ (3) تأمين تاريخ القفل كان مشروطاً بـ`if (currentSettings)` فكان يُتخطى بصمت للمستأجر الذي لا يملك صف إعدادات — صار يُنشئ الصف بـ`onConflict`؛ (4) منع تداخل السنوات المالية صار مفروضاً على مستوى القاعدة بقيد `EXCLUDE USING gist` (هجرة 111) بدل فحص SELECT-ثم-INSERT القابل للتسابق. |
| **سجل التدقيق الجنائي المشفّر غير القابل للتلاعب وسلاسل التجزئة (Tamper-evident Cryptographic Audit Trail)** | 🟢 | 100% | `tamper-audit.service.ts`, `tamper-audit.controller.ts`, `TamperAuditTrailTab.tsx`, `TamperAuditDiffModal.tsx`, `tamper-audit.api.ts`, `2040000000069_tamper_evident_audit_trail.ts`, `2040000000070_tamper_audit_deterministic_hash.ts` | منظومة رقابة جنائية أمنية متقدمة تعمل على مستوى محرك قاعدة البيانات PostgreSQL مباشرة (Database Triggers) وسلاسل تجزئة تشفيرية متسلسلة (SHA-256 Hash Chaining تحاكي تقنيات البلوكشين Merkle/Hash Chain) عبر المسار `/audit`: حظر نهائي للحذف أو التعديل على سجل التدقيق (Append-Only Immutable Table)، رصد فوري لكافة عمليات INSERT و UPDATE و DELETE على 11 جدولاً حرجاً في النظام (القيود، أطراف القيود، شجرة الحسابات، إعدادات الحسابات، فواتير وبنود المبيعات، فواتير وبنود المشتريات، الخزائن وسندات القبض والصرف)، تسجيل تفاصيل الفوارق الحقلية (Field-Level Diff) بدقة بين القديم والجديد، زر فحص ومطابقة نزاهة السلسلة التشفيرية بنقرة واحدة (Cryptographic Integrity Verifier)، وكشف أي محاولة تلاعب يدوي من داخل قاعدة البيانات مباشرة (psql / pgAdmin) أو من التطبيق. |
| **الجدولة المؤتمتة لقيود إهلاك الأصول الثابتة (Automated Depreciation Scheduler)** | 🟢 | 100% | `fixed-assets-scheduler.service.ts`, `accounting.controller.ts`, `AccountingFixedAssetsPage.tsx`, `accounting.module.ts` | محرك جدولة خلفي دوري مؤتمت يفحص نهاية كل شهر ميلادي لكافة منشآت النظام المفعلة، ويشغل دورة الإهلاك الشهرية للأصول الثابتة النشطة، ويولد قيود اليومية المتوازنة تلقائياً في الأستاذ العام ويسجل العمليات في `asset_depreciation_logs` مع لوحة تحكم سريعة في واجهة الأصول لتفعيل/تعطيل الجدولة أو تشغيل الإهلاك الفوري بضغطة زر. |
| **مصفوفة وقوالب توزيع مراكز التكلفة بالنسب المئوية (Hierarchical Cost Center Allocation Matrix)** | 🟢 | 100% | `cost-center-allocations.service.ts`, `CostCenterAllocationsTab.tsx`, `AccountingCostCentersPage.tsx`, `cost-centers.api.ts`, `2040000000072_cost_center_allocation_matrices.ts` | محرك توزيع تحليلي متقدم يضاهي SAP و Dynamics 365 BC عبر المسار `/accounting/cost-centers` (تبويب قوالب التوزيع)؛ إمكانية إنشاء قوالب توزيع مسبقة الإعداد لتقسيم المصروفات المشتركة على عدة مراكز تكلفة بنسب مئوية محكمة مع تحقق صارم من اكتمال النسبة 100%، شريط توزيع لوني تفاعلي، محاكي مالي لاحتساب المبالغ الموزعة لحظياً، وتطبيق القوالب على بنود وسطور المصروفات والفواتير. |
| **محرك تقييم العملات الأجنبية وأرباح وخسائر فروق الصرف IAS 21 (Multi-Currency FX Revaluation Engine)** | 🟢 | 100% | `forex-revaluation.service.ts`, `accounting.controller.ts`, `AccountingForexRevaluationPage.tsx`, `forex.api.ts`, `2040000000073_forex_revaluation_engine.ts` | معيار المحاسبة الدولي IAS 21 لإعادة تقييم الحسابات والأرصدة بالعملات الأجنبية في نهاية كل فترة مالية عبر المسار `/accounting/forex`؛ قراءة فورية لأرصدة الحسابات النقدية والبنكية وحسابات العملاء والموردين بالعملة الأجنبية ومقارنة سعر الصرف الدفتري مع سعر الإقفال الحالي، واحتساب فروق الصرف غير المحققة (Unrealized FX Gain/Loss)، وتوليد وترحيل قيد تسوية آلي متزن في الأستاذ العام (حـ/ أرباح أو خسائر فروق العملة 4920/5920) وحفظ تقرير التدقيق وسجل الدورات.<br/>**⚠️ تصحيح حرج سبتمبر 2026 (المرحلة 1):** كانت الوحدة **معطلة بالكامل وترمي خطأ عند كل استدعاء** — الاستعلام كان يشير إلى عمودَي `name` و`type` على `accounting_accounts` (الأعمدة الحقيقية `name_ar`/`name_en` و`account_type`) وإلى جدول `treasuries` **غير الموجود في المخطط إطلاقاً**، وأخفى `(this.db as any)` الأخطاء الثلاثة عن المترجم. كذلك كان اختيار الحسابات بمطابقة أسماء نصية (`%دولار%`) وهو ما **لا يميّز البند النقدي من غير النقدي** فكان حساب مثل «مخزون بضاعة USD» سيُعاد تقييمه — وهو خطأ جوهري لأن IAS 21 §23 يوجب إعادة الترجمة للبنود النقدية فقط. **الحالة الآن:** أُضيف عمودا `is_monetary` و`revaluation_currency` (هجرة 112) مع تعبئة أولية من `is_cash_bank`/`is_receivable`/`is_payable` واستثناء المخزون صراحةً، وصار الاختيار صريحاً بدل التخمين النصي. **بند مفتوح (O1):** `revaluation_currency` يبدأ فارغاً فلن تلتقط الوحدة أي حساب حتى تُحدَّد عملة كل حساب نقدي أجنبي — سلوك آمن يحتاج شاشة تهيئة. |
| **الفترات المحاسبية الشهرية وإقفال الشهور (Monthly Fiscal Periods & Closing — O6)** | 🟢 | 100% | `fiscal-year.service.ts`, `fiscal-period.dto.ts`, `accounting-posting.service.ts`, `accounting.service.ts`, `FiscalPeriodsModal.tsx`, `AccountingFiscalYearsPage.tsx`, `2040000000143_accounting_fiscal_periods.ts` | نظام الفترات المحاسبية الشهرية المعتمدة مؤسسياً (12 فترة للسنة المالية) لتمكين الإدارة المالية من إقفال وتجميد الدفاتر شهرياً بعد مراجعة الحسابات وتقديم الإقرارات الضريبية، وحظر إضافة أو تعديل أي حركة مالية في فترة مقفلة بأثر رجعي. تقسيم تلقائي لـ 12 شهراً، إقفال زمني متسلسل (لا تُقفل الفترة N إلا بعد إقفال N-1)، حظر الإقفال مع وجود قيود معلقة في المسودة، حظر ترحيل أي قيد يدوي أو تلقائي في فترة مقفلة بكود `ACCOUNTING_PERIOD_LOCKED` (400)، وإعادة فتح عكسية مشروطة بوجود سبب تدقيقي إلزامي، ونافذة منبثقة متكاملة لإدارة الفترات وإقفالها. |


---


<!-- migrated:cap-033:end -->

<a id="cap-083"></a>
<!-- migrated:cap-083:start -->
## 58. حزمة التوطين الخليجي الشاملة وتعدد العملات ومحرك الفلس ثلاثي الخانات (GCC Localization Pack & 3-Decimal Fils Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:**
  * `frontend/src/lib/currencies.ts` (إضافة دعم عملات الخليج KWD, QAR, BHD, OMR إلى جانب SAR, AED, EGP, USD وتحديد عدد الخانات العشرية بدقة 3 خانات للدينار الكويتي والبحريني والريال العماني).
  * `frontend/src/lib/format.ts` (تحديث محرك تنسيق العملات `formatCurrency` ليعتمد تلقائياً على `getCurrencyDecimals` ويدعم ديناميكياً تنسيق الفلس والبيسة ثلاثي الخانات العشرية بدلاً من الاقتصار على خانتين).
  * `frontend/src/features/settings/components/forms/tabs/GeneralSettingsTab.tsx` (توسيع قائمة المناطق الزمنية لتشمل كافة عواصم ومدن الخليج: الكويت `Asia/Kuwait`، قطر `Asia/Qatar`، البحرين `Asia/Bahrain`، مسقط `Asia/Muscat`، الرياض `Asia/Riyadh`، دبي `Asia/Dubai`).
  * `frontend/src/features/settings/pages/TenantSubscriptionPage.tsx` (تسعير باقات الاشتراك السحابي إقليمياً لدول الخليج KWD, SAR, QAR, AED, BHD, OMR مع محول ديناميكي للعملة يتيح للمشترك الخليجي الاطلاع على الباقات بالعملة المحلية مباشرة بدون حصر بالجنيه المصري).
* **الميزات والقدرات المفعلة:**
  1. **التوافق الكامل مع العملات الخليجية (Full GCC Currencies Support):** دعم رسمي متكامل لعملات الدينار الكويتي (KWD)، الريال القطري (QAR)، الدينار البحريني (BHD)، الريال العماني (OMR)، والريال السعودي (SAR)، والدرهم الإماراتي (AED).
  2. **محرك الفلس والبيسة ثلاثي الخانات (3-Decimal Fractional Currency Engine):** معالجة الخصوصية الحسابية الفريدة لدول الخليج التي تعتمد 1000 فلس للدينار (الكويت والبحرين) و 1000 بيسة للريال (عُمان)، مع إظهار المبالغ بدقة 3 خانات عشرية (مثل 12.500 د.ك) تلقائياً ودون تشويه للعملات ثنائية الخانات (مثل الجنيه المصري والريال السعودي والدولار).
  3. **ترشيد واجهة نقطة بيع المطاعم (Streamlined Touch-First Restaurant POS):** إخفاء أدوات التجزئة المربكة لكاشير المطاعم مثل مفتاح نمط السكانر وزر الاستبدال الفوري للبضاعة، مع حصر العمل على نمط التاتش اللمسي وتجميع أزرار الوردية وفتح الدرج وتقرير X في كتلة منظمة.
  4. **محرك تسعير المتجر الإلكتروني بدقة 3 خانات عشرية (Storefront 3-Decimal Pricing & Formatting):** احتساب السلة والفواتير الإلكترونية وعرض كافة الأسعار بدقة الفلس (0.000 د.ك) عبر كافة مكونات المتجر العامة والإدارية وبوابات الدفع الإلكتروني (Tap/Stripe) وسلات الشراء المتروكة.
  5. **مصفوفة تسعير وتوصيل مناطق ومحافظات الكويت (Kuwait Delivery Zones Matrix):** قوالب تسعير مسبقة تغطي التوصيل السريع للمطاعم ومحافظات الكويت، مع التطهير التام من التنبيهات المبتذلة والالتزام بنوافذ التأكيد المؤسسية (Zero-Native-Alert Standard).
  6. **إشعارات الواتساب متعددة العملات (Multi-Currency WhatsApp Notifications):** إرسال إشعارات الفواتير، ومبيعات المتجر، وإغلاق الوردية، والمرتجعات بالدينار الكويتي أو العملة المحلية المحددة تلقائياً ومنع تسريب الجنيه المصري للمشتركين خارج مصر.
  7. **توطين المناطق الزمنية للأعمال (GCC Business Timezones):** ضبط مواعيد الجلسات وتوقيت إغلاق الكاشير والتقارير المالية بحسب التوقيت المحلي الدقيق لكل دولة خليجية.
  8. **التسعير الإقليمي المخصص لمنصة SaaS:** إمكانية عرض واشتراك المنشآت الخليجية في باقات Z-Systems بحسب عملتها المحلية بأسعار متكافئة ومدروسة لسوق كل دولة.

---


<!-- migrated:cap-083:end -->

<a id="cap-084"></a>
<!-- migrated:cap-084:start -->
## 59. محرك مراكز التكلفة المحاسبية وشجرة مراكز التكلفة وتحليل الربحية (Cost Centers Accounting Engine & P&L Reporting)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات والترحيل (Database & Migration):**
    * `backend/src/database/migrations/2040000000049_cost_centers_and_gcc_currencies.ts` (إنشاء جدول `cost_centers` الهرمي مع كود ومركز رئيسي وعزل الشركات، وإضافة عمود `cost_center_id` المفهرس في جدول `journal_entry_lines`).
    * `backend/src/database/database.types.ts` (تعريف أنواع الجداول `CostCenterTable` وربط الحقل بـ `JournalEntryLineTable`).
  * **الباك إند (Backend):**
    * `backend/src/modules/accounting/accounting.service.ts` (دوال إدارة مراكز التكلفة `listCostCenters`, `createCostCenter`, `updateCostCenter`, `deleteCostCenter`, وتوليد تقرير قائمة الدخل والأرباح والخسائر لكل مركز `getCostCenterReport`، وربط حقل `cost_center_id` في القيود المحاسبية).
    * `backend/src/modules/accounting/accounting.controller.ts` (نقاط النهاية لـ CRUD مراكز التكلفة وتقرير المركز المالي `/api/accounting/cost-centers`).
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/accounting/api/cost-centers.api.ts` (عميل API متكامل لعمليات مراكز التكلفة والتقارير المالية).
    * `frontend/src/features/accounting/pages/AccountingCostCentersPage.tsx` (شاشة إدارة مراكز التكلفة بتصميم مؤسسي متكامل: بطاقات إحصائية، شجرة ومستويات المراكز، بحث وفلترة، نافذة منبثقة للإنشاء والتعديل، ونافذة تفصيلية لتقرير الأرباح والخسائر P&L والحركات المحاسبية مع فلترة بالتاريخ).
    * `frontend/src/features/accounting/routes.tsx` & `frontend/src/app/router/access.ts` & `frontend/src/shared/layout/app-shell.tsx` (تسجيل المسار `/accounting/cost-centers`، دمج التبويب في قائمة المالية والمحاسبة بالسايدبار مع الصلاحيات والأيقونة المؤسسية).
    * `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx` (عرض مركز التكلفة المرتبط بكل سطر من سطور القيد اليومي).
* **الميزات والقدرات المفعلة:**
  1. **هيكلية شجرية مرنة لمراكز التكلفة (Hierarchical Cost Center Tree):** إمكانية إنشاء مراكز رئيسية (فروع، خطوط أعمال، مشاريع) ومراكز فرعية متفرعة عنها بعدة مستويات مع حساب المستوى التلقائي.
  2. **ربط سطور القيود اليومية بمراكز التكلفة (Multi-Dimensional Journal Tagging):** دعم إسناد أي حركة مالية (مصروف، إيراد، أصل) إلى مركز تكلفة محدد بدقة عند توليد القيود.
  3. **تقرير الأرباح والخسائر لكل مركز تكلفة (Cost Center P&L & Financial Report):** احتساب فوري وصارم لإجمالي المصروفات والإيرادات وصافي الربح/الخسارة لكل مركز تكلفة مع سجل تفصيلي لجميع السطور المحاسبية المرتبطة وفلاتر زمنية دقيقة.
  4. **منع الحذف في حال وجود ارتباطات مالية (Data Integrity Protection):** حماية المركز من الحذف العشوائي إذا كان مرتبطاً بحركات وسطور قيود فعلية أو لديه مراكز تكلفة فرعية تابعة.
  5. **الالتزام الكامل بالدستور البصري وسياسة منع الإيموجيز (Strict Enterprise UI & 0 Emojis):** بطاقات بيضاء متوازنة، مؤشرات أداء بنسب مئوية نظيفة، أيقونات SVG قياسية، وتدرج لوني كحلي ملكي `#170e5e`.

---


<!-- migrated:cap-084:end -->

<a id="cap-086"></a>
<!-- migrated:cap-086:start -->
## 61. محرك قفل الفترات المحاسبية المحكم والقيود اليومية اليدوية المتزنة (Fiscal Lock Dates & Manual Journal Entries Engine)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 17 Accounting & SAP Business One Financial Periods.
* **روابط وشاشات الوصول:**
  * `/accounting/settings` (تبويب: إقفال الفترات المحاسبية).
  * `/accounting/journal-entries` (زر ونافذة: إنشاء قيد يدوي).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات والترحيل (Database & Migrations):**
    * `backend/src/database/migrations/2029000000008_accounting_lock_dates.ts` (إضافة أعمدة `lock_date_all`, `lock_date_non_adviser`, `lock_date_tax` لجدول `accounting_settings`).
    * `backend/src/database/database.types.ts` (تحديث نوع `AccountingSettingsTable`).
  * **الباك إند (Backend):**
    * `backend/src/modules/accounting/dto/accounting.dto.ts` (تحديث `UpdateAccountingSettingsDto` بمدخلات تواريخ الإقفال، وإضافة `CreateManualJournalEntryDto` و `CreateJournalLineDto`).
    * `backend/src/modules/accounting/accounting.service.ts` (تحديث `getAccountingSettings` و `updateAccountingSettings`، إضافة محرك التدقيق المحاسبي `assertNotInLockedPeriod`، وتنفيذ دالة إنشاء القيد اليدوي المتزن `createManualJournalEntry` مع التحقق الصارم من توازن المدين والدائن وصلاحيات الحسابات).
    * `backend/src/modules/accounting/accounting.controller.ts` (إضافة نقطة النهاية `POST /api/accounting/journal-entries`).
    * `backend/src/modules/accounting/accounting-posting.service.ts` (حقن فحص وتدقيق تواريخ الإقفال المحاسبي الصارم داخل محرك ترحيل القيود العام `insertJournal` لرفض أي حركة بيع أو شراء أو مصروف أو تسوية تقع في فترة مغلقة).
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/accounting/api/accounting.api.ts` (تحديث واجهة الـ API لدعم قراءة وتحديث تواريخ الإقفال، واستدعاء `createJournalEntry`).
    * `frontend/src/features/accounting/components/ManualJournalEntryDialog.tsx` (مكون نافذة إدخال القيد اليدوي المؤسسية: جدول سطور ديناميكي، منتقي الحسابات ومراكز التكلفة، احتساب لحظي للمدين والدائن والفارق، شارة حالة التوازن، ومنع الترحيل حتى تحقيق التوازن التام).
    * `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx` (زر «إنشاء قيد يدوي» في رأس الصفحة، تكامل فتح النافذة، والتحديث الفوري للجدول مع الانتقال المباشر لتفاصيل القيد المنشأ).
    * `frontend/src/features/accounting/pages/AccountingSettingsPage.tsx` (تبويب وبطاقات «إقفال الفترات المحاسبية والرقابة المالية»: كارت الإقفال الشامل النهائي Hard Lock، كارت إقفال العمليات التشغيلية لمدخلي البيانات والكاشير Non-Advisers Lock، وكارت إقفال الإقرار الضريبي Tax Lock، مع أزرار الحفظ والإلغاء وإشعارات الحالة).
* **الميزات والقدرات المفعلة:**
  1. **الإقفال المحاسبي النهائي الشامل (Hard Lock Date):** منع بات ومطلق لإضافة أو تعديل أي فواتير بيع أو شراء أو مصاريف أو سندات صرف وقبض أو قيود يومية بتاريخ يسبق أو يطابق تاريخ الإقفال لجميع المستخدمين بما فيهم الإدارة العامة والمدير المالي، لحماية الفترات المدققة رسمياً.
  2. **إقفال العمليات التشغيلية (Operational Lock Date for Non-Advisers):** منع موظفي الكاشير ومدخلي البيانات والمحاسبين المبتدئين من تسجيل أي حركات بأثر رجعي تسبق تاريخ الإقفال التشغيلي، مع حصر استثناء التعديل للمدققين والمديرين الماليين المعتمدين.
  3. **إقفال الإقرار الضريبي (Tax / VAT Lock Date):** تجميد الفترات الضريبية التي تم تقديم إقرارها للهيئة الضريبية لحماية تطابق إقرارات ضريبة القيمة المضافة مع الدفاتر.
  4. **محرك القيود اليومية اليدوية المتزنة (Balanced Manual Journal Entry Engine):** إمكانية تسجيل قيود تسوية محاسبية متعددة الأطراف (Multi-line) مع اختيار مراكز التكلفة، مع تدقيق لحظي في الفرونت إند والباك إند يمنع ترحيل أي قيد غير متزن أو يحتوي على سطور صفرية أو متعارضة.
  5. **الحوكمة المالية الصارمة وخلو الإيموجيز (Enterprise Financial Governance & 0 Emojis):** التزام قطعي بنسبة 100% بالدستور البصري المؤسسي بدون أي رموز غير قياسية، مع استخدام اللون الكحلي الملكي `#170e5e` للأزرار الأساسية وتنسيق كروت بيضاء نقية متناسقة.

---


<!-- migrated:cap-086:end -->

<a id="cap-087"></a>
<!-- migrated:cap-087:start -->
## 62. إدارة ومتابعة الشيكات المؤجلة وحافظة الشيكات (PDC - Post-Dated Cheques Management)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 17 Post-Dated Checks & SAP Business One Banking PDC.
* **روابط وشاشات الوصول:** `/accounting/cheques` (القائمة الجانبية: المالية والمحاسبة ➔ حافظة الشيكات PDC).
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000057_pdc_cheques_management.ts`, `backend/src/database/database.types.ts`.
  * **الباك إند:** `backend/src/modules/accounting/services/pdc-cheques.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`, `backend/src/modules/accounting/accounting.module.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/PdcChequesPage.tsx`, `frontend/src/features/accounting/api/accounting.api.ts`, `frontend/src/features/accounting/routes.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **إدارة الشيكات الصادرة والواردة (Receivable & Payable PDCs):** متابعة شيكات العملاء الواردة وشيكات الموردين الصادرة مع رصد رقم الشيك، البنك المسحوب عليه، اسم الساحب، القيمة، وتاريخ الاستحقاق.
  2. **دورة حياة الشيك الكاملة (Full Lifecycle Workflow):** دعم حالات التحصيل والإيداع (مستلم ➔ برسم التحصيل ➔ محصل ➔ مرتد مع تدوين سبب ومصروف الارتداد ➔ مجير لمورد خارجي).
  3. **التنبيه المبكر للشيكات المستحقة:** فلاتر ذكية وإحصائيات فورية للشيكات المستحقة خلال 7 أيام القادمة والشيكات المتأخرة لتفادي الغرامات ومتابعة السيولة.
  4. **التكامل مع القيود وأستاذ الحسابات:** ربط فوري مع أرقام القيود اليومية في شجرة الحسابات.

---


<!-- migrated:cap-087:end -->

<a id="cap-097"></a>
<!-- migrated:cap-097:start -->
## 72. تسوية وتخصيص المدفوعات والقيود العكسية الآلية (Invoice Payment Allocation & Auto-Reversals)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **معيار المقارنة الدولي:** Odoo 18 Invoicing Reconciliation / Matching & Reversal Journal Entries.
* **روابط وشاشات الوصول:** `/accounting/payment-allocation` و `/accounting/journal-entries`.
* **مسارات الكود الأساسية:**
  * **قاعدة البيانات:** `backend/src/database/migrations/2040000000063_payment_allocations_and_reversals.ts`, `backend/src/database/database.types.ts` (`payment_allocations`).
  * **الباك إند:** `backend/src/modules/accounting/services/payment-allocation.service.ts`, `backend/src/modules/accounting/accounting.service.ts`, `backend/src/modules/accounting/accounting.controller.ts`.
  * **الفرونت إند:** `frontend/src/features/accounting/pages/PaymentAllocationPage.tsx`, `frontend/src/features/accounting/pages/AccountingJournalEntriesPage.tsx`.
* **الميزات والقدرات المفعلة:**
  1. **تسوية وتخصيص الدفعات غير المربوطة بالفواتير:** ربط سندات القبض والدفع المفتوحة بفواتير المبيعات والمشتريات المعلقة للعميل أو المورد مع بيان المبلغ المتبقي لكل فاتورة.
  2. **محرك التسوية الآلي بالوارِد أولاً يُصرَف أولاً (FIFO Auto-Reconciliation):** توزيع تلقائي فوري لأي دفعة على الفواتير المفتوحة الأقدم تاريخياً وتحديث حالة السداد ومبالغ الفواتير بدقة سنت واحد.
  3. **إلغاء وعكس القيود اليومية آلياً (Auto-Reversal Entries):** نافذة رسمية لإلغاء أي قيد مرحل مع تدوين سبب الإلغاء، وتوليد القيد العكسي المعادل فورياً وربطه محاسبياً بالقيد الأصلي لمنع التلاعب وحفظ التدقيق المالي.
  4. **تحصين سبتمبر 2026 (المرحلة 5):** حارسا سقف السند وسقف الفاتورة كانا موجودين ويعملان، لكن **كل القراءات الأربع كانت بلا `forUpdate()`** — فتخصيصان متزامنان على نفس السند أو نفس الفاتورة يقرآن الرصيد ذاته وكلاهما يجتاز الحد، فيُخصَّص أكثر من المتاح ويظهر `paid_amount` أقل من مجموع التخصيصات (نقص في الذمم). أُضيف قفل الصف على قراءات `customer_payments` و`supplier_payments` و`sales` و`purchases`.

---


<!-- migrated:cap-097:end -->

<a id="cap-188"></a>
<!-- migrated:cap-188:start -->
## 156. موديول الأصول الثابتة ومراكز التكلفة وإعادة تقييم العملات والحوكمة (Phase 10: Fixed Assets, Cost Centers, Forex Revaluation & Accounting Governance)
* **حالة الموديول العامة:** 🟢 مكتمل ومحكم 100% (Phase 10 Production-Ready & Invariant-Audited).
* **المعايير الهندسية والتشغيلية المعتمدة:** Rule 10 Universal Document Numbering (`PREFIX-YYMMDD-XXXX`) / Rule 13 Financial & Operational Audit Protocol / Pessimistic Row Locking (`forUpdate`) / Race-Condition Prevention (Pattern F1) / IAS 21 §23 Multi-Currency Accounting Standard / Zero `as any` Casting / 0 Emojis Policy.
* **المسارات في الكود:**
  - `backend/src/modules/accounting/accounting.service.ts`:
    1. فرض قفل تشاؤمي `forUpdate()` على جدول `fixed_assets` في دالة `depreciateFixedAsset` لمنع تضارب التحديثات وازدواجية إثبات قيود الإهلاك عند تشغيل إهلاك متزامن (Pattern F1).
    2. إحكام معادلات القسط الثابت والقسط المتناقص وسقف الأساس القابل للإهلاك عند قيمة الخردة (`cost - salvage_value`) ومنع تجاوز مجمع الإهلاك للقيمة الدفترية.
    3. حماية حذف الأصول: حظر الحذف الصلب للأصول التي تم إهلاكها ولها سجلات في `asset_depreciation_logs` وتحويلها إلى حالة متقاعد (`status = 'retired'`) لحماية قيود اليومية واتصال سجل الأستاذ العام.
  - `backend/src/modules/accounting/services/cost-center-allocations.service.ts` & `database.types.ts`:
    1. محاذاة أنواع الأعمدة في `CostCenterAllocationSplitTable` لتقبل `BIGINT` مع الكود بأمان تام.
    2. إزالة جميع كاستات `(this.db as any)` غير الآمنة والاعتماد على الاستعلامات المطبوعة بالكامل.
    3. إحكام التحقق الصارم من مجموع نسب التوزيع لتساوي 100% بدقة ($\pm 0.05\%$) وحظر حفظ نسب غير متطابقة.
  - `backend/src/modules/accounting/services/forex-revaluation.service.ts`:
    1. اكتشاف وتصحيح خطأ فادح في المخطط (Schema Bug): تصحيح الاستعلام بالبحث في `name_ar` بدلاً من العمود غير الموجود `name` في جدول `accounting_accounts` والذي كان محجوباً بكاست `(this.db as any)`، وإزالة الكاست نهائياً.
    2. تطبيق معيار الترقيم الموحد للوثائق على قيد تسوية فروق العملة بصيغة `FX-USD-YYMMDD-XXXX` عبر `formatDailyDocumentNumber('FX-USD', entryId, periodDate)`.
    3. التحقق من مطابقة معيار المحاسبة الدولي IAS 21 §23 بإعادة تقييم البنود النقدية فقط (`is_monetary = true`) والمعرفة بعملة التقييم `revaluation_currency`.
  - `backend/test/critical/phase10-governance-assets.spec.ts`:
    - إنشاء جناح اختبارات تدقيقي يغطي 6 سيناريوهات حتمية: حسابات القسط الثابت والمتناقص وسقف الخردة، قفل الأصول ومنع الإهلاك المزدوج، توزيع مراكز التكلفة وإحكام نسبة الـ 100%، إعادة تقييم العملات الأجنبية وتوليد قيد التسوية بالترقيم الموحد، منع حذف الأصول ذات السجلات وترقيتها إلى متقاعدة، وحوكمة وتدقيق أبعاد التكاليف.
* **فحص الجودة والسلامة البرمجية:**
  - جناح الاختبارات الحاسم `npm run test:critical` (29 جناح اختبار): **اجتياز بنسبة 100% بنجاح تام (Exit code 0)**.

---


<!-- migrated:cap-188:end -->

<a id="cap-201"></a>
<!-- migrated:cap-201:start -->
## 170. الفترات المحاسبية الشهرية وإقفال الشهور (Monthly Fiscal Periods & Closing — O6)
* **حالة الوحدة / المعيار:** 🟢 مكتملة (23 سبتمبر 2026) — الثوابت FP-1..FP-6 في `ARCHITECTURE_INVARIANTS.md` §2.13، محروسة بـ`fiscal-periods.spec.ts` داخل `npm run guards`.
* **الفجوة التي أُغلقت (البند O6):** النظام كان يعتمد على تاريخ إقفال شامل (`lock_date_all`) أو إقفال السنة المالية بالكامل فقط. لم يكن هناك مفهوم معتمد للفترات الشهرية (12 فترة للسنة المالية)، مما كان يمنع المحاسبين والمديرين الماليين من إقفال الشهور السابقة وتجميد الحسابات والإقرارات الضريبية شهرياً بشهر، مع ترك الباب مفتوحاً لإضافة أو تعديل قيود في شهور سابقة مُعتمدة.
* **ما يستطيعه المستخدم الآن:**
  - عرض الفترات الشهرية الـ 12 لكل سنة مالية عبر زر "الفترات الشهرية" في شاشة السنوات المالية `/accounting/fiscal-years`.
  - توليد وتقسيم السنة تلقائياً إلى 12 فترة شهرية (من أول يوم إلى آخر يوم في كل شهر، مع دعم دقيق للسنوات الكبيسة 29 فبراير، والسنوات غير المنتظمة، والتوليد الكسول للسنوات القديمة).
  - إقفال الفترة الشهرية بنقرة واحدة مع إضافة ملاحظات الإقفال.
  - الحظر الصارم للإقفال غير الزمني (لا يمكن إقفال الشهر N إلا إذا كان الشهر السابق N-1 مقفلاً).
  - الحظر الصارم للإقفال في حال وجود قيود يومية معلقة (مسودات `draft`) خلال نطاق الشهر، وإلزام المحاسب بترحيلها أو حذفها أولاً.
  - حظر ترحيل أي قيد يومي (يدوي عبر شاشة القيود أو آلي من المبيعات والمشتريات والخزينة والمخزون) يقع تاريخه ضمن فترة مقفلة بكود `ACCOUNTING_PERIOD_LOCKED` (400).
  - إمكانية إعادة فتح فترة شهرية مقفلة للمدير المالي، بشرط إلزامي لتوثيق سبب إعادة الفتح للتدقيق، والالتزام بالترتيب العكسي (لا يُعاد فتح الشهر N طالما الشهر اللاحق N+1 ما زال مقفلاً).
* **الملفات:**
  - `backend/src/database/migrations/2040000000143_accounting_fiscal_periods.ts` — الهجرة وقيد التفرد والفهارس
  - `backend/src/database/database.types.ts` — تعريف جدول `AccountingFiscalPeriodTable`
  - `backend/src/modules/accounting/dto/fiscal-period.dto.ts` — عقود البيانات DTOs
  - `backend/src/modules/accounting/services/fiscal-year.service.ts` — محرك تقسيم الفترات والإقفال وإعادة الفتح
  - `backend/src/modules/accounting/accounting-posting.service.ts` — حظر الترحيل التلقائي في الفترات المقفلة
  - `backend/src/modules/accounting/accounting.service.ts` — حظر الترحيل اليدوي في الفترات المقفلة
  - `backend/src/modules/accounting/accounting.controller.ts` — مسارات API
  - `frontend/src/features/accounting/types/fiscal-years.types.ts` — أنواع الفرونت إند
  - `frontend/src/features/accounting/api/fiscal-years.api.ts` — استدعاءات API
  - `frontend/src/features/accounting/components/fiscal-years/FiscalPeriodsModal.tsx` — المودال المتكامل لإدارة الفترات
  - `frontend/src/features/accounting/pages/AccountingFiscalYearsPage.tsx` — زر الوصول وعرض الفترات
* **التحقق:**
  - `backend/test/critical/fiscal-periods.spec.ts` — اختبارات المحرك: التقسيم المنتظم، السنوات الكبيسة، الفترات المخصصة، الترتيب الزمني، حظر المسودات، إعادة الفتح العكسية، وحظر القيود.
  - فحص الأنواع (`tsc -b`) وعقود API والمعمارية (`npm run guards`) بنجاح 100%.


---


<!-- migrated:cap-201:end -->

<a id="cap-229"></a>
<!-- migrated:cap-229:start -->
## Phase 6 financial infrastructure hardening (3 October 2026)

- ZATCA invoice generation now serializes each branch/device chain and pins a signed sale to its EGS unit. Retries reuse the saved cryptographic package and do not spend a second ICV. A database unique index (`2040000000187`) prevents duplicate ICVs for a tenant and EGS unit; production signing requires an active production certificate. Existing duplicate historical counters need reconciliation if the migration rejects them.
- Manual inventory target adjustments now store the true signed stock delta. Manual adjustments and damaged-stock write-offs read cost while the product is locked and reject quantities/costs that cannot produce a valid financial journal. Stock, movement and journal writes share one database transaction.
- The standard critical suite now includes a self-contained ten-tenant concurrency contract for sales, treasury transfers and stock reads. The opt-in staging mode still performs 1,000 bounded reads and advisory locks. These checks do not replace real PostgreSQL financial write-load verification; no 1,000-tenant throughput result has been measured here.


<!-- migrated:cap-229:end -->

<a id="cap-235"></a>
<!-- migrated:cap-235:start -->
## Commercial accounting and POS closure update (5 October 2026)

- Cashiers can combine original invoice returns and new products in an instant exchange. The backend links the documents, settles the net in cash, card or store credit, and records a single balanced journal. The original invoice must be fully paid for the same registered customer and branch.
- `POST /api/goods-receipts/bills` settles accepted quantities from multiple posted GRNs under one PO and supplier. It caps cumulative invoicing per receipt line, clears GRNI and routes tolerated purchase price variance to PPV.
- Pharmacy sales allocate valid batches by earliest expiry and record the exact batch for later returns. Expired or insufficient batches reject the checkout. Pharmacy receipts require a batch number and expiry date.
- The POS no-sale drawer control records the operator, shift and reason before sending the desktop drawer command. Hardware errors do not reverse the audit entry.
- These changes await the local pair's migration, TypeScript, financial and field checks; this static review does not certify production readiness.


<!-- migrated:cap-235:end -->

<a id="cap-298"></a>
<!-- migrated:cap-298:start -->
## 259. منظومة سلامة القيود المحاسبية والتجارية (Accounting and Commercial Integrity — 24 October 2026)
- **الحالة:** مكتملة بنسبة 100% ومحمية باختبارات قبول تنفيذية.
- Normal and field invoices now commit together with their accounting journal; posting errors roll back the commercial transaction.
- Hard, operational, monthly and account-derived tax locks cover central posting and legacy GRN, maritime and marketplace writers.
- Direct journal reversal is restricted to original manual entries. Commercial cancellation preserves cost centers and links each reversal to its original entry.
- Deferred purchase receipt excludes recoverable inclusive VAT and converts cartons to base-unit inventory cost before WAC and serial valuation.
- Carrier dispute credits post atomically, prevent repeat/over-crediting and reverse historical booked FX amounts.
- Executable PostgreSQL accounting scenarios are available through `npm --prefix backend run test:accounting-commercial`. No historical production balances are automatically rewritten.

---


<!-- migrated:cap-298:end -->

## 25 October 2026 — P0-C cross-module accounting checkpoint (NOT CLOSED)

- The shared return-cost engine now validates original sale-line/product provenance even when the return already has a stored unit cost; regression: `backend/test/critical/sales-return-cost.spec.ts`.
- The PostgreSQL accounting acceptance migration probe now requires the safe 253 rollback refusal while 255 composite MFA foreign keys depend on it.
- **Open P0:** `AccountingPostingService.toMoney` still quantizes every ledger line to two decimals, which is insufficient for KWD/OMR when the tenant's base currency has three decimals. No 3-digit ledger/valuation certification is claimed.
- **Open P0:** direct cash/stock writes in maintenance, trade-in and pharmacy require real atomic integration into posting and balance reports.
- Evidence and unfinished cycle/sector matrix: [P0-C checkpoint](docs/reviews/CROSS_MODULE_ACCOUNTING_INVENTORY_P0C_20261025.md). **Not release-verified.**


### P0-C 2026-10-25 — currency minor-unit ledger work (pending final CI)

- `backend/src/modules/accounting/engines/money-minor-units.engine.ts` defines strict integer minor-unit validation and rounding for KWD/OMR three-decimal currency and ordinary two-decimal currencies.
- `backend/src/modules/accounting/accounting-posting.service.ts` posts journal-entry lines using tenant base-currency digits and migration `2040000000256_currency_minor_unit_precision.ts` widens finance NUMERIC columns without truncating history on rollback.
- `backend/src/modules/accounting/pdc-currency.ts` rounds converted base amounts by base-currency digits; pure and disposable-PostgreSQL tests are included. Other module totals and reports need additional reconciliation before three-decimal release certification.

### P0-C 25 October 2026 — debt aging three-decimal view (review branch, verification pending)

- Financial report rounding utilities now accept explicit base-currency digits, preserving KWD/OMR minor units without changing two-decimal legacy callers.
- `ReportsSummaryService.debtAgingReport` reads tenant book precision and uses it for customer/supplier aging, totals and returned values; positive one-fil debt no longer vanishes behind a 0.01 SQL threshold.
- Unit assertions were added to `backend/test/infra/reports-summary.helper.spec.ts`. Full accounting/reporting certification and PostgreSQL backing-column widening are still outstanding; verify the SHA CI before declaring success.

### P0-C shared partner subledger minor units (2026-10-25, review branch)

- `backend/src/modules/accounting/partner-subledger.ts` now converts source-linked supplier and customer GL movements using validated tenant book minor units, rather than rounding to two decimals. This protects KWD/OMR payable/receivable balances posted from contracting, maritime and other central domain journals.
- Disposable PostgreSQL acceptance adds a real `0.001 KWD` cross-domain posting, verifies `supplier_ledger.amount`/`balance_after`, supplier balance, posted GL account 2110 and supplier balance report. **CI acceptance is pending on the new SHA.**
- Existing journal line and source/table precision still require sector-by-sector certification and legacy tenant reconciliation; P0-C not closed.
