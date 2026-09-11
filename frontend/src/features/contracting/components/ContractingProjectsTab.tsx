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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>كود المشروع</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>اسم المشروع</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>العميل / المالك</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>مدير المشروع</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>القيمة التعاقدية الأصلية</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>القيمة المعدلة (بالتغييرات)</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الدفعة المقدمة</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>صحة المشروع</th>
                  <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((prj) => {
                  const hasChanges = (prj.revisedContractValue || prj.contractValue) !== prj.contractValue;
                  return (
                    <tr key={prj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                        {prj.code}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                        <div>{prj.name}</div>
                        {prj.locationAddress && (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8' }}>
                            {prj.locationAddress}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        {prj.clientName || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        {prj.projectManager || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                        {Number(prj.contractValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', fontWeight: 700, color: hasChanges ? '#1e40af' : '#0f172a' }}>
                        {Number(prj.revisedContractValue || prj.contractValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {hasChanges && (
                          <span style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#2563eb' }}>
                            معدل بأوامر تغييرية
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--font-body)', color: '#475569' }}>
                        {Number(prj.downPaymentAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(prj.status)}
                      </td>
                      {/* Health Score */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <ProjectHealthWidget projectId={prj.id} />
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => onSelectProject(prj.id, 'boq')}
                            style={{
                              height: '30px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                            }}
                          >
                            جدول الكميات
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectProject(prj.id, 'invoices')}
                            style={{
                              height: '30px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              cursor: 'pointer',
                            }}
                          >
                            المستخلصات
                          </button>
                          <button
                            type="button"
                            onClick={() => setLicensesModal({ open: true, projectId: prj.id, projectName: prj.name })}
                            style={{
                              height: '30px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                              cursor: 'pointer',
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
