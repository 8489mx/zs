import assert from 'node:assert/strict';
import { buildReportListState } from '../../src/modules/reports/helpers/reports-query.helper';

(function testBuildReportListStateWithRange() {
  const state = buildReportListState(
    {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
      page: 3,
      pageSize: 40,
      search: '  Milk  ',
      filter: 'Debit',
    },
    25,
  );

  assert.equal(state.range?.from, '2026-01-01T00:00:00.000Z');
  assert.equal(state.range?.to, '2026-01-31T23:59:59.999Z');
  assert.equal(state.search, 'milk');
  assert.equal(state.searchPattern, '%milk%');
  assert.equal(state.filter, 'debit');
  assert.equal(state.page, 3);
  assert.equal(state.pageSize, 40);
  assert.equal(state.offset, 80);
  assert.ok(state.fromDate instanceof Date);
  assert.ok(state.toDate instanceof Date);
})();

(function testBuildReportListStateWithoutRange() {
  const state = buildReportListState(
    {
      page: 2,
      pageSize: 15,
      search: '   ',
    },
    20,
    { includeRange: false, defaultFilter: 'attention' },
  );

  assert.equal(state.search, '');
  assert.equal(state.searchPattern, undefined);
  assert.equal(state.filter, 'attention');
  assert.equal(state.page, 2);
  assert.equal(state.pageSize, 15);
  assert.equal(state.offset, 15);
  assert.equal(state.range, undefined);
  assert.equal(state.fromDate, undefined);
  assert.equal(state.toDate, undefined);
})();

console.log('reports-query.helper specs passed');
