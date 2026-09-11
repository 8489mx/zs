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
};

