
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

export { BulkActionBar };
