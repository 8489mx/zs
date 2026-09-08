import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';

/**
 * StandardModalExample - ملف نموذجي ومرجع قياسي (Golden Reference) لكيفية بناء أي بوب اب جديد في النظام
 * 
 * القواعد الذهبية للبوب اب:
 * 1. ممنوع نهائياً استخدام كلاسات Tailwind (مثل p-6, space-y-4, flex, grid-cols-2) لأن تيلويند غير مثبت في المشروع.
 * 2. استخدم StandardDialog مباشرة أو DialogShell مع كلاسات النظام القياسية.
 * 3. الحقول والتسميات تستخدم Field أو الحاويات الشبكية بـ inline style أو form-grid.
 * 4. الأزرار السفلية تستخدم دائماً StandardDialogFooter أو أزرار Button (variant="primary" و variant="secondary").
 */
export function StandardModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    notes: '',
  });

  const handleSave = () => {
    // Save logic...
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setIsOpen(true)}
      >
        فتح النافذة النموذجية
      </button>

      <StandardDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="نموذج إضافة بيان جديد"
        subtitle="شرح توضيحي للغرض من هذه الشاشة والعمليات المرتبطة بها"
        width="min(680px, 95vw)"
        footerActions={(
          <StandardDialogFooter
            onCancel={() => setIsOpen(false)}
            onSubmit={handleSave}
            submitText="حفظ البيانات"
            cancelText="إلغاء"
          />
        )}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <Field label="اسم البيان *" hint="أدخل الاسم بوضوح">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: مستودع المواد الخام"
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

          <Field label="الكود التعريفي *" hint="أحرف وأرقام باللغة الإنجليزية">
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="مثال: WH-001"
              dir="ltr"
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

        <Field label="ملاحظات وتفاصيل إضافية">
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="أدخل أي ملاحظات إدارية أو تشغيلية..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </Field>
      </StandardDialog>
    </>
  );
}
