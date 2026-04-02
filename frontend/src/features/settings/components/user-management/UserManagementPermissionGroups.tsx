import { USER_PERMISSION_GROUPS } from '@/features/settings/components/user-management.shared';

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
          <label key={branch.id} className="list-row" style={{ cursor: 'pointer' }}>
            <span>{branch.name}</span>
            <input type="checkbox" checked={selectedBranchIds.includes(branch.id)} onChange={() => onToggleBranch(branch.id)} />
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
          <div key={group.title} className="card-surface" style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 16 }}>
            <strong style={{ display: 'block', marginBottom: 10 }}>{group.title}</strong>
            <div className="two-column-grid" style={{ gap: 8 }}>
              {group.items.map((permission) => (
                <label key={permission} className="list-row" style={{ cursor: 'pointer' }}>
                  <span>{permission}</span>
                  <input type="checkbox" checked={permissions.includes(permission)} onChange={() => onTogglePermission(permission)} disabled={role === 'super_admin'} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
