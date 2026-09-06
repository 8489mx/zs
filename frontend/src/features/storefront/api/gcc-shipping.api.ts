import { http } from '@/lib/http';

export type GccCarrier = 'aramex' | 'smsa';

export interface GccShippingSettings {
  enabled: boolean;
  activeCarrier: GccCarrier;
  environment: 'sandbox' | 'production';

  // Aramex
  aramexAccountNumber?: string;
  aramexAccountPin?: string;
  aramexAccountEntity?: string;
  aramexCountryCode?: string;
  aramexUserName?: string;
  aramexPassword?: string;

  // SMSA
  smsaPassKey?: string;
  smsaCustomsCurrency?: string;

  // Pickup Warehouse
  pickupBusinessName?: string;
  pickupContactPerson?: string;
  pickupPhone?: string;
  pickupCountry?: string;
  pickupCity?: string;
  pickupAddress?: string;
}

export interface GccCreateShipmentPayload {
  carrier?: GccCarrier;
  packageType?: 'Parcel' | 'Document';
  weight?: number;
  piecesCount?: number;
  description?: string;
  codAmount?: number;
  currency?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverCountry?: string;
  receiverCity?: string;
  receiverAddress?: string;
  notes?: string;
}

export interface GccShipmentResult {
  ok: boolean;
  carrier: GccCarrier;
  shipmentId: string;
  trackingNumber: string;
  status: string;
  awbUrl?: string;
  isSandbox: boolean;
  currency: string;
  codAmount: number;
  message?: string;
  createdDate?: string;
}

export interface GccTrackingResult {
  ok: boolean;
  carrier: GccCarrier;
  trackingNumber: string;
  currentStatus: string;
  destinationCity?: string;
  originCity?: string;
  lastUpdated?: string;
  history: Array<{
    state: string;
    timestamp: string;
    location?: string;
    description?: string;
  }>;
  officialTrackingUrl: string;
}

export const gccShippingApi = {
  getSettings: () => http<GccShippingSettings>('/api/gcc-shipping/settings'),

  saveSettings: (payload: Partial<GccShippingSettings>) =>
    http<{ ok: boolean }>('/api/gcc-shipping/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  shipOrder: (orderId: number, payload: GccCreateShipmentPayload) =>
    http<GccShipmentResult>(`/api/gcc-shipping/ship-order/${orderId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTracking: (trackingNumber: string) =>
    http<GccTrackingResult>(`/api/gcc-shipping/track/${trackingNumber}`),
};
