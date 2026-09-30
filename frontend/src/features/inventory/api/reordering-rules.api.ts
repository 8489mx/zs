import { http } from '@/lib/http';
import { buildQueryString } from '@/lib/query-string';

export interface ReorderingRuleRecord {
  id: number;
  product_id: number;
  product_name: string;
  product_sku?: string | null;
  product_barcode?: string | null;
  product_cost_price: number;
  product_global_stock: number;
  warehouse_id?: number | null;
  warehouse_name?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  min_qty: number;
  max_qty: number;
  qty_multiple: number;
  preferred_supplier_id?: number | null;
  preferred_supplier_name?: string | null;
  preferred_supplier_phone?: string | null;
  action_mode: 'auto_draft_po' | 'manual_review';
  is_active: boolean;
  onHandQty: number;
  incomingQty: number;
  reservedQty?: number;
  forecastedQty: number;
  isBreached: boolean;
  shortageQty: number;
  suggestedOrderQty: number;
  decisionReason?: string;
  last_run_at?: string | null;
  last_trigger_status?: string | null;
  last_generated_po_id?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReorderingRulesListResponse {
  rules: ReorderingRuleRecord[];
  summary: {
    totalRules: number;
    activeRules: number;
    breachedCount: number;
    generatedOrdersCount: number;
  };
}

export interface CreateReorderingRulePayload {
  productId: number;
  warehouseId?: number;
  branchId?: number;
  minQty: number;
  maxQty: number;
  qtyMultiple?: number;
  preferredSupplierId?: number;
  actionMode?: 'auto_draft_po' | 'manual_review';
  isActive?: boolean;
  notes?: string;
}

export interface UpdateReorderingRulePayload {
  warehouseId?: number;
  branchId?: number;
  minQty?: number;
  maxQty?: number;
  qtyMultiple?: number;
  preferredSupplierId?: number;
  actionMode?: 'auto_draft_po' | 'manual_review';
  isActive?: boolean;
  notes?: string;
}

export interface RunReorderingEvaluationPayload {
  warehouseId?: number;
  productId?: number;
  autoCreateOrders?: boolean;
}

export interface RunEvaluationResponse {
  ok: boolean;
  evaluatedRulesCount: number;
  breachedRulesCount: number;
  generatedOrdersCount: number;
  generatedOrders: Array<{
    id: number;
    order_number: string;
    supplier_name: string;
    total_amount: number;
    status: string;
  }>;
}

export const reorderingRulesApi = {
  listRules: (params?: { warehouseId?: number; status?: 'all' | 'breached' | 'normal'; q?: string }) => {
    const qs = params ? buildQueryString(params as any) : '';
    return http<ReorderingRulesListResponse>(`/api/inventory/reordering-rules${qs}`);
  },

  createRule: (payload: CreateReorderingRulePayload) => {
    return http<ReorderingRuleRecord>('/api/inventory/reordering-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRule: (id: number, payload: UpdateReorderingRulePayload) => {
    return http<ReorderingRuleRecord>(`/api/inventory/reordering-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteRule: (id: number) => {
    return http<{ ok: boolean }>(`/api/inventory/reordering-rules/${id}`, {
      method: 'DELETE',
    });
  },

  runEvaluation: (payload?: RunReorderingEvaluationPayload) => {
    return http<RunEvaluationResponse>('/api/inventory/reordering-rules/run', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },
};
