import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { MaintenanceIcons as Icons } from './MaintenanceConstants';
import type { MaintenanceTicket } from '@/types/domain-models/maintenance';

interface MaintenanceSettlementModalProps {
  settlementTicket: MaintenanceTicket | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  collectedAmount: number;
  setCollectedAmount: (val: number) => void;
  discountReason: string;
  setDiscountReason: (val: string) => void;
  customReason: string;
  setCustomReason: (val: string) => void;
}

export function MaintenanceSettlementModal({
  settlementTicket,
  onClose,
  onConfirm,
  isPending,
  collectedAmount,
  setCollectedAmount,
  discountReason,
  setDiscountReason,
  customReason,
  setCustomReason,
}: MaintenanceSettlementModalProps) {
  if (!settlementTicket) return null;

  const totalCost = settlementTicket.finalCost || settlementTicket.expectedCost || 0;
  const advancePaid = settlementTicket.advancePayment || 0;
  const expectedRem = Math.max(0, totalCost - advancePaid);
  const diff = expectedRem - collectedAmount;

  return (
    <DialogShell
      open={Boolean(settlementTicket)}
      onClose={onClose}
      width="min(540px, 95vw)"
      ariaLabel="تأكيد تحصيل وتسليم جهاز الصيانة"
    >
      <div className="page-stack" dir="rtl" style={{ gap: '14px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.CheckCircle />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                تحصيل وتسليم الجهاز: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{settlementTicket.ticketNo}</span>
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                العميل: <strong>{settlementTicket.customerName}</strong> ({settlementTicket.deviceBrand ? `${settlementTicket.deviceBrand} ` : ''}{settlementTicket.deviceModel})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          >
            <XIcon size={14} />
          </button>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.78rem' }}>
          <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', marginBottom: '2px' }}>إجمالي الحساب</div>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{totalCost.toFixed(2)} <CurrencySymbol /></strong>
          </div>
          <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', marginBottom: '2px' }}>المدفوع مقدماً</div>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{advancePaid.toFixed(2)} <CurrencySymbol /></strong>
          </div>
          <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <div style={{ color: '#475569', marginBottom: '2px' }}>المطلوب تحصيله</div>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{expectedRem.toFixed(2)} <CurrencySymbol /></strong>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            المبلغ المستلم فعلياً من العميل الآن:
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min="0"
              step="5"
              className="purchase-prototype-field-input"
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(Number(e.target.value))}
              style={{ width: '100%', height: '38px', fontSize: '1.1rem', fontWeight: 800, padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a' }}
            />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}><CurrencySymbol /></span>
          </div>
        </div>

        {diff > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                فرق / خصم مسموح به للعميل:
              </span>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{diff.toFixed(2)} <CurrencySymbol /></strong>
            </div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              اختر سبب الخصم / الفرق:
            </label>
            <select
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              className="purchase-prototype-field-input"
              style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, fontSize: '0.8rem', marginBottom: discountReason === 'custom' ? '6px' : '0' }}
            >
              <option value="فصال ومراضاة للعميل">فصال ومراضاة للعميل (خصم مسموح به)</option>
              <option value="خصم عميل مميز / إكرامية">خصم عميل مميز / إكرامية</option>
              <option value="تقريب كسور وفكة">تقريب كسور وفكة</option>
              <option value="custom">سبب آخر (اكتب يدوياً)</option>
            </select>
            {discountReason === 'custom' && (
              <input
                type="text"
                placeholder="اكتب سبب الخصم..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="purchase-prototype-field-input"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.8rem' }}
              />
            )}
          </div>
        )}

        {diff < 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>باقي مستحق للعميل:</span>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{Math.abs(diff).toFixed(2)} <CurrencySymbol /></strong>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <Button type="button" variant="secondary" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={isPending}
            style={{ padding: '7px 20px', fontWeight: 700, fontSize: '0.85rem' }}
          >
            {isPending ? 'جاري التحصيل...' : 'تأكيد التحصيل والتسليم النهائي'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
