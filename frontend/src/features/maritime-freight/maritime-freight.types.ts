export type MaritimeDirection = 'import' | 'export' | 'cross_trade';
export type MaritimePaymentTerm = 'prepaid' | 'collect';
export type MaritimeIncoterm = 'FOB' | 'EXW' | 'CFR' | 'CIF' | 'DDP' | 'DAP' | 'FCA';
export type MaritimeCargoMode = 'FCL' | 'LCL' | 'Breakbulk';
export type MaritimeContainerType = '20GP' | '40GP' | '40HC' | '20RF' | '40RF' | '45HC' | 'OpenTop' | 'FlatRack';
export type MaritimeCargoNature = 'general' | 'hazardous_dg' | 'temperature_controlled' | 'fragile';
export type MaritimeBlType = 'original' | 'telex_release' | 'sea_waybill';

export type MaritimeInquiryStatus = 'received' | 'rfq_created' | 'quoted' | 'converted_to_job' | 'cancelled';
export type MaritimeRfqStatus = 'draft' | 'sent' | 'bids_received' | 'awarded' | 'cancelled';
export type MaritimeQuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted_to_job';
export type MaritimeJobStatus = 'active' | 'completed' | 'cancelled';

export type DcsaMilestoneKey = 
  | 'BOOK'  // Booking confirmed
  | 'GTI'   // Gate-in at POL
  | 'LOAD'  // Vessel Loaded
  | 'DEPT'  // Vessel Departed (ETD)
  | 'ARRI'  // Vessel Arrived (ETA)
  | 'DISC'  // Container Discharged
  | 'CUST'  // Customs Cleared
  | 'GTO'   // Gate-out for Delivery / D/O Released
  | 'DLVR'  // Cargo Delivered to Customer
  | 'RETN'; // Empty Container Returned

export type CargoIqMilestoneKey =
  | 'BKD'   // Air Booking confirmed
  | 'RCS'   // Cargo Received from Shipper
  | 'MAN'   // Manifested on Flight
  | 'DEP'   // Flight Departed
  | 'ARR'   // Flight Arrived
  | 'RCF'   // Cargo Received from Flight
  | 'CUST'  // Customs Cleared
  | 'NFD'   // Consignee Notified
  | 'AWD'   // Documents / D.O Delivered
  | 'DLV';  // Cargo Delivered to Consignee

export type ShipmentMilestoneKey = DcsaMilestoneKey | CargoIqMilestoneKey | string;

export interface DcsaMilestoneDefinition {
  key: DcsaMilestoneKey | CargoIqMilestoneKey;
  title_ar: string;
  title_en: string;
  category: 'equipment' | 'transport' | 'shipment' | 'booking' | 'origin' | 'flight' | 'destination' | 'delivery';
}

export const DCSA_STANDARD_MILESTONES: DcsaMilestoneDefinition[] = [
  { key: 'BOOK', title_ar: 'تأكيد الحجز الملاحي', title_en: 'Booking Confirmed', category: 'shipment' },
  { key: 'GTI', title_ar: 'دخول الحاوية ساحة ميناء الشحن', title_en: 'Gated-in Origin Port', category: 'equipment' },
  { key: 'LOAD', title_ar: 'شحن وتحميل الحاوية على السفينة', title_en: 'Vessel Loaded', category: 'equipment' },
  { key: 'DEPT', title_ar: 'إبحار السفينة (تاريخ الإبحار الفعلي)', title_en: 'Vessel Departed (ETD)', category: 'transport' },
  { key: 'ARRI', title_ar: 'وصول السفينة لميناء المقصد (ETA)', title_en: 'Vessel Arrived (ETA)', category: 'transport' },
  { key: 'DISC', title_ar: 'تفريغ الحاوية على رصيف الميناء', title_en: 'Container Discharged', category: 'equipment' },
  { key: 'CUST', title_ar: 'إنهاء الإفراج الجمركي والمطابقة', title_en: 'Customs Cleared', category: 'shipment' },
  { key: 'GTO', title_ar: 'خروج الحاوية وتسليم إذن الإفراج (D/O)', title_en: 'Gated-out / Delivery Order Released', category: 'equipment' },
  { key: 'DLVR', title_ar: 'وصول البضاعة وتسليمها للعميل', title_en: 'Cargo Delivered to Customer', category: 'shipment' },
  { key: 'RETN', title_ar: 'إعادة الحاوية فارغة لساحة الخط الملاحي', title_en: 'Empty Container Returned', category: 'equipment' },
];

