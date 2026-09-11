import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { contractingApi } from '../api/contracting.api';

interface CreateDailyLogModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateDailyLogModal({
  open,
  projectId,
  projectName,
  onClose,
  onCreated,
}: CreateDailyLogModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    logDate: new Date().toISOString().split('T')[0],
    weatherConditions: 'مشمس / معتدل',
    laborCount: '0',
    subcontractorLaborCount: '0',
    equipmentOnSite: '',
    workPerformed: '',
    delaysOrObstacles: '',
    materialsReceived: '',
    loggedBy: '',
  });

  const totalLabor = Number(formData.laborCount || 0) + Number(formData.subcontractorLaborCount || 0);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.logDate) {
      setErrorMsg('يرجى تحديد تاريخ التقرير اليومي');
      return;
    }
    if (!formData.workPerformed.trim()) {
      setErrorMsg('يرجى توثيق الأعمال المنفذة في الموقع');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await contractingApi.createDailyLog(projectId, {
        logDate: formData.logDate,
        weatherConditions: formData.weatherConditions.trim() || undefined,
        laborCount: Number(formData.laborCount || 0),
        subcontractorLaborCount: Number(formData.subcontractorLaborCount || 0),
        equipmentOnSite: formData.equipmentOnSite.trim() || undefined,
        workPerformed: formData.workPerformed.trim(),
        delaysOrObstacles: formData.delaysOrObstacles.trim() || undefined,
        materialsReceived: formData.materialsReceived.trim() || undefined,
        loggedBy: formData.loggedBy.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التقرير اليومي للموقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تقرير الموقع اليومي (Site Daily Diary Log)"
      subtitle={projectName ? `المشروع: ${projectName}` : 'توثيق العمالة والمعدات والأعمال والمعوقات الميدانية'}
      width="min(760px, 95vw)"
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

        {/* التاريخ وحالة الطقس ومهندس الموقع */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <Field label="تاريخ التقرير *">
            <input
              type="date"
              value={formData.logDate}
              onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              required
            />
          </Field>

          <Field label="حالة الطقس والأجواء">
            <input
              type="text"
              value={formData.weatherConditions}
              onChange={(e) => setFormData({ ...formData, weatherConditions: e.target.value })}
              placeholder="مثال: مشمس 28°C / رياح خفيفة"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="مهندس الموقع / مُعد التقرير">
            <input
              type="text"
              value={formData.loggedBy}
              onChange={(e) => setFormData({ ...formData, loggedBy: e.target.value })}
              placeholder="اسم المهندس المشرف"
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>
        </div>

        {/* حصر العمالة */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b' }}>
              حصر القوى العاملة بالموقع (Headcount by Trade)
            </span>
            <span style={{ fontSize: 'var(--font-badge)', fontWeight: 600, color: '#170e5e', backgroundColor: '#e0e7ff', padding: '3px 10px', borderRadius: '12px' }}>
              إجمالي العمالة: {totalLabor} عامل
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="عمالة الشركة (الذاتية)">
              <input
                type="number"
                min="0"
                value={formData.laborCount}
                onChange={(e) => setFormData({ ...formData, laborCount: e.target.value })}
                className="form-input"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              />
            </Field>
            <Field label="عمالة مقاولي الباطن">
              <input
                type="number"
                min="0"
                value={formData.subcontractorLaborCount}
                onChange={(e) => setFormData({ ...formData, subcontractorLaborCount: e.target.value })}
                className="form-input"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
              />
            </Field>
          </div>
        </div>

        {/* الأعمال المنفذة */}
        <Field label="الأعمال المنفذة والإنجاز اليومي (Work Performed) *">
          <textarea
            value={formData.workPerformed}
            onChange={(e) => setFormData({ ...formData, workPerformed: e.target.value })}
            placeholder="مثال: استكمال نجارة وحدادة سقف الدور الثاني - الانتهاء من تمديد مواسير التغذية بالبلوك B - أعمال العزل المائي للأرضيات..."
            className="form-input"
            rows={3}
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', resize: 'vertical' }}
            required
          />
        </Field>

        {/* المعدات المشغلة والمواد المستلمة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="المعدات والآليات بالموقع (Equipment on Site)">
            <input
              type="text"
              value={formData.equipmentOnSite}
              onChange={(e) => setFormData({ ...formData, equipmentOnSite: e.target.value })}
              placeholder="مثال: ونش برجي عدد 1، لودر CAT عدد 2، مضخة خرسانة..."
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>

          <Field label="المواد والتوريدات المستلمة اليوم">
            <input
              type="text"
              value={formData.materialsReceived}
              onChange={(e) => setFormData({ ...formData, materialsReceived: e.target.value })}
              placeholder="مثال: 50 طن حديد تسليح عز، 2000 بلك بركاني..."
              className="form-input"
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }}
            />
          </Field>
        </div>

        {/* معوقات العمل أو توقفات */}
        <Field label="معوقات أو ملاحظات طارئة (Site Obstacles / Safety)">
          <textarea
            value={formData.delaysOrObstacles}
            onChange={(e) => setFormData({ ...formData, delaysOrObstacles: e.target.value })}
            placeholder="مثال: تأخر اعتماد عينات الرخام من الاستشاري، توقف الرافعة لمدة ساعتين للصيانة..."
            className="form-input"
            rows={2}
            style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', resize: 'vertical' }}
          />
        </Field>

        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          submitText="حفظ وتوثيق التقرير اليومي"
          isSubmitting={isSubmitting}
        />
      </form>
    </StandardDialog>
  );
}
