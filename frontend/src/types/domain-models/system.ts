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

export interface CashierShift {
  id: string;
  docNo: string;
  status: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number;
  variance: number;
  openingNote?: string;
  closeNote?: string;
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
}

export interface Location {
  id: string;
  name: string;
  code: string;
  branchId?: string;
  branchName?: string;
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
  managerPin?: string;
  hasManagerPin?: boolean;
  autoBackup?: 'on' | 'off' | string;
  accentColor?: string;
  logoData?: string;
  currentBranchId?: string;
  currentLocationId?: string;
  theme?: string;
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
