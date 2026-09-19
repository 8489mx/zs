import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, IsArray, IsBoolean, Min, Max, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  @IsIn(['planning', 'draft', 'submitted', 'negotiation', 'active', 'suspended', 'completed', 'handed_over', 'lost', 'cancelled'])
  status?: 'planning' | 'draft' | 'submitted' | 'negotiation' | 'active' | 'suspended' | 'completed' | 'handed_over' | 'lost' | 'cancelled';

  @IsNumber()
  @IsOptional()
  clientId?: number;

  @IsString()
  @IsOptional()
  clientName?: string;

  @IsNumber()
  @Min(0)
  contractValue!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  downPaymentAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionPercent?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  expectedEndDate?: string;

  @IsNumber()
  @IsOptional()
  siteLocationId?: number;

  @IsNumber()
  @IsOptional()
  costCenterId?: number;

  @IsString()
  @IsOptional()
  projectManager?: string;

  @IsString()
  @IsOptional()
  locationAddress?: string;

  @IsString()
  @IsOptional()
  consultantName?: string;

  @IsString()
  @IsOptional()
  contractRef?: string;

  @IsString()
  @IsOptional()
  contractDate?: string;

  @IsString()
  @IsOptional()
  lossReason?: string;

  @IsString()
  @IsOptional()
  lossNotes?: string;

  @IsNumber()
  @IsOptional()
  competitorPrice?: number;

  @IsNumber()
  @IsOptional()
  revisionNumber?: number;

  @IsNumber()
  @IsOptional()
  originalTenderId?: number;

  @IsString()
  @IsOptional()
  submittedAt?: string;

  @IsString()
  @IsOptional()
  awardedAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  clientId?: number;

  @IsString()
  @IsOptional()
  clientName?: string;

  @IsString()
  @IsOptional()
  @IsIn(['planning', 'draft', 'submitted', 'negotiation', 'active', 'suspended', 'completed', 'handed_over', 'lost', 'cancelled'])
  status?: 'planning' | 'draft' | 'submitted' | 'negotiation' | 'active' | 'suspended' | 'completed' | 'handed_over' | 'lost' | 'cancelled';

  @IsNumber()
  @Min(0)
  @IsOptional()
  contractValue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  downPaymentAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionPercent?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  expectedEndDate?: string;

  @IsString()
  @IsOptional()
  actualEndDate?: string;

  @IsNumber()
  @IsOptional()
  siteLocationId?: number;

  @IsNumber()
  @IsOptional()
  costCenterId?: number;

  @IsString()
  @IsOptional()
  projectManager?: string;

  @IsString()
  @IsOptional()
  locationAddress?: string;

  @IsString()
  @IsOptional()
  consultantName?: string;

  @IsString()
  @IsOptional()
  contractRef?: string;

  @IsString()
  @IsOptional()
  contractDate?: string;

  @IsString()
  @IsOptional()
  lossReason?: string;

  @IsString()
  @IsOptional()
  lossNotes?: string;

  @IsNumber()
  @IsOptional()
  competitorPrice?: number;

  @IsNumber()
  @IsOptional()
  revisionNumber?: number;

  @IsNumber()
  @IsOptional()
  originalTenderId?: number;

  @IsString()
  @IsOptional()
  submittedAt?: string;

  @IsString()
  @IsOptional()
  awardedAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MarkTenderLostDto {
  @IsString()
  @IsNotEmpty()
  lossReason!: string;

  @IsString()
  @IsOptional()
  lossNotes?: string;

  @IsNumber()
  @IsOptional()
  competitorPrice?: number;
}

export class AwardTenderDto {
  @IsString()
  @IsOptional()
  contractRef?: string;

  @IsString()
  @IsOptional()
  contractDate?: string;

  @IsNumber()
  @IsOptional()
  downPaymentAmount?: number;

  @IsNumber()
  @IsOptional()
  retentionPercent?: number;

  @IsString()
  @IsOptional()
  projectManager?: string;

