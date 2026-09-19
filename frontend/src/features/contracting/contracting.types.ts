export type ProjectStatus =
  | 'planning'
  | 'draft'
  | 'submitted'
  | 'negotiation'
  | 'active'
  | 'suspended'
  | 'completed'
  | 'handed_over'
  | 'lost'
  | 'cancelled';
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
  consultantName?: string | null;
  contractRef?: string | null;
  contractDate?: string | null;
  lossReason?: string | null;
  lossNotes?: string | null;
  competitorPrice?: number | null;
  revisionNumber?: number;
  originalTenderId?: number | null;
  submittedAt?: string | null;
  awardedAt?: string | null;
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
  estimatedCost?: number;
  executedQty: number;
  isSectionHeader?: boolean;
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
  wirId?: string | null;
  claimedQty?: number;
  certifiedQty?: number;
  varianceReason?: string | null;
  progressStage?: string | null;
  stageWeightPct?: number | null;
  changeOrderId?: string | null;
  notes?: string | null;
}

export type SubcontractType = 'supply_and_apply' | 'labor_only' | 'supply_only' | 'labor_plus_consumables';
export type PaymentLinkageMode = 'independent' | 'pay_when_paid' | 'pay_when_certified';

export interface ContractingInvoice {
  id: string;
  projectId: string;
  ipcNumber: string;
  ipcType: IpcType;
  subcontractId?: string | null;
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
  grossWorkDoneAmount?: number;
  escalationAmount?: number;
  mosAddedAmount?: number;
  mosReleasedAmount?: number;
  mosBalanceAmount?: number;
  backchargeAmount?: number;
  ldAmount?: number;
  materialExcessAmount?: number;
  sharedResourceAmount?: number;
  directPaymentAmount?: number;
  carriedForwardDebitIn?: number;
  taxableBaseAmount?: number;
  vatAmount?: number;
  whtAmount?: number;
  socialInsuranceAmount?: number;
  claimedAmount?: number;
  certifiedAmount?: number;
  certificationDueDate?: string | null;
  paymentDueDate?: string | null;
  calcEngineVersion?: string;
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
  subcontractorName?: string;
  contractNumber: string;
  contractType?: SubcontractType;
  scopeOfWork: string;
  totalAmount: number;
  retentionPercent: number;
  advancePct?: number;
  advanceAmount?: number;
  advanceRecoveryStartPct?: number;
  advanceRecoveryEndPct?: number;
  retentionLimitPct?: number;
  penaltyPerDay?: number;
  ldCapPct?: number;
  liabilityCapAmount?: number;
  whtRate?: number;
  socialInsurancePct?: number;
  paymentLinkageMode?: PaymentLinkageMode;
  paymentTermsDays?: number;
  tailReservePct?: number;
  wastageAllowancePct?: number;
  mosAdmissiblePct?: number;
  mosCapPct?: number;
  dlpMonths?: number;
  startDate?: string | null;
  endDate?: string | null;
  status: SubcontractStatus;
  notes?: string | null;
  createdAt: string;
  totalInvoiced?: number;
  totalRetentionHeld?: number;
  remainingCommitment?: number;
}

export interface ContractingSubcontractor {
  id: number;
  name: string;
  tradeSpecialty: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  commercialReg?: string;
  nationalId?: string;
  bankName?: string;
  bankIban?: string;
  contactPerson?: string;
  rating: number;
  status: 'active' | 'suspended' | 'blacklisted';
  notes?: string;
  createdAt?: string;
  subcontractsCount?: number;
  totalCommitted?: number;
  totalInvoiced?: number;
  totalRetentionHeld?: number;
  totalPaid?: number;
  netBalance?: number;
}

export interface ContractingSubcontractorPayment {
  id: number;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'check';
  referenceNumber?: string;
  notes?: string;
}

export interface SubcontractorLedgerTransaction {
  id: number;
  date: string;
  type: 'invoice' | 'payment' | 'backcharge';
  refNumber: string;
  description: string;
  projectId?: string;
  credit: number;
  debit: number;
  balanceAfter: number;
  details?: Record<string, any>;
}

