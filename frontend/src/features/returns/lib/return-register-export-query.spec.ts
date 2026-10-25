import { describe, expect, it } from 'vitest';
import { buildReturnRegisterExportQuery } from './return-register-export-query';
describe('return register export parity', () => {
  it('preserves the selected cashier filter along with search and return type', () => {
    expect(buildReturnRegisterExportQuery({ search: 'R-1', filter: 'sales', employee: '  42 ' }))
      .toEqual({ search: 'R-1', filter: 'sales', employee: '42' });
  });
  it('does not invent employee criteria when none is selected', () => {
    expect(buildReturnRegisterExportQuery({ search: '', filter: 'all' }).employee).toBe('');
  });
});
