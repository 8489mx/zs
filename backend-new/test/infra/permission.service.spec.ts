import assert from 'node:assert/strict';
import { PermissionService } from '../../src/auth/services/permission.service';

function run(): void {
  const service = new PermissionService();

  assert.equal(service.hasAllPermissions(['sales', 'reports'], ['sales']), true);
  assert.equal(service.hasAllPermissions(['sales'], ['sales', 'reports']), false);
  assert.equal(service.hasAllPermissions([], []), true);
}

run();
process.stdout.write('permission.service.spec.ts passed\n');
