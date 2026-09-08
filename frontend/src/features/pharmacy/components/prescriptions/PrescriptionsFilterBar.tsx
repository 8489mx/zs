import React from 'react';
import { IconSearch } from '../PharmacyIcons';

interface PrescriptionsFilterBarProps {
  totalItems: number;
  insuranceFilter: string;
  setInsuranceFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onResetPage: () => void;
}

export const PrescriptionsFilterBar: React.FC<PrescriptionsFilterBarProps> = ({
  totalItems,
  insuranceFilter,
  setInsuranceFilter,
  searchQuery,
  setSearchQuery,
  onResetPage,
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className={'btn btn-sm ' + (insuranceFilter === 'all' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setInsuranceFilter('all'); onResetPage(); }}
        >
          الكل ({totalItems})
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (insuranceFilter === 'كاش بدون تأمين' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setInsuranceFilter('كاش بدون تأمين'); onResetPage(); }}
        >
          كاش
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (insuranceFilter === 'تأمين صحي حكومي' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setInsuranceFilter('تأمين صحي حكومي'); onResetPage(); }}
        >
          تأمين صحي حكومي
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (insuranceFilter === 'نقابة المهندسين' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => { setInsuranceFilter('نقابة المهندسين'); onResetPage(); }}
        >
          نقابات
        </button>
      </div>

      <div style={{ minWidth: '320px', position: 'relative', flex: '1 1 320px', maxWidth: '480px' }}>
        <input
          type="text"
          className="purchase-prototype-field-input"
          placeholder="بحث برقم الروشتة، اسم المريض، الهاتف، الطبيب..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); onResetPage(); }}
          style={{ width: '100%', paddingInlineStart: '34px', boxSizing: 'border-box' }}
        />
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '10px', color: '#94a3b8', display: 'flex' }}>
          <IconSearch size={16} />
        </div>
      </div>
    </div>
  );
};
