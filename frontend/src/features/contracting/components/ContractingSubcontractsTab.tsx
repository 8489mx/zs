import { useState } from 'react';
import { ContractingProject, ContractingSubcontract } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { RetentionLedgerModal } from './RetentionLedgerModal';
import { PaymentHoldsModal } from './PaymentHoldsModal';
import { CreateIpcInvoiceModal } from './CreateIpcInvoiceModal';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface ContractingSubcontractsTabProps {
  subcontracts: ContractingSubcontract[];
  loading: boolean;
  projectId?: string;
  projectName?: string;
  project?: ContractingProject | null;
  onNewSubcontract: () => void;
  onRefresh?: () => void;
}

export function ContractingSubcontractsTab({
  subcontracts,
  loading,
  projectId,
  projectName,
  project,
  onNewSubcontract,
  onRefresh,
}: ContractingSubcontractsTabProps) {
  const { currencySymbol } = useSystemCurrency();
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [isPaymentHoldsOpen, setIsPaymentHoldsOpen] = useState(false);
  const [selectedSubcontractForIpc, setSelectedSubcontractForIpc] = useState<ContractingSubcontract | null>(null);
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
  const totalInvoiced = subcontracts.reduce((sum, sc) => sum + Number(sc.totalInvoiced || 0), 0);
  const totalRetention = subcontracts.reduce((sum, sc) => sum + Number(sc.totalRetentionHeld || 0), 0);
  const totalRemaining = subcontracts.reduce(
    (sum, sc) =>
      sum +
      (sc.remainingCommitment !== undefined
        ? Number(sc.remainingCommitment)
        : Math.max(0, Number(sc.totalAmount || 0) - Number(sc.totalInvoiced || 0))),
    0,
  );

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
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.ShieldCheck size={15} />
            <span>ضمان الأعمال المحتجز ({totalRetention.toLocaleString('ar-EG')} {currencySymbol})</span>
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
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
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
              boxShadow: '0 1px 3px rgba(23, 14, 94, 0.15)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.Plus size={15} />
            <span>إسناد أعمال لمقاول باطن</span>
          </button>
        </div>
      </div>

      {/* بطاقة إجمالي الالتزامات والمؤشرات المالية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي عقود مقاولي الباطن</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {subcontracts.length} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>عقد</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الالتزامات التعاقدية</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
            {totalCommitted.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{currencySymbol}</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>المستخلص المنفذ للمقاولين</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
            {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{currencySymbol}</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>المتبقي من الالتزامات</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
            {totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{currencySymbol}</span>
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
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>رقم العقد ومقاول الباطن</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>نطاق الأعمال المسندة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>القيمة التعاقدية</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>المستخلص حتى الآن</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>المتبقي من الالتزام</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>ضمان الأعمال</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {subcontracts.map((sc) => {
                  const remaining =
                    sc.remainingCommitment !== undefined
                      ? Number(sc.remainingCommitment)
                      : Math.max(0, Number(sc.totalAmount || 0) - Number(sc.totalInvoiced || 0));
                  return (
                    <tr key={sc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                        <div>{sc.contractNumber}</div>
                        {sc.subcontractorName && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#2563eb', fontWeight: 600 }}>
                            {sc.subcontractorName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{sc.scopeOfWork}</div>
                        {sc.notes && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                            {sc.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                        {Number(sc.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencySymbol}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#2563eb' }}>
                        {Number(sc.totalInvoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencySymbol}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: remaining > 0 ? '#15803d' : '#64748b' }}>
                        {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencySymbol}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#a16207', fontWeight: 600 }}>
                        {sc.retentionPercent}%
                        {Number(sc.totalRetentionHeld || 0) > 0 && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#b45309' }}>
                            ({Number(sc.totalRetentionHeld).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {getStatusBadge(sc.status)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {project ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSubcontractForIpc(sc)}
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              background: '#170e5e',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <AppIcons.Receipt size={13} />
                            <span>مستخلص باطن</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 'var(--font-micro)', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {/* مودال إصدار مستخلص لمقاول الباطن */}
      {selectedSubcontractForIpc && project && (
        <CreateIpcInvoiceModal
          open={Boolean(selectedSubcontractForIpc)}
          project={project}
          initialIpcType="subcontractor"
          initialSubcontractId={selectedSubcontractForIpc.id}
          onClose={() => setSelectedSubcontractForIpc(null)}
          onCreated={() => {
            setSelectedSubcontractForIpc(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
