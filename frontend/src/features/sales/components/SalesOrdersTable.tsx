import React from 'react';
import { SalesOrderRecord } from '../api/sales-orders.api';
import { formatCurrency } from '@/lib/format';
import {
  LockIcon,
  CheckCircleIcon,
  XIcon,
  PackageIcon,
  EyeIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from '@/shared/components/icons/AppIcons';

interface SalesOrdersTableProps {
  orders: SalesOrderRecord[];
  isLoading: boolean;
  onViewDetails: (order: SalesOrderRecord) => void;
  onConfirm: (id: number) => void;
  onConvert: (order: SalesOrderRecord) => void;
  onCancel: (order: SalesOrderRecord) => void;
  onDelete: (order: SalesOrderRecord) => void;
}

export const getSalesOrderStatusBadge = (st: string) => {
  switch (st) {
    case 'confirmed':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
          <LockIcon size={12} color="#1e40af" />
          مؤكد ومحجوز بالمخزن
        </span>
      );
    case 'converted':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
          <CheckCircleIcon size={12} color="#065f46" />
          تم التحويل لفاتورة
        </span>
      );
    case 'cancelled':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}>
          <XIcon size={12} color="#9f1239" />
          ملغي
        </span>
      );
    default:
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
          مسودة غير محجوزة
        </span>
      );
  }
};

export const SalesOrdersTable: React.FC<SalesOrdersTableProps> = ({
  orders,
  isLoading,
  onViewDetails,
  onConfirm,
  onConvert,
  onCancel,
  onDelete,
}) => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>رقم أمر البيع</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>العميل</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>تاريخ التسليم / الصلاحية</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>المبلغ الإجمالي</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>حالة الأمر وحجز المخزون</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  جاري تحميل أوامر البيع...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8' }}>
                    <PackageIcon size={32} color="#cbd5e1" />
                    <p style={{ fontWeight: 600, color: '#475569', margin: 0 }}>لا توجد أوامر بيع مطابقة</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                      اضغط على "أمر بيع جديد" لإنشاء طلبية وحجز المخزون للعميل
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600 }}>
                    <span style={{ fontFamily: 'monospace', color: '#170e5e', backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e0e7ff', fontWeight: 700 }}>
                      {order.order_number}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.customer_name}</div>
                    {order.customer_phone && (
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{order.customer_phone}</div>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px', color: '#475569' }}>
                    {order.delivery_date ? (
                      <div>تسليم: {new Date(order.delivery_date).toLocaleDateString('ar-EG')}</div>
                    ) : (
                      <div>{new Date(order.created_at).toLocaleDateString('ar-EG')}</div>
                    )}
                    {order.reservation_expires_at && (
                      <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 500 }}>
                        صلاحية الحجز: {new Date(order.reservation_expires_at).toLocaleDateString('ar-EG')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px', fontWeight: 700, color: '#0f172a' }}>
                    {formatCurrency(Number(order.total_amount))}
                  </td>
                  <td style={{ padding: '11px 16px' }}>{getSalesOrderStatusBadge(order.status)}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => onViewDetails(order)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                        title="عرض التفاصيل وجاهزية المخزون"
                      >
                        <EyeIcon size={13} color="#475569" />
                        <span>التفاصيل</span>
                      </button>

                      {order.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => onConfirm(order.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: '1px solid #bfdbfe',
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            cursor: 'pointer',
                          }}
                          title="تأكيد وحجز كميات المخزون"
                        >
                          <LockIcon size={13} color="#1e40af" />
                          <span>حجز المخزون</span>
                        </button>
                      )}

                      {(order.status === 'confirmed' || order.status === 'draft') && (
                        <button
                          type="button"
                          onClick={() => onConvert(order)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: '1px solid #059669',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)',
                          }}
                          title="تحويل مباشر لفاتورة بيع"
                        >
                          <ShoppingCartIcon size={13} color="#ffffff" />
                          <span>تحويل لفاتورة</span>
                        </button>
                      )}

                      {(order.status === 'confirmed' || order.status === 'draft') && (
                        <button
                          type="button"
                          onClick={() => onCancel(order)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 8px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #fecdd3',
                            backgroundColor: '#ffffff',
                            color: '#be123c',
                            cursor: 'pointer',
                          }}
                          title="إلغاء أمر البيع وفك الحجز"
                        >
                          <span>إلغاء</span>
                        </button>
                      )}

                      {(order.status === 'draft' || order.status === 'cancelled') && (
                        <button
                          type="button"
                          onClick={() => onDelete(order)}
                          style={{
                            padding: '5px',
                            color: '#94a3b8',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="حذف نهائي"
                        >
                          <Trash2Icon size={14} color="#94a3b8" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
