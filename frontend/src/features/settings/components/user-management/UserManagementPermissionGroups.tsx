import { USER_PERMISSION_GROUPS, getPermissionLabel } from '@/features/settings/components/user-management.shared';

const optionStyle: React.CSSProperties = {
  cursor: 'pointer',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  border: '1px solid #dbe4f0',
  borderRadius: 16,
  background: '#fff',
};

const checkboxStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  margin: 0,
  accentColor: '#2563eb',
};

export function UserManagementBranchAccess({
  branches,
  selectedBranchIds,
  onToggleBranch,
}: {
  branches: Array<{ id: string; name: string }>;
  selectedBranchIds: string[];
  onToggleBranch: (branchId: string) => void;
}) {
  return (
    <div className="field">
      <span>الفروع المسموح بها</span>
      <div className="two-column-grid" style={{ gap: 10 }}>
        {branches.length ? branches.map((branch) => (
          <label key={branch.id} style={optionStyle}>
            <input type="checkbox" style={checkboxStyle} checked={selectedBranchIds.includes(branch.id)} onChange={() => onToggleBranch(branch.id)} />
            <span style={{ fontWeight: 700 }}>{branch.name}</span>
          </label>
        )) : <div className="muted">أضف فرعًا أولًا من أعلى الإعدادات.</div>}
      </div>
    </div>
  );
}

export function UserManagementPermissionGroups({
  permissions,
  role,
  onTogglePermission,
}: {
  permissions: string[];
  role: 'super_admin' | 'admin' | 'cashier';
  onTogglePermission: (permission: string) => void;
}) {
  return (
    <div className="field">
      <span>الصلاحيات</span>
      <div className="page-stack">
        {USER_PERMISSION_GROUPS.map((group) => (
          <div key={group.title} className="card-surface" style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 18 }}>
            <strong style={{ display: 'block', marginBottom: 12, fontSize: 18 }}>{group.title}</strong>
            <div className="two-column-grid" style={{ gap: 10 }}>
              {group.items.map((permission) => (
                <label key={permission} style={optionStyle}>
                  <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={permissions.includes(permission)}
                    onChange={() => onTogglePermission(permission)}
                    disabled={role === 'super_admin'}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontWeight: 700 }}>{getPermissionLabel(permission)}</span>
                    <span className="muted small">{permission}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
