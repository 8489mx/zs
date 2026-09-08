import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  PrinterIcon,
  LayersIcon,
  TrashIcon,
} from '@/shared/components/icons/AppIcons';
import type { SettlementRecord } from '../../api/end-of-service.api';

interface SettlementsTableProps {
  settlements: SettlementRecord[];
  loading: boolean;
  postingId: number | null;
  onPostAccounting: (settlement: SettlementRecord) => void;
  onPrint: (settlement: SettlementRecord) => void;
  onDelete: (id: number) => void;
}

export function SettlementsTable({
  settlements,
  loading,
  postingId,
  onPostAccounting,
  onPrint,
  onDelete,
}: SettlementsTableProps) {
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        جاري تحميل سجل المخالصات...
      </div>
    );
  }

  if (settlements.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#94a3b8' }}>
          <FileTextIcon size={28} />
        </div>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: '0 0 6px' }}>لا توجد مخالصات مسجلة حتى الآن</h4>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>اضغط على "إنشاء مخالصة جديدة" بالأعلى لتصفية مستحقات موظف واحتساب مكافأته</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>رقم المخالصة</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>الموظف</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>تاريخ الإنهاء والسبب</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>مدة الخدمة</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>مكافأة نهاية الخدمة</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>صافي المخالصة</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>إخلاء العهد</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>الحالة</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {settlements.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#170e5e' }}>
                {s.settlementNo}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.employeeName}</div>
                {s.employeeNo && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>كود: {s.employeeNo}</div>}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 600 }}>{s.terminationDate}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {s.terminationReason === 'resignation' ? 'استقالة' : s.terminationReason === 'termination' ? 'فصل / إنهاء من الشركة' : s.terminationReason === 'contract_end' ? 'انتهاء العقد' : 'أخرى'}
                </div>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 600 }}>{s.serviceYears} سنوات</div>
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                {formatCurrency(s.gratuityAmount)}
              </td>
              <td style={{ padding: '12px 16px', fontWeight: 800, color: '#15803d', fontSize: '0.95rem' }}>
                {formatCurrency(s.netSettlementAmount)}
              </td>
              <td style={{ padding: '12px 16px' }}>
                {s.custodyCleared ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d', fontSize: '0.75rem', fontWeight: 600, background: '#f0fdf4', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                    <CheckCircleIcon size={12} /> تم إخلاء الطرف
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#b45309', fontSize: '0.75rem', fontWeight: 600, background: '#fffbeb', padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                    <ClockIcon size={12} /> عهد معلقة
                  </span>
                )}
              </td>
              <td style={{ padding: '12px 16px' }}>
                {s.status === 'posted' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700, background: '#eff6ff', padding: '2px 8px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                    <CheckCircleIcon size={12} /> مرحل محاسبياً
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.75rem', fontWeight: 600, background: '#f8fafc', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    مسودة
                  </span>
                )}
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onPrint(s)}
                    style={{ padding: '5px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title="طباعة نموذج المخالصة الرسمية وإخلاء الطرف"
                  >
                    <PrinterIcon size={14} />
                    <span>طباعة A4</span>
                  </Button>

                  {s.status !== 'posted' && (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={postingId === s.id}
                      onClick={() => onPostAccounting(s)}
                      style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#170e5e', borderColor: '#170e5e', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      title="توليد وترحيل القيد المحاسبي لليومية العامة"
                    >
                      <LayersIcon size={14} />
                      <span>{postingId === s.id ? 'جارٍ الترحيل...' : 'ترحيل القيد'}</span>
                    </Button>
                  )}

                  {s.status !== 'posted' && (
                    <button
                      type="button"
                      onClick={() => onDelete(s.id)}
                      style={{ padding: 6, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6 }}
                      title="حذف المسودة"
                    >
                      <TrashIcon size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
