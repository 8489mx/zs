import { formatCurrency } from '@/lib/format';
import { todayIsoDate } from './product-offer.utils';
import type { Product } from '@/types/domain';

export type SearchFilterKey = 'all' | 'offers' | 'near_expiry' | 'stagnant' | 'high_margin' | 'overstock' | 'no_offers';

interface FilterStats {
  all: number;
  offers: number;
  near_expiry: number;
  stagnant: number;
  high_margin: number;
  overstock: number;
  no_offers: number;
}

interface ProductOfferSearchTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchFilter: SearchFilterKey;
  setSearchFilter: (filter: SearchFilterKey) => void;
  filterStats: FilterStats;
  filteredSearchResults: Product[];
  isSearching: boolean;
  onSelectProduct: (prod: Product) => void;
}

export function ProductOfferSearchTab({
  searchQuery,
  setSearchQuery,
  searchFilter,
  setSearchFilter,
  filterStats,
  filteredSearchResults,
  isSearching,
  onSelectProduct,
}: ProductOfferSearchTabProps) {
  return (
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
      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          type="text"
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم الصنف، الباركود، أو كود الموديل..."
          style={{
            width: '100%',
            height: 44,
            paddingRight: 40,
            paddingLeft: 16,
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            fontSize: '0.92rem',
            fontWeight: 500,
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            background: '#f8fafc',
            transition: 'all 0.15s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
          }}
        />
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          pointerEvents: 'none'
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Smart Filter Pills Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 6,
        marginBottom: 12
      }}>
        {/* All */}
        <button
          type="button"
          onClick={() => setSearchFilter('all')}
          style={{
            border: searchFilter === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
            background: searchFilter === 'all' ? '#0f172a' : '#f8fafc',
            color: searchFilter === 'all' ? '#ffffff' : '#475569',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: searchFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          الكل
          <span style={{
            background: searchFilter === 'all' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
            color: searchFilter === 'all' ? '#ffffff' : '#64748b',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem'
          }}>
            {filterStats.all}
          </span>
        </button>

        {/* Offers */}
        <button
          type="button"
          onClick={() => setSearchFilter('offers')}
          style={{
            border: searchFilter === 'offers' ? '1px solid #2563eb' : '1px solid #e2e8f0',
            background: searchFilter === 'offers' ? '#2563eb' : '#f8fafc',
            color: searchFilter === 'offers' ? '#ffffff' : '#475569',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: searchFilter === 'offers' ? '0 1px 3px rgba(37,99,235,0.2)' : 'none'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          عليها عروض
          <span style={{
            background: searchFilter === 'offers' ? 'rgba(255,255,255,0.25)' : '#dbeafe',
            color: searchFilter === 'offers' ? '#ffffff' : '#1d4ed8',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem',
            fontWeight: 700
          }}>
            {filterStats.offers}
          </span>
        </button>

        {/* Near Expiry */}
        <button
          type="button"
          onClick={() => setSearchFilter('near_expiry')}
          style={{
            border: searchFilter === 'near_expiry' ? '1px solid #dc2626' : '1px solid #e2e8f0',
            background: searchFilter === 'near_expiry' ? '#dc2626' : '#f8fafc',
            color: searchFilter === 'near_expiry' ? '#ffffff' : '#475569',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: searchFilter === 'near_expiry' ? '0 1px 3px rgba(220,38,38,0.2)' : 'none'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 14 14" />
          </svg>
          قريبة الانتهاء
          <span style={{
            background: searchFilter === 'near_expiry' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
            color: searchFilter === 'near_expiry' ? '#ffffff' : '#b91c1c',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem',
            fontWeight: 700
          }}>
            {filterStats.near_expiry}
          </span>
        </button>

        {/* Stagnant */}
        <button
          type="button"
          onClick={() => setSearchFilter('stagnant')}
          style={{
            border: searchFilter === 'stagnant' ? '1px solid #d97706' : '1px solid #e2e8f0',
            background: searchFilter === 'stagnant' ? '#d97706' : '#f8fafc',
            color: searchFilter === 'stagnant' ? '#ffffff' : '#475569',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: searchFilter === 'stagnant' ? '0 1px 3px rgba(217,119,6,0.2)' : 'none'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          راكدة للتصريف
          <span style={{
            background: searchFilter === 'stagnant' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
            color: searchFilter === 'stagnant' ? '#ffffff' : '#b45309',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem'
          }}>
            {filterStats.stagnant}
          </span>
        </button>

        {/* High Margin */}
        <button
          type="button"
          onClick={() => setSearchFilter('high_margin')}
          style={{
            border: searchFilter === 'high_margin' ? '1px solid #059669' : '1px solid #e2e8f0',
            background: searchFilter === 'high_margin' ? '#059669' : '#f8fafc',
            color: searchFilter === 'high_margin' ? '#ffffff' : '#475569',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: searchFilter === 'high_margin' ? '0 1px 3px rgba(5,150,105,0.2)' : 'none'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          أعلى ربحية
          <span style={{
            background: searchFilter === 'high_margin' ? 'rgba(255,255,255,0.25)' : '#d1fae5',
            color: searchFilter === 'high_margin' ? '#ffffff' : '#047857',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem'
          }}>
            {filterStats.high_margin}
          </span>
        </button>

        {/* Overstocked */}
        <button
          type="button"
          onClick={() => setSearchFilter('overstock')}
          style={{
            border: searchFilter === 'overstock' ? '1px solid #7c3aed' : '1px solid #e2e8f0',
            background: searchFilter === 'overstock' ? '#7c3aed' : '#f8fafc',
            color: searchFilter === 'overstock' ? '#ffffff' : '#475569',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: searchFilter === 'overstock' ? '0 1px 3px rgba(124,58,237,0.2)' : 'none'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          فائض مخزون
          <span style={{
            background: searchFilter === 'overstock' ? 'rgba(255,255,255,0.25)' : '#ede9fe',
            color: searchFilter === 'overstock' ? '#ffffff' : '#6d28d9',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem'
          }}>
            {filterStats.overstock}
          </span>
        </button>

        {/* No Offers */}
        <button
          type="button"
          onClick={() => setSearchFilter('no_offers')}
          style={{
            border: searchFilter === 'no_offers' ? '1px solid #475569' : '1px solid #e2e8f0',
            background: searchFilter === 'no_offers' ? '#475569' : '#f8fafc',
            color: searchFilter === 'no_offers' ? '#ffffff' : '#475569',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: searchFilter === 'no_offers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          بدون عروض
          <span style={{
            background: searchFilter === 'no_offers' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
            color: searchFilter === 'no_offers' ? '#ffffff' : '#64748b',
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: '0.7rem'
          }}>
            {filterStats.no_offers}
          </span>
        </button>
      </div>

      {/* Results Container */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {isSearching ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            جاري البحث في قاعدة الأصناف...
          </div>
        ) : filteredSearchResults.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10, padding: '2px 4px' }}>
            {filteredSearchResults.map((prod) => {
              const prodRetail = Number((prod as any)?.retailPrice || (prod as any)?.retail_price || 0);
              const prodCost = Number((prod as any)?.costPrice || (prod as any)?.cost_price || 0);
              const prodStock = Number(prod.stock || 0);
              const prodMargin = prodRetail > 0 && prodCost > 0 ? ((prodRetail - prodCost) / prodRetail) * 100 : 0;
              const prodOffers = prod.offers || [];
              const hasActiveOffers = prodOffers.some((o) => !o.to || o.to >= todayIsoDate());
              const exp = (prod as any).expiryDate || prod.metadata?.expiryDate;
              let expDays: number | null = null;
              if (exp) {
                const expDate = new Date(`${String(exp).slice(0, 10)}T00:00:00`);
                if (!Number.isNaN(expDate.getTime())) {
                  expDays = Math.ceil((expDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
                }
              }

              return (
                <div
                  key={prod.id}
                  onClick={() => onSelectProduct(prod)}
                  style={{
                    background: '#ffffff',
                    border: hasActiveOffers ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 104,
                    gap: 6,
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = hasActiveOffers ? '#93c5fd' : '#e2e8f0';
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {/* Row 1 (Top): Product Name (Right) + Offer / Expiry Badges (Left) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                      }}
                      title={prod.name}
                    >
                      {prod.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {hasActiveOffers && (
                        <span style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          padding: '1px 6px',
                          borderRadius: 5,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                          </svg>
                          {prodOffers.length} {prodOffers.length === 1 ? 'عرض' : 'عروض'}
                        </span>
                      )}
                      {exp ? (
                        <span style={{
                          background: expDays !== null && expDays <= 45 ? '#fee2e2' : '#f8fafc',
                          border: expDays !== null && expDays <= 45 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                          color: expDays !== null && expDays <= 45 ? '#b91c1c' : '#64748b',
                          padding: '1px 5px',
                          borderRadius: 5,
                          fontSize: '0.68rem',
                          fontWeight: expDays !== null && expDays <= 45 ? 700 : 500
                        }}>
                          {expDays !== null && expDays <= 0 ? 'منتهي' : expDays !== null && expDays <= 45 ? `باقي ${expDays} يوم` : String(exp).slice(0, 10)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Row 2 (Middle): Barcode (Right) + Stock (Left) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                    <span style={{ fontFamily: 'monospace', color: prod.barcode ? '#475569' : '#94a3b8' }}>
                      {prod.barcode ? `باركود: ${prod.barcode}` : 'بدون باركود'}
                    </span>

                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600 }}>
                      المخزون: {prodStock}
                    </span>
                  </div>

                  {/* Row 3 (Bottom): Price (Right) + Profit Margin Badge (Left) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px dashed #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>سعر البيع:</span>
                      <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>
                        {formatCurrency(prodRetail)}
                      </span>
                    </div>

                    {prodMargin > 0 ? (
                      <span style={{
                        background: prodMargin >= 25 ? '#ecfdf5' : '#f8fafc',
                        border: prodMargin >= 25 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        color: prodMargin >= 25 ? '#047857' : '#64748b',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 600
                      }}>
                        ربح {prodMargin.toFixed(0)}%
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        اضغط للضبط
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery.trim() || searchFilter !== 'all' ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ color: '#94a3b8', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div style={{ fontWeight: 600, color: '#64748b' }}>لا توجد أصناف مطابقة للبحث أو الفلتر المحدد</div>
            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>جرب اختيار فلتر آخر أو تعديل نص البحث</div>
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ color: '#94a3b8', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>ابحث عن أي صنف لإدارة العروض الترويجية والخصومات الخاصة به</div>
            <div style={{ fontSize: '0.8rem', marginTop: 4, color: '#94a3b8' }}>اكتب اسم الصنف أو امسح الباركود للبدء مباشرة</div>
          </div>
        )}
      </div>
    </div>
  );
}
