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

// ============================================================================
// Enterprise Contracting Types
// ============================================================================

export type PriceItemType = 'material' | 'labor' | 'equipment' | 'subcontract';

export interface ContractingMasterPriceItem {
  id: string;
  itemType: PriceItemType;
  code: string;
  name: string;
  unit: string;
  unitRate: number;
  category: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EngineeringConstantComponent {
  componentCode: string;
  componentName: string;
  componentType: PriceItemType;
  qtyPerUnit: number;
  unit: string;
  unitRate?: number;
  totalCost?: number;
}

export interface ContractingEngineeringConstant {
  id: string;
  itemCode: string;
  itemName: string;
  unit: string;
  wastePercent: number;
  overheadPercent: number;
  profitMarkupPercent: number;
  components: EngineeringConstantComponent[];
  calculatedDirectCost?: number;
  calculatedSellingPrice?: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutoPriceBoqResult {
  constantCode: string;
  constantName: string;
  unit: string;
  quantity: number;
  unitDirectCost: number;
  suggestedUnitPrice: number;
  totalEstimatedCost: number;
  totalPrice: number;
  projectedProfit: number;
  breakdown: {
    name: string;
    code: string;
    qtyPerUnit: number;
    unit: string;
    unitRate: number;
    componentCost: number;
  }[];
}

export interface ContractingCostSnapshot {
  id: string;
  projectId: string;
  snapshotName: string;
  totalBudgetCost: number;
  totalContractValue: number;
  isLocked: boolean;
  lockedAt: string;
  lockedBy?: string | null;
  boqSnapshot: ContractingBoqItem[];
  createdAt: string;
}

export type RetentionStatus = 'held' | 'partially_released' | 'fully_released' | 'released' | 'active';

export interface ContractingRetentionRecord {
  id: string;
  projectId: string;
  subcontractId?: string | null;
  partyType?: 'client' | 'subcontractor';
  entityType?: string;
  partyId?: number | null;
  partyName?: string;
  entityName?: string;
  heldAmount?: number;
  retentionAmount?: number;
  amount?: number;
  releasedAmount?: number;
  releaseAmount?: number;
  retentionPercent?: number;
  ipcInvoiceId?: string | null;
  releaseDueDate?: string | null;
  status: RetentionStatus;
  guaranteeCertificateRef?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ContractingPaymentHold {
  id: string;
  projectId: string;
  subcontractId?: string | null;
  partyType?: 'subcontractor' | 'supplier' | 'boq_item';
  targetType?: string;
  partyName?: string;
  targetName?: string;
  holdAmount?: number;
  amount?: number;
  reason?: string;
  holdReason?: string;
  defectDescription?: string | null;
  isReleased?: boolean;
  status?: 'active' | 'released';
  holdDate?: string;
  releasedAt?: string | null;
  releaseDate?: string | null;
  releasedBy?: string | null;
  releaseNotes?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ContractingSupplierReturnItem {
  productId?: number | null;
  itemName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  reason: string;
}

export interface ContractingSupplierReturn {
  id: string;
  projectId: string;
  returnNumber?: string;
  supplierId?: number | null;
  supplierName?: string;
  materialName?: string;
  itemName?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  reason?: string;
  returnDate?: string;
  totalAmount?: number;
  status?: 'draft' | 'posted';
  creditNoteNumber?: string | null;
  items?: ContractingSupplierReturnItem[];
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type LaborTrade = 'carpenter' | 'blacksmith' | 'mason' | 'helper' | 'operator' | 'surveyor' | 'electrician' | 'plumber' | string;

export interface ContractingLaborAttendance {
  id: string;
  projectId: string;
  workerName: string;
  trade: LaborTrade;
  workDate: string;
  shiftType?: string;
  hoursWorked?: number;
  regularHours?: number;
  overtimeHours?: number;
  dailyRate?: number;
  dailyWage?: number;
  allocatedProjectSharePercent?: number;
  calculatedCost?: number;
  taskDescription?: string;
  splitProjectId?: string | null;
  splitHours?: number;
  totalWage?: number;
  status?: 'recorded' | 'approved' | 'paid' | string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type PettyCashStatus = 'active' | 'settled' | 'overdue' | 'closed';

export interface PettyCashReceipt {
  receiptNumber: string;
  expenseCategory: string;
  amount: number;
  description: string;
  vendorName?: string;
  receiptDate: string;
}

export interface ContractingPettyCashRecord {
  id: string;
  projectId: string;
  custodianName: string;
  custodianRole?: string;
  disbursementNumber?: string;
  amount: number;
  amountGiven?: number;
  spentAmount?: number;
  amountSettled?: number;
  remainingBalance?: number;
  remainingAmount?: number;
  issueDate: string;
  settledDate?: string;
  settlementDate?: string;
  settlementDueDate?: string | null;
  status: PettyCashStatus;
  receipts?: PettyCashReceipt[];
  receiptNumbers?: string;
  closureNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type ContractingPettyCash = ContractingPettyCashRecord;

export type LicenseType = 'excavation' | 'building' | 'civil_defense' | 'road_occupancy' | 'environmental' | 'other';
export type LicenseStatus = 'active' | 'expiring_soon' | 'expired' | 'renewed';

export interface ContractingGovernmentLicense {
  id: string;
  projectId: string;
  licenseType: LicenseType;
  licenseNumber: string;
  issuingAuthority: string;
  issueDate?: string | null;
  expiryDate: string;
  feeAmount: number;
  status: LicenseStatus;
  documentUrl?: string | null;
  alertLeadDays: number;
  daysUntilExpiry?: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectHealthScore {
  projectId: string;
  projectCode: string;
  projectName: string;
  score: number; // 0 - 100
  status: 'green' | 'yellow' | 'red';
  breakdown: {
    schedulePerformanceIndex: number;
    costPerformanceIndex: number;
    budgetVariancePercent: number;
    licensesComplianceScore: number;
    retentionRiskScore: number;
  };
  recommendations: string[];
}

export interface CashForecastBucket {
  period: '30_days' | '60_days' | '90_days';
  label: string;
  expectedInflows: number;
  expectedOutflows: number;
  netCashFlow: number;
}

export interface ContractingCashForecast {
  projectId?: string;
  totalCurrentCashPosition: number;
  buckets: CashForecastBucket[];
  upcomingCommitmentsSummary: {
    pendingSubcontractorIpcs: number;
    pendingSupplierInvoices: number;
    upcomingWages: number;
    upcomingLicenseRenewals: number;
  };
}

export interface ProjectMaterialRequirementItem {
  code: string;
  name: string;
  unit: string;
  type: string;
  requiredQuantity: number;
  dispatchedQuantity: number;
  remainingQuantity: number;
  fulfillmentPercent: number;
  unitRate: number;
  totalEstimatedCost: number;
}

export interface ProjectMaterialRequirementsSummary {
  projectId: string;
  totalDistinctMaterialsCount: number;
  totalMaterialsCost: number;
  items: ProjectMaterialRequirementItem[];
}

export interface BoqProfitabilityItem {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  unit: string;
  contractQty: number;
  executedQty: number;
  unitPrice: number;
  estimatedUnitCost: number;
  contractRevenue: number;
  estimatedCost: number;
  actualCost: number;
  projectedProfit: number;
  profitMarginPercent: number;
  realizedProfit: number;
  status: 'profitable' | 'at_risk' | 'loss';
}

export interface BoqProfitabilitySummary {
  projectId: string;
  totalProjectRevenue: number;
  totalProjectEstimatedCost: number;
  totalProjectActualCost: number;
  totalProjectProfit: number;
  overallMarginPercent: number;
  lossMakingItemsCount: number;
  itemsCount: number;
  items: BoqProfitabilityItem[];
}

export interface MasterBoqTrade {
  tradeCategory: string;
  tradeNameAr: string;
  itemsCount: number;
}

export interface MasterBoqItem {
  id: string;
  tradeCategory: string;
  tradeNameAr: string;
  itemCode: string;
  name: string;
  description: string;
  unit: string;
  standardCost: number;
  standardPrice: number;
  isActive: boolean;
  isCustom?: boolean;
  tenantId?: string;
  createdAt: string;
}
