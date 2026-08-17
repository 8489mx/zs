
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
    <div style={{ border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div
        onClick={onToggleCollapse}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: 'linear-gradient(135deg, var(--primary, #170c5c) 0%, var(--primary2, #10003b) 100%)', color: '#fff', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = anySelected && !allSelected; }}
            onClick={toggleAll}
            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#fff' }}
          />
          <span style={{ fontSize: '16px' }}>{collapsed ? '▶' : '▼'}</span>
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{categoryName}</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '1px 9px', fontSize: '11px', fontWeight: 600 }}>
            {products.length} صنف
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '8px', padding: '3px 10px', fontWeight: 700, fontSize: '13px' }}>
            إجمالي: {totalQty.toLocaleString()}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onTransferCategory(categoryName, products); }}
            style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
          >
            ↔ نقل القسم
          </button>
        </div>
      </div>

      {/* Sub-header */}
      {!collapsed && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 110px 80px 1fr 130px', gap: '8px', padding: '7px 16px', background: 'var(--surface-color, #f9fafb)', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
            <span />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary, #999)', textTransform: 'uppercase' }}>الصنف</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary, #999)', textTransform: 'uppercase' }}>القسم</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary, #999)', textAlign: 'center', textTransform: 'uppercase' }}>الإجمالي</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary, #999)', textTransform: 'uppercase' }}>🏪 المخازن والرصيد</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary, #999)', textAlign: 'left', textTransform: 'uppercase' }}>إجراء</span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export { CategorySection };
