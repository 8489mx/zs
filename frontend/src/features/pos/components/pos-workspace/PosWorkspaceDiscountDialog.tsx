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
      title="ط§ط¹طھظ…ط§ط¯ ط®طµظ… ط§ظ„ظپط§طھظˆط±ط©"
      description="ط£ط¯ط®ظ„ ط±ظ…ط² ط§ظ„ظ…ط¯ظٹط± ط£ظˆ ظƒظ„ظ…ط© ظ…ط±ظˆط± ط­ط³ط§ط¨ ط§ظ„ظ…ط¯ظٹط± ظ„ظپطھط­ ط§ظ„ط®طµظ… ظ„ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط© ظپظ‚ط·. ط³ظٹطھظ… ظ‚ظپظ„ ط§ظ„ط®طµظ… طھظ„ظ‚ط§ط¦ظٹظ‹ط§ ظ…ط¹ ط£ظٹ ظپط§طھظˆط±ط© ط¬ط¯ظٹط¯ط©."
      confirmLabel="ط§ط¹طھظ…ط§ط¯ ط§ظ„ط®طµظ…"
      confirmVariant="primary"
      managerPinRequired
      managerPinLabel="ط±ظ…ط² ط§ظ„ظ…ط¯ظٹط± ط£ظˆ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±"
      managerPinHint="ط³ظٹطھظ… ط¥ط®ظپط§ط، ط§ظ„ظ‚ظٹظ…ط© ط£ط«ظ†ط§ط، ط§ظ„ظƒطھط§ط¨ط©طŒ ظˆظ„ظ† ظٹط¸ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯ ظ…ظپطھظˆط­ظ‹ط§ ط¥ظ„ط§ ظ„ظ„ظپظˆط§طھظٹط± ط§ظ„ط­ط§ظ„ظٹط© ظپظ‚ط·."
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
          pos.setSubmitMessage('?? ?????? ????? ???? ???????? ???.');
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
