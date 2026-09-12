import { useState } from 'react';
import { ContractingProject } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { GovernmentLicensesModal } from './GovernmentLicensesModal';
import { ProjectHealthWidget } from './ProjectHealthWidget';

interface ContractingProjectsTabProps {
  projects: ContractingProject[];
  loading: boolean;
  onSelectProject: (projectId: string, targetTab?: string) => void;
  onNewProject: () => void;
}

export function ContractingProjectsTab({
  projects,
  loading,
  onSelectProject,
  onNewProject,
}: ContractingProjectsTabProps) {
  const [licensesModal, setLicensesModal] = useState<{ open: boolean; projectId: string; projectName: string }>({
    open: false, projectId: '', projectName: '',
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            قيد التنفيذ
          </span>
        );
      case 'completed':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
            مكتمل ومسلّم
          </span>
        );
      case 'suspended':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            معلق مؤقتاً
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
            ملغي
          </span>
        );
      default:
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
            مسودة / قيد الدراسة
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* هيدر التبويب مع زر الإضافة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            سجل المشاريع الإنشائية والعقود (Construction Projects)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            متابعة العقود، مراكز التكلفة التحليلية، والقيم التعاقدية المعدلة بالأوامر التغييرية
          </p>
        </div>
        <button
          type="button"
          onClick={onNewProject}
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
          <span>مشروع جديد</span>
        </button>
      </div>

      {/* جدول المشاريع */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            جاري تحميل سجل المشاريع...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              <AppIcons.Building size={48} />
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              لا توجد مشاريع إنشائية مسجلة حتى الآن
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
              قم بإضافة أول مشروع إنشائي لربطه تلقائياً بمركز تكلفة تحليلي وإصدار جداول الكميات والمستخلصات.
            </div>
            <button
              type="button"
              onClick={onNewProject}
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
              إضافة مشروع جديد
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <table style={{ width: '100%', minWidth: '1060px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right' }}>
              <colgroup>
                <col style={{ width: '105px' }} />
                <col style={{ width: '185px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '105px' }} />
                <col style={{ width: '105px' }} />
                <col style={{ width: '105px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '105px' }} />
                <col style={{ width: '65px' }} />
                <col style={{ width: '85px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 6px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الكود</th>
                  <th style={{ padding: '10px 8px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>المشروع والموقع</th>
                  <th style={{ padding: '10px 8px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>العميل</th>
                  <th style={{ padding: '10px 8px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>المدير</th>
                  <th style={{ padding: '10px 6px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>التعاقد الأصلي</th>
                  <th style={{ padding: '10px 6px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>القيمة المعدلة</th>
                  <th style={{ padding: '10px 6px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الدفعة المقدمة</th>
                  <th style={{ padding: '10px 6px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '10px 4px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الصحة</th>
                  <th style={{ padding: '10px 6px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((prj) => {
                  const hasChanges = (prj.revisedContractValue || prj.contractValue) !== prj.contractValue;
                  return (
                    <tr key={prj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#170e5e', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '5px', fontSize: '0.78rem' }}>
                          {prj.code}
                        </span>
                      </td>
                      <td style={{ padding: '8px 8px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={prj.name}>{prj.name}</div>
                        {prj.locationAddress && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={prj.locationAddress}>
                            {prj.locationAddress}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 8px', fontSize: 'var(--font-body)', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', verticalAlign: 'middle' }} title={prj.clientName || ''}>
                        {prj.clientName || '—'}
                      </td>
                      <td style={{ padding: '8px 8px', fontSize: 'var(--font-body)', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', verticalAlign: 'middle' }} title={prj.projectManager || ''}>
                        {prj.projectManager || '—'}
                      </td>
                      <td style={{ padding: '8px 6px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        {Number(prj.contractValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 6px', fontSize: '0.8rem', fontWeight: 700, color: hasChanges ? '#1e40af' : '#0f172a', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        {Number(prj.revisedContractValue || prj.contractValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        {hasChanges && (
                          <span style={{ display: 'block', fontSize: '9.5px', color: '#2563eb', fontWeight: 600 }}>
                            معدل
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        {Number(prj.downPaymentAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {getStatusBadge(prj.status)}
                      </td>
                      {/* Health Score */}
                      <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <ProjectHealthWidget projectId={prj.id} />
                      </td>
                      {/* Actions - Stacked Vertically */}
                      <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onSelectProject(prj.id, 'boq')}
                            style={{
                              width: '70px',
                              height: '21px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            المقايسة
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectProject(prj.id, 'invoices')}
                            style={{
                              width: '70px',
                              height: '21px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            المستخلصات
                          </button>
                          <button
                            type="button"
                            onClick={() => setLicensesModal({ open: true, projectId: prj.id, projectName: prj.name })}
                            style={{
                              width: '70px',
                              height: '21px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            تراخيص
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Government Licenses Modal */}
      <GovernmentLicensesModal
        open={licensesModal.open}
        onClose={() => setLicensesModal(p => ({ ...p, open: false }))}
        projectId={licensesModal.projectId}
        projectName={licensesModal.projectName}
      />
    </div>
  );
}
