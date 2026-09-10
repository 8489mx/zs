export interface TamperAuditLogItem {
  id: string;
  tenant_id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: Record<string, { old: any; new: any }> | null;
  user_id: number | null;
  user_username: string | null;
  db_user: string | null;
  client_ip: string | null;
  prev_hash: string | null;
  row_hash: string;
  created_at: string;
}

export interface TamperAuditListResponse {
  items: TamperAuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TamperChainVerificationResult {
  isValid: boolean;
  totalRecords: number;
  verifiedAt: string;
  firstRecordAt: string | null;
  lastRecordAt: string | null;
  genesisHash: string | null;
  latestHash: string | null;
  compromisedRecordId: string | null;
  violationReason: string | null;
}

export interface TamperAuditQueryParams {
  tableName?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}
