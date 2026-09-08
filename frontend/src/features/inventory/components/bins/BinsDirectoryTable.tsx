import React from 'react';
import { WarehouseBin } from '../../api/warehouse-bins.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface BinsDirectoryTableProps {
  bins: WarehouseBin[];
  loading: boolean;
  locations: any[];
  selectedLocationId: number | '';
  onSelectLocationId: (id: number | '') => void;
  search: string;
  onSearchChange: (val: string) => void;
  onInspectBin: (bin: WarehouseBin) => void;
  onEditBin: (bin: WarehouseBin) => void;
  onDeleteBin: (id: number) => void;
}

export const BinsDirectoryTable: React.FC<BinsDirectoryTableProps> = ({
  bins,
  loading,
  locations,
  selectedLocationId,
  onSelectLocationId,
  search,
  onSearchChange,
  onInspectBin,
  onEditBin,
  onDeleteBin,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ width: '260px' }}>
          <select
            value={selectedLocationId}
            onChange={(e) => onSelectLocationId(e.target.value ? Number(e.target.value) : '')}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">-- كل المستودعات والفروع --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث برمز الرف، الباركود، الممر، أو الحامل..."
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
          جاري تحميل أماكن التخزين...
        </div>
      ) : bins.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
          <AppIcons.Box size={40} color="#cbd5e1" />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginTop: '12px' }}>
            لا توجد أماكن تخزين مسجلة حتى الآن
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            اضغط على زر "إضافة مكان تخزين جديد" للبدء في تنظيم رفوف المستودع.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'right' }}>
                <th style={{ padding: '10px 12px' }}>رمز الرف (Code)</th>
                <th style={{ padding: '10px 12px' }}>المستودع</th>
                <th style={{ padding: '10px 12px' }}>الممر (Aisle)</th>
                <th style={{ padding: '10px 12px' }}>الحامل (Rack)</th>
                <th style={{ padding: '10px 12px' }}>المستوى (Shelf)</th>
                <th style={{ padding: '10px 12px' }}>العين (Bin)</th>
                <th style={{ padding: '10px 12px' }}>الباركود</th>
                <th style={{ padding: '10px 12px' }}>الأصناف</th>
                <th style={{ padding: '10px 12px' }}>الكمية المخزنة</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {bins.map((bin) => (
                <tr key={bin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#170e5e' }}>
                    {bin.code}
                  </td>
                  <td style={{ padding: '12px', color: '#334155' }}>
                    {bin.locationName}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {bin.aisle || '-'}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {bin.rack || '-'}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {bin.shelf || '-'}
                  </td>
                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {bin.bin || '-'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        backgroundColor: '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#334155',
                      }}
                    >
                      {bin.barcode}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>
                    {bin.productsCount} صنف
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#059669' }}>
                    {bin.totalQuantityStored}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onInspectBin(bin)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        فحص الرف
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditBin(bin)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBin(bin.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
