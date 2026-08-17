import { useState, useMemo, useCallback } from 'react';
import { systemAlert } from '@/shared/components/system-alert';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { catalogApi } from '@/shared/api/catalog';
import type { ProductRow, SortMode } from '../components/inventory-tree/inventoryTree.types';
import {
  QuickAssignModal,
  QuickTransferModal,
  QuickConsolidateModal,
  CategoryTransferModal,
} from '../components/inventory-tree/InventoryTreeModals';
import { BulkActionBar } from '../components/inventory-tree/BulkActionBar';
import { CategorySection } from '../components/inventory-tree/CategorySection';

export function InventoryTreePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [filterLocationId, setFilterLocationId] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(true);
  const [showUnassigned, setShowUnassigned] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  type ModalType = 'transfer' | 'assign' | 'categoryTransfer' | 'consolidate' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalProducts, setModalProducts] = useState<ProductRow[]>([]);
  const [categoryTransferData, setCategoryTransferData] = useState<{ name: string; products: ProductRow[] } | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Queries
  const productsQuery = useQuery({ queryKey: ['catalogProducts'], queryFn: () => inventoryApi.products() });
  const locationsQuery = useQuery({ queryKey: ['locations', 'inventoryTree'], queryFn: () => inventoryApi.locations() });
  const stocksQuery = useQuery({ queryKey: ['location-stocks'], queryFn: () => inventoryApi.locationStocks() });
  const categoriesQuery = useQuery({ queryKey: ['catalogCategories'], queryFn: () => catalogApi.categories() });

  const isLoading = productsQuery.isLoading || locationsQuery.isLoading || stocksQuery.isLoading || categoriesQuery.isLoading;

  const locations = useMemo(() => locationsQuery.data || [], [locationsQuery.data]);
  const allLocations = useMemo(() => locationsQuery.data || [], [locationsQuery.data]);
  const stocks = useMemo(() => stocksQuery.data || [], [stocksQuery.data]);
  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);
  const rawProducts = useMemo(() => productsQuery.data || [], [productsQuery.data]);

  const productRows = useMemo((): ProductRow[] => {
    return rawProducts.map((p: any) => {
      const locationStocks = stocks
        .filter((s: any) => String(s.productId) === String(p.id))
        .map((s: any) => {
          const loc = allLocations.find((l: any) => String(l.id) === String(s.locationId));
          return { locationId: String(s.locationId), locationName: loc ? String(loc.name) : `مخزن ${s.locationId}`, qty: Number(s.qty) };
        });

      const sumFromLocations = locationStocks.reduce((sum, s) => sum + s.qty, 0);
      const globalStock = Number(p.stock || p.stockQty || 0);
      const totalQty = Math.max(globalStock, sumFromLocations);

      const unassignedQty = globalStock > sumFromLocations ? globalStock - sumFromLocations : 0;

      const cat = categories.find((c: any) => String(c.id) === String(p.categoryId));
      return {
        id: String(p.id),
        name: String(p.name || ''),
        barcode: String(p.barcode || ''),
        categoryId: String(p.categoryId || ''),
        categoryName: cat ? String(cat.name) : (p.categoryName || 'بدون قسم'),
        locationStocks,
        totalQty,
        unassignedQty,
        isUnassigned: locationStocks.length === 0 || unassignedQty > 0,
      };
    });
  }, [rawProducts, stocks, allLocations, categories]);

  const filteredRows = useMemo(() => {
    let rows = productRows;

    // ── text search ────────────────────────────────────────────────────────────
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q));
    }

    if (showUnassigned) {
      rows = rows.filter((p) => p.isUnassigned);
    } else {
      if (filterLocationId) {
        // ── location filter: keep products that exist in this location ──────────
        // Helper: effective qty for a product in the selected location
        const locationQty = (p: ProductRow) =>
          p.locationStocks.find((s) => s.locationId === filterLocationId)?.qty ?? 0;

        // Keep only products that have a stock record in this location
        rows = rows.filter((p) => p.locationStocks.some((s) => s.locationId === filterLocationId));

        // When "show only with stock" is on, further filter by location qty > 0
        if (showOnlyWithStock) {
          rows = rows.filter((p) => locationQty(p) > 0);
        }

        // Sort by location qty
        if (sortMode === 'qtyDesc') rows = [...rows].sort((a, b) => locationQty(b) - locationQty(a));
        else if (sortMode === 'qtyAsc') rows = [...rows].sort((a, b) => locationQty(a) - locationQty(b));
      } else {
        // ── no location filter: use global totalQty ────────────────────────────
        if (showOnlyWithStock) {
          rows = rows.filter((p) => p.totalQty > 0);
        }
        if (sortMode === 'qtyDesc') rows = [...rows].sort((a, b) => b.totalQty - a.totalQty);
        else if (sortMode === 'qtyAsc') rows = [...rows].sort((a, b) => a.totalQty - b.totalQty);
      }
    }

    return rows;
  }, [productRows, search, showOnlyWithStock, showUnassigned, filterLocationId, sortMode]);

  const grouped = useMemo(() => {
    const map = new Map<string, { categoryName: string; products: ProductRow[] }>();
    for (const p of filteredRows) {
      const key = p.categoryId || '__none__';
      if (!map.has(key)) map.set(key, { categoryName: p.categoryName, products: [] });
      map.get(key)!.products.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].categoryName.localeCompare(b[1].categoryName, 'ar'));
  }, [filteredRows]);

  const stats = useMemo(() => ({
    totalProducts: productRows.length,
    withStock: productRows.filter((p) => p.totalQty > 0).length,
    unassigned: productRows.filter((p) => p.isUnassigned).length,
    totalQty: productRows.reduce((s, p) => s + p.totalQty, 0),
  }), [productRows]);

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectedProducts = useMemo(() => productRows.filter((p) => selectedIds.has(p.id)), [productRows, selectedIds]);

  const handleDone = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['location-stocks'] });
    queryClient.invalidateQueries({ queryKey: ['catalogProducts'] });
    queryClient.invalidateQueries({ queryKey: ['locations', 'inventoryTree'] });
    queryClient.invalidateQueries({ queryKey: ['catalogCategories'] });
    setActiveModal(null);
    setModalProducts([]);
    setCategoryTransferData(null);
    setSelectedIds(new Set());
  }, [queryClient]);

  const isAllExpanded = collapsedCategories.size === 0;
  const toggleExpandCollapseAll = useCallback(() => {
    if (isAllExpanded) {
      setCollapsedCategories(new Set(grouped.map(g => g[0]))); // Collapse all
    } else {
      setCollapsedCategories(new Set()); // Expand all
    }
  }, [isAllExpanded, grouped]);

  const allSelected = filteredRows.length > 0 && selectedIds.size === filteredRows.length;
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map(p => p.id)));
    }
  }, [allSelected, filteredRows]);

  const handleRemoveLocation = async (productId: string, locationId: string) => {
    try {
      await inventoryApi.removeProductFromLocation(Number(locationId), Number(productId));
      await queryClient.invalidateQueries({ queryKey: ['location-stocks'] });
    } catch (e: any) {
      if (e?.status === 404) {
        // If it's already deleted in the backend but stuck in UI cache, force refetch
        await queryClient.invalidateQueries({ queryKey: ['location-stocks'] });
      } else {
        systemAlert(e?.message || 'حدث خطأ غير متوقع');
      }
    }
  };

  const openTransfer = (products: ProductRow[]) => { setModalProducts(products); setActiveModal('transfer'); };
  const openAssign = (products: ProductRow[]) => { setModalProducts(products); setActiveModal('assign'); };
  const openCategoryTransfer = (name: string, products: ProductRow[]) => { setCategoryTransferData({ name, products }); setActiveModal('categoryTransfer'); };
  const openConsolidate = (products: ProductRow[]) => { setModalProducts(products); setActiveModal('consolidate'); };

  return (
    <main className="document-prototype-column" style={{ maxWidth: '1200px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>🌳 شجرة المخازن الشاملة</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #666)', fontSize: '13px' }}>
            عرض تفصيلي لكل الأصناف ورصيدها — اضغط على أي صنف لتحديده، أو حدد عدة أصناف لعمليات جماعية
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/inventory/issue-order/new')} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary, #170c5c)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            + إذن صرف
          </button>
          <button onClick={() => navigate('/inventory/warehouses-management')} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)', background: 'transparent', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            ⚙️ إدارة المخازن
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي الأصناف', value: stats.totalProducts, icon: '📦', color: 'var(--primary, #170c5c)' },
          { label: 'أصناف بها رصيد', value: stats.withStock, icon: '✅', color: '#16a34a' },
          { label: 'غير مربوطة', value: stats.unassigned, icon: '⚠️', color: '#d97706', onClick: () => setShowUnassigned(true) },
          { label: 'إجمالي الوحدات', value: stats.totalQty.toLocaleString(), icon: '🔢', color: '#7c3aed' },
          { label: 'عدد المخازن', value: locations.length, icon: '🏪', color: '#0891b2' },
        ].map((c) => (
          <div key={c.label} onClick={c.onClick} style={{ background: '#fff', border: `1px solid ${c.color}22`, borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: c.onClick ? 'pointer' : 'default' }}>
            <div style={{ fontSize: '20px', marginBottom: '5px' }}>{c.icon}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #888)', marginTop: '2px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
          <input type="text" placeholder="بحث باسم الصنف أو الباركود..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        <select value={filterLocationId} onChange={(e) => { setFilterLocationId(e.target.value); setShowUnassigned(false); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', fontSize: '13px', flex: '1 1 150px' }}>
          <option value="">كل المخازن</option>
          {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', fontSize: '13px', flex: '1 1 150px' }}>
          <option value="default">ترتيب افتراضي</option>
          <option value="qtyDesc">الأعلى رصيداً أولاً</option>
          <option value="qtyAsc">الأقل رصيداً أولاً</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showOnlyWithStock} onChange={(e) => { setShowOnlyWithStock(e.target.checked); if (e.target.checked) setShowUnassigned(false); }} />
          بها رصيد فقط
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showUnassigned} onChange={(e) => { setShowUnassigned(e.target.checked); if (e.target.checked) setShowOnlyWithStock(false); }} />
          غير مربوطة ⚠️
        </label>
        {(search || filterLocationId || showOnlyWithStock || showUnassigned || sortMode !== 'default') && (
          <button onClick={() => { setSearch(''); setFilterLocationId(''); setShowOnlyWithStock(false); setShowUnassigned(false); setSortMode('default'); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}>
            ✕ مسح الفلاتر
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #888)' }}>
          عرض {filteredRows.length} صنف من أصل {productRows.length}
          {selectedIds.size > 0 && <span style={{ marginRight: '8px', color: 'var(--primary, #170c5c)', fontWeight: 700 }}>— {selectedIds.size} صنف محدد</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSelectAll} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary, #170c5c)', background: allSelected ? 'var(--primary, #170c5c)' : 'transparent', color: allSelected ? '#fff' : 'var(--primary, #170c5c)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            {allSelected ? 'إلغاء التحديد ⬜' : 'تحديد الكل ☑️'}
          </button>
          <button onClick={toggleExpandCollapseAll} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #ccc)', background: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            {isAllExpanded ? 'ضم الأقسام ▶' : 'فرد الأقسام ▼'}
          </button>
        </div>
      </div>

      {/* Tree */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary, #888)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          جاري التحميل...
        </div>
      ) : filteredRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary, #888)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          لا توجد نتائج
        </div>
      ) : (
        <div style={{ paddingBottom: selectedIds.size > 0 ? '80px' : '0' }}>
          {grouped.map(([catKey, { categoryName, products }]) => (
            <CategorySection
              key={catKey}
              categoryName={categoryName}
              products={products}
              locations={locations as any}
              filterLocationId={filterLocationId}
              selectedIds={selectedIds}
              collapsed={collapsedCategories.has(catKey)}
              onToggleCollapse={() => {
                setCollapsedCategories(prev => {
                  const next = new Set(prev);
                  if (next.has(catKey)) next.delete(catKey);
                  else next.add(catKey);
                  return next;
                });
              }}
              onToggleSelect={toggleSelect}
              onTransfer={(p) => openTransfer([p])}
              onAssign={(p) => openAssign([p])}
              onConsolidate={(p) => openConsolidate([p])}
              onTransferCategory={openCategoryTransfer}
              onRemoveLocation={handleRemoveLocation}
            />
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onAssign={() => openAssign(selectedProducts)}
            onTransfer={() => openTransfer(selectedProducts)}
            onConsolidate={() => openConsolidate(selectedProducts)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Modals */}
      {activeModal === 'assign' && (
        <QuickAssignModal
          products={modalProducts}
          locations={locations as any}
          onClose={() => setActiveModal(null)}
          onDone={handleDone}
        />
      )}
      {activeModal === 'transfer' && (
        <QuickTransferModal
          products={modalProducts}
          locations={locations as any}
          onClose={() => setActiveModal(null)}
          onDone={handleDone}
        />
      )}
      {activeModal === 'categoryTransfer' && categoryTransferData && (
        <CategoryTransferModal
          categoryName={categoryTransferData.name}
          products={categoryTransferData.products}
          locations={locations as any}
          onClose={() => setActiveModal(null)}
          onDone={handleDone}
        />
      )}
      {activeModal === 'consolidate' && (
        <QuickConsolidateModal
          products={modalProducts}
          locations={locations as any}
          onClose={() => setActiveModal(null)}
          onDone={handleDone}
        />
      )}
    </main>
  );
}





