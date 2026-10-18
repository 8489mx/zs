import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const transferCount = action?.transfers.length || 0;
  const firstTransfer = action?.transfers[0] || null;
  const title = action?.action === 'receive' ? 'تأكيد استلام التحويل' : action?.action === 'cancel' ? 'تأكيد إلغاء التحويل' : '';
  const description = action
    ? action.action === 'receive'
      ? <>{t('inventory.inventory_workspace_dialogs.s0', "سيتم اعتماد استلام")} {transferCount > 1 ? <>{t('inventory.inventory_workspace_dialogs.s1', "عدد")} <strong>{transferCount}</strong> {t('inventory.inventory_workspace_dialogs.s2', "من التحويلات المحددة")}</> : <>{t('inventory.inventory_workspace_dialogs.s3', "التحويل")} <strong>{firstTransfer?.docNo || firstTransfer?.id}</strong></>} {t('inventory.inventory_workspace_dialogs.s4', "ونقل الكميات إلى المواقع الهدف. راجع البنود والجهات قبل المتابعة.")}</>
      : <>{t('inventory.inventory_workspace_dialogs.s5', "سيتم إلغاء")} {transferCount > 1 ? <>{t('inventory.inventory_workspace_dialogs.s6', "عدد")} <strong>{transferCount}</strong> {t('inventory.inventory_workspace_dialogs.s7', "من التحويلات المحددة")}</> : <>{t('inventory.inventory_workspace_dialogs.s8', "التحويل")} <strong>{firstTransfer?.docNo || firstTransfer?.id}</strong></>} {t('inventory.inventory_workspace_dialogs.s9', "ولن تصبح قابلة للاستلام لاحقًا. استخدم هذا الإجراء فقط إذا كانت التحويلات غير صالحة.")}</>
    : '';

  return (
    <ActionConfirmDialog
      open={Boolean(action)}
      title={title}
      description={description}
      confirmLabel={action?.action === 'receive' ? t('inventory.inventory_workspace_dialogs.s10', "تأكيد الاستلام") : t('inventory.inventory_workspace_dialogs.s11', "تأكيد الإلغاء")}
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
  onConfirm: (context: { managerPin: string }) => void;
}) {
  const { t } = useTranslation();
  return (
    <ActionConfirmDialog
      open={Boolean(sessions.length)}
      title={t('inventory.inventory_workspace_dialogs.s12', "تأكيد اعتماد وترحيل جلسة الجرد")}
      description={sessions.length ? (sessions.length === 1 ? <>{t('inventory.inventory_workspace_dialogs.s13', "سيتم اعتماد الجلسة")} <strong>{sessions[0].docNo || sessions[0].id}</strong> {t('inventory.inventory_workspace_dialogs.s14', "وتسجيل فروقاتها على المخزون بشكل نهائي.")}</> : <>{t('inventory.inventory_workspace_dialogs.s15', "سيتم اعتماد")} <strong>{sessions.length}</strong> {t('inventory.inventory_workspace_dialogs.s16', "جلسات جرد محددة وتسجيل فروقاتها على المخزون بشكل نهائي.")}</>) : ''}
      confirmLabel={t('inventory.inventory_workspace_dialogs.s17', "اعتماد الجلسة")}
      confirmVariant="primary"
      managerPinRequired={true}
      managerPinLabel={t('inventory.inventory_workspace_dialogs.s18', "كود اعتماد المشرف")}
      managerPinHint={t('inventory.inventory_workspace_dialogs.s19', "أدخل الرقم السري للمشرف لاعتماد الجلسة وتسوية الأرصدة.")}
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={({ managerPin }) => onConfirm({ managerPin })}
    />
  );
}
