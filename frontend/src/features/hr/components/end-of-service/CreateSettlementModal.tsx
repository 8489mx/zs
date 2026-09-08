import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { XIcon, AlertCircleIcon } from '@/shared/components/icons/AppIcons';
import type { SettlementPreview } from '../../api/end-of-service.api';

interface CreateSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeesList: any[];
  selectedEmployeeId: number | '';
  onEmployeeChange: (id: number | '') => void;
  terminationDate: string;
  onTerminationDateChange: (val: string) => void;
  terminationReason: string;
  onTerminationReasonChange: (val: string) => void;
  lawType: 'saudi' | 'egyptian' | 'custom';
  onLawTypeChange: (val: 'saudi' | 'egyptian' | 'custom') => void;
  customDaysPerYear: number;
  onCustomDaysChange: (val: number) => void;
  noticePeriodAmount: number;
  onNoticePeriodChange: (val: number) => void;
  customEntitlements: number;
  onCustomEntitlementsChange: (val: number) => void;
  assetsDeduction: number;
  onAssetsDeductionChange: (val: number) => void;
  otherDeductions: number;
  onOtherDeductionsChange: (val: number) => void;
  custodyCleared: boolean;
  onCustodyClearedChange: (val: boolean) => void;
  clearanceNotes: string;
  onClearanceNotesChange: (val: string) => void;
  confirmTermination: boolean;
  onConfirmTerminationChange: (val: boolean) => void;
  preview: SettlementPreview | null;
  calculating: boolean;
  saving: boolean;
  feedback: { text: string; error?: boolean } | null;
  onCalculate: () => void;
  onSave: () => void;
}

export function CreateSettlementModal({
  isOpen,
  onClose,
  employeesList,
  selectedEmployeeId,
  onEmployeeChange,
  terminationDate,
  onTerminationDateChange,
  terminationReason,
  onTerminationReasonChange,
  lawType,
  onLawTypeChange,
  customDaysPerYear,
  onCustomDaysChange,
  noticePeriodAmount,
  onNoticePeriodChange,
  customEntitlements,
  onCustomEntitlementsChange,
  assetsDeduction,
  onAssetsDeductionChange,
  otherDeductions,
  onOtherDeductionsChange,
  custodyCleared,
  onCustodyClearedChange,
  confirmTermination,
  onConfirmTerminationChange,
  preview,
  calculating,
  saving,
  feedback,
  onCalculate,
  onSave,
}: CreateSettlementModalProps) {
  if (!isOpen) return null;

  return (
    <DialogShell open={true} onClose={onClose} width="min(820px, 96vw)">
      <div dir="rtl" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              إنشاء مخالصة واحتساب مكافأة نهاية الخدمة
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              تصفية مستحقات الموظف المنتهية خدماته واستخراج الحسبة النظامية الآلية
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
          >
            <XIcon size={20} />
          </button>
        </div>

        {feedback && (
          <div style={{ background: feedback.error ? '#fef2f2' : '#f0fdf4', color: feedback.error ? '#991b1b' : '#166534', border: `1px solid ${feedback.error ? '#fecdd3' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircleIcon size={16} />
            <span>{feedback.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              الموظف *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => onEmployeeChange(e.target.value ? Number(e.target.value) : '')}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">-- اختر الموظف --</option>
              {employeesList.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || emp.displayName || emp.employeeName} ({emp.employeeNo || emp.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              تاريخ نهاية الخدمة *
            </label>
            <input
              type="date"
              value={terminationDate}
              onChange={e => onTerminationDateChange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              سبب انتهاء الخدمة *
            </label>
            <select
              value={terminationReason}
              onChange={e => onTerminationReasonChange(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="resignation">استقالة الموظف</option>
              <option value="termination">إنهاء خدمة / فصل من صاحب العمل</option>
              <option value="contract_end">انتهاء مدة العقد المحدد</option>
              <option value="other">أسباب أخرى / اتفاق ودي</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              نظام العمل المطبق *
            </label>
            <select
              value={lawType}
              onChange={e => onLawTypeChange(e.target.value as any)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="saudi">نظام العمل السعودي (مكافأة تدرجية)</option>
              <option value="egyptian">قانون العمل المصري (شهر عن كل سنة)</option>
              <option value="custom">مخصص (حسب اللائحة الداخلية)</option>
            </select>
          </div>

          {lawType === 'custom' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                أيام الأجر عن كل سنة خدمة
              </label>
              <input
                type="number"
                value={customDaysPerYear}
                onChange={e => onCustomDaysChange(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>

        {/* Adjustments & Custodies */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
            التسويات الإضافية والعهد
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>بدل إنذار مستحق</label>
              <input
                type="number"
                value={noticePeriodAmount}
                onChange={e => onNoticePeriodChange(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>مستحقات إضافية (مكافآت)</label>
              <input
                type="number"
                value={customEntitlements}
                onChange={e => onCustomEntitlementsChange(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#b91c1c', marginBottom: 4 }}>خصم قيمة عهد تالفة/مفقودة</label>
              <input
                type="number"
                value={assetsDeduction}
                onChange={e => onAssetsDeductionChange(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#b91c1c', marginBottom: 4 }}>خصومات أخرى</label>
              <input
                type="number"
                value={otherDeductions}
                onChange={e => onOtherDeductionsChange(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={custodyCleared}
                onChange={e => onCustodyClearedChange(e.target.checked)}
              />
              <span>تم استلام كافة العهد العينية والأجهزة وإخلاء الطرف</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmTermination}
                onChange={e => onConfirmTerminationChange(e.target.checked)}
              />
              <span>تحديث حالة الموظف لـ (منتهي الخدمة / inactive) تلقائياً</span>
            </label>
          </div>
        </div>

        {/* Calculate button */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <Button
            type="button"
            variant="secondary"
            disabled={calculating || !selectedEmployeeId}
            onClick={onCalculate}
            style={{ padding: '8px 24px', fontWeight: 700, fontSize: '0.85rem' }}
          >
            {calculating ? 'جارٍ احتساب الحسبة النظامية...' : 'احتساب الحسبة والمستحقات الآلية'}
          </Button>
        </div>

        {/* Preview Results Card */}
        {preview && (
          <div style={{ border: '2px solid #bbf7d0', borderRadius: 12, padding: 18, background: '#f0fdf4', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
              نتائج الاحتساب النظامي لمستحقات الموظف: {preview.employee.name}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>تاريخ التعيين</span>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{preview.employee.hireDate || 'غير مسجل'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>مدة الخدمة الفعلية</span>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{preview.servicePeriod.years} سنة و {preview.servicePeriod.months} شهر</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>الراتب الأساسي المعتمد</span>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{formatCurrency(preview.salaries.basicSalary)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>رصيد الإجازات المتبقي</span>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{preview.leaveEncashment.remainingLeaveDays} يوم ({formatCurrency(preview.leaveEncashment.leaveEncashmentAmount)})</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, borderTop: '1px solid #bbf7d0', paddingTop: 12 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>مكافأة نهاية الخدمة</span>
                <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>{formatCurrency(preview.gratuity.gratuityAmount)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>متبقي السلف المخصومة</span>
                <strong style={{ fontSize: '1.1rem', color: '#dc2626' }}>{formatCurrency(preview.unpaidLoansDeduction)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>صافي المستحق النهائي للموظف</span>
                <strong style={{ fontSize: '1.3rem', color: '#170e5e' }}>{formatCurrency(preview.netSettlementAmount)}</strong>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving || !preview}
            onClick={onSave}
            style={{ background: '#170e5e', borderColor: '#170e5e', fontWeight: 700 }}
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ واعتماد المخالصة'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
