import { http } from '@/lib/http';

export interface AmazonConfig {
  enabled: boolean;
  sellerId: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  marketplaceId: 'eg' | 'sa' | 'ae';
  autoSyncStock: boolean;
  autoPullOrders: boolean;
  fulfillmentType: 'fba' | 'fbm';
}

export interface NoonConfig {
  enabled: boolean;
  merchantId: string;
  apiKey?: string;
  appSecret?: string;
  marketplace: 'eg' | 'sa' | 'ae';
  autoSyncStock: boolean;
  autoPullOrders: boolean;
  fulfillmentType: 'fbn' | 'direct';
}

export interface JumiaConfig {
  enabled: boolean;
  sellerEmail: string;
  apiKey?: string;
  marketplace: 'eg' | 'ng' | 'ke';
  autoSyncStock: boolean;
  autoPullOrders: boolean;
  fulfillmentType: 'express' | 'dropshipping';
}

export interface TrendyolConfig {
  enabled: boolean;
  supplierId: string;
  apiKey?: string;
  apiSecret?: string;
  autoSyncStock: boolean;
  autoPullOrders: boolean;
  fulfillmentType: 'trendyol_cargo' | 'merchant_cargo';
}

export type SupportedMarketplace = 'amazon' | 'noon' | 'jumia' | 'trendyol';

export interface MarketplaceSkuMapping {
  id: string;
  productId: number;
  productName?: string;
  barcode?: string;
  costPrice?: number;
  retailPrice?: number;
  marketplace: SupportedMarketplace;
  marketplaceSku: string;
  marketplaceTitle?: string;
  customPrice?: number;
  syncStock: boolean;
  currentLocalStock?: number;
  lastSyncedStock?: number;
  lastSyncedAt?: string;
  status: 'synced' | 'pending' | 'error';
  errorMessage?: string;
  // Competitor & Buy Box Tracking (روبوت تتبع صندوق الشراء والأسعار)
  competitorPrice?: number;
  buyBoxPrice?: number;
  buyBoxStatus?: 'winning' | 'at_risk' | 'losing';
  lastPriceCheckedAt?: string;
  // Automated Repricing Bot ("روبوت إعادة التسعير الآلي")
  repricingEnabled?: boolean;
  minPrice?: number;
  maxPrice?: number;
  repricingRule?: 'match_buy_box' | 'undercut_buy_box' | 'match_lowest' | 'undercut_lowest';
  repricingDelta?: number;
  lastRepricedAt?: string;
  repricingLog?: string;
}

export interface MarketplaceFeeCalculationInput {
  marketplace: SupportedMarketplace;
  region: 'eg' | 'sa' | 'ae';
  category: string;
  fulfillmentType: string;
  weightTier: 'small' | 'standard' | 'medium' | 'large' | 'heavy';
  sellingPrice: number;
  itemCost: number;
  inboundShippingCost?: number;
  packagingCost?: number;
}

export interface MarketplaceFeeCalculationResult {
  sellingPrice: number;
  itemCost: number;
  inboundShippingCost: number;
  packagingCost: number;
  referralRatePercent: number;
  referralFee: number;
  fulfillmentFee: number;
  closingFee: number;
  totalMarketplaceFeesBeforeVat: number;
  vatRatePercent: number;
  vatOnFees: number;
  totalMarketplaceDeductions: number;
  netPayoutToMerchant: number;
  netProfit: number;
  netMarginPercent: number;
  roiPercent: number;
  breakEvenPrice: number;
  currency: string;
  ratingStatus: 'exceptional' | 'healthy' | 'tight' | 'loss';
}

export interface ListingStudioResult {
  productId: number;
  productName: string;
  brand: string;
  barcode?: string;
  categoryName?: string;
  retailPrice: number;
  costPrice: number;
  optimizedTitleAr: string;
  optimizedTitleEn: string;
  bulletPointsAr: string[];
  bulletPointsEn: string[];
  backendKeywordsAr: string;
  backendKeywordsEn: string;
  metaDescription: string;
}

