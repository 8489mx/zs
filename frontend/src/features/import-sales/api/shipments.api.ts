import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';

export interface Shipment {
  id: string;
  tenant_id: string;
  container_number: string;
  arrival_date: string | null;
  shipping_cost_usd: string;
  customs_cost_egp: string;
  internal_transport_cost_egp: string;
  exchange_rate_at_arrival: string;
  status: 'Pending' | 'In Customs' | 'Arrived';
  created_at: string;
  shipping_expense_id?: number;
  customs_expense_id?: number;
  transport_expense_id?: number;
  shipped_date?: string;
  eta_date?: string;
  clearance_date?: string;
  supplier_name?: string;
  bill_of_lading?: string;
  pricing_exchange_rate?: string;
}

export interface ShipmentItem {
  id: string;
  product_id: string;
  quantity: number;
  factory_unit_price_usd: string;
  allocated_overhead_egp: string;
  landed_cost_egp: string;
  created_at: string;
  product_name: string;
  received_quantity?: string;
  target_retail_margin?: string;
  target_wholesale_margin?: string;
  shortage_handling_method?: 'capitalize' | 'expense';
}

export interface ShipmentDetails extends Shipment {
  items: ShipmentItem[];
}

export interface CreateShipmentDto {
  containerNumber: string;
  arrivalDate?: string;
  supplierId?: string;
  billOfLading?: string;
  shippingDate?: string;
}

export interface UpdateShipmentCostsDto {
  shippingCostUsd?: number;
  shippingAccountId?: string;
  customsCostEgp?: number;
  customsAccountId?: string;
  internalTransportCostEgp?: number;
  transportAccountId?: string;
  exchangeRateAtArrival?: number;
  status?: string;
  shippedDate?: string;
  etaDate?: string;
  clearanceDate?: string;
  pricingExchangeRate?: number;
}

export interface AddShipmentItemDto {
  productId: string;
  quantity: number;
  factoryUnitPriceUsd: number;
}

export interface RecordForeignTransferDto {
  supplierId: string;
  amountEgp: number;
  amountForeign: number;
  notes?: string;
}

export const useShipmentsQuery = () => {
  return useQuery({
    queryKey: ['import-shipments'],
    queryFn: async () => {
      const data = await http<{ rows: Shipment[], stats: Record<string, number> }>('/api/import-sales/shipments');
      return data;
    },
  });
};

export const useShipmentDetailsQuery = (id: string) => {
  return useQuery({
    queryKey: ['import-shipments', id],
    queryFn: async () => {
      const data = await http<ShipmentDetails>(`/api/import-sales/shipments/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useForeignTransfersQuery = () => {
  return useQuery({
    queryKey: ['foreign-transfers'],
    queryFn: async () => {
      return await http<any[]>('/api/import-sales/foreign-transfers');
    },
  });
};

export const useCreateShipmentMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dto: CreateShipmentDto) => {
      const data = await http<Shipment>('/api/import-sales/shipments', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-shipments'] });
    },
  });
};

export const useUpdateShipmentCostsMutation = (shipmentId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dto: UpdateShipmentCostsDto) => {
      const data = await http<ShipmentDetails>(`/api/import-sales/shipments/${shipmentId}/costs`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-shipments', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['import-shipments'] });
    },
  });
};

export const useAddShipmentItemMutation = (shipmentId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dto: AddShipmentItemDto) => {
      const data = await http<ShipmentItem>(`/api/import-sales/shipments/${shipmentId}/items`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-shipments', shipmentId] });
    },
  });
};

export const useUpdateShipmentItemMutation = (shipmentId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, dto }: { itemId: string, dto: { receivedQuantity?: number, targetRetailMargin?: number, targetWholesaleMargin?: number, shortageHandlingMethod?: 'capitalize' | 'expense' } }) => {
      const data = await http(`/api/import-sales/shipment-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-shipments', shipmentId] });
    },
  });
};

export const useApplyPricesMutation = (shipmentId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const data = await http<{success: boolean, updatedCount: number}>(`/api/import-sales/shipments/${shipmentId}/apply-prices`, {
        method: 'POST',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-shipments', shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export interface ProfitReport {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfitPool: number;
  partnerShares: {
    partnerId: string;
    name: string;
    percentage: number;
    shareAmount: number;
  }[];
}

export const useProfitReportQuery = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['profit-report', startDate, endDate],
    queryFn: async () => {
      const data = await http<{ success: boolean, message: string, data: ProfitReport }>(
        `/api/import-sales/profit-report?startDate=${startDate}&endDate=${endDate}`
      );
      return data.data;
    },
    enabled: !!startDate && !!endDate,
  });
};

