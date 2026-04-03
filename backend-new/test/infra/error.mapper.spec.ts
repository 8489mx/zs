import assert from 'node:assert/strict';
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../src/common/errors/app-error';
import { mapToHttpException } from '../../src/common/mappers/error.mapper';

function run(): void {
  const mapped = mapToHttpException(new AppError('bad', 'BAD', 422));
  assert.equal(mapped.getStatus(), 422);

  const fallback = mapToHttpException(new Error('x'));
  assert.equal(fallback.getStatus(), HttpStatus.INTERNAL_SERVER_ERROR);
}

run();
process.stdout.write('error.mapper.spec.ts passed\n');
