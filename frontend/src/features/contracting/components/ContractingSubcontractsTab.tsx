import { useState } from 'react';
import { ContractingSubcontract } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { RetentionLedgerModal } from './RetentionLedgerModal';
import { PaymentHoldsModal } from './PaymentHoldsModal';

interface ContractingSubcontractsTabProps {
  subcontracts: ContractingSubcontract[];
  loading: boolean;
  projectId?: string;
  projectName?: string;
  onNewSubcontract: () => void;
}

export function ContractingSubcontractsTab({
  subcontracts,
  loading,
  projectId,
  projectName,
  onNewSubcontract,
}: ContractingSubcontractsTabProps) {
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [isPaymentHoldsOpen, setIsPaymentHoldsOpen] = useState(false);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>عقد ساري</span>;
      case 'completed':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>مكتمل ومسلّم</span>;
      case 'terminated':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>مفسوخ</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>مسودة</span>;
    }
  };

  const totalCommitted = subcontracts.reduce((sum, sc) => sum + Number(sc.totalAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            إسناد أعمال مقاولي الباطن والالتزامات (Subcontract Commitments)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {projectName ? `المشروع: ${projectName}` : 'إدارة أوامر الإسناد، نسب الحجز، ونطاق الأعمال الموكولة للمقاولين'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* سجل ضمان الأعمال */}
          <button
            type="button"
            onClick={() => setIsRetentionModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#f8fafc',
              color: '#170e5e',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.ShieldCheck size={15} />
            <span>ضمان الأعمال المحتجز (Retentions)</span>
          </button>

          {/* حجز الدفعات للملاحظات الفنية */}
          <button
            type="button"
            onClick={() => setIsPaymentHoldsOpen(true)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#fff1f2',
              color: '#991b1b',
              border: '1px solid #fecdd3',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.AlertTriangle size={15} />
            <span>حجز الدفعات والملاحظات الفنية</span>
          </button>

          {/* زر إضافة إسناد */}
          <button
            type="button"
            onClick={onNewSubcontract}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 700,
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
            }}
          >
            <AppIcons.Plus size={15} />
            <span>إسناد أعمال لمقاول باطن</span>
          </button>
        </div>
      </div>

      {/* بطاقة إجمالي الالتزامات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي عقود مقاولي الباطن</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {subcontracts.length} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>عقد</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي قيمة التزامات مقاولي الباطن (Commitments)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
            {totalCommitted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* جدول العقود */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', fontWeight: 600 }}>جاري تحميل عقود مقاولي الباطن...</span>
          </div>
        ) : subcontracts.length === 0 ? (
          <div style={{ flex: 1, minHeight: '280px', padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              <AppIcons.Users size={48} />
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              لا توجد عقود مقاولي باطن مسجلة لهذا المشروع
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
              قم بإسناد الحزم التخصصية (أعمال كهروميكانيكية، عزل، دهانات...) لمقاولي الباطن لمتابعة التكاليف والمستخلصات.
            </div>
            <button
              type="button"
              onClick={onNewSubcontract}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                fontWeight: 700,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
              }}
            >
              إسناد أعمال جديد
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>رقم أمر التكليف</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>نطاق الأعمال المسندة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>القيمة الإجمالية</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>نسبة ضمان حسن التنفيذ</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>مدة التنفيذ</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {subcontracts.map((sc) => (
                  <tr key={sc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                      {sc.contractNumber}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', maxWidth: '340px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{sc.scopeOfWork}</div>
                      {sc.notes && (
                        <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                          {sc.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                      {Number(sc.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      {sc.retentionPercent}%
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      {sc.startDate ? `${sc.startDate} ~ ${sc.endDate || 'مستمر'}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {getStatusBadge(sc.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال سجل ضمان الأعمال المحتجز */}
      {isRetentionModalOpen && (
        <RetentionLedgerModal
          isOpen={isRetentionModalOpen}
          onClose={() => setIsRetentionModalOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}

      {/* مودال حجز الدفعات للملاحظات الفنية */}
      {isPaymentHoldsOpen && (
        <PaymentHoldsModal
          isOpen={isPaymentHoldsOpen}
          onClose={() => setIsPaymentHoldsOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}
    </div>
  );
}
