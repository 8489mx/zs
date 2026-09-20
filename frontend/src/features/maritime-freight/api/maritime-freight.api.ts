import { http } from '@/lib/http';
export type { MaritimeMailConfig } from '../maritime-freight.types';

export interface ShippingPort {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  country_code: string;
  country_name: string;
  port_type?: 'sea' | 'air' | 'road';
  iata_code?: string | null;
  icao_code?: string | null;
  is_active: boolean;
}

export interface ShippingLine {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  carrier_type?: 'shipping_line' | 'overseas_agent' | 'airline' | 'trucking';
  airline_prefix?: string | null;
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
  transport_mode?: 'sea' | 'air' | 'road' | 'multimodal';
  air_cargo_type?: string | null;
  gross_weight_kg?: number;
  volumetric_weight_kg?: number;
  chargeable_weight_kg?: number;
  total_cbm?: number;
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
  urgency_level?: 'standard' | 'urgent';
  cut_off_deadline?: string | null;
  auto_awarded?: boolean;
  target_rate_max?: number | null;
  created_at: string;
  bidsCount?: number;
  bestBid?: MaritimeRfqBid | null;
  bids?: MaritimeRfqBid[];
}

export interface MaritimePipelineConfig {
  automationMode: 'manual' | 'hybrid' | 'full_autonomous';
  defaultMarginType: 'fixed' | 'percentage';
  defaultMarginValue: number;
  marginFloor: number;
  defaultExchangeRate: number;
  rfqCutOffHoursStandard: number;
  rfqCutOffHoursUrgent: number;
  earlyAwardingEnabled: boolean;
  earlyAwardingMinFreeDays: number;
  requireManualRfqDispatch: boolean;
  requireManualAwardAndMargin: boolean;
  requireManualQuoteDispatch: boolean;
  autoSendWhatsAppQuote: boolean;
  autoSendEmailQuote: boolean;
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
  transport_mode?: 'sea' | 'air' | 'road' | 'multimodal';
  air_cargo_type?: string | null;
  gross_weight_kg?: number;
  volumetric_weight_kg?: number;
  chargeable_weight_kg?: number;
  total_cbm?: number;
  package_count?: number;
  flight_number?: string | null;
  flight_date?: string | null;
  mawb_number?: string | null;
  hawb_number?: string | null;
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
  transport_mode?: 'sea' | 'air' | 'road' | 'multimodal';
  air_cargo_type?: string | null;
  gross_weight_kg?: number;
  volumetric_weight_kg?: number;
  chargeable_weight_kg?: number;
  total_cbm?: number;
  package_count?: number;
  flight_number?: string | null;
  flight_date?: string | null;
  mawb_number?: string | null;
  hawb_number?: string | null;
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
  client_paid_total?: number;
  payment_status?: 'unpaid' | 'partially_paid' | 'paid';
  paid_at?: string | null;
  carrier_cost_total: number;
  other_costs_total: number;
  net_profit: number;
  tracking_token: string | null;
  customerBalance?: number;
  customerAvailableCredit?: number;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  containersCount?: number;
  hasOverdueContainers?: boolean;
  containers?: MaritimeContainer[];
  milestones?: MaritimeMilestone[];
  insurances?: CargoInsurance[];
  warehouseReceipts?: WarehouseReceipt[];
}

