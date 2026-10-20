import { IsString, IsNumber, IsOptional, Min, IsIn, IsInt, IsPositive, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShipmentDto {
  @IsString()
  containerNumber!: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  arrivalDate?: string;

  @IsOptional()
  @IsString()
  billOfLading?: string;

  @IsOptional()
  @IsString()
  shippingDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exchangeRateAtArrival?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricingExchangeRate?: number;

  @IsOptional()
  @IsString()
  freightType?: string;

  @IsOptional()
  @IsString()
  containerSize?: string;

  @IsOptional()
  @IsString()
  portOfLoading?: string;

  @IsOptional()
  @IsString()
  portOfDischarge?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cbmVolume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeDemurrageDays?: number;

  @IsOptional()
  @IsString()
  demurrageStartDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  demurrageRatePerDay?: number;

  @IsOptional()
  @IsString()
  customsDeclarationNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vatRefundableEgp?: number;

  @IsOptional()
  @IsBoolean()
  isConsolidated?: boolean;

  @IsOptional()
  @IsIn(['value', 'weight', 'cbm'])
  costAllocationMethod?: 'value' | 'weight' | 'cbm';
}

export class UpdateShipmentCostsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCostUsd?: number;

  @IsOptional()
  @IsString()
  shippingAccountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customsCostEgp?: number;

  @IsOptional()
  @IsString()
  customsAccountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  internalTransportCostEgp?: number;

  @IsOptional()
  @IsString()
  transportAccountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  exchangeRateAtArrival?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricingExchangeRate?: number;

  @IsOptional()
  @IsIn(['Pending', 'In Customs', 'Arrived'])
  status?: string;

  @IsOptional()
  @IsString()
  shippedDate?: string;

  @IsOptional()
  @IsString()
  etaDate?: string;

  @IsOptional()
  @IsString()
  clearanceDate?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  freightType?: string;

  @IsOptional()
  @IsString()
  containerSize?: string;

  @IsOptional()
  @IsString()
  portOfLoading?: string;

  @IsOptional()
  @IsString()
  portOfDischarge?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cbmVolume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeDemurrageDays?: number;

  @IsOptional()
  @IsString()
  demurrageStartDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  demurrageRatePerDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualDemurrageFees?: number;

  @IsOptional()
  @IsString()
  customsDeclarationNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vatRefundableEgp?: number;

  @IsOptional()
  @IsBoolean()
  isConsolidated?: boolean;

  @IsOptional()
  @IsIn(['value', 'weight', 'cbm'])
  costAllocationMethod?: 'value' | 'weight' | 'cbm';
}

export class AddShipmentItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  factoryUnitPriceUsd!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCbm?: number;

  @IsOptional()
  @IsString()
  hsCode?: string;
}

export class UpdateShipmentItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  receivedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetRetailMargin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetWholesaleMargin?: number;

  @IsOptional()
  @IsIn(['capitalize', 'expense'])
  shortageHandlingMethod?: 'capitalize' | 'expense';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCbm?: number;

  @IsOptional()
  @IsString()
  hsCode?: string;
}

export class RecordForeignTransferDto {
  @IsString()
  supplierId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amountEgp!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amountForeign!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  exchangeRateContract?: number;

  @IsOptional()
  @IsString()
  proformaInvoiceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bankAccountId?: number;
}

export class CreateImportProjectDto {
  @IsOptional()
  @IsString()
  projectNo?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  targetMarket?: string;

  @IsOptional()
  @IsString()
  countryOrigin?: string;

  @IsOptional()
  @IsString()
  countryDestination?: string;

  @IsOptional()
  @IsString()
  budgetCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allocatedCapital?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetRoiPercentage?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  feasibilityData?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateImportProjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  targetMarket?: string;

  @IsOptional()
  @IsString()
  countryOrigin?: string;

  @IsOptional()
  @IsString()
  countryDestination?: string;

  @IsOptional()
  @IsString()
  budgetCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allocatedCapital?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetRoiPercentage?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  feasibilityData?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CalculateFeasibilityDto {
  @IsArray()
  items!: Array<{
    name: string;
    hsCode?: string;
    qty: number;
    factoryPriceUsd: number;
    unitWeightKg?: number;
    unitCbm?: number;
  }>;

  @IsOptional()
  @IsString()
  currency?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  exchangeRateCommercial!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exchangeRateCustoms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  travelAndSourcingCostEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  internationalShippingUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  insuranceUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customsDutyRatePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vatRatePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clearanceAndPortFeesEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  internalTransportEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bankCommissionAndFinancingEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetMarkupPercent?: number;

  @IsOptional()
  @IsBoolean()
  vatIsRefundable?: boolean;
}

export class UpsertSupplierMetaDto {
  @IsOptional()
  @IsString()
  chineseName?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  moqDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productionLeadTimeDays?: number;

  @IsOptional()
  verifiedBankDetails?: any;

  @IsOptional()
  @IsArray()
  incotermsAccepted?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  qcRating?: number;

  @IsOptional()
  @IsArray()
  qualityCertifications?: string[];

  @IsOptional()
  @IsString()
  auditStatus?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateQcInspectionDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsString()
  stage!: string;

  @IsString()
  inspectionDate!: string;

  @IsOptional()
  @IsString()
  inspectorName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sampleSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  passedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  failedQuantity?: number;

  @IsOptional()
  @IsString()
  defectNotes?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reportFileUrl?: string;
}

export class UpsertAciComplianceDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsString()
  acidNumber!: string;

  @IsOptional()
  @IsString()
  acidIssueDate?: string;

  @IsOptional()
  @IsString()
  acidExpiryDate?: string;

  @IsOptional()
  @IsString()
  cargoxDocumentId?: string;

  @IsOptional()
  @IsString()
  importerTaxNumber?: string;

  @IsOptional()
  @IsString()
  exporterId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  complianceChecklist?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSourcingTripDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  tripTitle!: string;

  @IsString()
  destinationCity!: string;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetEgp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actualCostEgp?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  findings?: any;
}

export class ProcessLateExpenseDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  lateExpenseAmount!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CalculateCustomsTaxDto {
  @IsString()
  hsCode!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cifValueEgp!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overrideDutyRatePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overrideVatRatePercent?: number;
}

export class VerifyBankDetailsDto {
  @IsOptional()
  @IsString()
  verificationNotes?: string;
}
