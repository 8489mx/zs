import React from 'react';
import { ApprovalRequest } from '../api/approvals.api';
import { Button } from '@/shared/ui/button';
import { ClockIcon, CheckIcon, XIcon } from '@/shared/components/icons/AppIcons';

interface ApprovalRequestsTableProps {
  requests: ApprovalRequest[];
  loading: boolean;
  onSelectRequest: (req: ApprovalRequest) => void;
}

export const ApprovalRequestsTable: React.FC<ApprovalRequestsTableProps> = ({
  requests,
  loading,
  onSelectRequest,
}) => {
  const moduleLabels: Record<string, string> = {
    purchase_orders: 'أمر شراء',
    purchases: 'فاتورة مشتريات',
    expenses: 'سند مصروف',
    treasury_transactions: 'حركة خزينة',
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              fontSize: 'var(--font-badge)',
              fontWeight: 600,
            }}
          >
            <ClockIcon size={12} />
            قيد الاعتماد
          </span>
        );
      case 'approved':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontSize: 'var(--font-badge)',
              fontWeight: 600,
            }}
          >
            <CheckIcon size={12} />
            معتمد رسمياً
          </span>
        );
      case 'rejected':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              fontSize: 'var(--font-badge)',
              fontWeight: 600,
            }}
          >
            <XIcon size={12} />
            مرفوض
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: 'var(--font-badge)',
              fontWeight: 600,
            }}
          >
            {status}
          </span>
        );
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المعاملة المرجعية</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الموديول</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>القيمة المالية</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>المستوى المرحلي</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>مقدم الطلب</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>التاريخ والوقت</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحالة</th>
            <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569', textAlign: 'center' }}>الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                جاري استدعاء طلبات الاعتماد...
              </td>
            </tr>
          ) : requests.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد أي طلبات اعتماد مسجلة مطابقة للفلاتر الحالية.
              </td>
            </tr>
          ) : (
            requests.map((req) => (
              <tr
                key={req.id}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: req.status === 'pending' ? '#fffdfa' : 'transparent',
                }}
              >
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                  {req.record_ref}
                </td>
                <td style={{ padding: '12px 16px', color: '#334155' }}>
                  {moduleLabels[req.module] || req.module}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#170e5e' }}>
                  {Number(req.amount).toLocaleString('ar-EG')} {req.currency}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: req.status === 'approved' ? '#dcfce7' : '#eff6ff',
                      color: req.status === 'approved' ? '#166534' : '#1d4ed8',
                      fontSize: 'var(--font-badge)',
                      fontWeight: 600,
                    }}
                  >
                    مستوى {req.current_tier} / {req.max_tier}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#475569', fontSize: 'var(--font-body)' }}>
                  {req.requested_by_name || 'مستخدم'}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 'var(--font-micro)' }}>
                  {new Date(req.created_at).toLocaleString('ar-EG')}
                </td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(req.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <Button
                    variant={req.status === 'pending' ? 'primary' : 'secondary'}
                    onClick={() => onSelectRequest(req)}
                    style={{ padding: '4px 10px', fontSize: 'var(--font-micro)' }}
                  >
                    {req.status === 'pending' ? 'فحص واعتماد' : 'استعراض السجل'}
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
