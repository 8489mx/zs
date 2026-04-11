import { triggerDownload } from './download';

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

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

export function parseCsvRows(text: string) {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      if (header) acc[header] = values[index] ?? '';
      return acc;
    }, {});
  }).filter((row) => Object.values(row).some((value) => String(value || '').trim()));
}
