export function adjustColorBrightness(hex: string, percent: number): string {
  let cleanHex = String(hex || '').trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) return hex || '#170c5c';

  const num = parseInt(cleanHex, 16);
  if (Number.isNaN(num)) return hex;

  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyAccentColorToDocument(accentColor?: string | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = String(accentColor || '').trim() || '#170c5c';
  const primaryDark = adjustColorBrightness(primary, -25);
  const primaryLight = `${primary}1a`;

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--primary2', primaryDark);
  root.style.setProperty('--color-primary-dark', primaryDark);
  root.style.setProperty('--color-primary-light', primaryLight);
  root.style.setProperty('--accent', primary);
  root.style.setProperty('--pos-primary', primary);
  root.style.setProperty('--dashboard-primary', primary);
  root.style.setProperty('--report-primary', primary);
}
