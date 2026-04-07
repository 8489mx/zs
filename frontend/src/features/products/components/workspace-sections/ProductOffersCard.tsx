import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { productsApi } from '@/features/products/api/products.api';
import type { Product, ProductOffer } from '@/types/domain';
import { buildUpdatePayload, normalizeCustomerPrices, refetchAndSelectProduct, toProductFormValues } from './product-workspace.utils';

export function ProductOffersCard({ products, product, onUpdated }: { products: Product[]; product?: Product; onUpdated?: (product: Product) => void }) {
  const queryClient = useQueryClient();
  const [offerType, setOfferType] = useState<'percent' | 'fixed'>('percent');
  const [offerValue, setOfferValue] = useState(0);
  const [offerFrom, setOfferFrom] = useState('');
  const [offerTo, setOfferTo] = useState('');

  useEffect(() => {
    setOfferType('percent');
    setOfferValue(0);
    setOfferFrom('');
    setOfferTo('');
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
    }
  });

  const activeOffers = product?.offers || [];
  const allOffers = useMemo(() => products.flatMap((current) => (current.offers || []).map((offer) => ({ product: current, offer }))), [products]);

  async function addOffer() {
    if (!product) return;
    const nextValue = Number(offerValue || 0);
    if (!(nextValue > 0)) return;
    const nextOffers = [...activeOffers, {
      id: `${Date.now()}`,
      type: offerType,
      value: nextValue,
      from: offerFrom || null,
      to: offerTo || null
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
      <Card title={product ? `عروض الصنف: ${product.name}` : 'عروض وخصومات الأصناف'} actions={<span className="nav-pill">العروض</span>}>
        {!product ? <div className="muted">اختر صنفًا أولًا لإدارة العروض كما في النسخة القديمة.</div> : (
          <div className="page-stack">
            <div className="form-grid">
              <Field label="نوع العرض">
                <select value={offerType} onChange={(e) => setOfferType(e.target.value === 'fixed' ? 'fixed' : 'percent')}>
                  <option value="percent">خصم نسبة</option>
                  <option value="fixed">خصم مبلغ</option>
                </select>
              </Field>
              <Field label="قيمة العرض"><input type="number" step="0.01" value={offerValue} onChange={(e) => setOfferValue(Number(e.target.value || 0))} /></Field>
              <Field label="من"><input type="date" value={offerFrom} onChange={(e) => setOfferFrom(e.target.value)} /></Field>
              <Field label="إلى"><input type="date" value={offerTo} onChange={(e) => setOfferTo(e.target.value)} /></Field>
            </div>
            <div className="actions">
              <Button type="button" onClick={() => void addOffer()} disabled={mutation.isPending || !product}>إضافة العرض</Button>
            </div>
            <div className="page-stack">
              {activeOffers.length ? activeOffers.map((offer, index) => (
                <div key={`${offer.id || index}`} className="list-row">
                  <div>
                    <strong>{offer.type === 'percent' ? 'خصم نسبة' : 'خصم مبلغ'} · {offer.value}{offer.type === 'percent' ? '%' : ''}</strong>
                    <div className="muted small">{offer.from || 'بدون بداية'} → {offer.to || 'بدون نهاية'}</div>
                  </div>
                  <Button type="button" variant="danger" onClick={() => void removeOffer(index)} disabled={mutation.isPending}>حذف</Button>
                </div>
              )) : <div className="muted">لا توجد عروض مسجلة على هذا الصنف.</div>}
            </div>
          </div>
        )}
      </Card>
      <Card title="سجل العروض على جميع الأصناف" actions={<span className="nav-pill">{allOffers.length} عرض</span>}>
        <div className="page-stack">
          {allOffers.length ? allOffers.map(({ product: currentProduct, offer }, index) => (
            <div key={`${currentProduct.id}-${offer.id || index}`} className="list-row">
              <div>
                <strong>{currentProduct.name}</strong>
                <div className="muted small">{offer.type === 'percent' ? 'خصم نسبة' : 'خصم مبلغ'} · {offer.value}{offer.type === 'percent' ? '%' : ''}</div>
                <div className="muted small">{offer.from || 'بدون بداية'} → {offer.to || 'بدون نهاية'}</div>
              </div>
            </div>
          )) : <div className="muted">لا توجد عروض مسجلة.</div>}
        </div>
      </Card>
    </div>
  );
}
