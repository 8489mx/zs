import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

export function CreateProjectModal({ open, onClose, onCreated, onSuccess }: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    clientName: '',
    contractValue: '',
    downPaymentAmount: '',
    retentionPercent: '5',
    startDate: '',
    expectedEndDate: '',
    projectManager: '',
    locationAddress: '',
    notes: '',
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('يرجى إدخال اسم المشروع أو العقد');
      return;
    }
    const val = Number(formData.contractValue || 0);
    if (val <= 0) {
      setErrorMsg('يرجى إدخال قيمة تعاقدية صحيحة للمشروع');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createProject({
        code: formData.code.trim() || undefined,
        name: formData.name.trim(),
        clientName: formData.clientName.trim() || undefined,
        contractValue: val,
        downPaymentAmount: Number(formData.downPaymentAmount || 0),
        retentionPercent: Number(formData.retentionPercent || 5),
        startDate: formData.startDate || undefined,
        expectedEndDate: formData.expectedEndDate || undefined,
        projectManager: formData.projectManager.trim() || undefined,
        locationAddress: formData.locationAddress.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });
      onCreated?.();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء إنشاء المشروع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تأسيس مشروع وعقد مقاولة جديد"
      subtitle="إدخال البيانات التعاقدية، وإنشاء مركز تكلفة مستقل وربط الموازنة التقديرية آلياً"
      width="min(760px, 95vw)"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: 'var(--font-body)',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <Field label="اسم المشروع أو العملية الإنشائية *" hint="مثال: إنشاء مجمع الأندلس الطبي - المرحلة الأولى">
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="اكتب اسم المشروع التعاقدي..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>

          <Field label="كود المشروع (اختياري)" hint="تلقائي: PRJ-2026-001">
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="توليد تلقائي..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="اسم المالك / جهة الإسناد (العميل)" hint="اسم الشركة المطورة أو العميل">
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="مثال: شركة التطوير العقاري الحديثة"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>

          <Field label="مدير المشروع / المهندس المشرف" hint="المسؤول الميداني المعتمد">
            <input
              type="text"
              value={formData.projectManager}
              onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })}
              placeholder="اسم المهندس التنفيذي..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
          <Field label="القيمة التعاقدية للمشروع *" hint="الموازنة المعتمدة للعقد">
            <input
              type="number"
              step="any"
              min="1"
              required
              value={formData.contractValue}
              onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
            />
          </Field>

          <Field label="الدفعة المقدمة المستلمة" hint="تُسترد تدريجياً من المستخلصات">
            <input
              type="number"
              step="any"
              min="0"
              value={formData.downPaymentAmount}
              onChange={(e) => setFormData({ ...formData, downPaymentAmount: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>

          <Field label="نسبة ضمان الأعمال %" hint="تأمين حسن التنفيذ (المعتاد 5% أو 10%)">
            <input
              type="number"
              step="0.5"
              min="0"
              max="30"
              value={formData.retentionPercent}
              onChange={(e) => setFormData({ ...formData, retentionPercent: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="تاريخ بدء المشروع" hint="تاريخ استلام الموقع">
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>

          <Field label="تاريخ الانتهاء المتوقع" hint="مدة التنفيذ التعاقدية">
            <input
              type="date"
              value={formData.expectedEndDate}
              onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </Field>
        </div>

        <Field label="موقع العمل والعنوان" hint="العنوان الميداني للمشروع">
          <input
            type="text"
            value={formData.locationAddress}
            onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
            placeholder="مثال: التجمع الخامس - الحي الثاني - قطعة 45"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        <Field label="ملاحظات وشروط تعاقدية إضافية">
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="أي اشتراطات خاصة بالاستشاري أو غرامات التأخير..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>

        {/* Notice of automated cost center */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: 'var(--font-micro)',
            color: '#475569',
          }}
        >
          <span style={{ color: '#170e5e' }}><AppIcons.Building size={18} /></span>
          <div>
            <strong>تكامل محاسبي ذكي:</strong> سيقوم النظام تلقائياً بإنشاء مركز تكلفة تحليلي مستقل لهذا المشروع لربط كافة أذون الصرف، مشتريات الخامات، وأجور العمالة به فورياً.
          </div>
        </div>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري التأسيس...' : 'تأسيس المشروع وتوليد مركز التكلفة'}
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