export interface Partner {
  id: string;
  name: string;
  profit_share_percentage: number;
  capital_amount: number;
  withdrawn_profit?: number;
}

export const usePartnersQuery = () => {
  return useQuery({
    queryKey: ['import-partners'],
    queryFn: async () => {
      const data = await http<Partner[]>('/api/import-sales/partners');
      return data;
    },
  });
};

export const useCreatePartnerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string; percentage: number; capitalAmount?: number; accountId?: string }) => {
      return await http('/api/import-sales/partners', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-partners'] });
      queryClient.invalidateQueries({ queryKey: ['profit-report'] });
    },
  });
};

export const useUpdatePartnerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string; name?: string; percentage?: number; capitalAmount?: number }) => {
      return await http(`/api/import-sales/partners/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-partners'] });
      queryClient.invalidateQueries({ queryKey: ['profit-report'] });
    },
  });
};

export interface PartnerLedgerEntry {
  id: string;
  tenant_id: string;
  partner_id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'PROFIT_PAYOUT';
  amount: number;
  transaction_date: string;
  note: string;
  created_at: string;
}

export const usePartnerLedgerQuery = (partnerId: string) => {
  return useQuery({
    queryKey: ['partner-ledger', partnerId],
    queryFn: async () => {
      return await http<PartnerLedgerEntry[]>(`/api/import-sales/partners/${partnerId}/ledger`);
    },
    enabled: !!partnerId
  });
};

export const useRecordCapitalTransactionMutation = (partnerId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; date: string; note?: string; accountId?: string }) => {
      return await http(`/api/import-sales/partners/${partnerId}/capital-transaction`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-ledger', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['profit-report'] });
    },
  });
};

export const useDeletePartnerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await http(`/api/import-sales/partners/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-partners'] });
      queryClient.invalidateQueries({ queryKey: ['profit-report'] });
    },
  });
};

export const useRecordForeignTransferMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dto: RecordForeignTransferDto) => {
      return await http<{ success: boolean }>('/api/import-sales/foreign-transfer', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foreign-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
    },
  });
};

