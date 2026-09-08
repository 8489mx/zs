import React from 'react';
import { SearchIcon } from '@/shared/components/icons/AppIcons';
import { PdcChequesStats } from '@/features/accounting/api/accounting.api';

interface PdcChequesFilterToolbarProps {
  activeTab: 'receivable' | 'payable' | 'alerts';
  onTabChange: (tab: 'receivable' | 'payable' | 'alerts') => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  dueFrom: string;
  onDueFromChange: (val: string) => void;
  dueTo: string;
  onDueToChange: (val: string) => void;
  stats?: PdcChequesStats;
  onReset: () => void;
}

export const PdcChequesFilterToolbar: React.FC<PdcChequesFilterToolbarProps> = ({
  activeTab,
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  dueFrom,
  onDueFromChange,
  dueTo,
  onDueToChange,
  stats,
  onReset,
}) => {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px',
        background: '#ffffff',
        marginBottom: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            width: 'fit-content',
          }}
        >
          <button
            type="button"
            onClick={() => onTabChange('receivable')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: 'none',
              backgroundColor: activeTab === 'receivable' ? '#ffffff' : 'transparent',
              color: activeTab === 'receivable' ? '#170e5e' : '#64748b',
              boxShadow: activeTab === 'receivable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            أوراق القبض (عملاء)
          </button>
          <button
            type="button"
            onClick={() => onTabChange('payable')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: 'none',
              backgroundColor: activeTab === 'payable' ? '#ffffff' : 'transparent',
              color: activeTab === 'payable' ? '#170e5e' : '#64748b',
              boxShadow: activeTab === 'payable' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            أوراق الدفع (موردين)
          </button>
          <button
            type="button"
            onClick={() => onTabChange('alerts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: 'none',
              backgroundColor: activeTab === 'alerts' ? '#ffffff' : 'transparent',
              color: activeTab === 'alerts' ? '#b91c1c' : '#64748b',
              boxShadow: activeTab === 'alerts' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <span>تنبيهات الاستحقاق والارتداد</span>
            {(stats?.receivables.overdueCount || 0) + (stats?.receivables.dueSoonCount || 0) > 0 && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  display: 'inline-block',
                }}
              />
            )}
          </button>
        </div>

        {/* Quick Status Filter Buttons */}
        {activeTab === 'receivable' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'in_safe', label: 'في الخزينة' },
              { id: 'under_collection', label: 'برسم التحصيل' },
              { id: 'collected', label: 'محصل' },
              { id: 'bounced', label: 'مرتد' },
              { id: 'endorsed', label: 'مظهر' },
            ].map((s) => {
              const isActive = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onStatusFilterChange(s.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1px solid #170e5e' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#170e5e' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    boxShadow: isActive ? '0 1px 3px rgba(23, 14, 94, 0.25)' : 'none',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'payable' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'issued', label: 'محرر لم يصرف' },
              { id: 'cleared', label: 'تم الصرف بنكياً' },
              { id: 'bounced', label: 'مرتد' },
              { id: 'cancelled', label: 'ملغى' },
            ].map((s) => {
              const isActive = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onStatusFilterChange(s.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1px solid #170e5e' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#170e5e' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    boxShadow: isActive ? '0 1px 3px rgba(23, 14, 94, 0.25)' : 'none',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Search & Date Filter Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', gridColumn: 'span 2' }}>
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث برقم الشيك، اسم العميل، اسم المورد، أو اسم البنك..."
            style={{
              width: '100%',
              paddingRight: '36px',
              paddingLeft: '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>استحقاق من:</span>
          <input
            type="date"
            value={dueFrom}
            onChange={(e) => onDueFromChange(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>إلى:</span>
          <input
            type="date"
            value={dueTo}
            onChange={(e) => onDueToChange(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
          {(search || dueFrom || dueTo || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={onReset}
              style={{
                fontSize: '12px',
                color: '#e11d48',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                padding: '0 4px',
              }}
            >
              إعادة ضبط
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
