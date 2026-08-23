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
  return (
    <ActionConfirmDialog
      open={open}
      title="اعتماد البيع بسعر الجملة"
      description="أدخل رمز المدير أو كلمة مرور حساب المدير أو السوبر أدمن لتفعيل سعر الجملة للكاشير لهذه الفاتورة فقط."
      confirmLabel="اعتماد سعر الجملة"
      confirmVariant="primary"
      managerPinRequired
      managerPinLabel="رمز المدير أو كلمة المرور"
      managerPinHint="سيتم التحقق من PIN المدير أو كلمة مرور حساب الأدمن / السوبر أدمن لتفعيل سعر الجملة."
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
          pos.setSubmitMessage('تم اعتماد سعر الجملة لهذه الفاتورة.');
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
