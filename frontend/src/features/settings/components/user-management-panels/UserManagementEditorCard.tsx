import { Field } from '@/shared/ui/field';
import type { Branch } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { formatDateTime } from '@/features/settings/components/user-management.shared';

export function UserManagementEditorCard({
  branches,
  draft,
  currentUserRole,
  isCurrentUserSelected,
  onDraftChange,
  onApplyRolePermissions,
}: {
  branches: Branch[];
  draft: ManagedUserRecord;
  currentUserRole: string;
  isCurrentUserSelected: boolean;
  onDraftChange: (updater: (current: ManagedUserRecord) => ManagedUserRecord) => void;
  onApplyRolePermissions: (role: 'super_admin' | 'admin' | 'cashier') => void;
}) {
  return (
    <>
      <div className="card-surface" style={{ padding: 12, borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div className="muted small">المستخدم المحدد</div>
        <strong>{draft.name || draft.username || 'مستخدم جديد'}</strong>
        <div className="muted small" style={{ marginTop: 6 }}>
          {draft.id ? `آخر دخول: ${formatDateTime(draft.lastLoginAt)}` : 'مستخدم جديد'}
          {isCurrentUserSelected ? ' · هذا هو المستخدم الحالي.' : ''}
        </div>
      </div>

      <div className="form-grid">
        <Field label="اسم المستخدم"><input value={draft.username} onChange={(e) => onDraftChange((current) => ({ ...current, username: e.target.value }))} /></Field>
        <Field label="الاسم المعروض"><input value={draft.name} onChange={(e) => onDraftChange((current) => ({ ...current, name: e.target.value }))} /></Field>
        <Field label="الدور">
          <select value={draft.role} onChange={(e) => onApplyRolePermissions(e.target.value === 'super_admin' ? 'super_admin' : e.target.value === 'admin' ? 'admin' : 'cashier')} disabled={currentUserRole !== 'super_admin' || draft.role === 'super_admin'}>
            <option value="cashier">كاشير</option>
            <option value="admin">مدير نظام</option>
            {currentUserRole === 'super_admin' ? <option value="super_admin">سوبر أدمن</option> : null}
          </select>
        </Field>
        <Field label="كلمة المرور الجديدة / الأولى"><input type="password" value={draft.password || ''} onChange={(e) => onDraftChange((current) => ({ ...current, password: e.target.value }))} placeholder={draft.id ? 'اتركها فارغة إن لم ترد التغيير' : 'مطلوبة للمستخدم الجديد'} /></Field>
        {!SINGLE_STORE_MODE ? <Field label="الفرع الافتراضي">
          <select value={draft.defaultBranchId} onChange={(e) => onDraftChange((current) => ({ ...current, defaultBranchId: e.target.value }))}>
            <option value="">بدون افتراضي</option>
            {branches.filter((branch) => draft.branchIds.includes(branch.id)).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </Field> : null}
        <div className="field">
          <span>الحالة</span>
          <div className="actions compact-actions">
            <label><input type="checkbox" checked={draft.isActive !== false} onChange={(e) => onDraftChange((current) => ({ ...current, isActive: e.target.checked }))} /> نشط</label>
            <label><input type="checkbox" checked={draft.mustChangePassword === true} onChange={(e) => onDraftChange((current) => ({ ...current, mustChangePassword: e.target.checked }))} /> يجب تغيير كلمة المرور</label>
          </div>
        </div>
      </div>
    </>
  );
}
