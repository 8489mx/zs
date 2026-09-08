import type { TenantSubscriptionData } from '../../api/tenant-subscription.api';

interface SubscriptionPaymentsTableProps {
  payments: TenantSubscriptionData['payments'];
  onPrintReceipt: (payment: TenantSubscriptionData['payments'][0]) => void;
}

export function SubscriptionPaymentsTable({
  payments,
  onPrintReceipt,
}: SubscriptionPaymentsTableProps) {
  if (!payments || payments.length === 0) return null;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginTop: '10px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
        سجل عمليات السداد والاشتراك السابقة
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>رقم العملية</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>الباقة</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>المبلغ</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>طريقة الدفع</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>تاريخ السداد</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>المرجع</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإيصال</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>#{p.id}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.planName}</td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>
                  {Number(p.amount).toLocaleString('ar-EG')} {p.currency}
                </td>
                <td style={{ padding: '10px 14px' }}>{p.method}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-EG') : '-'}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748b' }}>{p.reference || '-'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => onPrintReceipt(p)}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    طباعة إيصال A4
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
