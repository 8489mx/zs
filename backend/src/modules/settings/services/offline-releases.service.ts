/// <reference types="multer" />
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import AdmZip from 'adm-zip';

/**
 * Determines the portable/Electron root directory.
 * - In Electron mode: ELECTRON_EXE_PATH env is set by main.cjs → use its directory.
 * - In portable mode: CWD is app/backend → go 2 levels up.
 */
function getPortableRoot(): string {
  if (process.env.ELECTRON_EXE_PATH) {
    return path.dirname(process.env.ELECTRON_EXE_PATH);
  }
  return path.resolve(process.cwd(), '../..');
}

@Injectable()
export class OfflineReleasesService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  /**
   * Called by offline portable clients on startup.
   * Returns the latest active release if it is newer than the client's current version.
   */
  async checkForUpdate(currentVersion: string) {
    console.log(`[DEBUG] updates/check endpoint hit. requestedVersion: ${currentVersion}`);
    const active = await this.db
      .selectFrom('offline_releases')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('promoted_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    const history = await this.listReleaseHistory();
    console.log(`[DEBUG] approvedReleasesCount (history): ${history.length}`);

    if (!active) {
      const result = {
        updateAvailable: false,
        currentVersion,
        latestVersion: null,
        patchUrl: null,
        changelog: null,
        releases: history,
      };
      console.log(`[DEBUG] response body (no active release):`, JSON.stringify(result));
      return result;
    }

    const currentParts = currentVersion.replace('v', '').split('.').map(Number);
    const activeParts = active.version.replace('v', '').split('.').map(Number);
    let isNewer = false;
    for (let i = 0; i < Math.max(currentParts.length, activeParts.length); i++) {
      const c = currentParts[i] || 0;
      const a = activeParts[i] || 0;
      if (a > c) {
        isNewer = true;
        break;
      } else if (c > a) {
        break;
      }
    }

    if (!isNewer) {
      const result = {
        updateAvailable: false,
        currentVersion,
        latestVersion: active.version,
        patchUrl: null,
        changelog: null,
        releases: history,
      };
      console.log(`[DEBUG] response body (not newer):`, JSON.stringify(result));
      return result;
    }

    const result = {
      updateAvailable: true,
      currentVersion,
      latestVersion: active.version,
      patchUrl: active.patch_url,
      changelog: active.changelog,
      releases: history,
    };
    console.log(`[DEBUG] response body (update available):`, JSON.stringify(result));
    return result;
  }

  async listReleaseHistory() {
    const rows = await this.db
      .selectFrom('offline_releases')
      .selectAll()
      .where('promoted_at', 'is not', null)
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

    // Resolve paths
    const portableRoot  = getPortableRoot();
    const runtimeRunDir = path.join(portableRoot, 'runtime', 'run');

    try { fs.mkdirSync(runtimeRunDir, { recursive: true }); } catch { /* ignore */ }

    // Write the pending marker with all runtime info the restart script needs
    const pendingFile = path.join(runtimeRunDir, '.update_pending');
    const payload = {
      version:         active.version,
      patchUrl:        active.patch_url,
      changelog:       active.changelog,
      triggeredBy:     auth.username ?? auth.role,
      triggeredAt:     new Date().toISOString(),
      // Runtime context for ApplyAndRestart.ps1
      nodeExe:         process.execPath,
      backendCwd:      process.cwd(),
      backendEntry:    process.argv[1] ?? 'dist/main.js',
      backendPort:     process.env.BACKEND_PORT ?? '3001',
      electronExePath: process.env.ELECTRON_EXE_PATH || '',
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
   * Called by the local desktop client to apply an update downloaded from SaaS.
   */
  async applyLocalUpdate(body: { version: string; patchUrl: string; changelog: string }) {
    if (process.env.APP_MODE !== 'SELF_CONTAINED' && process.env.PORTABLE_MODE !== 'true') {
      throw new BadRequestException('Updates can only be applied in Desktop/Offline mode');
    }

    if (!body.version || !body.patchUrl) {
      throw new BadRequestException('version and patchUrl are required');
    }

    const portableRoot  = getPortableRoot();
    const runtimeRunDir = path.join(portableRoot, 'runtime', 'run');

    try { fs.mkdirSync(runtimeRunDir, { recursive: true }); } catch { /* ignore */ }

    const pendingFile = path.join(runtimeRunDir, '.update_pending');
    const payload = {
      version:         body.version,
      patchUrl:        body.patchUrl,
      changelog:       body.changelog || '',
      triggeredBy:     'Local User',
      triggeredAt:     new Date().toISOString(),
      nodeExe:         process.execPath,
      backendCwd:      process.cwd(),
      backendEntry:    process.argv[1] ?? 'dist/main.js',
      backendPort:     process.env.BACKEND_PORT ?? '3001',
      electronExePath: process.env.ELECTRON_EXE_PATH || '',
    };
    fs.writeFileSync(pendingFile, JSON.stringify(payload, null, 2), 'utf8');

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

    setTimeout(() => process.exit(0), 1500);

    return {
      ok: true,
      message: `جاري تحميل وتطبيق الإصدار ${body.version} — سيتم إعادة تشغيل التطبيق تلقائياً خلال لحظات`,
      version: body.version,
    };
  }

  /**
   * Called by the local desktop client to apply a manual ZIP update.
   */
  async applyLocalZipUpdate(file: Express.Multer.File) {
    if (process.env.APP_MODE !== 'SELF_CONTAINED' && process.env.PORTABLE_MODE !== 'true') {
      throw new BadRequestException('Updates can only be applied in Desktop/Offline mode');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('ملف التحديث غير موجود');
    }

    // Verify zip structure and security
    let version = 'manual';
    try {
      const zip = new AdmZip(file.buffer);
      const entries = zip.getEntries();
      
      let manifestEntry = null;

      for (const entry of entries) {
        const name = entry.entryName.replace(/\\/g, '/');
        
        // 1. Path Traversal Protection
        if (name.includes('../') || name.startsWith('/') || /^[a-zA-Z]:\//.test(name) || name.includes('\0')) {
          throw new Error('مسار غير آمن في الملف (Path Traversal)');
        }

        if (name === 'update-manifest.json') manifestEntry = entry;
      }

      if (!manifestEntry) {
        throw new Error('ملف التحديث لا يحتوي على update-manifest.json');
      }

      const manifestStr = manifestEntry.getData().toString('utf8');
      const manifest = JSON.parse(manifestStr);

      if (!manifest.version) {
        throw new Error('ملف التحديث يحتوي على manifest غير صالح');
      }
      
      version = manifest.version;

      // 2. Checksum validation
      const crypto = require('crypto');
      for (const f of manifest.files || []) {
        const fileEntry = zip.getEntry(f.path) || zip.getEntry(f.path.replace(/\//g, '\\'));
        if (!fileEntry) throw new Error(`الملف المذكور في manifest غير موجود: ${f.path}`);
        
        const hash = crypto.createHash('sha256').update(fileEntry.getData()).digest('hex');
        if (hash !== f.sha256) {
           throw new Error(`الملف ${f.path} تالف أو تم التلاعب به (Checksum Mismatch)`);
        }
      }

      // 3. Expected structure validation
      for (const folder of manifest.expectedFolders || []) {
        let found = false;
        for (const entry of entries) {
           const name = entry.entryName.replace(/\\/g, '/');
           if (name.startsWith(folder + '/') || name === folder) { found = true; break; }
        }
        if (!found) throw new Error(`المجلد المطلوب ${folder} غير موجود في ملف التحديث`);
      }
    } catch (e: any) {
      throw new BadRequestException(e.message || 'ملف التحديث غير صالح.');
    }

    const portableRoot  = getPortableRoot();
    const stagingDir = path.join(portableRoot, 'runtime', 'run', 'update-staging');

    try { fs.mkdirSync(stagingDir, { recursive: true }); } catch { /* ignore */ }
    
    const patchPath = path.join(stagingDir, 'manual-patch.zip');
    fs.writeFileSync(patchPath, file.buffer);

    const runtimeRunDir = path.join(portableRoot, 'runtime', 'run');
    const pendingFile = path.join(runtimeRunDir, '.update_pending');

    const payload = {
      version:         version,
      patchUrl:        '',
      localPatchPath:  patchPath,
      changelog:       'اختبار تحديث محلي من 1.1.9 إلى 1.1.9.1',
      triggeredBy:     'Local User',
      triggeredAt:     new Date().toISOString(),
      nodeExe:         process.execPath,
      backendCwd:      process.cwd(),
      backendEntry:    process.argv[1] ?? 'dist/main.js',
      backendPort:     process.env.BACKEND_PORT ?? '3001',
      electronExePath: process.env.ELECTRON_EXE_PATH || '',
    };
    fs.writeFileSync(pendingFile, JSON.stringify(payload, null, 2), 'utf8');

    const applyScript = path.join(portableRoot, 'tools', 'launcher', 'scripts', 'ApplyAndRestart.ps1');
    if (!fs.existsSync(applyScript)) {
      throw new BadRequestException('ApplyAndRestart.ps1 not found at: ' + applyScript);
    }

    if (process.env.NODE_ENV === 'test') {
      return { ok: true, version };
    }

    const logsDir = path.join(portableRoot, 'runtime', 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const spawnLog = path.join(logsDir, 'update-spawn.log');

    const psCommand = 'cmd.exe';
    const psArgs = [
      '/c', 'start', '""', '/min',
      'powershell.exe',
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-File', applyScript,
      '-PortableRoot', portableRoot
    ];

    fs.writeFileSync(spawnLog, JSON.stringify({
      scriptPath: applyScript,
      pendingFilePath: pendingFile,
      localPatchPath: patchPath,
      cwd: process.cwd(),
      command: psCommand + ' ' + psArgs.join(' ')
    }, null, 2), 'utf8');

    const ps = spawn(psCommand, psArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      cwd: portableRoot
    });
    ps.unref();

    setTimeout(() => process.exit(0), 1500);

    return {
      ok: true,
      message: `جاري تطبيق التحديث المحلي (الإصدار ${version}) — سيتم إغلاق التطبيق لتطبيق التحديث`,
      version: version,
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
    const portableRoot = getPortableRoot();
    
    // 1. Written by the auto-update script on success
    const versionFile = path.join(portableRoot, 'runtime', 'run', '.app_version');
    try {
      if (fs.existsSync(versionFile)) {
        const ver = fs.readFileSync(versionFile, 'utf8').trim();
        if (ver) return { version: ver };
      }
    } catch { /* ignore */ }

    // 2. Read the backend's own package.json (baked in at build time, always accurate)
    try {
      const pkgPath = path.join(portableRoot, 'resources', 'app.asar.unpacked', 'electron', 'backend', 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
        if (pkg?.version) return { version: pkg.version };
      }
    } catch { /* ignore */ }
    
    // Fallback for local development if not in portable structure
    try {
      const devPkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(devPkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(devPkgPath, 'utf8')) as { version?: string };
        if (pkg?.version) return { version: pkg.version };
      }
    } catch { /* ignore */ }

    // 3. Absolute fallback
    return { version: '0.0.0' };
  }
}
