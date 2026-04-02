import { blankUserDraft, normalizeUserRecord, USER_ROLE_TEMPLATES } from '@/features/settings/components/user-management.shared';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';

export function applyRolePermissions(role: 'super_admin' | 'admin' | 'cashier') {
  return role === 'super_admin' ? blankUserDraft('super_admin').permissions : role === 'admin' ? [] : blankUserDraft('cashier').permissions;
}

export function buildTemplateDraft(current: ManagedUserRecord, templateKey: keyof typeof USER_ROLE_TEMPLATES) {
  const template = USER_ROLE_TEMPLATES[templateKey];
  return {
    nextDraft: { ...current, role: template.role, permissions: [...template.permissions], mustChangePassword: current.mustChangePassword ?? true },
    label: template.label,
  };
}

export function toggleDraftPermission(current: ManagedUserRecord, permission: string) {
  return {
    ...current,
    permissions: current.permissions.includes(permission) ? current.permissions.filter((entry) => entry !== permission) : [...current.permissions, permission],
  };
}

export function toggleDraftBranch(current: ManagedUserRecord, branchId: string) {
  const branchIds = current.branchIds.includes(branchId) ? current.branchIds.filter((entry) => entry !== branchId) : [...current.branchIds, branchId];
  const defaultBranchId = branchIds.includes(current.defaultBranchId) ? current.defaultBranchId : '';
  return { ...current, branchIds, defaultBranchId };
}

export function validateUserDraft({ draft, managedUsers }: { draft: ManagedUserRecord; managedUsers: ManagedUserRecord[] }) {
  const normalizedDraft = normalizeUserRecord(draft);
  if (!normalizedDraft.username.trim()) throw new Error('اسم المستخدم مطلوب');
  if (!normalizedDraft.name.trim()) normalizedDraft.name = normalizedDraft.username.trim();
  if (!normalizedDraft.id && !String(normalizedDraft.password || '').trim()) throw new Error('كلمة المرور مطلوبة عند إنشاء مستخدم جديد');
  if (normalizedDraft.defaultBranchId && !normalizedDraft.branchIds.includes(normalizedDraft.defaultBranchId)) normalizedDraft.branchIds = [...normalizedDraft.branchIds, normalizedDraft.defaultBranchId];
  const duplicateUser = managedUsers.find((user) => user.username.trim().toLowerCase() === normalizedDraft.username.trim().toLowerCase() && String(user.id || '') !== String(normalizedDraft.id || ''));
  if (duplicateUser) throw new Error('اسم المستخدم مستخدم بالفعل');
  if (!['super_admin', 'admin'].includes(normalizedDraft.role) && normalizedDraft.isActive === false) {
    const hasOtherActiveAdmin = managedUsers.some((user) => String(user.id || '') !== String(normalizedDraft.id || '') && ['super_admin', 'admin'].includes(user.role) && user.isActive !== false);
    if (!hasOtherActiveAdmin) throw new Error('لا يمكن إزالة آخر مدير نشط');
  }
  return normalizedDraft;
}
