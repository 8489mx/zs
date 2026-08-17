import type { ProductRow } from './inventoryTree.types';

function ProductTreeRow({
  product,
  filterLocationId,
  isSelected,
  onToggleSelect,
  onTransfer,
  onAssign,
  onConsolidate,
  onRemoveLocation,
}: {
  product: ProductRow;
  filterLocationId: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onTransfer: (p: ProductRow) => void;
  onAssign: (p: ProductRow) => void;
  onConsolidate?: (p: ProductRow) => void;
  onRemoveLocation: (productId: string, locationId: string) => void;
}) {
  const visibleStocks = filterLocationId
    ? product.locationStocks.filter((s) => s.locationId === filterLocationId)
    : product.locationStocks;

  const totalInFilter = visibleStocks.reduce((sum, s) => sum + s.qty, 0);
  const isUnassigned = product.isUnassigned;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr 110px 80px 1fr 130px',
        alignItems: 'center',
        padding: '10px 16px',
        gap: '8px',
        transition: 'background 0.12s',
        borderBottom: '1px solid var(--border-color, #e5e7eb)',
        background: isSelected ? '#f3f0ff' : 'transparent',
        cursor: 'pointer',
      }}
      onClick={() => onToggleSelect(product.id)}
      onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'var(--surface-color, #f9fafb)')}
      onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
    >
      {/* Checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(product.id)}
          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary, #170c5c)' }}
        />
      </div>

      {/* Name + barcode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: 500, fontSize: '13px' }}>{product.name}</span>
        {product.barcode && <span style={{ fontSize: '11px', color: 'var(--text-secondary, #aaa)' }}>{product.barcode}</span>}
        {isUnassigned && (
          <span style={{ display: 'inline-block', marginTop: '2px', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', width: 'fit-content' }}>
            غير مربوط ⚠️
          </span>
        )}
      </div>

      {/* Category */}
      <span style={{ fontSize: '11px', color: 'var(--text-secondary, #888)' }}>{product.categoryName || '—'}</span>

      {/* Global total qty */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontWeight: 800,
          fontSize: '15px',
          color: product.totalQty === 0 ? '#ef4444' : product.totalQty > 50 ? '#16a34a' : '#d97706',
        }}>
          {product.totalQty}
        </span>
      </div>

      {/* Location stocks chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
        {visibleStocks.length === 0 ? (
          <span style={{ fontSize: '12px', color: '#bbb' }}>—</span>
        ) : (
          visibleStocks.map((s) => (
            <div key={s.locationId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <span>🏪</span>
              <span style={{ fontWeight: 600 }}>{s.locationName}</span>
              <span style={{ background: s.qty > 0 ? '#dcfce7' : '#fee2e2', color: s.qty > 0 ? '#16a34a' : '#dc2626', borderRadius: '10px', padding: '0px 6px', fontWeight: 700, fontSize: '11px' }}>
                {s.qty}
              </span>
              {s.qty === 0 && (
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveLocation(product.id, s.locationId);
                  }}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px', fontSize: '14px', fontWeight: 'bold', marginLeft: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="حذف هذا المخزن"
                >
                  ×
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Total + Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <span style={{ fontWeight: 800, fontSize: '14px', color: (filterLocationId ? totalInFilter : product.totalQty) === 0 ? '#ef4444' : 'var(--text-primary, #111)', minWidth: '28px', textAlign: 'center' }}>
          {filterLocationId ? totalInFilter : product.totalQty}
        </span>

        {isUnassigned ? (
          <button onClick={() => onAssign(product)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>
            ربط بمخزن
          </button>
        ) : (
          <>
            <button onClick={() => onTransfer(product)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--primary, #170c5c)', background: 'transparent', color: 'var(--primary, #170c5c)', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>
              نقل ↔
            </button>
            <button onClick={() => onConsolidate?.(product)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}>
              توحيد
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

export { ProductTreeRow };
