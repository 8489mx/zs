import React, { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getFilteredPermissionGroups, getPermissionLabel } from '@/features/settings/components/user-management.shared';

const optionStyle: React.CSSProperties = {
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  background: '#ffffff',
  transition: 'all 0.15s ease',
};

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  margin: 0,
  accentColor: '#0f172a',
  cursor: 'pointer',
  flexShrink: 0,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>الفروع المسموح بها للمستخدم</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
        {branches.length ? branches.map((branch) => (
          <label key={branch.id} style={{ ...optionStyle, background: selectedBranchIds.includes(branch.id) ? '#f8fafc' : '#ffffff' }}>
            <input type="checkbox" style={checkboxStyle} checked={selectedBranchIds.includes(branch.id)} onChange={() => onToggleBranch(branch.id)} />
            <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>{branch.name}</span>
          </label>
        )) : <div className="muted small">أضف فرعًا أولًا من أعلى الإعدادات.</div>}
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
  const tenant = useAuthStore((s) => s.tenant);

  const visibleGroups = useMemo(() => {
    return getFilteredPermissionGroups(tenant?.features);
  }, [tenant?.features]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>مجموعات الصلاحيات التفصيلية</span>
        {tenant?.features && tenant.features.length > 0 ? (
          <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #bfdbfe' }}>
            مخصصة وفق باقة المنشأة الحالية
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {visibleGroups.map((group) => {
          const activeInGroup = group.items.filter((p) => permissions.includes(p)).length;
          return (
            <div key={group.title} style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>{group.title}</strong>
                <span style={{ fontSize: '0.72rem', background: activeInGroup > 0 ? '#dcfce7' : '#f1f5f9', color: activeInGroup > 0 ? '#166534' : '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  {activeInGroup} / {group.items.length} مفعّل
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {group.items.map((permission) => {
                  const isChecked = permissions.includes(permission);
                  return (
                    <label key={permission} style={{ ...optionStyle, background: isChecked ? '#f0fdf4' : '#ffffff', borderColor: isChecked ? '#bbf7d0' : '#e2e8f0' }}>
                      <input
                        type="checkbox"
                        style={checkboxStyle}
                        checked={isChecked}
                        onChange={() => onTogglePermission(permission)}
                        disabled={role === 'super_admin'}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{getPermissionLabel(permission)}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{permission}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


