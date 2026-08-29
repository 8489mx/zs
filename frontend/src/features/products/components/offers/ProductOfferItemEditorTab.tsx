import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { formatCurrency } from '@/lib/format';
import { addDaysIsoDate, getOfferStatus, todayIsoDate } from './product-offer.utils';
import type { Product, ProductOffer } from '@/types/domain';

interface ProductOfferItemEditorTabProps {
  product: Product;
  offerType: 'percent' | 'fixed' | 'price' | 'bundle';
  setOfferType: (type: 'percent' | 'fixed' | 'price' | 'bundle') => void;
  offerValue: string;
  setOfferValue: (val: string) => void;
  offerStartDate: string;
  setOfferStartDate: (d: string) => void;
  offerEndDate: string;
  setOfferEndDate: (d: string) => void;
  minQty: number;
  setMinQty: (n: number) => void;
  editingIndex: number | null;
  selectedOffersTab: 'active' | 'expired' | 'all';
  setSelectedOffersTab: (tab: 'active' | 'expired' | 'all') => void;
  offers: ProductOffer[];
  activeOffers: ProductOffer[];
  expiredOffers: ProductOffer[];
  visibleOffersList: Array<{ offer: ProductOffer; originalIndex: number }>;
  numValue: number;
  retailPrice: number;
  costPrice: number;
  simulatedEffectivePrice: number;
  simulatedSavings: number;
  simulatedSavingsPercent: number;
  saveOffer: () => Promise<void>;
  removeOffer: (index: number) => Promise<void>;
  loadOffer: (index: number) => void;
  resetForm: () => void;
  mutation: any;
}

