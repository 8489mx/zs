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
  cost_allocation_method?: 'value' | 'weight' | 'cbm';
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
  inventory_receipt?: {
    id: number;
    state: string;
    posted_at: string;
    review_reason?: string | null;
    journal_entry_id?: number | null;
  } | null;
  demurrageRisk?: any;
}

export interface CreateShipmentDto {
  containerNumber: string;
  projectId?: string;
  arrivalDate?: string;
  supplierId?: string;
  billOfLading?: string;
  shippingDate?: string;
  freightType?: string;
  containerSize?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  freeDemurrageDays?: number;
  costAllocationMethod?: string;
}

export interface UpdateShipmentCostsDto {
  receiptLocationId?: number;
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
  costAllocationMethod?: 'value' | 'weight' | 'cbm';
}

export interface AddShipmentItemDto {
  productId: string;
  quantity: number;
  factoryUnitPriceUsd: number;
  unitWeightKg?: number;
  unitCbm?: number;
}

export interface RecordForeignTransferDto {
  supplierId: string;
  projectId?: string;
  proformaInvoiceId?: string;
  amountEgp: number;
  amountForeign: number;
  currency?: string;
  exchangeRateContract?: number;
  bankAccountId?: number;
  idempotencyKey?: string;
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
    mutationFn: async ({ itemId, dto }: { itemId: string, dto: { receivedQuantity?: number, targetRetailMargin?: number, targetWholesaleMargin?: number, shortageHandlingMethod?: 'capitalize' | 'expense', unitWeightKg?: number, unitCbm?: number } }) => {
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
  profitAttributionVerified?: boolean;
  attributionStatus?: string;
  partnerShares: {
    partnerId: string;
    name: string;
    percentage: number;
    shareAmount: number;
    withdrawnProfit?: number;
    currentBalance?: number;
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
    mutationFn: async ({
      partnerId,
      amount,
      approvalRequestId,
      projectId,
      treasuryAccountId,
    }: {
      partnerId: string;
      amount: number;
      approvalRequestId: string;
      projectId?: string;
      treasuryAccountId?: string;
    }) => {
      return await http<{ success: boolean }>(`/api/import-sales/partners/${partnerId}/payout`, {
        method: 'POST',
        body: JSON.stringify({ amount, approvalRequestId, projectId, treasuryAccountId }),
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
    mutationFn: async (approvalRequestId: string) => {
      return await http(`/api/import-sales/projects/${projectId}/close`, {
        method: 'POST', body: JSON.stringify({ approvalRequestId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-projects'] });
      queryClient.invalidateQueries({ queryKey: ['import-projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['import-command-center'] });
    },
  });
};

export interface CustomsBroker {
  id: string;
  name: string;
  license_no?: string;
  license_number?: string;
  port_name?: string;
  phone?: string;
  customs_ports?: string[];
  is_active?: boolean;
  total_advances_egp?: number;
  total_liquidated_egp?: number;
  unliquidated_balance_egp?: number;
  current_balance_egp?: number;
  created_at?: string;
}

export const useCustomsBrokersQuery = () => {
  return useQuery({
    queryKey: ['customs-brokers'],
    queryFn: async () => {
      const data = await http<CustomsBroker[]>('/api/import-sales/customs-brokers');
      return data;
    },
  });
};

export const useCreateCustomsBrokerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<CustomsBroker>('/api/import-sales/customs-brokers', {
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
      return await http<any>('/api/import-sales/customs-brokers/advances', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-brokers'] });
      queryClient.invalidateQueries({ queryKey: ['customs-broker-statement'] });
    },
  });
};

export const useLiquidateBrokerExpenseMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/customs-brokers/liquidate', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customs-brokers'] });
      queryClient.invalidateQueries({ queryKey: ['customs-broker-statement'] });
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

export const useContainerDepositsQuery = (shipmentId?: string) => {
  return useQuery({
    queryKey: ['container-deposits', shipmentId],
    queryFn: async () => {
      const url = shipmentId ? `/api/import-sales/container-deposits?shipmentId=${shipmentId}` : '/api/import-sales/container-deposits';
      return await http<any[]>(url);
    },
  });
};

export const useRecordContainerDepositMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/container-deposits', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-deposits'] });
    },
  });
};

export const useRefundContainerDepositMutation = (defaultDepositId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: any) => {
      const depositId = args?.depositId || defaultDepositId;
      const dto = args?.dto !== undefined ? args.dto : args;
      return await http<any>(`/api/import-sales/container-deposits/${depositId}/return-refund`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-deposits'] });
    },
  });
};

export const useContainerPreordersQuery = (shipmentId?: string) => {
  return useQuery({
    queryKey: ['container-preorders', shipmentId],
    queryFn: async () => {
      const url = shipmentId ? `/api/import-sales/preorders?shipmentId=${shipmentId}` : '/api/import-sales/preorders';
      return await http<any[]>(url);
    },
  });
};

export const useCreateContainerPreorderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/preorders', {
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

export const useSampleOrdersQuery = (projectId?: string) => {
  return useQuery({
    queryKey: ['sample-orders', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/import-sales/samples?projectId=${projectId}` : '/api/import-sales/samples';
      return await http<any[]>(url);
    },
  });
};

export const useCreateSampleOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/samples', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-orders'] });
    },
  });
};

export const useUpdateSampleInspectionMutation = (defaultSampleId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: any) => {
      const sampleId = args?.sampleId || defaultSampleId;
      const dto = args?.dto !== undefined ? args.dto : args;
      return await http<any>(`/api/import-sales/samples/${sampleId}/inspection`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-orders'] });
    },
  });
};

export interface ProformaInvoice {
  id: string;
  tenant_id: string;
  project_id?: string;
  supplier_id: number;
  supplier_name?: string;
  pi_number: string;
  issue_date: string;
  currency: string;
  total_amount_foreign: string | number;
  paid_amount_foreign: string | number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  international_po_number?: string;
  status: string;
  created_at?: string;
}

export const useProformaInvoicesQuery = (projectId?: string) => {
  return useQuery({
    queryKey: ['proforma-invoices', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/import-sales/proforma-invoices?projectId=${projectId}` : '/api/import-sales/proforma-invoices';
      return await http<any[]>(url);
    },
  });
};

