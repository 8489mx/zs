import { http } from '@/lib/http';

export type PivotMetric = 'total_amount' | 'net_profit' | 'quantity' | 'count' | 'avg_amount';

export interface PivotCell {
  value: number;
  formattedValue: string;
  count: number;
}

export interface PivotKeyItem {
  key: string;
  label: string;
}

export interface PivotResult {
  rowDimension: string;
  colDimension: string | null;
  metric: PivotMetric;
  rowKeys: PivotKeyItem[];
  colKeys: PivotKeyItem[];
  matrix: Record<string, Record<string, PivotCell>>;
  rowTotals: Record<string, PivotCell>;
  colTotals: Record<string, PivotCell>;
  grandTotal: PivotCell;
}

export interface ExecutePivotPayload {
  dataset: 'sales' | 'purchases' | 'inventory' | 'expenses';
  rowDimension: string;
  colDimension?: string;
  metric: PivotMetric;
  dateFrom?: string;
  dateTo?: string;
  branchId?: number;
}

export interface SavedPivotTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  dataset: string;
  row_dimension: string;
  col_dimension?: string;
  metric: string;
  date_from?: string;
  date_to?: string;
  filters?: any;
  is_favorite: boolean;
  created_at: string;
}

export interface SavePivotTemplatePayload {
  name: string;
  description?: string;
  dataset: string;
  rowDimension: string;
  colDimension?: string;
  metric: string;
  dateFrom?: string;
  dateTo?: string;
  filters?: any;
  isFavorite?: boolean;
}

export const dynamicPivotApi = {
  executePivot: (payload: ExecutePivotPayload) =>
    http<PivotResult>('/api/reports/pivot/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSavedTemplates: (dataset?: string) => {
    const q = dataset ? `?dataset=${dataset}` : '';
    return http<SavedPivotTemplate[]>(`/api/reports/pivot/templates${q}`);
  },

  saveTemplate: (payload: SavePivotTemplatePayload) =>
    http<{ success: boolean; id: string }>('/api/reports/pivot/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTemplate: (id: string) =>
    http<{ success: boolean }>(`/api/reports/pivot/templates/${id}`, {
      method: 'DELETE',
    }),
};
