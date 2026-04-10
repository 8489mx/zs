import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { formatDateTime } from '@/features/settings/components/user-management.shared';

export function UserManagementSetupHeader({
  draft,
  setupMode,
  setupStepKey,
  isCurrentUserSelected,
}: {
  draft: ManagedUserRecord;
  setupMode: boolean;
  setupStepKey: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null;
  isCurrentUserSelected: boolean;
}) {
  return (
    <div className="card-surface" style={{ padding: 12, borderRadius: 16, border: '1px solid #e2e8f0' }}>
      <div className="muted small">المستخدم المحدد</div>
      <strong>{draft.name || draft.username || 'مستخدم جديد'}</strong>
      <div className="muted small" style={{ marginTop: 6 }}>
        {setupMode ? (setupStepKey === 'secure-account' ? 'حساب التثبيت' : 'مستخدم جديد') : draft.id ? `آخر دخول: ${formatDateTime(draft.lastLoginAt)}` : 'مستخدم جديد'}
        {!setupMode && isCurrentUserSelected ? ' · هذا هو المستخدم الحالي.' : ''}
      </div>
    </div>
  );
}
