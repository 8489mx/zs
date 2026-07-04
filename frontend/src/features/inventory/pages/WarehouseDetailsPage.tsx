import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { AssignProductsModal } from '../components/AssignProductsModal';

export function WarehouseDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const locationId = Number(id);
  const { locationsQuery } = useInventoryActionCatalog();
  const location = locationsQuery.data?.find((l) => l.id === id);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['locationCategories', locationId],
    queryFn: () => inventoryApi.locationCategories(locationId),
    enabled: !!locationId,
  });

  const productsQuery = useQuery({
    queryKey: ['locationCategoryProducts', locationId, selectedCategoryId],
    queryFn: () => inventoryApi.locationCategoryProducts(locationId, selectedCategoryId!),
    enabled: !!locationId && selectedCategoryId !== null,
  });

  const visibleCategories = (categoriesQuery.data || []).filter((cat: any) => {
    if (showZeroStock) return Number(cat.assignedProductCount) > 0;
    return Number(cat.positiveStockProductCount) > 0;
  });

  const visibleProducts = (productsQuery.data || []).filter((p: any) => {
    if (showZeroStock) return true;
    return Number(p.stockQty ?? p.qty ?? 0) > 0;
  });

  return (
    <main className="document-prototype-column">
      <PageHeader 
        title={`مخزن: ${location?.name || '...'}`} 
        description="استعراض الأقسام والأصناف الموجودة داخل المخزن" 
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={showZeroStock} onChange={(e) => setShowZeroStock(e.target.checked)} />
              إظهار الأقسام والأصناف ذات الرصيد الصفري
            </label>
            <button type="button" className="primary-button" onClick={() => setIsAssignModalOpen(true)}>إضافة أصناف للمخزن</button>
            <span className="nav-pill" onClick={() => navigate('/inventory/warehouses')}>العودة للمخازن</span>
          </div>
        }
      />

      {isAssignModalOpen && (
        <AssignProductsModal locationId={locationId} onClose={() => setIsAssignModalOpen(false)} />
      )}

      {selectedCategoryId === null ? (
        <FormSection title="أقسام المخزن">
          {categoriesQuery.isLoading ? (
            <div className="muted small" style={{ padding: 20, textAlign: 'center' }}>جاري التحميل...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', padding: '16px' }}>
              <div 
                className="surface-card hoverable-card"
                style={{ 
                  padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', justifyContent: 'center', gap: '12px',
                  border: '1px solid var(--border-color)', borderRadius: '8px',
                  transition: 'all 0.2s ease', backgroundColor: 'var(--surface-color)'
                }}
                onClick={() => setSelectedCategoryId('all')}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, color: 'var(--primary-color)' }}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>كل الأقسام</h3>
              </div>
              {visibleCategories.map((cat: any) => (
                <div 
                  key={cat.id} 
                  className="surface-card hoverable-card"
                  style={{ 
                    padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', 
                    alignItems: 'center', justifyContent: 'center', gap: '12px',
                    border: '1px solid var(--border-color)', borderRadius: '8px',
                    transition: 'all 0.2s ease', backgroundColor: 'var(--surface-color)'
                  }}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, color: 'var(--primary-color)' }}><path d="M12 22v-9"/><path d="M15.17 2.38a2 2 0 0 0-1.66 0L4 6.78a2 2 0 0 0-1.12 1.84v6.76a2 2 0 0 0 1.12 1.84l9.5 4.38a2 2 0 0 0 1.66 0l9.5-4.38a2 2 0 0 0 1.12-1.84V8.62a2 2 0 0 0-1.12-1.84z"/><path d="m20 15-4-2.25M4 15l4-2.25M12 13l4-2.25M12 13l-4-2.25"/></svg>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{cat.name}</h3>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      ) : (
        <FormSection title={`الأصناف - ${selectedCategoryId === 'all' ? 'كل الأقسام' : categoriesQuery.data?.find((c: any) => c.id === selectedCategoryId)?.name}`} actions={<button type="button" className="secondary-button" onClick={() => setSelectedCategoryId(null)}>العودة للأقسام</button>}>
          {productsQuery.isLoading ? (
            <div className="muted small" style={{ padding: 20, textAlign: 'center' }}>جاري التحميل...</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>اسم الصنف</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>الباركود</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>الرصيد في هذا المخزن</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>الرصيد الإجمالي بالنظام</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product: any) => (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>{product.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{product.barcode || '-'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: Number(product.stockQty ?? 0) === 0 ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{product.stockQty ?? product.qty ?? 0}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{product.globalStockQty ?? '-'}</td>
                    </tr>
                  ))}
                  {visibleProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