export interface BulkMappingImportRow {
  barcode?: string;
  sku?: string;
  productName?: string;
  marketplace: SupportedMarketplace;
  marketplaceSku: string;
  marketplaceTitle?: string;
  customPrice?: number;
  syncStock?: boolean;
  competitorPrice?: number;
}

export interface BulkMappingImportResult {
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: { row: number; reason: string }[];
}

export interface MarketplaceSettlementInput {
  marketplace: SupportedMarketplace;
  settlementId: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
  grossSales: number;
  referralFees: number;
  fulfillmentFees: number;
  refunds?: number;
  storageOrOtherFees?: number;
  netPayout: number;
  bankAccountId?: number;
  referralFeesAccountId?: number;
  fulfillmentFeesAccountId?: number;
  salesAccountId?: number;
  notes?: string;
}

export interface MarketplaceSettlementRecord extends MarketplaceSettlementInput {
  id: string;
  status: 'reconciled' | 'pending';
  journalEntryId?: number;
  journalEntryNo?: string;
  reconciledAt?: string;
  createdAt: string;
}

export interface SettlementAccountItem {
  id: number;
  code: string;
  name: string;
  accountType: string;
  isCashBank?: boolean;
}

export interface FbaInboundItem {
  productId: number;
  marketplaceSku: string;
  productName: string;
  barcode?: string;
  quantityShipped: number;
  quantityReceived?: number;
  discrepancy?: number;
  boxNumber?: number;
  unitsPerBox?: number;
  costPrice?: number;
}

export interface FbaInboundShipment {
  id: string;
  shipmentNumber: string;
  marketplace: 'amazon' | 'noon';
  fulfillmentCenterId: string;
  sourceBranchId?: number | null;
  sourceLocationId?: number | null;
  status: 'draft' | 'shipped' | 'received' | 'cancelled';
  items: FbaInboundItem[];
  totalUnits: number;
  totalReceivedUnits?: number;
  totalDiscrepancyUnits?: number;
  discrepancyLossAmount?: number;
  totalBoxes: number;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  shippedAt?: string;
  receivedAt?: string;
}

export interface FbaDiscrepancyClaimReport {
  shipmentId: string;
  shipmentNumber: string;
  marketplace: 'amazon' | 'noon';
  fulfillmentCenterId: string;
  trackingNumber?: string;
  shippedDate: string;
  totalShippedUnits: number;
  totalReceivedUnits: number;
  missingUnits: number;
  estimatedReimbursementAmount: number;
  items: {
    productId: number;
    marketplaceSku: string;
    productName: string;
    barcode?: string;
    quantityShipped: number;
    quantityReceived: number;
    missingQuantity: number;
    unitCost: number;
    totalLoss: number;
  }[];
  generatedClaimTemplateAr: string;
  generatedClaimTemplateEn: string;
}

export interface MarketplaceAnalyticsSummary {
  period: string;
  totalGrossSales: number;
  totalNetPayout: number;
  totalFees: number;
  totalOrders: number;
  netMarginPercent: number;
  marketplaceBreakdown: {
    marketplace: SupportedMarketplace;
    grossSales: number;
    netPayout: number;
    fees: number;
    ordersCount: number;
    sharePercent: number;
    returnRatePercent: number;
  }[];
  topSellingProducts: {
    productId: number;
    productName: string;
    marketplace: SupportedMarketplace;
    sku: string;
    unitsSold: number;
    totalRevenue: number;
  }[];
}

export interface RepricingBotLog {
  sku: string;
  marketplace: SupportedMarketplace;
  productName: string;
  oldPrice: number;
  newPrice: number;
  competitorPrice?: number;
  buyBoxPrice?: number;
  rule: string;
  reason: string;
  timestamp: string;
}

