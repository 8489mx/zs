import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  CheckCircleIcon,
  PackageIcon,
  PrinterIcon,
  Trash2Icon,
  XIcon,
} from '@/shared/components/icons/AppIcons';
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
  if (!open || !order) return null;

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      ariaLabel={`تفاصيل أمر الشراء #${order.order_number || ''}`}
      width="min(980px, 96vw)"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">تفاصيل أمر الشراء #{order.order_number || ''}</h3>
            <p className="standard-dialog-subtitle">متابعة حالة الاعتماد، استلام الشحنات بالمخازن، وترحيل الفواتير</p>
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
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>جاري تحميل بيانات أمر الشراء...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getPurchaseOrderStatusBadge(order.status)}
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  المستودع: <strong style={{ color: '#0f172a' }}>{order.warehouse_name || 'المخزن الرئيسي'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                {order.status === 'draft' && (
                  <Button
                    onClick={() => onConfirm(order.id)}
                    disabled={isConfirmPending}
                    style={{ backgroundColor: '#2563eb', color: '#ffffff', fontSize: '12px', height: '32px' }}
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5 ml-1" />
                    اعتماد وإرسال للمورد
                  </Button>
                )}

                {(order.status === 'confirmed' || order.status === 'partially_received') && (
                  <>
                    <Button
                      onClick={() => onOpenReceive(order)}
                      style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '12px', height: '32px' }}
                    >
                      <PackageIcon className="w-3.5 h-3.5 ml-1" />
                      استلام بضاعة بالمخزن
                    </Button>
                    <Button
                      onClick={() => onConvert(order.id)}
                      disabled={isConvertPending}
                      style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '12px', height: '32px' }}
                    >
                      تحويل لفاتورة مشتريات رسمية
                    </Button>
                  </>
                )}

                {order.status === 'received' && (
                  <Button
                    onClick={() => onConvert(order.id)}
                    disabled={isConvertPending}
                    style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '12px', height: '32px' }}
                  >
                    تحرير فاتورة المشتريات
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                  style={{ fontSize: '12px', height: '32px' }}
                >
                  <PrinterIcon className="w-3.5 h-3.5 ml-1" />
                  طباعة A4
                </Button>

                {order.status !== 'converted_to_bill' && order.status !== 'cancelled' && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm('هل أنت متأكد من إلغاء أمر الشراء هذا؟')) {
                        onCancel(order.id);
                      }
                    }}
                    style={{ fontSize: '12px', height: '32px', color: '#be123c', borderColor: '#fecdd3' }}
                  >
                    إلغاء الأمر
                  </Button>
                )}

                {(order.status === 'draft' || order.status === 'cancelled') && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm('هل أنت متأكد من حذف هذا الأمر نهائياً؟')) {
                        onDelete(order.id);
                      }
                    }}
                    style={{ fontSize: '12px', height: '32px', color: '#be123c', borderColor: '#fecdd3' }}
                  >
                    <Trash2Icon className="w-3.5 h-3.5 ml-1" />
                    حذف
                  </Button>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>المورد:</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>{order.supplier_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الهاتف:</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{order.supplier_phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>تاريخ الإصدار:</span>
                <strong style={{ color: '#0f172a' }}>
                  {order.created_at ? String(order.created_at).slice(0, 10) : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>تاريخ التوريد المتوقع:</span>
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
                    <th style={{ padding: '10px 12px' }}>الصنف</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المطلوبة</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>الكمية المستلمة</th>
                    <th style={{ padding: '10px 12px' }}>سعر التكلفة</th>
                    <th style={{ padding: '10px 12px' }}>الإجمالي</th>
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
                  <span>المجموع:</span>
                  <strong>{formatCurrency(Number(order.subtotal || 0))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13.5px', color: '#170e5e', paddingTop: '4px', borderTop: '1px solid #cbd5e1' }}>
                  <span>الإجمالي الكلي:</span>
                  <strong>{formatCurrency(Number(order.total_amount || 0))}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
};
