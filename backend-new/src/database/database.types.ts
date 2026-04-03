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

export interface UserTable {
  id: Generated<number>;
  username: string;
  password_hash: string;
  password_salt: string;
  role: 'super_admin' | 'admin' | 'cashier';
  is_active: boolean;
  permissions_json: string;
  branch_ids_json: string;
  default_branch_id: number | null;
  display_name: string;
  must_change_password: boolean;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface SettingTable {
  key: string;
  value: string;
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
  users: UserTable;
  settings: SettingTable;
  audit_logs: AuditLogTable;
}
