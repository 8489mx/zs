import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { maritimeApi, MaritimeContainer } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContainerMilestoneModalProps {
  open: boolean;
  container: MaritimeContainer | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ContainerMilestoneModal({
  open,
  container,
  onClose,
  onUpdated,
}: ContainerMilestoneModalProps) {
  const [dischargedAt, setDischargedAt] = useState('');
  const [gatedOutAt, setGatedOutAt] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (container) {
      setDischargedAt(container.discharged_at ? container.discharged_at.split('T')[0] : '');
      setGatedOutAt(container.gated_out_at ? container.gated_out_at.split('T')[0] : '');
      setSealNumber(container.seal_number || '');
      setNotes(container.notes || '');
      setErrorMsg(null);
    }
  }, [container]);

  if (!container) return null;

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await maritimeApi.updateContainer(container.id, {
        discharged_at: dischargedAt ? new Date(dischargedAt).toISOString() : null,
        gated_out_at: gatedOutAt ? new Date(gatedOutAt).toISOString() : null,
        seal_number: sealNumber || null,
        notes: notes || null,
      });

      toast.success('تم تحديث محطات حركة الحاوية بنجاح');
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحديث محطات الحاوية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تحديث محطات دورة حياة الحاوية"
      subtitle={`الحاوية: ${container.container_number} — ${container.container_type} (${container.shipping_line_name || 'الخط الملاحي'})`}
      width="min(640px, 95vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSave}
          isSubmitting={isSubmitting}
          submitText="حفظ تحديثات الحركة"
          cancelText="إلغاء"
        />
      )}
    >
      <style>{`
        .container-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .container-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .container-compact-modal input,
        .container-compact-modal textarea {
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 10px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          outline: none !important;
          width: 100% !important;
        }
        .container-compact-modal textarea {
          height: auto !important;
          min-height: 52px !important;
          padding: 6px 10px !important;
          resize: vertical !important;
          line-height: 1.4 !important;
        }
        .container-compact-modal input:focus,
        .container-compact-modal textarea:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 1px #170e5e !important;
        }
      `}</style>

      <div className="container-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} dir="rtl">
        {errorMsg && (
          <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8125rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Card 1: بطاقة ملخص الحاوية */}
        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.74rem' }}>العميل: </span>
            <strong style={{ color: '#0f172a' }}>{container.customer_name || '—'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.74rem' }}>أمر الشغل: </span>
            <strong style={{ color: '#1e40af' }}>{container.job_number || '—'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.74rem' }}>فترة السماح: </span>
            <strong style={{ color: '#15803d' }}>{container.free_days || 14} يوماً</strong>
          </div>
        </div>

        {/* Card 2: محطات الحركة والتسجيل */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Clock size={15} />
            <span>تواريخ محطات التفريغ وبوابات الميناء (Milestone Dates)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Field label="تاريخ التفريغ بالميناء (Discharge Date)">
              <input
                type="date"
                value={dischargedAt}
                onChange={(e) => setDischargedAt(e.target.value)}
              />
            </Field>

            <Field label="تاريخ خروج البوابة (Gate-Out Date)">
              <input
                type="date"
                value={gatedOutAt}
                onChange={(e) => setGatedOutAt(e.target.value)}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <Field label="رقم السيل / الختم الملاحي (Seal Number)">
              <input
                type="text"
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                placeholder="مثال: ML-EG-998822"
              />
            </Field>
          </div>
        </div>

        {/* Card 3: الملاحظات التشغيلية */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.FileText size={15} />
            <span>الملاحظات التشغيلية للمحطة</span>
          </div>

          <Field label="ملاحظات الحركة والتشغيل">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="ملاحظات فحص الحاوية، حالة الطرد، أو تعليمات الساحة..."
            />
          </Field>
        </div>
      </div>
    </StandardDialog>
  );
}
