import React from 'react';
import { formatCurrency } from '@/lib/format';
import type { OpenInvoiceItem } from '@/features/accounting/api/accounting.api';

interface OpenInvoicesCardProps {
  partnerType: 'customer' | 'supplier';
  invoices: OpenInvoiceItem[];
  allocationInputs: Record<number, number>;
  onAmountChange: (invoiceId: number, maxRemaining: number, valStr: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  totalAllocating: number;
  onManualAllocate: () => void;
  saving: boolean;
  selectedPayment: { unallocatedAmount: number } | null;
}

export const OpenInvoicesCard: React.FC<OpenInvoicesCardProps> = ({
  partnerType,
  invoices,
  allocationInputs,
  onAmountChange,
  notes,
  setNotes,
  totalAllocating,
  onManualAllocate,
  saving,
  selectedPayment,
}) => {
  const isSaveDisabled = Boolean(
    saving ||
    totalAllocating <= 0 ||
    (selectedPayment && totalAllocating > selectedPayment.unallocatedAmount + 0.01)
  );

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
            الفواتير المفتوحة والمستحقة
          </h3>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
            فواتير {partnerType === 'customer' ? 'المبيعات' : 'المشتريات'} التي لها رصيد متبقي
          </div>
        </div>
        <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
          {invoices.length} فاتورة مفتوحة
        </span>
      </div>

      {invoices.length === 0 ? (
        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          كافة فواتير هذا {partnerType === 'customer' ? 'العميل' : 'المورد'} مسددة بالكامل (رصيد الفواتير 0).
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>رقم الفاتورة</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>التاريخ</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>الإجمالي</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>المتبقي</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', width: '130px' }}>المبلغ المخصص</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const currentVal = allocationInputs[inv.id] ?? '';
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#1e293b' }}>
                        {inv.docNo}
                      </td>
                      <td style={{ padding: '10px', color: '#64748b' }}>
                        {inv.date}
                      </td>
                      <td style={{ padding: '10px', color: '#334155' }}>
                        {formatCurrency(inv.total)}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#dc2626' }}>
                        {formatCurrency(inv.remainingAmount)}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="number"
                          min="0"
                          max={inv.remainingAmount}
                          step="0.01"
                          value={currentVal}
                          placeholder="0.00"
                          onChange={(e) => onAmountChange(inv.id, inv.remainingAmount, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 700,
                            outline: 'none',
                            textAlign: 'left',
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes & Confirmation */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
              ملاحظات التسوية
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: سداد دفعة عن الفواتير المستحقة..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>إجمالي التخصيص الحالي:</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
                {formatCurrency(totalAllocating)}
              </div>
            </div>

            <button
              type="button"
              onClick={onManualAllocate}
              disabled={isSaveDisabled}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: '#170e5e',
                borderColor: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                border: 'none',
                opacity: isSaveDisabled ? 0.6 : 1,
              }}
            >
              {saving ? 'جاري الحفظ...' : 'تأكيد وحفظ التخصيص المحاسبي'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
