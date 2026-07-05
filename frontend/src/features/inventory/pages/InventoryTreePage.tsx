import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { catalogApi } from '@/shared/api/catalog';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProductRow {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  locationStocks: { locationId: string; locationName: string; qty: number }[];
  totalQty: number;
  unassignedQty?: number;
  isUnassigned: boolean;
}

type SortMode = 'default' | 'qtyDesc' | 'qtyAsc';

// ─── Shared modal backdrop ────────────────────────────────────────────────────
function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-color, #fff)', borderRadius: '16px', padding: '28px 32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', direction: 'rtl' }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{title}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary, #666)' }}>✕</button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px', color: 'var(--text-secondary, #666)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</label>;
}

const selectStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', fontSize: '14px', marginBottom: '14px' };

function ErrorBox({ msg }: { msg: string }) {
  return <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#dc2626', fontSize: '13px' }}>{msg}</div>;
}

// ─── Quick Assign Modal (for unassigned products) ─────────────────────────────
function QuickAssignModal({
  products,
  locations,
  onClose,
  onDone,
}: {
  products: ProductRow[];
  locations: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [toLocationId, setToLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSingle = products.length === 1;

  const handle = async () => {
    setError('');
    if (!toLocationId) { setError('اختر المخزن أولاً'); return; }
    setLoading(true);
    try {
      await inventoryApi.assignProductsToLocation(Number(toLocationId), products.map((p) => Number(p.id)));
      onDone();
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const validLocations = locations.filter((l) => !l.name.includes('(محذوف)'));

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title={isSingle ? `ربط بمخزن — ${products[0].name}` : `ربط ${products.length} أصناف بمخزن`} onClose={onClose} />

      {!isSingle && (
        <div style={{ background: '#f3f0ff', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#170c5c' }}>
          {products.map((p) => p.name).join(' — ')}
        </div>
      )}

      <FieldLabel>المخزن المستهدف</FieldLabel>
      <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} style={selectStyle}>
        <option value="">اختر المخزن...</option>
        {validLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {error && <ErrorBox msg={error} />}

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button onClick={handle} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--primary, #170c5c)', color: '#fff', fontWeight: 700, fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'جاري الربط...' : 'تأكيد الربط'}
        </button>
        <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>إلغاء</button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Quick Transfer Modal (single product) ────────────────────────────────────
function QuickTransferModal({
  products,
  locations,
  onClose,
  onDone,
}: {
  products: ProductRow[];
  locations: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const isSingle = products.length === 1;
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [qty, setQty] = useState(1);
  const [transferAll, setTransferAll] = useState(true);
  const [consolidate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // For single product: show available sources with qty
  const availableFrom = isSingle
    ? products[0].locationStocks.filter((s) => s.qty > 0)
    : [];

  const maxQty = isSingle && fromLocationId
    ? products[0].locationStocks.find((s) => s.locationId === fromLocationId)?.qty ?? 0
    : 0;

  const validTo = locations.filter((l) => !l.name.includes('(محذوف)') && l.id !== fromLocationId);

  const handle = async () => {
    setError('');
    if (!toLocationId) { setError('اختر مخزن الوجهة'); return; }
    if (isSingle && !fromLocationId) { setError('اختر مخزن المصدر'); return; }

    setLoading(true);
    try {
      if (isSingle) {
        const actualQty = transferAll ? maxQty : qty;
        if (actualQty <= 0) { setError('لا يوجد رصيد للنقل'); setLoading(false); return; }
        await inventoryApi.internalTransferProducts({
          fromLocationId: Number(fromLocationId),
          toLocationId: Number(toLocationId),
          items: [{ productId: Number(products[0].id), qty: actualQty }],
          note: 'نقل سريع من شجرة المخازن',
        });
        
        if (consolidate) {
          // If we transferred everything from the source, we can safely delete the source location link
          if (transferAll) {
            await inventoryApi.removeProductFromLocation(Number(fromLocationId), Number(products[0].id));
          }
          // Also clean up any other 0-qty locations to fully consolidate
          for (const stock of products[0].locationStocks) {
            if (String(stock.locationId) !== String(toLocationId) && String(stock.locationId) !== String(fromLocationId) && stock.qty === 0) {
              await inventoryApi.removeProductFromLocation(Number(stock.locationId), Number(products[0].id));
            }
          }
        }
      } else {
        // Bulk: for each product, find any positive stock location and transfer
        for (const p of products) {
          for (const stock of p.locationStocks) {
            if (String(stock.locationId) === String(toLocationId)) {
               // Just clean up 0-qty sources if consolidate is checked
               continue;
            }
            if (stock.qty > 0) {
              await inventoryApi.internalTransferProducts({
                fromLocationId: Number(stock.locationId),
                toLocationId: Number(toLocationId),
                items: [{ productId: Number(p.id), qty: stock.qty }],
                note: 'نقل مجمع وتوحيد من شجرة المخازن',
              });
            }
            if (consolidate) {
              // Delete the old location link after transferring its stock out
              await inventoryApi.removeProductFromLocation(Number(stock.locationId), Number(p.id));
            }
          }
        }
      }
      onDone();
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء النقل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title={isSingle ? `نقل وتوحيد — ${products[0].name}` : `نقل وتوحيد ${products.length} أصناف`} onClose={onClose} />

      {!isSingle && (
        <div style={{ background: '#f3f0ff', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#170c5c' }}>
          سيتم نقل رصيد هذه الأصناف من كافة المخازن إلى المخزن الهدف
        </div>
      )}

      {isSingle && (
        <>
          <FieldLabel>من مخزن</FieldLabel>
          <select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} style={selectStyle}>
            <option value="">اختر مخزن المصدر...</option>
            {availableFrom.map((s) => <option key={s.locationId} value={s.locationId}>{s.locationName} ({s.qty})</option>)}
          </select>
        </>
      )}

      <FieldLabel>إلى مخزن</FieldLabel>
      <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} style={selectStyle}>
        <option value="">اختر مخزن الوجهة...</option>
        {validTo.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {isSingle && fromLocationId && (
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}>
            <input type="checkbox" checked={transferAll} onChange={(e) => setTransferAll(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #170c5c)' }} />
            نقل كل الرصيد المتاح ({maxQty})
          </label>
          {!transferAll && (
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              style={{ ...selectStyle, padding: '8px 12px' }}
            />
          )}
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handle} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--primary, #170c5c)', color: '#fff', fontWeight: 700, fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'جاري النقل...' : 'تنفيذ النقل'}
        </button>
        <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>إلغاء</button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Category Transfer Modal ──────────────────────────────────────────────────

// ————— Quick Consolidate Modal ———————————————————————————————————————————
function QuickConsolidateModal({
  products,
  locations,
  onClose,
  onDone,
}: {
  products: ProductRow[];
  locations: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const isSingle = products.length === 1;
  const [toLocationId, setToLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validTo = locations.filter((l) => !l.name.includes('(محذوف)'));

  const handle = async () => {
    setError('');
    if (!toLocationId) { setError('اختر المخزن الجديد للتوحيد'); return; }

    setLoading(true);
    try {
      for (const p of products) {
        // First ensure it's assigned to target
        const isAlreadyAssigned = p.locationStocks.some((s) => String(s.locationId) === String(toLocationId));
        if (!isAlreadyAssigned) {
          try {
            await inventoryApi.assignProductsToLocation(Number(toLocationId), [Number(p.id)]);
          } catch (e: any) {
            // Ignore if backend says it's already assigned (just in case)
          }
        }

        // Now transfer any stock from other locations and delete them
        for (const stock of p.locationStocks) {
          if (String(stock.locationId) === String(toLocationId)) continue;
          
          if (stock.qty > 0) {
            try {
              await inventoryApi.internalTransferProducts({
                fromLocationId: Number(stock.locationId),
                toLocationId: Number(toLocationId),
                items: [{ productId: Number(p.id), qty: stock.qty }],
                note: 'توحيد مخازن الصنف',
              });
            } catch (err: any) {
              console.warn('Could not transfer stock from ' + stock.locationId, err);
            }
          }
          // Delete old location link
          try {
            await inventoryApi.removeProductFromLocation(Number(stock.locationId), Number(p.id));
          } catch (e: any) {
            console.warn('Could not remove location link (might be already removed):', e);
          }
        }
      }
      onDone();
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء التوحيد');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color, #e5e7eb)',
    fontSize: '14px',
    background: '#fff',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title={isSingle ? `توحيد مخازن — ${products[0].name}` : `توحيد ${products.length} أصناف`} onClose={onClose} />

      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#dc2626' }}>
        <strong>تنبيه:</strong> سيتم نقل كل رصيد هذه الأصناف إلى المخزن الذي ستختاره الآن، وسيتم <strong>حذف</strong> هذه الأصناف من كافة المخازن الأخرى نهائياً.
      </div>

      <FieldLabel>المخزن الموحد (الهدف)</FieldLabel>
      <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} style={selectStyle}>
        <option value="">اختر المخزن...</option>
        {validTo.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {error && <ErrorBox msg={error} />}

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button onClick={handle} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '14px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'جاري التوحيد...' : 'تأكيد التوحيد'}
        </button>
        <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>إلغاء</button>
      </div>
    </ModalBackdrop>
  );
}

function CategoryTransferModal({
  categoryName,
  products,
  locations,
  onClose,
  onDone,
}: {
  categoryName: string;
  products: ProductRow[];
  locations: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validLocations = locations.filter((l) => !l.name.includes('(محذوف)'));
  const validTo = validLocations.filter((l) => l.id !== fromLocationId);

  // Preview: products that have stock in fromLocationId
  const affectedProducts = fromLocationId
    ? products.filter((p) => p.locationStocks.some((s) => s.locationId === fromLocationId && s.qty > 0))
    : [];

  const handle = async () => {
    setError('');
    if (!fromLocationId || !toLocationId) { setError('اختر مخزن المصدر والوجهة'); return; }
    if (affectedProducts.length === 0) { setError('لا توجد أصناف بها رصيد في المخزن المختار'); return; }
    setLoading(true);
    try {
      for (const p of affectedProducts) {
        const stock = p.locationStocks.find((s) => s.locationId === fromLocationId);
        if (!stock || stock.qty <= 0) continue;
        await inventoryApi.internalTransferProducts({
          fromLocationId: Number(fromLocationId),
          toLocationId: Number(toLocationId),
          items: [{ productId: Number(p.id), qty: stock.qty }],
          note: `نقل قسم ${categoryName} من شجرة المخازن`,
        });
      }
      onDone();
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء النقل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title={`نقل قسم: ${categoryName}`} onClose={onClose} />

      <FieldLabel>من مخزن</FieldLabel>
      <select value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} style={selectStyle}>
        <option value="">اختر مخزن المصدر...</option>
        {validLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {fromLocationId && (
        <div style={{ background: affectedProducts.length > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${affectedProducts.length > 0 ? '#86efac' : '#fca5a5'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: affectedProducts.length > 0 ? '#166534' : '#dc2626' }}>
          {affectedProducts.length > 0
            ? `سيتم نقل ${affectedProducts.length} صنف من هذا القسم`
            : 'لا توجد أصناف بها رصيد في هذا المخزن'}
        </div>
      )}

      <FieldLabel>إلى مخزن</FieldLabel>
      <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} style={selectStyle}>
        <option value="">اختر مخزن الوجهة...</option>
        {validTo.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {error && <ErrorBox msg={error} />}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handle} disabled={loading || affectedProducts.length === 0} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'var(--primary, #170c5c)', color: '#fff', fontWeight: 700, fontSize: '14px', opacity: (loading || affectedProducts.length === 0) ? 0.5 : 1 }}>
          {loading ? 'جاري النقل...' : `نقل ${affectedProducts.length} صنف`}
        </button>
        <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-color, #ddd)', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>إلغاء</button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Floating Bulk Action Bar ─────────────────────────────────────────────────
function BulkActionBar({
  count,
  onAssign,
  onTransfer,
  onConsolidate,
  onClear,
}: {
  count: number;
  onAssign: () => void;
  onTransfer: () => void;
  onConsolidate: () => void;
  onClear: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: '#fff', borderRadius: '16px',
      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 8888,
      animation: 'slideUp 0.2s ease',
      direction: 'rtl', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 600 }}>✅ {count} صنف محدد</span>
      <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
      <button onClick={onAssign} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
        🔗 ربط بمخزن
      </button>
      <button onClick={onTransfer} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #c4b5fd', background: '#f3f0ff', color: '#170c5c', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
        ↔ نقل لمخزن
      </button>
      <button onClick={onConsolidate} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
        توحيد المخازن
      </button>
      <button onClick={onClear} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>
        ✕ إلغاء التحديد
      </button>
    </div>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────
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
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: () => inventoryApi.locations() });
  const stocksQuery = useQuery({ queryKey: ['location-stocks'], queryFn: () => inventoryApi.locationStocks() });
  const categoriesQuery = useQuery({ queryKey: ['catalogCategories'], queryFn: () => catalogApi.categories() });

  const isLoading = productsQuery.isLoading || locationsQuery.isLoading || stocksQuery.isLoading || categoriesQuery.isLoading;

  const locations = useMemo(() => (locationsQuery.data || []).filter((l: any) => !String(l.name || '').includes('(محذوف)')), [locationsQuery.data]);
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
        })
        .filter((s) => !s.locationName.includes('(محذوف)'));

      const sumFromLocations = locationStocks.reduce((sum, s) => sum + s.qty, 0);
      const globalStock = Number(p.stock || p.stockQty || 0);
      const totalQty = sumFromLocations > 0 ? sumFromLocations : globalStock;

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
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    queryClient.invalidateQueries({ queryKey: ['catalogCategories'] });
    setActiveModal(null);
    setModalProducts([]);
    setCategoryTransferData(null);
    setSelectedIds(new Set());
  }, [queryClient]);

  const handleExpandAll = useCallback(() => setCollapsedCategories(new Set()), []);
  const handleCollapseAll = useCallback(() => setCollapsedCategories(new Set(grouped.map(g => g[0]))), [grouped]);
  const handleSelectAll = useCallback(() => setSelectedIds(new Set(filteredRows.map(p => p.id))), [filteredRows]);

  const handleRemoveLocation = async (productId: string, locationId: string) => {
    try {
      await inventoryApi.removeProductFromLocation(Number(locationId), Number(productId));
      await queryClient.invalidateQueries({ queryKey: ['location-stocks'] });
    } catch (e: any) {
      if (e?.status === 404) {
        // If it's already deleted in the backend but stuck in UI cache, force refetch
        await queryClient.invalidateQueries({ queryKey: ['location-stocks'] });
      } else {
        alert(e?.message || 'حدث خطأ غير متوقع');
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
          <button onClick={handleSelectAll} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary, #170c5c)', background: 'transparent', color: 'var(--primary, #170c5c)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            تحديد الكل ☑️
          </button>
          <button onClick={handleExpandAll} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #ccc)', background: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            فرد الأقسام ▼
          </button>
          <button onClick={handleCollapseAll} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color, #ccc)', background: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            ضم الأقسام ▶
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




