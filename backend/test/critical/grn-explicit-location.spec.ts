import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertGrnRequestedLocationScope } from '../../src/modules/purchases/engines/grn-location-policy.engine';

test('explicit warehouse selection must belong to the active tenant', () => {
  assert.doesNotThrow(() => assertGrnRequestedLocationScope(17, { id: 17 }));
  assert.throws(
    () => assertGrnRequestedLocationScope(17, undefined),
    (err: unknown) => (err as { code?: string }).code === 'GRN_LOCATION_NOT_FOUND',
  );
  assert.throws(
    () => assertGrnRequestedLocationScope(17, { id: 23 }),
    (err: unknown) => (err as { code?: string }).code === 'GRN_LOCATION_NOT_FOUND',
  );
});

test('omitted warehouse may resolve through PO warehouse or tenant default', () => {
  assert.doesNotThrow(() => assertGrnRequestedLocationScope(0, undefined));
});
