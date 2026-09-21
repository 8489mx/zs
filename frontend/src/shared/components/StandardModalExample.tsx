import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { AppIcons } from '@/shared/components/icons/AppIcons';

/**
 * StandardModalExample - النموذج المرجعي القياسي المعياري (10/10 Golden Reference Modal)
 * 
 * 🔴 دستور تصميم النوافذ المنبثقة الذهبي (The 10/10 Golden Modal Standard) في Z-Systems:
 * 1. تقسيم الحقول إلى بطاقات منطقية مرقمة ومحكمة (Sectional Cards) تمنع التشتت البصري.
 * 2. كل بطاقة تبدأ بأيقونة SVG رسمية من AppIcons مع عنوان باللون الكحلي الملكي (#170e5e) وحجم 0.85rem ووزن 700.
 * 3. خلفية البطاقات فائقة النعومة والنقاء (#fbfcfd) مع حواف دائرية (10px) وحدود ناعمة رقيقة (1px solid #edf2f7) لمنع الإحساس بالصناديق الثقيلة.
 * 4. الحقول مدمجة ومريحة بصرياً: الارتفاع 35px، الحشو الداخلي 0 12px، حجم الخط 0.8125rem، وعنوان الحقل 0.78rem بلون #475569 مع مسافة gap: 5px.
 * 5. توازن شبكة الحقول: عدم تقسيم الحقول النصية الطويلة عشوائياً، بل إعطاء الحقول الأطول كالإيميل مساحة نسبية أوسع (1.5fr).
 * 6. حظر كلاسات Tailwind نهائياً لأنها غير مدعومة في المشروع.
 * 7. استخدام StandardDialog و StandardDialogFooter حصرياً لضمان عدم وجود حواف متآكلة وثبات الأبعاد ومنع السكرول الخارجي.
 */
export function StandardModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: 'REF-2026-001',
    name: '',
    category: 'operations',
    priority: 'normal',
    quantity: '',
    unit: 'item',
    notes: '',
  });

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsOpen(false);
    }, 400);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setIsOpen(true)}
      >
        فتح النافذة النموذجية المرجعية
      </button>

      <StandardDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="نموذج إضافة بيان مرجعي جديد"
        subtitle="توثيق المدخلات وتنظيم البيانات التشغيلية ضمن مجموعات عمل مترابطة"
        width="min(880px, 95vw)"
        minHeight="auto"
        footerActions={(
          <StandardDialogFooter
            onCancel={() => setIsOpen(false)}
            onSubmit={handleSave}
            isSubmitting={isSubmitting}
            submitText="حفظ البيانات"
            cancelText="إلغاء"
          />
        )}
      >
        <style>{`
          .enterprise-compact-modal .field {
            margin-bottom: 0 !important;
            gap: 5px !important;
          }
          .enterprise-compact-modal .field span {
            font-size: 0.78rem !important;
            font-weight: 600 !important;
            color: #475569 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .enterprise-compact-modal input,
          .enterprise-compact-modal textarea {
            height: 35px !important;
            font-size: 0.8125rem !important;
            border-radius: 6px !important;
            padding: 0 12px !important;
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            outline: none !important;
            width: 100% !important;
            transition: border-color 0.15s, box-shadow 0.15s !important;
          }
          .enterprise-compact-modal textarea {
            height: auto !important;
            min-height: 60px !important;
            padding: 8px 12px !important;
            resize: vertical !important;
            line-height: 1.5 !important;
            font-family: inherit !important;
          }
          .enterprise-compact-modal input:focus,
          .enterprise-compact-modal textarea:focus {
            border-color: #170e5e !important;
            box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
          }
          .enterprise-compact-modal .custom-select-trigger {
            min-height: 35px !important;
            height: 35px !important;
            font-size: 0.8125rem !important;
            border-radius: 6px !important;
            border: 1px solid #cbd5e1 !important;
            padding: 0 10px 0 36px !important;
          }
        `}</style>

        <div className="enterprise-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }} dir="rtl">
          
          {/* 1. البيانات الأساسية والتعريفية */}
          <div style={{ background: '#fbfcfd', padding: '11px 14px', borderRadius: '10px', border: '1px solid #edf2f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.85rem' }}>
              <AppIcons.Layers size={15} />
              <span>1. البيانات الأساسية والتعريفية (General Information)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
              <Field label="الكود التعريفي (تلقائي)">
                <input
                  type="text"
                  value={formData.code}
                  readOnly
                  dir="ltr"
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#170e5e',
                    background: '#f1f5f9',
                  }}
                />
              </Field>

              <Field label="الاسم / البيان *">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل الاسم بوضوح..."
                />
              </Field>
            </div>
          </div>

          {/* 2. التصنيف والبيانات التشغيلية */}
          <div style={{ background: '#fbfcfd', padding: '11px 14px', borderRadius: '10px', border: '1px solid #edf2f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.85rem' }}>
              <AppIcons.Package size={15} />
              <span>2. التصنيف والبيانات التشغيلية (Operational Specs)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Field label="التصنيف الرئيسي *">
                <CustomSelect
                  value={formData.category}
                  options={[
                    { value: 'operations', label: 'العمليات والتشغيل' },
                    { value: 'finance', label: 'الشؤون المالية' },
                    { value: 'admin', label: 'الإدارة العامة' },
                  ]}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                />
              </Field>

              <Field label="مستوى الأولوية">
                <CustomSelect
                  value={formData.priority}
                  options={[
                    { value: 'normal', label: 'عادي (Normal)' },
                    { value: 'high', label: 'عالي (High)' },
                    { value: 'urgent', label: 'عاجل (Urgent)' },
                  ]}
                  onChange={(val) => setFormData({ ...formData, priority: val })}
                />
              </Field>

              <Field label="الكمية المستهدفة">
                <input
                  type="number"
                  dir="ltr"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
            </div>
          </div>

          {/* 3. الملاحظات والاشتراطات الإضافية */}
          <div style={{ background: '#fbfcfd', padding: '11px 14px', borderRadius: '10px', border: '1px solid #edf2f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.85rem' }}>
              <AppIcons.Tag size={14} />
              <span>3. الملاحظات والاشتراطات الإضافية (Terms & Notes)</span>
            </div>

            <Field label="ملاحظات توضيحية (اختياري)">
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أدخل أي ملاحظات إدارية أو اشتراطات تشغيلية إضافية..."
              />
            </Field>
          </div>

        </div>
      </StandardDialog>
    </>
  );
}
