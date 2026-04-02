import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { fromDateTimeInputValue, toDateTimeInputValue } from '@/features/reports/lib/reports-format';

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
  healthRows
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
}) {
  return (
    <Card title="نطاق التقرير" description="حدد الفترة ثم راجع القسم المطلوب من التبويبات بدل تحميل كل التقارير دفعة واحدة في صفحة واحدة." actions={<span className="nav-pill">نطاق التقرير</span>} className="reports-scope-card reports-scope-premium-card">
      <div className="reports-range-grid">
        <Field label="من">
          <input type="datetime-local" value={toDateTimeInputValue(from)} onChange={(event) => onFromChange(fromDateTimeInputValue(event.target.value) || from)} />
        </Field>
        <Field label="إلى">
          <input type="datetime-local" value={toDateTimeInputValue(to)} onChange={(event) => onToChange(fromDateTimeInputValue(event.target.value) || to)} />
        </Field>
        <div className="field reports-action-field">
          <span>الإجراء</span>
          <Button onClick={onApply}>تحديث التقرير</Button>
        </div>
      </div>
      <div className="filter-chip-row reports-preset-row">
        <Button variant="secondary" onClick={onPresetToday}>اليوم</Button>
        <Button variant="secondary" onClick={onPreset7}>آخر 7 أيام</Button>
        <Button variant="secondary" onClick={onPreset30}>آخر 30 يوم</Button>
        <Button variant="secondary" onClick={onReset}>إعادة الضبط</Button>
      </div>
      <div className="stats-grid compact-grid workspace-stats-grid reports-stats-grid reports-mini-overview-grid">
        {healthRows.map((row) => (
          <div className="stat-card report-mini-stat-card" key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}
