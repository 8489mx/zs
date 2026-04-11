export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, filename);
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCsvContent(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\r\n');
  return `\uFEFF${csv}`;
}

export function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const blob = new Blob([buildCsvContent(headers, rows)], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}
