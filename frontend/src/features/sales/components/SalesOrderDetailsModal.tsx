import { useTranslation } from 'react-i18next';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesOrdersApi, SalesOrderRecord } from '../api/sales-orders.api';
import { workOrdersApi } from '@/features/manufacturing/api/work-orders.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { getSalesOrderStatusBadge } from './SalesOrdersTable';

interface SalesOrderDetailsModalProps {
  order: SalesOrderRecord | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  onConvert: (id: number, orderNumber: string) => void;
}

export const SalesOrderDetailsModal: React.FC<SalesOrderDetailsModalProps> = ({
  order,
  open,
  onClose,
  onConfirm,
  onConvert,
}) => {
  const { t } = useTranslation();
  const { data: orderDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['sales-order-details', order?.id],
    queryFn: () => salesOrdersApi.getById(order!.id),
    enabled: Boolean(order?.id && open),
  });

  if (!open || !order) return null;

  const modalFooter = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {orderDetailsData?.status === 'draft' && (
          <Button
            variant="primary"
            onClick={() => onConfirm(orderDetailsData.id)}
            style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12px' }}
          >
            {t('sales.sales_order_details_modal.s0', "تأكيد أمر البيع وحجز المخزون")}
          </Button>
        )}

        {(orderDetailsData?.status === 'confirmed' || orderDetailsData?.status === 'draft') && (
          <Button
            variant="success"
            onClick={() => onConvert(orderDetailsData.id, orderDetailsData.order_number)}
            style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '12px' }}
          >
            {t('sales.sales_order_details_modal.s1', "تحويل إلى فاتورة بيع وخصم المخزون")}
          </Button>
        )}

        {(orderDetailsData?.status === 'confirmed' || orderDetailsData?.status === 'draft') && (
          <Button
            variant="secondary"
            onClick={async () => {
              const firstItem = orderDetailsData?.items?.[0];
              if (!firstItem) return;
              const confirmed = await systemConfirm({
                title: t('sales.sales_order_details_modal.s2', "توليد أمر تشغيل وتصنيع (MTO)"),
                message: `هل ترغب في توليد أمر تصنيع وتشغيل فوري (MTO) للصنف "${firstItem.product_name || firstItem.productName}" بالكمية المطلوبة (${firstItem.quantity})؟`,
                confirmText: t('sales.sales_order_details_modal.s3', "توليد أمر التشغيل"),
                cancelText: t('sales.sales_order_details_modal.s4', "إلغاء"),
              });
              if (confirmed) {
                try {
                  const res = await workOrdersApi.createMto({
                    salesOrderId: orderDetailsData.id,
                    productId: firstItem.productId || (firstItem as any).product_id,
                    quantityToProduce: Number(firstItem.quantity),
                  });
                  toast.success(res.message || t('sales.sales_order_details_modal.s5', "تم توليد أمر التشغيل بنجاح"));
                } catch (err: any) {
                  toast.error(err?.message || t('sales.sales_order_details_modal.s6', "فشل توليد أمر التصنيع - تأكد من وجود BOM نشطة للصنف"));
                }
              }
            }}
            style={{ fontSize: '12px', border: '1px solid #c7d2fe', color: '#170e5e' }}
          >
            {t('sales.sales_order_details_modal.s7', "توليد أمر تصنيع (MTO)")}
          </Button>
        )}
      </div>

      <Button variant="secondary" onClick={onClose}>
        {t('sales.sales_order_details_modal.s8', "إغلاق")}
      </Button>
    </div>
  );

  return (
    <StandardDialog
      isOpen={open}
      onClose={onClose}
      title={`تفاصيل أمر البيع #${orderDetailsData?.order_number || order.order_number}`}
      subtitle={t('sales.sales_order_details_modal.s9', "فحص توفر المخزون، الحجوزات، والجاهزية للفوترة")}
      maxWidth="880px"
      loading={isDetailsLoading}
      loadingText={t('sales.sales_order_details_modal.s10', "جاري فحص تفاصيل المخزون...")}
      footer={modalFooter}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Meta Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('sales.sales_order_details_modal.s11', "العميل:")}</span>
            <strong style={{ color: '#0f172a', fontSize: '13px' }}>{orderDetailsData?.customer_name}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('sales.sales_order_details_modal.s12', "الهاتف:")}</span>
            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
              {orderDetailsData?.customer_phone || '—'}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('sales.sales_order_details_modal.s13', "الحالة:")}</span>
            <div>{getSalesOrderStatusBadge(orderDetailsData?.status || '')}</div>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('sales.sales_order_details_modal.s14', "الإجمالي:")}</span>
            <strong style={{ color: '#170e5e', fontSize: '14px' }}>
              {formatCurrency(Number(orderDetailsData?.total_amount || 0))}
            </strong>
          </div>
        </div>

        {/* Items & Stock Availability Table */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '10px 12px' }}>{t('sales.sales_order_details_modal.s15', "الصنف")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('sales.sales_order_details_modal.s16', "الكمية المطلوبة")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('sales.sales_order_details_modal.s17', "الكمية المحجوزة")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('sales.sales_order_details_modal.s18', "المخزون الفعلي")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('sales.sales_order_details_modal.s19', "المتاح للآخرين")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('sales.sales_order_details_modal.s20', "سعر الوحدة")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>{t('sales.sales_order_details_modal.s21', "الإجمالي")}</th>
              </tr>
            </thead>
            <tbody>
              {orderDetailsData?.items?.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.product_name || item.productName}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                    {item.quantity} {item.unit_name || item.unitName || t('sales.sales_order_details_modal.s22', "قطعة")}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, border: '1px solid #bfdbfe', fontSize: '11px' }}>
                      {item.reserved_quantity || 0}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#334155' }}>
                    {item.current_stock_qty ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                    {item.available_qty ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{formatCurrency(Number(item.unit_price || item.unitPrice || 0))}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>
                    {formatCurrency(Number(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </StandardDialog>
  );
};
