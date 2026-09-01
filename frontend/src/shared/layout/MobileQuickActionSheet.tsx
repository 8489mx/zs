import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DialogShell } from '@/shared/components/dialog-shell';
import { QuickProductModal } from '@/shared/components/QuickProductModal';
import { PriceStockCheckerModal } from '@/shared/components/PriceStockCheckerModal';
import { triggerHaptic } from '@/shared/utils/haptics';

interface MobileQuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileQuickActionSheet({ isOpen, onClose }: MobileQuickActionSheetProps) {
  const navigate = useNavigate();
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [priceCheckerOpen, setPriceCheckerOpen] = useState(false);

  const handleAction = (callback: () => void) => {
    triggerHaptic('selection');
    onClose();
    callback();
  };

  return (
    <>
      <DialogShell
        open={isOpen}
        onClose={onClose}
        width="min(440px, 94vw)"
        shellClassName="mobile-quick-action-dialog"
      >
        <div className="mobile-quick-action-sheet">
          <div className="mobile-quick-action-header">
            <div className="mobile-quick-action-handle" />
            <h3 className="mobile-quick-action-title">إجراءات سريعة</h3>
            <p className="mobile-quick-action-sub">اختر الإجراء الذي تريد تنفيذه فوراً</p>
          </div>

          <div className="mobile-quick-action-grid">
            <button
              type="button"
              className="mobile-quick-action-btn action-pos"
              onClick={() => handleAction(() => navigate('/pos'))}
            >
              <div className="mobile-quick-action-icon pos-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h16v10H4V5zM8 19h8M10 15v4M14 15v4" />
                </svg>
              </div>
              <div className="mobile-quick-action-text">
                <strong>نقطة البيع (POS)</strong>
                <span>كاشير وبيع مباشر سريع</span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-action-btn action-checker"
              onClick={() => {
                triggerHaptic('medium');
                onClose();
                setPriceCheckerOpen(true);
              }}
            >
              <div className="mobile-quick-action-icon checker-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
              </div>
              <div className="mobile-quick-action-text">
                <strong>فاحص الأسعار والمخزون</strong>
                <span>مسح باركود ومعاينة الرصيد</span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-action-btn action-product"
              onClick={() => {
                onClose();
                setQuickProductOpen(true);
              }}
            >
              <div className="mobile-quick-action-icon product-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              <div className="mobile-quick-action-text">
                <strong>إضافة صنف جديد</strong>
                <span>تسجيل صنف أو خدمة فوراً</span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-action-btn action-purchase"
              onClick={() => handleAction(() => navigate('/purchases/new'))}
            >
              <div className="mobile-quick-action-icon purchase-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 3h3l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L22 6H6" />
                </svg>
              </div>
              <div className="mobile-quick-action-text">
                <strong>فاتورة شراء جديدة</strong>
                <span>إدخال بضاعة من مورد</span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-action-btn action-customer"
              onClick={() => handleAction(() => navigate('/customers?action=new'))}
            >
              <div className="mobile-quick-action-icon customer-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div className="mobile-quick-action-text">
                <strong>إضافة عميل جديد</strong>
                <span>تسجيل بيانات العميل وهاتفه</span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-action-btn action-treasury"
              onClick={() => handleAction(() => navigate('/treasury'))}
            >
              <div className="mobile-quick-action-icon treasury-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <div className="mobile-quick-action-text">
                <strong>الخزينة والمصروفات</strong>
                <span>سند قبض أو تسجيل مصروف</span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-action-btn action-inventory"
              onClick={() => handleAction(() => navigate('/inventory'))}
            >
              <div className="mobile-quick-action-icon inventory-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
                </svg>
              </div>
              <div className="mobile-quick-action-text">
                <strong>حركات المخزون والجرد</strong>
                <span>مطابقة الأرصدة وتتبع الأصناف</span>
              </div>
            </button>
          </div>
        </div>
      </DialogShell>

      {quickProductOpen && (
        <QuickProductModal
          isOpen={quickProductOpen}
          onClose={() => setQuickProductOpen(false)}
          itemType="product"
          onSuccess={() => {
            setQuickProductOpen(false);
          }}
        />
      )}

      {priceCheckerOpen && (
        <PriceStockCheckerModal
          isOpen={priceCheckerOpen}
          onClose={() => setPriceCheckerOpen(false)}
        />
      )}
    </>
  );
}
