import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/http';

const { loginMock, loginMfaMock, meMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  loginMfaMock: vi.fn(),
  meMock: vi.fn(),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    login: loginMock,
    loginMfa: loginMfaMock,
    me: meMock,
  },
}));

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<div>داخل النظام</div>} />
    </Routes>,
    { wrapper: Wrapper },
  );
}

const SESSION_PAYLOAD = {
  ok: true,
  sessionId: 'sess-1',
  user: { id: 1, username: 'owner', role: 'admin', permissions: ['dashboard'], displayName: 'Owner', branchIds: [], defaultBranchId: '', tenantId: 't1', accountId: 't1' },
  tenant: { id: 't1', slug: 't1', businessName: 'متجر الاختبار' },
};

async function submitPassword() {
  const user = userEvent.setup();
  renderLogin();
  await user.type(screen.getByLabelText(/رقم الهاتف المحمول أو اسم المستخدم/), 'owner');
  await user.type(screen.getByLabelText('كلمة المرور'), 'pass1234');
  await user.click(screen.getByRole('button', { name: /تسجيل الدخول/ }));
  return user;
}

describe('LoginPage — الخطوة الثانية (MFA)', () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMfaMock.mockReset();
    meMock.mockReset();
    localStorage.clear();
    useAuthStore.getState().clearSession?.();
  });

  /**
   * MFA-1 في الواجهة: الرد الذي يحمل تحدياً لا يحمل جلسة، ويجب ألّا تلمس الواجهة متجر الحالة
   * ولا تنتقل لأي صفحة. لو ضبطت الواجهة المستخدم هنا، صار العامل الثاني نافذة تُغلق لا بوابة.
   */
  it('asks for the code without establishing any session', async () => {
    loginMock.mockResolvedValueOnce({ ok: true, mfaRequired: true, mfaToken: 'challenge-token', username: 'owner' });
    await submitPassword();

    expect(await screen.findByLabelText('رمز التحقق')).toBeInTheDocument();
    expect(screen.getByText(/عليه تحقق بخطوتين/)).toBeInTheDocument();
    expect(meMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeFalsy();
    expect(screen.queryByText('داخل النظام')).not.toBeInTheDocument();
  });

  it('completes the login with a valid code', async () => {
    loginMock.mockResolvedValueOnce({ ok: true, mfaRequired: true, mfaToken: 'challenge-token', username: 'owner' });
    loginMfaMock.mockResolvedValueOnce(SESSION_PAYLOAD);
    meMock.mockResolvedValueOnce({
      user: SESSION_PAYLOAD.user,
      tenant: SESSION_PAYLOAD.tenant,
      settings: { storeName: 'متجر الاختبار', theme: 'light' },
      security: { mustChangePassword: false, usingDefaultAdminPassword: false },
    });

    const user = await submitPassword();
    await user.type(await screen.findByLabelText('رمز التحقق'), '123456');
    await user.click(screen.getByRole('button', { name: /تأكيد الرمز/ }));

    await waitFor(() => {
      expect(loginMfaMock).toHaveBeenCalledWith({ mfaToken: 'challenge-token', code: '123456' });
    });
    await waitFor(() => expect(useAuthStore.getState().user?.username).toBe('owner'));
  });

  it('keeps the user on the code step when the code is wrong', async () => {
    loginMock.mockResolvedValueOnce({ ok: true, mfaRequired: true, mfaToken: 'challenge-token', username: 'owner' });
    loginMfaMock.mockRejectedValueOnce(new ApiError('رمز التحقق غير صحيح.', 401, { code: 'MFA_CODE_INVALID' }));

    const user = await submitPassword();
    await user.type(await screen.findByLabelText('رمز التحقق'), '000000');
    await user.click(screen.getByRole('button', { name: /تأكيد الرمز/ }));

    expect(await screen.findByText('رمز التحقق غير صحيح.')).toBeInTheDocument();
    expect(screen.getByLabelText('رمز التحقق')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeFalsy();
  });

  /** التحدي يعيش خمس دقائق. بعدها لا يجوز أن يعلق المستخدم في شاشة رمز لا تعمل. */
  it('falls back to the password step when the challenge expires', async () => {
    loginMock.mockResolvedValueOnce({ ok: true, mfaRequired: true, mfaToken: 'challenge-token', username: 'owner' });
    loginMfaMock.mockRejectedValueOnce(new ApiError('انتهت مهلة التحقق. أعد تسجيل الدخول.', 401, { code: 'MFA_CHALLENGE_EXPIRED' }));

    const user = await submitPassword();
    await user.type(await screen.findByLabelText('رمز التحقق'), '123456');
    await user.click(screen.getByRole('button', { name: /تأكيد الرمز/ }));

    expect(await screen.findByText(/انتهت مهلة التحقق/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('رمز التحقق')).not.toBeInTheDocument());
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
  });

  it('lets the user step back to the password form', async () => {
    loginMock.mockResolvedValueOnce({ ok: true, mfaRequired: true, mfaToken: 'challenge-token', username: 'owner' });
    const user = await submitPassword();

    await user.click(await screen.findByRole('button', { name: 'الرجوع لتسجيل الدخول' }));

    await waitFor(() => expect(screen.queryByLabelText('رمز التحقق')).not.toBeInTheDocument());
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
  });

  it('logs in normally when the account has no second factor', async () => {
    loginMock.mockResolvedValueOnce(SESSION_PAYLOAD);
    meMock.mockResolvedValueOnce({
      user: SESSION_PAYLOAD.user,
      tenant: SESSION_PAYLOAD.tenant,
      settings: { storeName: 'متجر الاختبار', theme: 'light' },
      security: { mustChangePassword: false, usingDefaultAdminPassword: false },
    });

    await submitPassword();

    await waitFor(() => expect(useAuthStore.getState().user?.username).toBe('owner'));
    expect(loginMfaMock).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('رمز التحقق')).not.toBeInTheDocument();
  });
});
