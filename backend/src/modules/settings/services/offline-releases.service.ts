import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

@Injectable()
export class OfflineReleasesService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  /**
   * Called by offline portable clients on startup.
   * Returns the latest active release if it is newer than the client's current version.
   */
  async checkForUpdate(currentVersion: string) {
    const active = await this.db
      .selectFrom('offline_releases')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('promoted_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    if (!active) {
      return { hasUpdate: false };
    }

    // Simple version comparison: if the client version differs from active, offer update.
    const isSame = currentVersion.trim() === active.version.trim();
    if (isSame) {
      return { hasUpdate: false };
    }

    return {
      hasUpdate: true,
      latest: active.version,
      changelog: active.changelog,
      patchUrl: active.patch_url,
      promotedAt: active.promoted_at,
    };
  }

  async listReleaseHistory() {
    const rows = await this.db
      .selectFrom('offline_releases')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('promoted_at', 'desc')
      .execute();

    return rows.map((r) => ({
      version: r.version,
      changelog: r.changelog,
      patchUrl: r.patch_url,
      promotedAt: r.promoted_at,
    }));
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async listReleases(_auth: AuthContext) {
    const rows = await this.db
      .selectFrom('offline_releases')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();

    return rows.map((r) => ({
      id: r.id,
      version: r.version,
      changelog: r.changelog,
      patchUrl: r.patch_url,
      isActive: r.is_active,
      promotedBy: r.promoted_by,
      promotedAt: r.promoted_at,
      createdAt: r.created_at,
    }));
  }

  async createRelease(
    _auth: AuthContext,
    body: { version: string; changelog: string; patchUrl: string },
  ) {
    const { version, changelog, patchUrl } = body;

    if (!version?.trim()) throw new BadRequestException('version مطلوب');
    if (!patchUrl?.trim()) throw new BadRequestException('patchUrl مطلوب');

    // Check for duplicate version
    const existing = await this.db
      .selectFrom('offline_releases')
      .select('id')
      .where('version', '=', version.trim())
      .executeTakeFirst();

    if (existing) {
      throw new ConflictException(`الإصدار ${version} موجود بالفعل`);
    }

    const inserted = await this.db
      .insertInto('offline_releases')
      .values({
        version: version.trim(),
        changelog: changelog?.trim() ?? '',
        patch_url: patchUrl.trim(),
        is_active: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { ok: true, release: inserted };
  }

  async promoteRelease(auth: AuthContext, id: number) {
    const release = await this.db
      .selectFrom('offline_releases')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!release) throw new NotFoundException(`الإصدار غير موجود`);

    // Deactivate all other releases first
    await this.db
      .updateTable('offline_releases')
      .set({ is_active: false })
      .where('id', '!=', id)
      .execute();

    // Activate this one
    await this.db
      .updateTable('offline_releases')
      .set({
        is_active: true,
        promoted_by: auth.username ?? auth.role,
        promoted_at: new Date().toISOString() as any,
      })
      .where('id', '=', id)
      .execute();

    return { ok: true, message: `تم اعتماد الإصدار ${release.version} كنسخة مستقرة للعملاء` };
  }

  async deactivateRelease(_auth: AuthContext, id: number) {
    const release = await this.db
      .selectFrom('offline_releases')
      .select(['id', 'version'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!release) throw new NotFoundException(`الإصدار غير موجود`);

    await this.db
      .updateTable('offline_releases')
      .set({ is_active: false })
      .where('id', '=', id)
      .execute();

    return { ok: true, message: `تم إلغاء تفعيل الإصدار ${release.version}` };
  }

  /**
   * Writes .update_pending marker then spawns ApplyAndRestart.ps1 as a
   * detached process that will: download the patch, apply it, run migrations,
   * and restart the backend — all without any manual user intervention.
   */
  async triggerUpdate(auth: AuthContext) {
    const active = await this.db
      .selectFrom('offline_releases')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('promoted_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    if (!active) {
      throw new BadRequestException('لا يوجد إصدار مفعّل حالياً');
    }

    // Resolve paths (CWD = app/backend in portable mode)
    const portableRoot  = path.resolve(process.cwd(), '../..');
    const runtimeRunDir = path.join(portableRoot, 'runtime', 'run');

    try { fs.mkdirSync(runtimeRunDir, { recursive: true }); } catch { /* ignore */ }

    // Write the pending marker with all runtime info the restart script needs
    const pendingFile = path.join(runtimeRunDir, '.update_pending');
    const payload = {
      version:      active.version,
      patchUrl:     active.patch_url,
      changelog:    active.changelog,
      triggeredBy:  auth.username ?? auth.role,
      triggeredAt:  new Date().toISOString(),
      // Runtime context for ApplyAndRestart.ps1
      nodeExe:      process.execPath,
      backendCwd:   process.cwd(),
      backendEntry: process.argv[1] ?? 'dist/main.js',
      backendPort:  process.env.BACKEND_PORT ?? '3001',
    };
    fs.writeFileSync(pendingFile, JSON.stringify(payload, null, 2), 'utf8');

    // Spawn ApplyAndRestart.ps1 as a fully detached process so it survives
    // after this Node.js process exits
    const applyScript = path.join(portableRoot, 'tools', 'launcher', 'scripts', 'ApplyAndRestart.ps1');
    if (fs.existsSync(applyScript)) {
      const ps = spawn(
        'powershell.exe',
        [
          '-ExecutionPolicy', 'Bypass',
          '-NonInteractive',
          '-WindowStyle', 'Hidden',
          '-File', applyScript,
          '-PortableRoot', portableRoot,
        ],
        { detached: true, stdio: 'ignore', windowsHide: true },
      );
      ps.unref();
    }

    // Exit after the HTTP response is sent
    setTimeout(() => process.exit(0), 1500);

    return {
      ok: true,
      message: `جاري تطبيق الإصدار ${active.version} — سيتم إعادة تشغيل التطبيق تلقائياً خلال لحظات`,
      version: active.version,
    };
  }

  /**
   * Returns the currently running app version using this priority:
   *
   *  1. runtime/run/.app_version  → written by ApplyAndRestart.ps1 after each auto-update
   *  2. process.cwd()/package.json → the backend's own package.json (always present, no
   *     manual configuration needed — just bump the version before building each release)
   *  3. '0.0.0' as an absolute last resort
   *
   * This means zero manual intervention is required from the developer or client.
   */
  getCurrentVersion(): { version: string } {
    // 1. Written by the auto-update script on success
    const versionFile = path.resolve(process.cwd(), '../../runtime/run/.app_version');
    try {
      if (fs.existsSync(versionFile)) {
        const ver = fs.readFileSync(versionFile, 'utf8').trim();
        if (ver) return { version: ver };
      }
    } catch { /* ignore */ }

    // 2. Read the backend's own package.json (baked in at build time, always accurate)
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
        if (pkg?.version) return { version: pkg.version };
      }
    } catch { /* ignore */ }

    // 3. Absolute fallback
    return { version: '0.0.0' };
  }
}
