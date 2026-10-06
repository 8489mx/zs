import { useState } from 'react';
import { toast } from '@/shared/components/system-alert';
import { maritimeApi, MaritimeJob } from '../../api/maritime-freight.api';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';

interface Props {
  job: MaritimeJob;
  onUpdated: () => void;
}

export function JobEgyptianAciCard({ job, onUpdated }: Props) {
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    acidNumber: job.acid_number || '',
    acidIssueDate: job.acid_issue_date || '',
    acidExpiryDate: job.acid_expiry_date || '',
    foreignExporterId: job.foreign_exporter_id || '',
    importerTaxId: job.importer_tax_id || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyAcid = () => {
    if (!job.acid_number) return;
    navigator.clipboard.writeText(job.acid_number);
    setCopied(true);
    toast.success('تم نسخ رقم القيد الجمركي المسبق (ACID)');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await maritimeApi.updateJob(job.id, {
        acidNumber: formData.acidNumber || undefined,
        acidIssueDate: formData.acidIssueDate || undefined,
        acidExpiryDate: formData.acidExpiryDate || undefined,
        foreignExporterId: formData.foreignExporterId || undefined,
        importerTaxId: formData.importerTaxId || undefined,
      } as any);
      toast.success('تم تحديث بيانات منظومة نافذة (ACI) بنجاح');
      setShowEditModal(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث بيانات القيد الجمركي');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #86efac',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: job.acid_number ? '#16a34a' : '#ea580c', display: 'inline-block' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
            منظومة التسجيل المسبق للشحنات - الجمارك المصرية (Nafeza ACI)
          </span>
          {job.acid_number && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
              معتمد ومسجل
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({
              acidNumber: job.acid_number || '',
              acidIssueDate: job.acid_issue_date || '',
              acidExpiryDate: job.acid_expiry_date || '',
              foreignExporterId: job.foreign_exporter_id || '',
              importerTaxId: job.importer_tax_id || '',
            });
            setShowEditModal(true);
          }}
          style={{
            padding: '3px 10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {job.acid_number ? 'تعديل بيانات ACI' : '+ تسجيل رقم ACID'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '6px' }}>
        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>رقم القيد الجمركي المسبق (ACID):</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 800, color: job.acid_number ? '#170e5e' : '#94a3b8' }}>
              {job.acid_number || 'غير مسجل'}
            </span>
            {job.acid_number && (
              <button
                type="button"
                onClick={handleCopyAcid}
                style={{ padding: '2px 6px', background: copied ? '#16a34a' : '#e2e8f0', color: copied ? '#ffffff' : '#475569', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            )}
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>صلاحية القيد الجمركي:</div>
          <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>
            {job.acid_issue_date ? `${job.acid_issue_date} إلى ${job.acid_expiry_date || '—'}` : 'قيد التسجيل'}
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>المصدر الأجنبي / الرقم الضريبي:</div>
          <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>
            {job.foreign_exporter_id ? `مصدر: ${job.foreign_exporter_id}` : ''} {job.importer_tax_id ? `| ضريبي: ${job.importer_tax_id}` : '—'}
          </div>
        </div>
      </div>

      <StandardDialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="تحديث بيانات منظومة نافذة والتسجيل المسبق (ACI)"
        subtitle="توثيق رقم القيد الجمركي المسبق ACID وتاريخ الصلاحية وبيانات المصدر والمستورد"
        width="540px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Field label="رقم القيد الجمركي المسبق (ACID Number - 19 رقماً)">
            <input
              type="text"
              placeholder="مثال: 2026100701234567890"
              value={formData.acidNumber}
              onChange={(e) => setFormData({ ...formData, acidNumber: e.target.value })}
              style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 700 }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="تاريخ الإصدار">
              <input
                type="date"
                value={formData.acidIssueDate}
                onChange={(e) => setFormData({ ...formData, acidIssueDate: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="تاريخ الصلاحية والانتهاء">
              <input
                type="date"
                value={formData.acidExpiryDate}
                onChange={(e) => setFormData({ ...formData, acidExpiryDate: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="كود أو اسم المصدر الأجنبي">
              <input
                type="text"
                placeholder="Foreign Exporter ID / Name"
                value={formData.foreignExporterId}
                onChange={(e) => setFormData({ ...formData, foreignExporterId: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="الرقم الضريبي للمستورد المصري">
              <input
                type="text"
                placeholder="رقم التسجيل الضريبي 9 أرقام"
                value={formData.importerTaxId}
                onChange={(e) => setFormData({ ...formData, importerTaxId: e.target.value })}
                style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </Field>
          </div>
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
            style={{ padding: '8px 20px', background: '#166534', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 700 }}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ بيانات ACI'}
          </button>
        </StandardDialogFooter>
      </StandardDialog>
    </div>
  );
}
