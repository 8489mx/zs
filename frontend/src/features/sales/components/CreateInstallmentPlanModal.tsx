import React, { useState, useMemo } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface CreateInstallmentPlanModalProps {
  open: boolean;
  onClose: () => void;
  customers: any[];
  onSubmit: (data: {
    customerId: number;
    saleId: number | null;
    totalAmount: number;
    downPayment: number;
    interestRatePercent: number;
    installmentCount: number;
    startDate: string;
    notes: string;
  }) => void;
  isPending: boolean;
}

export const CreateInstallmentPlanModal: React.FC<CreateInstallmentPlanModalProps> = ({
  open,
  onClose,
  customers,
  onSubmit,
  isPending,
}) => {
  const [newPlan, setNewPlan] = useState({
    customerId: '',
    saleId: '',
    totalAmount: '',
    downPayment: '0',
    interestRatePercent: '0',
    installmentCount: '6',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const planPreview = useMemo(() => {
    const total = Number(newPlan.totalAmount || 0);
    const down = Number(newPlan.downPayment || 0);
    const financed = Math.max(0, total - down);
    const interestRate = Number(newPlan.interestRatePercent || 0);
    const interest = Math.round(((financed * interestRate) / 100) * 100) / 100;
    const totalWithInterest = Math.round((financed + interest) * 100) / 100;
    const count = Math.max(1, Math.floor(Number(newPlan.installmentCount) || 1));
    const monthly = Math.round((totalWithInterest / count) * 100) / 100;

    return {
      total,
      down,
      financed,
      interest,
      totalWithInterest,
      count,
      monthly,
    };
  }, [newPlan]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.customerId || !Number(newPlan.totalAmount)) return;
    onSubmit({
      customerId: Number(newPlan.customerId),
      saleId: newPlan.saleId ? Number(newPlan.saleId) : null,
      totalAmount: Number(newPlan.totalAmount),
      downPayment: Number(newPlan.downPayment || 0),
      interestRatePercent: Number(newPlan.interestRatePercent || 0),
      installmentCount: Number(newPlan.installmentCount || 1),
      startDate: newPlan.startDate,
      notes: newPlan.notes,
    });
  };

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(650px, 95vw)"
      ariaLabel="إنشاء خطة تقسيط جديدة"
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">إنشاء خطة تقسيط جديدة</h3>
            <p className="standard-dialog-subtitle">جدولة عقد بيع بالتقسيط واحتساب نسب الفائدة والأقساط الشهرية</p>
          </div>
          <button type="button" onClick={onClose} className="standard-dialog-close-btn" aria-label="إغلاق">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              اختر العميل *
            </label>
            <select
              value={newPlan.customerId}
              onChange={(e) => setNewPlan({ ...newPlan, customerId: e.target.value })}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            >
              <option value="">-- اختر عميلاً مسجلاً --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                إجمالي قيمة البضاعة / الفاتورة *
              </label>
              <input
                type="number"
                placeholder="مثلاً: 12000"
                value={newPlan.totalAmount}
                onChange={(e) => setNewPlan({ ...newPlan, totalAmount: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                المقدم المدفوع نقداً
              </label>
              <input
                type="number"
                placeholder="0"
                value={newPlan.downPayment}
                onChange={(e) => setNewPlan({ ...newPlan, downPayment: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                نسبة الفائدة الإجمالية (%)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="0"
                value={newPlan.interestRatePercent}
                onChange={(e) => setNewPlan({ ...newPlan, interestRatePercent: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                عدد شهور التقسيط *
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={newPlan.installmentCount}
                onChange={(e) => setNewPlan({ ...newPlan, installmentCount: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                تاريخ استحقاق أول قسط *
              </label>
              <input
                type="date"
                value={newPlan.startDate}
                onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              ملاحظات أو شروط العقد
            </label>
            <input
              type="text"
              placeholder="مثلاً: بضمان شيكات، إيصال أمانة، كفيل غارم"
              value={newPlan.notes}
              onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          {/* Calculator Preview Box */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
              معاينة حاسبة التقسيط الفورية:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>المبلغ الممول</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  {formatCurrency(planPreview.financed)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>قيمة الفوائد</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#d97706' }}>
                  {formatCurrency(planPreview.interest)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>إجمالي الدين بالفوائد</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  {formatCurrency(planPreview.totalWithInterest)}
                </div>
              </div>
              <div style={{ backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '6px' }}>
                <div style={{ fontSize: '11px', color: '#047857' }}>القسط الشهري</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#065f46' }}>
                  {formatCurrency(planPreview.monthly)}
                </div>
              </div>
            </div>
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!newPlan.customerId || !Number(newPlan.totalAmount) || isPending}
              style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
            >
              {isPending ? 'جاري الحفظ والجدولة...' : 'حفظ وتوليد جدول الأقساط'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
};
