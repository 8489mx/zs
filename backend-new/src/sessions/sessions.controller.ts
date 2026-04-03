import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { SessionService } from '../auth/services/session.service';
import { AuditService } from '../audit/audit.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/auth')
@UseGuards(SessionAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  @Get('sessions')
  async list(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const sessions = await this.sessionService.listSessions(req.authContext!.userId);
    return { sessions };
  }

  @Delete('sessions/:id')
  async revoke(@Param('id') sessionId: string, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const removed = await this.sessionService.revokeSessionForUser(sessionId, req.authContext!.userId);
    if (!removed) {
      throw new NotFoundException('Session not found');
    }

    const sessions = await this.sessionService.listSessions(req.authContext!.userId);
    await this.auditService.log('إنهاء جلسة', `تم إنهاء جلسة للمستخدم ${req.authContext!.username}`, req.authContext!.userId);
    return { ok: true, sessions };
  }

  @Post('sessions/revoke-others')
  async revokeOthers(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!.userId, req.authContext!.sessionId);
    const sessions = await this.sessionService.listSessions(req.authContext!.userId);
    await this.auditService.log('إنهاء الجلسات الأخرى', `تم إنهاء ${removed} جلسة أخرى`, req.authContext!.userId);
    return { ok: true, removed, sessions };
  }

  @Post('change-password')
  async changePassword(@Body() payload: ChangePasswordDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    await this.sessionService.changePassword(req.authContext!.userId, payload.currentPassword, payload.newPassword);
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!.userId, req.authContext!.sessionId);
    await this.auditService.log('تغيير كلمة المرور', `تم تغيير كلمة المرور وإنهاء ${removed} جلسة`, req.authContext!.userId);
    return { ok: true, removedOtherSessions: removed };
  }

  @Get('me')
  me(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.sessionService.buildMePayload(req.authContext!);
  }
}
