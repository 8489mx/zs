import { strict as assert } from 'node:assert';
import { PosTerminalService, derivePosBridgeKey } from '../../src/modules/sales/services/pos-terminal.service';

const prior = process.env.POS_BRIDGE_MASTER_SECRET;
const master = 'test-only-bridge-secret-that-is-long-enough-2026';
process.env.POS_BRIDGE_MASTER_SECRET = master;

async function run(): Promise<void> {
  const service = new PosTerminalService();
  const keyA = derivePosBridgeKey(master, 'tenant-a');
  const keyB = derivePosBridgeKey(master, 'tenant-b');
  assert.notEqual(keyA, keyB, 'tenant device credentials must be separated');
  assert.equal(keyA.length, 64);
  service.assertBridgeAuthenticated('tenant-a', keyA);
  assert.throws(() => service.assertBridgeAuthenticated('tenant-b', keyA), 'credential must not cross tenants');
  assert.throws(() => service.assertBridgeAuthenticated('tenant-a', ''), 'anonymous bridge polling must fail');
  assert.throws(() => service.assertBridgeAuthenticated('tenant-a', 'not-a-key'));
  delete process.env.POS_BRIDGE_MASTER_SECRET;
  assert.throws(() => service.assertBridgeAuthenticated('tenant-a', keyA), 'bridge must fail closed when master unset');
  process.env.POS_BRIDGE_MASTER_SECRET = master;

  (service as any).activeSessions.set('job-1', {
    tenantId: 'tenant-a', transactionId: 'job-1', terminalId: 'terminal-a', status: 'processing',
    amount: 200, currency: 'EGP', createdAt: Date.now(), updatedAt: Date.now(),
  });
  assert.equal(await service.handleBridgeCallback('tenant-b', {
    jobId: 'job-1', status: 'approved', authCode: 'AUTH123', rrn: 'RRN123',
  }), false, 'cross-tenant callback must fail');
  assert.equal(await service.handleBridgeCallback('tenant-a', {
    jobId: 'job-1', status: 'approved',
  }), false, 'bank authorization and RRN are mandatory');
  assert.equal(await service.handleBridgeCallback('tenant-a', {
    jobId: 'job-1', status: 'approved', authCode: 'AUTH123', rrn: 'RRN123',
  }), true, 'authenticated pending callback with bank reference can progress');
  assert.equal(await service.handleBridgeCallback('tenant-a', {
    jobId: 'job-1', status: 'approved', authCode: 'AUTH123', rrn: 'RRN123',
  }), false, 'approval replay cannot overwrite finalized status');
  const oldMode = process.env.APP_MODE;
  try {
    process.env.APP_MODE = 'CLOUD_SAAS';
    (service as any).getTerminals = async () => [{
      id: 'mock-1', name: 'Sandbox Terminal', type: 'integrated_ip', status: 'online',
      provider: 'mock_sandbox', ipAddress: '127.0.0.1', isDefault: true,
    }];
    await assert.rejects(service.initiatePayment('tenant-a', { terminalId: 'mock-1', amount: 50 }),
      'production must refuse simulated terminal charge');
    (service as any).activeSessions.set('old-mock', {
      tenantId: 'tenant-a', transactionId: 'old-mock', terminalId: 'mock-1',
      status: 'pending', isSimulated: true, createdAt: Date.now(), updatedAt: Date.now(),
    });
    const blocked = await service.getPaymentStatus('tenant-a', 'old-mock');
    assert.equal(blocked.status, 'declined', 'legacy simulated session may not mature to approved in production');
  } finally {
    if (oldMode === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = oldMode;
  }
  console.log('POS bridge tenant authentication and replay safety regressions passed');
}
run().finally(() => {
  if (prior === undefined) delete process.env.POS_BRIDGE_MASTER_SECRET;
  else process.env.POS_BRIDGE_MASTER_SECRET = prior;
}).catch(error => { console.error(error); process.exitCode = 1; });
