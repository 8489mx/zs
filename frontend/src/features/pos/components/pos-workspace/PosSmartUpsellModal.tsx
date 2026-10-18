import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { PlusCircleIcon, LayersIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
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
  onBack?: () => void;
}

export function PosSmartUpsellModal({
  open,
  onClose,
  triggerItemName = '',
  recommendations,
  allProducts = [],
  onAddUpsellItem,
  onAcceptUpsell,
  onBack,
}: PosSmartUpsellModalProps) {
  const { t } = useTranslation();
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
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      onBack={onBack}
      backText={t('pos.pos_workspace.pos_smart_upsell_modal.s0', "الرجوع لعمليات المطعم")}
      title={t('pos.pos_workspace.pos_smart_upsell_modal.s1', "ترقية الطلب واقتراحات مكملة (Upsell & Cross-Sell)")}
      subtitle={`اقتراحات موصى بها تناسب طبق: ${triggerItemName || t('pos.pos_workspace.pos_smart_upsell_modal.s2', "الوجبة الحالية")}`}
      footerNote={t('pos.pos_workspace.pos_smart_upsell_modal.s3', "الاقتراحات تعتمد على الأصناف الموجودة في سلة العميل حالياً")}
      icon={<LayersIcon size={18} color="#170e5e" />}
      footerActions={
        <Button
          variant="secondary"
          onClick={onClose}
          style={{
            padding: '6px 18px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: '#170e5e',
            color: '#ffffff',
          }}
        >
          {t('pos.pos_workspace.pos_smart_upsell_modal.s4', "متابعة الطلب")}
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

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
                      {originalPrice > 0 ? formatCurrency(finalPrice) : t('pos.pos_workspace.pos_smart_upsell_modal.s5', "إضافة مباشرة")}
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
                        {t('pos.pos_workspace.pos_smart_upsell_modal.s6', "وفر")} {formatCurrency(discount)}
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
                      {t('pos.pos_workspace.pos_smart_upsell_modal.s7', "تمت الإضافة")}
                    </>
                  ) : (
                    <>
                      <PlusCircleIcon size={14} color="#ffffff" />
                      {t('pos.pos_workspace.pos_smart_upsell_modal.s8', "إضافة للسلة")}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

      </div>
    </RestaurantOperationsDialog>
  );
}
