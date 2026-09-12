import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

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
      width="min(920px, 95vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="إرسال طلب الاستفسار (Submit RFI)"
          isSubmitting={isSubmitting}
        />
      )}
    >
      <style>{`
        .rfi-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .rfi-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .rfi-compact-modal input,
        .rfi-compact-modal textarea {
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
        .rfi-compact-modal textarea {
          height: auto !important;
          min-height: 52px !important;
          padding: 6px 10px !important;
          resize: vertical !important;
          line-height: 1.4 !important;
          font-family: inherit !important;
        }
        .rfi-compact-modal input:focus,
        .rfi-compact-modal textarea:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 2px rgba(23, 14, 94, 0.1) !important;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="rfi-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* 1. بيانات الاستفسار والتوجيه */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.FileText size={15} />
            <span>1. بيانات الاستفسار الهندسي والتوجيه (RFI Subject & Routing)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.2fr', gap: '10px', alignItems: 'start' }}>
            <Field label="رقم الاستفسار (RFI No.) *">
              <input
                type="text"
                value={formData.rfiNumber}
                onChange={(e) => setFormData({ ...formData, rfiNumber: e.target.value })}
                placeholder="مثال: RFI-2026-001"
                style={{ fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}
                required
              />
            </Field>

            <Field label="موضوع الاستفسار الفني (Subject) *">
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="مثال: تضارب مسار دكت التكييف مع الجسر الساقط بالمحور C-4"
                required
              />
            </Field>

            <Field label="الجهة الموجه إليها">
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                placeholder="مثال: دار الهندسة / الاستشاري"
              />
            </Field>
          </div>
        </div>

        {/* 2. المواعيد والمخططات المرجعية */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Calendar size={15} />
            <span>2. المواعيد الزمنية والمخططات المرجعية (Schedule & Drawings)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px', alignItems: 'start' }}>
            <Field label="تاريخ التقديم *">
              <input
                type="date"
                value={formData.dateRequested}
                onChange={(e) => setFormData({ ...formData, dateRequested: e.target.value })}
                required
              />
            </Field>

            <Field label="تاريخ الرد المطلوب (Due Date)">
              <input
                type="date"
                value={formData.dateRequired}
                onChange={(e) => setFormData({ ...formData, dateRequired: e.target.value })}
              />
            </Field>

            <Field label="أرقام المخططات المرجعية والمواصفات (اختياري)">
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="مثال: المخطط المعماري A-102 والإنشائي S-204 مراجعة Rev.B..."
              />
            </Field>
          </div>
        </div>

        {/* 3. نص وتفاصيل الاستفسار الفني */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Tag size={14} />
            <span>3. تفاصيل الاستفسار الفني المطلوب اعتماده (Query & Technical Details)</span>
          </div>

          <Field label="نص وتفاصيل الاستفسار الفني المطلوب اعتماده *">
            <textarea
              rows={3}
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="يرجى توضيح المناسيب المطلوبة لتفادي التعارض الهندسي وإفادتنا بالتعديل المعتمد للبدء في أعمال التنفيذ..."
              required
            />
          </Field>
        </div>
      </form>
    </StandardDialog>
  );
}
