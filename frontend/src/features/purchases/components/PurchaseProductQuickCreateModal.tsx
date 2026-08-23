import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="dialog-overlay purchase-new-product-modal-overlay"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="dialog-shell purchase-new-product-dialog-shell"
        role="dialog"
        aria-modal="true"
        aria-label="إضافة صنف جديد للفاتورة"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          <NewProductForm
            mode="modal"
            modalTitle="إضافة صنف جديد سريعاً إلى الفاتورة"
            submitLabel="حفظ وإضافة للفاتورة"
            initialName={initialName}
            initialBarcode={initialBarcode}
            onCancel={onClose}
            onSuccess={(product) => {
              onSuccess(product);
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
