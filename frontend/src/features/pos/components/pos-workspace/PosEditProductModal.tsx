import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/shared/components/dialog-shell';
import { EditProductForm } from '@/features/products/components/EditProductForm';
import type { Product } from '@/types/domain';

export interface PosEditProductModalProps {
  isOpen: boolean;
  productId: string | null;
  initialProduct?: Product | null;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

export function PosEditProductModal({
  isOpen,
  productId,
  initialProduct,
  onClose,
  onSuccess,
}: PosEditProductModalProps) {
  const { t } = useTranslation();
  if (!isOpen || !productId) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(1060px, 95vw)"
      ariaLabel={t('pos.pos_workspace.pos_edit_product_modal.s0', "تعديل بيانات الصنف")}
    >
      <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '90vh', boxSizing: 'border-box' }}>
        <EditProductForm
          productId={productId}
          initialProduct={initialProduct || undefined}
          mode="modal"
          onCancel={onClose}
          onSuccess={(product) => {
            onSuccess(product);
          }}
        />
      </div>
    </DialogShell>
  );
}


