import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { productsApi } from '@/features/products/api/products.api';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import type { Product, ProductOffer } from '@/types/domain';
import { buildUpdatePayload, normalizeCustomerPrices, toProductFormValues } from '@/features/products/components/workspace-sections/product-workspace.utils';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';

interface ProductOfferDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved?: (product: Product) => void;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function describeOffer(offer: ProductOffer) {
  const minQty = Math.max(1, Number(offer.minQty || 1));
  const typeLabel = offer.type === 'price' ? 'سعر جديد' : offer.type === 'fixed' ? 'خصم مبلغ' : 'خصم نسبة';
  const valueLabel = offer.type === 'percent' ? `${offer.value}%` : offer.value;
  const qtyLabel = minQty > 1 ? `من كمية ${minQty}` : 'من أول قطعة';
  return `${typeLabel} · ${valueLabel} · ${qtyLabel}`;
}

export function ProductOfferDialog({ open, product, onClose, onSaved }: ProductOfferDialogProps) {
  const queryClient = useQueryClient();
  const [offerType, setOfferType] = useState<'percent' | 'fixed' | 'price'>('percent');
  const [offerValue, setOfferValue] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [minQty, setMinQty] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setOfferType('percent');
    setOfferValue('');
    setOfferEndDate('');
    setMinQty(1);
    setEditingIndex(null);
  }, [open, product?.id]);

  const offers = useMemo(() => product?.offers || [], [product?.offers]);
  const startDate = todayIsoDate();

  const mutation = useMutation({
    mutationFn: async (nextOffers: ProductOffer[]) => {
      if (!product) throw new Error('الصنف غير متاح');
      return productsApi.update(
        product.id,
        buildUpdatePayload(
          toProductFormValues(product),
          product,
          normalizeProductUnits(product.units, product.barcode || ''),
          normalizeCustomerPrices(product),
          nextOffers,
        ),
      );
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
    },
  });

  if (!product) return null;
  const currentProduct = product;

  async function saveOffer() {
    const value = Number(offerValue || 0);
    if (!(value > 0)) return;
    if (!offerEndDate) return;
    const nextOffer: ProductOffer = {
      id: editingIndex != null ? offers[editingIndex]?.id : `${Date.now()}`,
      type: offerType,
      value,
      minQty: Math.max(1, Number(minQty || 1)),
      from: startDate,
      to: offerEndDate,
    };
    const nextOffers = editingIndex != null
      ? offers.map((offer, index) => (index === editingIndex ? nextOffer : offer))
      : [...offers, nextOffer];
    await mutation.mutateAsync(nextOffers);
    onSaved?.({ ...currentProduct, offers: nextOffers });
    setOfferType('percent');
    setOfferValue('');
    setOfferEndDate('');
    setMinQty(1);
    setEditingIndex(null);
  }

  async function removeOffer(index: number) {
    const nextOffers = offers.filter((_, currentIndex) => currentIndex !== index);
    await mutation.mutateAsync(nextOffers);
    onSaved?.({ ...currentProduct, offers: nextOffers });
    if (editingIndex === index) {
      setEditingIndex(null);
      setOfferType('percent');
      setOfferValue('');
      setOfferEndDate('');
      setMinQty(1);
    }
  }

  function loadOffer(index: number) {
    const offer = offers[index];
    if (!offer) return;
    setEditingIndex(index);
    setOfferType(offer.type === 'price' ? 'price' : offer.type === 'fixed' ? 'fixed' : 'percent');
    setOfferValue(String(Number(offer.value || 0)));
    setOfferEndDate(String(offer.to || ''));
    setMinQty(Math.max(1, Number(offer.minQty || 1)));
  }

  return (
    <DialogShell open={open} onClose={onClose} width="min(860px, 100%)" zIndex={80} ariaLabel="إدارة عروض الصنف">
      <div className="page-stack">
        <div className="section-title">
          <div className="section-heading-copy">
            <h3>العروض على الأصناف</h3>
            <p className="section-description">{currentProduct.name} · بداية العرض ستسجل تلقائيًا من تاريخ اليوم، واختر فقط تاريخ نهاية العرض.</p>
          </div>
          <div className="section-title-actions actions compact-actions">
            <span className="nav-pill">{offers.length} عرض</span>
            <Button variant="secondary" type="button" onClick={onClose}>إغلاق</Button>
          </div>
        </div>

        <div className="two-column-grid" style={{ alignItems: 'start' }}>
          <div className="card" style={{ minHeight: 0 }}>
            <div className="form-grid">
              <Field label="نوع العرض">
                <select value={offerType} onChange={(event) => setOfferType(event.target.value === 'price' ? 'price' : event.target.value === 'fixed' ? 'fixed' : 'percent')}>
                  <option value="percent">خصم نسبة</option>
                  <option value="fixed">خصم مبلغ</option>
                  <option value="price">سعر جديد</option>
                </select>
              </Field>
              <Field label={offerType === 'price' ? 'السعر الجديد' : 'قيمة العرض'}>
                <input type="number" min="0.01" step="0.01" value={offerValue} onChange={(event) => setOfferValue(event.target.value)} />
              </Field>
              <Field label="الكمية التي يبدأ منها العرض">
                <input type="number" min="1" step="1" value={minQty} onChange={(event) => setMinQty(Math.max(1, Number(event.target.value || 1)))} />
              </Field>
              <Field label="تاريخ البداية">
                <input value={startDate} readOnly disabled />
              </Field>
              <Field label="تاريخ الانتهاء">
                <input type="date" value={offerEndDate} min={startDate} onChange={(event) => setOfferEndDate(event.target.value)} />
              </Field>
              <Field label="ملحوظة سريعة">
                <input value={minQty > 1 ? `عرض كميات يبدأ من ${minQty}` : 'عرض على القطعة'} readOnly disabled />
              </Field>
            </div>
            <div className="actions compact-actions" style={{ marginTop: 12 }}>
              <Button type="button" onClick={() => void saveOffer()} disabled={mutation.isPending || !offerValue || !offerEndDate}>{editingIndex != null ? 'حفظ التعديل' : 'إضافة العرض'}</Button>
              <Button type="button" variant="secondary" onClick={() => {
                setEditingIndex(null);
                setOfferType('percent');
                setOfferValue('');
                setOfferEndDate('');
                setMinQty(1);
              }} disabled={mutation.isPending}>إعادة التهيئة</Button>
            </div>
            <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر حفظ العرض" />
            <MutationFeedback isSuccess={mutation.isSuccess && !mutation.isPending} successText="تم حفظ العروض على الصنف." />
          </div>

          <div className="card" style={{ minHeight: 0 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>
              <div className="section-heading-copy">
                <h3 style={{ fontSize: 16 }}>العروض الحالية</h3>
                <p className="section-description">كل عرض يمكن تعديله أو حذفه بسرعة من نفس النافذة.</p>
              </div>
            </div>
            <div className="page-stack">
              {offers.length ? offers.map((offer, index) => (
                <div key={`${offer.id || index}`} className="list-row stacked-row" style={{ gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{describeOffer(offer)}</strong>
                    <div className="muted small">{offer.from || startDate} ← بداية تلقائية · ينتهي في {offer.to || '—'}</div>
                  </div>
                  <div className="actions compact-actions">
                    <Button type="button" variant="secondary" onClick={() => loadOffer(index)} disabled={mutation.isPending}>تخصيص</Button>
                    <Button type="button" variant="danger" onClick={() => void removeOffer(index)} disabled={mutation.isPending}>حذف</Button>
                  </div>
                </div>
              )) : <div className="muted">لا توجد عروض حالية على هذا الصنف.</div>}
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
