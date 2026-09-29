import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';

export interface QCPointRecord {
  id: string;
  name: string;
  product_id?: number | null;
  product_name?: string | null;
  trigger_stage: 'receipt' | 'manufacturing' | 'delivery' | 'internal';
  test_type: 'pass_fail' | 'measure' | 'checklist';
  norm_measure_min?: number | null;
  norm_measure_max?: number | null;
  measure_unit?: string | null;
  instructions?: string | null;
  is_mandatory: boolean;
  created_at: string;
}

export interface QCInspectionRecord {
  id: string;
  point_id?: string | null;
  point_name?: string | null;
  reference_doc_type: string;
  reference_doc_id: string;
  product_id: number;
  product_name: string;
  product_code?: string;
  inspected_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  measured_value?: number | null;
  status: 'passed' | 'failed' | 'conditional';
  notes?: string | null;
  created_at: string;
}

export interface QCNCRRecord {
  id: string;
  ncr_number: string;
  inspection_id?: string | null;
  product_id: number;
  product_name: string;
  product_code?: string;
  defect_description: string;
  severity: 'minor' | 'major' | 'critical';
  root_cause?: string | null;
  disposition_action: 'quarantine_scrap' | 'return_to_vendor' | 'rework' | 'concession_accept';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution_notes?: string | null;
  assigned_to?: string | null;
  closed_at?: string | null;
  created_at: string;
}

export interface CreateQCPointPayload {
  name: string;
  productId?: number;
  triggerStage: 'receipt' | 'manufacturing' | 'delivery' | 'internal';
  testType: 'pass_fail' | 'measure' | 'checklist';
  normMeasureMin?: number;
  normMeasureMax?: number;
  measureUnit?: string;
  instructions?: string;
  isMandatory?: boolean;
}

export interface RecordInspectionPayload {
  pointId?: string;
  referenceDocType: 'goods_receipt' | 'work_order' | 'delivery' | 'adhoc';
  referenceDocId: string;
  productId: number;
  inspectedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  measuredValue?: number;
  passed?: boolean;
  notes?: string;
  autoCreateNcrOnFail?: boolean;
}

export interface CreateNCRPayload {
  inspectionId?: string;
  productId: number;
  defectDescription: string;
  severity: 'minor' | 'major' | 'critical';
  rootCause?: string;
  dispositionAction: 'quarantine_scrap' | 'return_to_vendor' | 'rework' | 'concession_accept';
  assignedTo?: string;
}

export const qualityAssuranceApi = {
  getSummary: async () => {
    return http<{
      rates: {
        totalInspected: number;
        totalAccepted: number;
        totalRejected: number;
        acceptanceRatePercent: number;
      };
      totalInspections: number;
      openNCRs: number;
      criticalDefects: number;
    }>('/api/inventory/quality/summary');
  },

  getPoints: async (params?: { triggerStage?: string; productId?: number }) => {
    const qs = params ? buildQueryString(params) : '';
    return http<QCPointRecord[]>(`/api/inventory/quality/points${qs}`);
  },

  createPoint: async (payload: CreateQCPointPayload) => {
    return http<{ success: boolean; id: string }>('/api/inventory/quality/points', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInspections: async (params?: { status?: string; docType?: string }) => {
    const qs = params ? buildQueryString(params) : '';
    return http<QCInspectionRecord[]>(`/api/inventory/quality/inspections${qs}`);
  },

  recordInspection: async (payload: RecordInspectionPayload) => {
    return http<{
      success: boolean;
      inspectionId: string;
      status: string;
      reason?: string;
      autoNcrNumber?: string;
    }>('/api/inventory/quality/inspections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getNCRs: async (params?: { status?: string; severity?: string }) => {
    const qs = params ? buildQueryString(params) : '';
    return http<QCNCRRecord[]>(`/api/inventory/quality/ncrs${qs}`);
  },

  createNCR: async (payload: CreateNCRPayload) => {
    return http<{ success: boolean; id: string; ncrNumber: string }>('/api/inventory/quality/ncrs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateNCRStatus: async (id: string, status: 'open' | 'investigating' | 'resolved' | 'closed', resolutionNotes?: string) => {
    return http<{ success: boolean }>(`/api/inventory/quality/ncrs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes }),
    });
  },
};
