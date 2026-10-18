import { useTranslation } from 'react-i18next';
import { translateUiText } from '@/lib/auto-translator';
import type { TenantSubscriptionData } from '../../api/tenant-subscription.api';

interface SubscriptionPaymentsTableProps {
  payments: TenantSubscriptionData['payments'];
  onPrintReceipt: (payment: TenantSubscriptionData['payments'][0]) => void;
}

export function SubscriptionPaymentsTable({
  payments,
  onPrintReceipt,
}: SubscriptionPaymentsTableProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  if (!payments || payments.length === 0) return null;

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginTop: '10px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
        {isEn ? 'Previous Payments & Subscription History' : t('settings.subscription.subscription_payments_table.s0', "سجل عمليات السداد والاشتراك السابقة")}
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isEn ? 'left' : 'right', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>{isEn ? 'Payment #' : t('settings.subscription.subscription_payments_table.s1', "رقم العملية")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>{isEn ? 'Plan' : t('settings.subscription.subscription_payments_table.s2', "الباقة")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>{isEn ? 'Amount' : t('settings.subscription.subscription_payments_table.s3', "المبلغ")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>{isEn ? 'Payment Method' : t('settings.subscription.subscription_payments_table.s4', "طريقة الدفع")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>{isEn ? 'Payment Date' : t('settings.subscription.subscription_payments_table.s5', "تاريخ السداد")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700 }}>{isEn ? 'Reference' : t('settings.subscription.subscription_payments_table.s6', "المرجع")}</th>
              <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{isEn ? 'Receipt' : t('settings.subscription.subscription_payments_table.s7', "الإيصال")}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>#{p.id}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{isEn ? (p.planName ? translateUiText(p.planName) || p.planName : '') : p.planName}</td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#059669' }}>
                  {Number(p.amount).toLocaleString(isEn ? 'en-US' : 'ar-EG')} {p.currency}
                </td>
                <td style={{ padding: '10px 14px' }}>{isEn ? (p.method ? translateUiText(p.method) || p.method : '') : p.method}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG') : '-'}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748b' }}>{p.reference || '-'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => onPrintReceipt(p)}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {isEn ? 'Print A4 Receipt' : t('settings.subscription.subscription_payments_table.s8', "طباعة إيصال A4")}
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
