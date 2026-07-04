import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { catalogApi } from '@/shared/api/catalog';
import { inventoryApi } from '@/features/inventory/api/inventory.api';

interface AssignProductsModalProps {
  locationId: number;
  locationName?: string;
  onClose: () => void;
}

export function AssignProductsModal({ locationId, locationName, onClose }: AssignProductsModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());

  const catalogQuery = useQuery({
    queryKey: ['catalogProducts'],
    queryFn: () => inventoryApi.products(),
  });

  const locationProductsQuery = useQuery({
    queryKey: ['locationCategoryProducts', locationId, 'all'],
    queryFn: () => inventoryApi.locationCategoryProducts(locationId, 'all'),
  });

  const assignMutation = useMutation({
    mutationFn: (productIds: number[]) => inventoryApi.assignProductsToLocation(locationId, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationCategoryProducts', locationId] });
      queryClient.invalidateQueries({ queryKey: ['locationCategories', locationId] });
      onClose();
    },
    onError: (err: any) => {
      console.error('Assign error:', err);
      alert(err?.message || 'حدث خطأ أثناء الإضافة للمخزن');
    }
  });

  const handleToggleProduct = (id: number) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProductIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedProductIds);
    filteredProducts.forEach(p => next.add(Number(p.id)));
    setSelectedProductIds(next);
  };

  const productsInLocation = useMemo(() => {
    if (!locationProductsQuery.data) return new Set<number>();
    return new Set((locationProductsQuery.data as any[]).map(p => Number(p.id)));
  }, [locationProductsQuery.data]);

  const availableProducts = useMemo(() => {
    if (!catalogQuery.data) return [];
    return (catalogQuery.data as any[]).filter(p => !productsInLocation.has(Number(p.id)));
  }, [catalogQuery.data, productsInLocation]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return availableProducts;
    const lower = searchQuery.toLowerCase();
    return availableProducts.filter(p => 
      (p.name && p.name.toLowerCase().includes(lower)) || 
      (p.barcode && p.barcode.toLowerCase().includes(lower))
    );
  }, [availableProducts, searchQuery]);

  const isLoading = catalogQuery.isLoading || locationProductsQuery.isLoading;

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div 
        style={{
          background: '#fff', borderRadius: '12px', padding: '24px',
          width: '90%', maxWidth: '600px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>إضافة أصناف لمخزن {locationName ? `(${locationName})` : ''}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>جاري التحميل...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="ابحث بالاسم أو الباركود..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
              <button type="button" className="secondary-button" onClick={handleSelectAllFiltered}>تحديد الكل (في البحث)</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا توجد أصناف غير مربوطة تطابق بحثك</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead style={{ backgroundColor: 'var(--surface-color)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', width: '40px' }}></th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>اسم الصنف</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>الباركود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr 
                        key={p.id} 
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: selectedProductIds.has(Number(p.id)) ? 'var(--primary-light)' : 'transparent' }}
                        onClick={() => handleToggleProduct(Number(p.id))}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedProductIds.has(Number(p.id))} 
                            readOnly
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{p.barcode || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 600 }}>تم تحديد: {selectedProductIds.size} صنف</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="secondary-button" onClick={onClose}>إلغاء</button>
                <button 
                  type="button" 
                  className="primary-button" 
                  disabled={selectedProductIds.size === 0 || assignMutation.isPending}
                  onClick={() => assignMutation.mutate(Array.from(selectedProductIds))}
                >
                  {assignMutation.isPending ? 'جاري الحفظ...' : 'حفظ وإضافة'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
