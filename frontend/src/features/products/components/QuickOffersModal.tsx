import { useEffect, useState } from 'react';
import { ProductOfferDialog } from './ProductOfferDialog';

export function QuickOffersModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Alt + S
      if (e.ctrlKey && e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS' || e.key === 'Ó')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <ProductOfferDialog
      open={isOpen}
      product={null}
      onClose={() => setIsOpen(false)}
    />
  );
}
