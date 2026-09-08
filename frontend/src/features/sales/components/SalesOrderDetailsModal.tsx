import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesOrdersApi, SalesOrderRecord } from '../api/sales-orders.api';
import { workOrdersApi } from '@/features/manufacturing/api/work-orders.api';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { PackageIcon, XIcon } from '@/shared/components/icons/AppIcons';
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
  const { data: orderDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['sales-order-details', order?.id],
    queryFn: () => salesOrdersApi.getById(order!.id),
    enabled: Boolean(order?.id && open),
  });

  if (!open || !order) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(850px, 95vw)"
      ariaLabel="تفاصيل أمر البيع"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PackageIcon size={18} color="#170e5e" />
              </div>
              <div>
                <h3 className="standard-dialog-title">
                  تفاصيل أمر البيع #{orderDetailsData?.order_number || order.order_number}
                </h3>
                <p className="standard-dialog-subtitle">فحص توفر المخزون، الحجوزات، والجاهزية للفوترة</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        {isDetailsLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>جاري فحص تفاصيل المخزون...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Meta Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>العميل:</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>{orderDetailsData?.customer_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الهاتف:</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                  {orderDetailsData?.customer_phone || '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الحالة:</span>
                <div>{getSalesOrderStatusBadge(orderDetailsData?.status || '')}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الإجمالي:</span>
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
                    <th style={{ padding: '10px 12px' }}>الصنف</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المطلوبة</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المحجوزة</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>المخزون الفعلي</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>المتاح للآخرين</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>سعر الوحدة</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetailsData?.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.product_name || item.productName}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                        {item.quantity} {item.unit_name || item.unitName || 'قطعة'}
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

            {/* Action Footer */}
            <div className="standard-dialog-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {orderDetailsData?.status === 'draft' && (
                  <Button
                    variant="primary"
                    onClick={() => onConfirm(orderDetailsData.id)}
                    style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12px' }}
                  >
                    تأكيد أمر البيع وحجز المخزون
                  </Button>
                )}

                {(orderDetailsData?.status === 'confirmed' || orderDetailsData?.status === 'draft') && (
                  <Button
                    variant="success"
                    onClick={() => onConvert(orderDetailsData.id, orderDetailsData.order_number)}
                    style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '12px' }}
                  >
                    تحويل إلى فاتورة بيع وخصم المخزون
                  </Button>
                )}

                {(orderDetailsData?.status === 'confirmed' || orderDetailsData?.status === 'draft') && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const firstItem = orderDetailsData.items?.[0];
                      if (!firstItem) return;
                      if (
                        confirm(
                          `هل ترغب في توليد أمر تصنيع وتشغيل فوري (MTO) للصنف "${firstItem.product_name || firstItem.productName}" بالكمية المطلوبة (${firstItem.quantity})؟`
                        )
                      ) {
                        try {
                          const res = await workOrdersApi.createMto({
                            salesOrderId: orderDetailsData.id,
                            productId: firstItem.productId || (firstItem as any).product_id,
                            quantityToProduce: Number(firstItem.quantity),
                          });
                          alert(res.message || 'تم توليد أمر التشغيل بنجاح');
                        } catch (err: any) {
                          alert(err?.message || 'فشل توليد أمر التصنيع - تأكد من وجود BOM نشطة للصنف');
                        }
                      }
                    }}
                    style={{ fontSize: '12px', border: '1px solid #c7d2fe', color: '#170e5e' }}
                  >
                    توليد أمر تصنيع (MTO)
                  </Button>
                )}
              </div>

              <Button variant="secondary" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
};
