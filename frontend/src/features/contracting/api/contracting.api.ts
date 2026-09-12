import { http } from '@/lib/http';
import {
  ContractingProject,
  ContractingBoqItem,
  ContractingChangeOrder,
  ContractingInvoice,
  ContractingSubcontract,
  ContractingSiteDailyLog,
  ContractingRfi,
  ContractingScheduleTask,
  ContractingMaterialRequisition,
} from '../contracting.types';

function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const contractingApi = {
  // Projects
  getProjects: (params?: { status?: string; search?: string }) =>
    http<ContractingProject[]>(`/api/contracting/projects${toQueryString(params)}`),

  getProjectById: (id: string) =>
    http<ContractingProject>(`/api/contracting/projects/${id}`),

  createProject: (data: Partial<ContractingProject>) =>
    http<ContractingProject>('/api/contracting/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: string, data: Partial<ContractingProject>) =>
    http<ContractingProject>(`/api/contracting/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: string) =>
    http<{ success: boolean; message: string }>(`/api/contracting/projects/${id}`, {
      method: 'DELETE',
    }),

  // BOQ / Schedule of Values
  getBoqItems: (projectId: string) =>
    http<ContractingBoqItem[]>(`/api/contracting/projects/${projectId}/boq`),

  createBoqItem: (projectId: string, data: Partial<ContractingBoqItem>) =>
    http<ContractingBoqItem>(`/api/contracting/projects/${projectId}/boq`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  batchCreateBoqItems: (projectId: string, items: Array<Partial<ContractingBoqItem>>) =>
    http<{ success: boolean; count: number; items: ContractingBoqItem[] }>(
      `/api/contracting/projects/${projectId}/boq/batch`,
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      }
    ),

  updateBoqItem: (id: string, data: Partial<ContractingBoqItem>) =>
    http<ContractingBoqItem>(`/api/contracting/boq/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteBoqItem: (id: string) =>
    http<{ success: boolean }>(`/api/contracting/boq/${id}`, {
      method: 'DELETE',
    }),

  // Change Orders
  getChangeOrders: (projectId: string) =>
    http<ContractingChangeOrder[]>(`/api/contracting/projects/${projectId}/change-orders`),

  createChangeOrder: (projectId: string, data: Partial<ContractingChangeOrder>) =>
    http<ContractingChangeOrder>(`/api/contracting/projects/${projectId}/change-orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateChangeOrderStatus: (id: string, data: { status: string; notes?: string }) =>
    http<ContractingChangeOrder>(`/api/contracting/change-orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Invoices / IPCs
  getInvoices: (projectId: string, type: 'client' | 'subcontractor' = 'client') =>
    http<ContractingInvoice[]>(`/api/contracting/projects/${projectId}/invoices?type=${type}`),

  getInvoiceById: (id: string) =>
    http<ContractingInvoice>(`/api/contracting/invoices/${id}`),

  createInvoice: (projectId: string, data: any) =>
    http<ContractingInvoice>(`/api/contracting/projects/${projectId}/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveInvoice: (id: string) =>
    http<ContractingInvoice>(`/api/contracting/invoices/${id}/approve`, {
      method: 'POST',
    }),

  postInvoiceJournal: (id: string) =>
    http<{ success: boolean; journalEntryId: number; entryNo: string; message?: string }>(
      `/api/contracting/invoices/${id}/post-journal`,
      {
        method: 'POST',
      }
    ),

  // Subcontracts
  getSubcontracts: (projectId: string) =>
    http<ContractingSubcontract[]>(`/api/contracting/projects/${projectId}/subcontracts`),

  createSubcontract: (projectId: string, data: Partial<ContractingSubcontract>) =>
    http<ContractingSubcontract>(`/api/contracting/projects/${projectId}/subcontracts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Daily Site Logs
  getDailyLogs: (projectId: string) =>
    http<ContractingSiteDailyLog[]>(`/api/contracting/projects/${projectId}/daily-logs`),

  createDailyLog: (projectId: string, data: Partial<ContractingSiteDailyLog>) =>
    http<ContractingSiteDailyLog>(`/api/contracting/projects/${projectId}/daily-logs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // RFIs
  getRfiList: (projectId: string) =>
    http<ContractingRfi[]>(`/api/contracting/projects/${projectId}/rfis`),

  createRfi: (projectId: string, data: Partial<ContractingRfi>) =>
    http<ContractingRfi>(`/api/contracting/projects/${projectId}/rfis`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  answerRfi: (id: string, data: { answer: string; notes?: string }) =>
    http<ContractingRfi>(`/api/contracting/rfis/${id}/answer`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Schedule Tasks (Gantt & WBS)
  getScheduleTasks: (projectId: string) =>
    http<ContractingScheduleTask[]>(`/api/contracting/projects/${projectId}/tasks`),

  createScheduleTask: (projectId: string, data: Partial<ContractingScheduleTask>) =>
    http<ContractingScheduleTask>(`/api/contracting/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateScheduleTask: (id: string, data: Partial<ContractingScheduleTask>) =>
    http<ContractingScheduleTask>(`/api/contracting/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteScheduleTask: (id: string) =>
    http<{ success: boolean; message: string }>(`/api/contracting/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Material Requisitions (أذون صرف الخامات)
  getMaterialRequisitions: (projectId: string) =>
    http<ContractingMaterialRequisition[]>(`/api/contracting/projects/${projectId}/material-requisitions`),

  createMaterialRequisition: (projectId: string, data: Partial<ContractingMaterialRequisition>) =>
    http<ContractingMaterialRequisition>(`/api/contracting/projects/${projectId}/material-requisitions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteMaterialRequisition: (id: string) =>
    http<{ success: boolean; message: string }>(`/api/contracting/material-requisitions/${id}`, {
      method: 'DELETE',
    }),

  // Master Price List
  getMasterPriceList: (params?: { itemType?: string; category?: string; search?: string }) =>
    http<any[]>(`/api/contracting/price-list${toQueryString(params)}`),

  createMasterPriceItem: (data: any) =>
    http<any>('/api/contracting/price-list', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMasterPriceItem: (id: string, data: any) =>
    http<any>(`/api/contracting/price-list/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMasterPriceItem: (id: string) =>
    http<{ success: boolean }>(`/api/contracting/price-list/${id}`, {
      method: 'DELETE',
    }),

  // Engineering Constants & Auto-Pricing
  getEngineeringConstants: () =>
    http<any[]>('/api/contracting/engineering-constants'),

  createEngineeringConstant: (data: any) =>
    http<any>('/api/contracting/engineering-constants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  autoPriceBoqItem: (data: {
    constantCode: string;
    quantity: number;
    customWastePercent?: number;
    customOverheadPercent?: number;
    customProfitMarkupPercent?: number;
  }) =>
    http<any>('/api/contracting/auto-price-boq', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Cost Snapshots
  getCostSnapshots: (projectId: string) =>
    http<any[]>(`/api/contracting/projects/${projectId}/snapshots`),

  createCostSnapshot: (projectId: string, data: { snapshotName: string }) =>
    http<any>(`/api/contracting/projects/${projectId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Retention & Guarantees
  getRetentionRecords: (params?: { projectId?: string; status?: string }) =>
    http<any[]>(`/api/contracting/retentions${toQueryString(params)}`),

  createRetentionRecord: (projectId: string, data: any) =>
    http<any>(`/api/contracting/projects/${projectId}/retentions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  releaseRetentionRecord: (id: string, data: { releaseAmount: number; notes?: string }) =>
    http<any>(`/api/contracting/retentions/${id}/release`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Payment Holds
  getPaymentHolds: (params?: { projectId?: string; isReleased?: boolean }) =>
    http<any[]>(`/api/contracting/payment-holds${toQueryString(params)}`),

  createPaymentHold: (projectId: string, data: any) =>
    http<any>(`/api/contracting/projects/${projectId}/payment-holds`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  releasePaymentHold: (id: string, data?: { releaseNotes?: string }) =>
    http<any>(`/api/contracting/payment-holds/${id}/release`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  // Supplier Returns
  getSupplierReturns: (projectId?: string) =>
    http<any[]>(`/api/contracting/supplier-returns${toQueryString({ projectId })}`),

  createSupplierReturn: (projectId: string, data: any) =>
    http<any>(`/api/contracting/projects/${projectId}/supplier-returns`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Labor Attendance
  getLaborAttendance: (params?: { projectId?: string; workDate?: string }) =>
    http<any[]>(`/api/contracting/labor-attendance${toQueryString(params)}`),

  createLaborAttendance: (projectId: string, data: any) =>
    http<any>(`/api/contracting/projects/${projectId}/labor-attendance`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Petty Cash Custody
  getPettyCashRecords: (params?: { projectId?: string; status?: string }) =>
    http<any[]>(`/api/contracting/petty-cash${toQueryString(params)}`),

  createPettyCash: (projectId: string, data: any) =>
    http<any>(`/api/contracting/projects/${projectId}/petty-cash`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  settlePettyCash: (id: string, data: { receipts: any[]; closureNotes?: string }) =>
    http<any>(`/api/contracting/petty-cash/${id}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Government Licenses
  getGovernmentLicenses: (params?: { projectId?: string; status?: string }) =>
    http<any[]>(`/api/contracting/government-licenses${toQueryString(params)}`),

  createGovernmentLicense: (projectId: string, data: any) =>
    http<any>(`/api/contracting/projects/${projectId}/government-licenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Executive Intelligence & Planning
  getProjectHealthScore: (projectId: string) =>
    http<any>(`/api/contracting/projects/${projectId}/health-score`),

  getCashForecast: (projectId?: string) =>
    http<any>(`/api/contracting/cash-forecast${toQueryString({ projectId })}`),

  getProjectMaterialRequirements: (projectId: string) =>
    http<any>(`/api/contracting/projects/${projectId}/material-requirements`),

  getBoqProfitabilityAnalysis: (projectId: string) =>
    http<any>(`/api/contracting/projects/${projectId}/profitability`),

  // Multi-Trade Master BOQ Library & Project Import
  getMasterBoqTrades: () =>
    http<import('../contracting.types').MasterBoqTrade[]>('/api/contracting/master-boq/trades'),

  getMasterBoqLibrary: (params?: { tradeCategory?: string; search?: string }) =>
    http<import('../contracting.types').MasterBoqItem[]>(`/api/contracting/master-boq/items${toQueryString(params)}`),

  createMasterBoqItem: (data: any) =>
    http<import('../contracting.types').MasterBoqItem>('/api/contracting/master-boq/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMasterBoqItem: (id: string, data: any) =>
    http<import('../contracting.types').MasterBoqItem>(`/api/contracting/master-boq/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMasterBoqItem: (id: string) =>
    http<{ success: boolean; message: string }>(`/api/contracting/master-boq/items/${id}`, {
      method: 'DELETE',
    }),

  importMasterBoqToProject: (projectId: string, itemIds: (string | number)[]) =>
    http<{ success: boolean; importedCount: number; projectId: string; items: any[] }>(
      `/api/contracting/projects/${projectId}/boq/import-master`,
      {
        method: 'POST',
        body: JSON.stringify({ itemIds }),
      },
    ),

  // 1. BOQ CAD Quantity Takeoffs
  getBoqTakeoffs: (boqItemId: string) =>
    http<import('../contracting.types').ContractingBoqTakeoff[]>(`/api/contracting/boq/${boqItemId}/takeoffs`),

  saveBoqTakeoffs: (boqItemId: string, data: { takeoffs: import('../contracting.types').ContractingBoqTakeoff[]; syncToBoqQuantity?: boolean }) =>
    http<{ success: boolean; totalCalculatedQty: number; count: number; takeoffs: any[] }>(
      `/api/contracting/boq/${boqItemId}/takeoffs`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  // 2. Site Mobilization & Worker Housing Expenses
  getMobilizationExpenses: (projectId: string) =>
    http<import('../contracting.types').ContractingMobilizationSummary>(`/api/contracting/projects/${projectId}/mobilization`),

  getSiteMobilizationExpenses: (projectId: string) =>
    http<import('../contracting.types').ContractingMobilizationSummary>(`/api/contracting/projects/${projectId}/mobilization`),

  createMobilizationExpense: (projectId: string, data: Partial<import('../contracting.types').ContractingSiteMobilizationExpense>) =>
    http<import('../contracting.types').ContractingSiteMobilizationExpense>(
      `/api/contracting/projects/${projectId}/mobilization`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  createSiteMobilizationExpense: (projectId: string, data: Partial<import('../contracting.types').ContractingSiteMobilizationExpense>) =>
    http<import('../contracting.types').ContractingSiteMobilizationExpense>(
      `/api/contracting/projects/${projectId}/mobilization`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  deleteMobilizationExpense: (id: string) =>
    http<{ success: boolean }>(`/api/contracting/mobilization/${id}`, {
      method: 'DELETE',
    }),

  // 3. Labor Attendance & Overtime Records
  getLaborAttendanceRecords: (projectId: string, date?: string) =>
    http<{ projectId: string; totalPayable: number; totalOvertimeHours: number; recordsCount: number; records: import('../contracting.types').ContractingLaborAttendanceRecord[] }>(
      `/api/contracting/projects/${projectId}/labor-records${toQueryString({ date })}`,
    ),

  recordLaborAttendance: (projectId: string, data: Partial<import('../contracting.types').ContractingLaborAttendanceRecord>) =>
    http<import('../contracting.types').ContractingLaborAttendanceRecord>(
      `/api/contracting/projects/${projectId}/labor-records`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  deleteLaborAttendanceRecord: (id: string) =>
    http<{ success: boolean }>(`/api/contracting/labor-records/${id}`, {
      method: 'DELETE',
    }),

  // 4. Client Payment Milestones & In-Kind Barter
  getClientPaymentMilestones: (projectId: string) =>
    http<{ projectId: string; totalScheduled: number; totalReceived: number; totalInKindSettled: number; milestones: import('../contracting.types').ContractingClientPaymentMilestone[] }>(
      `/api/contracting/projects/${projectId}/milestones`,
    ),

  createClientPaymentMilestone: (projectId: string, data: Partial<import('../contracting.types').ContractingClientPaymentMilestone>) =>
    http<import('../contracting.types').ContractingClientPaymentMilestone>(
      `/api/contracting/projects/${projectId}/milestones`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  recordInKindBarterDeduction: (milestoneId: string, data: { inKindUnitRef: string; inKindValuation: number; notes?: string }) =>
    http<import('../contracting.types').ContractingClientPaymentMilestone>(
      `/api/contracting/milestones/${milestoneId}/barter-settlement`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  deleteClientPaymentMilestone: (id: string) =>
    http<{ success: boolean }>(`/api/contracting/milestones/${id}`, {
      method: 'DELETE',
    }),

  // 5. Equipment & Tools Asset Tracking
  getEquipmentAssets: (params?: { projectId?: string; category?: string; operationalStatus?: string; search?: string }) =>
    http<import('../contracting.types').ContractingEquipmentAsset[]>(`/api/contracting/equipment${toQueryString(params)}`),

  createEquipmentAsset: (data: Partial<import('../contracting.types').ContractingEquipmentAsset>) =>
    http<import('../contracting.types').ContractingEquipmentAsset>('/api/contracting/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transferEquipmentAsset: (equipmentId: string, data: { toProjectId?: string; toProjectName?: string; transferDate?: string; dispatchedBy: string; receivedBy: string; conditionOnDispatch?: string; conditionOnReceipt?: string; notes?: string }) =>
    http<import('../contracting.types').ContractingEquipmentAsset>(`/api/contracting/equipment/${equipmentId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEquipmentTransfers: (equipmentId?: string) =>
    http<import('../contracting.types').ContractingEquipmentTransfer[]>(`/api/contracting/equipment-transfers${toQueryString({ equipmentId })}`),

  // 6. Supplier Price Memory & Rating Directory
  getSupplierPriceMemory: (params?: { supplierId?: number; materialName?: string; governorate?: string; paymentTerms?: string }) =>
    http<import('../contracting.types').ContractingSupplierPriceMemory[]>(`/api/contracting/supplier-price-memory${toQueryString(params)}`),

  recordSupplierPriceMemory: (data: Partial<import('../contracting.types').ContractingSupplierPriceMemory>) =>
    http<import('../contracting.types').ContractingSupplierPriceMemory>('/api/contracting/supplier-price-memory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 7. Item-Level Direct Profitability Ledger
  getItemProfitabilityLedger: (projectId: string) =>
    http<import('../contracting.types').ContractingItemProfitabilitySummary>(`/api/contracting/projects/${projectId}/item-profitability`),
};



