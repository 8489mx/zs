import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { catalogApi } from '@/shared/api/catalog';
import { AssignProductsModal } from '../components/AssignProductsModal';
import { formatCurrency } from '@/lib/format';

export function WarehouseDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const locationId = Number(id);
  const { locationsQuery, productsQuery, locationStocksQuery } = useInventoryActionCatalog();
  const location = locationsQuery.data?.find((l) => String(l.id) === String(id));

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ['catalogCategories'], queryFn: () => catalogApi.categories() });

  const rawProducts = useMemo(() => productsQuery.data || [], [productsQuery.data]);
  const stocks = useMemo(() => locationStocksQuery.data || [], [locationStocksQuery.data]);
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);

  const locationProducts = useMemo(() => {
    return rawProducts.map((p: any) => {
      const productStocks = stocks.filter((s: any) => String(s.productId) === String(p.id));
      const stockInThisLocation = productStocks.find((s: any) => String(s.locationId) === String(locationId));
      const sumFromLocations = productStocks.reduce((sum: number, s: any) => sum + Number(s.qty || 0), 0);
      const globalStockFromProduct = Number(p.stock || p.stockQty || 0);
      const globalStockQty = sumFromLocations > 0 ? sumFromLocations : globalStockFromProduct;

      return {
        ...p,
        stockQty: stockInThisLocation ? Number(stockInThisLocation.qty) : 0,
        globalStockQty,
        isAssignedToThisLocation: !!stockInThisLocation,
      };
    });
  }, [rawProducts, stocks, locationId]);

  const stats = useMemo(() => {
    const assigned = locationProducts.filter((p) => p.isAssignedToThisLocation);
    const inStock = assigned.filter((p) => p.stockQty > 0);
    const totalQty = assigned.reduce((sum, p) => sum + p.stockQty, 0);
    const totalVal = assigned.reduce((sum, p) => sum + (p.stockQty * (Number(p.costPrice || p.cost || 0))), 0);

    return [
      { key: 'total_items', label: 'إجمالي الأصناف المسجلة', value: assigned.length },
      { key: 'in_stock_items', label: 'أصناف بها رصيد', value: inStock.length },
      { key: 'total_units', label: 'إجمالي الوحدات بالمخزن', value: totalQty.toLocaleString() },
      { key: 'total_value', label: 'إجمالي القيمة التقديرية', value: formatCurrency(totalVal) },
    ] as const;
  }, [locationProducts]);

  const visibleCategories = useMemo(() => {
    const categoriesMap = new Map<string, { id: string; name: string; assignedProductCount: number; positiveStockProductCount: number }>();
    categories.forEach((cat: any) => {
      categoriesMap.set(String(cat.id), { id: String(cat.id), name: cat.name, assignedProductCount: 0, positiveStockProductCount: 0 });
    });
    categoriesMap.set('uncategorized', { id: 'uncategorized', name: 'بدون قسم', assignedProductCount: 0, positiveStockProductCount: 0 });

    locationProducts.forEach((p) => {
      if (!p.isAssignedToThisLocation) return;
      const catId = p.categoryId ? String(p.categoryId) : 'uncategorized';
      const cat = categoriesMap.get(catId);
      if (cat) {
        cat.assignedProductCount++;
        if (p.stockQty > 0) cat.positiveStockProductCount++;
      }
    });

    return Array.from(categoriesMap.values()).filter((cat) => {
      if (showZeroStock) return cat.assignedProductCount > 0;
      return cat.positiveStockProductCount > 0;
    });
  }, [locationProducts, categories, showZeroStock]);

  const visibleProducts = useMemo(() => {
    return locationProducts.filter((p) => {
      if (!p.isAssignedToThisLocation) return false;
      if (selectedCategoryId !== null && selectedCategoryId !== 'all') {
        const pCatId = p.categoryId ? String(p.categoryId) : 'uncategorized';
        if (pCatId !== String(selectedCategoryId)) return false;
      }
      if (!showZeroStock && p.stockQty <= 0) return false;
      if (productSearch.trim()) {
        const q = productSearch.trim().toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesBarcode = p.barcode?.toLowerCase().includes(q);
        if (!matchesName && !matchesBarcode) return false;
      }
      return true;
    });
  }, [locationProducts, selectedCategoryId, showZeroStock, productSearch]);

  const isLoading = productsQuery.isLoading || locationStocksQuery.isLoading || categoriesQuery.isLoading;

  const currentCategoryName = useMemo(() => {
    if (selectedCategoryId === 'all') return 'جميع الأقسام';
    if (!selectedCategoryId) return '';
    return visibleCategories.find((c: any) => c.id === String(selectedCategoryId))?.name || 'القسم المختار';
  }, [selectedCategoryId, visibleCategories]);

  return (
    <main className="document-prototype-column" dir="rtl" style={{ maxWidth: '1280px', paddingBottom: '32px' }}>
      <PageHeader 
        title={`مخزن: ${location?.name || '...'}`} 
        description={`عرض تفصيلي لأقسام وأصناف ${location?.name || 'المخزن'} وأرصدتها الفعلية`} 
        actions={(
          <div className="actions compact-actions page-header-actions">
            <Button variant="primary" onClick={() => setIsAssignModalOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginInlineEnd: 6 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              إضافة أصناف للمخزن
            </Button>
            <Button variant="secondary" onClick={() => navigate('/inventory/warehouses')}>
              العودة للمخازن
            </Button>
          </div>
        )}
      />

      <StatsGrid items={stats} className="stats-grid compact-grid grid-cols-4" />

      {/* Toolbar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
          {selectedCategoryId !== null && (
            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="بحث باسم الصنف أو الباركود..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #cbd5e1)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#334155', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showZeroStock} 
              onChange={(e) => setShowZeroStock(e.target.checked)}
              style={{ width: '15px', height: '15px', accentColor: 'var(--primary, #170c5c)' }}
            />
            إظهار الأرصدة الصفرية
          </label>
        </div>

        {selectedCategoryId !== null && (
          <Button variant="secondary" onClick={() => { setSelectedCategoryId(null); setProductSearch(''); }}>
            ← العودة للأقسام
          </Button>
        )}
      </div>

      {isAssignModalOpen && (
        <AssignProductsModal locationId={locationId} locationName={location?.name} onClose={() => setIsAssignModalOpen(false)} />
      )}

      {selectedCategoryId === null ? (
        <FormSection title="أقسام المخزن">
          {isLoading ? (
            <div className="muted small" style={{ padding: 32, textAlign: 'center' }}>جاري التحميل...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginTop: '12px' }}>
              {/* All Categories Card */}
              <div 
                className="surface-card hoverable-card"
                style={{ 
                  padding: '24px 20px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '12px',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSelectedCategoryId('all')}
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary, #170c5c)',
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>كل الأقسام</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>عرض شامل لكافة الأصناف</span>
                </div>
              </div>

              {/* Individual Category Cards */}
              {visibleCategories.map((cat: any) => (
                <div 
                  key={cat.id} 
                  className="surface-card hoverable-card"
                  style={{ 
                    padding: '24px 20px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '12px',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: '14px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-9"/><path d="M15.17 2.38a2 2 0 0 0-1.66 0L4 6.78a2 2 0 0 0-1.12 1.84v6.76a2 2 0 0 0 1.12 1.84l9.5 4.38a2 2 0 0 0 1.66 0l9.5-4.38a2 2 0 0 0 1.12-1.84V8.62a2 2 0 0 0-1.12-1.84z"/><path d="m20 15-4-2.25M4 15l4-2.25M12 13l4-2.25M12 13l-4-2.25"/></svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{cat.name}</h3>
                    <span style={{ 
                      fontSize: '11.5px', 
                      fontWeight: 700, 
                      padding: '2px 8px', 
                      borderRadius: '8px', 
                      backgroundColor: '#f1f5f9', 
                      color: '#475569' 
                    }}>
                      {showZeroStock ? cat.assignedProductCount : cat.positiveStockProductCount} صنف
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      ) : (
        <FormSection title={`الأصناف — ${currentCategoryName}`}>
          {isLoading ? (
            <div className="muted small" style={{ padding: 32, textAlign: 'center' }}>جاري التحميل...</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', background: '#ffffff', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ backgroundColor: 'var(--surface-2, #f8fafc)', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                  <tr>
                    <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 700, fontSize: '13px' }}>اسم الصنف</th>
                    <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 700, fontSize: '13px' }}>الباركود</th>
                    <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>الرصيد في هذا المخزن</th>
                    <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>الرصيد الإجمالي بالنظام</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product: any) => {
                    const isZero = Number(product.stockQty ?? 0) <= 0;
                    return (
                      <tr 
                        key={product.id} 
                        style={{ borderBottom: '1px solid var(--border, #f1f5f9)', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0f172a' }}>{product.name}</td>
                        <td style={{ padding: '12px 18px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{product.barcode || '—'}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '13px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: isZero ? '#fee2e2' : '#ecfdf5',
                            color: isZero ? '#dc2626' : '#047857',
                            border: `1px solid ${isZero ? '#fecaca' : '#a7f3d0'}`,
                          }}>
                            {product.stockQty ?? product.qty ?? 0}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                          {product.globalStockQty ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {visibleProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        {showZeroStock ? 'لا توجد أصناف مربوطة بهذا المخزن في هذا القسم' : 'لا توجد أصناف متاحة في هذا القسم برصيد إيجابي'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </FormSection>
      )}
    </main>
  );
}
