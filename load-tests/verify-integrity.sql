-- ============================================================================================
--  ستة أسئلة تُسأل لقاعدة البيانات **بعد** جولة الحِمل الكاملة.
--
--  هذه — لا الـp95 — هي ما يجيب «هل نحن جاهزون للبيع؟». اختبار الحِمل يقول إن السيرفر استحمل؛
--  هذه تقول إن الدفاتر والمخزون لم يكذبا تحت التزاحم. وقد تعلّمنا الفرق بالطريقة الصعبة: جولة
--  24 سبتمبر 2026 كانت أرقام أدائها ممتازة بينما المنصة كلها تبيع بلا قيود محاسبية.
--
--  الاستعمال:
--    sudo docker exec -i zsystems-postgres psql -U postgres -d zsystems_db \
--      -v slug=hesham -f - < load-tests/verify-integrity.sql
--
--  أو مرّر المتغيّر مباشرةً:
--    psql ... -v slug=hesham -f load-tests/verify-integrity.sql
--
--  **كل صف يجب أن يعود صفراً.** أي رقم غير الصفر هو عطل حقيقي، لا ضجيج.
-- ============================================================================================

\if :{?slug}
\else
  \set slug 'hesham'
\endif

\echo ''
\echo '=== 1. قيد غير متوازن (مدين ≠ دائن) — يجب أن يكون صفراً ==='
SELECT count(*) AS unbalanced_entries
FROM (
  SELECT l.journal_entry_id
  FROM journal_entry_lines l
  JOIN journal_entries j ON j.id = l.journal_entry_id
  JOIN tenants t ON t.id = j.tenant_id
  WHERE t.slug = :'slug' AND j.status = 'posted'
  GROUP BY l.journal_entry_id
  HAVING round(sum(l.debit)::numeric, 2) <> round(sum(l.credit)::numeric, 2)
) x;

\echo ''
\echo '=== 2. صنف رصيده العام لا يساوي مجموع مخازنه — المخزون ضاع في مكان ما ==='
SELECT count(*) AS stock_ledger_mismatches
FROM products p
JOIN tenants t ON t.id = p.tenant_id
LEFT JOIN (
  SELECT tenant_id, product_id, sum(qty) AS located
  FROM product_location_stock
  GROUP BY tenant_id, product_id
) s ON s.tenant_id = p.tenant_id AND s.product_id = p.id
WHERE t.slug = :'slug'
  AND round(COALESCE(p.stock_qty, 0)::numeric, 3) <> round(COALESCE(s.located, 0)::numeric, 3);

\echo ''
\echo '=== 3. فاتورة بلا قيد محاسبي — البج الذي مرّ 2,281 مرة دون ملاحظة ==='
SELECT count(*) AS sales_without_journal
FROM sales sa
JOIN tenants t ON t.id = sa.tenant_id
WHERE t.slug = :'slug'
  AND sa.status <> 'draft'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entries j
    WHERE j.tenant_id = sa.tenant_id AND j.source_type = 'sale' AND j.source_id = sa.id
  );

\echo ''
\echo '=== 4. فشل ترحيل لم يُحَل بعد — العامل الدوري يعيد المحاولة كل خمس دقائق ==='
SELECT count(*) AS open_posting_failures,
       left(COALESCE(max(error_message), ''), 120) AS sample_error
FROM accounting_posting_failures f
JOIN tenants t ON t.id = f.tenant_id
WHERE t.slug = :'slug' AND f.resolved_at IS NULL;

\echo ''
\echo '=== 5. حجز يتيم: مخزون محجوز وطلبه لم يعد معلّقاً ==='
SELECT count(*) AS orphan_reservations
FROM online_orders o
JOIN tenants t ON t.id = o.tenant_id
WHERE t.slug = :'slug'
  AND o.stock_reserved = true
  AND o.status NOT IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery');

\echo ''
\echo '=== 6. مرتجع بلا قيد عكسي — المرتجع الذي خصم ولم يَرُدّ ==='
SELECT count(*) AS returns_without_journal
FROM return_documents r
JOIN tenants t ON t.id = r.tenant_id
WHERE t.slug = :'slug'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entries j
    WHERE j.tenant_id = r.tenant_id
      AND j.source_type IN ('sales_return', 'purchase_return')
      AND j.source_id = r.id
  );

\echo ''
\echo '=== الحصيلة (للسياق، ليست فحصاً) ==='
SELECT
  (SELECT count(*) FROM sales s JOIN tenants t ON t.id = s.tenant_id WHERE t.slug = :'slug') AS sales,
  (SELECT count(*) FROM journal_entries j JOIN tenants t ON t.id = j.tenant_id WHERE t.slug = :'slug') AS journals,
  (SELECT count(*) FROM return_documents r JOIN tenants t ON t.id = r.tenant_id WHERE t.slug = :'slug') AS returns,
  (SELECT count(*) FROM purchases p JOIN tenants t ON t.id = p.tenant_id WHERE t.slug = :'slug') AS purchases,
  (SELECT count(*) FROM online_orders o JOIN tenants t ON t.id = o.tenant_id WHERE t.slug = :'slug') AS online_orders,
  (SELECT sum(stock_qty) FROM products p JOIN tenants t ON t.id = p.tenant_id WHERE t.slug = :'slug') AS units;

\echo ''
\echo '=== صحة قاعدة البيانات نفسها ==='
SELECT deadlocks, xact_rollback, xact_commit FROM pg_stat_database WHERE datname = current_database();
