import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt, IsArray, Min, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

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
  notes?: string;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(['planning', 'active', 'suspended', 'completed', 'handed_over'])
  status?: 'planning' | 'active' | 'suspended' | 'completed' | 'handed_over';

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
  notes?: string;
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

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionPercent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  otherDeductions?: number;

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
  @IsNotEmpty()
  scopeOfWork!: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  retentionPercent?: number;

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
  @Min(0)
  @IsOptional()
  wastePercent?: number;

  @IsString()
  @IsOptional()
  notes?: string;
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

