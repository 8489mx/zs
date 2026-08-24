import { useState, useEffect } from 'react';

export interface IconColorPreset {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const ICON_COLOR_PRESETS: IconColorPreset[] = [
  { id: 'blue', label: 'أزرق ناصع (افتراضي)', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'monochrome', label: 'أبيض وأسود / رمادي', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  { id: 'black', label: 'أسود كلاسيك', color: '#0f172a', bg: '#e2e8f0', border: '#94a3b8' },
  { id: 'green', label: 'أخضر زمردي', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'purple', label: 'بنفسجي ملكي', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'amber', label: 'عنبري دافئ', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { id: 'rose', label: 'وردي ياقوتي', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { id: 'custom', label: 'لون مخصص', color: '#2563eb', bg: '#f8fafc', border: '#e2e8f0' },
];

export interface ProductIconSettings {
  themeId: string;
  customColor: string;
  showIcons: boolean;
}

const STORAGE_KEY = 'z_product_icon_settings';

const DEFAULT_SETTINGS: ProductIconSettings = {
  themeId: 'blue',
  customColor: '#2563eb',
  showIcons: true,
};

export function getProductIconSettings(): ProductIconSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      themeId: parsed.themeId || DEFAULT_SETTINGS.themeId,
      customColor: parsed.customColor || DEFAULT_SETTINGS.customColor,
      showIcons: typeof parsed.showIcons === 'boolean' ? parsed.showIcons : true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getEffectiveIconColor(settings?: ProductIconSettings): string {
  const current = settings || getProductIconSettings();
  if (current.themeId === 'custom') {
    return current.customColor || '#2563eb';
  }
  const preset = ICON_COLOR_PRESETS.find((p) => p.id === current.themeId);
  return preset ? preset.color : '#2563eb';
}

export function setProductIconSettings(settings: Partial<ProductIconSettings>): ProductIconSettings {
  const prev = getProductIconSettings();
  const next: ProductIconSettings = { ...prev, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save product icon settings', err);
  }

  // Update CSS variables
  const color = getEffectiveIconColor(next);
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--product-icon-color', color);
    document.documentElement.style.setProperty('--product-icon-display', next.showIcons ? 'inline-flex' : 'none');
  }

  // Dispatch custom event for reactive components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('z_product_icon_settings_changed', { detail: next }));
  }

  return next;
}

export function initProductIconTheme(): void {
  if (typeof document === 'undefined') return;
  const settings = getProductIconSettings();
  const color = getEffectiveIconColor(settings);
  document.documentElement.style.setProperty('--product-icon-color', color);
  document.documentElement.style.setProperty('--product-icon-display', settings.showIcons ? 'inline-flex' : 'none');
}

export function useProductIconSettings(): ProductIconSettings & { effectiveColor: string; update: (s: Partial<ProductIconSettings>) => void } {
  const [settings, setSettings] = useState<ProductIconSettings>(() => getProductIconSettings());

  useEffect(() => {
    const handleChanged = (e: Event) => {
      const customEvent = e as CustomEvent<ProductIconSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getProductIconSettings());
      }
    };

    window.addEventListener('z_product_icon_settings_changed', handleChanged);
    return () => window.removeEventListener('z_product_icon_settings_changed', handleChanged);
  }, []);

  return {
    ...settings,
    effectiveColor: getEffectiveIconColor(settings),
    update: setProductIconSettings,
  };
}
