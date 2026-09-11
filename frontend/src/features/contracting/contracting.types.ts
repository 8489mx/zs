export type ProjectStatus = 'planning' | 'active' | 'suspended' | 'completed' | 'handed_over';
export type ChangeOrderImpactType = 'cost_only' | 'time_only' | 'cost_and_time';
export type ChangeOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type IpcType = 'client' | 'subcontractor';
export type IpcStatus = 'draft' | 'under_review' | 'approved' | 'paid';
export type SubcontractStatus = 'active' | 'completed' | 'terminated';
export type RfiStatus = 'open' | 'pending_reply' | 'answered' | 'closed';

export interface ContractingProject {
  id: string;
  code: string;
  name: string;
  clientId: number | null;
  clientName: string;
  status: ProjectStatus;
  contractValue: number;
  revisedContractValue: number;
  downPaymentAmount: number;
  downPaymentRecovered: number;
  retentionPercent: number;
  retentionTotalHeld: number;
  retentionReleased: number;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  siteLocationId: number | null;
  costCenterId: number | null;
  projectManager: string | null;
  locationAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // KPIs
  totalBilledClient: number;
  totalBilledSubcontractors: number;
  changeOrdersTotalCost: number;
  completionRatePercent: number;
  totalCostCommitted: number;
  actualCostIncurred: number;
  grossMarginForecast: number;
}

export interface ContractingBoqItem {
  id: string;
  projectId: string;
  itemCode: string;
  description: string;
  category: string;
  unit: string;
  contractQty: number;
  revisedQty: number;
  unitPrice: number;
  totalPrice: number;
  estimatedUnitCost: number;
  executedQty: number;
  notes?: string | null;
  createdAt: string;
}

export interface ContractingChangeOrder {
  id: string;
  projectId: string;
  changeOrderNumber: string;
  title: string;
  reason: string;
  impactType: ChangeOrderImpactType;
  costImpact: number;
  timeImpactDays: number;
  status: ChangeOrderStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ContractingInvoiceItem {
  id?: string;
  boqItemId?: string | null;
  description: string;
  unit: string;
  unitPrice: number;
  previousQty: number;
  currentQty: number;
  storedMaterialsQty: number;
  cumulativeQty: number;
  completionPercent: number;
  currentTotal: number;
  cumulativeTotal: number;
  notes?: string | null;
}

export interface ContractingInvoice {
  id: string;
  projectId: string;
  ipcNumber: string;
  ipcType: IpcType;
  subcontractorId?: number | null;
  subcontractorName?: string;
  sequenceOrder: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  previousAmount: number;
  currentAmount: number;
  storedMaterialsAmount: number;
  cumulativeAmount: number;
  advanceRecoveryAmount: number;
  retentionHeldAmount: number;
  otherDeductions: number;
  netPayable: number;
  status: IpcStatus;
  journalEntryId?: number | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  items?: ContractingInvoiceItem[];
  project?: ContractingProject;
}

export interface ContractingSubcontract {
  id: string;
  projectId: string;
  subcontractorId: number;
  contractNumber: string;
  scopeOfWork: string;
  totalAmount: number;
  retentionPercent: number;
  startDate?: string | null;
  endDate?: string | null;
  status: SubcontractStatus;
  notes?: string | null;
  createdAt: string;
}

export interface ContractingSiteDailyLog {
  id: string;
  projectId: string;
  logDate: string;
  weatherConditions?: string | null;
  laborCount: number;
  subcontractorLaborCount: number;
  equipmentOnSite?: string | null;
  workPerformed: string;
  delaysOrObstacles?: string | null;
  materialsReceived?: string | null;
  loggedBy?: string | null;
  createdAt: string;
}

export interface ContractingRfi {
  id: string;
  projectId: string;
  rfiNumber: string;
  subject: string;
  question: string;
  assignedTo?: string | null;
  status: RfiStatus;
  answer?: string | null;
  answeredBy?: string | null;
  answeredAt?: string | null;
  dateRequested: string;
  dateRequired?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ContractingSummaryKpis {
  totalContractValue: number;
  totalBilledToDate: number;
  totalRetentionsHeld: number;
  activeProjectsCount: number;
}

export type ScheduleTaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';
export type MaterialRequisitionStatus = 'issued' | 'draft' | 'approved';

export interface ContractingScheduleTask {
  id: string;
  projectId: string;
  taskCode: string;
  taskName: string;
  wbsCode: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  progressPercent: number;
  predecessorId?: string | null;
  isCriticalPath: boolean;
  status: ScheduleTaskStatus;
  boqItemId?: string | null;
  assignedTeam?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractingMaterialRequisition {
  id: string;
  projectId: string;
  requisitionNumber: string;
  boqItemId?: string | null;
  warehouseId?: number | null;
  productId?: number | null;
  itemName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  issueDate: string;
  recipientName?: string | null;
  status: MaterialRequisitionStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}


