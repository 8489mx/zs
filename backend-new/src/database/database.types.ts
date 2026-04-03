import { ColumnType, Generated } from 'kysely';

export interface Phase1BootstrapTable {
  id: Generated<number>;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SessionTable {
  id: string;
  user_id: number;
  expires_at: Date;
  created_at: ColumnType<Date, string | undefined, never>;
  last_seen_at: Date | null;
  ip_address: string;
  user_agent: string;
}

export interface AuditLogTable {
  id: Generated<number>;
  action: string;
  details: string;
  created_by: number | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface Database {
  _phase1_bootstrap: Phase1BootstrapTable;
  sessions: SessionTable;
  audit_logs: AuditLogTable;
}
