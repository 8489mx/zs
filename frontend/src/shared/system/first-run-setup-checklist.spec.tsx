import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { FirstRunSetupChecklist } from '@/shared/system/first-run-setup-checklist';

const { flowMock } = vi.hoisted(() => ({
  flowMock: vi.fn(),
}));

vi.mock('@/features/settings/hooks/useFirstRunSetupFlow', () => ({
  useFirstRunSetupFlow: flowMock,
}));

describe('FirstRunSetupChecklist', () => {
  it('keeps setup-mode links when guiding the bootstrap admin through the remaining steps', () => {
    flowMock.mockReturnValue({
      enabled: true,
      isError: false,
      isComplete: false,
      isLoading: false,
      completedCount: 3,
      totalCount: 4,
      steps: [
        { key: 'store', title: 'بيانات المنشأة', to: '/settings/core?setup=1', done: true, ctaLabel: 'افتح الإعدادات الأساسية' },
        { key: 'branch-location', title: 'تعريف نقطة التشغيل', to: '/settings/reference?setup=1', done: true, ctaLabel: 'افتح بيانات المتجر ونقطة التشغيل' },
        { key: 'admin-user', title: 'مستخدم الإدارة اليومي', to: '/settings/users?setup=1', done: true, ctaLabel: 'افتح إدارة المستخدمين' },
        { key: 'secure-account', title: 'تأمين حساب التثبيت', to: '/settings/users?setup=1', done: false, ctaLabel: 'افتح حساب التثبيت' },
      ],
    });

    render(
      <MemoryRouter>
        <FirstRunSetupChecklist />
      </MemoryRouter>,
    );

    expect(screen.getByText((_, element) => element?.tagName === 'STRONG' && (element.textContent?.includes('تأمين حساب التثبيت') ?? false))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'افتح حساب التثبيت' })).toHaveAttribute('href', '/settings/users?setup=1');
  });
});
