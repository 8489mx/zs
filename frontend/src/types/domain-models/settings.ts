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
