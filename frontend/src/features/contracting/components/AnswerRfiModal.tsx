import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
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
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText={isSubmitting ? 'جارٍ الاعتماد...' : 'اعتماد وإغلاق الاستفسار (Close RFI)'}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* بطاقة 1: نص الاستفسار المقدم */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.HelpCircle size={15} />
            <span>1. نص الاستفسار الفني الوارد من الموقع</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.6, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', whiteSpace: 'pre-wrap' }}>
            {rfi.question}
          </div>
        </div>

        {/* بطاقة 2: رد واعتماد الاستشاري المشرف */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.FileCheck size={15} />
            <span>2. رد واعتماد الاستشاري المشرف والحل الهندسي</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Field label="نص رد واعتماد الاستشاري المشرف (Consultant Response) *">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="اكتب رد الاستشاري والحل المعتمد ومسار التنفيذ الهندسي..."
                className="form-input"
                rows={4}
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '8px 10px',
                  fontSize: '0.8125rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
                required
              />
            </Field>

            <Field label="ملاحظات توثيقية إضافية / رقم خطاب الاعتماد">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تم إرفاق سكتش الحل الهندسي مع خطاب الاعتماد رقم C-89"
                className="form-input"
                style={{
                  width: '100%',
                  height: '33px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '0.8125rem',
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
