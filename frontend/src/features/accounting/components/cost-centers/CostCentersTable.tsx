import { useTranslation } from 'react-i18next';
import { formatCurrencyWithSymbol } from '@/lib/format';
import { SearchIcon, FileTextIcon, Trash2Icon } from '@/shared/components/icons/AppIcons';
import type { CostCenterRecord } from '../../api/cost-centers.api';
import { COST_CENTER_DIMENSIONS } from './types';

interface CostCentersTableProps {
  costCenters: CostCenterRecord[];
  allCenters: CostCenterRecord[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (val: any) => void;
  dimensionFilter: string;
  onDimensionFilterChange: (val: string) => void;
  onEdit: (c: CostCenterRecord) => void;
  onOpenReport: (id: number) => void;
  onDelete: (id: number, name: string) => void;
}

export function CostCentersTable({
  costCenters,
  allCenters,
  isLoading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dimensionFilter,
  onDimensionFilterChange,
  onEdit,
  onOpenReport,
  onDelete,
}: CostCentersTableProps) {
  const { t } = useTranslation();
  const getParentName = (parentId?: number | null) => {
    if (!parentId) return '—';
    const parent = allCenters.find((c) => c.id === parentId);
    return parent ? `${parent.name} (${parent.code})` : '—';
  };

  return (
    <section className="document-prototype-section workspace-panel">
      <div className="section-header-compact-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="document-prototype-section-title" style={{ margin: 0 }}>{t('accounting.cost_centers.cost_centers_table.s0', "شجرة ومراكز التكلفة")}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{t('accounting.cost_centers.cost_centers_table.s1', "عرض وتصفية مراكز التكلفة والأبعاد التحليلية")}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              placeholder={t('accounting.cost_centers.cost_centers_table.s2', "بحث بالكود أو الاسم أو الوصف...")}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 32px 7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                backgroundColor: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <select
            value={dimensionFilter}
            onChange={(e) => onDimensionFilterChange(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc' }}
          >
            <option value="all">{t('accounting.cost_centers.cost_centers_table.s3', "كل الأبعاد")}</option>
            {Object.entries(COST_CENTER_DIMENSIONS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', backgroundColor: '#f8fafc' }}
          >
            <option value="all">{t('accounting.cost_centers.cost_centers_table.s4', "كل الحالات")}</option>
            <option value="active">{t('accounting.cost_centers.cost_centers_table.s5', "النشطة فقط")}</option>
            <option value="inactive">{t('accounting.cost_centers.cost_centers_table.s6', "المعطلة فقط")}</option>
          </select>
        </div>

        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {t('accounting.cost_centers.cost_centers_table.s7', "إجمالي المعروض:")} <strong>{costCenters.length}</strong>
        </span>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {isLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            {t('accounting.cost_centers.cost_centers_table.s8', "جاري تحميل مراكز التكلفة...")}
          </div>
        ) : costCenters.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            {t('accounting.cost_centers.cost_centers_table.s9', "لا توجد مراكز تكلفة مطابقة للبحث.")}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('accounting.cost_centers.cost_centers_table.s10', "كود المركز")}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('accounting.cost_centers.cost_centers_table.s11', "اسم المركز")}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('accounting.cost_centers.cost_centers_table.s12', "البُعد التحليلي")}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('accounting.cost_centers.cost_centers_table.s13', "المركز الرئيسي الأب")}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('accounting.cost_centers.cost_centers_table.s14', "الموازنة التقديرية")}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{t('accounting.cost_centers.cost_centers_table.s15', "الحالة")}</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>{t('accounting.cost_centers.cost_centers_table.s16', "الإجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {costCenters.map((c) => {
                  const dim = COST_CENTER_DIMENSIONS[c.dimension || 'operational'] || COST_CENTER_DIMENSIONS.operational;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>
                        {c.code}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                        {c.description && <div style={{ fontSize: '11px', color: '#64748b' }}>{c.description}</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: dim.color, backgroundColor: dim.bg }}>
                          {dim.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{getParentName(c.parentId)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {c.budgetAmount ? formatCurrencyWithSymbol(c.budgetAmount) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, backgroundColor: c.isActive ? '#ecfdf5' : '#f1f5f9', color: c.isActive ? '#059669' : '#64748b' }}>
                          {c.isActive ? t('accounting.cost_centers.cost_centers_table.s17', "نشط") : t('accounting.cost_centers.cost_centers_table.s18', "معطل")}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => onOpenReport(c.id)}
                            style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <FileTextIcon size={12} />
                            <span>{t('accounting.cost_centers.cost_centers_table.s19', "كشف التكاليف")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(c)}
                            style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {t('accounting.cost_centers.cost_centers_table.s20', "تعديل")}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(c.id, c.name)}
                            style={{ padding: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                            title={t('accounting.cost_centers.cost_centers_table.s21', "حذف المركز")}
                          >
                            <Trash2Icon size={14} />
                          </button>
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
