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
      width="min(940px, 96vw)"
      minHeight="auto"
      footer={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جاري التأسيس...' : 'تأسيس المشروع وتوليد مركز التكلفة'}
          isSubmitting={isSubmitting}
        />
      }
    >
      <style>{`
        .project-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .project-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .project-compact-modal input,
        .project-compact-modal textarea {
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
        .project-compact-modal input:focus,
        .project-compact-modal textarea:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="project-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* 1. بيانات المشروع والتعاقد */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Building size={15} />
            <span>1. بيانات المشروع والتعاقد (Project Profile & Contract)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr', gap: '10px', alignItems: 'start' }}>
            <Field label="اسم المشروع أو العقد الإنشائي *">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: إنشاء مجمع الأندلس الطبي - المرحلة الأولى"
              />
            </Field>

            <Field label="كود المشروع (تلقائي)">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="توليد تلقائي PRJ-..."
                dir="ltr"
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#170e5e',
                  background: '#f8fafc',
                }}
              />
            </Field>

            <Field label="المالك / جهة الإسناد (العميل)">
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="اسم العميل أو المطور..."
              />
            </Field>

            <Field label="مدير المشروع / المشرف">
              <input
                type="text"
                value={formData.projectManager}
                onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })}
                placeholder="اسم المهندس التنفيذي..."
              />
            </Field>
          </div>
        </div>

        {/* 2. القيم المالية وشروط الدفعات */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calculator size={15} />
            <span>2. القيم المالية وشروط الدفعات (Financials & Payment Terms)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '10px', alignItems: 'start' }}>
            <Field label="القيمة التعاقدية للمشروع *">
              <input
                type="number"
                step="any"
                min="1"
                required
                dir="ltr"
                value={formData.contractValue}
                onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                placeholder="0.00"
                style={{
                  fontWeight: 800,
                  color: '#170e5e',
                  border: '2px solid #170e5e',
                }}
              />
            </Field>

            <Field label="الدفعة المقدمة المستلمة">
              <input
                type="number"
                step="any"
                min="0"
                dir="ltr"
                value={formData.downPaymentAmount}
                onChange={(e) => setFormData({ ...formData, downPaymentAmount: e.target.value })}
                placeholder="0.00"
              />
            </Field>

            <Field label="نسبة ضمان الأعمال %">
              <input
                type="number"
                step="0.5"
                min="0"
                max="30"
                dir="ltr"
                value={formData.retentionPercent}
                onChange={(e) => setFormData({ ...formData, retentionPercent: e.target.value })}
                placeholder="5"
                style={{ fontWeight: 700 }}
              />
            </Field>
          </div>
        </div>

        {/* 3. المواعيد والموقع الميداني */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calendar size={15} />
            <span>3. المواعيد والموقع الميداني (Timeline & Site Location)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px', alignItems: 'start' }}>
            <Field label="تاريخ بدء المشروع">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </Field>

            <Field label="تاريخ الانتهاء المتوقع">
              <input
                type="date"
                value={formData.expectedEndDate}
                onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
              />
            </Field>

            <Field label="موقع العمل والعنوان الميداني">
              <input
                type="text"
                value={formData.locationAddress}
                onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                placeholder="مثال: التجمع الخامس - الحي الثاني - قطعة 45"
              />
            </Field>
          </div>
        </div>

        {/* 4. الملاحظات والاشتراطات التعاقدية */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Tag size={14} />
            <span>4. الملاحظات والاشتراطات التعاقدية (Terms & Notes)</span>
          </div>

          <Field label="ملاحظات وشروط تعاقدية إضافية (اختياري)">
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي اشتراطات خاصة بالاستشاري، غرامات التأخير، أو الدفعات المرحلية..."
            />
          </Field>
        </div>

        {/* إشعار مركز التكلفة التلقائي */}
        <div
          style={{
            padding: '7px 12px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            color: '#475569',
          }}
        >
          <span style={{ color: '#170e5e', display: 'flex' }}><AppIcons.Building size={16} /></span>
          <div>
            <strong style={{ color: '#0f172a' }}>تكامل محاسبي ذكي:</strong> سيقوم النظام تلقائياً بإنشاء مركز تكلفة تحليلي مستقل لهذا المشروع لربط كافة أذون الصرف، مشتريات الخامات، والمستخلصات به فورياً.
          </div>
        </div>
      </form>
    </StandardDialog>
  );
}
