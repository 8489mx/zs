import React from 'react';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';

interface IssueOrderHeaderSectionProps {
  fromLocationQuery: string;
  setFromLocationQuery: (q: string) => void;
  setFromLocationId: (id: string) => void;
  toLocationQuery: string;
  setToLocationQuery: (q: string) => void;
  setToLocationId: (id: string) => void;
  locationOptions: { id: string; name: string; searchTerms: string }[];
  branchOptions: { id: string; name: string; searchTerms: string }[];
  issueMode: 'final_issue' | 'transfer_to_branch_stock';
  setIssueMode: (mode: 'final_issue' | 'transfer_to_branch_stock') => void;
  dispatcherName: string;
  recipientName: string;
  setRecipientName: (name: string) => void;
}

export const IssueOrderHeaderSection: React.FC<IssueOrderHeaderSectionProps> = ({
  fromLocationQuery,
  setFromLocationQuery,
  setFromLocationId,
  toLocationQuery,
  setToLocationQuery,
  setToLocationId,
  locationOptions,
  branchOptions,
  issueMode,
  setIssueMode,
  dispatcherName,
  recipientName,
  setRecipientName,
}) => {
  return (
    <section className="document-prototype-section" style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '14px 16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: '3.5px', height: '14px', background: '#2563eb', borderRadius: '2px' }} />
        <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>المعلومات الأساسية</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Row 1: Source Warehouse & Destination Branch (2 columns) */}
        <div className="product-form-grid-2">
          <SearchableCombobox
            label="من مخزن (مخزن الصرف)"
            placeholder="اختر المخزن..."
            value={fromLocationQuery}
            onChange={(q) => {
              setFromLocationQuery(q);
              if (!q) setFromLocationId('');
            }}
            onSelect={(l) => setFromLocationId(l.id)}
            options={locationOptions}
            search={(l, q) => l.searchTerms.includes(q.toLowerCase())}
            getLabel={(l) => l.name}
            createLabel={(q) => `إضافة "${q}"`}
            inputClassName="purchase-prototype-field-input"
          />

          <SearchableCombobox
            label="إلى فرع / محل (المستلم)"
            placeholder="اختر الفرع..."
            value={toLocationQuery}
            onChange={(q) => {
              setToLocationQuery(q);
              if (!q) setToLocationId('');
            }}
            onSelect={(l) => setToLocationId(l.id)}
            options={branchOptions}
            search={(l, q) => l.searchTerms.includes(q.toLowerCase())}
            getLabel={(l) => l.name}
            createLabel={(q) => `إضافة "${q}"`}
            inputClassName="purchase-prototype-field-input"
          />
        </div>

        {/* Row 2: Issue Mode (Full Width) */}
        <div className="field">
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>وضع الصرف</label>
          <select
            className="purchase-prototype-field-input"
            value={issueMode}
            onChange={(e) => setIssueMode(e.target.value as any)}
          >
            <option value="final_issue">صرف نهائي (يتم خصم الرصيد فوراً)</option>
            <option value="transfer_to_branch_stock">تحويل إلى رصيد فرع (يبقى في الطريق حتى يتم استلامه)</option>
          </select>
        </div>

        {/* Row 3: Dispatcher & Recipient (2 columns) */}
        <div className="product-form-grid-2">
          <div className="field">
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>مسئول الصرف</label>
            <input
              type="text"
              className="purchase-prototype-field-input purchase-prototype-readonly-input"
              value={dispatcherName}
              readOnly
              disabled
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>اسم المستلم / السائق</label>
            <input
              type="text"
              className="purchase-prototype-field-input"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="اكتب اسم المستلم هنا..."
            />
          </div>
        </div>
      </div>
    </section>
  );
};
