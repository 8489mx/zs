import { useTranslation } from 'react-i18next';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

interface PosWorkspaceWholesaleDialogProps {
  open: boolean;
  pos: PosWorkspaceState;
  onClose: () => void;
  onFocusBarcodeEntry: () => void;
}

export function PosWorkspaceWholesaleDialog({
  open,
  pos,
  onClose,
  onFocusBarcodeEntry,
}: PosWorkspaceWholesaleDialogProps) {
  const { t } = useTranslation();
  return (
    <ActionConfirmDialog
      open={open}
      title={t('pos.pos_workspace.pos_workspace_wholesale_dialog.s0', "اعتماد البيع بسعر الجملة")}
      description={t('pos.pos_workspace.pos_workspace_wholesale_dialog.s1', "أدخل رمز المدير أو كلمة مرور حساب المدير أو السوبر أدمن لتفعيل سعر الجملة للكاشير لهذه الفاتورة فقط.")}
      confirmLabel={t('pos.pos_workspace.pos_workspace_wholesale_dialog.s2', "اعتماد سعر الجملة")}
      confirmVariant="primary"
      managerPinRequired
      managerPinLabel={t('pos.pos_workspace.pos_workspace_wholesale_dialog.s3', "رمز المدير أو كلمة المرور")}
      managerPinHint={t('pos.pos_workspace.pos_workspace_wholesale_dialog.s4', "سيتم التحقق من PIN المدير أو كلمة مرور حساب الأدمن / السوبر أدمن لتفعيل سعر الجملة.")}
      isBusy={Boolean(pos.discountAuthorizationMutation.isPending)}
      onCancel={() => {
        pos.setWholesaleApprovalSecret('');
        onClose();
      }}
      onConfirm={async ({ managerPin }) => {
        try {
          await pos.discountAuthorizationMutation.mutateAsync(managerPin);
          pos.setWholesaleApprovalGranted(true);
          pos.setWholesaleApprovalSecret(managerPin);
          pos.setPriceType('wholesale');
          pos.setSubmitMessage(t('pos.pos_workspace.pos_workspace_wholesale_dialog.s5', "تم اعتماد سعر الجملة لهذه الفاتورة."));
          onClose();
          onFocusBarcodeEntry();
        } catch (error) {
          pos.setWholesaleApprovalSecret('');
          throw error;
        }
      }}
    />
  );
}
