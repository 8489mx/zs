import { Button } from '@/shared/ui/button';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';

export interface BackupSnapshotRecord {
  id: string;
  createdAt: string;
  reason?: string | null;
  payload?: Record<string, unknown>;
}

function prettyValue(value: unknown) {
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (value == null || value === '') return '—';
  return String(value);
}

export function SummaryList({ data }: { data?: Record<string, unknown> }) {
  if (!data) return <div className="muted">لا توجد بيانات.</div>;
  return (
    <div className="metric-list">
      {Object.entries(data).slice(0, 8).map(([key, value]) => (
        <div className="metric-row" key={key}><span>{key}</span><strong>{prettyValue(value)}</strong></div>
      ))}
    </div>
  );
}

export function downloadSummaryCsv(filename: string, data?: Record<string, unknown>) {
  const rows = Object.entries(data || {});
  downloadCsvFile(filename, ['key', 'value'], rows.map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : prettyValue(value)]));
}

export function printSummaryList(title: string, data?: Record<string, unknown>) {
  const rows = Object.entries(data || {});
  const body = rows.map(([key, value]) => `<tr><td>${escapeHtml(String(key))}</td><td>${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : prettyValue(value))}</td></tr>`).join('');
  printHtmlDocument(title, `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th>البند</th><th>القيمة</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  `);
}

export function downloadEntityListCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  downloadCsvFile(filename, headers, rows);
}

export function printEntityList(title: string, headers: string[], rows: Array<Array<string | number>>) {
  const head = headers.map((header) => `<th>${escapeHtml(String(header))}</th>`).join('');
  const body = rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value ?? ''))}</td>`).join('')}</tr>`).join('');
  printHtmlDocument(title, `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `);
}

export function SnapshotList({
  snapshots,
  onDownload,
  onRestore,
  restoringId
}: {
  snapshots: BackupSnapshotRecord[];
  onDownload: (snapshot: BackupSnapshotRecord) => void;
  onRestore: (snapshot: BackupSnapshotRecord) => void;
  restoringId: string;
}) {
  if (!snapshots.length) return <div className="muted">لا توجد نسخ تلقائية محفوظة داخل النظام بعد.</div>;
  return (
    <div className="list-stack">
      {snapshots.map((snapshot, index) => (
        <div className="list-row stacked-row" key={snapshot.id}>
          <div>
            <strong>نسخة {index + 1}</strong>
            <div className="muted small">{new Date(snapshot.createdAt).toLocaleString('ar-EG')} · {snapshot.reason || 'auto'}</div>
          </div>
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => onDownload(snapshot)}>تنزيل</Button>
            <Button variant="danger" onClick={() => onRestore(snapshot)} disabled={!snapshot.payload || restoringId === snapshot.id}>{restoringId === snapshot.id ? 'جارٍ الاستعادة...' : 'استعادة'}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
