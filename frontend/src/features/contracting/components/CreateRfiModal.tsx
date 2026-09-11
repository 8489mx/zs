import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';

interface CreateRfiModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

export function CreateRfiModal({
  open,
  projectId,
  projectName,
  onClose,
  onCreated,
}: CreateRfiModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    rfiNumber: '',
    subject: '',
    question: '',
    assignedTo: '',
    dateRequested: new Date().toISOString().split('T')[0],
    dateRequired: '',
    notes: '',
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.rfiNumber.trim()) {
      setErrorMsg('يرجى إدخال رقم طلب الاستفسار الهندسي (RFI Number)');
      return;
    }
    if (!formData.subject.trim()) {
      setErrorMsg('يرجى إدخال موضوع الاستفسار');
      return;
    }
    if (!formData.question.trim()) {
      setErrorMsg('يرجى كتابة نص وتفاصيل الاستفسار الفني');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createRfi(projectId, {
        rfiNumber: formData.rfiNumber.trim(),
        subject: formData.subject.trim(),
        question: formData.question.trim(),
        assignedTo: formData.assignedTo.trim() || undefined,
        dateRequested: formData.dateRequested,
        dateRequired: formData.dateRequired || undefined,
        notes: formData.notes.trim() || undefined,
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ طلب الاستفسار');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="طلب استفسار فني للمشروع (Request For Information - RFI)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'إرسال استفسار فني رسمي للمكتب الاستشاري أو المالك'}
      width="min(720px, 95vw)"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: 'var(--font-body)',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* رقم الاستفسار والموضوع */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
          <Field label="رقم الاستفسار (RFI No.) *">
            <input
              type="text"
              value={formData.rfiNumber}
              onChange={(e) => setFormData({ ...formData, rfiNumber: e.target.value })}
              placeholder="مثال: RFI-2026-001"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="موضوع الاستفسار الفني (Subject) *">
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="مثال: تضارب مسار دكت التكييف مع الجسر الساقط بالمحور C-4"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>
        </div>

        {/* نص السؤال والاستفسار الفني */}
        <Field label="نص وتفاصيل الاستفسار الفني المطلوب اعتماده *">
          <textarea
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            placeholder="يرجى توضيح المناسيب المطلوبة لتفادي التعارض الهندسي وإفادتنا بالحل المعتمد للبدء في أعمال التثبيت..."
            className="form-input"
            rows={4}
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', resize: 'vertical' }}
            required
          />
        </Field>

        {/* الموجه إليه والتواريخ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <Field label="الجهة الموجه إليها (Assigned To)">
            <input
              type="text"
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              placeholder="مثال: دار الهندسة / استشاري الكهروميكانيك"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="تاريخ التقديم *">
            <input
              type="date"
              value={formData.dateRequested}
              onChange={(e) => setFormData({ ...formData, dateRequested: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="تاريخ الرد المطلوب (Due Date)">
            <input
              type="date"
              value={formData.dateRequired}
              onChange={(e) => setFormData({ ...formData, dateRequired: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>
        </div>

        {/* ملاحظات ومراجع المخططات */}
        <Field label="أرقام المخططات المرجعية والمواصفات">
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="مثال: المخطط رقم S-104 و M-201 مراجعة Rev.2"
            className="form-input"
            style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
          />
        </Field>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="إرسال طلب الاستفسار (Submit RFI)"
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
