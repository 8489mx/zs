
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
          padding: '10px 14px',
          cursor: 'pointer',
          background: 'var(--surface-2, #f8fafc)',
          borderBottom: collapsed ? 'none' : '1px solid var(--border, #e2e8f0)',
          userSelect: 'none',
          transition: 'background 0.15s ease',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = anySelected && !allSelected; }}
            onClick={toggleAll}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary, #170c5c)', flexShrink: 0 }}
          />
          <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>{collapsed ? '◀' : '▼'}</span>
          <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{categoryName}</span>
          <span style={{ background: '#e2e8f0', color: '#334155', borderRadius: '12px', padding: '1px 7px', fontSize: '10.5px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {products.length} صنف
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ background: '#eef2ff', color: 'var(--primary, #170c5c)', borderRadius: '6px', padding: '3px 8px', fontWeight: 800, fontSize: '11.5px', border: '1px solid #c7d2fe', whiteSpace: 'nowrap' }}>
            الإجمالي: {totalQty.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTransferCategory(categoryName, products); }}
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              height: '26px',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          >
            ← نقل القسم
          </button>
        </div>
      </div>

      {/* Sub-header & table rows */}
      {!collapsed && (
        <div className="inventory-tree-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <div style={{ minWidth: '760px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px minmax(200px, 2fr) 120px 100px minmax(220px, 3fr) 150px', gap: '12px', padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid var(--border, #e2e8f0)', alignItems: 'center' }}>
              <span />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'start' }}>الصنف</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'start' }}>القسم</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>الرصيد الكلي</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'start' }}>أماكن التخزين والرصيد</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'end', paddingInlineEnd: '8px' }}>إجراءات</span>
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
          </div>
        </div>
      )}
    </div>
  );
}

export { CategorySection };
