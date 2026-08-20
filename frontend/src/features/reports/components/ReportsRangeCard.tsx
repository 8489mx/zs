import { FormSection } from '@/shared/components/form-section';
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
  return (
    <FormSection title="الفترة" actions={<span className="nav-pill">تحديث مباشر</span>} className="reports-scope-card reports-scope-card--compact">
      <div className="reports-range-grid reports-range-grid--compact">
        <Field label="من">
          <input type="date" value={toDateInputValue(from)} onChange={(event) => onFromChange(fromDateInputValueStart(event.target.value) || from)} />
        </Field>
        <Field label="إلى">
          <input type="date" value={toDateInputValue(to)} onChange={(event) => onToChange(fromDateInputValueEnd(event.target.value) || to)} />
        </Field>
        <Field label="الفرع / المخزن">
          <select value={locationId || 'all'} onChange={(event) => onLocationChange?.(event.target.value)}>
            <option value="all">الكل (لجميع المخازن)</option>
            {locations?.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name} {loc.type ? `(${loc.type === 'branch' ? 'فرع' : 'مخزن'})` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="المستخدم / الكاشير">
          <select value={userId || 'all'} onChange={(event) => onUserIdChange?.(event.target.value)}>
            <option value="all">الكل (لجميع المستخدمين)</option>
            {users?.filter((u) => u.id != null).map((u) => {
              const label = u.displayName || u.username || u.name || `مستخدم #${u.id}`;
              return (
                <option key={String(u.id)} value={String(u.id)}>
                  {label} {u.role ? `(${u.role === 'super_admin' ? 'مدير عام' : u.role === 'admin' ? 'مدير' : u.role === 'cashier' ? 'كاشير' : u.role})` : ''}
                </option>
              );
            })}
          </select>
        </Field>
        <div className="field reports-action-field reports-action-field--compact">
          <span>الإجراء</span>
          <Button onClick={onApply}>تحديث التقرير</Button>
        </div>
      </div>
      <div className="filter-chip-row reports-preset-row reports-preset-row--compact">
        <Button variant="secondary" onClick={onPresetToday}>اليوم</Button>
        <Button variant="secondary" onClick={onPreset7}>آخر 7 أيام</Button>
        <Button variant="secondary" onClick={onPreset30}>آخر 30 يوم</Button>
        <Button variant="secondary" onClick={onReset}>إعادة الضبط</Button>
      </div>
      <div className="stats-grid compact-grid workspace-stats-grid reports-stats-grid reports-mini-overview-grid reports-mini-overview-grid--compact">
        {healthRows.map((row) => (
          <div className="stat-card report-mini-stat-card" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </FormSection>
  );
}
