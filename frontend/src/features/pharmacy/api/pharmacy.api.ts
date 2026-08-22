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

export interface MasterDrugItem {
  id: string;
  trade_name: string;
  trade_name_ar: string;
  active_ingredient: string;
  active_ingredient_ar: string;
  dosage_form: string;
  strength: string;
  manufacturer: string;
  drug_class: string;
  prescription_required: boolean;
  controlled_level: 'none' | 'table_1' | 'table_2';
  units_per_box: number;
  unit_name: string;
  box_price: number;
  strip_price: number;
  barcode: string;
  indications?: string;
}

export const pharmacyApi = {
  getStats: async (): Promise<PharmacyStats> => {
    return http<PharmacyStats>('/api/pharmacy/stats');
  },

  // Master Egyptian Drug Index
  getMasterCatalog: async (params?: {
    q?: string;
    drugClass?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = buildQueryString(params || {});
    return http<{
      drugs: MasterDrugItem[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    }>(`/api/pharmacy/master-catalog${qs}`);
  },

  seedAllMasterDrugs: async () => {
    return http<{
      success: boolean;
      totalMasterDrugs: number;
      insertedCount: number;
      updatedCount: number;
      message: string;
    }>('/api/pharmacy/master-catalog/seed-all', {
      method: 'POST',
    });
  },

  importSelectedMasterDrugs: async (drugIds: string[]) => {
    return http<{ success: boolean; importedCount: number }>('/api/pharmacy/master-catalog/import-selected', {
      method: 'POST',
      body: JSON.stringify({ drugIds }),
    });
  },

  lookupBarcode: async (barcode: string) => {
    const qs = buildQueryString({ barcode });
    return http<{ foundIn: 'local' | 'master'; drug: any } | null>(`/api/pharmacy/master-catalog/lookup${qs}`);
  },

  // Distributor Invoice Importer
  importDistributorInvoice: async (data: {
    distributor: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    lines: Array<{
      productName: string;
      barcode?: string;
      quantity: number;
      bonusQuantity?: number;
      publicPrice: number;
      costPrice: number;
      expiryDate: string;
      batchNumber?: string;
    }>;
  }) => {
    return http<{
      success: boolean;
      distributor: string;
      invoiceNumber?: string;
      importedLinesCount: number;
      totalQuantity: number;
      totalCostSum: number;
      totalPublicSum: number;
      message: string;
    }>('/api/pharmacy/distributors/import-invoice', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Store Active Drugs
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
