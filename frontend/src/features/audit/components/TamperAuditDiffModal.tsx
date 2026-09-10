import { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { formatDate } from '@/lib/format';
import { CheckIcon, FileTextIcon, LockIcon } from '@/shared/components/icons/AppIcons';
import type { TamperAuditLogItem } from '../types/tamper-audit.types';

interface TamperAuditDiffModalProps {
  open: boolean;
  onClose: () => void;
  item: TamperAuditLogItem | null;
}

export function TamperAuditDiffModal({ open, onClose, item }: TamperAuditDiffModalProps) {
  const [copiedKey, setCopiedKey] = useState<'prev' | 'row' | null>(null);

  if (!item) return null;

  const handleCopyHash = (type: 'prev' | 'row', hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedKey(type);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const isUpdate = item.operation === 'UPDATE';
  const isInsert = item.operation === 'INSERT';
  const isDelete = item.operation === 'DELETE';

  const changedFieldsObj = item.changed_fields || {};
  const changedFieldEntries = Object.entries(changedFieldsObj);

  const getOpBadgeStyle = () => {
    switch (item.operation) {
      case 'INSERT':
        return { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
      case 'UPDATE':
        return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
      case 'DELETE':
        return { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
      default:
        return { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };
    }
  };

  const getOpLabel = () => {
    switch (item.operation) {
      case 'INSERT':
        return 'إضافة جديدة (INSERT)';
      case 'UPDATE':
        return 'تعديل بيانات (UPDATE)';
      case 'DELETE':
        return 'حذف نهائي (DELETE)';
      default:
        return item.operation;
    }
  };

  const renderValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>فارغ (null)</span>;
    }
    if (typeof val === 'boolean') {
      return val ? 'نعم (true)' : 'لا (false)';
    }
    if (typeof val === 'object') {
      return (
        <pre
          style={{
            margin: 0,
            fontSize: '11px',
            background: 'rgba(0,0,0,0.03)',
            padding: '4px 6px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return String(val);
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تفاصيل التدقيق الجنائي المشفّر وفوارق الحقول"
      subtitle={`سجل #${item.id} — الجدول: ${item.table_name} — السجل رقم: ${item.record_id}`}
      width="min(820px, 96vw)"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} style={{ padding: '8px 20px', fontSize: '13px' }}>
            إغلاق النافذة
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Metadata Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>نوع العملية</span>
            <span
              style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                ...getOpBadgeStyle(),
              }}
            >
              {getOpLabel()}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>المنفذ / المستخدم</span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
              {item.user_username || item.db_user || 'غير محدد'}
              {item.user_id ? ` (#${item.user_id})` : ''}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>عنوان الشبكة (IP)</span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a', direction: 'ltr', display: 'inline-block' }}>
              {item.client_ip || '127.0.0.1'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>توقيت التسجيل البنكي</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
              {formatDate(item.created_at)}
            </span>
          </div>
        </div>

        {/* Cryptographic Hash Chaining Box */}
        <div
          style={{
            background: '#fcfdff',
            border: '1px solid #dbeafe',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockIcon size={16} color="#1d4ed8" />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e3a8a' }}>
              سلسلة التجزئة التشفيرية الرقمية (SHA-256 Hash Chain)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {/* Previous Hash */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>الهاش السابق (Previous Block Hash):</span>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>
                  {item.prev_hash || '0000000000000000000000000000000000000000000000000000000000000000 (Genesis)'}
                </span>
              </div>
              {item.prev_hash ? (
                <button
                  type="button"
                  onClick={() => handleCopyHash('prev', item.prev_hash!)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === 'prev' ? <CheckIcon size={12} color="#16a34a" /> : null}
                  <span>{copiedKey === 'prev' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              ) : null}
            </div>

            {/* Current Row Hash */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#eff6ff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1e40af' }}>هاش السجل الحالي (Current Row Hash):</span>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#1d4ed8', fontWeight: 700, wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>
                  {item.row_hash}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyHash('row', item.row_hash)}
                style={{
                  border: '1px solid #93c5fd',
                  background: '#ffffff',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#1e40af',
                  fontWeight: 600,
                }}
              >
                {copiedKey === 'row' ? <CheckIcon size={12} color="#16a34a" /> : null}
                <span>{copiedKey === 'row' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Diff Table or Payload */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileTextIcon size={16} color="#0f172a" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              {isUpdate ? 'فوارق الحقول المعدّلة (Field-Level Audit Diff)' : 'بيانات السجل المحفوظة في قاعدة البيانات'}
            </h4>
          </div>

          {isUpdate ? (
            changedFieldEntries.length > 0 ? (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', width: '25%' }}>اسم الحقل</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#991b1b', width: '37.5%', background: '#fef2f2' }}>القيمة السابقة (Old Value)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#166534', width: '37.5%', background: '#f0fdf4' }}>القيمة الجديدة (New Value)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changedFieldEntries.map(([fieldName, diff]) => (
                      <tr key={fieldName} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b', direction: 'ltr', textAlign: 'right', fontFamily: 'monospace' }}>
                          {fieldName}
                        </td>
                        <td style={{ padding: '8px 12px', background: '#fffcfc', color: '#991b1b', borderInlineEnd: '1px solid #fee2e2' }}>
                          {renderValue(diff?.old)}
                        </td>
                        <td style={{ padding: '8px 12px', background: '#fcfdfc', color: '#166534' }}>
                          {renderValue(diff?.new)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                لا توجد فوارق مسجلة في الحقول.
              </div>
            )
          ) : isInsert ? (
            <div style={{ maxHeight: '280px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
              <pre style={{ margin: 0, fontSize: '12px', color: '#0f172a', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(item.new_values, null, 2)}
              </pre>
            </div>
          ) : isDelete ? (
            <div style={{ maxHeight: '280px', overflowY: 'auto', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
              <pre style={{ margin: 0, fontSize: '12px', color: '#991b1b', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(item.old_values, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </StandardDialog>
  );
}