export const usePartnerPayoutMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ partnerId, amount }: { partnerId: string, amount: number }) => {
      return await http<{ success: boolean }>(`/api/import-sales/partners/${partnerId}/payout`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-partners'] });
      queryClient.invalidateQueries({ queryKey: ['profit-report'] });
      queryClient.invalidateQueries({ queryKey: ['partner-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
    },
  });
};


// ==========================================
// IMPORT ENTERPRISE HOOKS & TYPES
// ==========================================

export interface ImportCommandCenterMetrics {
  capital: {
    totalCapital: number;
    deployedCapital: number;
    availableCapital: number;
    totalWithdrawn: number;
  };
  pipeline: {
    projects: Record<string, number>;
    shipments: {
      inTransit: number;
      inCustoms: number;
      arrived: number;
    };
  };
  liabilities: {
    totalDebtForeign: number;
  };
  alerts: {
    demurrageAlerts: Array<{
      shipmentId: string;
      containerNumber: string;
      status: string;
      isOverdue: boolean;
      overdueDays: number;
      estimatedFeesEgp: number;
      daysRemaining: number | null;
    }>;
    aciExpiring: Array<{
      id: string;
      acid_number: string;
      acid_expiry_date: string;
      status: string;
    }>;
  };
  performance: ProfitReport;
}

export const useImportCommandCenterQuery = () => {
  return useQuery({
    queryKey: ['import-command-center'],
    queryFn: async () => {
      return await http<ImportCommandCenterMetrics>('/api/import-sales/command-center');
    },
  });
};

export interface ImportProject {
  id: string;
  project_no: string;
  title: string;
  target_market: string;
  country_origin: string;
  country_destination: string;
  budget_currency: string;
  allocated_capital: number;
  target_roi_percentage: number;
  status: string;
  feasibility_data?: any;
  notes?: string;
  created_at: string;
  shipmentCount?: number;
}

export const useImportProjectsQuery = (status?: string) => {
  return useQuery({
    queryKey: ['import-projects', status],
    queryFn: async () => {
      const url = status ? `/api/import-sales/projects?status=${status}` : '/api/import-sales/projects';
      return await http<ImportProject[]>(url);
    },
  });
};

export const useImportProjectDetailsQuery = (id: string) => {
  return useQuery({
    queryKey: ['import-projects', id],
    queryFn: async () => {
      return await http<any>(`/api/import-sales/projects/${id}`);
    },
    enabled: !!id,
  });
};

export const useCreateImportProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<ImportProject>('/api/import-sales/projects', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-projects'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useUpdateImportProjectMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<ImportProject>(`/api/import-sales/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-projects', id] });
      queryClient.invalidateQueries({ queryKey: ['import-projects'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useCalculateFeasibilityMutation = () => {
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/calculate-feasibility', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
  });
};

export interface ChinaSupplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number;
  chinese_name?: string;
  city?: string;
  province?: string;
  moq_description?: string;
  production_lead_time_days?: number;
  verified_bank_details?: any;
  incoterms_accepted?: string[];
  qc_rating?: number;
  quality_certifications?: string[];
  audit_status?: string;
  import_notes?: string;
}

export const useChinaSuppliersQuery = () => {
  return useQuery({
    queryKey: ['china-suppliers'],
    queryFn: async () => {
      return await http<ChinaSupplier[]>('/api/import-sales/china-suppliers');
    },
  });
};

export const useUpsertSupplierMetaMutation = (supplierId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http(`/api/import-sales/suppliers/${supplierId}/meta`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['china-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
};

export const useQcInspectionsQuery = (projectId?: string, shipmentId?: string) => {
  return useQuery({
    queryKey: ['qc-inspections', projectId, shipmentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (shipmentId) params.set('shipmentId', shipmentId);
      return await http<any[]>(`/api/import-sales/qc-inspections?${params.toString()}`);
    },
  });
};

export const useCreateQcInspectionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/qc-inspections', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-inspections'] });
    },
  });
};

export const useAciComplianceQuery = (id: string) => {
  return useQuery({
    queryKey: ['aci-compliance', id],
    queryFn: async () => {
      return await http<any>(`/api/import-sales/aci-compliance/${id}`);
    },
    enabled: !!id,
  });
};

export const useUpsertAciComplianceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/aci-compliance', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aci-compliance'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useCustomsTariffsQuery = (search?: string) => {
  return useQuery({
    queryKey: ['customs-tariffs', search],
    queryFn: async () => {
      const url = search ? `/api/import-sales/customs-tariffs?search=${encodeURIComponent(search)}` : '/api/import-sales/customs-tariffs';
      return await http<any[]>(url);
    },
  });
};

