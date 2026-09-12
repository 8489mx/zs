import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { contractingApi } from '../api/contracting.api';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface CreateChangeOrderModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

const REASON_OPTIONS = [
  { value: 'client_request', label: 'طلب مباشر من المالك / العميل' },
  { value: 'site_condition', label: 'ظروف غير متوقعة في الموقع (تربة / مياه)' },
  { value: 'design_change', label: 'تعديل هندسي من الاستشاري' },
  { value: 'value_engineering', label: 'هندسة قيمة وتوفير تكاليف' },
];

const IMPACT_OPTIONS = [
  { value: 'cost_and_time', label: 'أثر مالي وزمني معاً' },
  { value: 'cost_only', label: 'أثر مالي فقط (تعديل السعر)' },
  { value: 'time_only', label: 'أثر زمني فقط (تمديد مدة)' },
];

export function CreateChangeOrderModal({ open, projectId, projectName, onClose, onCreated }: CreateChangeOrderModalProps) {
  const { currencySymbol } = useSystemCurrency();
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
      width="min(880px, 95vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري الحفظ...' : 'حفظ كمسودة أمر تغيير'}
          isSubmitting={isSubmitting}
        />
      )}
    >
      <style>{`
        .co-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .co-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .co-compact-modal input,
        .co-compact-modal textarea {
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 10px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          outline: none !important;
          width: 100% !important;
          transition: border-color 0.15s, box-shadow 0.15s !important;
        }
        .co-compact-modal input:focus,
        .co-compact-modal textarea:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
        }
        .co-compact-modal .custom-select-trigger {
          min-height: 33px !important;
          height: 33px !important;
          font-size: 0.8125rem !important;
          padding: 0 10px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="co-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* 1. موضوع وسبب التغيير التعاقدي */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.FileText size={15} />
            <span>1. موضوع وسبب التعديل التعاقدي (Change Scope & Reason)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', alignItems: 'start' }}>
            <Field label="موضوع / بيان أمر التغيير *">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: زيادة عمق الخوازيق أو تعديل مواصفات السيراميك..."
              />
            </Field>

            <Field label="سبب التغيير التعاقدي">
              <CustomSelect
                value={formData.reason}
                options={REASON_OPTIONS}
                onChange={(val) => setFormData({ ...formData, reason: val })}
              />
            </Field>

            <Field label="نوع الأثر التعاقدي">
              <CustomSelect
                value={formData.impactType}
                options={IMPACT_OPTIONS}
                onChange={(val) => setFormData({ ...formData, impactType: val as any })}
              />
            </Field>
          </div>
        </div>

        {/* 2. الأثر المالي والزمني */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calculator size={15} />
            <span>2. الأثر المالي والزمني على المشروع (Financial & Time Impact)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' }}>
            <Field label={`الأثر المالي (${currencySymbol}) *`}>
              <input
                type="number"
                step="any"
                required
                dir="ltr"
                disabled={formData.impactType === 'time_only'}
                value={formData.costImpact}
                onChange={(e) => setFormData({ ...formData, costImpact: e.target.value })}
                placeholder="0.00 (موجب/سالب)"
                style={{
                  fontWeight: 800,
                  color: '#170e5e',
                  border: '2px solid #170e5e',
                }}
              />
            </Field>

            <Field label="الأثر الزمني (أيام إضافية)">
              <input
                type="number"
                min="0"
                dir="ltr"
                disabled={formData.impactType === 'cost_only'}
                value={formData.timeImpactDays}
                onChange={(e) => setFormData({ ...formData, timeImpactDays: e.target.value })}
                placeholder="0"
                style={{ fontWeight: 700 }}
              />
            </Field>
          </div>
        </div>

        {/* 3. المبررات والمرفقات الفنية */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Tag size={14} />
            <span>3. المبررات الفنية والاشتراطات (Technical Notes & Justification)</span>
          </div>

          <Field label="المبررات والمرفقات الفنية (اختياري)">
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="تفاصيل التبرير الفني، رقم خطاب الاستشاري أو محضر الاجتماع..."
            />
          </Field>
        </div>
      </form>
    </StandardDialog>
  );
}
