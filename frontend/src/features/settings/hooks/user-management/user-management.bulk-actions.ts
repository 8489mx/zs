import { normalizeUserRecord } from '@/features/settings/components/user-management.shared';
import type { BulkDisableUsersResponse, ManagedUserRecord } from '@/features/settings/api/settings.api';
import type { UserBulkAction } from '@/features/settings/hooks/user-management/user-management.types';

export async function runUserBulkAction({
  bulkAction,
  selectedUsers,
  currentUserId,
  userSummary,
  setStatusMessage,
  settingsApi,
}: {
  bulkAction: UserBulkAction | null;
  selectedUsers: ManagedUserRecord[];
  currentUserId: string;
  userSummary: { activePrivilegedUsers?: number };
  setStatusMessage: (message: string) => void;
  settingsApi: {
    unlockUser: (id: string) => Promise<unknown>;
    updateUser: (id: string, payload: ManagedUserRecord) => Promise<unknown>;
    bulkDisableUsers: (userIds: string[]) => Promise<BulkDisableUsersResponse>;
  };
}) {
  void currentUserId;
  void userSummary;
  if (!bulkAction || !selectedUsers.length) return false;

  if (bulkAction === 'unlock') {
    const lockedUsers = selectedUsers.filter((user) => Boolean(user.lockedUntil));
    if (!lockedUsers.length) throw new Error('لا توجد حسابات مقفولة ضمن التحديد الحالي');
    for (const user of lockedUsers) await settingsApi.unlockUser(String(user.id));
    setStatusMessage(`تم فتح قفل ${lockedUsers.length} مستخدم/مستخدمين.`);
    return true;
  }

  if (bulkAction === 'require-password-change') {
    for (const user of selectedUsers) {
      const payload = normalizeUserRecord(user);
      payload.mustChangePassword = true;
      await settingsApi.updateUser(String(user.id), payload);
    }
    setStatusMessage(`تم فرض تغيير كلمة المرور على ${selectedUsers.length} مستخدم/مستخدمين.`);
    return true;
  }

  const ids = selectedUsers.map((user) => String(user.id || '')).filter(Boolean);
  if (!ids.length) throw new Error('لا يوجد مستخدم قابل للإيقاف ضمن التحديد الحالي.');

  const result = await settingsApi.bulkDisableUsers(ids);
  const parts: string[] = [];
  if (Number(result.disabledCount || 0) > 0) {
    parts.push(`تم إيقاف ${result.disabledCount} مستخدم.`);
  }
  if (Number(result.skippedCount || 0) > 0) {
    parts.push(`تم تخطي ${result.skippedCount} حساب محمي.`);
  }
  if (!Number(result.disabledCount || 0)) {
    parts.push('لا يوجد مستخدم قابل للإيقاف ضمن التحديد الحالي.');
  }

  setStatusMessage(parts.join(' '));
  return true;
}
