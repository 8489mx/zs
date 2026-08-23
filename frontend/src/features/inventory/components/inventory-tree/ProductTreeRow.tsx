import type { ProductRow } from './inventoryTree.types';
import { AlertTriangleIcon } from '@/shared/components/icons/AppIcons';

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

  const isUnassigned = product.isUnassigned;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px minmax(200px, 2fr) 120px 100px minmax(220px, 3fr) 150px',
        alignItems: 'center',
        padding: '8px 18px',
        gap: '12px',
        transition: 'background 0.15s ease',
        borderBottom: '1px solid var(--border, #f1f5f9)',
        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
        cursor: 'pointer',
      }}
      onClick={() => onToggleSelect(product.id)}
      onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = '#f8fafc')}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
        {product.barcode && <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{product.barcode}</span>}
        {isUnassigned && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '10.5px', fontWeight: 700, padding: '1px 8px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', width: 'fit-content' }}>
            <AlertTriangleIcon size={12} color="#d97706" /> غير مربوط بمخزن
          </span>
        )}
      </div>

      {/* Category */}
      <span style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.categoryName || '—'}</span>

      {/* Global total qty */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontWeight: 800,
          fontSize: '13.5px',
          padding: '2px 8px',
          borderRadius: '6px',
          background: product.totalQty === 0 ? '#fee2e2' : '#f1f5f9',
          color: product.totalQty === 0 ? '#dc2626' : '#0f172a',
        }}>
          {product.totalQty}
        </span>
      </div>

      {/* Location stocks chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {visibleStocks.length === 0 ? (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
        ) : (
          visibleStocks.map((s) => (
            <div key={s.locationId} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '2px 8px', fontSize: '11.5px' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>{s.locationName}:</span>
              <span style={{ background: s.qty > 0 ? '#dcfce7' : '#fee2e2', color: s.qty > 0 ? '#15803d' : '#dc2626', borderRadius: '6px', padding: '1px 6px', fontWeight: 700, fontSize: '11px' }}>
                {s.qty}
              </span>
              {s.qty === 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveLocation(product.id, s.locationId);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 2px', fontSize: '12px', fontWeight: 'bold' }}
                  title="حذف هذا المخزن من الصنف"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Total + Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', paddingInlineEnd: '4px' }} onClick={(e) => e.stopPropagation()}>
        {isUnassigned ? (
          <button 
            type="button"
            onClick={() => onAssign(product)} 
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#b45309', fontSize: '11.5px', cursor: 'pointer', fontWeight: 700 }}
          >
            ربط بمخزن
          </button>
        ) : (
          <>
            <button 
              type="button"
              onClick={() => onTransfer(product)} 
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: 'var(--primary, #170c5c)', fontSize: '11.5px', cursor: 'pointer', fontWeight: 700 }}
            >
              نقل ↔
            </button>
            <button 
              type="button"
              onClick={() => onConsolidate?.(product)} 
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
            >
              توحيد
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export { ProductTreeRow };
