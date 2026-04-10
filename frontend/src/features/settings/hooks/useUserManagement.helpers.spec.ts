import { describe, expect, it } from 'vitest';
import { blankUserDraft } from '@/features/settings/components/user-management.shared';
import { validateUserDraft } from '@/features/settings/hooks/useUserManagement.helpers';

describe('validateUserDraft', () => {
  it('requires a 12-character password for new users', () => {
    const draft = {
      ...blankUserDraft('admin'),
      username: 'manager',
      name: 'Operational Manager',
      password: '12345678901',
    };

    expect(() => validateUserDraft({ draft, managedUsers: [] })).toThrowError('كلمة المرور للمستخدم الجديد يجب ألا تقل عن 12 حرفًا');
  });

  it('accepts a 12-character password for new users', () => {
    const draft = {
      ...blankUserDraft('admin'),
      username: 'manager',
      name: 'Operational Manager',
      password: '123456789012',
    };

    const normalized = validateUserDraft({ draft, managedUsers: [] });
    expect(normalized.password).toBe('123456789012');
  });
});
