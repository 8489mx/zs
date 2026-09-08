import React from 'react';
import { CustomSelect } from '@/shared/ui/custom-select';
import { IconSearch } from '../PharmacyIcons';

interface ShortageFilterBarProps {
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalItems: number;
  onPageReset: () => void;
}

export const ShortageFilterBar: React.FC<ShortageFilterBarProps> = ({
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  searchQuery,
  setSearchQuery,
  totalItems,
  onPageReset,
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'all' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setStatusFilter('all'); onPageReset(); }}
        >
          الكل ({totalItems})
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'needed' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setStatusFilter('needed'); onPageReset(); }}
        >
          مطلوب
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'ordered' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setStatusFilter('ordered'); onPageReset(); }}
        >
          تم الطلب
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'received' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setStatusFilter('received'); onPageReset(); }}
        >
          تم الاستلام
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'unavailable' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setStatusFilter('unavailable'); onPageReset(); }}
        >
          غير متوفر بالسوق
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', flex: '1 1 340px', maxWidth: '520px', alignItems: 'center' }}>
        <div style={{ width: '140px' }}>
          <CustomSelect
            value={priorityFilter}
            onChange={(val) => { setPriorityFilter(val); onPageReset(); }}
            options={[
              { value: 'all', label: 'كل الأولويات' },
              { value: 'urgent', label: 'عاجل جداً' },
              { value: 'customer_request', label: 'طلب عميل' },
              { value: 'normal', label: 'عادي' },
            ]}
          />
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="purchase-prototype-field-input"
            placeholder="بحث باسم الدواء، المادة الفعالة، الموزع..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); onPageReset(); }}
            style={{ width: '100%', paddingInlineStart: '34px', boxSizing: 'border-box' }}
          />
          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50)', right: '10px', color: '#94a3b8', display: 'flex' }}>
            <IconSearch size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};
