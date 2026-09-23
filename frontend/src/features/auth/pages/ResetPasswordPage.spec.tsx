import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { readResetTokenFromLocation } from '@/features/auth/hooks/useResetPasswordForm';
import { ApiError } from '@/lib/http';

const { validateMock, confirmMock } = vi.hoisted(() => ({
  validateMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    validatePasswordResetToken: validateMock,
    confirmPasswordReset: confirmMock,
  },
}));

const TOKEN = 'k7Qv2m8xTbN4pR9sYw1zLd6aHc3eJf0gUi5oXn2qWr8';

function renderPage(entry = `/reset-password#token=${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>شاشة الدخول</div>} />
        <Route path="/forgot-password" element={<div>طلب رابط جديد</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('readResetTokenFromLocation', () => {
  it('prefers the fragment, which never reaches the server or the proxy logs', () => {
    expect(readResetTokenFromLocation('#token=abc', '?token=from-query')).toBe('abc');
  });

  it('still accepts a query token so a manually copied link keeps working', () => {
    expect(readResetTokenFromLocation('', '?token=abc')).toBe('abc');
  });

  it('returns an empty string when there is no token at all', () => {
    expect(readResetTokenFromLocation('', '')).toBe('');
    expect(readResetTokenFromLocation('#', '?')).toBe('');
  });
});

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    validateMock.mockReset();
    confirmMock.mockReset();
  });

  it('validates the token from the URL fragment before showing the form', async () => {
    validateMock.mockResolvedValueOnce({ ok: true, username: 'owner', businessName: 'متجر الاختبار', expiresAt: '2026-09-23T12:30:00.000Z' });
    renderPage();

    await waitFor(() => expect(validateMock).toHaveBeenCalledWith(TOKEN));
    expect(await screen.findByLabelText('كلمة المرور الجديدة')).toBeInTheDocument();
    expect(screen.getByText(/owner — متجر الاختبار/)).toBeInTheDocument();
  });

  it('refuses a dead link and points back to requesting a new one', async () => {
    validateMock.mockRejectedValueOnce(
      new ApiError('رابط إعادة التعيين غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.', 400, { code: 'PASSWORD_RESET_TOKEN_INVALID' }),
    );
    renderPage();

    expect(await screen.findByText(/غير صالح أو انتهت صلاحيته/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /اطلب رابطاً جديداً/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('كلمة المرور الجديدة')).not.toBeInTheDocument();
  });

  it('does not call the API when the two passwords differ', async () => {
    validateMock.mockResolvedValueOnce({ ok: true, username: 'owner', businessName: 'متجر الاختبار', expiresAt: '2026-09-23T12:30:00.000Z' });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('كلمة المرور الجديدة'), 'newpass123');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'newpass124');
    await user.click(screen.getByRole('button', { name: /حفظ كلمة المرور/ }));

    expect(await screen.findByText('كلمتا المرور غير متطابقتين')).toBeInTheDocument();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('sets the new password and states that open sessions were ended', async () => {
    validateMock.mockResolvedValueOnce({ ok: true, username: 'owner', businessName: 'متجر الاختبار', expiresAt: '2026-09-23T12:30:00.000Z' });
    confirmMock.mockResolvedValueOnce({ ok: true, username: 'owner' });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('كلمة المرور الجديدة'), 'newpass123');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'newpass123');
    await user.click(screen.getByRole('button', { name: /حفظ كلمة المرور/ }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith({ token: TOKEN, newPassword: 'newpass123' }));
    expect(await screen.findByText(/إنهاء كل الجلسات المفتوحة/)).toBeInTheDocument();
  });

  it('falls back to the dead-link screen when the token dies between opening the page and submitting', async () => {
    validateMock.mockResolvedValueOnce({ ok: true, username: 'owner', businessName: 'متجر الاختبار', expiresAt: '2026-09-23T12:30:00.000Z' });
    confirmMock.mockRejectedValueOnce(
      new ApiError('رابط إعادة التعيين غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.', 400, { code: 'PASSWORD_RESET_TOKEN_INVALID' }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('كلمة المرور الجديدة'), 'newpass123');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'newpass123');
    await user.click(screen.getByRole('button', { name: /حفظ كلمة المرور/ }));

    expect(await screen.findByRole('link', { name: /اطلب رابطاً جديداً/ })).toBeInTheDocument();
  });

  it('never asks the server about an empty token', async () => {
    renderPage('/reset-password');

    expect(await screen.findByText(/الرابط غير مكتمل/)).toBeInTheDocument();
    expect(validateMock).not.toHaveBeenCalled();
  });
});
