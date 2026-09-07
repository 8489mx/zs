import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { activationApi } from '@/shared/api/activation';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';
import { applyDocumentLanguage, getStoredUiLanguage, normalizeUiLanguage, persistUiLanguage } from '@/shared/locale/locale-preference';

import { buildSettingsFromIndustry, type IndustryPresetId } from '@/features/settings/components/modular-configurator/modular-presets';

const INITIAL_STATE = {
  uiLanguage: getStoredUiLanguage(),
  storeName: '',
  branchName: '',
  branchCode: '',
  locationName: '',
  locationCode: '',
  adminDisplayName: 'مدير النظام',
  adminUsername: 'zs',
  adminPassword: 'infoadmin',
};

export function useFirstRunSetupPageController() {
  const navigate = useNavigate();
  const setAppGate = useAuthStore((state) => state.setAppGate);
  const [form, setForm] = useState(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof typeof INITIAL_STATE>(key: K, value: string) {
    if (key === 'uiLanguage') {
      const language = normalizeUiLanguage(value);
      persistUiLanguage(language);
      applyDocumentLanguage(language);
      setForm((current) => ({ ...current, [key]: language }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, extra?: { industry?: string }): Promise<boolean> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = { ...form, theme: 'light' };
      const branchClean = payload.branchName?.trim() || 'الفرع الرئيسي';
      payload.branchName = branchClean;
      if (!payload.locationName?.trim()) {
        payload.locationName = branchClean.startsWith('فرع ') ? `رصيد ${branchClean}` : `رصيد فرع ${branchClean}`;
      }
      if (extra?.industry) {
        payload.businessIndustry = extra.industry;
        payload.initialSettings = buildSettingsFromIndustry(extra.industry as IndustryPresetId);
      }
      await activationApi.initialize(payload);
      setAppGate('login');
      navigate('/login?setup=done', { replace: true });
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر حفظ التهيئة الأولية. راجع البيانات ثم أعد المحاولة.'));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return {
    error,
    form,
    handleSubmit,
    submitting,
    updateField,
  };
}
