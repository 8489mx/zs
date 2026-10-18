import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/shared/components/dialog-shell';
import { NewProductForm } from '@/features/products/components/NewProductForm';
import type { Product } from '@/types/domain';

type SimpleOption = { id: string; name: string };

type Props = {
  isOpen: boolean;
  initialName?: string;
  initialBarcode?: string;
  categories?: SimpleOption[];
  suppliers?: SimpleOption[];
  warehouses?: SimpleOption[];
  onClose: () => void;
  onSuccess: (product: Product | any) => void;
};

export function PurchaseProductQuickCreateModal({
  isOpen,
  initialName = '',
  initialBarcode = '',
  onClose,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(960px, 95vw)"
      ariaLabel={t('purchases.purchase_product_quick_create_modal.s0', "إضافة صنف جديد للفاتورة")}
    >
      <div style={{ padding: '8px 12px', overflowY: 'auto', maxHeight: '90vh' }}>
        <NewProductForm
          mode="modal"
          modalTitle={t('purchases.purchase_product_quick_create_modal.s1', "إضافة صنف جديد سريعاً إلى الفاتورة")}
          submitLabel={t('purchases.purchase_product_quick_create_modal.s2', "حفظ وإضافة للفاتورة")}
          initialName={initialName}
          initialBarcode={initialBarcode}
          onCancel={onClose}
          onSuccess={(product) => {
            onSuccess(product);
          }}
        />
      </div>
    </DialogShell>
  );
}