export interface CargoInsurance {
  id: string;
  job_id: string;
  policy_number: string;
  insurance_company: string;
  insured_value: number;
  premium_amount: number;
  currency: string;
  coverage_type: 'all_risks' | 'clauses_a' | 'clauses_b' | 'clauses_c';
  issue_date: string;
  expiry_date: string | null;
  status: 'draft' | 'active' | 'claimed' | 'cancelled' | 'expired';
  claim_amount: number;
  claim_status: string | null;
  claim_notes: string | null;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface WarehouseReceipt {
  id: string;
  receipt_number: string;
  job_id: string;
  location_id: string | null;
  received_date: string;
  package_count: number;
  gross_weight_kg: number;
  cbm: number;
  bay_rack_bin: string | null;
  warehouse_status: 'in_storage' | 'inspected' | 'released' | 'transferred';
  released_at: string | null;
  released_by: number | null;
  notes: string | null;
  created_at: string;
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
  parseBookingText: (text: string) =>
    http<{
      bookingNumber: string | null;
      shippingLineName: string | null;
      vesselName: string | null;
      voyageNumber: string | null;
      polName: string | null;
      podName: string | null;
      etd: string | null;
      eta: string | null;
      portCutOff: string | null;
      mblNumber: string | null;
      containers: Array<{ containerNumber: string; containerType: string }>;
    }>('/api/maritime-freight/jobs/parse-booking-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
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
  settleJobFromBalance: (jobId: string, amount?: number) =>
    http<{
      success: boolean;
      job: MaritimeJob;
      settledAmount: number;
      remainingUnpaid: number;
      customerBalanceAfter: number;
      customerAvailableCreditAfter: number;
      message: string;
    }>(`/api/maritime-freight/jobs/${jobId}/settle-from-balance`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  getCustomerActiveJobs: (customerId: number | string) =>
    http<Array<{
      id: string;
      job_number: string;
      pol_name: string;
      pod_name: string;
      vessel_name: string | null;
      milestone_status: string;
      client_invoiced_total: number;
      client_paid_total: number;
      payment_status: 'unpaid' | 'partially_paid' | 'paid';
      status: string;
      invoiced: number;
      paid: number;
      unpaid: number;
    }>>(`/api/maritime-freight/customers/${customerId}/active-jobs`),

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

  // Automation Pipeline & Checkpoints Engine
  getPipelineSettings: () =>
    http<MaritimePipelineConfig>('/api/maritime-freight/pipeline-settings'),
  savePipelineSettings: (data: Partial<MaritimePipelineConfig>) =>
    http<MaritimePipelineConfig>('/api/maritime-freight/pipeline-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  triggerPipeline: () =>
    http<{ processedRfqs: number; awardedCount: number; quotesGenerated: number; details: string[] }>(
      '/api/maritime-freight/pipeline/trigger',
      { method: 'POST' },
    ),

  // Financial Ledger & Accounting Posting
  issueJobSalesInvoice: (id: string, payload?: { amount?: number; notes?: string }) =>
    http<{ success: boolean; job: MaritimeJob; journalEntryId: number; entryNo: string; amount: number; message: string }>(
      `/api/maritime-freight/jobs/${id}/issue-invoice`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
    ),
  recordJobExpenseVoucher: (
    id: string,
    payload: {
      amount: number;
      expenseType?: 'carrier' | 'port' | 'other';
      paymentMethod?: 'payable' | 'cash' | 'bank';
      supplierId?: number;
      supplierName?: string;
      description?: string;
    },
  ) =>
    http<{ success: boolean; job: MaritimeJob; journalEntryId: number; entryNo: string; amount: number; message: string }>(
      `/api/maritime-freight/jobs/${id}/record-expense`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),
  getJobFinancialLedger: (id: string) =>
    http<{ jobId: string; jobNumber: string; costCenterId?: string; entries: any[] }>(
      `/api/maritime-freight/jobs/${id}/financial-ledger`,
    ),

  // Public Tracking
  getPublicTracking: (token: string) =>
    http<any>(`/api/public/freight-tracking/${token}`),

  // Direct WhatsApp Milestone Dispatch
  sendJobMilestoneWhatsApp: (jobId: string, milestone: string, phone?: string) =>
    http<{ success: boolean; message?: string }>(`/api/maritime-freight/jobs/${jobId}/send-whatsapp`, {
      method: 'POST',
      body: JSON.stringify({ milestone, phone }),
    }),

  // Rate Management (Contract/Tariff Rate Cards)
  listRateCards: (params?: { polCode?: string; podCode?: string; containerType?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.polCode) qs.set('polCode', params.polCode);
    if (params?.podCode) qs.set('podCode', params.podCode);
    if (params?.containerType) qs.set('containerType', params.containerType);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return http<MaritimeRateCard[]>(`/api/maritime-freight/rate-cards${query}`);
  },

  findBestRate: (polCode: string, podCode: string, containerType?: string) => {
    const qs = new URLSearchParams({ polCode, podCode });
    if (containerType) qs.set('containerType', containerType);
    return http<MaritimeRateCard[]>(`/api/maritime-freight/rate-cards/best?${qs.toString()}`);
  },

  createRateCard: (data: Partial<MaritimeRateCard>) =>
    http<MaritimeRateCard>('/api/maritime-freight/rate-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createRateCardFromBid: (bidId: string, validUntil: string) =>
    http<MaritimeRateCard>(`/api/maritime-freight/bids/${bidId}/save-as-rate-card`, {
      method: 'POST',
      body: JSON.stringify({ validUntil }),
    }),

  updateRateCardStatus: (id: string, status: 'active' | 'expired' | 'draft') =>
    http<MaritimeRateCard>(`/api/maritime-freight/rate-cards/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  deleteRateCard: (id: string) =>
    http<{ success: boolean }>(`/api/maritime-freight/rate-cards/${id}`, {
      method: 'DELETE',
    }),

  // Customs Declarations (HS Codes & Duty Tracking)
  listCustomsDeclarations: (jobId: string) =>
    http<MaritimeCustomsDeclaration[]>(`/api/maritime-freight/jobs/${jobId}/customs-declarations`),

  getCustomsDeclarationDetail: (id: string) =>
    http<{ declaration: MaritimeCustomsDeclaration; items: MaritimeCustomsDeclarationItem[] }>(`/api/maritime-freight/customs-declarations/${id}`),

  createCustomsDeclaration: (jobId: string, data: any) =>
    http<{ declaration: MaritimeCustomsDeclaration; items: MaritimeCustomsDeclarationItem[] }>(`/api/maritime-freight/jobs/${jobId}/customs-declarations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addCustomsDeclarationItem: (declarationId: string, data: any) =>
    http<MaritimeCustomsDeclarationItem>(`/api/maritime-freight/customs-declarations/${declarationId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCustomsDeclarationStatus: (id: string, status: string, declarationNumber?: string) =>
    http<MaritimeCustomsDeclaration>(`/api/maritime-freight/customs-declarations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, declarationNumber }),
    }),

  // Freight Audit & Carrier Invoices (Rate Reconciliation)
  previewCarrierInvoiceAudit: (jobId: string, data: any) =>
    http<FreightAuditPreview>(`/api/maritime-freight/jobs/${jobId}/carrier-invoices/preview`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createCarrierInvoice: (jobId: string, data: any) =>
    http<{ success: boolean; invoice: MaritimeCarrierInvoice; audit: any; message: string }>(`/api/maritime-freight/jobs/${jobId}/carrier-invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listJobCarrierInvoices: (jobId: string) =>
    http<MaritimeCarrierInvoice[]>(`/api/maritime-freight/jobs/${jobId}/carrier-invoices`),

  overrideCarrierInvoice: (id: string, reason: string) =>
    http<{ success: boolean; invoice: MaritimeCarrierInvoice; message: string }>(`/api/maritime-freight/carrier-invoices/${id}/override`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  createCarrierDispute: (id: string, data: { reason: string; disputedAmount?: number }) =>
    http<{ success: boolean; dispute: any; message: string }>(`/api/maritime-freight/carrier-invoices/${id}/dispute`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resolveCarrierDispute: (id: string, data: any) =>
    http<{ success: boolean; dispute: any; message: string }>(`/api/maritime-freight/carrier-disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Cargo Insurance
  createCargoInsurance: (jobId: string, data: Partial<CargoInsurance>) =>
    http<CargoInsurance>(`/api/maritime-freight/jobs/${jobId}/insurances`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCargoInsurance: (id: string, data: Partial<CargoInsurance>) =>
    http<CargoInsurance>(`/api/maritime-freight/insurances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  claimCargoInsurance: (id: string, data: { claimAmount: number; claimStatus: string; claimNotes?: string }) =>
    http<CargoInsurance>(`/api/maritime-freight/insurances/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getJobInsurances: (jobId: string) =>
    http<CargoInsurance[]>(`/api/maritime-freight/jobs/${jobId}/insurances`),

  // Transit & Bonded Warehouse Receipts
  createWarehouseReceipt: (jobId: string, data: Partial<WarehouseReceipt>) =>
    http<WarehouseReceipt>(`/api/maritime-freight/jobs/${jobId}/warehouse-receipts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  releaseWarehouseReceipt: (id: string, data: { notes?: string }) =>
    http<WarehouseReceipt>(`/api/maritime-freight/warehouse-receipts/${id}/release`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getJobWarehouseReceipts: (jobId: string) =>
    http<WarehouseReceipt[]>(`/api/maritime-freight/jobs/${jobId}/warehouse-receipts`),
  getWarehouseReceipts: (params?: { status?: string; search?: string }) =>
    http<WarehouseReceipt[]>(`/api/maritime-freight/warehouse-receipts${toQueryString(params)}`),
};

export interface MaritimeCustomsDeclaration {
  id: string;
  jobId: string;
  declarationNumber: string | null;
  declarationType: 'import' | 'export';
  customsAuthority: string | null;
  brokerName: string | null;
  submittedDate: string | null;
  clearedDate: string | null;
  status: 'pending' | 'submitted' | 'cleared' | 'held' | 'rejected';
  totalCustomsValue: number;
  totalDutyAmount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaritimeCustomsDeclarationItem {
  id: string;
  declarationId: string;
  hsCode: string;
  commodityDescription: string;
  quantity: number;
  unit: string;
  customsValue: number;
  dutyRatePercent: number;
  dutyAmount: number;
  notes: string | null;
}

export interface MaritimeRateCard {
  id: string;
  shippingLineId: string | null;
  carrierName: string;
  polCode: string;
  polName: string;
  podCode: string;
  podName: string;
  cargoMode: string;
  containerType: string;
  oceanFreight: number;
  currency: string;
  thcOrigin: number;
  thcDestination: number;
  bafCharges: number;
  otherCharges: number;
  totalFreightCost: number;
  transitTimeDays: number;
  freeDays: number;
  validFrom: string;
  validUntil: string;
  source: 'manual' | 'carrier_bid';
  sourceBidId: string | null;
  status: 'active' | 'expired' | 'draft';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaritimeCarrierInvoice {
  id: string;
  jobId: string;
  shippingLineId: string | null;
  carrierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totalInvoicedAmount: number;
  oceanFreight: number;
  thcCharges: number;
  bafCharges: number;
  detentionDemurrage: number;
  otherCharges: number;
  rateCardId: string | null;
  contractedAmount: number;
  varianceAmount: number;
  variancePct: number;
  auditStatus: 'pending' | 'matched' | 'overcharge' | 'undercharge' | 'no_contract' | 'approved_override' | 'disputed';
  overrideApprovedBy: string | null;
  overrideApprovedAt: string | null;
  overrideReason: string | null;
  journalEntryId: string | null;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'held_for_dispute';
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  dispute?: {
    id: string;
    disputeNumber: string;
    disputeStatus: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'partially_accepted';
    disputedAmount: number;
    creditNoteNumber: string | null;
    creditNoteAmount: number;
  } | null;
  rateCard?: {
    carrierName: string;
    unitCost: number;
  } | null;
}

export interface FreightAuditPreview {
  jobId: string;
  jobNumber: string;
  shippingLineName: string;
  polCode: string;
  podCode: string;
  containerCount: number;
  containerType: string;
  rateCard: any | null;
  audit: {
    hasRateCard: boolean;
    rateCardId: string | number | null;
    contractedRatePerUnit: number;
    containerCount: number;
    contractedTotal: number;
    invoicedTotal: number;
    varianceAmount: number;
    variancePct: number;
    auditStatus: 'matched' | 'overcharge' | 'undercharge' | 'no_contract' | 'approved_override' | 'disputed';
    isOvercharged: boolean;
    isUndercharged: boolean;
    isMatched: boolean;
    varianceBreakdown: {
      oceanFreightDiff: number;
      thcDiff: number;
      bafDiff: number;
      otherDiff: number;
    };
    recommendation: 'auto_approvable' | 'requires_override_or_dispute' | 'manual_review_no_contract';
  };
}

