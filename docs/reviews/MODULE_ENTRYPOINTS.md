# خريطة دخول الموديولات والشاشات — دليل اكتشاف، لا ملكية قطعية

**لقطة دليل المسارات:** `05433c03cc352160bf216f1b3d27375b20ca280f` (25 أكتوبر 2026). تم استخراج أسماء مجلدات `backend/src/modules/` و`frontend/src/features/` من GitHub، مع ترشيحات استهلاك UI عبر أسماء متشابهة وملاحظات الربط بين المجالات. **لا تستنتج أن مجلد UI يملك API أو أن المسارات المتشابهة آمنة بمجرد وجودها.**

ابدأ بـ[خريطة النظام](../../SYSTEM_BLUEPRINT.md) ثم [نموذج تتبع العملية](WORKFLOW_TRACE_TEMPLATE.md). ملف [`frontend/src/app/router/registry.ts`](../../frontend/src/app/router/registry.ts) ونظام التسجيل داخل مجلد كل feature يوضحان المسارات الحقيقية؛ افحص أيضاً [واجهة HTTP](../../frontend/src/lib/http.ts) وخدمات الباك إند والحراس وSQL عند مراجعة أي شاشة.

| موديول الباك إند | مدخل تنفيذ الموديول | مجلدات UI مرشحة للاستهلاك (ليست علاقة 1:1) |
| --- | --- | --- |
| `accounting` | [`backend`](../../backend/src/modules/accounting/) | [`accounting`](../../frontend/src/features/accounting/) |
| `activation` | [`backend`](../../backend/src/modules/activation/) | [`activation`](../../frontend/src/features/activation/) |
| `addons` | [`backend`](../../backend/src/modules/addons/) | [`pos`](../../frontend/src/features/pos/)، [`products`](../../frontend/src/features/products/) |
| `ai-copilot` | [`backend`](../../backend/src/modules/ai-copilot/) | [`ai-copilot`](../../frontend/src/features/ai-copilot/) |
| `approvals` | [`backend`](../../backend/src/modules/approvals/) | [`approvals`](../../frontend/src/features/approvals/) |
| `bosta` | [`backend`](../../backend/src/modules/bosta/) | [`storefront`](../../frontend/src/features/storefront/) |
| `cash-drawer` | [`backend`](../../backend/src/modules/cash-drawer/) | [`cash-drawer`](../../frontend/src/features/cash-drawer/) |
| `catalog` | [`backend`](../../backend/src/modules/catalog/) | [`products`](../../frontend/src/features/products/) |
| `contracting` | [`backend`](../../backend/src/modules/contracting/) | [`contracting`](../../frontend/src/features/contracting/) |
| `crm` | [`backend`](../../backend/src/modules/crm/) | [`crm`](../../frontend/src/features/crm/) |
| `delivery-reps` | [`backend`](../../backend/src/modules/delivery-reps/) | [`delivery-reps`](../../frontend/src/features/delivery-reps/) |
| `gcc-shipping` | [`backend`](../../backend/src/modules/gcc-shipping/) | [`storefront`](../../frontend/src/features/storefront/) |
| `hr` | [`backend`](../../backend/src/modules/hr/) | [`hr`](../../frontend/src/features/hr/) |
| `import-sales` | [`backend`](../../backend/src/modules/import-sales/) | [`import-sales`](../../frontend/src/features/import-sales/) |
| `inventory` | [`backend`](../../backend/src/modules/inventory/) | [`inventory`](../../frontend/src/features/inventory/)، [`products`](../../frontend/src/features/products/) |
| `maintenance` | [`backend`](../../backend/src/modules/maintenance/) | [`maintenance`](../../frontend/src/features/maintenance/) |
| `manager-actions` | [`backend`](../../backend/src/modules/manager-actions/) | [`approvals`](../../frontend/src/features/approvals/) |
| `manufacturing` | [`backend`](../../backend/src/modules/manufacturing/) | [`manufacturing`](../../frontend/src/features/manufacturing/) |
| `maritime-freight` | [`backend`](../../backend/src/modules/maritime-freight/) | [`maritime-freight`](../../frontend/src/features/maritime-freight/) |
| `partners` | [`backend`](../../backend/src/modules/partners/) | [`accounts`](../../frontend/src/features/accounts/)، [`customers`](../../frontend/src/features/customers/)، [`suppliers`](../../frontend/src/features/suppliers/) |
| `pharmacy` | [`backend`](../../backend/src/modules/pharmacy/) | [`pharmacy`](../../frontend/src/features/pharmacy/) |
| `pricing` | [`backend`](../../backend/src/modules/pricing/) | [`pricing-center`](../../frontend/src/features/pricing-center/) |
| `public` | [`backend`](../../backend/src/modules/public/) | [`public-trial`](../../frontend/src/features/public-trial/) |
| `purchases` | [`backend`](../../backend/src/modules/purchases/) | [`purchases`](../../frontend/src/features/purchases/) |
| `reports` | [`backend`](../../backend/src/modules/reports/) | [`reports`](../../frontend/src/features/reports/)، [`dashboard`](../../frontend/src/features/dashboard/) |
| `returns` | [`backend`](../../backend/src/modules/returns/) | [`returns`](../../frontend/src/features/returns/) |
| `saas-admin` | [`backend`](../../backend/src/modules/saas-admin/) | [`saas-admin`](../../frontend/src/features/saas-admin/) |
| `sales` | [`backend`](../../backend/src/modules/sales/) | [`sales`](../../frontend/src/features/sales/)، [`pos`](../../frontend/src/features/pos/) |
| `services` | [`backend`](../../backend/src/modules/services/) | [`services`](../../frontend/src/features/services/) |
| `sessions` | [`backend`](../../backend/src/modules/sessions/) | [`auth`](../../frontend/src/features/auth/) |
| `settings` | [`backend`](../../backend/src/modules/settings/) | [`settings`](../../frontend/src/features/settings/)، [`apps-store`](../../frontend/src/features/apps-store/)، [`updates`](../../frontend/src/features/updates/) |
| `storefront` | [`backend`](../../backend/src/modules/storefront/) | [`storefront`](../../frontend/src/features/storefront/) |
| `tax-integration` | [`backend`](../../backend/src/modules/tax-integration/) | [`tax-integration`](../../frontend/src/features/tax-integration/) |
| `tenant-subscription` | [`backend`](../../backend/src/modules/tenant-subscription/) | [`saas-admin`](../../frontend/src/features/saas-admin/)، [`settings`](../../frontend/src/features/settings/) |
| `tradein` | [`backend`](../../backend/src/modules/tradein/) | [`tradein`](../../frontend/src/features/tradein/) |
| `treasury` | [`backend`](../../backend/src/modules/treasury/) | [`treasury`](../../frontend/src/features/treasury/) |
| `users` | [`backend`](../../backend/src/modules/users/) | [`auth`](../../frontend/src/features/auth/) |

## واجهات مشتركة لا يُستنتج مالكها من الاسم

[`audit`](../../frontend/src/features/audit/)، [`not-found`](../../frontend/src/features/not-found/)، [`portals-hub`](../../frontend/src/features/portals-hub/)

## البحث عن مسارات الشاشة أو الـAPI

1. حدّد الـURL والشاشة الفعلية من `frontend/src/app/router` وملف feature المعني؛ ابحث عن API method وHTTP client.
2. ابحث عن Controller method والـDTO والحراس الصريحة والمطبقة عالمياً، ثم اتبع service function واستدعاءات `common` والدفاتر وSQL.
3. لا تعتمد على كلمة `@Controller` وحدها: التسجيل الديناميكي، الخدمات المشتركة و`@Global()` وعلاقات `source_type/source_id` قد تتجاوز حدود مجلد الموديول.
4. حدّث هذا الدليل فقط عند تبديل تقسيم المجلدات/الترشيحات، وأكمل الربط المؤكد داخل تقرير العملية الفردية. لا تكتب «تم فحص كل الشاشات» قبل إثبات التغطية بأسماء routes وAPI.
