export type ComparisonRow = {
  key: string;
  label: string;
  systemAmount: number;
  declaredAmount: number;
  amountDiff: number;
  systemCount: number | null;
  declaredCount: number | null;
  countDiff: number | null;
};

export function toMoney(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

export function toCount(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

export function differenceTone(value: number): 'ok' | 'negative' | 'positive' {
  if (Math.abs(value) <= 0.009) return 'ok';
  return value < 0 ? 'negative' : 'positive';
}

export function formatMoney(value: number): string {
  const amount = toMoney(value);
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ج.م`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(toCount(value));
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.trunc(value));
}

export function formatSignedCount(value: number): string {
  if (value > 0) return `+${formatInteger(value)}`;
  return formatInteger(value);
}

export function differenceLabel(value: number): string {
  const money = formatMoney(Math.abs(value));
  if (Math.abs(value) <= 0.009) return `${formatMoney(0)} (مطابق)`;
  if (value < 0) return `-${money}`;
  return `+${money}`;
}

function parseIso(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatDateOnly(value?: string): string {
  const parsed = parseIso(value);
  if (!parsed) return '—';
  return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(parsed);
}

export function formatTimeOnly(value?: string): string {
  const parsed = parseIso(value);
  if (!parsed) return '—';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(parsed);
}

export function formatDuration(startIso?: string, endIso?: string): string {
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  if (!start || !end || end <= start) return '—';
  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${formatCount(hours)} ساعات و ${formatCount(minutes)} دقيقة`;
}

export function toDisplayCount(value?: number | null): string {
  if (value == null) return '—';
  return formatCount(Number(value || 0));
}

export function renderOperationDetails(
  title: string,
  rows: Array<{ amount: number; reference?: string }> | undefined,
  declaredCount?: number | null,
  declaredTotal?: number | null,
) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const count = safeRows.length;
  const total = safeRows.reduce((sum, row) => sum + toMoney(row.amount || 0), 0);
  const summaryCount = declaredCount == null ? count : toCount(declaredCount);
  const summaryTotal = declaredTotal == null ? total : toMoney(declaredTotal);

  return (
    <details className="cash-drawer-review-accordion">
      <summary><span>{title}</span><span className="muted small">{formatCount(summaryCount)} عملية — {formatMoney(summaryTotal)}</span></summary>
      {safeRows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>رقم العملية</th><th>المبلغ</th><th>المرجع</th></tr></thead>
            <tbody>
              {safeRows.map((row, index) => (
                <tr key={`${title}-${index}`}><td>{formatCount(index + 1)}</td><td>{formatMoney(toMoney(row.amount || 0))}</td><td>{row.reference || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted small" style={{ margin: 0 }}>لا توجد تفاصيل مسجلة لهذا البند.</p>}
    </details>
  );
}
