import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, CheckShieldIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/shared/components/system-alert';
import { restaurantAdvancedFnbApi } from '@/features/pos/api/restaurant-advanced-fnb.api';
import { useAuthStore } from '@/stores/auth-store';

interface PosManagerCompModalProps {
  open: boolean;
  onClose: () => void;
  currentCartTotal: number;
  currentTableNumber?: string;
  cartSummary?: string;
  onApplyComp: (compDetails: {
    compType: 'vip_guest' | 'customer_complaint' | 'staff_meal' | 'promotional_tasting';
    amount: number;
    managerName: string;
    notes?: string;
  }) => Promise<void> | void;
}

export function PosManagerCompModal({
  open,
  onClose,
  currentCartTotal,
  currentTableNumber,
  cartSummary,
  onApplyComp,
}: PosManagerCompModalProps) {
  const currentUser = useAuthStore((s: any) => s.user);
  const [compType, setCompType] = useState<'vip_guest' | 'customer_complaint' | 'staff_meal' | 'promotional_tasting'>('vip_guest');
  const [isFullComp, setIsFullComp] = useState(true);
  const [customAmount, setCustomAmount] = useState<string>(String(currentCartTotal));
  const [managerName, setManagerName] = useState<string>(currentUser?.name || 'مدير الصالة');
  const [managerPin, setManagerPin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalCompAmount = isFullComp ? currentCartTotal : Math.min(currentCartTotal, Math.max(0, Number(customAmount) || 0));

  const handleConfirm = async () => {
    if (finalCompAmount <= 0) {
      toast.warning('مبلغ الضيافة يجب أن يكون أكبر من الصفر');
      return;
    }

    if (!managerName.trim()) {
      toast.warning('يرجى تحديد اسم المدير المعتمد للضيافة');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Record official comp ledger in backend
      await restaurantAdvancedFnbApi.recordManagerComp({
        compType,
        amount: finalCompAmount,
        managerName: managerName.trim(),
        tableNumber: currentTableNumber || undefined,
        itemsSummary: cartSummary || undefined,
        notes: notes.trim() || undefined,
      });

      // 2. Apply discount to POS cart
      await onApplyComp({
        compType,
        amount: finalCompAmount,
        managerName: managerName.trim(),
        notes: notes.trim() || undefined,
      });

      toast.success(`تم اعتماد قيد ضيافة الإدارة بقيمة ${formatCurrency(finalCompAmount)} بنجاح`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تسجيل ضيافة الإدارة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabel="ضيافة الإدارة والخصومات الرسمية"
      width="min(560px, 96vw)"
      zIndex={94}
    >
      <div style={{ padding: '18px 22px', direction: 'rtl', fontFamily: 'inherit' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '4px', height: '18px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                ضيافة الإدارة (Manager Comps & House Account)
              </h3>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              اعتماد ضيافة رسمية وقيدها على حسابات الضيافة والتسويق مع التوثيق المحاسبي
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body Form */}
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Cart Info Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>إجمالي الفاتورة / الطاولة:</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                {formatCurrency(currentCartTotal)} {currentTableNumber && <span style={{ fontSize: '12px', color: '#170e5e' }}>(طاولة {currentTableNumber})</span>}
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>مبلغ الضيافة المعتمد:</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
                {formatCurrency(finalCompAmount)}
              </div>
            </div>
          </div>

          {/* Comp Type Selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              نوع ومبرر الضيافة:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { key: 'vip_guest', label: 'ضيافة زائر VIP أو شريك', desc: 'House Hospitality' },
                { key: 'customer_complaint', label: 'تعويض شكوى عميل / خدمة', desc: 'Service Recovery' },
                { key: 'staff_meal', label: 'وجبة موظف / طاقم العمل', desc: 'Staff Meal Allowance' },
                { key: 'promotional_tasting', label: 'تذوق ترويجي / صنف جديد', desc: 'Promotional Tasting' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setCompType(t.key as any)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: compType === t.key ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                    backgroundColor: compType === t.key ? '#eef2ff' : '#ffffff',
                    color: compType === t.key ? '#170e5e' : '#334155',
                    textAlign: 'right',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800 }}>{t.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Mode: Full vs Partial */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
              قيمة الضيافة:
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setIsFullComp(true);
                  setCustomAmount(String(currentCartTotal));
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: isFullComp ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: isFullComp ? '#170e5e' : '#ffffff',
                  color: isFullComp ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ضيافة كاملة (100% على حساب المطعم)
              </button>
              <button
                type="button"
                onClick={() => setIsFullComp(false)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: !isFullComp ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: !isFullComp ? '#170e5e' : '#ffffff',
                  color: !isFullComp ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ضيافة جزئية بمبلغ محدد
              </button>
            </div>

            {!isFullComp && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="number"
                  min="0.01"
                  max={currentCartTotal}
                  step="0.5"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="أدخل مبلغ الضيافة"
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1.5px solid #170e5e',
                    padding: '0 10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          {/* Manager Authorization Name & PIN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                اسم المدير المعتمد:
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                رمز PIN الأمني (اختياري):
              </label>
              <input
                type="password"
                maxLength={6}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="****"
                style={{
                  width: '100%',
                  height: '34px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
              ملاحظات وتفاصيل الضيافة للتقرير المحاسبي:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: زيارة مالك العقار، أو تعويض عن تأخر طبق الشوربة"
              style={{
                width: '100%',
                height: '34px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                padding: '0 8px',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '14px',
            marginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#16a34a' }}>
            <CheckShieldIcon size={13} color="#16a34a" />
            <span>يتم توثيق القيد وإدراجه في كشف ضيافات الإدارة</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ minHeight: '34px', height: '34px', padding: '0 14px', fontSize: '12px' }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirm}
              disabled={isSubmitting || finalCompAmount <= 0}
              style={{
                minHeight: '34px',
                height: '34px',
                padding: '0 18px',
                fontSize: '12px',
                fontWeight: 800,
                backgroundColor: '#170e5e',
              }}
            >
              {isSubmitting ? 'جارٍ الاعتماد...' : `اعتماد الضيافة (${formatCurrency(finalCompAmount)})`}
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
