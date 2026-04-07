import assert from 'node:assert/strict';
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../src/common/errors/app-error';
import { mapToHttpException } from '../../src/common/mappers/error.mapper';

function run(): void {
  const mapped = mapToHttpException(new AppError('Supplier has outstanding balance', 'SUPPLIER_HAS_BALANCE', 400));
  assert.equal(mapped.getStatus(), 400);
  assert.deepEqual(mapped.getResponse(), {
    message: 'لا يمكن حذف المورد لأن عليه رصيدًا قائمًا.',
    code: 'SUPPLIER_HAS_BALANCE',
    details: null,
  });

  const fallback = mapToHttpException(new Error('x'));
  assert.equal(fallback.getStatus(), HttpStatus.INTERNAL_SERVER_ERROR);
}

run();
process.stdout.write('error.mapper.spec.ts passed\n');
