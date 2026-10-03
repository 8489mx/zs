import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordRotationGate } from '@/shared/system/password-rotation-gate';
import { useAuthStore } from '@/stores/auth-store';

const { changePasswordMock, dismissPasswordChangeMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  dismissPasswordChangeMock: vi.fn(),
}));

vi.mock('@/shared/api/auth', () => ({
  authApi: {
    changePassword: changePasswordMock,
    dismissPasswordChange: dismissPasswordChangeMock,
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

  it('requires a non-empty new password before submitting', async () => {
    seedBootstrapUser();
    const user = userEvent.setup();
    render(<PasswordRotationGate />);

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'old-password-123');
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), '   ');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), '   ');
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }));

    expect(await screen.findByText('أدخل كلمة المرور الحالية والجديدة.')).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });


  it('accepts one-character replacement passwords before calling the API', async () => {
    seedBootstrapUser();
    changePasswordMock.mockResolvedValueOnce({ ok: true, removedOtherSessions: 0 });
    const user = userEvent.setup();
    render(<PasswordRotationGate />);

    await user.type(screen.getByLabelText('كلمة المرور الحالية'), 'old-password-123');
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), '1');
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), '1');
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }));

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not enforce password rotation when mustChangePassword is false', async () => {
    seedBootstrapUser({ mustChangePassword: false, usingDefaultAdminPassword: true });
    render(<PasswordRotationGate />);

    expect(screen.queryByRole('dialog', { name: 'تغيير كلمة المرور قبل المتابعة' })).not.toBeInTheDocument();
  });

  it('clears password-rotation flag after a successful password change', async () => {
    seedBootstrapUser({ mustChangePassword: true });
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
    });
  });

  it('closes dialog and calls dismiss API when user clicks continue with current password', async () => {
    seedBootstrapUser({ mustChangePassword: true });
    dismissPasswordChangeMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<PasswordRotationGate />);

    expect(screen.getByRole('dialog', { name: 'تغيير كلمة المرور قبل المتابعة' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'المتابعة بكلمة المرور الحالية (تخطي)' }));

    await waitFor(() => {
      expect(dismissPasswordChangeMock).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().user?.mustChangePassword).toBe(false);
    });
    expect(screen.queryByRole('dialog', { name: 'تغيير كلمة المرور قبل المتابعة' })).not.toBeInTheDocument();
  });
});