export interface RepricingBotResult {
  totalEvaluated: number;
  totalRepriced: number;
  logs: RepricingBotLog[];
}

export interface MarketplaceOnboardingCheck {
  companyLegalName: string;
  tradeName: string;
  ownerName: string;
  ownerNationalId?: string;
  legalEntityType?: 'business' | 'individual';
  hasCreditCard?: boolean;
  commercialRegister: string;
  taxNumber: string;
  vatRegistered: boolean;
  bankName: string;
  bankAccountName: string;
  bankIban: string;
  bankSwift: string;
  businessAddress: string;
  phone: string;
  email: string;
  overallReadinessScore: number;
  nameMatchStatus: 'perfect_match' | 'name_mismatch' | 'missing_info';
  nameMatchDetails: string;
  checklist: {
    key: string;
    label: string;
    required: boolean;
    status: 'ready' | 'missing' | 'warning';
    notes: string;
  }[];
  platformGuides: {
    marketplace: SupportedMarketplace;
    nameAr: string;
    portalUrl: string;
    steps: { stepNumber: number; title: string; instruction: string; tip?: string }[];
  }[];
  letterOfAuthorizationAr: string;
  letterOfAuthorizationEn: string;
}

export interface GtinExemptionApplication {
  productId?: number;
  productName: string;
  brandName: string;
  category: string;
  marketplace: SupportedMarketplace;
  reason: 'unbranded' | 'private_label' | 'custom_manufacturing' | 'parts_accessories';
  letterEn: string;
  letterAr: string;
  submissionInstructions: string[];
}

