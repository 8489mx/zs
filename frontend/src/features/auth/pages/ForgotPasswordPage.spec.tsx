import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ApiError } from '@/lib/http';

const { requestPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    requestPasswordReset: requestPasswordResetMock,
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div>شاشة الدخول</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    requestPasswordResetMock.mockReset();
  });

  it('sends the reset request and confirms without revealing whether the account exists', async () => {
    requestPasswordResetMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ }));

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({ email: 'owner@example.com' });
    });

    // الرسالة مشروطة عمداً: شاشة تؤكد الإرسال لبريد موجود فقط تتحول إلى أداة لحصر عملائنا.
    expect(await screen.findByText(/إن كان مرتبطاً بحساب/)).toBeInTheDocument();
    expect(screen.queryByText(/غير مسجل|لا يوجد حساب/)).not.toBeInTheDocument();
  });

  it('passes the company code only when the user provided one', async () => {
    requestPasswordResetMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /تحديد كود منشأة معين/ }));
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'owner@example.com');
    await user.type(screen.getByLabelText('كود المنشأة (اختياري)'), 'my-store');
    await user.click(screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ }));

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({ email: 'owner@example.com', companyCode: 'my-store' });
    });
  });

  it('rejects a malformed email in the browser without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ }));

    expect(await screen.findByText('صيغة البريد الإلكتروني غير صحيحة')).toBeInTheDocument();
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it('surfaces the rate limit message instead of pretending the mail was sent', async () => {
    requestPasswordResetMock.mockRejectedValueOnce(
      new ApiError('عدد كبير من المحاولات خلال وقت قصير، يرجى المحاولة بعد قليل.', 429),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'owner@example.com');
    await user.click(screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ }));

    expect(await screen.findByText(/عدد كبير من المحاولات/)).toBeInTheDocument();
    expect(screen.queryByText(/إن كان مرتبطاً بحساب/)).not.toBeInTheDocument();
  });
});
