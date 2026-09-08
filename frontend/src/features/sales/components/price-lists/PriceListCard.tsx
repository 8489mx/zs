import React from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { PriceList } from '../../api/price-lists.api';

interface PriceListCardProps {
  list: PriceList;
  onEdit: (list: PriceList) => void;
  onDelete: (id: number) => void;
}

export const PriceListCard: React.FC<PriceListCardProps> = ({ list, onEdit, onDelete }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {list.name}
              </h3>
              {list.is_default && (
                <span
                  style={{
                    fontSize: 'var(--font-micro)',
                    backgroundColor: '#e0e7ff',
                    color: '#170e5e',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  افتراضية
                </span>
              )}
            </div>
            <span style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontFamily: 'monospace' }}>
              كود: {list.code}
            </span>
          </div>

          <span
            style={{
              fontSize: 'var(--font-badge)',
              padding: '3px 8px',
              borderRadius: '12px',
              fontWeight: 600,
              backgroundColor: list.is_active ? '#dcfce7' : '#fee2e2',
              color: list.is_active ? '#166534' : '#991b1b',
            }}
          >
            {list.is_active ? 'نشطة' : 'معطلة'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>الخصم العام</div>
            <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
              {list.default_discount_percent > 0 ? `${list.default_discount_percent}%` : 'لا يوجد'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>قواعد الأصناف</div>
            <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
              {list.items_count || 0} صنف/شريحة
            </div>
          </div>
        </div>

        {list.notes && (
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', marginBottom: '14px', lineHeight: 1.4 }}>
            {list.notes}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
        <button
          onClick={() => onEdit(list)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#334155',
            fontSize: 'var(--font-table-head)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <AppIcons.Edit size={14} /> تعديل
        </button>
        <button
          onClick={() => onDelete(list.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            fontSize: 'var(--font-table-head)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <AppIcons.Trash size={14} /> حذف
        </button>
      </div>
    </div>
  );
};
