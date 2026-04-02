import { useForm } from 'react-hook-form';
import type { Branch, Location } from '@/types/domain';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';

export async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الشعار'));
    reader.readAsDataURL(file);
  });
}

export function BrandPreview({ form }: { form: ReturnType<typeof useForm<SettingsFormInput, undefined, SettingsFormOutput>> }) {
  const brandName = form.watch('brandName');
  const storeName = form.watch('storeName');
  const accentColor = form.watch('accentColor');
  const logoData = form.watch('logoData');
  return (
    <div className="brand-preview-card">
      <div className="brand-preview-mark" style={{ borderColor: accentColor || '#2563eb' }}>
        {logoData ? <img src={logoData} alt="logo preview" className="brand-preview-image" /> : <span style={{ color: accentColor || '#2563eb' }}>{(brandName || storeName || 'Z').slice(0, 1).toUpperCase()}</span>}
      </div>
      <div>
        <strong>{brandName || 'Z Systems'}</strong>
        <div className="muted small">{storeName || 'اسم المحل سيظهر هنا'}</div>
        <div className="brand-color-chip"><span className="brand-color-swatch" style={{ background: accentColor || '#2563eb' }} /> {accentColor || '#2563eb'}</div>
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
}

export interface BranchFormProps {
  canManageSettings: boolean;
  setupMode?: boolean;
  onSetupAdvance?: () => void;
  hasExistingLocations?: boolean;
}

export interface LocationFormProps {
  branches: Branch[];
  canManageSettings: boolean;
  setupMode?: boolean;
  onSetupAdvance?: () => void;
}
