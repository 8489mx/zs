import assert from 'node:assert/strict';
import { ZatcaOnboardingService } from '../../src/modules/tax-integration/services/zatca/zatca-onboarding.service';

type EgsRow = {
  id: number;
  tenant_id: string;
  device_uuid: string;
  csr_content: string;
  environment: 'sandbox' | 'simulation' | 'production';
  compliance_csid: string | null;
  compliance_secret: string | null;
};

function fakeDb(egs: EgsRow) {
  let updateCount = 0;
  const db = {
    selectFrom: () => ({
      selectAll: () => ({
        where: () => ({ where: () => ({ executeTakeFirst: async () => egs }) }),
      }),
    }),
    updateTable: () => {
      updateCount += 1;
      return { set: () => ({ where: () => ({ where: () => ({ execute: async () => [] }) }) }) };
    },
    get updateCount() { return updateCount; },
  };
  return db;
}

function response(status: number, body: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

async function main(): Promise<void> {
  const originalFetch = globalThis.fetch;
  try {
    const productionEgs: EgsRow = {
      id: 1, tenant_id: 'tenant-a', device_uuid: 'egs-a', csr_content: 'csr',
      environment: 'production', compliance_csid: null, compliance_secret: null,
    };
    const complianceDb = fakeDb(productionEgs);
    globalThis.fetch = (async () => response(401, { message: 'invalid OTP' })) as typeof fetch;
    const service = new ZatcaOnboardingService(complianceDb as any, {} as any);
    await assert.rejects(
      () => service.requestComplianceCsid('tenant-a', { egsId: 1, otp: '123456' }),
      /ZATCA compliance request failed with HTTP 401/,
    );
    assert.equal(complianceDb.updateCount, 0, 'failed production compliance must not update the EGS');

    const productionReadyEgs = { ...productionEgs, compliance_csid: 'real-compliance', compliance_secret: 'real-secret' };
    const productionDb = fakeDb(productionReadyEgs);
    globalThis.fetch = (async () => response(503, { message: 'unavailable' })) as typeof fetch;
    const productionService = new ZatcaOnboardingService(productionDb as any, {} as any);
    await assert.rejects(
      () => productionService.requestProductionCsid('tenant-a', 1),
      /ZATCA production CSID request failed with HTTP 503/,
    );
    assert.equal(productionDb.updateCount, 0, 'failed production CSID must not activate the EGS');

    console.log('zatca-onboarding-safety.spec: ok');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
