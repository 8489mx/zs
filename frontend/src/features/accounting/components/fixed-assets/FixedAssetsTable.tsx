import React from 'react';
import { formatCurrency } from '@/lib/format';
import { Trash2Icon } from '@/shared/components/icons/AppIcons';
import type { FixedAsset } from '@/features/accounting/api/accounting.api';

const categoryLabels: Record<string, string> = {
  general: 'عام',
  equipment: 'معدات وأجهزة',
  vehicle: 'سيارات ونقل',
  building: 'مباني وعقارات',
  furniture: 'أثاث وتجهيزات',
  it: 'أجهزة حاسوب وتقنية',
};

const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'نشط ويعمل', bg: '#dcfce7', color: '#166534' },
  fully_depreciated: { label: 'مستهلك بالكامل', bg: '#fef3c7', color: '#92400e' },
  retired: { label: 'مستبعد / متقاعد', bg: '#fee2e2', color: '#991b1b' },
};

interface FixedAssetsTableProps {
  assets: FixedAsset[];
  totalCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  onDepreciate: (asset: FixedAsset) => void;
  onDelete: (asset: FixedAsset) => void;
}

export const FixedAssetsTable: React.FC<FixedAssetsTableProps> = ({
  assets,
  totalCount,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onDepreciate,
  onDelete,
}) => {
  return (
    <section className="document-prototype-section">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">سجل الأصول الرأسمالية</h3>
        <div className="section-header-actions-group">
          <span className="muted small">عرض {assets.length} من {totalCount} أصل</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="بحث بالاسم أو الكود..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ minWidth: '240px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
        >
          <option value="all">كل التصنيفات</option>
          <option value="equipment">معدات وأجهزة</option>
          <option value="vehicle">سيارات ونقل</option>
          <option value="building">مباني وعقارات</option>
          <option value="furniture">أثاث وتجهيزات</option>
          <option value="it">أجهزة حاسوب وتقنية</option>
          <option value="general">عام</option>
        </select>
        <span style={{ fontSize: '13px', color: '#64748b', marginRight: 'auto' }}>
          عرض {assets.length} من {totalCount} أصل
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '12px 14px' }}>الكود</th>
              <th style={{ padding: '12px 14px' }}>اسم الأصل</th>
              <th style={{ padding: '12px 14px' }}>التصنيف</th>
              <th style={{ padding: '12px 14px' }}>تاريخ الشراء</th>
              <th style={{ padding: '12px 14px' }}>التكلفة</th>
              <th style={{ padding: '12px 14px' }}>طريقة الإهلاك</th>
              <th style={{ padding: '12px 14px' }}>مجمع الإهلاك</th>
              <th style={{ padding: '12px 14px' }}>صافي القيمة الدفترية</th>
              <th style={{ padding: '12px 14px' }}>الحالة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  لا توجد أصول ثابتة مسجلة بعد. اضغط على "+ إضافة أصل جديد" للبدء.
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const st = statusLabels[asset.status] || { label: asset.status, bg: '#f1f5f9', color: '#475569' };
                return (
                  <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>{asset.code}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{asset.name}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{categoryLabels[asset.category] || asset.category}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('ar-EG') : '—'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{formatCurrency(Number(asset.purchase_cost))}</td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {asset.depreciation_method === 'declining_balance' ? (
                        <span style={{ color: '#7c3aed', fontWeight: 600 }}>قسط متناقص</span>
                      ) : (
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>قسط ثابت ({asset.useful_life_months} شهر)</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#d97706', fontWeight: 700 }}>{formatCurrency(Number(asset.accumulated_depreciation))}</td>
                    <td style={{ padding: '12px 14px', color: '#16a34a', fontWeight: 800 }}>{formatCurrency(Number(asset.book_value))}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {asset.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => onDepreciate(asset)}
                            title="إهلاك يدوي للأصل وتوليد قيد"
                            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                          >
                            إهلاك
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(asset)}
                          title="استبعاد أو حذف الأصل"
                          style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2Icon size={14} color="#991b1b" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
