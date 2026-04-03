import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ReportRangeQueryDto } from '../../src/reports/dto/report-query.dto';

function assertValid(payload: unknown): void {
  const instance = plainToInstance(ReportRangeQueryDto, payload);
  const errors = validateSync(instance as object);
  if (errors.length) throw new Error(`Expected valid payload, got ${errors.length} errors`);
}

function assertInvalid(payload: unknown): void {
  const instance = plainToInstance(ReportRangeQueryDto, payload);
  const errors = validateSync(instance as object);
  if (!errors.length) throw new Error('Expected invalid payload');
}

assertValid({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.000Z', page: 1, pageSize: 20, branchId: 1 });
assertValid({ search: 'cash', filter: 'in' });
assertInvalid({ page: 0 });
assertInvalid({ pageSize: 500 });

process.stdout.write('reports.phase4g.dto.spec.ts passed\n');
