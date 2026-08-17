import { useState } from 'react';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import type { ProductRow } from './inventoryTree.types';

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
      
      // Transfer unassigned stock if any
      for (const p of products) {
        if (p.unassignedQty && p.unassignedQty > 0) {
          try {
            await inventoryApi.internalTransferProducts({
              fromLocationId: -1,
              toLocationId: Number(toLocationId),
              items: [{ productId: Number(p.id), qty: p.unassignedQty }],
              note: 'ربط الرصيد العائم بمخزن',
            });
          } catch (err) {
            console.warn('Could not transfer unlinked stock', err);
          }
        }
      }

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
    ? [
        ...(products[0]?.locationStocks || []).filter((s) => s.qty > 0),
        ...((products[0]?.unassignedQty || 0) > 0 ? [{ locationId: '-1', locationName: 'رصيد غير مربوط', qty: products[0].unassignedQty }] : [])
      ]
    : [];

  const maxQty = isSingle && fromLocationId
    ? availableFrom.find((s) => String(s.locationId) === fromLocationId)?.qty ?? 0
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
          if (transferAll && Number(fromLocationId) !== -1) {
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
            {availableFrom.map((s) => <option key={s.locationId || '-1'} value={s.locationId || '-1'}>{s.locationName || 'رصيد غير مربوط'} ({s.qty})</option>)}
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

        if (p.unassignedQty && p.unassignedQty > 0) {
          try {
            await inventoryApi.internalTransferProducts({
              fromLocationId: -1,
              toLocationId: Number(toLocationId),
              items: [{ productId: Number(p.id), qty: p.unassignedQty }],
              note: 'توحيد مخازن الصنف (رصيد عائم)',
            });
          } catch (err: any) {
            console.warn('Could not transfer unlinked stock', err);
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

export { QuickAssignModal, QuickTransferModal, QuickConsolidateModal, CategoryTransferModal };
