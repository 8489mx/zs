import { getGlobalCurrencySymbol } from '@/lib/currencies';
import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';

interface WorkCenterModalProps {
  open: boolean;
  onClose: () => void;
  editingId: number | null;
  formCode: string;
  setFormCode: (v: string) => void;
  formName: string;
  setFormName: (v: string) => void;
  formCostPerHour: number | string;
  setFormCostPerHour: (v: number | string) => void;
  formCapacity: number | string;
  setFormCapacity: (v: number | string) => void;
  formTimeEfficiency: number | string;
  setFormTimeEfficiency: (v: number | string) => void;
  formStatus: 'active' | 'maintenance' | 'inactive';
  setFormStatus: (v: 'active' | 'maintenance' | 'inactive') => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

const statusOptions = [
  { value: 'active', label: 'جاهز ونشط للتشغيل' },
  { value: 'maintenance', label: 'تحت الصيانة الدورية' },
  { value: 'inactive', label: 'معطل وموقوف عن العمل' },
];

export function WorkCenterModal({
  open,
  onClose,
  editingId,
  formCode,
  setFormCode,
  formName,
  setFormName,
  formCostPerHour,
  setFormCostPerHour,
  formCapacity,
  setFormCapacity,
  formTimeEfficiency,
  setFormTimeEfficiency,
  formStatus,
  setFormStatus,
  formNotes,
  setFormNotes,
  onSubmit,
  isSubmitting,
}: WorkCenterModalProps) {
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSubmit(e as any);
  };

  return (
    <StandardDialog
      isOpen={open}
      onClose={onClose}
      title={editingId ? 'تعديل مركز العمل' : 'إضافة مركز عمل / ماكينة جديدة'}
      subtitle="تحديد تكلفة التشغيل بالساعة والطاقة الإنتاجية ومؤشرات الكفاءة"
      maxWidth="620px"
      footer={
        <StandardDialogFooter
          onClose={onClose}
          closeLabel="إلغاء"
          primaryButton={{
            label: isSubmitting ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة مركز العمل',
            onClick: () => handleSubmit(),
            disabled: isSubmitting,
          }}
        />
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Card 1: الهوية والحالة */}
        <div
          style={{
            padding: 16,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#170e5e', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            بيانات وهوية مركز العمل
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <Field label="رمز المركز (الكود) *">
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="مثال: WC-101"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </Field>

            <Field label="اسم مركز العمل / الماكينة *">
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: ماكينة تعبئة وتغليف آلي"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </Field>
          </div>

          <div>
            <Field label="الحالة التشغيلية *">
              <CustomSelect
                value={formStatus}
                onChange={(val) => setFormStatus(val as any)}
                options={statusOptions}
              />
            </Field>
          </div>
        </div>

        {/* Card 2: المعايير الاقتصادية والتشغيلية */}
        <div
          style={{
            padding: 16,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#170e5e', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            المعايير المالية ومؤشرات الطاقة
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <Field label={`تكلفة الساعة (${getGlobalCurrencySymbol()})`}>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formCostPerHour}
                onChange={(e) => setFormCostPerHour(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
            </Field>

            <Field label="طاقة الإنتاج/ساعة">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
            </Field>

            <Field label="كفاءة التشغيل (%)">
              <input
                type="number"
                min="10"
                max="100"
                required
                value={formTimeEfficiency}
                onChange={(e) => setFormTimeEfficiency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              />
            </Field>
          </div>

          <div>
            <Field label="ملاحظات أو مواصفات فنية">
              <textarea
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="مواصفات الماكينة أو أي تعليمات تشغيل وتبريد..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </Field>
          </div>
        </div>
      </form>
    </StandardDialog>
  );
}
