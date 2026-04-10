import { normalizeUserRecord } from '@/features/settings/components/user-management.shared';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
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
  };
}) {
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

  const eligibleUsers = selectedUsers.filter((user) => String(user.id || '') !== currentUserId && user.role !== 'super_admin');
  const selectedPrivilegedUsers = eligibleUsers.filter((user) => ['super_admin', 'admin'].includes(user.role) && user.isActive !== false);
  if (selectedPrivilegedUsers.length && selectedPrivilegedUsers.length >= Number(userSummary.activePrivilegedUsers || 0)) {
    throw new Error('لا يمكن إيقاف جميع المدراء النشطين دفعة واحدة');
  }
  if (!eligibleUsers.length) throw new Error('لا توجد حسابات قابلة للإيقاف ضمن التحديد الحالي');

  for (const user of eligibleUsers) {
    const payload = normalizeUserRecord(user);
    payload.isActive = false;
    await settingsApi.updateUser(String(user.id), payload);
  }
  setStatusMessage(`تم إيقاف ${eligibleUsers.length} مستخدم/مستخدمين، مع تجاوز الحساب الحالي والسوبر أدمن تلقائيًا.`);
  return true;
}
