import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';

interface CreateChangeOrderModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

export function CreateChangeOrderModal({ open, projectId, projectName, onClose, onCreated }: CreateChangeOrderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    reason: 'client_request',
    impactType: 'cost_and_time' as 'cost_only' | 'time_only' | 'cost_and_time',
    costImpact: '',
    timeImpactDays: '0',
    notes: '',
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('يرجى كتابة موضوع أو بيان أمر التغيير');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createChangeOrder(projectId, {
        title: formData.title.trim(),
        reason: formData.reason as any,
        costImpact: Number(formData.costImpact || 0),
        timeImpactDays: Number(formData.timeImpactDays || 0),
        notes: formData.notes.trim() || undefined,
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ أمر التغيير');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إصدار أمر تغيير / ملحق تعاقدي (Change Order)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'توثيق التعديلات في بنود العقد، الأثر المالي على قيمة المشروع، والمدة الزمنية الإضافية'}
      width="min(720px, 95vw)"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: 'var(--font-body)' }}>
            {errorMsg}
          </div>
        )}

        <Field label="موضوع / بيان أمر التغيير *" hint="مثال: زيادة عمق الخوازيق أو تعديل مواصفات السيراميك">
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="اكتب بيان التعديل..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="سبب التغيير التعاقدي">
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="client_request">طلب مباشر من المالك / العميل</option>
              <option value="site_condition">ظروف غير متوقعة في الموقع (تربة / مياه)</option>
              <option value="design_change">تعديل هندسي من الاستشاري</option>
              <option value="value_engineering">هندسة قيمة وتوفير تكاليف</option>
            </select>
          </Field>

          <Field label="نوع الأثر التعاقدي">
            <select
              value={formData.impactType}
              onChange={(e) => setFormData({ ...formData, impactType: e.target.value as any })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="cost_and_time">أثر مالي وزمني معاً</option>
              <option value="cost_only">أثر مالي فقط (تعديل السعر)</option>
              <option value="time_only">أثر زمني فقط (تمديد مدة)</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="الأثر المالي (ج.م) *" hint="موجب للزيادة، سالب للتخفيض">
            <input
              type="number"
              step="any"
              required
              disabled={formData.impactType === 'time_only'}
              value={formData.costImpact}
              onChange={(e) => setFormData({ ...formData, costImpact: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
            />
          </Field>

          <Field label="الأثر الزمني (أيام إضافية)" hint="تمديد تاريخ التسليم التعاقدي EOT">
            <input
              type="number"
              min="0"
              disabled={formData.impactType === 'cost_only'}
              value={formData.timeImpactDays}
              onChange={(e) => setFormData({ ...formData, timeImpactDays: e.target.value })}
              placeholder="0"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
        </div>

        <Field label="المبررات والمرفقات الفنية">
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="تفاصيل التبرير الفني، رقم خطاب الاستشاري أو محضر الاجتماع..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري الحفظ...' : 'حفظ كمسودة أمر تغيير'}
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
