import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import type { StockCountSession, StockTransfer } from '@/types/domain';

export function InventoryTransferActionDialog({
  action,
  isBusy,
  onCancel,
  onConfirm
}: {
  action: { action: 'receive' | 'cancel'; transfers: StockTransfer[] } | null;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const transferCount = action?.transfers.length || 0;
  const firstTransfer = action?.transfers[0] || null;
  const title = action?.action === 'receive' ? 'تأكيد استلام التحويل' : action?.action === 'cancel' ? 'تأكيد إلغاء التحويل' : '';
  const description = action
    ? action.action === 'receive'
      ? <>سيتم اعتماد استلام {transferCount > 1 ? <>عدد <strong>{transferCount}</strong> من التحويلات المحددة</> : <>التحويل <strong>{firstTransfer?.docNo || firstTransfer?.id}</strong></>} ونقل الكميات إلى المواقع الهدف. راجع البنود والجهات قبل المتابعة.</>
      : <>سيتم إلغاء {transferCount > 1 ? <>عدد <strong>{transferCount}</strong> من التحويلات المحددة</> : <>التحويل <strong>{firstTransfer?.docNo || firstTransfer?.id}</strong></>} ولن تصبح قابلة للاستلام لاحقًا. استخدم هذا الإجراء فقط إذا كانت التحويلات غير صالحة.</>
    : '';

  return (
    <ActionConfirmDialog
      open={Boolean(action)}
      title={title}
      description={description}
      confirmLabel={action?.action === 'receive' ? 'تأكيد الاستلام' : 'تأكيد الإلغاء'}
      confirmVariant={action?.action === 'receive' ? 'success' : 'danger'}
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function InventoryPostSessionDialog({
  sessions,
  isBusy,
  onCancel,
  onConfirm
}: {
  sessions: StockCountSession[];
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ActionConfirmDialog
      open={Boolean(sessions.length)}
      title="تأكيد اعتماد جلسة الجرد"
      description={sessions.length ? (sessions.length === 1 ? <>سيتم اعتماد الجلسة <strong>{sessions[0].docNo || sessions[0].id}</strong> وتسجيل فروقاتها على المخزون. تأكد من مراجعة البنود وإدخال كود المدير الصحيح.</> : <>سيتم اعتماد <strong>{sessions.length}</strong> جلسات جرد محددة وتسجيل فروقاتها على المخزون. تأكد من مراجعة الجلسات وإدخال كود المدير الصحيح قبل التنفيذ.</>) : ''}
      confirmLabel="اعتماد الجلسة"
      confirmVariant="primary"
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
