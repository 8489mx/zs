import { http } from '@/lib/http';
import { BostaSettings, BostaShipmentPayload } from '../types/storefront.types';

export interface BostaShipmentResult {
  ok: boolean;
  deliveryId: string;
  trackingNumber: string;
  status: string;
  awbUrl?: string;
  isSandbox: boolean;
  message?: string;
}

export interface BostaTrackingResult {
  ok: boolean;
  trackingNumber: string;
  currentStatus: string;
  history: Array<{
    state: string;
    timestamp: string;
    reason?: string;
  }>;
}

export const bostaApi = {
  getSettings: () => http<BostaSettings>('/api/bosta/settings'),

  saveSettings: (payload: Partial<BostaSettings>) =>
    http<{ ok: boolean }>('/api/bosta/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  shipOrder: (orderId: number, payload: BostaShipmentPayload) =>
    http<BostaShipmentResult>(`/api/bosta/ship-order/${orderId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTracking: (trackingNumber: string) =>
    http<BostaTrackingResult>(`/api/bosta/track/${encodeURIComponent(trackingNumber)}`),

  cancelDelivery: (deliveryId: string) =>
    http<{ ok: boolean; message: string }>(`/api/bosta/cancel/${encodeURIComponent(deliveryId)}`, {
      method: 'POST',
    }),
};