export interface SubcontractorLedgerResponse {
  subcontractor: ContractingSubcontractor;
  summary: {
    totalSubcontracts: number;
    totalCommitted: number;
    totalInvoiced: number;
    totalPaid: number;
    totalBackcharges: number;
    totalRetentionHeld: number;
    netBalanceDue: number;
  };
  transactions: SubcontractorLedgerTransaction[];
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
  boqItemCode?: string;
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
  directLaborCost?: number;
  directMaterialCost?: number;
  directEquipmentCost?: number;
  allocatedIndirectCost?: number;
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

// 1. BOQ CAD Takeoff Sheet
export interface ContractingBoqTakeoff {
  id?: string;
  projectId?: string;
  boqItemId?: string;
  drawingRef: string;
  axisRef: string;
  description: string;
  length: number;
  width: number;
  height: number;
  countMultiplier: number;
  voidDeduction: number;
  netQty: number;
  wastePercent: number;
  totalWithWaste: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// 2. Site Mobilization & Worker Housing Expenses
export type MobilizationExpenseCategory =
  | 'worker_housing'
  | 'site_preparation'
  | 'temporary_utilities'
  | 'site_cabins'
  | 'permits_legal'
  | 'transport_logistics'
  | 'other';

export interface ContractingSiteMobilizationExpense {
  id: string;
  projectId: string;
  expenseCategory: MobilizationExpenseCategory;
  title: string;
  amount: number;
  expenseDate: string;
  paidTo: string;
  paymentMethod: string;
  referenceReceipt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractingMobilizationSummary {
  projectId: string;
  totalAmount: number;
  itemsCount: number;
  expenses: ContractingSiteMobilizationExpense[];
}

// 3. Labor Attendance, Overtime & Bonus/Deductions
export interface ContractingLaborAttendanceRecord {
  id: string;
  projectId: string;
  boqItemId?: string | null;
  boqItemCode?: string | null;
  boqDescription?: string | null;
  workerName: string;
  workerRole: 'supervisor' | 'master_craftsman' | 'technician' | 'helper' | 'laborer';
  attendanceDate: string;
  status: 'present' | 'absent' | 'half_day' | 'late';
  dailyBaseWage: number;
  overtimeHours: number;
  overtimeRatePerHour: number;
  nightShiftAllowance: number;
  bonusAmount: number;
  deductionAmount: number;
  totalPayable: number;
  isPaid: boolean;
  paymentBatchRef?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 4. Client Payment Milestones & In-Kind Barter Settlements
export interface ContractingClientPaymentMilestone {
  id: string;
  projectId: string;
  milestoneName: string;
  dueDate?: string | null;
  requiredProgressPercent: number;
  scheduledAmount: number;
  receivedAmount: number;
  settlementType: 'cash' | 'bank' | 'in_kind_unit' | 'mixed';
  inKindUnitRef?: string | null;
  inKindValuation: number;
  status: 'pending' | 'partially_paid' | 'fully_paid' | 'in_kind_settled';
  settledAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 5. Equipment & Tools Asset Tracking
export interface ContractingEquipmentAsset {
  id: string;
  assetCode: string;
  name: string;
  category: 'heavy_machinery' | 'power_tools' | 'safety_gear' | 'scaffolding' | 'measurement_survey' | 'generators';
  serialNumber?: string | null;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
  currentLocationDesc: string;
  assignedSupervisor?: string | null;
  operationalStatus: 'active_working' | 'under_maintenance' | 'idle_in_store' | 'retired';
  purchaseCost: number;
  purchaseDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractingEquipmentTransfer {
  id: string;
  equipmentId: string;
  equipmentCode?: string;
  equipmentName?: string;
  fromProjectId?: string | null;
  fromProjectName?: string | null;
  toProjectId?: string | null;
  toProjectName?: string | null;
  transferDate: string;
  dispatchedBy: string;
  receivedBy: string;
  conditionOnDispatch: string;
  conditionOnReceipt: string;
  notes?: string | null;
  createdAt: string;
}

// 6. Supplier Price Memory & Rating
export interface ContractingSupplierPriceMemory {
  id: string;
  supplierId: number;
  supplierName: string;
  materialName: string;
  unit: string;
  lastUnitPrice: number;
  lastPurchaseDate: string;
  lastProjectId?: string | null;
  lastProjectName?: string | null;
  governorate: string;
  paymentTerms: 'cash' | 'credit_30' | 'credit_60' | 'installments';
  qualityRating: number;
  deliverySpeedRating: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 7. Item Profitability Ledger
export interface ContractingItemProfitabilityItem {
  boqItemId: string;
  itemCode: string;
  description: string;
  unit: string;
  contractQty: number;
  revisedQty: number;
  unitPrice: number;
  totalContractRevenue: number;
  materialsCost: number;
  laborCost: number;
  subcontractsCost: number;
  allocatedMobilizationCost: number;
  totalActualCost: number;
  grossProfit: number;
  profitMarginPercent: number;
  isProfitable: boolean;
}

export interface ContractingItemProfitabilitySummary {
  projectId: string;
  totalRevenue: number;
  totalActualCost: number;
  totalProfit: number;
  overallMarginPercent: number;
  items: ContractingItemProfitabilityItem[];
}

// 8. Comprehensive 5-Stream Cost Breakdown
export interface ContractingCostStream {
  key: string;
  name: string;
  amount: number;
  count: number;
  percentOfTotal: number;
}

export interface ContractingProjectCostBreakdown {
  projectId: string;
  contractValue: number;
  costBaseline: number;
  totalActualCost: number;
  varianceVsBaseline: number;
  profitMarginPercent: number;
  streams: ContractingCostStream[];
}

// 9. Work Inspection Requests (WIR)
export type InspectionStatus = 'submitted' | 'approved' | 'approved_with_notes' | 'rejected';

export interface ContractingInspectionRequest {
  id: string;
  projectId: string;
  requestNumber: string;
  title: string;
  discipline: string;
  locationDetails: string;
  inspectionDate: string;
  status: InspectionStatus;
  consultantName?: string | null;
  consultantDecisionDate?: string | null;
  consultantNotes?: string | null;
  boqItemId?: string | null;
  boqItemDescription?: string | null;
  subcontractId?: string | null;
  subcontractorName?: string | null;
  attachments?: string | null;
  requestedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 10. Punch List / Snag Items
export type SnagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SnagStatus = 'open' | 'in_progress' | 'rectified' | 'verified_closed';

export interface ContractingSnagItem {
  id: string;
  projectId: string;
  itemNumber: string;
  description: string;
  location: string;
  severity: SnagSeverity;
  status: SnagStatus;
  identifiedBy: string;
  assignedTo?: string | null;
  targetDate?: string | null;
  closedDate?: string | null;
  rectificationNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 11. Project Handovers (Preliminary & Final)
export type HandoverType = 'preliminary' | 'final';
export type HandoverStatus = 'draft' | 'under_review' | 'approved' | 'rejected';

export interface ContractingProjectHandover {
  id: string;
  projectId: string;
  handoverType: HandoverType;
  handoverNumber: string;
  handoverDate: string;
  consultantRepresentative?: string | null;
  clientRepresentative?: string | null;
  contractorRepresentative?: string | null;
  committeeReport?: string | null;
  outstandingSnagCount: number;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  retentionReleasePercent: number;
  retentionReleaseAmount: number;
  status: HandoverStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 12. Material & Shop Drawing Submittals (MAR / MAS)
export type SubmittalType = 'material' | 'shop_drawing' | 'sample' | 'method_statement';
export type SubmittalStatus = 'submitted' | 'approved' | 'approved_as_noted' | 'revise_and_resubmit' | 'rejected';

export interface ContractingSubmittal {
  id: string;
  projectId: string;
  submittalNumber: string;
  submittalType: SubmittalType;
  title: string;
  specificationSection?: string | null;
  supplierManufacturer?: string | null;
  boqItemId?: string | null;
  boqItemCode?: string | null;
  subcontractId?: string | null;
  subcontractorName?: string | null;
  submissionDate: string;
  reviewDueDate?: string | null;
  consultantReviewDate?: string | null;
  status: SubmittalStatus;
  consultantName?: string | null;
  consultantComments?: string | null;
  attachments?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 13. Material Price Escalation Claims
export type MaterialEscalationType = 'rebar_steel' | 'portland_cement' | 'ready_mix' | 'bitumen' | 'sand_gravel' | 'other';
export type MaterialEscalationStatus = 'draft' | 'submitted_to_client' | 'approved_by_consultant' | 'settled_in_ipc' | 'rejected';

export interface ContractingMaterialEscalation {
  id: string;
  projectId: string;
  claimNumber: string;
  materialType: MaterialEscalationType;
  materialName: string;
  basePriceContract: number;
  currentMarketPrice: number;
  priceDifference: number;
  executedQuantity: number;
  unit: string;
  totalCompensationAmount: number;
  bulletinSourceReference?: string | null;
  status: MaterialEscalationStatus;
  ipcInvoiceId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 14. Subcontractor Back-Charges & Penalties
export type BackchargeCategory = 'damage_rework' | 'safety_fine' | 'equipment_usage' | 'material_supplied' | 'site_cleanup' | 'other';
export type BackchargeStatus = 'pending_approval' | 'applied_to_deduction' | 'waived';

export interface ContractingSubcontractorBackcharge {
  id: string;
  projectId: string;
  voucherNumber: string;
  subcontractId: string;
  subcontractorName?: string | null;
  beneficiarySubcontractId?: string | null;
  beneficiarySubcontractorName?: string | null;
  backchargeCategory: BackchargeCategory;
  amount: number;
  description: string;
  occurrenceDate: string;
  status: BackchargeStatus;
  appliedIpcInvoiceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 15. Equipment Fuel & Operating Meter Logs
export interface ContractingEquipmentFuelLog {
  id: string;
  projectId: string;
  equipmentId?: string | null;
  equipmentName: string;
  logDate: string;
  startMeterHours: number;
  endMeterHours: number;
  operatingHours: number;
  fuelLitersAdded: number;
  fuelCostTotal: number;
  driverOperatorName?: string | null;
  boqItemId?: string | null;
  boqItemCode?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 16. Earned Value Management (EVM) & S-Curve Metrics
export interface ContractingProjectEvmMetrics {
  projectId: string;
  projectCode: string;
  projectName: string;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  budgetAtCompletion: number;
  costVariance: number;
  scheduleVariance: number;
  cpi: number;
  spi: number;
  estimateAtCompletion: number;
  varianceAtCompletion: number;
  toCompletePerformanceIndex: number;
  healthIndicator: 'excellent' | 'good' | 'at_risk' | 'critical';
  sCurvePoints: {
    periodName: string;
    plannedCumulative: number;
    earnedCumulative: number;
    actualCumulative: number;
  }[];
}

// 17. Bank Guarantees & Gateway G1 (خطابات الضمان البنكية والبوابة الرقابية)
export type GuaranteeType =
  | 'advance_payment'
  | 'performance'
  | 'retention'
  | 'maintenance'
  | 'bid_bond';

export type GuaranteeStatus =
  | 'active'
  | 'expired'
  | 'released'
  | 'confiscated_invoked'
  | 'cancelled';

export interface ContractingGuarantee {
  id: string;
  projectId: string;
  projectName?: string | null;
  projectCode?: string | null;
  subcontractId?: string | null;
  subcontractNumber?: string | null;
  subcontractTitle?: string | null;
  subcontractorId?: number | null;
  subcontractorName?: string | null;
  guaranteeNumber: string;
  guaranteeType: GuaranteeType;
  issuingBank: string;
  amount: number;
  currency: string;
  issueDate: string;
  expiryDate: string;
  claimExpiryDate?: string | null;
  reductionSchedule?: any;
  status: GuaranteeStatus;
  documentUrl?: string | null;
  notes?: string | null;
  daysRemaining?: number;
  alertTier?: 'critical_t7' | 'warning_t30' | 'info_t60' | 'expired' | 'healthy';
  createdAt?: string;
  updatedAt?: string;
}

export interface GuaranteeExpiryAlert {
  guaranteeId: string;
  guaranteeNumber: string;
  guaranteeType: GuaranteeType;
  issuingBank: string;
  amount: number;
  expiryDate: string;
  daysRemaining: number;
  alertTier: 'critical_t7' | 'warning_t30' | 'info_t60' | 'expired';
  alertMessageAr: string;
}

// =============================================================================
// Track 1: Field Indirect Cost Allocation Types (AACE RP 10S-90 / 34R-05)
// =============================================================================

export type CostPoolType = 'labor_care' | 'labor_burden' | 'equipment_shared' | 'site_supervision' | 'custom';
export type DriverType = 'labor_days' | 'labor_cost' | 'equipment_hours' | 'direct_effort' | 'manual_ratio';

export interface CostPool {
  id: string;
  projectId: string;
  poolCode: string;
  poolName: string;
  poolType: CostPoolType;
  driverType: DriverType;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface IndirectExpense {
  id: string;
  projectId: string;
  poolId: string;
  poolCode: string;
  poolName: string;
  poolType: CostPoolType;
  driverType: DriverType;
  batchId?: string | null;
  mobilizationExpenseId?: string | null;
  expenseTitle: string;
  grossAmount: number;
  recoveredAmount: number;
  netAmount: number;
  expenseDate: string;
  voucherRef?: string | null;
  createdAt: string;
}

export interface AllocationBatch {
  id: string;
  projectId: string;
  batchNumber: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'posted' | 'reversed';
  totalGrossExpenses: number;
  totalRecoveredBackcharges: number;
  totalNetPoolCost: number;
  totalAllocatedAmount: number;
  deferredInAmount: number;
  deferredOutAmount: number;
  postedAt?: string | null;
  postedBy?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ItemAllocationDetail {
  boqItemId: string;
  boqCode: string;
  driverQty: number;
  allocationRatio: number;
  allocatedAmount: number;
}

export interface PoolAllocationResult {
  poolId: string;
  poolCode: string;
  poolName: string;
  poolType: CostPoolType;
  driverType: DriverType;
  grossExpenseAmount: number;
  recoveredBackchargeAmount: number;
  deferredInAmount: number;
  netPoolCost: number;
  totalDriverQty: number;
  ratePerDriverUnit: number;
  deferredOutAmount: number;
  allocatedAmountTotal: number;
  allocations: ItemAllocationDetail[];
}

export interface BoqItemAggregatedSummary {
  boqItemId: string;
  boqCode: string;
  allocatedByPool: Record<string, number>;
  totalAllocatedIndirectCost: number;
}

export interface BatchAllocationSummary {
  totalGrossExpense: number;
  totalRecoveredBackcharge: number;
  totalDeferredIn: number;
  totalNetCost: number;
  totalAllocated: number;
  totalDeferredOut: number;
  poolSummaries: PoolAllocationResult[];
  boqItemSummaries: BoqItemAggregatedSummary[];
}

export interface CreateCostPoolPayload {
  poolCode: string;
  poolName: string;
  poolType: CostPoolType;
  driverType: DriverType;
  description?: string;
}

export interface CreateIndirectExpensePayload {
  poolId: string;
  expenseTitle: string;
  grossAmount: number;
  recoveredAmount?: number;
  expenseDate?: string;
  voucherRef?: string;
  mobilizationExpenseId?: string;
}

export interface CreateAllocationBatchPayload {
  periodStart: string;
  periodEnd: string;
  deferredInAmount?: number;
  notes?: string;
}




