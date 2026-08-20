
import type { ProductRow } from './inventoryTree.types';
import { ProductTreeRow } from './ProductTreeRow';

function CategorySection({
  categoryName,
  products,
  filterLocationId,
  selectedIds,
  onToggleSelect,
  onTransfer,
  onAssign,
  onConsolidate,
  onTransferCategory,
  onRemoveLocation,
  collapsed,
  onToggleCollapse,
}: {
  categoryName: string;
  products: ProductRow[];
  locations: { id: string; name: string }[];
  filterLocationId: string;
  selectedIds: Set<string>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleSelect: (id: string) => void;
  onTransfer: (p: ProductRow) => void;
  onAssign: (p: ProductRow) => void;
  onConsolidate?: (p: ProductRow) => void;
  onTransferCategory: (categoryName: string, products: ProductRow[]) => void;
  onRemoveLocation: (productId: string, locationId: string) => void;
}) {
  const totalQty = products.reduce((sum, p) => {
    if (filterLocationId) return sum + (p.locationStocks.find((s) => s.locationId === filterLocationId)?.qty ?? 0);
    return sum + p.totalQty;
  }, 0);

  const allSelected = products.every((p) => selectedIds.has(p.id));
  const anySelected = products.some((p) => selectedIds.has(p.id));

  const toggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allSelected) {
      products.forEach((p) => selectedIds.has(p.id) && onToggleSelect(p.id));
    } else {
      products.forEach((p) => !selectedIds.has(p.id) && onToggleSelect(p.id));
    }
  };

  return (
    <div style={{ border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', background: '#ffffff', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
      {/* Header */}
      <div
        onClick={onToggleCollapse}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          cursor: 'pointer',
          background: 'var(--surface-2, #f8fafc)',
          borderBottom: collapsed ? 'none' : '1px solid var(--border, #e2e8f0)',
          userSelect: 'none',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = anySelected && !allSelected; }}
            onClick={toggleAll}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary, #170c5c)' }}
          />
          <span style={{ fontSize: '12px', color: '#64748b' }}>{collapsed ? '◀' : '▼'}</span>
          <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>{categoryName}</span>
          <span style={{ background: '#e2e8f0', color: '#334155', borderRadius: '16px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
            {products.length} صنف
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: '#eef2ff', color: 'var(--primary, #170c5c)', borderRadius: '8px', padding: '4px 12px', fontWeight: 800, fontSize: '13px', border: '1px solid #c7d2fe' }}>
            الإجمالي: {totalQty.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTransferCategory(categoryName, products); }}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ↔ نقل القسم
          </button>
        </div>
      </div>

      {/* Sub-header */}
      {!collapsed && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 110px 80px 1fr 140px', gap: '8px', padding: '8px 18px', background: '#fafbfc', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <span />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>الصنف</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>القسم</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>الرصيد الكلي</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>أماكن التخزين والرصيد</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textAlign: 'left' }}>إجراءات</span>
          </div>
          {products.map((product) => (
            <ProductTreeRow
              key={product.id}
              product={product}
              filterLocationId={filterLocationId}
              isSelected={selectedIds.has(product.id)}
              onToggleSelect={onToggleSelect}
              onTransfer={onTransfer}
              onAssign={onAssign}
              onConsolidate={onConsolidate}
              onRemoveLocation={onRemoveLocation}
            />
          ))}
        </>
      )}
    </div>
  );
}

export { CategorySection };
