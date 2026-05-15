import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import type { PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

interface PosWorkspaceDiscountDialogProps {
  open: boolean;
  pos: PosWorkspaceState;
  onClose: () => void;
  onFocusBarcodeEntry: () => void;
}

export function PosWorkspaceDiscountDialog({
  open,
  pos,
  onClose,
  onFocusBarcodeEntry,
}: PosWorkspaceDiscountDialogProps) {
  return (
    <ActionConfirmDialog
      open={open}
      title="اعتماد خصم الفاتورة"
      description="أدخل رمز المدير أو كلمة مرور حساب المدير لفتح الخصم لهذه الفاتورة فقط. سيتم قفل الخصم تلقائيًا مع أي فاتورة جديدة."
      confirmLabel="اعتماد الخصم"
      confirmVariant="primary"
      managerPinRequired
      managerPinLabel="رمز المدير أو كلمة المرور"
      managerPinHint="سيتم إخفاء القيمة أثناء الكتابة، ولن يظل الاعتماد مفتوحًا إلا للفواتير الحالية فقط."
      isBusy={Boolean(pos.discountAuthorizationMutation.isPending)}
      onCancel={() => {
        pos.setDiscountApprovalSecret('');
        onClose();
      }}
      onConfirm={async ({ managerPin }) => {
        try {
          await pos.discountAuthorizationMutation.mutateAsync(managerPin);
          pos.setDiscountApprovalGranted(true);
          pos.setDiscountApprovalSecret(managerPin);
          pos.setSubmitMessage('تم اعتماد الخصم لهذه الفاتورة فقط.');
          onClose();
          onFocusBarcodeEntry();
        } catch (error) {
          pos.setDiscountApprovalSecret('');
          throw error;
        }
      }}
    />
  );
}
