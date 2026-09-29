import { useState, useEffect, useMemo, type FC } from 'react';
import {
  recruitmentAtsApi,
  type ApplicantRecord,
  type JobOpeningRecord,
} from '../api/recruitment-ats.api';
import { CreateJobOpeningModal } from '../components/recruitment/CreateJobOpeningModal';
import { CreateApplicantModal } from '../components/recruitment/CreateApplicantModal';
import { ApplicantDetailsModal } from '../components/recruitment/ApplicantDetailsModal';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/shared/components/system-alert';
import {
  PlusIcon,
  SearchIcon,
  LayersIcon,
} from '@/shared/components/icons/AppIcons';

const KANBAN_STAGES: Array<{ id: ApplicantRecord['stage']; label: string; color: string; bg: string }> = [
  { id: 'new', label: '1. متقدم جديد', color: '#1e293b', bg: '#f1f5f9' },
  { id: 'screening', label: '2. فحص السير الذاتية', color: '#0369a1', bg: '#e0f2fe' },
  { id: 'interview', label: '3. المقابلات الشخصية', color: '#7c2d12', bg: '#ffedd5' },
  { id: 'offer', label: '4. عروض العمل (Offer)', color: '#6b21a8', bg: '#f3e8ff' },
  { id: 'hired', label: '5. تم التعيين والتوظيف', color: '#15803d', bg: '#dcfce7' },
];

export const RecruitmentKanbanPage: FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [jobs, setJobs] = useState<JobOpeningRecord[]>([]);
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [selectedPool, setSelectedPool] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRecord | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [mRes, jRes, aRes] = await Promise.all([
        recruitmentAtsApi.getMetrics(),
        recruitmentAtsApi.getJobs(),
        recruitmentAtsApi.getApplicants({
          jobId: selectedJobId !== 'all' ? selectedJobId : undefined,
          talentPoolTag: selectedPool !== 'all' ? selectedPool : undefined,
          search: search.trim() || undefined,
        }),
      ]);
      setMetrics(mRes);
      setJobs(jRes || []);
      setApplicants(aRes || []);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل بيانات التوظيف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedJobId, selectedPool]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAllData();
  };

  // Group applicants by stage
  const groupedApplicants = useMemo(() => {
    const groups: Record<string, ApplicantRecord[]> = {
      new: [],
      screening: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };

    for (const app of applicants) {
      if (groups[app.stage]) {
        groups[app.stage].push(app);
      }
    }
    return groups;
  }, [applicants]);

  return (
    <div style={{ maxWidth: '1280px', width: 'min(100%, 1280px)', margin: '0 auto', padding: '24px 16px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            منظومة تتبع المتقدمين للوظائف ومجمعات المواهب (Recruitment ATS)
          </h1>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            لوحة كانبان لمتابعة خط أنابيب المرشحين، مجمعات المواهب، والتعيين بنقرة واحدة
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsJobModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LayersIcon size={15} />
            وظيفة شاغرة جديدة
          </button>
          <button
            onClick={() => setIsApplicantModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={16} />
            إضافة متقدم جديد
          </button>
        </div>
      </div>

      {/* KPI Funnel Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>إجمالي المتقدمين</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {metrics?.funnel?.totalApplicants ?? applicants.length}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>قيد الفحص والمقابلات</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7' }}>
            {(metrics?.funnel?.screeningCount || 0) + (metrics?.funnel?.interviewCount || 0)}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>عروض العمل (Offers)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#9333ea' }}>
            {metrics?.funnel?.offerCount ?? 0}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>تم التعيين (Hired)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>
            {metrics?.funnel?.hiredCount ?? 0}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>معدل التوظيف الناجح</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#170e5e' }}>
            {metrics?.funnel?.conversionRatePercent ?? 0}%
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', cursor: 'pointer' }}
          >
            <option value="all">كافة الوظائف الشاغرة</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.job_code})
              </option>
            ))}
          </select>

          <select
            value={selectedPool}
            onChange={(e) => setSelectedPool(e.target.value)}
            style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', cursor: 'pointer' }}
          >
            <option value="all">كافة مجمعات المواهب (Talent Pools)</option>
            <option value="sales">مواهب المبيعات والتسويق</option>
            <option value="engineering">مواهب البرمجيات والهندسة</option>
            <option value="accounting">مواهب المحاسبة والمالية</option>
            <option value="operations">مواهب العمليات واللوجستيات</option>
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="بحث باسم المرشح، الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '220px', height: '34px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
          <button
            type="submit"
            style={{ padding: '0 12px', height: '34px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
          >
            <SearchIcon size={15} />
          </button>
        </form>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>جاري تحميل خط أنابيب التوظيف...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))', gap: '14px', alignItems: 'start', overflowX: 'auto', paddingBottom: '16px' }}>
          {KANBAN_STAGES.map((col) => {
            const list = groupedApplicants[col.id] || [];
            return (
              <div
                key={col.id}
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  minHeight: '400px',
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, background: col.bg, color: col.color, padding: '2px 8px', borderRadius: '12px' }}>
                    {list.length}
                  </span>
                </div>

                {/* Candidate Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {list.length === 0 ? (
                    <div style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      لا يوجد مرشحون في هذه المرحلة
                    </div>
                  ) : (
                    list.map((candidate) => (
                      <div
                        key={candidate.id}
                        onClick={() => setSelectedApplicant(candidate)}
                        style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                            {candidate.full_name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {candidate.applicant_number}
                          </span>
                        </div>

                        <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '6px' }}>
                          {candidate.job_title || 'مجمع مواهب عام'}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#64748b' }}>
                          <span>{candidate.phone}</span>
                          {candidate.expected_salary && (
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>
                              {formatCurrency(candidate.expected_salary)}
                            </span>
                          )}
                        </div>

                        {candidate.talent_pool_tag && (
                          <div style={{ marginTop: '6px' }}>
                            <span style={{ fontSize: '10.5px', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                              {candidate.talent_pool_tag}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateJobOpeningModal
        open={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSuccess={fetchAllData}
      />

      <CreateApplicantModal
        open={isApplicantModalOpen}
        onClose={() => setIsApplicantModalOpen(false)}
        onSuccess={fetchAllData}
        jobs={jobs}
      />

      <ApplicantDetailsModal
        open={!!selectedApplicant}
        onClose={() => setSelectedApplicant(null)}
        applicant={selectedApplicant}
        onUpdated={fetchAllData}
      />
    </div>
  );
};
