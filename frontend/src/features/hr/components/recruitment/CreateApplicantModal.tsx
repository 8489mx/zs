import React, { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import {
  recruitmentAtsApi,
  type CreateApplicantPayload,
  type JobOpeningRecord,
} from '../../api/recruitment-ats.api';

interface CreateApplicantModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobs: JobOpeningRecord[];
}

export const CreateApplicantModal: React.FC<CreateApplicantModalProps> = ({
  open,
  onClose,
  onSuccess,
  jobs,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [jobId, setJobId] = useState<string>('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [experienceYears, setExperienceYears] = useState('2');
  const [rating, setRating] = useState('3');
  const [talentPoolTag, setTalentPoolTag] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobOptions = [
    { value: '', label: 'بدون وظيفة محددة (إضافة لمجمع المواهب العام Talent Pool)' },
    ...jobs
      .filter((j) => j.status === 'published')
      .map((j) => ({
        value: j.id,
        label: `${j.title} (${j.job_code}) - شواغر متبقية: ${Math.max(0, j.headcount - j.hired_count)}`,
      })),
  ];

  const poolOptions = [
    { value: '', label: 'بدون وسم تخصصي' },
    { value: 'sales', label: 'مواهب المبيعات والتسويق (Sales)' },
    { value: 'engineering', label: 'مواهب البرمجيات والهندسة (Engineering)' },
    { value: 'accounting', label: 'مواهب المحاسبة والمالية (Finance)' },
    { value: 'operations', label: 'مواهب العمليات وسلاسل الإمداد (Logistics)' },
    { value: 'management', label: 'مواهب القيادة والإدارة (Leadership)' },
  ];

  const ratingOptions = [
    { value: '1', label: '1 نجمة - غير واعد' },
    { value: '2', label: '2 نجمتان - مقبول' },
    { value: '3', label: '3 نجوم - جيد' },
    { value: '4', label: '4 نجوم - متميز' },
    { value: '5', label: '5 نجوم - كفاءة استثنائية (Top Talent)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.warning('يرجى إدخال اسم المرشح ورقم الهاتف');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateApplicantPayload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        jobId: jobId || undefined,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
        experienceYears: Number(experienceYears) || 0,
        rating: Number(rating) || 3,
        talentPoolTag: talentPoolTag || undefined,
        cvUrl: cvUrl.trim() || undefined,
        interviewNotes: interviewNotes.trim() || undefined,
      };

      const res = await recruitmentAtsApi.createApplicant(payload);
      toast.success(`تم تسجيل المرشح بنجاح برقم: ${res.applicantNumber}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسجيل المرشح');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إضافة متقدم للوظيفة / مجمع المواهب (Add Applicant)"
      subtitle="تسجيل بيانات السيرة الذاتية، التقييم الأولي، والتصنيف المهني"
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            اسم المرشح بالكامل *
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم الرباعي أو الثلاثي للمتقدم..."
            style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              رقم الهاتف / الواتساب *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            الوظيفة الشاغرة المرتبطة
          </label>
          <CustomSelect
            value={jobId}
            onChange={setJobId}
            options={jobOptions}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              تصنيف مجمع المواهب (Talent Pool)
            </label>
            <CustomSelect
              value={talentPoolTag}
              onChange={setTalentPoolTag}
              options={poolOptions}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              التقييم الأولي
            </label>
            <CustomSelect
              value={rating}
              onChange={setRating}
              options={ratingOptions}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              الراتب المتوقع
            </label>
            <input
              type="number"
              min="0"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value)}
              placeholder="مثال: 10000"
              style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              سنوات الخبرة الفعلية
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            رابط السيرة الذاتية (CV / Portfolio Link)
          </label>
          <input
            type="url"
            value={cvUrl}
            onChange={(e) => setCvUrl(e.target.value)}
            placeholder="https://drive.google.com/... أو رابط لينكد إن"
            style={{ width: '100%', height: '36px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            ملاحظات المقابلة المبدئية
          </label>
          <textarea
            value={interviewNotes}
            onChange={(e) => setInterviewNotes(e.target.value)}
            rows={2}
            placeholder="انطباع المقابلة الأولية، موعد البدء المتاح، أو الملاحظات السلوكية..."
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />
        </div>

        <StandardDialogFooter
          onClose={onClose}
          primaryButton={{
            label: isSubmitting ? 'جاري التسجيل...' : 'تسجيل المرشح',
            disabled: isSubmitting,
            type: 'submit',
          }}
        />
      </form>
    </StandardDialog>
  );
};
