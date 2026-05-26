import { describe, expect, it } from 'vitest';
import { blankUserDraft } from '@/features/settings/components/user-management.shared';
import { validateUserDraft } from '@/features/settings/hooks/useUserManagement.helpers';

describe('validateUserDraft', () => {
  it('requires a non-empty password for new users', () => {
    const draft = {
      ...blankUserDraft('admin'),
      username: 'manager',
      name: 'Operational Manager',
      password: '   ',
    };

    expect(() => validateUserDraft({ draft, managedUsers: [] })).toThrowError('كلمة المرور مطلوبة عند إنشاء مستخدم جديد');
  });

  it('accepts a one-character password for new users', () => {
    const draft = {
      ...blankUserDraft('admin'),
      username: 'manager',
      name: 'Operational Manager',
      password: '1',
    };

    const normalized = validateUserDraft({ draft, managedUsers: [] });
    expect(normalized.password).toBe('1');
  });
});
