import React from 'react';
import { KdsStation } from '@/features/pos/api/kds.api';

interface KdsFilterBarProps {
  selectedStation: KdsStation;
  onSelectStation: (station: KdsStation) => void;
  selectedOrderType: string;
  onSelectOrderType: (orderType: string) => void;
}

const STATIONS: { key: KdsStation; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'kitchen', label: 'المطبخ الساخن' },
  { key: 'grill', label: 'المشويات' },
  { key: 'beverages', label: 'المشروبات والبار' },
  { key: 'bakery', label: 'المخبوزات والحلويات' },
];

const ORDER_TYPES = [
  { key: 'all', label: 'الكل' },
  { key: 'dine_in', label: 'صالة' },
  { key: 'takeaway', label: 'سفري' },
  { key: 'delivery', label: 'دليفري' },
];

export const KdsFilterBar: React.FC<KdsFilterBarProps> = ({
  selectedStation,
  onSelectStation,
  selectedOrderType,
  onSelectOrderType,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      {/* Station Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>المحطة:</span>
        {STATIONS.map((s) => {
          const isActive = selectedStation === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelectStation(s.key)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${isActive ? '#170e5e' : '#cbd5e1'}`,
                backgroundColor: isActive ? '#170e5e' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                boxShadow: isActive ? '0 2px 6px rgba(23, 14, 94, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Order Type Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>النوع:</span>
        {ORDER_TYPES.map((ot) => {
          const isActive = selectedOrderType === ot.key;
          return (
            <button
              key={ot.key}
              type="button"
              onClick={() => onSelectOrderType(ot.key)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${isActive ? '#170e5e' : '#cbd5e1'}`,
                backgroundColor: isActive ? '#170e5e' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                boxShadow: isActive ? '0 2px 6px rgba(23, 14, 94, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {ot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
