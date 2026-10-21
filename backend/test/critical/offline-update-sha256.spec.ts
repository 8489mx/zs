import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { assertTrustedOfflineUpdatePackage } from '../../src/modules/settings/services/offline-releases.service';

const payload = Buffer.from('test release archive bytes, not a real update');
const trusted = createHash('sha256').update(payload).digest('hex');
assert.doesNotThrow(() => assertTrustedOfflineUpdatePackage(payload, trusted));
assert.throws(() => assertTrustedOfflineUpdatePackage(payload, undefined), 'no configured operator digest');
assert.throws(() => assertTrustedOfflineUpdatePackage(payload, 'a'.repeat(64)), 'untrusted package');
assert.throws(() => assertTrustedOfflineUpdatePackage(Buffer.alloc(0), trusted), 'empty ZIP');
assert.throws(() => assertTrustedOfflineUpdatePackage(Buffer.alloc(128 * 1024 * 1024 + 1), trusted), 'oversized ZIP');
console.log('Offline update package trust and upload limit regressions passed');
