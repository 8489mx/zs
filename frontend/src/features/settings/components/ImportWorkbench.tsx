import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { parseCsvRows } from '@/lib/browser';

export function normalizeHeader(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

type CsvRow = Record<string, string>;


export function summarizeImportResult(result: unknown, rowCount: number, fileName: string): { kind: 'success' | 'warning'; text: string } {
  const payload = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>;
  const inserted = Number(payload.inserted || 0);
  const updated = Number(payload.updated || 0);
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.map((entry) => String(entry || '').trim()).filter(Boolean)
    : [];

  const summaryParts: string[] = [];
  if (inserted > 0) summaryParts.push(`إضافة ${inserted}`);
  if (updated > 0) summaryParts.push(`تحديث ${updated}`);
  if (!summaryParts.length) summaryParts.push(`معالجة ${rowCount}`);

  const baseText = `تمت العملية بنجاح (${summaryParts.join('، ')}) من ${fileName || 'الملف المحدد'}.`;
  if (!warnings.length) {
    return { kind: 'success', text: baseText };
  }

  return {
    kind: 'warning',
    text: `${baseText} تحذيرات: ${warnings.join(' ')}`,
  };
}

interface ImportWorkbenchProps {
  title: string;
  description?: string;
  requiredColumns: string[];
  onDownloadTemplate: () => void;
  onImportRows: (rows: CsvRow[]) => Promise<unknown>;
  isPending?: boolean;
}

export function ImportWorkbench({ title, description = '', requiredColumns, onDownloadTemplate, onImportRows, isPending = false }: ImportWorkbenchProps) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [status, setStatus] = useState<{ kind: 'success' | 'warning' | 'error' | ''; text: string }>({ kind: '', text: '' });

  const normalizedHeaderMap = useMemo(() => {
    return headers.reduce<Record<string, string>>((acc, header) => {
      acc[normalizeHeader(header)] = header;
      return acc;
    }, {});
  }, [headers]);

  const missingColumns = useMemo(() => {
    return requiredColumns.filter((column) => !normalizedHeaderMap[normalizeHeader(column)]);
  }, [normalizedHeaderMap, requiredColumns]);

  const rowIssueCount = useMemo(() => {
    if (!rows.length) return 0;
    return rows.filter((row) => requiredColumns.some((column) => {
      const actualHeader = normalizedHeaderMap[normalizeHeader(column)];
      return !String(actualHeader ? row[actualHeader] : '').trim();
    })).length;
  }, [normalizedHeaderMap, requiredColumns, rows]);

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  async function handleFileSelect(file?: File | null) {
    setStatus({ kind: '', text: '' });
    if (!file) {
      setFileName('');
      setRows([]);
      setHeaders([]);
      return;
    }
    try {
      const parsedRows = parseCsvRows(await file.text());
      if (!parsedRows.length) throw new Error('الملف لا يحتوي على صفوف قابلة للاستيراد.');
      const discoveredHeaders = Array.from(new Set(parsedRows.flatMap((row) => Object.keys(row))));
      setFileName(file.name);
      setRows(parsedRows);
      setHeaders(discoveredHeaders);
    } catch (error) {
      setFileName(file.name);
      setRows([]);
      setHeaders([]);
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر قراءة ملف CSV.' });
    }
  }

  async function handleImport() {
    try {
      if (!rows.length) throw new Error('اختر ملف CSV أولًا.');
      if (missingColumns.length) throw new Error(`الأعمدة المطلوبة غير موجودة: ${missingColumns.join('، ')}`);
      const result = await onImportRows(rows);
      setStatus(summarizeImportResult(result, rows.length, fileName || 'الملف المحدد'));
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر استيراد الملف.' });
    }
  }

  return (
    <div className="inline-create-panel page-stack">
      <div>
        <strong>{title}</strong>
        {description ? <div className="muted small" style={{ marginTop: 6 }}>{description}</div> : null}
      </div>

      <div className="inline-create-grid">
        <div className="field">
          <span>ملف CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const input = event.currentTarget;
              await handleFileSelect(input.files?.[0]);
              input.value = '';
            }}
          />
        </div>
        <div className="field">
          <span>الأعمدة المطلوبة</span>
          <div className="required-columns-wrap">{requiredColumns.map((column) => <span key={column} className="nav-pill">{column}</span>)}</div>
        </div>
      </div>

      <div className="mini-stats-grid import-stats-grid">
        <div className="stat-card compact-stat-card"><span>اسم الملف</span><strong>{fileName || '—'}</strong></div>
        <div className="stat-card compact-stat-card"><span>عدد الصفوف</span><strong>{rows.length}</strong></div>
        <div className="stat-card compact-stat-card"><span>أعمدة مكتشفة</span><strong>{headers.length}</strong></div>
      </div>

      {missingColumns.length ? <div className="warning-box">الأعمدة الناقصة: {missingColumns.join('، ')}</div> : null}
      {rowIssueCount ? <div className="warning-box">يوجد {rowIssueCount} صف يفتقد قيمة واحدة أو أكثر من الحقول المطلوبة.</div> : null}
      {status.text ? <div className={status.kind === 'error' || status.kind === 'warning' ? 'warning-box' : 'success-box'}>{status.text}</div> : null}

      {previewRows.length ? (
        <div className="table-wrap import-preview-table">
          <table>
            <thead>
              <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={`${fileName}-${index}`}>
                  {headers.map((header) => <td key={`${header}-${index}`}>{row[header] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="لا توجد معاينة للملف بعد" hint="اختر ملف CSV وسيظهر أول 5 صفوف هنا قبل تنفيذ الاستيراد." />}

      <div className="actions compact-actions">
        <Button type="button" variant="secondary" onClick={onDownloadTemplate}>تحميل القالب</Button>
        <Button type="button" variant="secondary" onClick={() => { setFileName(''); setRows([]); setHeaders([]); setStatus({ kind: '', text: '' }); }}>مسح المعاينة</Button>
        <Button type="button" onClick={() => void handleImport()} disabled={isPending || !rows.length || !!missingColumns.length}>{isPending ? 'جارٍ الاستيراد...' : 'استيراد الآن'}</Button>
      </div>
    </div>
  );
}
