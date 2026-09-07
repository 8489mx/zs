import { describe, expect, it } from 'vitest';
import { blankUserDraft } from '@/features/settings/components/user-management.shared';
import { validateUserDraft } from '@/features/settings/hooks/useUserManagement.helpers';

describe('validateUserDraft', () => {
  it('requires a non-empty password for new users', () => {
    const draft = {
      ...blankUserDraft('admin'),
      username: 'manager',
      phone: '01012345678',
      name: 'Operational Manager',
      password: '   ',
    };

    expect(() => validateUserDraft({ draft, managedUsers: [] })).toThrowError('كلمة المرور مطلوبة عند إنشاء مستخدم جديد');
  });

  it('accepts a one-character password for new users', () => {
    const draft = {
      ...blankUserDraft('admin'),
      username: 'manager',
      phone: '01012345678',
      name: 'Operational Manager',
      password: '1',
    };

    const normalized = validateUserDraft({ draft, managedUsers: [] });
    expect(normalized.password).toBe('1');
    expect(normalized.phone).toBe('+201012345678');
  });

  it('strictly requires a mobile phone number', () => {
    const draft = {
      ...blankUserDraft('cashier'),
      username: 'cashier1',
      name: 'Cashier One',
      password: 'secret_password',
      phone: '   ',
    };

    expect(() => validateUserDraft({ draft, managedUsers: [] })).toThrowError('رقم الهاتف المحمول مطلوب ولا يمكن تركه فارغاً');
  });

  it('strictly validates Egyptian phone numbers (11 digits, starts with 010/011/012/015)', () => {
    const draftInvalid = {
      ...blankUserDraft('cashier'),
      username: 'cashier1',
      phone: '01312345678', // Invalid prefix 013
      name: 'Cashier One',
      password: 'secret_password',
    };

    expect(() => validateUserDraft({ draft: draftInvalid, managedUsers: [] })).toThrowError(/010 أو 011 أو 012 أو 015/);

    const draftShort = {
      ...blankUserDraft('cashier'),
      username: 'cashier1',
      phone: '0101234567', // 10 digits
      name: 'Cashier One',
      password: 'secret_password',
    };

    expect(() => validateUserDraft({ draft: draftShort, managedUsers: [] })).toThrowError(/11 رقماً/);

    const draftValid = {
      ...blankUserDraft('cashier'),
      username: 'cashier1',
      phone: '01099887766',
      name: 'Cashier One',
      password: 'secret_password',
    };

    const normalized = validateUserDraft({ draft: draftValid, managedUsers: [] });
    expect(normalized.phone).toBe('+201099887766');
  });

  it('supports international GCC country codes like Saudi Arabia (+966)', () => {
    const draftSaudi = {
      ...blankUserDraft('cashier'),
      username: 'saudi_cashier',
      phone: '0512345678',
      countryCode: 'SA',
      name: 'Saudi Rep',
      password: 'secret_password',
    } as any;

    const normalized = validateUserDraft({ draft: draftSaudi, managedUsers: [] });
    expect(normalized.phone).toBe('+966512345678');
  });

  it('prevents duplicate phone numbers within tenant users', () => {
    const existingUsers = [
      {
        ...blankUserDraft('admin'),
        id: '1',
        username: 'existing_admin',
        phone: '+201012345678',
      },
    ];

    const duplicateDraft = {
      ...blankUserDraft('cashier'),
      username: 'new_cashier',
      phone: '01012345678', // same number in local format
      name: 'New Cashier',
      password: 'secret_password',
    };

    expect(() => validateUserDraft({ draft: duplicateDraft, managedUsers: existingUsers })).toThrowError('رقم الهاتف المحمول مستخدم بالفعل لمستخدم آخر');
  });
});
