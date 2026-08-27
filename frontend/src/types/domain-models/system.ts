export interface TreasuryTransaction {
  id: string;
  txnType: string;
  type?: string;
  amount: number;
  note: string;
  referenceType?: string;
  referenceId?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  createdAt: string;
  date?: string;
  createdByName?: string;
}

export interface ServiceRecord {
  id: string;
  name: string;
  amount: number;
  notes: string;
  serviceDate: string;
  paymentChannel?: 'cash' | 'card' | string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  createdByName?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  detailsSummary?: string;
  createdAt: string;
  created_at?: string;
  createdByName?: string;
  createdBy?: string;
}

export interface ShiftMovementItem {
  id: string;
  kind: 'cash_in' | 'cash_out' | 'delivery' | 'expense' | 'supplier_payment';
  kindLabel: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  docNo: string;
  status: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number;
  cashSalesTotal?: number;
  cardSalesTotal?: number;
  walletSalesTotal?: number;
  instapaySalesTotal?: number;
  creditSalesTotal?: number;
  shiftSalesTotal?: number;
  saleCount?: number;
  mixedSalesCount?: number;
  cardOperationCount?: number;
  walletOperationCount?: number;
  instapayOperationCount?: number;
  cashDrawerMovementTotal?: number;
  cashDrawerCashInTotal?: number;
  cashDrawerDeliveryCashInTotal?: number;
  cashDrawerManualCashInTotal?: number;
  cashDrawerCashOutTotal?: number;
  supplierPaymentsTotal?: number;
  expensesTotal?: number;
  serviceCashTotal?: number;
  serviceCardTotal?: number;
  serviceTotal?: number;
  saleReturnCashRefundTotal?: number;
  saleReturnCardRefundTotal?: number;
  saleReturnTotal?: number;
  variance: number;
  openingNote?: string;
  closeNote?: string;
  closeNoteRaw?: string;
  blindCloseMode?: boolean;
  blindCloseMetadataStatus?: 'valid' | 'missing' | 'invalid' | string;
  declaredCash?: number | null;
  declaredCardTotal?: number | null;
  declaredCardCount?: number | null;
  declaredWalletTotal?: number | null;
  declaredWalletCount?: number | null;
  declaredInstapayTotal?: number | null;
  declaredInstapayCount?: number | null;
  cardDetailsTotal?: number;
  walletDetailsTotal?: number;
  instapayDetailsTotal?: number;
  cardDetails?: Array<{ amount: number; reference?: string }>;
  walletDetails?: Array<{ amount: number; reference?: string }>;
  instapayDetails?: Array<{ amount: number; reference?: string }>;
  movementItems?: ShiftMovementItem[];
  managerReviewNote?: string;
  managerReviewedById?: number | null;
  managerReviewedByName?: string;
  managerReviewedAt?: string;
  note?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  openedById?: string;
  createdAt: string;
  closedAt?: string;
  openedByName?: string;
  closedByName?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  defaultStockLocationId?: string | null;
  salesStockMode?: 'single_location' | 'all_operational_locations';
  allowExternalSalesStock?: boolean;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  branchId?: string;
  branchName?: string;
  locationType?: string;
}

export interface AppSettings {
  storeName: string;
  brandName?: string;
  phone?: string;
  address?: string;
  lowStockThreshold?: number;
  invoiceFooter?: string;
  invoiceQR?: string;
  taxNumber?: string;
  taxRate?: number;
  taxMode?: string;
  paperSize?: 'a4' | 'receipt' | string;
  invoiceNumberingScheme?: 'daily' | 'sequential' | string;
  managerPin?: string;
  hasManagerPin?: boolean;
  autoBackup?: 'on' | 'off' | string;
  accentColor?: string;
  logoData?: string;
  businessIndustry?: string;
  currentBranchId?: string;
  currentLocationId?: string;
  printShowLogo?: boolean;
  printShowDocumentType?: boolean;
  printShowPhone?: boolean;
  printShowAddress?: boolean;
  printShowTaxNumber?: boolean;
  printDeliveryRepOnReceipt?: boolean;
  printShowCustomer?: boolean;
  printShowDocumentNumber?: boolean;
  printShowOrderType?: boolean;
  printShowDeliveryCustomerDetails?: boolean;
  printShowCashier?: boolean;
  printShowBranch?: boolean;
  printShowLocation?: boolean;
  printShowTax?: boolean;
  printShowPaymentMethod?: boolean;
  printShowItemSummary?: boolean;
  printShowItemCount?: boolean;
  printShowPiecesCount?: boolean;
  printShowPaymentBreakdown?: boolean;
  printShowDate?: boolean;
  printShowItemOffers?: boolean;
  printShowDiscountBreakdown?: boolean;
  printShowSavingsBanner?: boolean;
  printShowInvoiceBarcode?: boolean;
  printShowFooter?: boolean;
  printCompactReceipt?: boolean;
  posReceiptTheme?: 'boxed' | 'classic' | 'ultra-compact' | string;
  printNumberFormat?: 'arabic' | 'english' | string;
  manufacturingModuleEnabled?: boolean;
  importModuleEnabled?: boolean;
  comboModuleEnabled?: boolean;
  restaurantModuleEnabled?: boolean;
  posShowCartMeta?: boolean;
  clothingModuleEnabled?: boolean;
  enableMobileStoreFeatures?: boolean;
  enablePharmacyModule?: boolean;
  maintenanceProfile?: string;
  enableEnterpriseFeatures?: boolean;
  technicianCommissionRate?: number;
  defaultProductKind?: 'standard' | 'fashion' | string;
  defaultPosMode?: 'scanner' | 'touch' | string;
  deliveryFeeMode?: 'freelance_courier' | 'store_fleet' | string;
  storeFleetCommissionRate?: number;
  allowNegativeStockSales?: boolean;
  allowSellingBelowStock?: boolean;
  allowZeroPurchaseCost?: boolean;
  requireCashierShiftForSales?: boolean;
  posKitchenPrinterEnabled?: boolean;
  posKitchenPrinterAuto?: boolean;
  posKitchenPrinterMode?: 'detailed' | 'mini';
  posElectronCashierPrinter?: string;
  posElectronKitchenPrinter?: string;
  weightedBarcodeEnabled?: boolean;
  weightedBarcodePrefix?: string;
  weightedBarcodeProductCodeLength?: number;
  weightedBarcodeWeightDigits?: number;
  weightedBarcodeWeightDecimals?: number;
  theme?: string;
  uiLanguage?: 'ar' | 'en' | string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h' | string;
  whatsappLinkMode?: 'web' | 'app' | 'wa_me' | string;
  defaultBranchIssueMode?: 'final_issue' | 'transfer_to_branch_stock';
  hrSalesCommissionType?: 'none' | 'percentage' | 'target_bonus' | string;
  hrSalesCommissionValue?: number;
  hrSalesCommissionTarget?: number;
  hrDelayPolicyEnabled?: boolean;
  hrDelayPenalty1st?: number;
  hrDelayPenalty2nd?: number;
  hrDelayPenalty3rd?: number;
  hrDelayPenalty4th?: number;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number;
  date: string;
  note?: string;
  createdBy?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
}
