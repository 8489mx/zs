export interface BostaSettings {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  apiKey: string;
  pickupBusinessName?: string;
  pickupPhone?: string;
  pickupCity?: string;
  pickupAddress?: string;
}

export interface BostaDeliverySpecs {
  packageType?: 'Parcel' | 'Document';
  size?: 'SMALL' | 'MEDIUM' | 'LARGE';
  itemsCount: number;
  description: string;
  weight?: number;
}

export interface BostaCreateDeliveryDto {
  specs?: BostaDeliverySpecs;
  cod?: number;
  notes?: string;
  receiverAddress?: string;
  receiverCity?: string;
}

export interface BostaDeliveryResponse {
  ok: boolean;
  deliveryId: string;
  trackingNumber: string;
  status: string;
  awbUrl?: string;
  isSandbox: boolean;
  message?: string;
}

export interface BostaTrackingEvent {
  state: string;
  timestamp: string;
  reason?: string;
}

export interface BostaTrackingResponse {
  ok: boolean;
  trackingNumber: string;
  currentStatus: string;
  history: BostaTrackingEvent[];
}
