import { strict as assert } from 'node:assert';
import { IdempotencyService } from '../../src/core/idempotency/idempotency.service';
import { AppError } from '../../src/common/errors/app-error';
import { idempotencyStorage } from '../../src/core/idempotency/idempotency.context';

// Mock DB
let insertSuccess = true;
let existingRecord: any = null;
let updatedRecord: any = null;
let updates: any[] = [];

const mockDb: any = {
  insertInto: () => ({
    values: (data: any) => ({
      execute: async () => {
        if (!insertSuccess) {
          const err = new Error('duplicate key');
          (err as any).code = '23505';
          throw err;
        }
        existingRecord = data;
      }
    })
  }),
  selectFrom: () => ({
    selectAll: () => ({
      where: () => ({
        where: () => ({
          where: () => ({
            where: () => ({
              executeTakeFirst: async () => existingRecord
            }),
            executeTakeFirst: async () => existingRecord
          })
        })
      })
    })
  }),
  updateTable: () => ({
    set: (data: any) => ({
      where: () => ({
        where: () => ({
          where: () => ({
            where: () => ({
              where: () => ({
                where: () => ({
                  execute: async () => {
                    updates.push(data);
                    if (existingRecord) existingRecord.status = data.status;
                  }
                }),
                execute: async () => {
                  updates.push(data);
                  if (existingRecord) existingRecord.status = data.status;
                }
              }),
              execute: async () => {
                updates.push(data);
                if (existingRecord) existingRecord.status = data.status;
              }
            })
          })
        })
      })
    })
  })
};

const service = new IdempotencyService(mockDb);

async function runTests() {
  console.log('Running idempotency tests...');

  // 1. Request Hash
  const hash1 = service.generateRequestHash({ a: 1, b: 2 });
  const hash2 = service.generateRequestHash({ b: 2, a: 1 });
  assert.equal(hash1, hash2, 'Canonical serialization failed');

  // 2. Successful reservation
  insertSuccess = true;
  let result = await service.reserveOperation({
    tenantId: 't1', accountId: 'a1', idempotencyKey: 'k1', operationType: 'test', requestHash: hash1
  });
  assert.equal(result, null, 'Expected reservation to succeed (return null)');

  // 3. Duplicate key with same hash
  insertSuccess = false;
  existingRecord = { status: 'processing', request_hash: hash1 };
  result = await service.reserveOperation({
    tenantId: 't1', accountId: 'a1', idempotencyKey: 'k1', operationType: 'test', requestHash: hash1
  });
  assert.equal(result?.status, 'processing');

  // 4. Duplicate key with different hash
  insertSuccess = false;
  existingRecord = { status: 'processing', request_hash: 'different_hash' };
  try {
    await service.reserveOperation({
      tenantId: 't1', accountId: 'a1', idempotencyKey: 'k1', operationType: 'test', requestHash: hash1
    });
    assert.fail('Expected error for different payload');
  } catch (error: any) {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
  }

  // 5. AsyncLocalStorage context
  await new Promise<void>((resolve) => {
    idempotencyStorage.run({ idempotencyKey: 'key_123', operationType: 'op' }, () => {
      const ctx = idempotencyStorage.getStore();
      assert.equal(ctx?.idempotencyKey, 'key_123');
      resolve();
    });
  });

  // 6. Record failure update condition (must not overwrite committed)
  updates = [];
  await service.recordFailure({ tenantId: 't1', accountId: 'a1', idempotencyKey: 'k1', operationType: 'test' }, 'ERR');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, 'failed');

  console.log('idempotency.spec: ok');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
