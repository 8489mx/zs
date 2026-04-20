import { strict as assert } from 'node:assert';
import { AuditService } from '../../src/core/audit/audit.service';

function createAuditServiceWithCapture() {
  const inserted: Array<Record<string, unknown>> = [];
  const db = {
    insertInto: () => ({
      values: (payload: Record<string, unknown>) => ({
        execute: async () => {
          inserted.push(payload);
        },
      }),
    }),
  } as any;

  return { service: new AuditService(db), inserted };
}

async function run(): Promise<void> {
  const { service, inserted } = createAuditServiceWithCapture();

  await service.log('test-action', 'plain-details', 99);
  assert.equal(inserted[0]?.created_by, 99);
  assert.equal(inserted[0]?.details, 'plain-details');

  await service.log('tenant-action', 'scoped-details', {
    userId: 7,
    tenantId: 'tenant-a',
    accountId: 'account-a',
  });

  assert.equal(inserted[1]?.created_by, 7);
  assert.equal(inserted[1]?.details, 'scoped-details');

  console.log('audit-tenant-propagation.spec: ok');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
