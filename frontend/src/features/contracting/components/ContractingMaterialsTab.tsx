import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ContractingMaterialRequisition } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { contractingApi } from '../api/contracting.api';
import { SupplierReturnsModal } from './SupplierReturnsModal';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { toast, systemConfirm } from '@/shared/components/system-alert';

interface ContractingMaterialsTabProps {
  requisitions: ContractingMaterialRequisition[];
  loading: boolean;
  projectId?: string;
  projectName?: string;
  onNewRequisition: () => void;
  onRequisitionDeleted: () => void;
}

export function ContractingMaterialsTab({
  requisitions,
  loading,
  projectId,
  projectName,
  onNewRequisition,
  onRequisitionDeleted,
}: ContractingMaterialsTabProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useSystemCurrency();
  const [isSupplierReturnsOpen, setIsSupplierReturnsOpen] = useState(false);
  const totalCost = requisitions.reduce((sum, r) => sum + Number(r.totalCost || 0), 0);
  const totalItemsCount = requisitions.length;

  const handleDelete = async (id: string) => {
    const confirmed = await systemConfirm({
      title: 'إلغاء إذن صرف المواد',
      message: 'هل أنت متأكد من إلغاء إذن صرف المواد هذا؟',
      confirmText: 'نعم، قم بالإلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await contractingApi.deleteMaterialRequisition(id);
      toast.success('تم إلغاء إذن صرف المواد بنجاح');
      onRequisitionDeleted();
    } catch (err: any) {
      toast.error(err?.message || 'فشل إلغاء إذن صرف المواد');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          width: '100%',
        }}
      >
        <div style={{ minWidth: '280px', flex: '1 1 auto' }}>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {t('contracting.contracting_materials_tab.s0', "أذون صرف وتخصيص الخامات للمشروع (Site Material Requisitions)")}
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {projectName ? `المشروع: ${projectName}` : t('contracting.contracting_materials_tab.s1', "حصر الخامات والمواد المنصرفة من المخازن وتحميل تكلفتها على بنود المقايسة")}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsSupplierReturnsOpen(true)}
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
            <AppIcons.RefreshCw size={15} />
            <span>{t('contracting.contracting_materials_tab.s2', "مرتجع الخامات للموردين (Credit Notes)")}</span>
          </button>

          <button
            type="button"
            onClick={onNewRequisition}
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
            <span>{t('contracting.contracting_materials_tab.s3', "إصدار إذن صرف خامات للموقع")}</span>
          </button>
        </div>
      </div>

      {/* مؤشرات التكلفة والخامات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', color: '#64748b' }}>{t('contracting.contracting_materials_tab.s4', "إجمالي تكلفة الخامات المنصرفة")}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
              {formatCurrency(totalCost)}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af' }}>
            <AppIcons.Box size={20} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', color: '#64748b' }}>{t('contracting.contracting_materials_tab.s5', "عدد أذون الصرف المسجلة")}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {totalItemsCount} <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, color: '#64748b' }}>{t('contracting.contracting_materials_tab.s6', "إذن صرف")}</span>
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <AppIcons.FileText size={20} />
          </div>
        </div>
      </div>

      {/* جدول أذون الصرف */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            {t('contracting.contracting_materials_tab.s7', "جاري تحميل أذون صرف الخامات...")}
          </div>
        ) : requisitions.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#64748b' }}>
              <AppIcons.Box size={24} />
            </div>
            <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
              {t('contracting.contracting_materials_tab.s8', "لا توجد أذون صرف مواد مسجلة لهذا المشروع")}
            </h3>
            <p style={{ fontSize: 'var(--font-body)', color: '#64748b', margin: '0 0 16px' }}>
              {t('contracting.contracting_materials_tab.s9', "يمكنك صرف الخامات والمواد مباشرة من المستودع وتحميل تكلفتها على بنود المقايسة ومركز تكلفة المشروع.")}
            </p>
            <button
              type="button"
              onClick={onNewRequisition}
              style={{
                height: '36px',
                padding: '0 18px',
                borderRadius: '8px',
                fontWeight: 600,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
              }}
            >
              {t('contracting.contracting_materials_tab.s10', "تسجيل أول إذن صرف مواد")}
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>{t('contracting.contracting_materials_tab.s11', "رقم الإذن والتاريخ")}</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>{t('contracting.contracting_materials_tab.s12', "بيان المادة أو الخامة")}</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>{t('contracting.contracting_materials_tab.s13', "الكمية المصروفة")}</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>{t('contracting.contracting_materials_tab.s14', "تكلفة الوحدة")}</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>{t('contracting.contracting_materials_tab.s15', "إجمالي التكلفة الفعلي")}</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155' }}>{t('contracting.contracting_materials_tab.s16', "المستلم بالموقع")}</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>{t('contracting.contracting_materials_tab.s17', "إجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                      <div>{req.requisitionNumber}</div>
                      <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>{req.issueDate}</span>
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', maxWidth: '280px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{req.itemName}</div>
                      {req.notes && (
                        <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                          {req.notes}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                      {Number(req.quantity).toLocaleString('en-US')} {req.unit}
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      {formatCurrency(req.unitCost)}
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                      {formatCurrency(req.totalCost)}
                    </td>

                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      {req.recipientName || '—'}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(req.id)}
                        title={t('contracting.contracting_materials_tab.s18', "إلغاء إذن الصرف")}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                      >
                        <AppIcons.Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال مرتجع المواد للموردين */}
      {isSupplierReturnsOpen && (
        <SupplierReturnsModal
          isOpen={isSupplierReturnsOpen}
          onClose={() => setIsSupplierReturnsOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}
    </div>
  );
}
