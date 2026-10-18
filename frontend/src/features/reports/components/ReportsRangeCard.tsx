import { useTranslation } from 'react-i18next';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { fromDateInputValueEnd, fromDateInputValueStart, toDateInputValue } from '@/features/reports/lib/reports-format';

export function ReportsRangeCard({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
  onPresetToday,
  onPreset7,
  onPreset30,
  onReset,
  healthRows,
  locationId,
  onLocationChange,
  locations,
  userId,
  onUserIdChange,
  users,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onPresetToday: () => void;
  onPreset7: () => void;
  onPreset30: () => void;
  onReset: () => void;
  healthRows: Array<{ label: string; value: string }>;
  locationId?: string;
  onLocationChange?: (value: string) => void;
  locations?: Array<{ id: string; name: string; type?: string }>;
  userId?: string;
  onUserIdChange?: (value: string) => void;
  users?: Array<{ id?: string | number | null; username?: string; displayName?: string; name?: string; role?: string }>;
}) {
  const { t } = useTranslation();
  return (
    <section className="document-prototype-section reports-scope-card reports-scope-card--compact">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">{t('reports.reports_range_card.s0', "الفترة والتصفية")}</h3>
        <div className="section-header-actions-group">
          <span className="nav-pill" style={{ fontSize: '11px', padding: '2px 8px' }}>{t('reports.reports_range_card.s1', "تحديث مباشر")}</span>
        </div>
      </div>
      <div className="reports-range-grid reports-range-grid--compact">
        <Field label={t('reports.reports_range_card.s2', "من")}>
          <input type="date" value={toDateInputValue(from)} onChange={(event) => onFromChange(fromDateInputValueStart(event.target.value) || from)} />
        </Field>
        <Field label={t('reports.reports_range_card.s3', "إلى")}>
          <input type="date" value={toDateInputValue(to)} onChange={(event) => onToChange(fromDateInputValueEnd(event.target.value) || to)} />
        </Field>
        <Field label={t('reports.reports_range_card.s4', "الفرع / المخزن")}>
          <select value={locationId || 'all'} onChange={(event) => onLocationChange?.(event.target.value)}>
            <option value="all">{t('reports.reports_range_card.s5', "الكل (لجميع المخازن)")}</option>
            {locations?.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name} {loc.type ? `(${loc.type === 'branch' ? t('reports.reports_range_card.s6', "فرع") : t('reports.reports_range_card.s7', "مخزن")})` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label={t('reports.reports_range_card.s8', "المستخدم / الكاشير")}>
          <select value={userId || 'all'} onChange={(event) => onUserIdChange?.(event.target.value)}>
            <option value="all">{t('reports.reports_range_card.s9', "الكل (لجميع المستخدمين)")}</option>
            {users?.filter((u) => u.id != null).map((u) => {
              const label = u.displayName || u.username || u.name || `مستخدم #${u.id}`;
              return (
                <option key={String(u.id)} value={String(u.id)}>
                  {label} {u.role ? `(${u.role === 'super_admin' ? t('reports.reports_range_card.s10', "مدير عام") : u.role === 'admin' ? t('reports.reports_range_card.s11', "مدير") : u.role === 'cashier' ? t('reports.reports_range_card.s12', "كاشير") : u.role})` : ''}
                </option>
              );
            })}
          </select>
        </Field>
        <div className="field reports-action-field reports-action-field--compact">
          <span>{t('reports.reports_range_card.s13', "الإجراء")}</span>
          <Button onClick={onApply}>{t('reports.reports_range_card.s14', "تحديث التقرير")}</Button>
        </div>
      </div>
      <div className="filter-chip-row reports-preset-row reports-preset-row--compact">
        <Button variant="secondary" onClick={onPresetToday}>{t('reports.reports_range_card.s15', "اليوم")}</Button>
        <Button variant="secondary" onClick={onPreset7}>{t('reports.reports_range_card.s16', "آخر 7 أيام")}</Button>
        <Button variant="secondary" onClick={onPreset30}>{t('reports.reports_range_card.s17', "آخر 30 يوم")}</Button>
        <Button variant="secondary" onClick={onReset}>{t('reports.reports_range_card.s18', "إعادة الضبط")}</Button>
      </div>
      <div className="stats-grid compact-grid workspace-stats-grid reports-stats-grid reports-mini-overview-grid reports-mini-overview-grid--compact">
        {healthRows.map((row) => (
          <div className="stat-card report-mini-stat-card" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
