import { useState, type FC, type FormEvent } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { recruitmentAtsApi, type CreateJobPayload } from '../../api/recruitment-ats.api';

interface CreateJobOpeningModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateJobOpeningModal: FC<CreateJobOpeningModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('المبيعات والتسويق');
  const [headcount, setHeadcount] = useState('1');
  const [experienceYearsMin, setExperienceYearsMin] = useState('2');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [status] = useState<'published' | 'draft'>('published');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departmentOptions = [
    { value: 'المبيعات والتسويق', label: 'المبيعات والتسويق (Sales & Marketing)' },
    { value: 'المحاسبة والمالية', label: 'المحاسبة والمالية (Finance & Accounting)' },
    { value: 'المستودعات واللوجستيات', label: 'المستودعات واللوجستيات (Supply Chain)' },
    { value: 'تكنولوجيا المعلومات', label: 'تكنولوجيا المعلومات والبرمجيات (IT & Dev)' },
    { value: 'الموارد البشرية والإدارة', label: 'الموارد البشرية والإدارة (HR & Operations)' },
    { value: 'التصنيع والإنتاج', label: 'التصنيع والإنتاج (Manufacturing)' },
  ];

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      toast.warning('يرجى إدخال المسمى الوظيفي');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateJobPayload = {
        title: title.trim(),
        department,
        headcount: Math.max(1, Number(headcount) || 1),
        experienceYearsMin: Number(experienceYearsMin) || 0,
        description: description.trim() || undefined,
        requirements: requirements.trim() || undefined,
        status,
      };

      const res = await recruitmentAtsApi.createJob(payload);
      toast.success(`تم فتح الوظيفة الشاغرة بنجاح برقم: ${res.jobCode}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل فتح الوظيفة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="فتح وظيفة شاغرة جديدة (Create Job Opening)"
      subtitle="تحديد متطلبات الوظيفة، سنوات الخبرة، والعدد المستهدف للتوظيف"
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            المسمى الوظيفي *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: محاسب عام أول / مندوب مبيعات ميداني"
            style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              القسم / الإدارة *
            </label>
            <CustomSelect
              value={department}
              onChange={setDepartment}
              options={departmentOptions}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              العدد المطلوب توظيفه (Headcount) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            الحد الأدنى لسنوات الخبرة
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={experienceYearsMin}
            onChange={(e) => setExperienceYearsMin(e.target.value)}
            style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            الوصف الوظيفي والمسؤوليات
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="المهام اليومية، أهداف الأداء، والمسؤوليات المباشرة..."
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            المؤهلات والشروط المطلوبة
          </label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={2}
            placeholder="المؤهل العلمي، الدورات والشهادات التخصصية، والمهارات الفنية..."
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />
        </div>

        <StandardDialogFooter
          onClose={onClose}
          primaryButton={{
            label: isSubmitting ? 'جاري الفتح...' : 'نشر واعتماد الوظيفة',
            disabled: isSubmitting,
            onClick: () => handleSubmit(),
          }}
        />
      </form>
    </StandardDialog>
  );
};
