import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { ForbiddenException } from '@nestjs/common';
import { AppError } from '../../src/common/errors/app-error';
import { SettingsAdminService } from '../../src/modules/settings/services/settings-admin.service';
import { SettingsBackupService } from '../../src/modules/settings/services/settings-backup.service';
import type { AuthContext } from '../../src/core/auth/interfaces/auth-context.interface';

function actor(overrides: Partial<AuthContext>): AuthContext {
  return {
    userId: 1,
    sessionId: 'session-1',
    username: 'admin',
    role: 'admin',
    permissions: [],
    ...overrides,
  };
}

const backupPayload = {
  meta: {
    version: '1.1.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    source: 'test',
  },
  tables: {},
};

function createBackupService() {
  return new SettingsBackupService({} as any, { log: async () => undefined } as any);
}

function createAdminService() {
  return new SettingsAdminService({} as any, { log: async () => undefined } as any);
}

async function run(): Promise<void> {
  {
    const service = createBackupService();
    const result = await service.restoreBackup(backupPayload, actor({ permissions: ['settings'] }), true);
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
  }

  {
    const service = createBackupService();
    await assert.rejects(
      () => service.restoreBackup({ ...backupPayload, confirmation: 'RESTORE BACKUP' }, actor({ permissions: ['settings'] }), false),
      ForbiddenException,
    );
  }

  {
    const service = createBackupService();
    await assert.rejects(
      () => service.restoreBackup(backupPayload, actor({ permissions: ['canManageBackups'] }), false),
      (error: unknown) => error instanceof AppError && error.code === 'BACKUP_RESTORE_CONFIRMATION_REQUIRED',
    );
  }

  {
    const service = createAdminService();
    await assert.rejects(
      () => service.cleanupExpiredSessions(actor({ permissions: ['settings'] })),
      ForbiddenException,
    );
  }

  console.log('settings-backup-safety.spec: ok');
}

void run();
