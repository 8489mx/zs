import { ForbiddenException, Injectable, StreamableFile } from '@nestjs/common';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AuditService } from '../../../core/audit/audit.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';

@Injectable()
export class SettingsSupportService {
  constructor(private readonly audit: AuditService) {}

  assertAdmin(auth?: AuthContext | null): asserts auth is AuthContext {
    if (!auth) throw new ForbiddenException('Authentication required');
    const canManage = auth.role === 'super_admin' || auth.permissions.includes('settings') || auth.permissions.includes('canManageSettings');
    if (!canManage) throw new ForbiddenException('Missing required permissions');
    requireTenantScope(auth);
  }

  async generateSupportBundle(actor: AuthContext): Promise<Buffer> {
    this.assertAdmin(actor);

    const zip = new AdmZip();
    
    // 1. Health & Environment Snapshot (Allowlist only)
    const envAllowlist = ['APP_MODE', 'NODE_ENV', 'PORT', 'npm_package_version', 'PORTABLE_MODE'];
    const safeEnv: Record<string, string> = {};
    for (const key of envAllowlist) {
      if (process.env[key]) {
        safeEnv[key] = process.env[key]!;
      }
    }

    const healthSnapshot = {
      timestamp: new Date().toISOString(),
      appVersion: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: safeEnv,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
    
    zip.addFile('health.json', Buffer.from(JSON.stringify(healthSnapshot, null, 2), 'utf8'));

    // 2. Read Update Markers
    const rootDir = process.cwd();
    const updateMarkers = ['.update_pending', '.update_failed', '.update_ready'];
    const statusSnapshot: Record<string, boolean> = {};
    for (const marker of updateMarkers) {
      try {
        await fs.access(path.join(rootDir, marker));
        statusSnapshot[marker] = true;
      } catch {
        statusSnapshot[marker] = false;
      }
    }
    zip.addFile('status.json', Buffer.from(JSON.stringify(statusSnapshot, null, 2), 'utf8'));

    // 3. Collect Logs (tailing the last 500 lines if possible, or just add the file if it's small)
    // Redacting secrets from logs
    try {
      const logsDir = path.join(rootDir, 'logs'); // Assuming logs are in backend/logs
      const files = await fs.readdir(logsDir);
      for (const file of files) {
        if (file.endsWith('.log')) {
          const content = await fs.readFile(path.join(logsDir, file), 'utf8');
          // Basic redaction for tokens/passwords
          const redacted = content
            .replace(/(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g, '[REDACTED_JWT]')
            .replace(/password[:=]\s*['"]?[^'"\s,]+['"]?/gi, 'password=[REDACTED]')
            .replace(/secret[:=]\s*['"]?[^'"\s,]+['"]?/gi, 'secret=[REDACTED]');
          
          // Take configurable number of lines
          const tailLines = parseInt(process.env.SUPPORT_BUNDLE_LOG_TAIL_LINES || '2000', 10);
          const lines = redacted.split('\n');
          const tail = lines.slice(-tailLines).join('\n');
          
          zip.addFile(`logs/${file}`, Buffer.from(tail, 'utf8'));
        }
      }
    } catch (e) {
      // Ignore if logs dir doesn't exist
    }

    await this.audit.log('استخراج حزمة الدعم', `تم إنشاء حزمة الدعم الفني بواسطة ${actor.username}`, actor).catch(() => undefined);
    
    return zip.toBuffer();
  }
}
