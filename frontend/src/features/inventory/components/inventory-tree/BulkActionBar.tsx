
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
      position: 'fixed',
      bottom: '28px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#0f172a',
      color: '#ffffff',
      borderRadius: '14px',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 12px 36px rgba(15, 23, 42, 0.35)',
      zIndex: 8888,
      direction: 'rtl',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 700 }}>{count} صنف محدد</span>
      <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
      <button
        type="button"
        onClick={onAssign}
        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#b45309', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
      >
        🔗 ربط بمخزن
      </button>
      <button
        type="button"
        onClick={onTransfer}
        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', color: 'var(--primary, #170c5c)', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
      >
        ↔ نقل لمخزن
      </button>
      <button
        type="button"
        onClick={onConsolidate}
        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
      >
        توحيد المخازن
      </button>
      <button
        type="button"
        onClick={onClear}
        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
      >
        ✕ إلغاء
      </button>
    </div>
  );
}

export { BulkActionBar };
