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
