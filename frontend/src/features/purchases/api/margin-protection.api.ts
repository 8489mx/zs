import { http } from '@/lib/http';

export interface MarginProtectionItem {
  productId: number;
  productName: string;
  barcode: string;
  previousCost: number;
  newCost: number;
  costChangePercent: number;
  currentRetailPrice: number;
  currentWholesalePrice: number;
  currentMarginPercent: number;
  previousMarginPercent: number;
  targetMarginPercent: number;
  recommendedRetailPrice: number;
  recommendedWholesalePrice: number;
  isLossMaking: boolean;
  isMarginCompressed: boolean;
}

export interface MarginProtectionAnalysisResponse {
  purchaseId: number;
  docNo: string;
  supplierName: string;
  totalAffectedItems: number;
  lossMakingCount: number;
  marginCompressedCount: number;
  defaultTargetMargin: number;
  items: MarginProtectionItem[];
}

export interface ApplyRepricingPayload {
  items: Array<{
    productId: number;
    newRetailPrice: number;
    newWholesalePrice?: number;
  }>;
  notifyOwner?: boolean;
}

export const marginProtectionApi = {
  analyze: (purchaseId: number, targetMargin = 25) =>
    http<MarginProtectionAnalysisResponse>(`/api/purchases/${purchaseId}/margin-analysis?targetMargin=${targetMargin}`),

  applyRepricing: (purchaseId: number, payload: ApplyRepricingPayload) =>
    http<{ ok: boolean; updatedCount: number; message: string }>(`/api/purchases/${purchaseId}/apply-repricing`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
