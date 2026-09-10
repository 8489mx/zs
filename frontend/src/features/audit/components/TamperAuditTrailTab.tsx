import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatDate } from '@/lib/format';
import {
  CheckCircleIcon,
  EyeIcon,
  FilterIcon,
  LockIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from '@/shared/components/icons/AppIcons';
import { tamperAuditApi } from '../api/tamper-audit.api';
import type { TamperAuditLogItem, TamperChainVerificationResult } from '../types/tamper-audit.types';
import { TamperAuditDiffModal } from './TamperAuditDiffModal';

const TABLE_OPTIONS = [
  { value: '', label: 'كافة الجداول المالية والمحاسبية' },
  { value: 'journal_entries', label: 'قيود اليومية (journal_entries)' },
  { value: 'journal_entry_lines', label: 'أطراف وسطور القيود (journal_entry_lines)' },
  { value: 'accounting_accounts', label: 'شجرة الحسابات (accounting_accounts)' },
  { value: 'accounting_settings', label: 'إعدادات الحسابات وتواريخ القفل (accounting_settings)' },
  { value: 'sales', label: 'فواتير المبيعات (sales)' },
  { value: 'sale_items', label: 'بنود فواتير المبيعات (sale_items)' },
  { value: 'purchases', label: 'فواتير المشتريات (purchases)' },
  { value: 'purchase_items', label: 'بنود فواتير المشتريات (purchase_items)' },
  { value: 'treasuries', label: 'الخزائن والحسابات البنكية (treasuries)' },
  { value: 'treasury_transactions', label: 'سندات القبض والصرف (treasury_transactions)' },
];

const OP_OPTIONS = [
  { value: '', label: 'كافة العمليات' },
  { value: 'INSERT', label: 'إضافة (INSERT)' },
  { value: 'UPDATE', label: 'تعديل (UPDATE)' },
  { value: 'DELETE', label: 'حذف (DELETE)' },
];

export function TamperAuditTrailTab() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [tableName, setTableName] = useState('');
  const [operation, setOperation] = useState<'' | 'INSERT' | 'UPDATE' | 'DELETE'>('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedItem, setSelectedItem] = useState<TamperAuditLogItem | null>(null);
  const [verificationResult, setVerificationResult] = useState<TamperChainVerificationResult | null>(null);

  // Fetch list query
  const listQuery = useQuery({
    queryKey: ['tamper-audit-list', { page, pageSize, tableName, operation, search, fromDate, toDate }],
    queryFn: () =>
      tamperAuditApi.list({
        page,
        pageSize,
        tableName: tableName || undefined,
        operation: operation || undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: () => tamperAuditApi.verifyChain(),
    onSuccess: (data) => {
      setVerificationResult(data);
    },
  });

  // Run initial verification once on mount
  useEffect(() => {
    verifyMutation.mutate();
  }, []);

  const items = listQuery.data?.items || [];
  const total = listQuery.data?.total || 0;
  const totalPages = listQuery.data?.totalPages || 1;

  const resetFilters = () => {
    setTableName('');
    setOperation('');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const getOpBadge = (op: string) => {
    switch (op) {
      case 'INSERT':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
            INSERT
          </span>
        );
      case 'UPDATE':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
            UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
            DELETE
          </span>
        );
      default:
        return <span>{op}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* ── 1. Cryptographic Integrity Status Card ────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LockIcon size={20} color="#170e5e" />
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#0f172a' }}>
                نزاهة السلسلة التشفيرية وسجلات قاعدة البيانات (DB Trigger Audit Engine)
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '780px' }}>
              تسجيل جنائي غير قابل للتلاعب يعمل بقوادح آلية في PostgreSQL وسلاسل تجزئة SHA-256 متسلسلة تضمن رصد أي حركة أو تعديل يتم من داخل السيرفر أو التطبيق بدقة فائقة.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="primary"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                borderRadius: '8px',
                cursor: verifyMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCwIcon size={14} className={verifyMutation.isPending ? 'animate-spin' : ''} />
              <span>{verifyMutation.isPending ? 'جارٍ الفحص التشفيري...' : 'فحص سلامة السلسلة الآن'}</span>
            </Button>
          </div>
        </div>

        {/* Verification Status Banner */}
        {verificationResult ? (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: verificationResult.isValid ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${verificationResult.isValid ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {verificationResult.isValid ? (
                <ShieldCheckIcon size={22} color="#16a34a" />
              ) : (
                <ShieldAlertIcon size={22} color="#dc2626" />
              )}
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: verificationResult.isValid ? '#166534' : '#991b1b' }}>
                  {verificationResult.isValid
                    ? 'السلسلة التشفيرية موثقة وسليمة 100% (Cryptographically Intact & Verified)'
                    : 'تحذير جنائي: تم اكتشاف انقطاع أو تلاعب في سلسلة التجزئة التشفيرية!'}
                </span>
                {verificationResult.violationReason ? (
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#b91c1c', fontWeight: 600 }}>
                    {verificationResult.violationReason}
                  </p>
                ) : (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#15803d' }}>
                    تم التحقق بنجاح من كافة كتل التجزئة المتسلسلة دون أي شبهة حذف أو تعديل يدوي في قاعدة البيانات.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#475569' }}>
              <div>
                <span style={{ color: '#64748b' }}>الكتل المفحوصة: </span>
                <strong style={{ color: '#0f172a' }}>{verificationResult.totalRecords} كتلة</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>توقيت الفحص: </span>
                <strong style={{ color: '#0f172a' }}>{formatDate(verificationResult.verifiedAt)}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 2. Filters Toolbar ────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <Field label="الجدول الخاضع للرقابة">
            <select
              value={tableName}
              onChange={(e) => {
                setTableName(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12.5px',
                background: '#ffffff',
                color: '#0f172a',
              }}
            >
              {TABLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="نوع العملية">
            <select
              value={operation}
              onChange={(e) => {
                setOperation(e.target.value as any);
                setPage(1);
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12.5px',
                background: '#ffffff',
                color: '#0f172a',
              }}
            >
              {OP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="بحث سريع (مستخدم، IP، رقم مستند)">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ابحث برقم المعاملة أو المستخدم..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 32px 0 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', top: '10px', right: '10px', pointerEvents: 'none', color: '#94a3b8' }}>
                <SearchIcon size={16} />
              </div>
            </div>
          </Field>

          <Field label="من تاريخ">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12.5px',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </Field>

          <Field label="إلى تاريخ">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12.5px',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button variant="secondary" onClick={resetFilters} style={{ padding: '6px 14px', fontSize: '12.5px' }}>
            تصفير الفلاتر
          </Button>
        </div>
      </div>

      {/* ── 3. Data Table ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterIcon size={16} color="#475569" />
            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              سجلات الرصد والتدقيق الجنائي ({total} سجل)
            </h4>
          </div>
          {listQuery.isFetching ? (
            <span style={{ fontSize: '12px', color: '#64748b' }}>جارٍ تحديث البيانات...</span>
          ) : null}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>#</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>الجدول المستهدف</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>رقم المعاملة (Record ID)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>العملية</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>الحقول المتأثرة</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>المنفذ</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>IP الشبكة</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>بصمة الهاش الرقمية</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>التاريخ والوقت</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CheckCircleIcon size={32} color="#94a3b8" />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                        لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        جميع العمليات على الجداول المالية تخضع للحفظ التلقائي عبر Database Triggers
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const changedCount = item.changed_fields ? Object.keys(item.changed_fields).length : 0;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>
                        {item.id}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                        {item.table_name}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#170e5e' }}>
                        #{item.record_id}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {getOpBadge(item.operation)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.operation === 'UPDATE' ? (
                          <span style={{ fontSize: '11.5px', color: '#475569' }}>
                            {changedCount > 0 ? `${changedCount} حقول متغيرة` : 'تحديث عام'}
                          </span>
                        ) : item.operation === 'INSERT' ? (
                          <span style={{ fontSize: '11.5px', color: '#166534' }}>إنشاء سجل كامل</span>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#991b1b' }}>حذف السجل نهائياً</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155' }}>
                        {item.user_username || item.db_user || 'نظام / DB'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                        {item.client_ip || '127.0.0.1'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                        <span title={item.row_hash} style={{ background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          {item.row_hash.slice(0, 10)}...{item.row_hash.slice(-6)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: '12px' }}>
                        {formatDate(item.created_at)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedItem(item)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <EyeIcon size={13} />
                          <span>عرض الفروقات</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 ? (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              الصفحة {page} من {totalPages} (إجمالي السجلات: {total})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                السابق
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                التالي
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 4. Diff & Cryptographic Modal ─────────────────────────────────── */}
      <TamperAuditDiffModal
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />
    </div>
  );
}
