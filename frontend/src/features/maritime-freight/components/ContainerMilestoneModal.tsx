import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { maritimeApi, MaritimeContainer } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';

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
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8125rem' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <div><strong>العميل:</strong> {container.customer_name || '—'}</div>
          <div><strong>أمر الشغل:</strong> {container.job_number || '—'}</div>
          <div><strong>فترة السماح:</strong> {container.free_days || 14} يوماً</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="تاريخ التفريغ بالميناء (Discharge Date)">
            <input
              type="date"
              value={dischargedAt}
              onChange={(e) => setDischargedAt(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
            />
          </Field>

          <Field label="تاريخ خروج البوابة (Gate-Out Date)">
            <input
              type="date"
              value={gatedOutAt}
              onChange={(e) => setGatedOutAt(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
            />
          </Field>
        </div>

        <Field label="رقم السيل / الختم الملاحي (Seal Number)">
          <input
            type="text"
            value={sealNumber}
            onChange={(e) => setSealNumber(e.target.value)}
            placeholder="مثال: ML-EG-998822"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
          />
        </Field>

        <Field label="ملاحظات الحركة والتشغيل">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="ملاحظات فحص الحاوية، حالة الطرد، أو تعليمات الساحة..."
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8125rem', resize: 'vertical' }}
          />
        </Field>
      </div>

      <StandardDialogFooter
        onCancel={onClose}
        onConfirm={handleSave}
        isSubmitting={isSubmitting}
        confirmText="حفظ تحديثات الحركة"
      />
    </StandardDialog>
  );
}
