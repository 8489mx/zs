import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { SessionAuthGuard } from '../../core/auth/guards/session-auth.guard';
import { RequestWithAuth } from '../../core/auth/interfaces/request-with-auth.interface';
import { SessionService } from '../../core/auth/services/session.service';
import { AuditService } from '../../core/audit/audit.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/auth')
export class SessionsController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  private cookieOptions(expiresAt?: Date) {
    return {
      httpOnly: true,
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('SESSION_COOKIE_SAME_SITE') ?? 'lax',
      secure: this.configService.get<boolean>('SESSION_COOKIE_SECURE') === true,
      expires: expiresAt,
      path: '/',
    };
  }

  @Post('login')
  async login(
    @Body() payload: { username?: string; password?: string },
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown>> {
    const username = String(payload?.username || '').trim();
    const password = String(payload?.password || '');

    if (!username || !password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const result = await this.sessionService.authenticate(username, password, {
      ipAddress: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '',
    });

    if (!result) {
      throw new UnauthorizedException('Invalid username or password');
    }

    res.cookie('session_id', result.sessionId, this.cookieOptions(result.expiresAt));

    await this.auditService.log('تسجيل دخول', `تم تسجيل دخول المستخدم ${result.auth.username}`, result.auth.userId);

    return {
      ok: true,
      sessionId: result.sessionId,
      user: {
        id: result.auth.userId,
        username: result.auth.username,
        role: result.auth.role,
        permissions: result.auth.permissions,
      },
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown>> {
    await this.sessionService.logout(req.authContext!.sessionId);
    res.clearCookie('session_id', this.cookieOptions());
    await this.auditService.log('تسجيل خروج', `تم تسجيل خروج المستخدم ${req.authContext!.username}`, req.authContext!.userId);
    return { ok: true };
  }

  @Get('sessions')
  @UseGuards(SessionAuthGuard)
  async list(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const sessions = await this.sessionService.listSessions(req.authContext!.userId);
    return { sessions };
  }

  @Delete('sessions/:id')
  @UseGuards(SessionAuthGuard)
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
  @UseGuards(SessionAuthGuard)
  async revokeOthers(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!.userId, req.authContext!.sessionId);
    const sessions = await this.sessionService.listSessions(req.authContext!.userId);
    await this.auditService.log('إنهاء الجلسات الأخرى', `تم إنهاء ${removed} جلسة أخرى`, req.authContext!.userId);
    return { ok: true, removed, sessions };
  }

  @Post('change-password')
  @UseGuards(SessionAuthGuard)
  async changePassword(@Body() payload: ChangePasswordDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    await this.sessionService.changePassword(req.authContext!.userId, payload.currentPassword, payload.newPassword);
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!.userId, req.authContext!.sessionId);
    await this.auditService.log('تغيير كلمة المرور', `تم تغيير كلمة المرور وإنهاء ${removed} جلسة`, req.authContext!.userId);
    return { ok: true, removedOtherSessions: removed };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    return this.sessionService.buildMePayload(req.authContext!);
  }
}
