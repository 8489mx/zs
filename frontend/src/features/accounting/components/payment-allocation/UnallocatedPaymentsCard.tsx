import { useTranslation } from 'react-i18next';
import React from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import type { UnallocatedPaymentItem } from '@/features/accounting/api/accounting.api';

interface UnallocatedPaymentsCardProps {
  partnerType: 'customer' | 'supplier';
  payments: UnallocatedPaymentItem[];
  selectedPaymentId: number | null;
  setSelectedPaymentId: (id: number) => void;
  selectedPayment: UnallocatedPaymentItem | null;
  remainingPaymentBalance: number;
  onAutoFIFO: () => void;
  saving: boolean;
  hasOpenInvoices: boolean;
}

export const UnallocatedPaymentsCard: React.FC<UnallocatedPaymentsCardProps> = ({
  partnerType,
  payments,
  selectedPaymentId,
  setSelectedPaymentId,
  selectedPayment,
  remainingPaymentBalance,
  onAutoFIFO,
  saving,
  hasOpenInvoices,
}) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {t('accounting.payment_allocation.unallocated_payments_card.s0', "سندات")} {partnerType === 'customer' ? t('accounting.payment_allocation.unallocated_payments_card.s1', "القبض والتحصيل") : t('accounting.payment_allocation.unallocated_payments_card.s2', "الصرف والسداد")} {t('accounting.payment_allocation.unallocated_payments_card.s3', "المتاحة")}
          </h3>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
            {t('accounting.payment_allocation.unallocated_payments_card.s4', "السندات غير المخصصة كلياً أو جزئياً")}
          </div>
        </div>
        <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
          {payments.length} {t('accounting.payment_allocation.unallocated_payments_card.s5', "سند")}
        </span>
      </div>

      {payments.length === 0 ? (
        <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          {t('accounting.payment_allocation.unallocated_payments_card.s6', "لا توجد سندات نقدية أو بنكية غير مخصصة لهذا")} {partnerType === 'customer' ? t('accounting.payment_allocation.unallocated_payments_card.s7', "العميل") : t('accounting.payment_allocation.unallocated_payments_card.s8', "المورد")}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {payments.map((p) => {
            const isSelected = selectedPaymentId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPaymentId(p.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#170e5e' }}>
                    {p.docNo}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{p.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#475569' }}>
                    {t('accounting.payment_allocation.unallocated_payments_card.s9', "المبلغ الكلي:")} <strong>{formatCurrency(p.amount)}</strong>
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#ecfdf5',
                      color: '#065f46',
                      fontWeight: 700,
                    }}
                  >
                    {t('accounting.payment_allocation.unallocated_payments_card.s10', "المتاح للتخصيص:")} {formatCurrency(p.unallocatedAmount)}
                  </span>
                </div>
                {p.note && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    {p.note}
                  </div>
                )}
              </div>
            );
          })}

          {selectedPayment && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>{t('accounting.payment_allocation.unallocated_payments_card.s11', "السند المختار:")}</span>
                  <strong>{selectedPayment.docNo}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>{t('accounting.payment_allocation.unallocated_payments_card.s12', "المبلغ المتاح:")}</span>
                  <strong style={{ color: '#059669' }}>{formatCurrency(selectedPayment.unallocatedAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>{t('accounting.payment_allocation.unallocated_payments_card.s13', "المتبقي بعد التخصيص:")}</span>
                  <strong style={{ color: remainingPaymentBalance < 0 ? '#dc2626' : '#1e293b' }}>
                    {formatCurrency(remainingPaymentBalance)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={onAutoFIFO}
                disabled={saving || !hasOpenInvoices}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Refresh size={16} />
                {t('accounting.payment_allocation.unallocated_payments_card.s14', "تسوية آلية وفق أسبقية الاستحقاق (FIFO Auto-Reconcile)")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
