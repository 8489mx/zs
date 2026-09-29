import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';

export interface JobOpeningRecord {
  id: string;
  job_code: string;
  title: string;
  department: string;
  experience_years_min: number;
  headcount: number;
  hired_count: number;
  description?: string | null;
  requirements?: string | null;
  status: 'draft' | 'published' | 'closed';
  applicantCount?: number;
  created_at: string;
}

export interface ApplicantRecord {
  id: string;
  job_id?: string | null;
  job_title?: string | null;
  job_code?: string | null;
  job_department?: string | null;
  applicant_number: string;
  full_name: string;
  email?: string | null;
  phone: string;
  expected_salary?: number | null;
  experience_years: number;
  stage: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  rating: number;
  talent_pool_tag?: string | null;
  cv_url?: string | null;
  interview_notes?: string | null;
  hired_employee_id?: number | null;
  created_at: string;
}

export interface CreateJobPayload {
  title: string;
  department: string;
  experienceYearsMin?: number;
  headcount: number;
  description?: string;
  requirements?: string;
  status?: 'draft' | 'published' | 'closed';
}

export interface CreateApplicantPayload {
  jobId?: string;
  fullName: string;
  email?: string;
  phone: string;
  expectedSalary?: number;
  experienceYears?: number;
  rating?: number;
  talentPoolTag?: string;
  cvUrl?: string;
  interviewNotes?: string;
}

export const recruitmentAtsApi = {
  getMetrics: async () => {
    return http<{
      funnel: {
        newCount: number;
        screeningCount: number;
        interviewCount: number;
        offerCount: number;
        hiredCount: number;
        rejectedCount: number;
        totalApplicants: number;
        conversionRatePercent: number;
      };
      openJobsCount: number;
      totalJobsCount: number;
    }>('/api/hr/recruitment/metrics');
  },

  getJobs: async (params?: { status?: string; search?: string }) => {
    const qs = params ? buildQueryString(params) : '';
    return http<JobOpeningRecord[]>(`/api/hr/recruitment/jobs${qs}`);
  },

  createJob: async (payload: CreateJobPayload) => {
    return http<{ success: boolean; id: string; jobCode: string }>('/api/hr/recruitment/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getApplicants: async (params?: { stage?: string; jobId?: string; talentPoolTag?: string; search?: string }) => {
    const qs = params ? buildQueryString(params) : '';
    return http<ApplicantRecord[]>(`/api/hr/recruitment/applicants${qs}`);
  },

  createApplicant: async (payload: CreateApplicantPayload) => {
    return http<{ success: boolean; id: string; applicantNumber: string }>('/api/hr/recruitment/applicants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStage: async (id: string, stage: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected', interviewNotes?: string, rating?: number) => {
    return http<{ success: boolean }>(`/api/hr/recruitment/applicants/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage, interviewNotes, rating }),
    });
  },

  hire: async (id: string, customSalary?: number, branchId?: number) => {
    return http<{ success: boolean; employeeId: number }>(`/api/hr/recruitment/applicants/${id}/hire`, {
      method: 'POST',
      body: JSON.stringify({ customSalary, branchId }),
    });
  },
};