export const IATA_CARGO_IQ_MILESTONES: DcsaMilestoneDefinition[] = [
  { key: 'BKD', title_ar: 'تأكيد حجز الشحنة الجوية', title_en: 'Air Cargo Booking Confirmed', category: 'booking' },
  { key: 'RCS', title_ar: 'استلام الشحنة بمستودع المطار (GTI)', title_en: 'Cargo Received from Shipper', category: 'origin' },
  { key: 'MAN', title_ar: 'إدراج الشحنة على مانيفست الرحلة', title_en: 'Manifested on Flight', category: 'origin' },
  { key: 'DEP', title_ar: 'إقلاع رحلة الشحن الجوي (ATD)', title_en: 'Flight Departed', category: 'flight' },
  { key: 'ARR', title_ar: 'هبوط ووصول الرحلة بمطار المقصد (ATA)', title_en: 'Flight Arrived', category: 'flight' },
  { key: 'RCF', title_ar: 'تفريغ ودخول الشحنة مستودع المطار', title_en: 'Cargo Received from Flight', category: 'destination' },
  { key: 'CUST', title_ar: 'إنهاء الإفراج والتخليص الجمركي بالمطار', title_en: 'Customs Cleared', category: 'destination' },
  { key: 'NFD', title_ar: 'إشعار العميل المستلم بالوصول', title_en: 'Consignee Notified', category: 'destination' },
  { key: 'AWD', title_ar: 'تسليم إذن التسليم والمستندات', title_en: 'Documents Delivered', category: 'delivery' },
  { key: 'DLV', title_ar: 'تسليم الشحنة للعميل نهائياً (POD)', title_en: 'Cargo Delivered (Proof of Delivery)', category: 'delivery' },
];

export interface MaritimeInquiry {
  id: string;
  inquiry_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  direction: MaritimeDirection;
  transport_mode?: 'sea' | 'air' | 'road' | 'multimodal';
  air_cargo_type?: string | null;
  gross_weight_kg: number;
  volumetric_weight_kg?: number;
  chargeable_weight_kg?: number;
  cbm: number;
  package_count?: number;
  flight_number?: string | null;
  flight_date?: string | null;
  mawb_number?: string | null;
  hawb_number?: string | null;
  pol_code: string;
  pol_name: string;
  pod_code: string;
  pod_name: string;
  incoterm: string;
  cargo_mode: string;
  container_type: string;
  container_count: number;
  commodity_description: string;
  cargo_nature: string;
  cargo_ready_date: string | null;
  target_delivery_date: string | null;
  target_free_days: number;
  payment_term: MaritimePaymentTerm;
  status: MaritimeInquiryStatus;
  rfq_id: string | null;
  quotation_id: string | null;
  job_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface MaritimeMailConfig {
  outgoingProvider: 'outlook' | 'gmail' | 'custom';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword?: string;
  fromName: string;
  fromEmail: string;

  incomingProvider: 'outlook' | 'gmail' | 'custom';
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword?: string;

  autoReadInboundBids: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncDetails?: string | null;

  emailSubjectTemplate?: string;
  emailIntroTemplate?: string;
  emailSignatureTemplate?: string;
}

export interface RfqEmailDispatchPayload {
  rfqNumber: string;
  carrierName: string;
  carrierEmail: string;
  pol: string;
  pod: string;
  cargoMode: string;
  containerType: string;
  containerCount: number;
  commodity: string;
  crd: string;
  freeDays: number;
  incoterm: string;
  direction: string;
  magicLinkUrl: string;
}
