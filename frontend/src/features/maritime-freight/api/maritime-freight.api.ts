import { http } from '@/lib/http';
export type { MaritimeMailConfig } from '../maritime-freight.types';

export interface ShippingPort {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  country_code: string;
  country_name: string;
  is_active: boolean;
}

export interface ShippingLine {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  carrier_type?: 'shipping_line' | 'overseas_agent';
  trade_lanes?: string | null;
  country_name?: string | null;
  country_code?: string | null;
  city_name?: string | null;
  contact_person: string | null;
  email: string | null;
  rfq_email: string | null;
  booking_email?: string | null;
  phone: string | null;
  whatsapp?: string | null;
  wechat?: string | null;
  services_offered?: string | null;
  supported_ports?: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
  notes?: string | null;
}

export interface ContainerTypeSpec {
  code: string;
  name_ar: string;
  name_en: string;
  category: 'dry' | 'reefer' | 'special';
  length_feet: number;
  max_payload_kg: number;
  tare_weight_kg: number;
  max_cbm: number;
  internal_length_m: number;
  internal_width_m: number;
  internal_height_m: number;
  door_width_m: number;
  door_height_m: number;
  description_ar: string;
}

export interface IncotermRule {
  code: string;
  name_ar: string;
  name_en: string;
  rule_type: 'any_mode' | 'sea_inland_waterway';
  seller_pays_export_customs: boolean;
  seller_pays_origin_thc: boolean;
  seller_pays_ocean_freight: boolean;
  seller_pays_destination_thc: boolean;
  seller_pays_import_customs: boolean;
  seller_pays_insurance: boolean;
  risk_transfer_point_ar: string;
  description_ar: string;
}

export interface PortTerminal {
  code: string;
  name_ar: string;
  name_en: string;
  port_code: string;
  terminal_operator: string;
  terminal_type: 'container' | 'general_cargo' | 'bulk';
  notes?: string;
}

export interface ReferenceDataResponse {
  containerTypes: ContainerTypeSpec[];
  incoterms: IncotermRule[];
  portTerminals: PortTerminal[];
}

export interface MaritimeRfqBid {
  id: string;
  rfq_id: string;
  shipping_line_id: string | null;
  shipping_line_name: string;
  ocean_freight: number;
  currency: string;
  thc_origin: number;
  thc_destination: number;
  baf_charges: number;
  other_charges: number;
  total_freight_cost: number;
  transit_time_days: number;
  free_days: number;
  validity_date: string | null;
  submission_channel: string;
  is_awarded: boolean;
  awarded_at: string | null;
  notes: string | null;
  isBestValue?: boolean;
}

export interface MaritimeRfq {
  id: string;
  rfq_number: string;
  direction: 'import' | 'export' | 'cross_trade';
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
  target_free_days: number;
  payment_term: 'prepaid' | 'collect';
  target_line_ids: number[];
  status: 'draft' | 'sent' | 'bids_received' | 'awarded' | 'cancelled';
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  inquiry_id?: string | null;
  notes: string | null;
  created_at: string;
  bidsCount?: number;
  bestBid?: MaritimeRfqBid | null;
  bids?: MaritimeRfqBid[];
}

