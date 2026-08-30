import type { CSSProperties, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { Branch, Location } from '@/types/domain';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';

export async function readFileAsDataUrl(file: File, maxDimension = 320, quality = 0.85): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    if (file.type === 'image/svg+xml' || file.size < 40 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الشعار'));
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const fallbackReader = new FileReader();
        fallbackReader.onload = () => resolve(String(fallbackReader.result || ''));
        fallbackReader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const mimeType = file.type.includes('png') ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve(String(fallbackReader.result || ''));
      fallbackReader.onerror = () => reject(new Error('تعذر معالجة صورة الشعار'));
      fallbackReader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

export function BrandPreview({ form }: { form: ReturnType<typeof useForm<SettingsFormInput, undefined, SettingsFormOutput>> }) {
  const brandName = form.watch('brandName');
  const storeName = form.watch('storeName');
  const accentColor = form.watch('accentColor');
  const logoData = form.watch('logoData');
  return (
    <div className="brand-preview-card">
      <div className="brand-preview-mark" style={{ borderColor: accentColor || '#170c5c' }}>
        {logoData ? <img src={logoData} alt="logo preview" className="brand-preview-image" /> : <span style={{ color: accentColor || '#170c5c' }}>{(brandName || storeName || 'Z').slice(0, 1).toUpperCase()}</span>}
      </div>
      <div>
        <strong>{brandName || 'Z Systems'}</strong>
        <div className="muted small">{storeName || 'اسم النشاط / المتجر سيظهر هنا'}</div>
        <div className="brand-color-chip"><span className="brand-color-swatch" style={{ background: accentColor || '#170c5c' }} /> {accentColor || '#170c5c'}</div>
      </div>
    </div>
  );
}

export interface SettingsMainFormProps {
  settings?: import('@/types/domain').AppSettings;
  branches: Branch[];
  locations: Location[];
  canManageSettings: boolean;
  setupMode?: boolean;
  onSetupAdvance?: () => void;
  onUpdateBranch?: (branchId: string, values: { name: string; code: string; defaultStockLocationId?: string; salesStockMode?: 'single_location' | 'all_operational_locations'; allowExternalSalesStock?: boolean }) => Promise<void>;
}

export interface BranchFormProps {
  canManageSettings: boolean;
  setupMode?: boolean;
  onSetupAdvance?: () => void;
  hasExistingLocations?: boolean;
  initialValues?: { name?: string; code?: string };
  onCreated?: (payload: { branchId?: string | null; name: string }) => void;
}

export interface LocationFormProps {
  branches: Branch[];
  canManageSettings: boolean;
  setupMode?: boolean;
  onSetupAdvance?: () => void;
  initialValues?: { name?: string; code?: string; branchId?: string; locationType?: 'internal_warehouse' | 'branch_stock' };
  onCreated?: (payload: { locationId?: string | null; name: string; branchId: string }) => void;
}

export const requiredStarStyle: CSSProperties = { color: '#dc2626', fontWeight: 700, marginInlineStart: 2 };
export const comboListStyle: CSSProperties = { border: '1px solid var(--border, #dbe2ea)', borderRadius: 8, background: 'var(--surface, #fff)', marginTop: 6, maxHeight: 180, overflowY: 'auto', padding: 4 };
export const comboRowStyle: CSSProperties = { width: '100%', textAlign: 'right', background: 'transparent', border: 'none', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' };
export const comboCreateStyle: CSSProperties = { ...comboRowStyle, fontWeight: 700, color: 'var(--primary, #170c5c)' };

export function normalizeText(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export interface RequiredFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function RequiredField({ label, error, children }: RequiredFieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        <span style={requiredStarStyle}>*</span>
      </label>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </div>
  );
}
