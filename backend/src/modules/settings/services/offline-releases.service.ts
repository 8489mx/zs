import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import * as fs from 'fs';
import * as path from 'path';

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
   * Writes .update_pending marker (used by the portable launcher to download
   * and apply the patch on next startup) then exits the process gracefully
   * so the launcher's restart loop re-launches after applying the update.
   */
  async triggerUpdate(auth: AuthContext) {
    // Get the currently active release
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

    // Resolve the runtime/run directory relative to process.cwd()
    // In portable mode the backend CWD is app/backend, so ../../runtime/run
    const runtimeRunDir = path.resolve(process.cwd(), '../../runtime/run');

    // Ensure the directory exists (best-effort)
    try {
      fs.mkdirSync(runtimeRunDir, { recursive: true });
    } catch {
      // ignore
    }

    const pendingFile = path.join(runtimeRunDir, '.update_pending');
    const payload = {
      version: active.version,
      patchUrl: active.patch_url,
      changelog: active.changelog,
      triggeredBy: auth.username ?? auth.role,
      triggeredAt: new Date().toISOString(),
    };

    fs.writeFileSync(pendingFile, JSON.stringify(payload, null, 2), 'utf8');

    // Schedule process exit after response is sent
    setTimeout(() => {
      process.exit(0);
    }, 1500);

    return {
      ok: true,
      message: `جاري تطبيق الإصدار ${active.version} — سيتم إعادة تشغيل التطبيق تلقائياً`,
      version: active.version,
    };
  }
}