export const useCalculateCustomsMutation = () => {
  return useMutation({
    mutationFn: async (dto: { hsCode: string; cifValueEgp: number }) => {
      return await http<any>('/api/import-sales/calculate-customs', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
  });
};

export const useCloseProjectMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await http(`/api/import-sales/projects/${projectId}/close`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-projects'] });
      queryClient.invalidateQueries({ queryKey: ['import-projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};


export interface ImportQuotation {
  id: string;
  project_id: string;
  supplier_id: number;
  quotation_no?: string;
  incoterm: string;
  currency: string;
  total_amount_foreign: number;
  exchange_rate_estimated: number;
  shipping_cost_estimated_usd: number;
  customs_duty_estimated_egp: number;
  estimated_unit_cost_egp: number;
  lead_time_days: number;
  valid_until?: string;
  status: 'draft' | 'under_review' | 'selected' | 'rejected';
  selection_reason?: string;
  selected_at?: string;
  items?: any[];
  supplier_name?: string;
  created_at: string;
}

export const useQuotationsQuery = (projectId?: string, supplierId?: string) => {
  return useQuery({
    queryKey: ['import-quotations', projectId, supplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (supplierId) params.set('supplierId', supplierId);
      return await http<ImportQuotation[]>(`/api/import-sales/quotations?${params.toString()}`);
    },
  });
};

export const useCreateQuotationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/quotations', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-quotations'] });
    },
  });
};

export const useSelectQuotationMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (selectionReason: string) => {
      return await http(`/api/import-sales/quotations/${id}/select`, {
        method: 'POST',
        body: JSON.stringify({ selectionReason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-quotations'] });
    },
  });
};

export interface ImportSampleOrder {
  id: string;
  project_id?: string;
  supplier_id: number;
  product_name: string;
  specifications?: string;
  sample_cost_usd: number;
  courier_tracking_no?: string;
  status: 'requested' | 'shipped' | 'received' | 'tested' | 'approved' | 'rejected';
  inspection_score?: number;
  inspection_notes?: string;
  reference_sample_approved: boolean;
  approval_date?: string;
  created_at: string;
  supplier_name?: string;
}

export const useSampleOrdersQuery = (projectId?: string, supplierId?: string) => {
  return useQuery({
    queryKey: ['import-samples', projectId, supplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (supplierId) params.set('supplierId', supplierId);
      return await http<ImportSampleOrder[]>(`/api/import-sales/samples?${params.toString()}`);
    },
  });
};

export const useCreateSampleOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/samples', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-samples'] });
    },
  });
};

export const useUpdateSampleInspectionMutation = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http(`/api/import-sales/samples/${id}/inspection`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-samples'] });
    },
  });
};

