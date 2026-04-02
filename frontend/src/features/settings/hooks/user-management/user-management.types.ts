import type { ManagedUserRecord } from '@/features/settings/api/settings.api';

export type UserBulkAction = 'unlock' | 'require-password-change' | 'deactivate';

export type UserMutationAction =
  | { type: 'create'; payload: ManagedUserRecord }
  | { type: 'update'; id: string; payload: ManagedUserRecord }
  | { type: 'delete'; id: string }
  | { type: 'unlock'; id: string };
