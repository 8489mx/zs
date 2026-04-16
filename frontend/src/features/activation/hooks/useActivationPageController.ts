import { useMemo, useState } from 'react';
import { activationApi } from '@/shared/api/activation';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth-store';

export function useActivationPageController() {
  const status = useAuthStore((state) => state.activationStatus);
  const setAppGate = useAuthStore((state) => state.setAppGate);
  const [activationCode, setActivationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const machineId = status?.machineId || '';
  const copyLabel = useMemo(() => (machineId ? 'نسخ معرف الجهاز' : 'لا يوجد معرف جهاز'), [machineId]);

  async function handleActivate() {
    if (!activationCode.trim()) {
      setError('أدخل كود التفعيل أولًا.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await activationApi.activate(activationCode.trim());
      if (response.setupRequired) setAppGate('setup', response);
      else setAppGate('login', response);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر تفعيل البرنامج. تحقق من الكود ثم أعد المحاولة.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyMachineId() {
    if (!machineId) return;
    await navigator.clipboard?.writeText(machineId);
  }

  return {
    activationCode,
    setActivationCode,
    copyLabel,
    error,
    handleActivate,
    handleCopyMachineId,
    machineId,
    submitting,
  };
}
