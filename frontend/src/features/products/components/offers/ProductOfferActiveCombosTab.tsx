import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';

interface ProductOfferActiveCombosTabProps {
  comboSearchQuery: string;
  setComboSearchQuery: (query: string) => void;
  filteredComboProducts: Product[];
  isLoadingAllProducts: boolean;
  bomsList: any[];
  allProducts: Product[];
  onStartCreateCombo: () => void;
  onEditCombo: (prod: Product) => void;
  onDeleteCombo: (prod: Product) => void;
  isDeletingCombo: boolean;
}

export function ProductOfferActiveCombosTab({
  comboSearchQuery,
  setComboSearchQuery,
  filteredComboProducts,
  isLoadingAllProducts,
  bomsList,
  allProducts,
  onStartCreateCombo,
  onEditCombo,
  onDeleteCombo,
  isDeletingCombo,
}: ProductOfferActiveCombosTabProps) {
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
      gap: 14
    }}>
      {/* Top Bar inside Active Combos View */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 12,
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, maxWidth: 450 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={comboSearchQuery}
              onChange={(e) => setComboSearchQuery(e.target.value)}
              placeholder="ابحث في العروض المجمعة (الاسم أو الباركود)..."
              style={{
                width: '100%',
                height: 36,
                paddingRight: 32,
                paddingLeft: comboSearchQuery ? 30 : 10,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                background: '#f8fafc'
              }}
            />
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            {comboSearchQuery && (
              <button
                type="button"
                onClick={() => setComboSearchQuery('')}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            {filteredComboProducts.length} عرض متاح
          </span>
          <Button
            type="button"
            onClick={onStartCreateCombo}
            style={{
              background: '#db2777',
              borderColor: '#be185d',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 700
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ إنشاء عرض مجمع جديد</span>
          </Button>
        </div>
      </div>

      {/* Combos Cards Grid (POS-Style Cards) */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
        padding: '2px 4px',
        alignContent: 'start'
      }}>
        {isLoadingAllProducts ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            جارٍ تحميل العروض المجمعة...
          </div>
        ) : filteredComboProducts.length > 0 ? (
          filteredComboProducts.map((prod) => {
            const bom = bomsList.find((b) => String(b.product_id) === String(prod.id));
            const retail = Number(prod.retailPrice || (prod as any).retail_price || 0);
            
            let origRetailSum = 0;
            const recipeSummary: Array<{ name: string; qty: number; unitPrice: number }> = [];
            
            if (bom?.lines && Array.isArray(bom.lines)) {
              bom.lines.forEach((l: any) => {
                const cId = l.componentId ?? l.componentProductId ?? l.component_product_id;
                const cProd = allProducts.find((p) => String(p.id) === String(cId));
                const cPrice = Number(cProd?.retailPrice || (cProd as any)?.retail_price || l.expectedCost || l.expected_cost || 0);
                const cQty = Number(l.quantity || 1);
                origRetailSum += (cPrice * cQty);
                recipeSummary.push({
                  name: cProd?.name || l.component_product_name || `صنف #${cId}`,
                  qty: cQty,
                  unitPrice: cPrice
                });
              });
            }

            const savings = origRetailSum > retail ? origRetailSum - retail : 0;
            const savingsPct = origRetailSum > 0 && savings > 0 ? ((savings / origRetailSum) * 100).toFixed(0) : null;

            return (
              <div
                key={prod.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 180,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {/* Top Row: Badges & Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      background: '#fdf2f8',
                      color: '#db2777',
                      border: '1px solid #fbcfe8',
                      padding: '2px 7px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      كومبو
                    </span>
                    {prod.barcode && (
                      <span style={{
                        background: '#f8fafc',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        padding: '1px 5px',
                        borderRadius: 4,
                        fontSize: '0.7rem',
                        fontFamily: 'monospace'
                      }}>
                        {prod.barcode}
                      </span>
                    )}
                  </div>

                  {/* Actions in top right */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => onEditCombo(prod)}
                      title="تعديل العرض ومكوناته"
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        borderRadius: 6,
                        width: 26,
                        height: 26,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف العرض المجمع "${prod.name}" نهائياً؟`)) {
                          onDeleteCombo(prod);
                        }
                      }}
                      disabled={isDeletingCombo}
                      title="حذف العرض"
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        borderRadius: 6,
                        width: 26,
                        height: 26,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Middle: Title & Components List */}
                <div style={{ marginBottom: 10, flex: 1 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.94rem',
                    color: '#0f172a',
                    marginBottom: 6,
                    lineHeight: 1.3
                  }}>
                    {prod.name}
                  </div>

                  {/* Components Box */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: 8,
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    maxHeight: 65,
                    overflowY: 'auto'
                  }}>
                    {recipeSummary.length > 0 ? (
                      recipeSummary.map((c, i) => (
                        <div key={i} style={{ fontSize: '0.74rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#2563eb', fontWeight: 700 }}>• {c.qty}×</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {prod.notes || 'عرض ترويجي مركب'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Footer: Price & Savings */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  paddingTop: 8,
                  borderTop: '1px dashed #e2e8f0'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {origRetailSum > 0 && origRetailSum > retail && (
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.76rem' }}>
                        {formatCurrency(origRetailSum)}
                      </span>
                    )}
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                      {formatCurrency(retail)}
                    </span>
                  </div>

                  {savingsPct ? (
                    <span style={{
                      background: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                      padding: '2px 7px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      وفرت {savingsPct}%
                    </span>
                  ) : null}
                </div>

              </div>
            );
          })
        ) : (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: '#fdf2f8',
              color: '#db2777',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#1e293b', display: 'block', marginBottom: 4 }}>
                {comboSearchQuery ? 'لا توجد عروض مجمعة مطابقة لبحثك' : 'لا توجد عروض مجمعة (كومبو) نشطة حالياً'}
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                يمكنك إنشاء باقات ووجبات ترويجية تجمع عدة أصناف بسعر موحد خاص
              </span>
            </div>
            <Button
              type="button"
              onClick={onStartCreateCombo}
              style={{
                background: '#db2777',
                borderColor: '#be185d',
                padding: '8px 18px',
                fontSize: '0.84rem',
                fontWeight: 700,
                marginTop: 6
              }}
            >
              + إنشاء أول عرض مجمع الآن
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
