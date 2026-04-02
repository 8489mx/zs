export function parseCsvRows(text: string) {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const parseLine = (line: string) => {
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
  };

  const headers = parseLine(lines[0]).map((header) => header.trim());
  return lines.slice(1)
    .map((line) => {
      const values = parseLine(line);
      return headers.reduce<Record<string, string>>((acc, header, index) => {
        if (header) acc[header] = values[index] ?? '';
        return acc;
      }, {});
    })
    .filter((row) => Object.values(row).some((value) => String(value || '').trim()));
}
