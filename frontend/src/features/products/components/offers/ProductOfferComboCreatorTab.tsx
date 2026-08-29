import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';

interface ProductOfferComboCreatorTabProps {
  editingComboId: string | number | null;
  comboName: string;
  setComboName: (name: string) => void;
  comboPrice: string;
  setComboPrice: (price: string) => void;
  comboBarcode: string;
  setComboBarcode: (barcode: string) => void;
  comboComponents: Array<{ product: Product; quantity: number }>;
  setComboComponents: React.Dispatch<React.SetStateAction<Array<{ product: Product; quantity: number }>>>;
  componentSearchQuery: string;
  setComponentSearchQuery: (query: string) => void;
  availableCatalogProducts: Product[];
  isLoadingCatalog: boolean;
  comboTotalItemsPrice: number;
  comboTotalCost: number;
  numericComboPrice: number;
  comboSavings: number;
  comboSavingsPercent: string;
  saveComboMutation: any;
  onCancel: () => void;
}

export function ProductOfferComboCreatorTab({
  editingComboId,
  comboName,
  setComboName,
  comboPrice,
  setComboPrice,
  comboBarcode,
  setComboBarcode,
  comboComponents,
  setComboComponents,
  componentSearchQuery,
  setComponentSearchQuery,
  availableCatalogProducts,
  isLoadingCatalog,
  comboTotalItemsPrice,
  comboTotalCost,
  numericComboPrice,
  comboSavings,
  comboSavingsPercent,
  saveComboMutation,
  onCancel,
}: ProductOfferComboCreatorTabProps) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: '16px 20px',
      height: '540px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Form & Pricing */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto', paddingRight: 4 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: '#fdf2f8',
                  color: '#db2777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </div>
                <div>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
                    {editingComboId ? `تعديل العرض المجمع: ${comboName || 'عرض'}` : 'إعداد عرض مجمع جديد (كومبو)'}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {editingComboId ? 'تعديل السعر أو إضافة وحذف المكونات' : 'أنشئ باقة أو وجبة مركبة بسعر خاص ومخفض للزبائن'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                العودة للعروض
              </button>
            </div>

            <div className="page-stack" style={{ gap: 10 }}>
              <Field label="اسم العرض المجمع / الباقة *">
                <input
                  type="text"
                  autoFocus
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="مثال: عرض التوفير العائلي / وجبة كومبو ميكس"
                  disabled={saveComboMutation.isPending}
                  style={{ fontWeight: 600 }}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="سعر بيع العرض (ج.م) *">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={comboPrice}
                    onChange={(e) => setComboPrice(e.target.value)}
                    placeholder="مثال: 99.00"
                    disabled={saveComboMutation.isPending}
                    style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}
                  />
                </Field>

                <Field label="الباركود (اختياري)">
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text"
                      value={comboBarcode}
                      onChange={(e) => setComboBarcode(e.target.value)}
                      placeholder="توليد أو مسح"
                      disabled={saveComboMutation.isPending}
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                    <button
                      type="button"
                      onClick={() => setComboBarcode(String(Date.now()).slice(-8))}
                      title="توليد باركود تلقائي"
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '0 8px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      توليد
                    </button>
                  </div>
                </Field>
              </div>

              {/* Financial Summary & Smart Intelligence Box */}
              <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                marginTop: 4
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', marginBottom: 6 }}>
                  <span>إجمالي أسعار المكونات منفردة:</span>
                  <strong style={{
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    textDecoration: numericComboPrice > 0 && numericComboPrice < comboTotalItemsPrice ? 'line-through' : 'none'
                  }}>
                    {formatCurrency(comboTotalItemsPrice)} ج.م
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', marginBottom: 6 }}>
                  <span>تكلفة المكونات:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(comboTotalCost)} ج.م</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  fontWeight: 700,
                  paddingTop: 8,
                  marginTop: 4,
                  borderTop: '1px dashed #cbd5e1'
                }}>
                  <span>سعر العرض الترويجي:</span>
                  <span style={{ color: '#16a34a', fontSize: '1.15rem', fontWeight: 800 }}>
                    {formatCurrency(numericComboPrice)} ج.م
                  </span>
                </div>

                {comboSavings > 0 && (
                  <div style={{
                    marginTop: 8,
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '1px solid #a7f3d0',
                    borderRadius: 8,
                    padding: '7px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#065f46',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>توفير للزبون:</span> <strong>{formatCurrency(comboSavings)} ج.م</strong>
                    </span>
                    <span style={{ background: '#059669', color: '#ffffff', padding: '1px 8px', borderRadius: 12, fontSize: '0.74rem' }}>
                      خصم {comboSavingsPercent}%
                    </span>
                  </div>
                )}

                {numericComboPrice > 0 && numericComboPrice >= comboTotalCost && (
                  <div style={{
                    marginTop: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.74rem',
                    color: '#475569',
                    paddingTop: 4
                  }}>
                    <span>هامش ربح التاجر:</span>
                    <strong style={{ color: '#047857' }}>
                      {formatCurrency(numericComboPrice - comboTotalCost)} ج.م ({comboTotalCost > 0 ? (((numericComboPrice - comboTotalCost) / numericComboPrice) * 100).toFixed(0) : 100}%)
                    </strong>
                  </div>
                )}

                {numericComboPrice > 0 && numericComboPrice < comboTotalCost && (
                  <div style={{
                    marginTop: 8,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>تنبيه: سعر العرض أقل من تكلفة المكونات بخسارة قدرها {formatCurrency(comboTotalCost - numericComboPrice)} ج.م</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <MutationFeedback isError={saveComboMutation.isError} error={saveComboMutation.error} errorFallback="تعذر حفظ العرض المجمع" />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="button"
                onClick={() => saveComboMutation.mutate()}
                disabled={saveComboMutation.isPending || !comboName.trim() || comboComponents.length === 0 || !numericComboPrice}
                style={{ flex: 1, background: '#db2777', borderColor: '#be185d' }}
              >
                {saveComboMutation.isPending ? 'جارٍ الحفظ...' : editingComboId ? 'حفظ تعديلات العرض' : 'حفظ وتفعيل العرض المجمع'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={saveComboMutation.isPending}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Components Selector & List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
          height: '100%'
        }}>
          
          {/* 1. Store Catalog Browser Box */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            height: '220px',
            minHeight: '220px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: '0.84rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                أصناف المتجر (اضغط للإضافة)
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {availableCatalogProducts.length} صنف متاح
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <input
                type="text"
                value={componentSearchQuery}
                onChange={(e) => setComponentSearchQuery(e.target.value)}
                placeholder="ابحث باسم الصنف أو امسح الباركود..."
                style={{
                  width: '100%',
                  height: 32,
                  paddingRight: 28,
                  paddingLeft: componentSearchQuery ? 28 : 8,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  background: '#ffffff'
                }}
              />
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              {componentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setComponentSearchQuery('')}
                  style={{
                    position: 'absolute',
                    left: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 2
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Catalog Products List */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {isLoadingCatalog ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                  جارٍ جلب الأصناف...
                </div>
              ) : availableCatalogProducts.length > 0 ? (
                availableCatalogProducts.map((prod) => {
                  const addedItem = comboComponents.find((c) => String(c.product.id) === String(prod.id));
                  const isAdded = Boolean(addedItem);
                  const prodPrice = Number((prod as any).retailPrice || (prod as any).retail_price || 0);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        setComboComponents((prev) => {
                          const exists = prev.find((c) => String(c.product.id) === String(prod.id));
                          if (exists) {
                            return prev.map((c) => String(c.product.id) === String(prod.id) ? { ...c, quantity: c.quantity + 1 } : c);
                          }
                          return [...prev, { product: prod, quantity: 1 }];
                        });
                      }}
                      style={{
                        background: isAdded ? '#f0fdf4' : '#ffffff',
                        border: isAdded ? '1px solid #86efac' : '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '6px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isAdded) e.currentTarget.style.background = '#eff6ff';
                      }}
                      onMouseLeave={(e) => {
                        if (!isAdded) e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {prod.barcode ? `باركود: ${prod.barcode}` : 'صنف أساسي'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isAdded && (
                          <span style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '1px 6px',
                            borderRadius: 10,
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}>
                            مضاف ({addedItem?.quantity})
                          </span>
                        )}
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isAdded ? '#15803d' : '#2563eb' }}>
                          {formatCurrency(prodPrice)} ج.م
                        </span>
                        <span style={{
                          background: isAdded ? '#16a34a' : '#2563eb',
                          color: '#ffffff',
                          borderRadius: 4,
                          width: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 800
                        }}>
                          +
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                  لا توجد أصناف مطابقة للبحث
                </div>
              )}
            </div>
          </div>

          {/* 2. Selected Components Box */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: '0.84rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                مكونات الباقة المحددة ({comboComponents.length})
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                إجمالي المكونات: {comboComponents.reduce((s, c) => s + c.quantity, 0)} قطعة
              </span>
            </div>

            {/* Components List */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {comboComponents.length > 0 ? (
                comboComponents.map((item, idx) => {
                  const itemRetail = Number((item.product as any).retailPrice || (item.product as any).retail_price || 0);
                  return (
                    <div
                      key={item.product.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '6px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.product.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>
                          <span>{formatCurrency(itemRetail)} ج.م</span>
                          <span style={{ margin: '0 4px', color: '#cbd5e1' }}>×</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.quantity}</span>
                          <span style={{ margin: '0 4px', color: '#cbd5e1' }}>=</span>
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(itemRetail * item.quantity)} ج.م</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Quantity Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: 5, overflow: 'hidden', background: '#f8fafc' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity <= 1) {
                                setComboComponents((prev) => prev.filter((_, i) => i !== idx));
                              } else {
                                setComboComponents((prev) => prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c));
                              }
                            }}
                            style={{ width: 24, height: 24, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                          >
                            -
                          </button>
                          <span style={{ padding: '0 8px', fontSize: '0.82rem', fontWeight: 800, minWidth: 20, textAlign: 'center', color: '#0f172a' }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setComboComponents((prev) => prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c));
                            }}
                            style={{ width: 24, height: 24, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                          >
                            +
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => setComboComponents((prev) => prev.filter((_, i) => i !== idx))}
                          style={{
                            border: '1px solid #fecaca',
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: 5,
                            width: 24,
                            height: 24,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="حذف المكون"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>لم يتم اختيار أي مكونات بعد</div>
                  <div style={{ fontSize: '0.72rem', marginTop: 2 }}>اضغط على أي صنف من القائمة بالأعلى لإضافته للباقة</div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
