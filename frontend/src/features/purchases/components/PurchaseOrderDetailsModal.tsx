import { useTranslation } from 'react-i18next';
import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  CheckCircleIcon,
  PackageIcon,
  PrinterIcon,
  Trash2Icon,
} from '@/shared/components/icons/AppIcons';
import { systemConfirm } from '@/shared/components/system-alert';
import { PurchaseOrderRecord } from '../api/purchase-orders.api';
import { getPurchaseOrderStatusBadge } from './PurchaseOrdersTable';

interface PurchaseOrderDetailsModalProps {
  order: PurchaseOrderRecord | null;
  open: boolean;
  onClose: () => void;
  orderDetailsData: any;
  isDetailsLoading: boolean;
  onConfirm: (id: number) => void;
  isConfirmPending: boolean;
  onOpenReceive: (order: PurchaseOrderRecord) => void;
  onConvert: (id: number) => void;
  isConvertPending: boolean;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
}

export const PurchaseOrderDetailsModal: React.FC<PurchaseOrderDetailsModalProps> = ({
  order,
  open,
  onClose,
  orderDetailsData,
  isDetailsLoading,
  onConfirm,
  isConfirmPending,
  onOpenReceive,
  onConvert,
  isConvertPending,
  onCancel,
  onDelete,
}) => {
  const { t } = useTranslation();
  if (!open || !order) return null;

  const handleCancel = async () => {
    const confirmed = await systemConfirm({
      title: 'إلغاء أمر الشراء',
      message: 'هل أنت متأكد من رغبتك في إلغاء أمر الشراء هذا؟',
      confirmText: 'نعم، إلغاء الأمر',
      cancelText: 'تراجع',
      variant: 'danger',
    });
    if (confirmed) {
      onCancel(order.id);
    }
  };

  const handleDelete = async () => {
    const confirmed = await systemConfirm({
      title: 'حذف أمر الشراء نهائياً',
      message: 'هل أنت متأكد من حذف أمر الشراء هذا نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'نعم، حذف نهائي',
      cancelText: 'تراجع',
      variant: 'danger',
    });
    if (confirmed) {
      onDelete(order.id);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`تفاصيل أمر الشراء #${order.order_number || ''}`}
      subtitle={t('purchases.purchase_order_details_modal.s0', "متابعة حالة الاعتماد، استلام الشحنات بالمخازن، وترحيل الفواتير")}
      width="min(980px, 96vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          cancelText={t('purchases.purchase_order_details_modal.s1', "إغلاق")}
        />
      )}
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        {isDetailsLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>{t('purchases.purchase_order_details_modal.s2', "جاري تحميل بيانات أمر الشراء...")}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getPurchaseOrderStatusBadge(order.status)}
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {t('purchases.purchase_order_details_modal.s3', "المستودع:")} <strong style={{ color: '#0f172a' }}>{order.warehouse_name || t('purchases.purchase_order_details_modal.s4', "المخزن الرئيسي")}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                {order.status === 'draft' && (
                  <Button
                    variant="primary"
                    onClick={() => onConfirm(order.id)}
                    disabled={isConfirmPending}
                    style={{ fontSize: '12px', height: '32px', backgroundColor: '#170e5e' }}
                  >
                    <CheckCircleIcon size={14} style={{ marginInlineEnd: '4px' }} />
                    {isConfirmPending ? t('purchases.purchase_order_details_modal.s5', "جاري الاعتماد...") : t('purchases.purchase_order_details_modal.s6', "اعتماد أمر الشراء")}
                  </Button>
                )}

                {(order.status === 'confirmed' || order.status === 'partially_received') && (
                  <Button
                    variant="primary"
                    onClick={() => onOpenReceive(order)}
                    style={{ fontSize: '12px', height: '32px', backgroundColor: '#059669' }}
                  >
                    <PackageIcon size={14} style={{ marginInlineEnd: '4px' }} />
                    {t('purchases.purchase_order_details_modal.s7', "استلام بضاعة بالمخزن")}
                  </Button>
                )}

                {(order.status === 'confirmed' || order.status === 'partially_received' || order.status === 'received' || (order.status as string) === 'fully_received') && (
                  <Button
                    variant="secondary"
                    onClick={() => onConvert(order.id)}
                    disabled={isConvertPending}
                    style={{ fontSize: '12px', height: '32px', color: '#170e5e', borderColor: '#cbd5e1' }}
                  >
                    {isConvertPending ? t('purchases.purchase_order_details_modal.s8', "جاري التحويل...") : t('purchases.purchase_order_details_modal.s9', "تحويل إلى فاتورة مشتريات")}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                  style={{ fontSize: '12px', height: '32px' }}
                >
                  <PrinterIcon size={14} style={{ marginInlineEnd: '4px' }} />
                  {t('purchases.purchase_order_details_modal.s10', "طباعة A4")}
                </Button>

                {(order.status === 'draft' || order.status === 'confirmed') && (
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    style={{ fontSize: '12px', height: '32px', color: '#be123c', borderColor: '#fecdd3' }}
                  >
                    {t('purchases.purchase_order_details_modal.s11', "إلغاء الأمر")}
                  </Button>
                )}

                {(order.status === 'draft' || order.status === 'cancelled') && (
                  <Button
                    variant="secondary"
                    onClick={handleDelete}
                    style={{ fontSize: '12px', height: '32px', color: '#be123c', borderColor: '#fecdd3' }}
                  >
                    <Trash2Icon size={14} style={{ marginInlineEnd: '4px' }} />
                    {t('purchases.purchase_order_details_modal.s12', "حذف")}
                  </Button>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('purchases.purchase_order_details_modal.s13', "المورد:")}</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>{order.supplier_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('purchases.purchase_order_details_modal.s14', "الهاتف:")}</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{order.supplier_phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('purchases.purchase_order_details_modal.s15', "تاريخ الإصدار:")}</span>
                <strong style={{ color: '#0f172a' }}>
                  {order.created_at ? String(order.created_at).slice(0, 10) : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('purchases.purchase_order_details_modal.s16', "تاريخ التوريد المتوقع:")}</span>
                <strong style={{ color: '#0f172a' }}>
                  {order.expected_delivery_date
                    ? String(order.expected_delivery_date).slice(0, 10)
                    : '—'}
                </strong>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                  <tr>
                    <th style={{ padding: '10px 12px' }}>{t('purchases.purchase_order_details_modal.s17', "الصنف")}</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('purchases.purchase_order_details_modal.s18', "الكمية المطلوبة")}</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('purchases.purchase_order_details_modal.s19', "الكمية المستلمة")}</th>
                    <th style={{ padding: '10px 12px' }}>{t('purchases.purchase_order_details_modal.s20', "سعر التكلفة")}</th>
                    <th style={{ padding: '10px 12px' }}>{t('purchases.purchase_order_details_modal.s21', "الإجمالي")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(orderDetailsData?.items || []).map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.product_name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{item.quantity}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: Number(item.received_quantity) >= Number(item.quantity)
                              ? '#059669'
                              : Number(item.received_quantity) > 0
                              ? '#d97706'
                              : '#94a3b8',
                          }}
                        >
                          {item.received_quantity || 0}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{formatCurrency(Number(item.unit_cost))}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(Number(item.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'left', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>{t('purchases.purchase_order_details_modal.s22', "المجموع:")}</span>
                  <strong>{formatCurrency(Number(order.subtotal || 0))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13.5px', color: '#170e5e', paddingTop: '4px', borderTop: '1px solid #cbd5e1' }}>
                  <span>{t('purchases.purchase_order_details_modal.s23', "الإجمالي الكلي:")}</span>
                  <strong>{formatCurrency(Number(order.total_amount || 0))}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
};