export const useConvertFeasibilityMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { targetRoiPercentage?: number; allocatedCapital?: number; supplierId?: number }) => {
      return await http<any>(`/api/import-sales/projects/${projectId}/convert-feasibility`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-projects'] });
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useProformaInvoicesQuery = (projectId?: string) => {
  return useQuery({
    queryKey: ['proforma-invoices', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/import-sales/proforma-invoices?projectId=${projectId}` : '/api/import-sales/proforma-invoices';
      return await http<any[]>(url);
    },
  });
};

export const useGenerateInternationalPoMutation = (piId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await http<any>(`/api/import-sales/proforma-invoices/${piId}/generate-po`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
    },
  });
};

export interface CustomsBroker {
  id: string;
  name: string;
  license_number?: string;
  phone?: string;
  email?: string;
  port_name: string;
  advance_account_id?: number;
  is_active: boolean;
  notes?: string;
  total_advances_egp: number;
  total_liquidated_egp: number;
  unliquidated_balance_egp: number;
  created_at: string;
}

export const useCustomsBrokersQuery = () => {
  return useQuery({
    queryKey: ['customs-brokers'],
    queryFn: async () => {
      return await http<CustomsBroker[]>('/api/import-sales/customs-brokers');
    },
  });
};

export const useCreateCustomsBrokerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/customs-brokers', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-brokers'] });
    },
  });
};

export const useDisburseBrokerAdvanceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/customs-brokers/advances', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-brokers'] });
      queryClient.invalidateQueries({ queryKey: ['customs-broker-statement'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useLiquidateBrokerExpenseMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/customs-brokers/liquidate', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-brokers'] });
      queryClient.invalidateQueries({ queryKey: ['customs-broker-statement'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useCustomsBrokerStatementQuery = (brokerId: string) => {
  return useQuery({
    queryKey: ['customs-broker-statement', brokerId],
    queryFn: async () => {
      return await http<any>(`/api/import-sales/customs-brokers/${brokerId}/statement`);
    },
    enabled: !!brokerId,
  });
};

export const useContainerDepositsQuery = (projectId?: string, shipmentId?: string) => {
  return useQuery({
    queryKey: ['container-deposits', projectId, shipmentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (shipmentId) params.set('shipmentId', shipmentId);
      return await http<any[]>(`/api/import-sales/container-deposits?${params.toString()}`);
    },
  });
};

export const useRecordContainerDepositMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/container-deposits', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useRefundContainerDepositMutation = (depositId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http(`/api/import-sales/container-deposits/${depositId}/return-refund`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useContainerPreordersQuery = (shipmentId?: string, projectId?: string) => {
  return useQuery({
    queryKey: ['container-preorders', shipmentId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (shipmentId) params.set('shipmentId', shipmentId);
      if (projectId) params.set('projectId', projectId);
      return await http<any[]>(`/api/import-sales/preorders?${params.toString()}`);
    },
  });
};

export const useCreateContainerPreorderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/preorders', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-preorders'] });
    },
  });
};

export const useContainerAutopsyQuery = (shipmentId: string) => {
  return useQuery({
    queryKey: ['container-autopsy', shipmentId],
    queryFn: async () => {
      return await http<any>(`/api/import-sales/shipments/${shipmentId}/autopsy`);
    },
    enabled: !!shipmentId,
  });
};

export const useFxPortfolioQuery = () => {
  return useQuery({
    queryKey: ['fx-portfolio'],
    queryFn: async () => {
      return await http<any>('/api/import-sales/fx-portfolio');
    },
  });
};

export const useRecordFxAcquisitionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/fx-acquisitions', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fx-portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export const useApprovalRequestsQuery = (status?: string) => {
  return useQuery({
    queryKey: ['approval-requests', status],
    queryFn: async () => {
      const url = status ? `/api/import-sales/approvals?status=${status}` : '/api/import-sales/approvals';
      return await http<any[]>(url);
    },
  });
};

export const useCreateApprovalRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/approvals', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
    },
  });
};

export const useDecideApprovalRequestMutation = (requestId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { decision: 'approved' | 'rejected'; reviewNotes?: string }) => {
      return await http(`/api/import-sales/approvals/${requestId}/decide`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
    },
  });
};

export const useImportDocumentsQuery = (projectId?: string, shipmentId?: string) => {
  return useQuery({
    queryKey: ['import-documents', projectId, shipmentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      if (shipmentId) params.set('shipmentId', shipmentId);
      return await http<any[]>(`/api/import-sales/documents?${params.toString()}`);
    },
  });
};

export const useUploadImportDocumentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http('/api/import-sales/documents', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-documents'] });
    },
  });
};

export const useReconciliationExceptionsQuery = (resolved?: boolean) => {
  return useQuery({
    queryKey: ['reconciliation-exceptions', resolved],
    queryFn: async () => {
      const url = resolved !== undefined ? `/api/import-sales/reconciliation/exceptions?resolved=${resolved}` : '/api/import-sales/reconciliation/exceptions';
      return await http<any[]>(url);
    },
  });
};

export const useRunReconciliationScanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await http<any>('/api/import-sales/reconciliation/scan', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-exceptions'] });
    },
  });
};

export const useResolveReconciliationExceptionMutation = (exceptionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resolutionNotes: string) => {
      return await http(`/api/import-sales/reconciliation/exceptions/${exceptionId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNotes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-exceptions'] });
    },
  });
};