export interface MaritimeQuotation {
  id: string;
  quotation_number: string;
  rfq_id: string | null;
  bid_id: string | null;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  payment_term: 'prepaid' | 'collect';
  base_cost: number;
  currency: string;
  margin_type: 'fixed' | 'percentage';
  margin_value: number;
  final_total: number;
  exchange_rate: number;
  final_total_local: number;
  valid_until: string | null;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted_to_job';
  converted_job_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface MaritimeContainer {
  id: string;
  job_id: string;
  container_number: string;
  container_type: string;
  seal_number: string | null;
  gross_weight_kg: number;
  cbm: number;
  free_days: number;
  return_deadline: string | null;
  is_overdue: boolean;
  overdue_days: number;
  demurrage_rate_per_day: number;
  demurrage_amount: number;
  deposit_amount: number;
  deposit_currency: string;
  deposit_status: 'not_required' | 'held_by_line' | 'pending_return_proof' | 'refunded_to_treasury';
  deposit_treasury_id: number | null;
  empty_return_proof_url: string | null;
  gated_in_at: string | null;
  vessel_loaded_at: string | null;
  discharged_at: string | null;
  gated_out_at: string | null;
  empty_returned_at: string | null;
  notes: string | null;
  daysRemaining?: number | null;
  statusColor?: 'green' | 'yellow' | 'red' | 'gray';
  job_number?: string;
  customer_name?: string;
  shipping_line_name?: string;
  vessel_name?: string;
  delivery_order_released?: boolean;
}

export interface MaritimeMilestone {
  id: string;
  job_id: string;
  milestone_key: string;
  milestone_title: string;
  occurred_at: string;
  location: string | null;
  notes: string | null;
}

export interface MaritimeJob {
  id: string;
  job_number: string;
  quotation_id: string | null;
  rfq_id: string | null;
  customer_id: number | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  direction: 'import' | 'export' | 'cross_trade';
  payment_term: 'prepaid' | 'collect';
  shipping_line_id: string | null;
  shipping_line_name: string;
  booking_number: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  pol_code: string;
  pol_name: string;
  pod_code: string;
  pod_name: string;
  etd: string | null;
  eta: string | null;
  port_cut_off: string | null;
  bl_type: 'original' | 'telex_release' | 'sea_waybill';
  mbl_number: string | null;
  hbl_number: string | null;
  shipper_details: string | null;
  consignee_details: string | null;
  notify_party: string | null;
  milestone_status: string;
  delivery_order_released: boolean;
  delivery_order_released_at: string | null;
  cost_center_id: string | null;
  client_invoiced_total: number;
  carrier_cost_total: number;
  other_costs_total: number;
  net_profit: number;
  tracking_token: string | null;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  containersCount?: number;
  hasOverdueContainers?: boolean;
  containers?: MaritimeContainer[];
  milestones?: MaritimeMilestone[];
}

function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const maritimeApi = {
  // Ports
  getPorts: () => http<ShippingPort[]>('/api/maritime-freight/ports'),
  createPort: (data: { code: string; nameAr: string; nameEn: string; countryCode: string; countryName: string }) =>
    http<ShippingPort>('/api/maritime-freight/ports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Shipping Lines & Overseas Partners
  getShippingLines: (params?: { carrierType?: string; tradeLane?: string; countryCode?: string; search?: string }) =>
    http<ShippingLine[]>(`/api/maritime-freight/shipping-lines${toQueryString(params)}`),
  createShippingLine: (data: any) =>
    http<ShippingLine>('/api/maritime-freight/shipping-lines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateShippingLine: (id: string, data: any) =>
    http<ShippingLine>(`/api/maritime-freight/shipping-lines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteShippingLine: (id: string) =>
    http<{ success: boolean }>(`/api/maritime-freight/shipping-lines/${id}`, {
      method: 'DELETE',
    }),
  seedDefaultMasterData: () =>
    http<{ portsAdded: number; linesAdded: number; agentsAdded: number }>('/api/maritime-freight/master-data/seed-defaults', {
      method: 'POST',
    }),
  importCarriersBulk: (items: any[]) =>
    http<{ insertedCount: number; updatedCount: number; totalProcessed: number; summary: string }>('/api/maritime-freight/shipping-lines/import-bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  getReferenceData: () =>
    http<ReferenceDataResponse>('/api/maritime-freight/reference-data'),

  // RFQs
  getRfqs: (params?: { status?: string; search?: string }) =>
    http<MaritimeRfq[]>(`/api/maritime-freight/rfqs${toQueryString(params)}`),
  getRfqById: (id: string) => http<MaritimeRfq>(`/api/maritime-freight/rfqs/${id}`),
  createRfq: (data: any) =>
    http<MaritimeRfq>('/api/maritime-freight/rfqs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispatchRfqEmails: (id: string, targetLineIds?: number[]) =>
    http<{ sentCount: number; message: string }>(`/api/maritime-freight/rfqs/${id}/dispatch-emails`, {
      method: 'POST',
      body: JSON.stringify({ targetLineIds }),
    }),

  // Bids
  submitBid: (data: any) =>
    http<MaritimeRfqBid>('/api/maritime-freight/bids', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  awardBid: (id: string) =>
    http<MaritimeRfqBid>(`/api/maritime-freight/bids/${id}/award`, {
      method: 'POST',
    }),
  parseEmailText: (text: string) =>
    http<any>('/api/maritime-freight/parse-email-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Quotations
  getQuotations: (params?: { status?: string; search?: string }) =>
    http<MaritimeQuotation[]>(`/api/maritime-freight/quotations${toQueryString(params)}`),
  createQuotation: (data: any) =>
    http<MaritimeQuotation>('/api/maritime-freight/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateQuotationStatus: (id: string, status: 'approved' | 'rejected' | 'sent') =>
    http<MaritimeQuotation>(`/api/maritime-freight/quotations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Jobs
  getJobs: (params?: { status?: string; search?: string; milestone?: string }) =>
    http<MaritimeJob[]>(`/api/maritime-freight/jobs${toQueryString(params)}`),
  getJobById: (id: string) => http<MaritimeJob>(`/api/maritime-freight/jobs/${id}`),
  createJob: (data: any) =>
    http<MaritimeJob>('/api/maritime-freight/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateJob: (id: string, data: any) =>
    http<MaritimeJob>(`/api/maritime-freight/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  addJobMilestone: (id: string, milestoneKey: string, notes?: string, location?: string) =>
    http<MaritimeJob>(`/api/maritime-freight/jobs/${id}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ milestoneKey, notes, location }),
    }),
  releaseDeliveryOrder: (id: string) =>
    http<MaritimeJob>(`/api/maritime-freight/jobs/${id}/release-do`, {
      method: 'POST',
    }),
  getJobWhatsAppAlert: (id: string, milestone: string) =>
    http<{ message: string; customerPhone?: string; customerName: string; jobNumber: string }>(
      `/api/maritime-freight/jobs/${id}/whatsapp-alert?milestone=${milestone}`,
    ),

  // Containers
  getContainers: (params?: { overdueOnly?: boolean; depositHeldOnly?: boolean; search?: string }) =>
    http<MaritimeContainer[]>(`/api/maritime-freight/containers${toQueryString(params)}`),
  createContainer: (data: any) =>
    http<MaritimeContainer>('/api/maritime-freight/containers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateContainer: (id: string, data: any) =>
    http<MaritimeContainer>(`/api/maritime-freight/containers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Client Freight Inquiries Engine
  getInquiries: (params?: { status?: string; search?: string }) =>
    http<any[]>(`/api/maritime-freight/inquiries${toQueryString(params)}`),
  getInquiryById: (id: string) =>
    http<any>(`/api/maritime-freight/inquiries/${id}`),
  createInquiry: (data: any) =>
    http<any>('/api/maritime-freight/inquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  convertInquiryToRfq: (id: string, targetLineIds?: number[]) =>
    http<MaritimeRfq>(`/api/maritime-freight/inquiries/${id}/convert-to-rfq`, {
      method: 'POST',
      body: JSON.stringify({ targetLineIds }),
    }),
  autoConvertQuotationToJob: (quotationId: string) =>
    http<MaritimeJob>(`/api/maritime-freight/quotations/${quotationId}/convert-to-job`, {
      method: 'POST',
    }),

  // Mail & Outlook Automation Settings
  getMailSettings: () =>
    http<any>('/api/maritime-freight/mail-settings'),
  saveMailSettings: (data: any) =>
    http<any>('/api/maritime-freight/mail-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testMailConnection: (data?: any) =>
    http<{ smtpOk: boolean; smtpMessage: string; imapOk: boolean; imapMessage: string }>('/api/maritime-freight/mail-settings/test', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  sendTestEmail: (email: string) =>
    http<{ success: boolean; messageId: string }>('/api/maritime-freight/mail-settings/send-test', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  syncInboundBids: () =>
    http<{ scanned: number; imported: number; summary: string; error?: string }>('/api/maritime-freight/mail-settings/sync-bids', {
      method: 'POST',
    }),

  // Public Tracking
  getPublicTracking: (token: string) =>
    http<any>(`/api/public/freight-tracking/${token}`),
};
