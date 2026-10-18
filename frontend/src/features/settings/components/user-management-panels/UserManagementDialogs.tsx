import { useTranslation } from 'react-i18next';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import type { UserBulkAction } from '@/features/settings/hooks/useUserManagementController';

export function UserDeleteDialog({ open, draft, isBusy, onCancel, onConfirm }: { open: boolean; draft: ManagedUserRecord; isBusy: boolean; onCancel: () => void; onConfirm: (payload: { managerPin: string }) => void; }) {
  const { t } = useTranslation();
  return (
    <ActionConfirmDialog
      open={open}
      title={t('settings.user_management_panels.user_management_dialogs.s0', "حذف المستخدم")}
      description={(<div className="page-stack" style={{ gap: 8 }}><span>{t('settings.user_management_panels.user_management_dialogs.s1', "سيتم حذف المستخدم المحدد وإنهاء جلساته النشطة فورًا.")}</span><strong>{draft.name || draft.username || t('settings.user_management_panels.user_management_dialogs.s2', "المستخدم المحدد")}</strong></div>)}
      confirmLabel={t('settings.user_management_panels.user_management_dialogs.s3', "حذف المستخدم")}
      confirmVariant="danger"
      managerPinRequired
      managerPinLabel={t('settings.user_management_panels.user_management_dialogs.s4', "كلمة مرور حسابك للتأكيد")}
      managerPinPlaceholder={t('settings.user_management_panels.user_management_dialogs.s5', "أدخل كلمة المرور الحالية")}
      managerPinInputType="password"
      managerPinHint={t('settings.user_management_panels.user_management_dialogs.s6', "هذه العملية تتطلب كلمة مرور حسابك الحالي للتحقق الأمني.")}
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function UserBulkActionDialog({
  open,
  action,
  selectedUsers,
  disableBulkSummary,
  isBusy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  action: UserBulkAction | null;
  selectedUsers: ManagedUserRecord[];
  disableBulkSummary?: {
    selectedCount: number;
    disableEligibleCount: number;
    protectedCount: number;
    canRunDisable: boolean;
    reasonSummaries: string[];
    helperText: string;
  };
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const actionConfig = action === 'unlock'
    ? { title: 'فتح قفل المستخدمين المحددين', confirmLabel: 'فتح القفل', confirmVariant: 'secondary' as const, description: 'سيتم تصفير محاولات الدخول الفاشلة وإزالة حالة القفل للحسابات المحددة.' }
    : action === 'require-password-change'
      ? { title: 'فرض تغيير كلمة المرور', confirmLabel: 'فرض التغيير', confirmVariant: 'primary' as const, description: 'سيتم تعليم الحسابات المحددة بحيث يُطلب منها تغيير كلمة المرور عند الدخول التالي.' }
      : { title: 'إيقاف المستخدمين المحددين', confirmLabel: 'إيقاف المحدد', confirmVariant: 'danger' as const, description: 'يمكن إيقاف الكاشير والأدمن العادي. لا يمكن إيقاف السوبر أدمن أو الحساب الحالي أو آخر حساب إداري فعّال.' };

  return (
    <ActionConfirmDialog
      open={open}
      title={actionConfig.title}
      description={(
        <div className="page-stack" style={{ gap: 8 }}>
          <span>{actionConfig.description}</span>
          {action === 'deactivate' && disableBulkSummary ? (
            <>
              <strong>{t('settings.user_management_panels.user_management_dialogs.s7', "عدد المستخدمين القابلين للإيقاف:")} {disableBulkSummary.disableEligibleCount}</strong>
              <strong>{t('settings.user_management_panels.user_management_dialogs.s8', "عدد الحسابات المحمية التي سيتم تخطيها:")} {disableBulkSummary.protectedCount}</strong>
              {disableBulkSummary.reasonSummaries.length ? <div className="muted small">{t('settings.user_management_panels.user_management_dialogs.s9', "الأسباب:")} {disableBulkSummary.reasonSummaries.join(t('settings.user_management_panels.user_management_dialogs.s10', "، "))}</div> : null}
            </>
          ) : (
            <strong>{t('settings.user_management_panels.user_management_dialogs.s11', "عدد الحسابات المحددة:")} {selectedUsers.length}</strong>
          )}
          <div className="muted small">{selectedUsers.slice(0, 5).map((user) => user.username).join(t('settings.user_management_panels.user_management_dialogs.s12', "، "))}{selectedUsers.length > 5 ? ' …' : ''}</div>
        </div>
      )}
      confirmLabel={actionConfig.confirmLabel}
      confirmVariant={actionConfig.confirmVariant}
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
