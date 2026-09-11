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

export interface DcsaMilestoneDefinition {
  key: DcsaMilestoneKey;
  title_ar: string;
  title_en: string;
  category: 'equipment' | 'transport' | 'shipment';
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
