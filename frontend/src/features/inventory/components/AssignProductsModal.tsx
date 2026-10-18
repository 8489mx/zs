import { useTranslation } from 'react-i18next';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { catalogApi } from '@/shared/api/catalog';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { systemAlert } from '@/shared/components/system-alert';

interface AssignProductsModalProps {
  locationId: number;
  locationName?: string;
  onClose: () => void;
}

export function AssignProductsModal({ locationId, locationName, onClose }: AssignProductsModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [transferSelections, setTransferSelections] = useState<Record<number, { fromLocationId: number, qty: number }>>({});

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const catalogQuery = useQuery({
    queryKey: ['catalogProducts'],
    queryFn: () => inventoryApi.products(),
  });

  const locationProductsQuery = useQuery({
    queryKey: ['locationCategoryProducts', locationId, 'all'],
    queryFn: () => inventoryApi.locationCategoryProducts(locationId, 'all'),
  });

  const locationsQuery = useQuery({
    queryKey: ['locations', 'inventoryTree'],
    queryFn: () => inventoryApi.locations(),
  });

  const categoriesQuery = useQuery({
    queryKey: ['catalogCategories'],
    queryFn: () => catalogApi.categories(),
  });

  const stocksQuery = useQuery({
    queryKey: ['locationStocks'],
    queryFn: () => inventoryApi.locationStocks(),
  });

  const assignMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      // 1. Assign products to location
      await inventoryApi.assignProductsToLocation(locationId, productIds);
      
      // 2. Perform any selected transfers
      const transfersBySource = new Map<number, { productId: number; qty: number }[]>();
      
      for (const [productIdStr, transfer] of Object.entries(transferSelections)) {
        if (!selectedProductIds.has(Number(productIdStr))) continue;
        if (!transfer.qty || transfer.qty <= 0 || !transfer.fromLocationId) continue;
        
        if (!transfersBySource.has(transfer.fromLocationId)) {
          transfersBySource.set(transfer.fromLocationId, []);
        }
        transfersBySource.get(transfer.fromLocationId)!.push({
          productId: Number(productIdStr),
          qty: transfer.qty
        });
      }

      // Execute transfers sequentially
      for (const [fromLocationId, items] of Array.from(transfersBySource.entries())) {
        await inventoryApi.internalTransferProducts({
          fromLocationId,
          toLocationId: locationId,
          items,
          note: `نقل مباشر أثناء تعريف الصنف على مخزن ${locationName || locationId}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationCategoryProducts', locationId] });
      queryClient.invalidateQueries({ queryKey: ['locationCategories', locationId] });
      queryClient.invalidateQueries({ queryKey: ['locationStocks'] });
      queryClient.invalidateQueries({ queryKey: ['catalogProducts'] });
      onClose();
    },
    onError: (err: any) => {
      console.error('Assign/Transfer error:', err);
      systemAlert(err?.message || 'حدث خطأ أثناء الحفظ أو نقل الرصيد');
    }
  });

  const handleToggleProduct = (id: number) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) {
      next.delete(id);
      const newTransfers = { ...transferSelections };
      delete newTransfers[id];
      setTransferSelections(newTransfers);
    } else {
      next.add(id);
    }
    setSelectedProductIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedProductIds);
    filteredProducts.forEach(p => next.add(Number(p.id)));
    setSelectedProductIds(next);
  };

  const updateTransfer = (productId: number, fromLocationId: number, qty: number) => {
    setTransferSelections(prev => ({
      ...prev,
      [productId]: { fromLocationId, qty }
    }));
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

  const isLoading = catalogQuery.isLoading || locationProductsQuery.isLoading || locationsQuery.isLoading || stocksQuery.isLoading || categoriesQuery.isLoading;
  const locationsData = locationsQuery.data || [];
  const stocksData = stocksQuery.data || [];
  const categoriesData = categoriesQuery.data || [];

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      title={`ربط أصناف ونقل أرصدة لمخزن ${locationName ? `(${locationName})` : ''}`}
      subtitle={t('inventory.assign_products_modal.s0', "إضافة أصناف جديدة للمخزن ونقل أرصدة من مخازن أخرى")}
      size="lg"
      footerActions={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>{t('inventory.assign_products_modal.s1', "تم تحديد:")} {selectedProductIds.size} {t('inventory.assign_products_modal.s2', "صنف")}</span>
          <StandardDialogFooter
            onCancel={onClose}
            cancelLabel={t('inventory.assign_products_modal.s3', "إلغاء")}
            primaryLabel={assignMutation.isPending ? t('inventory.assign_products_modal.s4', "جاري الحفظ ونقل الأرصدة...") : t('inventory.assign_products_modal.s5', "حفظ وإضافة")}
            onPrimary={() => assignMutation.mutate(Array.from(selectedProductIds))}
            isPrimaryLoading={assignMutation.isPending}
            isPrimaryDisabled={selectedProductIds.size === 0 || assignMutation.isPending}
          />
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('inventory.assign_products_modal.s6', "جاري التحميل...")}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder={t('inventory.assign_products_modal.s7', "ابحث بالاسم أو الباركود...")} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
              <button type="button" className="secondary-button" onClick={handleSelectAllFiltered}>{t('inventory.assign_products_modal.s8', "تحديد الكل (في البحث)")}</button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('inventory.assign_products_modal.s9', "لا توجد أصناف غير مربوطة تطابق بحثك")}</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', tableLayout: 'fixed' }}>
                  <thead style={{ backgroundColor: 'var(--surface-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', width: '40px' }}></th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', width: '35%' }}>{t('inventory.assign_products_modal.s10', "اسم الصنف")}</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', width: '30%' }}>{t('inventory.assign_products_modal.s11', "القسم")}</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', width: '35%' }}>{t('inventory.assign_products_modal.s12', "إجمالي الرصيد بالنظام")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                      const isSelected = selectedProductIds.has(Number(p.id));
                      const productStocks = stocksData.filter(s => {
                        if (String(s.productId) !== String(p.id) || Number(s.qty) <= 0) return false;
                        const loc = locationsData.find(l => String(l.id) === String(s.locationId));
                        return loc && !loc.name.includes(t('inventory.assign_products_modal.s13', "(محذوف)"));
                      });
                      const totalStock = productStocks.reduce((sum, s) => sum + Number(s.qty), 0);
                      
                      return (
                        <React.Fragment key={p.id}>
                          <tr 
                            style={{ borderBottom: isSelected && productStocks.length > 0 ? 'none' : '1px solid var(--border-color)', cursor: 'pointer', background: isSelected ? 'var(--primary-light)' : 'transparent' }}
                            onClick={() => handleToggleProduct(Number(p.id))}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                readOnly
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                              {p.name}
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{p.barcode || '-'}</div>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                              {categoriesData.find((c: any) => String(c.id) === String(p.categoryId))?.name || '-'}
                            </td>
                            <td style={{ padding: '12px 16px', color: totalStock > 0 ? 'var(--success-color)' : 'var(--text-secondary)', fontWeight: totalStock > 0 ? 600 : 400 }}>
                              {totalStock} {t('inventory.assign_products_modal.s14', "قطعة")}
                            </td>
                          </tr>
                          {isSelected && productStocks.length > 0 && (
                            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--primary-light)' }}>
                              <td colSpan={4} style={{ padding: '0 16px 16px 48px' }}>
                                <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)' }}>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('inventory.assign_products_modal.s15', "خيارات النقل الداخلي المباشر (اختياري)")}</div>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ minWidth: '220px' }}>
                                      <CustomSelect
                                        value={transferSelections[Number(p.id)]?.fromLocationId ? String(transferSelections[Number(p.id)]?.fromLocationId) : ''}
                                        onChange={(val) => updateTransfer(Number(p.id), val ? Number(val) : 0, transferSelections[Number(p.id)]?.qty || 0)}
                                        options={[
                                          { value: '', label: t('inventory.assign_products_modal.s16', "-- اختر المخزن لسحب الرصيد --") },
                                          ...productStocks.map((s) => {
                                            const loc = locationsData.find((l) => String(l.id) === String(s.locationId));
                                            return {
                                              value: String(s.locationId),
                                              label: `${loc?.name || `مخزن ${s.locationId}`} (متاح: ${s.qty})`,
                                            };
                                          }),
                                        ]}
                                        placeholder={t('inventory.assign_products_modal.s17', "-- اختر المخزن لسحب الرصيد --")}
                                      />
                                    </div>
                                    
                                    <div style={{ 
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      opacity: transferSelections[Number(p.id)]?.fromLocationId ? 1 : 0,
                                      pointerEvents: transferSelections[Number(p.id)]?.fromLocationId ? 'auto' : 'none',
                                      transition: 'opacity 0.2s'
                                    }}>
                                      <input 
                                        type="number" 
                                        min={0}
                                        max={productStocks.find(s => String(s.locationId) === String(transferSelections[Number(p.id)]?.fromLocationId))?.qty || 0}
                                        placeholder={t('inventory.assign_products_modal.s18', "الكمية")}
                                        value={transferSelections[Number(p.id)]?.qty || ''}
                                        onChange={(e) => updateTransfer(Number(p.id), transferSelections[Number(p.id)].fromLocationId, Number(e.target.value))}
                                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', width: '120px' }}
                                      />
                                      <button 
                                        type="button" 
                                        className="secondary-button"
                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                        onClick={() => {
                                          const maxQty = productStocks.find(s => String(s.locationId) === String(transferSelections[Number(p.id)]?.fromLocationId))?.qty || 0;
                                          updateTransfer(Number(p.id), transferSelections[Number(p.id)].fromLocationId, Number(maxQty));
                                        }}
                                      >{t('inventory.assign_products_modal.s19', "نقل الكل")}</button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </StandardDialog>
  );
}
