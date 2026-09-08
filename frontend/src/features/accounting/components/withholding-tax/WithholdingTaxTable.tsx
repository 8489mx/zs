import { formatCurrency } from '@/lib/format';
import { SearchIcon, FileTextIcon, Trash2Icon } from '@/shared/components/icons/AppIcons';
import type { WithholdingTaxRecord } from '@/features/accounting/api/accounting.api';
import { WHT_TYPE_LABELS } from './types';

interface WithholdingTaxTableProps {
  transactions: WithholdingTaxRecord[];
  isLoading: boolean;
  selectedQuarter: string;
  selectedYear: number;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onUpdateStatus: (id: number, status: 'draft' | 'declared' | 'paid') => void;
  onDelete: (id: number, invoiceNo: string) => void;
}

export function WithholdingTaxTable({
  transactions,
  isLoading,
  selectedQuarter,
  selectedYear,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onUpdateStatus,
  onDelete,
}: WithholdingTaxTableProps) {
  return (
    <section className="document-prototype-section workspace-panel">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">سجل معاملات نموذج 41 ضرائب</h3>
        <div className="section-header-actions-group">
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            الربع {selectedQuarter} لسنة {selectedYear} ({transactions.length} حركة)
          </span>
        </div>
      </div>
      <p className="muted small section-header-subtitle">
        بيانات الخصم والتحصيل المعتمدة لمصلحة الضرائب المصرية وتصنيف الأوعية الضريبية.
      </p>

      {/* Filter Bar */}
      <div className="products-table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '12px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }}>
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث باسم الممول/المورد، رقم الفاتورة، أو الرقم الضريبي..."
              style={{
                width: '100%',
                paddingRight: '36px',
                paddingLeft: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ width: '180px' }}>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="all">كافة الحالات</option>
              <option value="draft">مسودة</option>
              <option value="declared">مقدم بالإقرار</option>
              <option value="paid">تم السداد والتوريد</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form 41 Detailed Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', backgroundColor: '#ffffff' }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            جاري تحميل بيانات إقرار نموذج 41...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#94a3b8' }}>
              <FileTextIcon size={24} />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>
              لا توجد معاملات خصم وإضافة مسجلة في {selectedQuarter} {selectedYear}
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              يمكنك إضافة معاملة يدوية أو استخدام زر الاستيراد الآلي من فواتير الشراء أعلاه
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>م</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>اسم الممول / المورد</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>الرقم الضريبي / الملف</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>رقم الفاتورة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>تاريخ التعامل</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>نوع التعامل والنسبة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>الوعاء الخاضع للضريبة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px' }}>الضريبة المخصومة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12.5px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, index) => {
                  const typeInfo = WHT_TYPE_LABELS[t.wht_type] || WHT_TYPE_LABELS.custom;
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.partner_name}</div>
                        {t.partner_address && (
                          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                            {t.partner_address}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#334155' }}>
                        <div>{t.tax_id_number || 'غير مسجل'}</div>
                        {t.tax_office_code && (
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'sans-serif' }}>
                            مأمورية: {t.tax_office_code}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 500, color: '#1e293b' }}>
                        {t.invoice_number}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {t.invoice_date}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...typeInfo.badgeStyle }}>
                          {typeInfo.label} ({t.wht_rate}%)
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {formatCurrency(t.base_amount)} ج.م
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#047857', whiteSpace: 'nowrap' }}>
                        {formatCurrency(t.tax_amount)} ج.م
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 500,
                          backgroundColor: t.status === 'paid' ? '#d1fae5' : t.status === 'declared' ? '#dbeafe' : '#f1f5f9',
                          color: t.status === 'paid' ? '#065f46' : t.status === 'declared' ? '#1e40af' : '#475569',
                        }}>
                          {t.status === 'paid' ? 'تم السداد' : t.status === 'declared' ? 'مقدم بالإقرار' : 'مسودة'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {t.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(t.id, 'declared')}
                              style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px', cursor: 'pointer' }}
                              title="تضمين في الإقرار النهائي"
                            >
                              اعتماد بالإقرار
                            </button>
                          )}
                          {t.status === 'declared' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(t.id, 'paid')}
                              style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '11px', cursor: 'pointer' }}
                              title="تأكيد التوريد والسداد لمصلحة الضرائب"
                            >
                              تأكيد التوريد
                            </button>
                          )}
                          {t.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => onDelete(t.id, t.invoice_number)}
                              style={{ padding: '4px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                              title="حذف"
                            >
                              <Trash2Icon size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
