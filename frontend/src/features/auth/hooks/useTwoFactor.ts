import { useCallback, useEffect, useState } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import { ApiError } from '@/lib/http';
import type { MfaSetupResponse, MfaStatusResponse } from '@/shared/api/auth';

export type TwoFactorStage = 'loading' | 'off' | 'enrolling' | 'showing-codes' | 'on';

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function useTwoFactor() {
  const [stage, setStage] = useState<TwoFactorStage>('loading');
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await authApi.mfaStatus();
      setStatus(next);
      setStage(next.enabled ? 'on' : 'off');
    } catch (err) {
      setError(messageOf(err, 'تعذر قراءة حالة التحقق بخطوتين.'));
      setStage('off');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function beginSetup() {
    setError('');
    setBusy(true);
    try {
      setSetup(await authApi.mfaSetup());
      setStage('enrolling');
    } catch (err) {
      setError(messageOf(err, 'تعذر بدء إعداد التحقق بخطوتين.'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(code: string) {
    setError('');
    setBusy(true);
    try {
      const result = await authApi.mfaConfirm(code.trim());
      // تُعرض مرة واحدة فقط — لا يوجد مسار في النظام يعيدها بعد إغلاق هذه الشاشة.
      setRecoveryCodes(result.recoveryCodes);
      setSetup(null);
      setStage('showing-codes');
      await refresh();
    } catch (err) {
      setError(messageOf(err, 'رمز التحقق غير صحيح.'));
    } finally {
      setBusy(false);
    }
  }

  async function disable(currentPassword: string, code: string) {
    setError('');
    setBusy(true);
    try {
      await authApi.mfaDisable({ currentPassword, code: code.trim() });
      setRecoveryCodes([]);
      await refresh();
      return true;
    } catch (err) {
      setError(messageOf(err, 'تعذر إيقاف التحقق بخطوتين.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function regenerateRecoveryCodes(code: string) {
    setError('');
    setBusy(true);
    try {
      const result = await authApi.mfaRegenerateRecoveryCodes(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setStage('showing-codes');
      await refresh();
      return true;
    } catch (err) {
      setError(messageOf(err, 'تعذر تجديد رموز الاسترداد.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function dismissCodes() {
    setRecoveryCodes([]);
    setStage(status?.enabled ? 'on' : 'off');
  }

  function cancelSetup() {
    setSetup(null);
    setError('');
    setStage('off');
  }

  return {
    stage,
    status,
    setup,
    recoveryCodes,
    error,
    busy,
    beginSetup,
    confirmSetup,
    disable,
    regenerateRecoveryCodes,
    dismissCodes,
    cancelSetup,
  };
}
