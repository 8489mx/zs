import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';
import type {
  PharmacyDrug,
  PharmacyBatch,
  PharmacyPrescription,
  PharmacyShortage,
  PharmacyClinicalService,
  PharmacyStats,
} from '../types/pharmacy.types';

export const pharmacyApi = {
  getStats: async (): Promise<PharmacyStats> => {
    return http<PharmacyStats>('/api/pharmacy/stats');
  },

  listDrugs: async (params?: {
    q?: string;
    activeIngredient?: string;
    dosageForm?: string;
    controlledLevel?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = buildQueryString(params || {});
    return http<{
      drugs: PharmacyDrug[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    }>(`/api/pharmacy/drugs${qs}`);
  },

  findSubstitutes: async (activeIngredient: string, strength?: string): Promise<PharmacyDrug[]> => {
    const qs = buildQueryString({ activeIngredient, strength });
    return http<PharmacyDrug[]>(`/api/pharmacy/drugs/substitutes${qs}`);
  },

  upsertDrug: async (data: Partial<PharmacyDrug>): Promise<PharmacyDrug> => {
    return http<PharmacyDrug>('/api/pharmacy/drugs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteDrug: async (id: number): Promise<{ success: boolean }> => {
    return http<{ success: boolean }>(`/api/pharmacy/drugs/${id}`, {
      method: 'DELETE',
    });
  },

  listBatches: async (params?: {
    status?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = buildQueryString(params || {});
    return http<{
      batches: PharmacyBatch[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    }>(`/api/pharmacy/batches${qs}`);
  },

  upsertBatch: async (data: Partial<PharmacyBatch>): Promise<PharmacyBatch> => {
    return http<PharmacyBatch>('/api/pharmacy/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listPrescriptions: async (params?: {
    status?: string;
    insuranceProvider?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = buildQueryString(params || {});
    return http<{
      prescriptions: PharmacyPrescription[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    }>(`/api/pharmacy/prescriptions${qs}`);
  },

  upsertPrescription: async (data: Partial<PharmacyPrescription> & { items?: any[] }): Promise<PharmacyPrescription> => {
    return http<PharmacyPrescription>('/api/pharmacy/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listShortages: async (params?: {
    status?: string;
    priority?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = buildQueryString(params || {});
    return http<{
      shortages: PharmacyShortage[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    }>(`/api/pharmacy/shortages${qs}`);
  },

  upsertShortage: async (data: Partial<PharmacyShortage>): Promise<PharmacyShortage> => {
    return http<PharmacyShortage>('/api/pharmacy/shortages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateShortageStatus: async (id: number, status: string): Promise<PharmacyShortage> => {
    return http<PharmacyShortage>(`/api/pharmacy/shortages/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  listClinicalServices: async (): Promise<PharmacyClinicalService[]> => {
    return http<PharmacyClinicalService[]>('/api/pharmacy/clinical-services');
  },

  createClinicalService: async (data: Partial<PharmacyClinicalService>): Promise<PharmacyClinicalService> => {
    return http<PharmacyClinicalService>('/api/pharmacy/clinical-services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
