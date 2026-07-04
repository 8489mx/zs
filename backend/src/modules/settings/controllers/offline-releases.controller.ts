import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { SessionAuthGuard } from '../../../core/auth/guards/session-auth.guard';
import { AdminRoleGuard } from '../../../core/auth/guards/admin-role.guard';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { OfflineReleasesService } from '../services/offline-releases.service';

// ─── Public endpoint (no auth) — called by offline clients to check for updates ───
@Controller('api/updates')
export class OfflineUpdatesPublicController {
  constructor(private readonly releasesService: OfflineReleasesService) {}

  /**
   * GET /api/updates/check?version=1.2.3
   * Called by the portable client on startup to check if a newer stable release exists.
   */
  @Get('check')
  async checkForUpdate(@Query('version') currentVersion = '') {
    return this.releasesService.checkForUpdate(currentVersion);
  }
}

// ─── Admin endpoints — manage releases ───
@Controller('api/admin/offline-releases')
@UseGuards(SessionAuthGuard, AdminRoleGuard)
export class OfflineReleasesAdminController {
  constructor(private readonly releasesService: OfflineReleasesService) {}

  /** GET /api/admin/offline-releases — list all releases */
  @Get()
  listReleases(@Req() req: RequestWithAuth) {
    return this.releasesService.listReleases(req.authContext!);
  }

  /**
   * POST /api/admin/offline-releases
   * Create a new release entry (draft — not active yet).
   * Body: { version, changelog, patchUrl }
   */
  @Post()
  createRelease(
    @Req() req: RequestWithAuth,
    @Body() body: { version: string; changelog: string; patchUrl: string },
  ) {
    return this.releasesService.createRelease(req.authContext!, body);
  }

  /**
   * POST /api/admin/offline-releases/:id/promote
   * Mark a release as the active stable release clients will see.
   */
  @Post(':id/promote')
  promoteRelease(@Req() req: RequestWithAuth, @Param('id') id: string) {
    return this.releasesService.promoteRelease(req.authContext!, Number(id));
  }

  /**
   * POST /api/admin/offline-releases/:id/deactivate
   * Deactivate a release (clients stop seeing it).
   */
  @Post(':id/deactivate')
  deactivateRelease(@Req() req: RequestWithAuth, @Param('id') id: string) {
    return this.releasesService.deactivateRelease(req.authContext!, Number(id));
  }

  /**
   * POST /api/admin/offline-releases/trigger-update
   * Write .update_pending marker and exit so the launcher applies the update.
   * Only works in portable/offline mode (APP_MODE=offline).
   */
  @Post('trigger-update')
  triggerUpdate(@Req() req: RequestWithAuth) {
    return this.releasesService.triggerUpdate(req.authContext!);
  }
}
