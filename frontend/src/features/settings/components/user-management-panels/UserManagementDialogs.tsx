import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import type { UserBulkAction } from '@/features/settings/hooks/useUserManagementController';

export function UserDeleteDialog({ open, draft, isBusy, onCancel, onConfirm }: { open: boolean; draft: ManagedUserRecord; isBusy: boolean; onCancel: () => void; onConfirm: () => void; }) {
  return (
    <ActionConfirmDialog
      open={open}
      title="حذف المستخدم"
      description={(<div className="page-stack" style={{ gap: 8 }}><span>سيتم حذف المستخدم المحدد وإنهاء جلساته النشطة فورًا.</span><strong>{draft.name || draft.username || 'المستخدم المحدد'}</strong></div>)}
      confirmLabel="حذف المستخدم"
      confirmVariant="danger"
      confirmationKeyword={draft.username || 'حذف'}
      confirmationLabel="اكتب اسم المستخدم لتأكيد الحذف"
      confirmationHint="هذا الإجراء لا يمكن التراجع عنه من هذه الشاشة."
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function UserBulkActionDialog({ open, action, selectedUsers, isBusy, onCancel, onConfirm }: { open: boolean; action: UserBulkAction | null; selectedUsers: ManagedUserRecord[]; isBusy: boolean; onCancel: () => void; onConfirm: () => void; }) {
  const actionConfig = action === 'unlock'
    ? { title: 'فتح قفل المستخدمين المحددين', confirmLabel: 'فتح القفل', confirmVariant: 'secondary' as const, confirmationKeyword: 'UNLOCK', confirmationLabel: 'اكتب UNLOCK لتأكيد فتح القفل', description: 'سيتم تصفير محاولات الدخول الفاشلة وإزالة حالة القفل للحسابات المحددة.' }
    : action === 'require-password-change'
      ? { title: 'فرض تغيير كلمة المرور', confirmLabel: 'فرض التغيير', confirmVariant: 'primary' as const, confirmationKeyword: 'FORCE', confirmationLabel: 'اكتب FORCE لتأكيد فرض التغيير', description: 'سيتم تعليم الحسابات المحددة بحيث يُطلب منها تغيير كلمة المرور عند الدخول التالي.' }
      : { title: 'إيقاف المستخدمين المحددين', confirmLabel: 'إيقاف المحدد', confirmVariant: 'danger' as const, confirmationKeyword: 'DISABLE', confirmationLabel: 'اكتب DISABLE لتأكيد إيقاف المحدد', description: 'سيتم إيقاف الحسابات التشغيلية المحددة. الحسابات الإدارية الحرجة والحساب الحالي ستُتجاوز تلقائيًا حمايةً للنظام.' };

  return (
    <ActionConfirmDialog
      open={open}
      title={actionConfig.title}
      description={(<div className="page-stack" style={{ gap: 8 }}><span>{actionConfig.description}</span><strong>عدد الحسابات المحددة: {selectedUsers.length}</strong><div className="muted small">{selectedUsers.slice(0, 5).map((user) => user.username).join('، ')}{selectedUsers.length > 5 ? ' …' : ''}</div></div>)}
      confirmLabel={actionConfig.confirmLabel}
      confirmVariant={actionConfig.confirmVariant}
      confirmationKeyword={actionConfig.confirmationKeyword}
      confirmationLabel={actionConfig.confirmationLabel}
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
