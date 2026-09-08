import React from 'react';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { EyeIcon, PackageIcon } from '@/shared/components/icons/AppIcons';
import { PurchaseOrderRecord } from '../api/purchase-orders.api';

export const getPurchaseOrderStatusBadge = (status: string) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '999px',
  };
  switch (status) {
    case 'draft':
      return <span style={{ ...baseStyle, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>مسودة</span>;
    case 'confirmed':
      return <span style={{ ...baseStyle, backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>معتمد وبانتظار التوريد</span>;
    case 'partially_received':
      return <span style={{ ...baseStyle, backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>استلام جزئي بالمخزن</span>;
    case 'received':
      return <span style={{ ...baseStyle, backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>تم الاستلام بالكامل</span>;
    case 'converted_to_bill':
      return <span style={{ ...baseStyle, backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>مرحل لفاتورة مشتريات</span>;
    case 'cancelled':
      return <span style={{ ...baseStyle, backgroundColor: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }}>ملغي</span>;
    default:
      return <span style={{ ...baseStyle, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>{status}</span>;
  }
};

interface PurchaseOrdersTableProps {
  isLoading: boolean;
  orders: PurchaseOrderRecord[];
  onViewDetails: (order: PurchaseOrderRecord) => void;
  onOpenReceive: (order: PurchaseOrderRecord) => void;
}

export const PurchaseOrdersTable: React.FC<PurchaseOrdersTableProps> = ({
  isLoading,
  orders,
  onViewDetails,
  onOpenReceive,
}) => {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>رقم الأمر</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>المورد</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>تاريخ الأمر</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>تاريخ التوريد المتوقع</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>مستودع الاستلام</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>الإجمالي</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>الحالة</th>
              <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  جاري تحميل أوامر الشراء...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  لا توجد أوامر شراء مطابقة للبحث
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: '#170e5e' }}>{order.order_number}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{order.supplier_name}</div>
                    {order.supplier_phone && (
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{order.supplier_phone}</div>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px', color: '#475569' }}>
                    {order.created_at ? String(order.created_at).slice(0, 10) : '—'}
                  </td>
                  <td style={{ padding: '11px 16px', color: '#475569' }}>
                    {order.expected_delivery_date ? String(order.expected_delivery_date).slice(0, 10) : '—'}
                  </td>
                  <td style={{ padding: '11px 16px', color: '#334155' }}>{order.warehouse_name || 'المخزن الرئيسي'}</td>
                  <td style={{ padding: '11px 16px', fontWeight: 700, color: '#0f172a' }}>
                    {formatCurrency(Number(order.total_amount || 0))}
                  </td>
                  <td style={{ padding: '11px 16px' }}>{getPurchaseOrderStatusBadge(order.status)}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Button
                        variant="secondary"
                        onClick={() => onViewDetails(order)}
                        className="h-7 px-2 text-slate-600 hover:text-[#170e5e]"
                      >
                        <EyeIcon size={13} color="#475569" />
                        <span>عرض</span>
                      </Button>

                      {order.status === 'confirmed' || order.status === 'partially_received' ? (
                        <Button
                          variant="secondary"
                          onClick={() => onOpenReceive(order)}
                          className="h-7 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                          <PackageIcon size={13} color="#047857" />
                          <span>استلام</span>
                        </Button>
                      ) : null}
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
