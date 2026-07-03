import { Field } from '@/shared/ui/field';
import type { Branch } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { PASSWORD_MIN_LENGTH_HINT } from '@/config/security';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { formatDateTime } from '@/features/settings/components/user-management.shared';

export function UserManagementEditorCard({
  branches,
  draft,
  currentUserRole,
  isCurrentUserSelected,
  selectedDraftDisableProtection,
  canDirectlyDisableSelected,
  onDraftChange,
  onApplyRolePermissions,
}: {
  branches: Branch[];
  draft: ManagedUserRecord;
  currentUserRole: string;
  isCurrentUserSelected: boolean;
  selectedDraftDisableProtection: 'super_admin' | 'current_user' | 'last_active_privileged' | null;
  canDirectlyDisableSelected: boolean;
  onDraftChange: (updater: (current: ManagedUserRecord) => ManagedUserRecord) => void;
  onApplyRolePermissions: (role: 'super_admin' | 'admin' | 'cashier') => void;
}) {
  const disableReasonLabel = selectedDraftDisableProtection === 'super_admin'
    ? 'سوبر أدمن'
    : selectedDraftDisableProtection === 'current_user'
      ? 'الحساب الحالي'
      : selectedDraftDisableProtection === 'last_active_privileged'
        ? 'آخر حساب إداري فعّال'
        : '';

  return (
    <>
      <div className="card-surface" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
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
        <Field label="مستوى النظام الأساسي (Role)">
          <select value={draft.role} onChange={(e) => onApplyRolePermissions(e.target.value === 'super_admin' ? 'super_admin' : e.target.value === 'admin' ? 'admin' : 'cashier')} disabled={currentUserRole !== 'super_admin' || draft.role === 'super_admin'}>
            <option value="cashier">كاشير (مستخدم عادي)</option>
            <option value="admin">مدير نظام (مشرف)</option>
            {currentUserRole === 'super_admin' ? <option value="super_admin">سوبر ادمن (صلاحيات كاملة)</option> : null}
          </select>
        </Field>
        <div className="muted small" style={{ gridColumn: '1 / -1', marginTop: -6 }}>استخدم قوالب الصلاحيات (محاسب، مدير مخزن، إلخ) لتخصيص الصلاحيات الدقيقة.</div>
        <Field label="كلمة المرور الجديدة / الأولى"><input type="text" className="secure-password-field" value={draft.password || ''} onChange={(e) => onDraftChange((current) => ({ ...current, password: e.target.value }))} placeholder={draft.id ? 'اتركها فارغة إن لم ترد التغيير' : 'مطلوبة للمستخدم الجديد'} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} /></Field>
        <div className="muted small" style={{ gridColumn: '1 / -1', marginTop: -6 }}>{PASSWORD_MIN_LENGTH_HINT}</div>
        {!SINGLE_STORE_MODE ? <Field label="الفرع الافتراضي">
          <select value={draft.defaultBranchId} onChange={(e) => onDraftChange((current) => ({ ...current, defaultBranchId: e.target.value }))}>
            <option value="">بدون افتراضي</option>
            {branches.filter((branch) => draft.branchIds.includes(branch.id)).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </Field> : null}
        <div className="field">
          <span>الحالة</span>
          <div className="actions compact-actions">
            <label>
              <input
                type="checkbox"
                checked={draft.isActive !== false}
                disabled={!canDirectlyDisableSelected && draft.isActive !== false}
                onChange={(e) => onDraftChange((current) => ({ ...current, isActive: e.target.checked }))}
              /> نشط
            </label>
            <label><input type="checkbox" checked={draft.mustChangePassword === true} onChange={(e) => onDraftChange((current) => ({ ...current, mustChangePassword: e.target.checked }))} /> يجب تغيير كلمة المرور</label>
          </div>
          {!canDirectlyDisableSelected ? <div className="muted small">لا يمكن إيقاف هذا الحساب مباشرة: {disableReasonLabel}.</div> : null}
        </div>
      </div>
    </>
  );
}
