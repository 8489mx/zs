import { useTranslation } from 'react-i18next';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { formatDateTime } from '@/features/settings/components/user-management.shared';
import type { SetupStepKey } from '@/features/settings/hooks/useFirstRunSetupFlow';

export function UserManagementSetupHeader({
  draft,
  setupMode,
  setupStepKey,
  isCurrentUserSelected,
}: {
  draft: ManagedUserRecord;
  setupMode: boolean;
  setupStepKey: SetupStepKey | null;
  isCurrentUserSelected: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="card-surface" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div className="muted small">{t('settings.user_management_panels.user_management_setup_header.s0', "المستخدم المحدد")}</div>
      <strong>{draft.name || draft.username || t('settings.user_management_panels.user_management_setup_header.s1', "مستخدم جديد")}</strong>
      <div className="muted small" style={{ marginTop: 6 }}>
        {setupMode ? (setupStepKey === 'secure-account' ? t('settings.user_management_panels.user_management_setup_header.s2', "حساب التثبيت") : t('settings.user_management_panels.user_management_setup_header.s3', "مستخدم جديد")) : draft.id ? `آخر دخول: ${formatDateTime(draft.lastLoginAt)}` : t('settings.user_management_panels.user_management_setup_header.s4', "مستخدم جديد")}
        {!setupMode && isCurrentUserSelected ? t('settings.user_management_panels.user_management_setup_header.s5', " · هذا هو المستخدم الحالي.") : ''}
      </div>
    </div>
  );
}
