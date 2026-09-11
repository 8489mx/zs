import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import type { ContractingRfi } from '../contracting.types';

interface AnswerRfiModalProps {
  open: boolean;
  rfi: ContractingRfi | null;
  onClose: () => void;
  onAnswered: () => void;
}

export function AnswerRfiModal({
  open,
  rfi,
  onClose,
  onAnswered,
}: AnswerRfiModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [answer, setAnswer] = useState(rfi?.answer || '');
  const [notes, setNotes] = useState(rfi?.notes || '');

  if (!rfi) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answer.trim()) {
      setErrorMsg('يرجى إدخال نص رد الاستشاري المعتمد');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.answerRfi(rfi.id, {
        answer: answer.trim(),
        notes: notes.trim() || undefined,
      });
      onAnswered();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ رد الاستفسار الفني');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`الرد على الاستفسار الفني: ${rfi.rfiNumber}`}
      subtitle={rfi.subject}
      width="min(680px, 95vw)"
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

        {/* نص السؤال الأصلي */}
        <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 'var(--font-caption)', color: '#64748b', marginBottom: '4px' }}>
            نص الاستفسار المقدم:
          </div>
          <div style={{ fontSize: 'var(--font-body)', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
            {rfi.question}
          </div>
        </div>

        {/* رد الاستشاري */}
        <Field label="نص رد واعتماد الاستشاري المشرف (Consultant Response) *">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="اكتب رد الاستشاري والحل المعتمد ومسار التنفيذ..."
            className="form-input"
            rows={5}
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', resize: 'vertical' }}
            required
          />
        </Field>

        <Field label="ملاحظات توثيقية إضافية">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: تم إرفاق سكتش الحل الهندسي مع خطاب الاعتماد رقم C-89"
            className="form-input"
            style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
          />
        </Field>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="اعتماد وإغلاق الاستفسار (Close RFI)"
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
