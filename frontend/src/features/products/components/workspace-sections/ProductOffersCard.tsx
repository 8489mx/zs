import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { productsApi } from '@/features/products/api/products.api';
import type { Product, ProductOffer } from '@/types/domain';
import { buildUpdatePayload, normalizeCustomerPrices, refetchAndSelectProduct, toProductFormValues } from './product-workspace.utils';
import { systemConfirm } from '@/shared/components/system-alert';

export function ProductOffersCard({ products, product, onUpdated }: { products: Product[]; product?: Product; onUpdated?: (product: Product) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [offerType, setOfferType] = useState<'percent' | 'fixed'>('percent');
  const [offerValue, setOfferValue] = useState(0);
  const [offerFrom, setOfferFrom] = useState('');
  const [offerTo, setOfferTo] = useState('');
  const [happyHourStart, setHappyHourStart] = useState('');
  const [happyHourEnd, setHappyHourEnd] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState('');

  useEffect(() => {
    setOfferType('percent');
    setOfferValue(0);
    setOfferFrom('');
    setOfferTo('');
    setHappyHourStart('');
    setHappyHourEnd('');
    setDaysOfWeek('');
  }, [product?.id]);

  const mutation = useMutation({
    mutationFn: async (offers: ProductOffer[]) => {
      if (!product) throw new Error('اختر صنفًا أولًا');
      return productsApi.update(product.id, buildUpdatePayload(toProductFormValues(product), product, normalizeProductUnits(product.units, product.barcode || ''), normalizeCustomerPrices(product), offers));
    },
    onSuccess: async () => {
      if (!product) return;
      const refreshed = await refetchAndSelectProduct(queryClient, product.id);
      if (refreshed) onUpdated?.(refreshed);
      setOfferValue(0);
      setOfferFrom('');
      setOfferTo('');
      setHappyHourStart('');
      setHappyHourEnd('');
      setDaysOfWeek('');
    }
  });

  const activeOffers = product?.offers || [];
  const allOffers = useMemo(() => products.flatMap((current) => (current.offers || []).map((offer) => ({ product: current, offer }))), [products]);

  async function addOffer() {
    if (!product) return;
    const nextValue = Number(offerValue || 0);
    if (!(nextValue > 0)) return;
    const costPrice = Number(product.costPrice || (product as any).cost_price || 0);
    const retailPrice = Number(product.retailPrice || (product as any).retail_price || 0);
    let simulatedPrice = retailPrice;
    if (retailPrice > 0) {
      if (offerType === 'percent') {
        simulatedPrice = Math.max(0, retailPrice - ((retailPrice * nextValue) / 100));
      } else if (offerType === 'fixed') {
        simulatedPrice = Math.max(0, retailPrice - nextValue);
      }
    }
    if (costPrice > 0 && simulatedPrice < costPrice) {
      const lossPerUnit = costPrice - simulatedPrice;
      const lossPercent = ((lossPerUnit / costPrice) * 100).toFixed(1);
      const confirmed = await systemConfirm({
        title: 'تنبيه: سعر العرض أقل من سعر التكلفة (بيع بالخسارة)',
        message: `سعر بيع الصنف بعد هذا العرض (${simulatedPrice.toFixed(2)} ج.م) سيكون أقل من سعر التكلفة (${costPrice.toFixed(2)} ج.م) بنسبة ${lossPercent}% (خسارة ${lossPerUnit.toFixed(2)} ج.م في القطعة).\n\nهل أنت متأكد من رغبتك في اعتماد هذا العرض بالخسارة؟ (سيتم تمرير عمليات البيع في الكاشير مباشرة بهذا السعر دون طلب رمز المدير).`,
        confirmText: 'نعم، اعتماد العرض بالخسارة',
        cancelText: 'تراجع وتعديل',
        variant: 'danger',
      });
      if (!confirmed) return;
    }

    const nextOffers = [...activeOffers, {
      id: `${Date.now()}`,
      type: offerType,
      value: nextValue,
      from: offerFrom || null,
      to: offerTo || null,
      happyHourStart: happyHourStart || null,
      happyHourEnd: happyHourEnd || null,
      daysOfWeek: daysOfWeek || null,
    }];
    await mutation.mutateAsync(nextOffers);
  }

  async function removeOffer(index: number) {
    if (!product) return;
    const nextOffers = activeOffers.filter((_, currentIndex) => currentIndex !== index);
    await mutation.mutateAsync(nextOffers);
  }

  return (
    <div className="two-column-grid">
      <FormSection title={product ? `عروض الصنف: ${product.name}` : t('products.workspace_sections.product_offers_card.s0', "عروض وخصومات الأصناف")} actions={<span className="nav-pill">{t('products.workspace_sections.product_offers_card.s1', "العروض")}</span>}>
        {!product ? <div className="muted">{t('products.workspace_sections.product_offers_card.s2', "اختر صنفًا أولًا لإدارة العروض كما في النسخة القديمة.")}</div> : (
          <div className="page-stack">
            <div className="form-grid">
              <Field label={t('products.workspace_sections.product_offers_card.s3', "نوع العرض")}>
                <select value={offerType} onChange={(e) => setOfferType(e.target.value as any)}>
                  <option value="percent">{t('products.workspace_sections.product_offers_card.s4', "خصم نسبة (%)")}</option>
                  <option value="fixed">{t('products.workspace_sections.product_offers_card.s5', "خصم مبلغ ثابت")}</option>
                  <option value="price">{t('products.workspace_sections.product_offers_card.s6', "سعر محدد للقطعة")}</option>
                  <option value="bundle">{t('products.workspace_sections.product_offers_card.s7', "سعر إجمالي للكمية (باقة)")}</option>
                </select>
              </Field>
              <Field label={t('products.workspace_sections.product_offers_card.s8', "قيمة العرض")}><input type="number" step="0.01" value={offerValue} onChange={(e) => setOfferValue(Number(e.target.value || 0))} /></Field>
              <Field label={t('products.workspace_sections.product_offers_card.s9', "من")}><input type="date" value={offerFrom} onChange={(e) => setOfferFrom(e.target.value)} /></Field>
              <Field label={t('products.workspace_sections.product_offers_card.s10', "إلى")}><input type="date" value={offerTo} onChange={(e) => setOfferTo(e.target.value)} /></Field>
              <Field label={t('products.workspace_sections.product_offers_card.s11', "ساعة البداية (Happy Hour)")}>
                <input type="time" value={happyHourStart} onChange={(e) => setHappyHourStart(e.target.value)} />
              </Field>
              <Field label={t('products.workspace_sections.product_offers_card.s12', "ساعة النهاية (Happy Hour)")}>
                <input type="time" value={happyHourEnd} onChange={(e) => setHappyHourEnd(e.target.value)} />
              </Field>
              <Field label={t('products.workspace_sections.product_offers_card.s13', "أيام الأسبوع المحددة")}>
                <input type="text" value={daysOfWeek} onChange={(e) => setDaysOfWeek(e.target.value)} placeholder={t('products.workspace_sections.product_offers_card.s14', "0,1,2,3 أو sun,mon")} />
              </Field>
            </div>
            <div className="actions">
              <Button type="button" onClick={() => void addOffer()} disabled={mutation.isPending || !product}>{t('products.workspace_sections.product_offers_card.s15', "إضافة العرض")}</Button>
            </div>
            <div className="page-stack">
              {activeOffers.length ? activeOffers.map((offer, index) => (
                <div key={`${offer.id || index}`} className="list-row">
                  <div>
                    <strong>{offer.type === 'bundle' ? `باقة (${offer.minQty || 1} قطع)` : offer.type === 'price' ? t('products.workspace_sections.product_offers_card.s16', "سعر محدد") : offer.type === 'percent' ? t('products.workspace_sections.product_offers_card.s17', "خصم نسبة") : t('products.workspace_sections.product_offers_card.s18', "خصم مبلغ")} · {offer.value}{offer.type === 'percent' ? '%' : ''}</strong>
                    <div className="muted small">{offer.from || t('products.workspace_sections.product_offers_card.s19', "بدون بداية")} → {offer.to || t('products.workspace_sections.product_offers_card.s20', "بدون نهاية")}</div>
                    {(offer.happyHourStart || (offer as any).happy_hour_start) && (
                      <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                        {t('products.workspace_sections.product_offers_card.s21', "ساعة سعيدة:")} {offer.happyHourStart || (offer as any).happy_hour_start} {t('products.workspace_sections.product_offers_card.s22', "إلى")} {offer.happyHourEnd || (offer as any).happy_hour_end}
                        {(offer.daysOfWeek || (offer as any).days_of_week) ? ` (${offer.daysOfWeek || (offer as any).days_of_week})` : ''}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="danger" onClick={() => void removeOffer(index)} disabled={mutation.isPending}>{t('products.workspace_sections.product_offers_card.s23', "حذف")}</Button>
                </div>
              )) : <div className="muted">{t('products.workspace_sections.product_offers_card.s24', "لا توجد عروض مسجلة على هذا الصنف.")}</div>}
            </div>
          </div>
        )}
      </FormSection>
      <FormSection title={t('products.workspace_sections.product_offers_card.s25', "سجل العروض على جميع الأصناف")} actions={<span className="nav-pill">{allOffers.length} {t('products.workspace_sections.product_offers_card.s26', "عرض")}</span>}>
        <div className="page-stack">
          {allOffers.length ? allOffers.map(({ product: currentProduct, offer }, index) => (
            <div key={`${currentProduct.id}-${offer.id || index}`} className="list-row">
              <div>
                <strong>{currentProduct.name}</strong>
                <div className="muted small">{offer.type === 'bundle' ? `باقة (${offer.minQty || 1} قطع)` : offer.type === 'price' ? t('products.workspace_sections.product_offers_card.s27', "سعر محدد") : offer.type === 'percent' ? t('products.workspace_sections.product_offers_card.s28', "خصم نسبة") : t('products.workspace_sections.product_offers_card.s29', "خصم مبلغ")} · {offer.value}{offer.type === 'percent' ? '%' : ''}</div>
                <div className="muted small">{offer.from || t('products.workspace_sections.product_offers_card.s30', "بدون بداية")} → {offer.to || t('products.workspace_sections.product_offers_card.s31', "بدون نهاية")}</div>
                {(offer.happyHourStart || (offer as any).happy_hour_start) && (
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                    {t('products.workspace_sections.product_offers_card.s32', "ساعة سعيدة:")} {offer.happyHourStart || (offer as any).happy_hour_start} {t('products.workspace_sections.product_offers_card.s33', "إلى")} {offer.happyHourEnd || (offer as any).happy_hour_end}
                    {(offer.daysOfWeek || (offer as any).days_of_week) ? ` (${offer.daysOfWeek || (offer as any).days_of_week})` : ''}
                  </div>
                )}
              </div>
            </div>
          )) : <div className="muted">{t('products.workspace_sections.product_offers_card.s34', "لا توجد عروض مسجلة.")}</div>}
        </div>
      </FormSection>
    </div>
  );
}