export const marketplaceSyncApi = {
  getConfig: async (): Promise<{
    amazon: AmazonConfig;
    noon: NoonConfig;
    jumia: JumiaConfig;
    trendyol: TrendyolConfig;
  }> => {
    return http<{
      amazon: AmazonConfig;
      noon: NoonConfig;
      jumia: JumiaConfig;
      trendyol: TrendyolConfig;
    }>('/api/storefront/marketplaces/config');
  },

  saveConfig: async (payload: {
    amazon?: Partial<AmazonConfig>;
    noon?: Partial<NoonConfig>;
    jumia?: Partial<JumiaConfig>;
    trendyol?: Partial<TrendyolConfig>;
  }): Promise<{ ok: boolean }> => {
    return http<{ ok: boolean }>('/api/storefront/marketplaces/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  testConnection: async (
    marketplace: SupportedMarketplace,
  ): Promise<{ success: boolean; message: string; pingMs: number; accountName?: string }> => {
    return http<{ success: boolean; message: string; pingMs: number; accountName?: string }>(
      '/api/storefront/marketplaces/test-connection',
      {
        method: 'POST',
        body: JSON.stringify({ marketplace }),
      },
    );
  },

  getMappings: async (): Promise<MarketplaceSkuMapping[]> => {
    return http<MarketplaceSkuMapping[]>('/api/storefront/marketplaces/mappings');
  },

  saveMapping: async (
    payload: Omit<MarketplaceSkuMapping, 'id'> & { id?: string },
  ): Promise<MarketplaceSkuMapping> => {
    return http<MarketplaceSkuMapping>('/api/storefront/marketplaces/mappings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteMapping: async (id: string | number): Promise<{ ok: boolean }> => {
    return http<{ ok: boolean }>(`/api/storefront/marketplaces/mappings/${id}`, {
      method: 'DELETE',
    });
  },

  syncInventory: async (
    marketplace?: SupportedMarketplace,
  ): Promise<{ syncedCount: number; updatedMappings: MarketplaceSkuMapping[] }> => {
    const query = marketplace ? `?marketplace=${marketplace}` : '';
    return http<{ syncedCount: number; updatedMappings: MarketplaceSkuMapping[] }>(
      `/api/storefront/marketplaces/sync-inventory${query}`,
      {
        method: 'POST',
      },
    );
  },

  simulateOrder: async (
    marketplace: 'amazon' | 'noon',
  ): Promise<{ success: boolean; orderId: number; orderNumber: string; totalAmount: number; reservedProductName: string }> => {
    return http<{ success: boolean; orderId: number; orderNumber: string; totalAmount: number; reservedProductName: string }>(
      '/api/storefront/marketplaces/simulate-order',
      {
        method: 'POST',
        body: JSON.stringify({ marketplace }),
      },
    );
  },

  calculateFees: async (input: MarketplaceFeeCalculationInput): Promise<MarketplaceFeeCalculationResult> => {
    return http<MarketplaceFeeCalculationResult>('/api/storefront/marketplaces/calculate-fees', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getListingStudio: async (productId: number): Promise<ListingStudioResult> => {
    return http<ListingStudioResult>(`/api/storefront/marketplaces/listing-studio/${productId}`);
  },

  updateCompetitorPrice: async (
    id: string,
    payload: { competitorPrice?: number; buyBoxPrice?: number },
  ): Promise<MarketplaceSkuMapping> => {
    return http<MarketplaceSkuMapping>(`/api/storefront/marketplaces/competitor-price/${id}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  exportFlatFile: async (
    marketplace: SupportedMarketplace,
  ): Promise<{ filename: string; contentType: string; data: string; rowCount: number }> => {
    return http<{ filename: string; contentType: string; data: string; rowCount: number }>(
      `/api/storefront/marketplaces/export-flat-file?marketplace=${marketplace}`,
    );
  },

  getAmazonConfig: async (): Promise<AmazonConfig> => {
    const cfg = await marketplaceSyncApi.getConfig();
    return cfg.amazon;
  },

  getNoonConfig: async (): Promise<NoonConfig> => {
    const cfg = await marketplaceSyncApi.getConfig();
    return cfg.noon;
  },

  getJumiaConfig: async (): Promise<JumiaConfig> => {
    const cfg = await marketplaceSyncApi.getConfig();
    return cfg.jumia;
  },

  getTrendyolConfig: async (): Promise<TrendyolConfig> => {
    const cfg = await marketplaceSyncApi.getConfig();
    return cfg.trendyol;
  },

  listMappings: async (): Promise<MarketplaceSkuMapping[]> => {
    return marketplaceSyncApi.getMappings();
  },

  addMapping: async (payload: any): Promise<MarketplaceSkuMapping> => {
    return marketplaceSyncApi.saveMapping(payload);
  },

  syncStock: async (marketplace?: any): Promise<{ synced: number }> => {
    const res = await marketplaceSyncApi.syncInventory(marketplace);
    return { synced: res.syncedCount };
  },

  simulateIncomingOrder: async (
    marketplace: 'amazon' | 'noon',
  ): Promise<{ marketplace: string; marketplaceOrderId: string; customerName: string; quantity: number }> => {
    const res = await marketplaceSyncApi.simulateOrder(marketplace);
    return {
      marketplace,
      marketplaceOrderId: res.orderNumber || String(res.orderId),
      customerName: 'عميل المنصة (محاكاة)',
      quantity: 1,
    };
  },

  importMappings: async (rows: BulkMappingImportRow[]): Promise<BulkMappingImportResult> => {
    return http<BulkMappingImportResult>('/api/storefront/marketplaces/import-mappings', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  },

  getSettlements: async (): Promise<MarketplaceSettlementRecord[]> => {
    return http<MarketplaceSettlementRecord[]>('/api/storefront/marketplaces/settlements');
  },

  reconcileSettlement: async (
    input: MarketplaceSettlementInput,
  ): Promise<{ ok: boolean; journalEntryId: number; journalEntryNo: string; settlement: MarketplaceSettlementRecord }> => {
    return http<{ ok: boolean; journalEntryId: number; journalEntryNo: string; settlement: MarketplaceSettlementRecord }>(
      '/api/storefront/marketplaces/settlements/reconcile',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  getSettlementAccounts: async (): Promise<{
    bankAccounts: SettlementAccountItem[];
    expenseAccounts: SettlementAccountItem[];
    revenueAccounts: SettlementAccountItem[];
  }> => {
    return http<{
      bankAccounts: SettlementAccountItem[];
      expenseAccounts: SettlementAccountItem[];
      revenueAccounts: SettlementAccountItem[];
    }>('/api/storefront/marketplaces/settlement-accounts');
  },

  syncStockLive: async (productId?: number): Promise<{ syncedCount: number; message: string }> => {
    return http<{ syncedCount: number; message: string }>('/api/storefront/marketplaces/sync-live', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  saveRepricingSettings: async (
    id: string,
    payload: {
      repricingEnabled: boolean;
      minPrice?: number;
      maxPrice?: number;
      repricingRule?: 'match_buy_box' | 'undercut_buy_box' | 'match_lowest' | 'undercut_lowest';
      repricingDelta?: number;
    },
  ): Promise<MarketplaceSkuMapping> => {
    return http<MarketplaceSkuMapping>(`/api/storefront/marketplaces/repricing-settings/${id}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  runRepricingBot: async (marketplace?: SupportedMarketplace): Promise<RepricingBotResult> => {
    return http<RepricingBotResult>('/api/storefront/marketplaces/run-repricing-bot', {
      method: 'POST',
      body: JSON.stringify({ marketplace }),
    });
  },

  getInboundShipments: async (): Promise<FbaInboundShipment[]> => {
    return http<FbaInboundShipment[]>('/api/storefront/marketplaces/inbound-shipments');
  },

  createInboundShipment: async (
    input: Omit<FbaInboundShipment, 'id' | 'shipmentNumber' | 'createdAt'>,
  ): Promise<FbaInboundShipment> => {
    return http<FbaInboundShipment>('/api/storefront/marketplaces/inbound-shipments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  exportPackingSlip: async (id: string): Promise<{ filename: string; contentType: string; data: string }> => {
    return http<{ filename: string; contentType: string; data: string }>(
      `/api/storefront/marketplaces/inbound-shipments/${id}/packing-slip`,
    );
  },

  recordShipmentReceiving: async (
    id: string,
    receivedItems: { productId: number; marketplaceSku: string; quantityReceived: number }[],
  ): Promise<FbaInboundShipment> => {
    return http<FbaInboundShipment>(`/api/storefront/marketplaces/inbound-shipments/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ receivedItems }),
    });
  },

  getDiscrepancyClaim: async (id: string): Promise<FbaDiscrepancyClaimReport> => {
    return http<FbaDiscrepancyClaimReport>(`/api/storefront/marketplaces/inbound-shipments/${id}/discrepancy-claim`);
  },

  getMarketplaceAnalytics: async (period: 'all' | '30d' | '7d' = '30d'): Promise<MarketplaceAnalyticsSummary> => {
    return http<MarketplaceAnalyticsSummary>(`/api/storefront/marketplaces/analytics?period=${period}`);
  },

  getSellerOnboardingCheck: async (): Promise<MarketplaceOnboardingCheck> => {
    return http<MarketplaceOnboardingCheck>('/api/storefront/marketplaces/onboarding-check');
  },

  saveOnboardingProfile: async (data: Partial<MarketplaceOnboardingCheck>): Promise<MarketplaceOnboardingCheck> => {
    return http<MarketplaceOnboardingCheck>('/api/storefront/marketplaces/onboarding-profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateGtinExemption: async (data: {
    productId?: number;
    brandName?: string;
    category?: string;
    marketplace?: SupportedMarketplace;
    reason?: 'unbranded' | 'private_label' | 'custom_manufacturing' | 'parts_accessories';
  }): Promise<GtinExemptionApplication> => {
    return http<GtinExemptionApplication>('/api/storefront/marketplaces/gtin-exemption', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

