import { describe, expect, it } from 'vitest';
import type { ReturnRecord } from '@/types/domain';
import { findReturnInRegisterOrRadar } from './return-radar-selection';

describe('full-history return radar selection', () => {
  const row = (id: string) => ({ id, docNo: 'RET-' + id } as ReturnRecord);
  it('resolves suspicious return details outside the visible register page', () => {
    expect(findReturnInRegisterOrRadar('250', [row('1'), row('2')], [row('250')])?.id).toBe('250');
  });
  it('does not substitute a different return when selected id is missing', () => {
    expect(findReturnInRegisterOrRadar('500', [row('1')], [row('250')])).toBeNull();
  });
});
