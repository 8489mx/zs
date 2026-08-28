import type { Branch } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { PASSWORD_MIN_LENGTH_HINT } from '@/config/security';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { formatDateTime } from '@/features/settings/components/user-management.shared';

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '38px',
  minHeight: '38px',
  padding: '0 12px',
  fontSize: '0.86rem',
  fontWeight: 600,
  color: '#0f172a',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '4px',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Sleek Identity Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '6px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.9rem',
          }}>
            {(draft.name || draft.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
              {draft.name || draft.username || 'مستخدم جديد'}
            </strong>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {draft.id ? `آخر دخول: ${formatDateTime(draft.lastLoginAt)}` : 'جاري إنشاء حساب جديد'}
              {isCurrentUserSelected ? ' · (حسابك الحالي)' : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '12px',
            background: draft.isActive !== false ? '#dcfce7' : '#fee2e2',
            color: draft.isActive !== false ? '#166534' : '#991b1b',
            border: `1px solid ${draft.isActive !== false ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {draft.isActive !== false ? 'نشط ومفعّل' : 'حساب موقوف'}
          </span>
        </div>
      </div>

      {/* Main 3-Column Compact Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        <div>
          <label style={labelStyle}>اسم المستخدم (Login ID)</label>
          <input
            style={inputStyle}
            value={draft.username}
            onChange={(e) => onDraftChange((current) => ({ ...current, username: e.target.value }))}
            placeholder="مثال: ahmed_pos"
          />
        </div>

        <div>
          <label style={labelStyle}>الاسم المعروض (Display Name)</label>
          <input
            style={inputStyle}
            value={draft.name}
            onChange={(e) => onDraftChange((current) => ({ ...current, name: e.target.value }))}
            placeholder="مثال: أحمد محمد (كاشير)"
          />
        </div>

        <div>
          <label style={labelStyle}>مستوى النظام الأساسي (Role)</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer', paddingInlineEnd: '28px' }}
            value={draft.role}
            onChange={(e) => onApplyRolePermissions(e.target.value === 'super_admin' ? 'super_admin' : e.target.value === 'admin' ? 'admin' : 'cashier')}
            disabled={currentUserRole !== 'super_admin' && draft.role === 'super_admin'}
          >
            <option value="cashier">كاشير (مستخدم مبيعات وتشغيل)</option>
            <option value="admin">مدير / مالك المنشأة (كامل صلاحيات المنشأة)</option>
            {currentUserRole === 'super_admin' ? <option value="super_admin">سوبر أدمن (إدارة المنصة المركزية)</option> : null}
          </select>
        </div>

        <div>
          <label style={labelStyle}>كلمة المرور الجديدة / الأولى</label>
          <input
            type="text"
            className="secure-password-field"
            style={inputStyle}
            value={draft.password || ''}
            onChange={(e) => onDraftChange((current) => ({ ...current, password: e.target.value }))}
            placeholder={draft.id ? 'اتركها فارغة إن لم ترد التغيير' : 'مطلوبة للمستخدم الجديد'}
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
            {PASSWORD_MIN_LENGTH_HINT}
          </span>
        </div>

        {!SINGLE_STORE_MODE ? (
          <div>
            <label style={labelStyle}>الفرع الافتراضي</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer', paddingInlineEnd: '28px' }}
              value={draft.defaultBranchId}
              onChange={(e) => onDraftChange((current) => ({ ...current, defaultBranchId: e.target.value }))}
            >
              <option value="">بدون افتراضي</option>
              {branches.filter((branch) => draft.branchIds.includes(branch.id)).map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div />
        )}

        <div>
          <label style={labelStyle}>حالة الحساب والأمان</label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            height: '38px',
            padding: '0 10px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxSizing: 'border-box',
          }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={draft.isActive !== false}
                disabled={!canDirectlyDisableSelected && draft.isActive !== false}
                onChange={(e) => onDraftChange((current) => ({ ...current, isActive: e.target.checked }))}
                style={{ accentColor: '#0f172a', width: '16px', height: '16px', margin: 0 }}
              />
              <span>نشط</span>
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={draft.mustChangePassword === true}
                onChange={(e) => onDraftChange((current) => ({ ...current, mustChangePassword: e.target.checked }))}
                style={{ accentColor: '#0f172a', width: '16px', height: '16px', margin: 0 }}
              />
              <span>تغيير كلمة المرور</span>
            </label>
          </div>
          {!canDirectlyDisableSelected ? (
            <span style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px', display: 'block' }}>
              لا يمكن إيقافه: {disableReasonLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

