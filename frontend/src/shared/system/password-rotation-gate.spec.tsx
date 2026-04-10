import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordRotationGate } from '@/shared/system/password-rotation-gate';
import { useAuthStore } from '@/stores/auth-store';

const { changePasswordMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
}));

vi.mock('@/shared/api/auth', () => ({
  authApi: {
    changePassword: changePasswordMock,
  },
}));

import type { AuthUser } from '@/types/auth';

function seedBootstrapUser(overrides: Partial<AuthUser> = {}) {
  useAuthStore.setState({
    user: {
      id: 'u-root',
      username: 'root',
      role: 'super_admin',
      permissions: [],
      displayName: 'Root User',
      branchIds: ['b-1'],
      defaultBranchId: 'b-1',
      mustChangePassword: true,
      usingDefaultAdminPassword: true,
      ...overrides,
    },
    storeName: 'Z Systems',
    theme: 'light',
    initialized: true,
  });
}

describe('PasswordRotationGate', () => {
  it('prevents submitting the same password as the current one', async () => {
    seedBootstrapUser();
    const user = userEvent.setup();
    render(<PasswordRotationGate />);

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'same-password-123');
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'same-password-123');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'same-password-123');
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }));

    expect(await screen.findByText('كلمة المرور الجديدة يجب أن تختلف عن الحالية.')).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('requires at least 12 characters for the new password before submitting', async () => {
    seedBootstrapUser();
    const user = userEvent.setup();
    render(<PasswordRotationGate />);

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'old-password-123');
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), '12345678901');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), '12345678901');
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }));

    expect(await screen.findByText('كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.')).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });


  it('blocks weak replacement passwords before calling the API', async () => {
    seedBootstrapUser();
    const user = userEvent.setup();
    render(<PasswordRotationGate />);

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'old-password-123');
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'short-pass');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'short-pass');
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }));

    expect(await screen.findByText('كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.')).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('still enforces password rotation when the bootstrap account keeps the default admin password flag', async () => {
    seedBootstrapUser({ mustChangePassword: false, usingDefaultAdminPassword: true });
    render(<PasswordRotationGate />);

    expect(screen.getByRole('dialog', { name: 'تغيير كلمة المرور قبل المتابعة' })).toBeInTheDocument();
    expect(screen.getByText(/حساب التثبيت ما زال يستخدم كلمة المرور الافتراضية/)).toBeInTheDocument();
  });


  it('clears both password-rotation flags after a successful password change', async () => {
    seedBootstrapUser();
    changePasswordMock.mockResolvedValueOnce({ ok: true, removedOtherSessions: 0 });
    const user = userEvent.setup();
    render(<PasswordRotationGate />);

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'old-password-123');
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'new-password-456');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'new-password-456');
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }));

    await screen.findByText('تم تحديث كلمة المرور بنجاح. يمكنك متابعة العمل الآن.');

    await waitFor(() => {
      expect(useAuthStore.getState().user?.mustChangePassword).toBe(false);
      expect(useAuthStore.getState().user?.usingDefaultAdminPassword).toBe(false);
    });
  });
});