  @IsString()
  @IsOptional()
  consultantName?: string;

  @IsString()
  @IsOptional()
  startDate?: string;
}

export class CreateBoqItemDto {
  @IsString()
  @IsNotEmpty()
  itemCode!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  contractQty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedUnitCost?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBoqItemDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  contractQty?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedUnitCost?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateChangeOrderDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  @IsIn(['cost_only', 'time_only', 'cost_and_time'])
  impactType?: 'cost_only' | 'time_only' | 'cost_and_time';

  @IsNumber()
  costImpact!: number;

  @IsInt()
  @IsOptional()
  timeImpactDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateChangeOrderStatusDto {
  @IsString()
  @IsIn(['draft', 'pending_approval', 'approved', 'rejected'])
  status!: 'draft' | 'pending_approval' | 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class IpcItemInputDto {
  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  previousQty?: number;

  @IsNumber()
  @Min(0)
  currentQty!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  storedMaterialsQty?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  wirId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  claimedQty?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  certifiedQty?: number;

  @IsString()
  @IsOptional()
  varianceReason?: string;

  @IsString()
  @IsOptional()
  progressStage?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stageWeightPct?: number;

  @IsString()
  @IsOptional()
  changeOrderId?: string;
}

export class CreateIpcInvoiceDto {
  @IsString()
  @IsOptional()
  @IsIn(['client', 'subcontractor'])
  ipcType?: 'client' | 'subcontractor';

  @IsNumber()
  @IsOptional()
  subcontractorId?: number;

  @IsString()
  @IsOptional()
  subcontractorName?: string;

  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  sequenceOrder?: number;

  @IsString()
  @IsOptional()
  periodStart?: string;

  @IsString()
  @IsOptional()
  periodEnd?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  advanceRecoveryPercent?: number;

  @IsBoolean()
  @IsOptional()
  advanceRecoveryOverride?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  otherDeductions?: number;

  @IsNumber()
  @IsOptional()
  grossWorkDoneAmount?: number;

  @IsNumber()
  @IsOptional()
  escalationAmount?: number;

  @IsNumber()
  @IsOptional()
  mosAddedAmount?: number;

  @IsNumber()
  @IsOptional()
  mosReleasedAmount?: number;

  @IsNumber()
  @IsOptional()
  backchargeAmount?: number;

  @IsNumber()
  @IsOptional()
  ldAmount?: number;

  @IsNumber()
  @IsOptional()
  materialExcessAmount?: number;

  @IsNumber()
  @IsOptional()
  sharedResourceAmount?: number;

  @IsNumber()
  @IsOptional()
  directPaymentAmount?: number;

  @IsNumber()
  @IsOptional()
  carriedForwardDebitIn?: number;

  @IsNumber()
  @IsOptional()
  whtAmount?: number;

  @IsNumber()
  @IsOptional()
  socialInsuranceAmount?: number;

  @IsNumber()
  @IsOptional()
  claimedAmount?: number;

  @IsNumber()
  @IsOptional()
  vatAmount?: number;

  @IsString()
  @IsOptional()
  certificationDueDate?: string;

  @IsString()
  @IsOptional()
  paymentDueDate?: string;

  @IsArray()
  @IsOptional()
  itemizedDeductions?: Array<{
    deductionType: string;
    sourceTable?: string;
    sourceId?: string;
    amount: number;
    vatTreatment?: string;
    debitNoteRef?: string;
    noticeRef?: string;
    description?: string;
  }>;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IpcItemInputDto)
  items!: IpcItemInputDto[];
}

export class CreateSubcontractDto {
  @IsNumber()
  subcontractorId!: number;

  @IsString()
  @IsOptional()
  contractNumber?: string;

  @IsString()
  @IsOptional()
  contractType?: 'supply_and_apply' | 'labor_only' | 'supply_only' | 'labor_plus_consumables';

