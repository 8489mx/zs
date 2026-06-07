import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { activationApi } from '@/shared/api/activation';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';
import { applyDocumentLanguage, getStoredUiLanguage, normalizeUiLanguage, persistUiLanguage } from '@/shared/locale/locale-preference';

const INITIAL_STATE = {
  uiLanguage: getStoredUiLanguage(),
  storeName: '',
  branchName: '',
  branchCode: '',
  locationName: '',
  locationCode: '',
  adminDisplayName: '',
  adminUsername: '',
  adminPassword: '',
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await activationApi.initialize({ ...form, theme: 'light' });
      setAppGate('login');
      navigate('/login?setup=done', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر حفظ التهيئة الأولية. راجع البيانات ثم أعد المحاولة.'));
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
