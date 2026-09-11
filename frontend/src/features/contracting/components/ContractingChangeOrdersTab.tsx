import { useState } from 'react';
import { ContractingChangeOrder } from '../contracting.types';
import { contractingApi } from '../api/contracting.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContractingChangeOrdersTabProps {
  changeOrders: ContractingChangeOrder[];
  loading: boolean;
  projectName?: string;
  onNewChangeOrder: () => void;
  onRefresh: () => void;
}

export function ContractingChangeOrdersTab({
  changeOrders,
  loading,
  projectName,
  onNewChangeOrder,
  onRefresh,
}: ContractingChangeOrdersTabProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await contractingApi.updateChangeOrderStatus(id, { status });
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث حالة الأمر التغييري');
    } finally {
      setUpdatingId(null);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'cost_only':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--font-micro)', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>أثر مالي فقط</span>;
      case 'time_only':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--font-micro)', fontWeight: 600, background: '#e0e7ff', color: '#3730a3' }}>تمديد زمني فقط</span>;
      case 'cost_and_time':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--font-micro)', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>مالي وتمديد زمني</span>;
      default:
        return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--font-micro)', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>تغيير عام</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>معتمد ومضاف للعقد</span>;
      case 'rejected':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>مرفوض</span>;
      case 'pending_client':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>بانتظار اعتماد المالك</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>مسودة داخلية</span>;
    }
  };

  const totalCostImpact = changeOrders.filter(co => co.status === 'approved').reduce((sum, co) => sum + Number(co.costImpact || 0), 0);
  const totalDaysImpact = changeOrders.filter(co => co.status === 'approved').reduce((sum, co) => sum + Number(co.timeImpactDays || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            الأوامر التغييرية والمطالبات (Change Orders & Variations)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {projectName ? `المشروع: ${projectName}` : 'توثيق واعتماد تعديلات نطاق الأعمال والتكاليف والمدد الزمنية'}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewChangeOrder}
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
          <span>أمر تغييري جديد (PCO/CCO)</span>
        </button>
      </div>

      {/* شريط الإحصائيات للأوامر المعتمدة */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الأوامر التغييرية</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {changeOrders.length} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>أمر</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>صافي الأثر المالي المعتمد (+ / -)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: totalCostImpact >= 0 ? '#1e40af' : '#b91c1c', marginTop: '2px' }}>
            {totalCostImpact.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي التمديد الزمني المعتمد</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {totalDaysImpact} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>يوم تقويمي</span>
          </div>
        </div>
      </div>

      {/* جدول الأوامر التغييرية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', fontWeight: 600 }}>جاري تحميل الأوامر التغييرية...</span>
          </div>
        ) : changeOrders.length === 0 ? (
          <div style={{ flex: 1, minHeight: '280px', padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              <AppIcons.FileCheck size={48} />
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              لا توجد أوامر تغييرية مسجلة لهذا المشروع
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
              عند طلب المالك أو الاستشاري أي تعديل في التصميم أو الكميات أو مدد التنفيذ، سجل أمر تغييري لضمان الحقوق المالية والقانونية.
            </div>
            <button
              type="button"
              onClick={onNewChangeOrder}
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
              إصدار أمر تغييري جديد
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>رقم الأمر</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>موضوع التغيير</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>النوع</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الأثر المالي (+ / -)</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>التمديد الزمني</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>إجراءات الاعتماد</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co) => (
                  <tr key={co.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                      {co.changeOrderNumber}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{co.title}</div>
                      {co.reason && (
                        <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {co.reason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {getTypeBadge(co.impactType)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: Number(co.costImpact) >= 0 ? '#1e40af' : '#b91c1c' }}>
                      {Number(co.costImpact || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#0f172a' }}>
                      {co.timeImpactDays ? `${co.timeImpactDays} يوم` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {getStatusBadge(co.status)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {co.status !== 'approved' && (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            disabled={updatingId === co.id}
                            onClick={() => handleUpdateStatus(co.id, 'approved')}
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              background: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            اعتماد الأمر
                          </button>
                          {co.status !== 'rejected' && (
                            <button
                              type="button"
                              disabled={updatingId === co.id}
                              onClick={() => handleUpdateStatus(co.id, 'rejected')}
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                fontSize: 'var(--font-badge)',
                                fontWeight: 600,
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                cursor: 'pointer',
                              }}
                            >
                              رفض
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
