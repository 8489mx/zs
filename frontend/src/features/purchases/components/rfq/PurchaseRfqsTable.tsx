import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import type { PurchaseRfq } from '../../api/purchase-rfqs.api';
import { getRfqStatusBadge } from './types';

interface PurchaseRfqsTableProps {
  rfqs: PurchaseRfq[];
  loading: boolean;
  onOpenMatrix: (id: number) => void;
  onDelete: (id: number) => void;
}

export function PurchaseRfqsTable({
  rfqs,
  loading,
  onOpenMatrix,
  onDelete,
}: PurchaseRfqsTableProps) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>{t('purchases.rfq.purchase_rfqs_table.s0', "رقم الطلب")}</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>{t('purchases.rfq.purchase_rfqs_table.s1', "العنوان والوصف")}</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>{t('purchases.rfq.purchase_rfqs_table.s2', "تاريخ الإغلاق")}</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>{t('purchases.rfq.purchase_rfqs_table.s3', "الأصناف المطلوبة")}</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>{t('purchases.rfq.purchase_rfqs_table.s4', "العروض المستلمة")}</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569' }}>{t('purchases.rfq.purchase_rfqs_table.s5', "الحالة")}</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#475569', textAlign: 'center' }}>{t('purchases.rfq.purchase_rfqs_table.s6', "الإجراءات والمفاضلة")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                {t('purchases.rfq.purchase_rfqs_table.s7', "جاري تحميل طلبات عروض الأسعار...")}
              </td>
            </tr>
          ) : rfqs.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
                  <AppIcons.Box size={36} />
                </div>
                <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  {t('purchases.rfq.purchase_rfqs_table.s8', "لا توجد طلبات عروض أسعار حالياً")}
                </div>
                <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '440px', margin: '0 auto' }}>
                  {t('purchases.rfq.purchase_rfqs_table.s9', "يمكنك بدء استدراج عروض الأسعار والمفاضلة بين الموردين بإنشاء أول طلب الآن.")}
                </div>
              </td>
            </tr>
          ) : (
            rfqs.map((rfq) => {
            const badge = getRfqStatusBadge(rfq.status);
            const bidsCount = rfq.bids?.length || 0;
            const itemsCount = rfq.items?.length || 0;

            return (
              <tr
                key={rfq.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.15s',
                }}
              >
                <td style={{ padding: '14px 16px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>
                  {rfq.rfq_number}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{rfq.title}</div>
                  {rfq.notes && (
                    <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', marginTop: '2px' }}>
                      {rfq.notes}
                    </div>
                  )}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 'var(--font-body)', color: '#475569' }}>
                  {rfq.deadline_date ? new Date(rfq.deadline_date).toLocaleDateString('ar-EG') : t('purchases.rfq.purchase_rfqs_table.s10', "غير محدد")}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 'var(--font-body)' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{itemsCount}</span> {t('purchases.rfq.purchase_rfqs_table.s11', "أصناف")}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: 'var(--font-micro)',
                      fontWeight: 700,
                      backgroundColor: bidsCount > 0 ? '#ecfdf5' : '#f1f5f9',
                      color: bidsCount > 0 ? '#059669' : '#64748b',
                    }}
                  >
                    {bidsCount} {t('purchases.rfq.purchase_rfqs_table.s12', "عروض مقدمة")}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: 'var(--font-badge)',
                      fontWeight: 700,
                      backgroundColor: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      onClick={() => onOpenMatrix(rfq.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: 'var(--font-table-head)',
                        fontWeight: 700,
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        borderColor: '#bfdbfe',
                      }}
                    >
                      <AppIcons.FileText size={14} style={{ marginInlineEnd: '4px' }} />
                      {t('purchases.rfq.purchase_rfqs_table.s13', "مصفوفة المفاضلة (")}{bidsCount})
                    </Button>

                    {rfq.status !== 'converted_to_po' && (
                      <button
                        type="button"
                        onClick={() => onDelete(rfq.id)}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                        }}
                        title={t('purchases.rfq.purchase_rfqs_table.s14', "حذف الطلب")}
                      >
                        <AppIcons.Trash size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          }))}
        </tbody>
      </table>
    </div>
  );
}