export const useGenerateInternationalPoMutation = (defaultPiId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (piId?: string) => {
      const id = piId || defaultPiId;
      return await http<any>(`/api/import-sales/proforma-invoices/${id}/generate-po`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
    },
  });
};

export interface CreateProformaInvoicePayload {
  projectId?: string;
  supplierId: string | number;
  piNumber: string;
  piDate: string;
  currency?: string;
  totalAmountForeign: number;
  incoterm?: string;
  deliveryPort?: string;
  paymentTerms?: string;
  exchangeRateContract?: number;
  advancePercentage?: number;
  balancePercentage?: number;
  items?: any[];
  notes?: string;
}

export const useCreateProformaInvoiceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProformaInvoicePayload) => {
      return await http<any>('/api/import-sales/proforma-invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
    },
  });
};

export interface Quotation {
  id: string;
  tenant_id: string;
  project_id?: string;
  supplier_id: number;
  supplier_name?: string;
  quotation_no?: string;
  incoterm?: string;
  currency?: string;
  total_amount_foreign: string | number;
  exchange_rate_estimated?: string | number;
  shipping_cost_estimated_usd?: string | number;
  customs_duty_estimated_egp?: string | number;
  estimated_unit_cost_egp?: string | number;
  lead_time_days?: number;
  status: 'draft' | 'under_review' | 'selected' | 'rejected';
  selection_reason?: string;
  valid_until?: string;
  created_at?: string;
}

export const useQuotationsQuery = (projectId?: string) => {
  return useQuery({
    queryKey: ['import-quotations', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/import-sales/quotations?projectId=${projectId}` : '/api/import-sales/quotations';
      return await http<any[]>(url);
    },
  });
};

export const useCreateQuotationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/quotations', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-quotations'] });
    },
  });
};

export const useSelectQuotationMutation = (defaultQuotationId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: string | { quotationId?: string; reason?: string }) => {
      let id = defaultQuotationId;
      let reason: string | undefined;
      if (typeof args === 'string') {
        reason = args;
      } else if (args) {
        id = args.quotationId || defaultQuotationId;
        reason = args.reason;
      }
      return await http<any>(`/api/import-sales/quotations/${id}/select`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['import-projects'] });
    },
  });
};


// ==========================================
// PRE-ORDER CONVERSION TO SALES
// ==========================================
export const useConvertPreorderToSaleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ preorderId, dto }: { preorderId: string; dto?: any }) => {
      return await http<any>(`/api/import-sales/preorders/${preorderId}/convert-to-sale`, {
        method: 'POST',
        body: JSON.stringify(dto || {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['container-preorders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

// ==========================================
// MAKER-CHECKER APPROVALS
// ==========================================
export const useApprovalRequestsQuery = (status?: string) => {
  return useQuery({
    queryKey: ['import-approvals', status],
    queryFn: async () => {
      const url = status ? `/api/import-sales/approvals?status=${encodeURIComponent(status)}` : '/api/import-sales/approvals';
      return await http<any[]>(url);
    },
  });
};

export const useCreateApprovalRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/approvals', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-approvals'] });
    },
  });
};

export const useDecideApprovalRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, rejectionReason, comments }: { id: string; decision: 'approved' | 'rejected'; rejectionReason?: string; comments?: string }) => {
      return await http<any>(`/api/import-sales/approvals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, rejectionReason, comments }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-approvals'] });
    },
  });
};

// ==========================================
// FX TREASURY & CURRENCY PORTFOLIO
// ==========================================
export const useFxPortfolioQuery = () => {
  return useQuery({
    queryKey: ['import-fx-portfolio'],
    queryFn: async () => {
      return await http<any>('/api/import-sales/fx-portfolio');
    },
  });
};

export const useRecordFxAcquisitionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/fx-acquisitions', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-fx-portfolio'] });
    },
  });
};

// ==========================================
// RECONCILIATION & EXCEPTIONS SCANNER
// ==========================================
export const useReconciliationExceptionsQuery = (status?: string) => {
  return useQuery({
    queryKey: ['import-reconciliation-exceptions', status],
    queryFn: async () => {
      const url = status ? `/api/import-sales/reconciliation/exceptions?status=${encodeURIComponent(status)}` : '/api/import-sales/reconciliation/exceptions';
      return await http<any[]>(url);
    },
  });
};

export const useRunReconciliationScanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await http<any>('/api/import-sales/reconciliation/scan', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-reconciliation-exceptions'] });
    },
  });
};

export const useResolveReconciliationExceptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolutionNotes }: { id: string; resolutionNotes?: string }) => {
      return await http<any>(`/api/import-sales/reconciliation/exceptions/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNotes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-reconciliation-exceptions'] });
    },
  });
};

// ==========================================
// SOURCING TRIPS
// ==========================================
export const useSourcingTripsQuery = (projectId?: string) => {
  return useQuery({
    queryKey: ['import-sourcing-trips', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/import-sales/sourcing-trips?projectId=${encodeURIComponent(projectId)}` : '/api/import-sales/sourcing-trips';
      return await http<any[]>(url);
    },
  });
};

export const useCreateSourcingTripMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      return await http<any>('/api/import-sales/sourcing-trips', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-sourcing-trips'] });
    },
  });
};
