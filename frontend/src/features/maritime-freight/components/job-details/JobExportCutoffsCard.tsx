import { useState } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { maritimeApi, MaritimeJob } from '../../api/maritime-freight.api';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';

interface Props {
  job: MaritimeJob;
  onUpdated: () => void;
}

export function JobExportCutoffsCard({ job, onUpdated }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    siCutoffDate: job.si_cutoff_date ? new Date(job.si_cutoff_date).toISOString().slice(0, 16) : '',
    vgmCutoffDate: job.vgm_cutoff_date ? new Date(job.vgm_cutoff_date).toISOString().slice(0, 16) : '',
    portCutoffDate: job.port_cutoff_date ? new Date(job.port_cutoff_date).toISOString().slice(0, 16) : job.port_cut_off ? new Date(job.port_cut_off).toISOString().slice(0, 16) : '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await maritimeApi.updateJob(job.id, {
        siCutoffDate: formData.siCutoffDate || undefined,
        vgmCutoffDate: formData.vgmCutoffDate || undefined,
        portCutoffDate: formData.portCutoffDate || undefined,
      } as any);
      toast.success('تم تحديث المواعيد الحرجة للشحنة بنجاح');
      setShowEditModal(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث المواعيد الحرجة');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCutoff = (dt?: string | Date | null) => {
    if (!dt) return 'غير محدد';
    const dateObj = new Date(dt);
    return dateObj.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #fde68a',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e' }}>
            رادار المواعيد الحرجة للتصدير وتفويت الحاويات (Export Deadlines & Cut-offs)
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({
              siCutoffDate: job.si_cutoff_date ? new Date(job.si_cutoff_date).toISOString().slice(0, 16) : '',
              vgmCutoffDate: job.vgm_cutoff_date ? new Date(job.vgm_cutoff_date).toISOString().slice(0, 16) : '',
              portCutoffDate: job.port_cutoff_date ? new Date(job.port_cutoff_date).toISOString().slice(0, 16) : job.port_cut_off ? new Date(job.port_cut_off).toISOString().slice(0, 16) : '',
            });
            setShowEditModal(true);
          }}
          style={{
            padding: '3px 10px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            color: '#b45309',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ضبط المواعيد الحرجة
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '6px' }}>
        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>موعد تعليمات الشحن (SI Cut-off):</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
            {formatCutoff(job.si_cutoff_date)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>إغلاق بوليصة الشحن مسودة</div>
        </div>

        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>موعد شهادة الوزن (VGM Cut-off):</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#170e5e', marginTop: '2px', fontFamily: 'monospace' }}>
            {formatCutoff(job.vgm_cutoff_date)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>إقرار وزن SOLAS الإلزامي</div>
        </div>

        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>موعد دخول وبوابات الميناء (Port Cut-off):</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px', fontFamily: 'monospace' }}>
            {formatCutoff(job.port_cutoff_date || job.port_cut_off)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '1px' }}>إغلاق ساحة محطة الحاويات</div>
        </div>
      </div>

      <StandardDialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="تحديث المواعيد الحرجة للشحنة (Deadlines & Cut-offs)"
        subtitle="تحديد التوقيتات الصارمة لإغلاق بوابات الميناء ومسودة البوليصة وشهادة VGM"
        width="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Field label="موعد إغلاق تعليمات الشحن (SI Cut-off)">
            <input
              type="datetime-local"
              value={formData.siCutoffDate}
              onChange={(e) => setFormData({ ...formData, siCutoffDate: e.target.value })}
              style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="موعد إغلاق شهادة الوزن المعتمد (VGM Cut-off)">
            <input
              type="datetime-local"
              value={formData.vgmCutoffDate}
              onChange={(e) => setFormData({ ...formData, vgmCutoffDate: e.target.value })}
              style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="موعد إغلاق بوابات الميناء (Port / Gate-in Cut-off)">
            <input
              type="datetime-local"
              value={formData.portCutoffDate}
              onChange={(e) => setFormData({ ...formData, portCutoffDate: e.target.value })}
              style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </Field>
        </div>

        <StandardDialogFooter>
          <button
            type="button"
            onClick={() => setShowEditModal(false)}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: '8px 20px', background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 700 }}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ المواعيد'}
          </button>
        </StandardDialogFooter>
      </StandardDialog>
    </div>
  );
}
