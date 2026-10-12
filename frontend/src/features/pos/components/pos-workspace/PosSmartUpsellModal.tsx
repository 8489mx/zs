import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { PlusCircleIcon, LayersIcon, XIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import type { RestaurantUpsellRule } from '@/features/pos/api/restaurant-advanced-fnb.api';
import type { Product } from '@/types/domain';

interface PosSmartUpsellModalProps {
  open: boolean;
  onClose: () => void;
  triggerItemName?: string;
  recommendations: RestaurantUpsellRule[];
  allProducts?: Product[];
  onAddUpsellItem?: (product: Product, discountAmount?: number) => void;
  onAcceptUpsell?: (product: any) => void;
}

export function PosSmartUpsellModal({
  open,
  onClose,
  triggerItemName = '',
  recommendations,
  allProducts = [],
  onAddUpsellItem,
  onAcceptUpsell,
}: PosSmartUpsellModalProps) {
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  if (!open || recommendations.length === 0) return null;

  const handleAdd = (rule: RestaurantUpsellRule) => {
    const matchedProduct = (allProducts || []).find(
      (p) => String(p.id) === String(rule.suggested_product_id),
    );
    if (matchedProduct && onAddUpsellItem) {
      onAddUpsellItem(matchedProduct, Number(rule.discount_amount || 0));
      setAddedIds((prev) => new Set([...prev, rule.id]));
    } else if (onAcceptUpsell) {
      onAcceptUpsell(matchedProduct || { id: rule.suggested_product_id, name: rule.suggested_product_name, price: 0 });
      setAddedIds((prev) => new Set([...prev, rule.id]));
    }
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(600px, calc(100vw - 32px))"
      zIndex={95}
      ariaLabel="ترقية الوجبة واقتراحات المبيعات"
    >
      <div
        dir="rtl"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LayersIcon size={20} color="#170e5e" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                ترقية الطلب واقتراحات مكملة (Upsell)
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                اقتراحات موصى بها تناسب طبق <strong style={{ color: '#170e5e' }}>{triggerItemName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
            }}
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body Items List */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recommendations.map((rule) => {
            const isAdded = addedIds.has(rule.id);
            const matchedProduct = allProducts.find(
              (p) => String(p.id) === String(rule.suggested_product_id),
            );
            const originalPrice = Number(matchedProduct?.retailPrice || 0);
            const discount = Number(rule.discount_amount || 0);
            const finalPrice = Math.max(0, originalPrice - discount);

            return (
              <div
                key={rule.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: isAdded ? '#f0fdf4' : '#ffffff',
                  border: `1.5px solid ${isAdded ? '#86efac' : '#e2e8f0'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    {rule.suggested_product_name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    {rule.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {discount > 0 && originalPrice > 0 && (
                      <span style={{ fontSize: '11.5px', textDecoration: 'line-through', color: '#94a3b8' }}>
                        {formatCurrency(originalPrice)}
                      </span>
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                      {originalPrice > 0 ? formatCurrency(finalPrice) : 'إضافة مباشرة'}
                    </span>
                    {discount > 0 && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        وفر {formatCurrency(discount)}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant={isAdded ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleAdd(rule)}
                  disabled={isAdded}
                  style={{
                    backgroundColor: isAdded ? '#ffffff' : '#170e5e',
                    color: isAdded ? '#166534' : '#ffffff',
                    border: isAdded ? '1px solid #86efac' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    padding: '6px 14px',
                  }}
                >
                  {isAdded ? (
                    <>
                      <CheckCircleIcon size={14} color="#166534" />
                      تمت الإضافة
                    </>
                  ) : (
                    <>
                      <PlusCircleIcon size={14} color="#ffffff" />
                      إضافة للسلة
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="secondary"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: '#170e5e',
              color: '#ffffff',
            }}
          >
            متابعة الطلب
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
