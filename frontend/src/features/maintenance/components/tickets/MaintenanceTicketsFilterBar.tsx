import { SearchIcon } from '@/shared/components/icons/AppIcons';

interface MaintenanceTicketsFilterBarProps {
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  setPage: (v: number) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  totalItems: number;
  receivedCount: number;
  inProgressCount: number;
  readyCount: number;
  deliveredCount: number;
  serialLabel: string;
}

export function MaintenanceTicketsFilterBar({
  filterStatus,
  setFilterStatus,
  setPage,
  searchQuery,
  setSearchQuery,
  totalItems,
  receivedCount,
  inProgressCount,
  readyCount,
  deliveredCount,
  serialLabel,
}: MaintenanceTicketsFilterBarProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        {[
          { key: 'all', label: 'الكل', count: totalItems },
          { key: 'received', label: 'استلام جديد', count: receivedCount },
          { key: 'in_progress', label: 'قيد الصيانة', count: inProgressCount },
          { key: 'repaired', label: 'جاهز للتسليم', count: readyCount },
          { key: 'delivered', label: 'تم التسليم', count: deliveredCount },
        ].map((tab) => {
          const active = filterStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setFilterStatus(tab.key); setPage(1); }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: active ? '1px solid #cbd5e1' : '1px solid transparent',
                background: active ? '#ffffff' : 'transparent',
                color: active ? '#0f172a' : '#64748b',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: active ? '#0f172a' : '#e2e8f0',
                  color: active ? '#ffffff' : '#475569',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ position: 'relative', minWidth: '320px', flex: '1', maxWidth: '420px' }}>
        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          placeholder={`بحث بكود ZM-XXXX، العميل، الهاتف، أو ${serialLabel}...`}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          style={{
            width: '100%',
            padding: '7px 34px 7px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.85rem',
            outline: 'none',
            background: '#ffffff',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