export function ProductOfferItemEditorTab({
  product: _product,
  offerType,
  setOfferType,
  offerValue,
  setOfferValue,
  offerStartDate,
  setOfferStartDate,
  offerEndDate,
  setOfferEndDate,
  minQty,
  setMinQty,
  editingIndex,
  selectedOffersTab,
  setSelectedOffersTab,
  offers,
  activeOffers,
  expiredOffers,
  visibleOffersList,
  numValue,
  retailPrice,
  costPrice,
  simulatedEffectivePrice,
  simulatedSavings,
  simulatedSavingsPercent,
  saveOffer,
  removeOffer,
  loadOffer,
  resetForm,
  mutation,
}: ProductOfferItemEditorTabProps) {
  return (
    <div className="two-column-grid" style={{ alignItems: 'start', gap: 16 }}>
      {/* Form Column */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: editingIndex != null ? '1px solid #6366f1' : '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        padding: '16px 20px',
        height: '540px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: editingIndex != null ? '#6366f1' : '#2563eb'
              }} />
              <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>
                {editingIndex != null ? `تعديل بيانات العرض #${editingIndex + 1}` : 'إعداد عرض ترويجي جديد'}
              </strong>
            </div>
            {editingIndex != null && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          {/* Segmented Type Selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              نوع الخصم
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 8
            }}>
              <button
                type="button"
                onClick={() => setOfferType('percent')}
                style={{
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 4px',
                  fontSize: '0.8rem',
                  fontWeight: offerType === 'percent' ? 700 : 500,
                  color: offerType === 'percent' ? '#1e293b' : '#64748b',
                  background: offerType === 'percent' ? '#ffffff' : 'transparent',
                  boxShadow: offerType === 'percent' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="5" x2="5" y2="19" />
                  <circle cx="6.5" cy="6.5" r="2.5" />
                  <circle cx="17.5" cy="17.5" r="2.5" />
                </svg>
                نسبة مئوية
              </button>

              <button
                type="button"
                onClick={() => setOfferType('fixed')}
                style={{
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 4px',
                  fontSize: '0.8rem',
                  fontWeight: offerType === 'fixed' ? 700 : 500,
                  color: offerType === 'fixed' ? '#1e293b' : '#64748b',
                  background: offerType === 'fixed' ? '#ffffff' : 'transparent',
                  boxShadow: offerType === 'fixed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                خصم مبلغ
              </button>

              <button
                type="button"
                onClick={() => setOfferType('price')}
                style={{
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 4px',
                  fontSize: '0.8rem',
                  fontWeight: offerType === 'price' ? 700 : 500,
                  color: offerType === 'price' ? '#1e293b' : '#64748b',
                  background: offerType === 'price' ? '#ffffff' : 'transparent',
                  boxShadow: offerType === 'price' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
                سعر محدد
              </button>

              <button
                type="button"
                onClick={() => {
                  setOfferType('bundle');
                  if (minQty <= 1) setMinQty(3);
                }}
                style={{
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 4px',
                  fontSize: '0.8rem',
                  fontWeight: offerType === 'bundle' ? 700 : 500,
                  color: offerType === 'bundle' ? '#1e293b' : '#64748b',
                  background: offerType === 'bundle' ? '#ffffff' : 'transparent',
                  boxShadow: offerType === 'bundle' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                باقة / كمية
              </button>
            </div>
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Row: Value & Min Qty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
              <Field label={
                offerType === 'percent'
                  ? 'نسبة الخصم (%)'
                  : offerType === 'fixed'
                    ? 'قيمة الخصم للقطعة (ج.م)'
                    : offerType === 'bundle'
                      ? 'إجمالي سعر الباقة (ج.م)'
                      : 'سعر القطعة بالعرض (ج.م)'
              }>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={offerType === 'percent' ? 'مثال: 20' : offerType === 'fixed' ? 'مثال: 15' : offerType === 'bundle' ? 'مثال: 500' : 'مثال: 80'}
                  value={offerValue}
                  onChange={(event) => setOfferValue(event.target.value)}
                  style={{ fontWeight: 600 }}
                />
              </Field>

              <Field label={offerType === 'bundle' ? 'عدد قطع الباقة *' : 'الكمية الأدنى'}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={minQty}
                  onChange={(event) => setMinQty(Math.max(1, Number(event.target.value || 1)))}
                />
              </Field>
            </div>

            {/* Row: Dates on a single line */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="تاريخ البداية">
                <input
                  type="date"
                  value={offerStartDate}
                  onChange={(event) => setOfferStartDate(event.target.value)}
                />
              </Field>

              <Field label="تاريخ الانتهاء (اختياري)">
                <input
                  type="date"
                  value={offerEndDate}
                  min={offerStartDate || todayIsoDate()}
                  onChange={(event) => setOfferEndDate(event.target.value)}
                />
              </Field>
            </div>

            {/* Duration Shortcuts on Single Line */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 5,
              marginTop: -4
            }}>
              <button
                type="button"
                onClick={() => setOfferEndDate(addDaysIsoDate(1))}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '5px 2px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  color: '#334155',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
              >
                يوم
              </button>
              <button
                type="button"
                onClick={() => setOfferEndDate(addDaysIsoDate(7))}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '5px 2px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  color: '#334155',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
              >
                أسبوع
              </button>
              <button
                type="button"
                onClick={() => setOfferEndDate(addDaysIsoDate(14))}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '5px 2px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  color: '#334155',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
              >
                أسبوعين
              </button>
              <button
                type="button"
                onClick={() => setOfferEndDate(addDaysIsoDate(30))}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '5px 2px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  color: '#334155',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
              >
                شهر
              </button>
              <button
                type="button"
                onClick={() => setOfferEndDate('')}
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  padding: '5px 2px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  color: '#15803d',
                  fontWeight: 700,
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
              >
                دائم
              </button>
            </div>

            {/* Real-time Simulator Card */}
            {numValue > 0 && retailPrice > 0 ? (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '10px 12px',
                marginTop: 4
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    {offerType === 'bundle' ? `معاينة الباقة (${minQty} قطع):` : 'معاينة السعر في الكاشير:'}
                  </span>
                  <span style={{ fontSize: '0.74rem', background: '#16a34a', color: '#ffffff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    وفرت {simulatedSavingsPercent.toFixed(0)}%
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '0.85rem' }}>
                    {formatCurrency(offerType === 'bundle' ? retailPrice * minQty : retailPrice)}
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d' }}>
                    {formatCurrency(offerType === 'bundle' ? numValue : simulatedEffectivePrice)}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 500 }}>
                    {offerType === 'bundle' 
                      ? `(سعر القطعة داخل الباقة: ${formatCurrency(simulatedEffectivePrice)} · توفير ${formatCurrency(simulatedSavings)})`
                      : `(توفير ${formatCurrency(simulatedSavings)})`
                    }
                  </span>
                </div>

                {costPrice > 0 && simulatedEffectivePrice < costPrice ? (
                  <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>سعر العرض أقل من سعر التكلفة ({formatCurrency(costPrice)})</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Form Buttons */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="button"
              onClick={() => void saveOffer()}
              disabled={mutation.isPending || !offerValue}
              style={{
                flex: 1,
                background: '#1e293b',
                color: '#ffffff',
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px'
              }}
            >
              {mutation.isPending ? 'جاري الحفظ...' : editingIndex != null ? 'حفظ تعديل العرض' : 'إضافة العرض للصنف'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={mutation.isPending}
            >
              إعادة التهيئة
            </Button>
          </div>

          <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر حفظ العرض" />
          <MutationFeedback isSuccess={mutation.isSuccess && !mutation.isPending} successText="تم حفظ العروض وتحديثها بنجاح." />
        </div>
      </div>

      {/* Current Offers Column */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        padding: '16px 20px',
        height: '540px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: 10 }}>
          <strong style={{ fontSize: '0.92rem', color: '#1e293b', display: 'block' }}>
            العروض المسجلة
          </strong>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            إدارة وتعديل أو حذف العروض الحالية والسابقة
          </span>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 0.8fr',
          background: '#f1f5f9',
          padding: 3,
          borderRadius: 8,
          marginBottom: 12,
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => setSelectedOffersTab('active')}
            style={{
              border: 'none',
              borderRadius: 6,
              padding: '6px 4px',
              fontSize: '0.76rem',
              fontWeight: selectedOffersTab === 'active' ? 700 : 500,
              color: selectedOffersTab === 'active' ? '#047857' : '#64748b',
              background: selectedOffersTab === 'active' ? '#ffffff' : 'transparent',
              boxShadow: selectedOffersTab === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981'
            }} />
            عروض نشطة ({activeOffers.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedOffersTab('expired')}
            style={{
              border: 'none',
              borderRadius: 6,
              padding: '6px 4px',
              fontSize: '0.76rem',
              fontWeight: selectedOffersTab === 'expired' ? 700 : 500,
              color: selectedOffersTab === 'expired' ? '#b91c1c' : '#64748b',
              background: selectedOffersTab === 'expired' ? '#ffffff' : 'transparent',
              boxShadow: selectedOffersTab === 'expired' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#ef4444'
            }} />
            عروض منتهية ({expiredOffers.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedOffersTab('all')}
            style={{
              border: 'none',
              borderRadius: 6,
              padding: '6px 4px',
              fontSize: '0.76rem',
              fontWeight: selectedOffersTab === 'all' ? 700 : 500,
              color: selectedOffersTab === 'all' ? '#1e293b' : '#64748b',
              background: selectedOffersTab === 'all' ? '#ffffff' : 'transparent',
              boxShadow: selectedOffersTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              transition: 'all 0.15s ease'
            }}
          >
            الكل ({offers.length})
          </button>
        </div>

        {/* List of cards */}
        <div className="page-stack" style={{ gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
          {visibleOffersList.length ? visibleOffersList.map(({ offer, originalIndex }) => {
            const status = getOfferStatus(offer);
            const isCurrentlyEditing = editingIndex === originalIndex;
            const minQ = Math.max(1, Number(offer.minQty || 1));
            const typeName = offer.type === 'bundle' ? `باقة (${minQ} قطع)` : offer.type === 'price' ? 'سعر محدد' : offer.type === 'fixed' ? 'خصم مبلغ' : 'خصم نسبة';
            const valText = offer.type === 'percent' ? `${offer.value}%` : `${formatCurrency(Number(offer.value || 0))}`;

            return (
              <div
                key={`${offer.id || originalIndex}`}
                style={{
                  background: isCurrentlyEditing ? '#f8fafc' : '#ffffff',
                  border: isCurrentlyEditing ? '1px solid #6366f1' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      {typeName}: {valText}
                    </strong>
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {minQ > 1 ? `من ${minQ} قطع` : 'من أول قطعة'}
                    </span>
                  </div>
                  <span style={{
                    background: status.bg,
                    color: status.color,
                    border: `1px solid ${status.border}`,
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    {status.label}
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>يبدأ: {offer.from || todayIsoDate()}</span>
                  <span>·</span>
                  <span>ينتهي: {offer.to ? offer.to : 'مفتوح (دائم)'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => loadOffer(originalIndex)}
                    disabled={mutation.isPending}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      borderRadius: 5,
                      padding: '3px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    تعديل
                  </button>

                  <button
                    type="button"
                    onClick={() => void removeOffer(originalIndex)}
                    disabled={mutation.isPending}
                    style={{
                      background: '#fff',
                      border: '1px solid #fee2e2',
                      color: '#dc2626',
                      borderRadius: 5,
                      padding: '3px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    حذف
                  </button>
                </div>
              </div>
            );
          }) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px 16px',
              textAlign: 'center',
              color: '#94a3b8',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{ marginBottom: 8, color: '#94a3b8' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#64748b' }}>
                {selectedOffersTab === 'expired' ? 'لا توجد عروض منتهية' : 'لا توجد عروض نشطة'}
              </div>
              <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                {selectedOffersTab === 'expired' ? 'جميع العروض المسجلة لا تزال سارية ونشطة' : 'استخدم النموذج لإنشاء أول عرض ترويجي للصنف'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
