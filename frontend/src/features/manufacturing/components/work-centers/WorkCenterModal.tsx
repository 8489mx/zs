import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

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
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(560px, 95vw)"
      ariaLabel={editingId ? 'تعديل مركز العمل' : 'إضافة مركز عمل / ماكينة جديدة'}
      showCloseButton={true}
    >
      <div className="dialog-card" style={{ padding: '24px', direction: 'rtl' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
          {editingId ? 'تعديل مركز العمل' : 'إضافة مركز عمل / ماكينة جديدة'}
        </h3>

        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Field label="رمز المركز (الكود)">
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
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
            </Field>

            <Field label="اسم مركز العمل / الماكينة">
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
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Field label="تكلفة تشغيل الساعة (ج.م/ساعة)">
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
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
            </Field>

            <Field label="طاقة الإنتاج بالساعة">
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
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Field label="كفاءة التشغيل القياسية (%)">
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
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
            </Field>

            <Field label="الحالة التشغيلية">
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="active">جاهز ونشط</option>
                <option value="maintenance">تحت الصيانة</option>
                <option value="inactive">معطل وموقوف</option>
              </select>
            </Field>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Field label="ملاحظات أو مواصفات فنية">
              <textarea
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="مواصفات الماكينة أو أي تعليمات تشغيل..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 600 }}
            >
              {isSubmitting ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة مركز العمل'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
