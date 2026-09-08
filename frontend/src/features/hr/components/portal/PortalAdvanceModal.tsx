import React, { useState } from 'react';
import { employeePortalApi } from '../../api/employee-portal.api';
import { CreditCardIcon, XIcon } from '@/shared/components/icons/AppIcons';

export interface PortalAdvanceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function PortalAdvanceModal({
  open,
  onClose,
  onSuccess,
}: PortalAdvanceModalProps) {
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceMonths, setAdvanceMonths] = useState<number>(1);
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmitAdvance(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(advanceAmount);
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ سلفة صالح');
      return;
    }

    try {
      setAdvanceSubmitting(true);
      const res = await employeePortalApi.requestAdvance({
        amount: amt,
        reason: advanceReason,
        repaymentMonths: advanceMonths,
      });
      setAdvanceAmount('');
      setAdvanceReason('');
      onClose();
      onSuccess(res.message);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر تقديم طلب السلفة');
    } finally {
      setAdvanceSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="portal-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCardIcon size={20} color="#170e5e" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  طلب سلفة مالية من الراتب
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdvance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مبلغ السلفة المطلوب (ج.م):
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="مثال: 1000"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مدة السداد (عدد الشهور):
                </label>
                <select
                  value={advanceMonths}
                  onChange={(e) => setAdvanceMonths(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <option value={1}>شهر واحد (خصم كامل من الراتب القادم)</option>
                  <option value={2}>شهران (قسطان متساويان)</option>
                  <option value={3}>3 شهور (3 أقساط)</option>
                  <option value={6}>6 شهور</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  سبب طلب السلفة:
                </label>
                <textarea
                  rows={3}
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="اكتب سبب طلب السلفة والظروف الخاصة باختصار..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={advanceSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: advanceSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {advanceSubmitting ? 'جاري التسجيل...' : 'إرسال طلب السلفة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
