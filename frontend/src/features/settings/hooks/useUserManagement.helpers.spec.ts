import { describe, expect, it } from 'vitest';
import { blankUserDraft } from '@/features/settings/components/user-management.shared';
import { validateUserDraft, toggleDraftBranch } from '@/features/settings/hooks/useUserManagement.helpers';

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

  it('enforces branch selection when branches exist and none is selected', () => {
    const branches = [
      { id: 'branch-1', name: 'فرع 1' },
      { id: 'branch-2', name: 'فرع 2' },
    ];
    const draftWithoutBranches = {
      ...blankUserDraft('cashier'),
      username: 'branch_cashier',
      phone: '01012345678',
      password: 'password123',
      branchIds: [],
    };

    expect(() =>
      validateUserDraft({
        draft: draftWithoutBranches,
        managedUsers: [],
        branches,
        vertical: 'maritime',
      })
    ).toThrowError('يجب اختيار مقر أو مكتب ملاحي واحد على الأقل لتسري عليه صلاحيات هذا المستخدم');
  });

  it('automatically sets defaultBranchId when a single branch is selected', () => {
    const branches = [{ id: 'branch-1', name: 'فرع التعاونيات' }];
    const draftWithSingleBranch = {
      ...blankUserDraft('cashier'),
      username: 'branch_cashier',
      phone: '01012345678',
      password: 'password123',
      branchIds: ['branch-1'],
      defaultBranchId: '',
    };

    const normalized = validateUserDraft({
      draft: draftWithSingleBranch,
      managedUsers: [],
      branches,
    });
    expect(normalized.defaultBranchId).toBe('branch-1');
  });
});

describe('toggleDraftBranch', () => {
  it('automatically sets defaultBranchId when first branch is toggled on', () => {
    const initial = { ...blankUserDraft('cashier'), branchIds: [], defaultBranchId: '' };
    const next = toggleDraftBranch(initial, 'branch-1');
    expect(next.branchIds).toEqual(['branch-1']);
    expect(next.defaultBranchId).toBe('branch-1');
  });

  it('resets defaultBranchId when branch is toggled off', () => {
    const initial = { ...blankUserDraft('cashier'), branchIds: ['branch-1'], defaultBranchId: 'branch-1' };
    const next = toggleDraftBranch(initial, 'branch-1');
    expect(next.branchIds).toEqual([]);
    expect(next.defaultBranchId).toBe('');
  });
});
