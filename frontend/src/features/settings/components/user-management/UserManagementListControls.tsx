import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { USER_ROLE_TEMPLATES } from '@/features/settings/components/user-management.shared';
import type { UserBulkAction } from '@/features/settings/hooks/useUserManagementController';

export function UserManagementQuickActions({
  setupMode,
  onNewUser,
  onApplyRolePermissions,
  onApplyTemplate,
  onCopyPermissions,
}: {
  setupMode?: boolean;
  onNewUser: () => void;
  onApplyRolePermissions: () => void;
  onApplyTemplate: (templateKey: keyof typeof USER_ROLE_TEMPLATES) => void;
  onCopyPermissions: () => void;
}) {
  return (
    <div className="actions compact-actions" style={{ marginBottom: 8 }}>
      <Button type="button" onClick={onNewUser}>{setupMode ? 'إنشاء المستخدم المطلوب' : 'مستخدم جديد'}</Button>
      {!setupMode ? <Button type="button" variant="secondary" onClick={onApplyRolePermissions}>مزامنة صلاحيات الدور</Button> : null}
      {!setupMode ? (
        <>
          <Button type="button" variant="secondary" onClick={() => onApplyTemplate('cashier')}>قالب كاشير</Button>
          <Button type="button" variant="secondary" onClick={() => onApplyTemplate('owner')}>قالب مدير</Button>
          <Button type="button" variant="secondary" onClick={() => onApplyTemplate('inventory')}>قالب مخزون</Button>
          <Button type="button" variant="secondary" onClick={() => onApplyTemplate('accountant')}>قالب محاسب</Button>
        </>
      ) : null}
      {!setupMode ? <Button type="button" variant="secondary" onClick={onCopyPermissions}>نسخ الصلاحيات</Button> : null}
    </div>
  );
}

export function UserManagementStatsFilters({
  summary,
  userSearch,
  userFilter,
  onUserSearchChange,
  onUserFilterChange,
}: {
  summary: { totalItems: number; superAdmins: number; admins: number; cashiers: number; inactive: number; locked: number; };
  userSearch: string;
  userFilter: 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked';
  onUserSearchChange: (value: string) => void;
  onUserFilterChange: (value: 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked') => void;
}) {
  return (
    <>
      <div className="stats-grid" style={{ marginBottom: 8 }}>
        <div className="stat-card"><span>الإجمالي</span><strong>{summary.totalItems}</strong></div>
        <div className="stat-card"><span>السوبر أدمن</span><strong>{summary.superAdmins}</strong></div>
        <div className="stat-card"><span>مديرو النظام</span><strong>{summary.admins}</strong></div>
        <div className="stat-card"><span>الكاشير</span><strong>{summary.cashiers}</strong></div>
        <div className="stat-card"><span>الموقوفون</span><strong>{summary.inactive}</strong></div>
      </div>
      <div className="page-stack" style={{ gap: 8, marginBottom: 8 }}>
        <Field label="بحث سريع">
          <input value={userSearch} onChange={(e) => onUserSearchChange(e.target.value)} placeholder="ابحث بالاسم أو المستخدم أو الصلاحية" />
        </Field>
        <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
          {[
            ['all', 'الكل'],
            ['super-admins', 'السوبر أدمن'],
            ['admins', 'مديرو النظام'],
            ['cashiers', 'الكاشير'],
            ['inactive', 'الموقوفون'],
            ['locked', 'المقفولون']
          ].map(([value, label]) => (
            <Button key={value} type="button" variant={userFilter === value ? 'primary' : 'secondary'} onClick={() => onUserFilterChange(value as 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked')}>
              {label}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}

export function UserManagementBulkToolbar({
  selectedIds,
  onSelectedIdsChange,
  onBulkAction,
}: {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onBulkAction: (action: UserBulkAction) => void;
}) {
  if (!selectedIds.length) return null;
  return (
    <div className="bulk-toolbar">
      <div className="bulk-toolbar-meta">
        <strong>تحديد نشط: {selectedIds.length}</strong>
        <span className="muted small">يمكنك فتح القفل للحسابات المحددة، فرض تغيير كلمة المرور، أو إيقاف الحسابات غير الإدارية دفعة واحدة.</span>
      </div>
      <div className="actions compact-actions">
        <Button type="button" variant="secondary" onClick={() => onSelectedIdsChange([])}>مسح التحديد</Button>
        <Button type="button" variant="secondary" onClick={() => onBulkAction('unlock')}>فتح القفل</Button>
        <Button type="button" variant="secondary" onClick={() => onBulkAction('require-password-change')}>فرض تغيير كلمة المرور</Button>
        <Button type="button" variant="danger" onClick={() => onBulkAction('deactivate')}>إيقاف المحدد</Button>
      </div>
    </div>
  );
}