  @IsString()
  @IsNotEmpty()
  scopeOfWork!: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  advancePct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  advanceAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  advanceRecoveryStartPct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  advanceRecoveryEndPct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionLimitPct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  penaltyPerDay?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ldCapPct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  liabilityCapAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  whtRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  socialInsurancePct?: number;

  @IsString()
  @IsOptional()
  paymentLinkageMode?: 'independent' | 'pay_when_paid' | 'pay_when_certified';

  @IsInt()
  @Min(0)
  @IsOptional()
  paymentTermsDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tailReservePct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  wastageAllowancePct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mosAdmissiblePct?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  mosCapPct?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  dlpMonths?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateDailyLogDto {
  @IsString()
  @IsNotEmpty()
  logDate!: string;

  @IsString()
  @IsOptional()
  weatherConditions?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  laborCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  subcontractorLaborCount?: number;

  @IsString()
  @IsOptional()
  equipmentOnSite?: string;

  @IsString()
  @IsNotEmpty()
  workPerformed!: string;

  @IsString()
  @IsOptional()
  delaysOrObstacles?: string;

  @IsString()
  @IsOptional()
  materialsReceived?: string;
}

export class CreateRfiDto {
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  dateRequired?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AnswerRfiDto {
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateScheduleTaskDto {
  @IsString()
  @IsNotEmpty()
  taskName!: string;

  @IsString()
  @IsOptional()
  taskCode?: string;

  @IsString()
  @IsOptional()
  wbsCode?: string;

  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @IsString()
  @IsNotEmpty()
  endDate!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  progressPercent?: number;

  @IsString()
  @IsOptional()
  predecessorId?: string;

  @IsOptional()
  isCriticalPath?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['not_started', 'in_progress', 'completed', 'delayed'])
  status?: string;

  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsOptional()
  assignedTeam?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  plannedManpowerCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  plannedEquipmentCount?: number;

  @IsString()
  @IsOptional()
  resourceTrade?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateScheduleTaskDto {
  @IsString()
  @IsOptional()
  taskName?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  progressPercent?: number;

  @IsString()
  @IsOptional()
  predecessorId?: string;

  @IsOptional()
  isCriticalPath?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['not_started', 'in_progress', 'completed', 'delayed'])
  status?: string;

  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsOptional()
  assignedTeam?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  plannedManpowerCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  plannedEquipmentCount?: number;

  @IsString()
  @IsOptional()
  resourceTrade?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateMaterialRequisitionDto {
  @IsString()
  @IsOptional()
  requisitionNumber?: string;

  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsNumber()
  @IsOptional()
  warehouseId?: number;

  @IsNumber()
  @IsOptional()
  productId?: number;

  @IsString()
  @IsNotEmpty()
  itemName!: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// ============================================================================
// Enterprise Contracting DTOs
// ============================================================================

export class CreateMasterPriceItemDto {
  @IsString()
  @IsIn(['material', 'labor', 'equipment', 'subcontract'])
  itemType!: 'material' | 'labor' | 'equipment' | 'subcontract';

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  unitRate!: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateMasterPriceItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitRate?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateEngineeringConstantDto {
  @IsString()
  @IsNotEmpty()
  itemCode!: string;

  @IsString()
  @IsNotEmpty()
  itemName!: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  wastePercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  overheadPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  profitMarkupPercent?: number;

  @IsArray()
  @IsOptional()
  components?: any[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AutoPriceBoqItemDto {
  @IsString()
  @IsNotEmpty()
  constantCode!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customWastePercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customOverheadPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customProfitMarkupPercent?: number;
}

export class CreateCostSnapshotDto {
  @IsString()
  @IsNotEmpty()
  snapshotName!: string;
}

export class CreateRetentionRecordDto {
  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsString()
  @IsIn(['client', 'subcontractor'])
  partyType!: 'client' | 'subcontractor';

  @IsNumber()
  @IsOptional()
  partyId?: number;

  @IsString()
  @IsNotEmpty()
  partyName!: string;

  @IsNumber()
  @Min(0)
  heldAmount!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionPercent?: number;

  @IsString()
  @IsOptional()
  ipcInvoiceId?: string;

  @IsString()
  @IsOptional()
  releaseDueDate?: string;

  @IsString()
  @IsOptional()
  guaranteeCertificateRef?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReleaseRetentionDto {
  @IsNumber()
  @Min(0.001)
  releaseAmount!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePaymentHoldDto {
  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsString()
  @IsIn(['subcontractor', 'supplier'])
  partyType!: 'subcontractor' | 'supplier';

  @IsString()
  @IsNotEmpty()
  partyName!: string;

  @IsNumber()
  @Min(0.001)
  holdAmount!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsOptional()
  defectDescription?: string;
}

export class ReleasePaymentHoldDto {
  @IsString()
  @IsOptional()
  releaseNotes?: string;
}

export class CreateSupplierReturnDto {
  @IsString()
  @IsOptional()
  returnNumber?: string;

  @IsNumber()
  @IsOptional()
  supplierId?: number;

  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @IsString()
  @IsOptional()
  returnDate?: string;

  @IsArray()
  items!: any[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateLaborAttendanceDto {
  @IsString()
  @IsNotEmpty()
  workerName!: string;

  @IsString()
  @IsIn(['carpenter', 'blacksmith', 'mason', 'helper', 'operator', 'surveyor', 'electrician', 'plumber'])
  trade!: 'carpenter' | 'blacksmith' | 'mason' | 'helper' | 'operator' | 'surveyor' | 'electrician' | 'plumber';

  @IsString()
  @IsOptional()
  workDate?: string;

  @IsString()
  @IsOptional()
  shiftType?: string;

  @IsNumber()
  @Min(0.5)
  hoursWorked!: number;

  @IsString()
  @IsOptional()
  splitProjectId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  splitHours?: number;

  @IsNumber()
  @Min(0)
  dailyRate!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePettyCashDto {
  @IsString()
  @IsNotEmpty()
  custodianName!: string;

  @IsString()
  @IsOptional()
  custodianRole?: string;

  @IsString()
  @IsOptional()
  disbursementNumber?: string;

  @IsNumber()
  @Min(1)
  amountGiven!: number;

  @IsString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsOptional()
  settlementDueDate?: string;
}

export class SettlePettyCashDto {
  @IsArray()
  receipts!: any[];

  @IsString()
  @IsOptional()
  closureNotes?: string;
}

export class CreateGovernmentLicenseDto {
  @IsString()
  @IsIn(['excavation', 'building', 'civil_defense', 'road_occupancy', 'environmental', 'other'])
  licenseType!: 'excavation' | 'building' | 'civil_defense' | 'road_occupancy' | 'environmental' | 'other';

  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsString()
  @IsNotEmpty()
  issuingAuthority!: string;

  @IsString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsNotEmpty()
  expiryDate!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  feeAmount?: number;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  alertLeadDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateMasterBoqLibraryItemDto {
  @IsString()
  @IsNotEmpty()
  tradeCategory!: string;

  @IsString()
  @IsNotEmpty()
  tradeNameAr!: string;

  @IsString()
  @IsNotEmpty()
  itemCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  @Min(0)
  standardCost!: number;

  @IsNumber()
  @Min(0)
  standardPrice!: number;
}

export class UpdateMasterBoqLibraryItemDto {
  @IsString()
  @IsOptional()
  tradeCategory?: string;

  @IsString()
  @IsOptional()
  tradeNameAr?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  standardCost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  standardPrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BatchImportMasterBoqDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMasterBoqLibraryItemDto)
  items!: CreateMasterBoqLibraryItemDto[];
}

export class ToggleMasterBoqItemStatusDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ImportMasterBoqToProjectDto {
  @IsArray()
  itemIds!: (string | number)[];
}

// 1. BOQ Takeoffs DTOs
export class BoqTakeoffItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsOptional()
  drawingRef?: string;

  @IsString()
  @IsOptional()
  axisRef?: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0)
  length!: number;

  @IsNumber()
  @Min(0)
  width!: number;

  @IsNumber()
  @Min(0)
  height!: number;

  @IsNumber()
  @Min(0.01)
  countMultiplier!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  voidDeduction?: number;

  @IsNumber()
  @IsOptional()
  netQty?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  wastePercent?: number;

  @IsNumber()
  @IsOptional()
  totalWithWaste?: number;

  @IsNumber()
  @IsOptional()
  calculatedQty?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  createdAt?: string;

  @IsString()
  @IsOptional()
  updatedAt?: string;
}

export class SaveBoqTakeoffsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoqTakeoffItemDto)
  takeoffs!: BoqTakeoffItemDto[];

  @IsOptional()
  syncToBoqQuantity?: boolean;
}

// 2. Site Mobilization DTOs
export class CreateSiteMobilizationExpenseDto {
  @IsString()
  @IsNotEmpty()
  expenseCategory!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  expenseDate!: string;

  @IsString()
  @IsNotEmpty()
  paidTo!: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  referenceReceipt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 3. Labor Attendance DTOs
export class RecordLaborAttendanceRecordDto {
  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsNotEmpty()
  workerName!: string;

  @IsString()
  @IsNotEmpty()
  workerRole!: string;

  @IsString()
  @IsNotEmpty()
  attendanceDate!: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @Min(0)
  dailyBaseWage!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeHours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeRatePerHour?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  nightShiftAllowance?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonusAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deductionAmount?: number;

  @IsOptional()
  isPaid?: boolean;

  @IsString()
  @IsOptional()
  paymentBatchRef?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 4. Client Payment Milestones & In-Kind Barter DTOs
export class CreateClientPaymentMilestoneDto {
  @IsString()
  @IsNotEmpty()
  milestoneName!: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  requiredProgressPercent?: number;

  @IsNumber()
  @Min(0)
  scheduledAmount!: number;

  @IsString()
  @IsOptional()
  settlementType?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordInKindBarterDeductionDto {
  @IsString()
  @IsNotEmpty()
  inKindUnitRef!: string;

  @IsNumber()
  @Min(1)
  inKindValuation!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 5. Equipment & Tools DTOs
export class CreateEquipmentAssetDto {
  @IsString()
  @IsNotEmpty()
  assetCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  currentProjectId?: string;

  @IsString()
  @IsOptional()
  currentLocationDesc?: string;

  @IsString()
  @IsOptional()
  assignedSupervisor?: string;

  @IsString()
  @IsOptional()
  operationalStatus?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchaseCost?: number;

  @IsString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class TransferEquipmentAssetDto {
  @IsString()
  @IsNotEmpty()
  toProjectId!: string;

  @IsString()
  @IsOptional()
  transferDate?: string;

  @IsString()
  @IsNotEmpty()
  dispatchedBy!: string;

  @IsString()
  @IsNotEmpty()
  receivedBy!: string;

  @IsString()
  @IsOptional()
  conditionOnDispatch?: string;

  @IsString()
  @IsOptional()
  conditionOnReceipt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 6. Supplier Price Memory & Rating DTOs
export class RecordSupplierPriceMemoryDto {
  @IsNumber()
  @IsNotEmpty()
  supplierId!: number;

  @IsString()
  @IsNotEmpty()
  materialName!: string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  @Min(0)
  lastUnitPrice!: number;

  @IsString()
  @IsOptional()
  lastPurchaseDate?: string;

  @IsString()
  @IsOptional()
  lastProjectId?: string;

  @IsString()
  @IsOptional()
  governorate?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  qualityRating?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  deliverySpeedRating?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 7. Work Inspection Requests (WIR) DTOs
export class CreateInspectionRequestDto {
  @IsString()
  @IsOptional()
  wirNumber?: string;

  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsString()
  @IsNotEmpty()
  locationGrid!: string;

  @IsString()
  @IsNotEmpty()
  tradeCategory!: string;

  @IsString()
  @IsOptional()
  inspectionType?: string;

  @IsString()
  @IsNotEmpty()
  scheduledDate!: string;

  @IsString()
  @IsOptional()
  consultantName?: string;

  @IsString()
  @IsOptional()
  consultantNotes?: string;

  @IsString()
  @IsOptional()
  attachments?: string;
}

export class UpdateInspectionRequestStatusDto {
  @IsString()
  @IsIn(['submitted', 'approved', 'approved_with_notes', 'rejected'])
  status!: 'submitted' | 'approved' | 'approved_with_notes' | 'rejected';

  @IsString()
  @IsOptional()
  consultantName?: string;

  @IsString()
  @IsOptional()
  consultantNotes?: string;
}

// 8. Snag Items & Punch List DTOs
export class CreateSnagItemDto {
  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsNotEmpty()
  itemTitle!: string;

  @IsString()
  @IsNotEmpty()
  locationDesc!: string;

  @IsString()
  @IsOptional()
  @IsIn(['minor', 'major', 'critical'])
  severity?: 'minor' | 'major' | 'critical';

  @IsString()
  @IsOptional()
  @IsIn(['internal', 'subcontractor'])
  responsibleParty?: 'internal' | 'subcontractor';

  @IsNumber()
  @IsOptional()
  subcontractorId?: number;

  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSnagItemStatusDto {
  @IsString()
  @IsIn(['open', 'rectified', 'verified_closed'])
  status!: 'open' | 'rectified' | 'verified_closed';

  @IsString()
  @IsOptional()
  rectifiedDate?: string;

  @IsString()
  @IsOptional()
  verifiedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 9. Project Handover DTOs
export class CreateProjectHandoverDto {
  @IsString()
  @IsIn(['preliminary', 'final'])
  handoverType!: 'preliminary' | 'final';

  @IsString()
  @IsNotEmpty()
  handoverDate!: string;

  @IsString()
  @IsNotEmpty()
  committeeMembers!: string;

  @IsString()
  @IsOptional()
  warrantyStartDate?: string;

  @IsString()
  @IsOptional()
  warrantyEndDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionReleaseAmount?: number;

  @IsString()
  @IsOptional()
  certificateRef?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApproveProjectHandoverDto {
  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 10. Material & Shop Drawing Submittals DTOs
export class CreateSubmittalDto {
  @IsString()
  @IsIn(['material', 'shop_drawing', 'sample', 'method_statement'])
  submittalType!: 'material' | 'shop_drawing' | 'sample' | 'method_statement';

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  specificationSection?: string;

  @IsString()
  @IsOptional()
  supplierManufacturer?: string;

  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsString()
  @IsOptional()
  submissionDate?: string;

  @IsString()
  @IsOptional()
  reviewDueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSubmittalStatusDto {
  @IsString()
  @IsIn(['submitted', 'approved', 'approved_as_noted', 'revise_and_resubmit', 'rejected'])
  status!: 'submitted' | 'approved' | 'approved_as_noted' | 'revise_and_resubmit' | 'rejected';

  @IsString()
  @IsOptional()
  consultantName?: string;

  @IsString()
  @IsOptional()
  consultantComments?: string;

  @IsString()
  @IsOptional()
  consultantReviewDate?: string;
}

// 11. Material Price Escalation Claims DTOs
export class CreateMaterialEscalationDto {
  @IsString()
  @IsIn(['rebar_steel', 'portland_cement', 'ready_mix', 'bitumen', 'sand_gravel', 'other'])
  materialType!: 'rebar_steel' | 'portland_cement' | 'ready_mix' | 'bitumen' | 'sand_gravel' | 'other';

  @IsString()
  @IsNotEmpty()
  materialName!: string;

  @IsNumber()
  @Min(0)
  basePriceContract!: number;

  @IsNumber()
  @Min(0)
  currentMarketPrice!: number;

  @IsNumber()
  @Min(0)
  executedQuantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsString()
  @IsOptional()
  bulletinSourceReference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateMaterialEscalationStatusDto {
  @IsString()
  @IsIn(['draft', 'submitted_to_client', 'approved_by_consultant', 'settled_in_ipc', 'rejected'])
  status!: 'draft' | 'submitted_to_client' | 'approved_by_consultant' | 'settled_in_ipc' | 'rejected';

  @IsString()
  @IsOptional()
  ipcInvoiceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 12. Subcontractor Back-Charges DTOs
export class CreateSubcontractorBackchargeDto {
  @IsString()
  @IsNotEmpty()
  subcontractId!: string;

  @IsString()
  @IsOptional()
  beneficiarySubcontractId?: string;

  @IsString()
  @IsIn(['damage_rework', 'safety_fine', 'equipment_usage', 'material_supplied', 'site_cleanup', 'other'])
  backchargeCategory!: 'damage_rework' | 'safety_fine' | 'equipment_usage' | 'material_supplied' | 'site_cleanup' | 'other';

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  occurrenceDate?: string;
}

export class UpdateBackchargeStatusDto {
  @IsString()
  @IsIn(['pending_approval', 'applied_to_deduction', 'waived'])
  status!: 'pending_approval' | 'applied_to_deduction' | 'waived';

  @IsString()
  @IsOptional()
  appliedIpcInvoiceId?: string;
}

// 13. Equipment Fuel & Operating Meter Logs DTOs
export class CreateEquipmentFuelLogDto {
  @IsString()
  @IsOptional()
  equipmentId?: string;

  @IsString()
  @IsNotEmpty()
  equipmentName!: string;

  @IsString()
  @IsOptional()
  logDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  startMeterHours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  endMeterHours?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fuelLitersAdded?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fuelCostTotal?: number;

  @IsString()
  @IsOptional()
  driverOperatorName?: string;

  @IsString()
  @IsOptional()
  boqItemId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 12. Subcontractor Management & Ledger DTOs
export class CreateSubcontractorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  tradeSpecialty?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  taxNumber?: string;

  @IsString()
  @IsOptional()
  commercialReg?: string;

  @IsString()
  @IsOptional()
  nationalId?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankIban?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsIn(['active', 'suspended', 'blacklisted'])
  @IsOptional()
  status?: 'active' | 'suspended' | 'blacklisted';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSubcontractorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  tradeSpecialty?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  taxNumber?: string;

  @IsString()
  @IsOptional()
  commercialReg?: string;

  @IsString()
  @IsOptional()
  nationalId?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankIban?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsIn(['active', 'suspended', 'blacklisted'])
  @IsOptional()
  status?: 'active' | 'suspended' | 'blacklisted';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateSubcontractorPaymentDto {
  @IsNumber()
  subcontractorId!: number;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsIn(['cash', 'bank_transfer', 'check'])
  @IsOptional()
  paymentMethod?: 'cash' | 'bank_transfer' | 'check';

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isAdvancePayment?: boolean;

  @IsString()
  @IsIn(['advance', 'progress', 'retention', 'operational_advance'])
  @IsOptional()
  paymentCategory?: 'advance' | 'progress' | 'retention' | 'operational_advance';
}

export class CreateGuaranteeDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsOptional()
  subcontractId?: string;

  @IsNumber()
  @IsOptional()
  subcontractorId?: number;

  @IsString()
  @IsNotEmpty()
  guaranteeNumber!: string;

  @IsString()
  @IsIn(['advance_payment', 'performance', 'retention', 'maintenance', 'bid_bond'])
  guaranteeType!: 'advance_payment' | 'performance' | 'retention' | 'maintenance' | 'bid_bond';

  @IsString()
  @IsNotEmpty()
  issuingBank!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  issueDate!: string;

  @IsString()
  @IsNotEmpty()
  expiryDate!: string;

  @IsString()
  @IsOptional()
  claimExpiryDate?: string;

  @IsOptional()
  reductionSchedule?: any;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGuaranteeDto {
  @IsString()
  @IsOptional()
  issuingBank?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  claimExpiryDate?: string;

  @IsOptional()
  reductionSchedule?: any;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ExtendGuaranteeDto {
  @IsString()
  @IsNotEmpty()
  newExpiryDate!: string;

  @IsString()
  @IsOptional()
  newClaimExpiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReleaseGuaranteeDto {
  @IsString()
  @IsNotEmpty()
  releaseDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class InvokeGuaranteeDto {
  @IsString()
  @IsNotEmpty()
  invocationDate!: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  invokedAmount?: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class CreateCostPoolDto {
  @IsString()
  @IsNotEmpty()
  poolCode!: string;

  @IsString()
  @IsNotEmpty()
  poolName!: string;

  @IsString()
  @IsNotEmpty()
  poolType!: 'labor_care' | 'labor_burden' | 'equipment_shared' | 'site_supervision' | 'custom';

  @IsString()
  @IsNotEmpty()
  driverType!: 'labor_days' | 'labor_cost' | 'equipment_hours' | 'direct_effort' | 'manual_ratio';

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateIndirectExpenseDto {
  @IsString()
  @IsNotEmpty()
  poolId!: string;

  @IsString()
  @IsNotEmpty()
  expenseTitle!: string;

  @IsNumber()
  @Min(0.01)
  grossAmount!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  recoveredAmount?: number;

  @IsString()
  @IsOptional()
  expenseDate?: string;

  @IsString()
  @IsOptional()
  voucherRef?: string;

  @IsString()
  @IsOptional()
  mobilizationExpenseId?: string;
}

export class CreateAllocationBatchDto {
  @IsString()
  @IsNotEmpty()
  periodStart!: string;

  @IsString()
  @IsNotEmpty()
  periodEnd!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deferredInAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

// Document Register DTOs (Drawing/Document Control — Procore/Autodesk Build benchmark)
export class CreateContractingDocumentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  discipline?: string;

  @IsString()
  @IsIn(['drawing', 'specification', 'contract', 'correspondence', 'method_statement', 'other'])
  @IsOptional()
  docType?: 'drawing' | 'specification' | 'contract' | 'correspondence' | 'method_statement' | 'other';

  @IsString()
  @IsOptional()
  notes?: string;

  // First revision, created together with the document
  @IsString()
  @IsOptional()
  revCode?: string;

  @IsString()
  @IsOptional()
  fileRef?: string;
}

export class CreateContractingDocumentRevisionDto {
  @IsString()
  @IsNotEmpty()
  revCode!: string;

  @IsString()
  @IsOptional()
  fileRef?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateContractingDocumentRevisionStatusDto {
  @IsString()
  @IsIn(['for_review', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected', 'superseded'])
  reviewStatus!: 'for_review' | 'approved' | 'approved_as_noted' | 'revise_resubmit' | 'rejected' | 'superseded';

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsString()
  @IsOptional()
  reviewComments?: string;
}

export class DistributeContractingDocumentDto {
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @IsString()
  @IsIn(['internal', 'consultant', 'owner', 'subcontractor', 'authority', 'other'])
  @IsOptional()
  recipientRole?: 'internal' | 'consultant' | 'owner' | 'subcontractor' | 'authority' | 'other';

  @IsString()
  @IsIn(['email', 'whatsapp', 'hand', 'portal', 'other'])
  @IsOptional()
  distributionMethod?: 'email' | 'whatsapp' | 'hand' | 'portal' | 'other';

  @IsString()
  @IsOptional()
  notes?: string;
}

// Meeting Minutes DTOs
export class MeetingAttendeeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class CreateMeetingMinuteDto {
  @IsString()
  @IsOptional()
  meetingType?: string;

  @IsString()
  @IsOptional()
  meetingDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingAttendeeDto)
  @IsOptional()
  attendees?: MeetingAttendeeDto[];

  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  preparedBy?: string;
}

export class CreateMeetingActionItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  linkedRfiId?: string;

  @IsString()
  @IsOptional()
  linkedChangeOrderId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

