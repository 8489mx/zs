-- إصلاح لمرة واحدة للبند O65: سطور قيود المستأجر "المهندس" (almhnds) التي كسرها
-- الاسترجاع القديم من شاشة الإعدادات (قبل إصلاح settings-backup.service.ts).
--
-- الحالة قبل الإصلاح (قياس 22 سبتمبر 2026)، 24 سطراً من 37 في القيود القديمة
-- JE-00000005..08 و 12 و 18 و 19:
--   14 سطر تشير لحسابات غير موجودة: 143 (إيراد) و146 (مردودات) و148 (تكلفة)
--    3 سطور تشير للحساب 119 وهو حساب GRNI تابع لمستأجر آخر (default) بدل العملاء
--    7 سطور تشير للحساب 120 (GRNI) بدل المخزون
--
-- الحساب الصحيح لكل سطر مأخوذ من القيدين السليمين JE-00000009/10 لنفس المستأجر،
-- اللذين أنشأهما نفس كود الترحيل بنفس الأوصاف:
--   إيراد مبيعات الفاتورة -> 93 (4100)    تكلفة البضاعة المباعة -> 89 (5100)
--   مردودات مبيعات        -> 90 (4400)    مديونية عميل          -> 115 (1130)
--   إخراج/إرجاع مخزون     -> 114 (1140)
--
-- يغيّر الحساب فقط، ولا يلمس المبالغ، فكل قيد يبقى متوازناً. الـ trigger
-- trg_audit_journal_entry_lines يسجّل كل تعديل في tamper_audit_logs.
-- آمن للتشغيل مرتين: الشروط لا تطابق شيئاً بعد الإصلاح الأول.
--
-- التشغيل على السيرفر:
--   sudo docker exec -i zsystems-postgres psql -U postgres -d zsystems_db -v ON_ERROR_STOP=1 < repair-o65-almhnds-journal-accounts.sql

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE o65_fix (line_id bigint PRIMARY KEY, expected_old bigint, new_account bigint, description_prefix text) ON COMMIT DROP;
INSERT INTO o65_fix VALUES
  (2, 143, 93, 'إيراد مبيعات'),  (10, 143, 93, 'إيراد مبيعات'), (18, 143, 93, 'إيراد مبيعات'),
  (22, 143, 93, 'إيراد مبيعات'), (27, 143, 93, 'إيراد مبيعات'),
  (3, 148, 89, 'تكلفة البضاعة'), (11, 148, 89, 'تكلفة البضاعة'), (19, 148, 89, 'تكلفة البضاعة'),
  (23, 148, 89, 'تكلفة البضاعة'), (28, 148, 89, 'تكلفة البضاعة'),
  (8, 148, 89, 'عكس تكلفة'),     (16, 148, 89, 'عكس تكلفة'),
  (5, 146, 90, 'مردودات مبيعات'), (13, 146, 90, 'مردودات مبيعات'),
  (17, 119, 115, 'مديونية عميل'), (21, 119, 115, 'مديونية عميل'), (26, 119, 115, 'مديونية عميل'),
  (4, 120, 114, 'إخراج مخزون'),  (12, 120, 114, 'إخراج مخزون'), (20, 120, 114, 'إخراج مخزون'),
  (24, 120, 114, 'إخراج مخزون'), (29, 120, 114, 'إخراج مخزون'),
  (7, 120, 114, 'إرجاع المخزون'), (15, 120, 114, 'إرجاع المخزون');

DO $$
DECLARE
  t constant text := '2a506aa9-51ef-4f47-b66a-a2a8be0d0716';
  pending int;
  bad int;
BEGIN
  SELECT count(*) INTO pending
  FROM o65_fix f JOIN journal_entry_lines l ON l.id = f.line_id
  WHERE l.tenant_id = t AND l.account_id = f.expected_old;

  IF pending = 0 THEN
    RAISE NOTICE 'O65: nothing to repair (already fixed)';
    RETURN;
  END IF;
  IF pending <> 24 THEN
    RAISE EXCEPTION 'O65: expected 24 broken lines, found %. Data changed since 2026-09-22 — stop and review.', pending;
  END IF;

  -- every line must still carry the description the mapping was derived from
  SELECT count(*) INTO bad
  FROM o65_fix f JOIN journal_entry_lines l ON l.id = f.line_id
  WHERE l.description NOT LIKE f.description_prefix || '%';
  IF bad > 0 THEN RAISE EXCEPTION 'O65: % lines do not match their expected description', bad; END IF;

  -- every target account must exist in the same tenant
  SELECT count(*) INTO bad
  FROM (SELECT DISTINCT new_account FROM o65_fix) f
  WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts a WHERE a.id = f.new_account AND a.tenant_id = t);
  IF bad > 0 THEN RAISE EXCEPTION 'O65: % target accounts missing from the tenant chart', bad; END IF;

  UPDATE journal_entry_lines l SET account_id = f.new_account
  FROM o65_fix f
  WHERE l.id = f.line_id AND l.tenant_id = t AND l.account_id = f.expected_old;

  -- post-conditions for the whole database
  SELECT count(*) INTO bad FROM journal_entry_lines l
  WHERE NOT EXISTS (SELECT 1 FROM accounting_accounts a WHERE a.id = l.account_id);
  IF bad > 0 THEN RAISE EXCEPTION 'O65: % orphan journal lines remain', bad; END IF;

  SELECT count(*) INTO bad FROM journal_entry_lines l JOIN accounting_accounts a ON a.id = l.account_id
  WHERE a.tenant_id <> l.tenant_id;
  IF bad > 0 THEN RAISE EXCEPTION 'O65: % journal lines still point at another tenant''s account', bad; END IF;

  SELECT count(*) INTO bad FROM (
    SELECT journal_entry_id FROM journal_entry_lines WHERE tenant_id = t
    GROUP BY journal_entry_id HAVING sum(debit) <> sum(credit)
  ) x;
  IF bad > 0 THEN RAISE EXCEPTION 'O65: % entries are unbalanced', bad; END IF;

  RAISE NOTICE 'O65: repaired 24 journal lines; 0 orphans, 0 cross-tenant, all entries balanced';
END $$;

COMMIT;
