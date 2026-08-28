import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !productId || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="dialog-overlay pos-edit-product-modal-overlay"
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
        padding: '12px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="dialog-shell pos-edit-product-dialog-shell"
        role="dialog"
        aria-modal="true"
        aria-label="تعديل بيانات الصنف"
        style={{
          width: '94vw',
          maxWidth: '1060px',
          maxHeight: '90vh',
          backgroundColor: '#f8fafc',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          margin: 'auto',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px', boxSizing: 'border-box' }}>
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
      </div>
    </div>,
    document.body
  );
}

