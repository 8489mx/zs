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
import { LoginDto } from './dto/login.dto';
import { createCsrfToken, CSRF_COOKIE_NAME } from '../../core/auth/utils/csrf-token';
import { ActivationService } from '../activation/activation.service';

@Controller('api/auth')
export class SessionsController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly activationService: ActivationService,
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

  private csrfCookieOptions(expiresAt?: Date) {
    return {
      httpOnly: false,
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('SESSION_COOKIE_SAME_SITE') ?? 'lax',
      secure: this.configService.get<boolean>('SESSION_COOKIE_SECURE') === true,
      expires: expiresAt,
      path: '/',
    };
  }

  private setAuthCookies(res: Response, sessionId: string, expiresAt: Date): void {
    const csrfSecret = this.configService.get<string>('SESSION_CSRF_SECRET') || '';
    const csrfToken = createCsrfToken(sessionId, csrfSecret);
    res.cookie('session_id', sessionId, this.cookieOptions(expiresAt));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, this.csrfCookieOptions(expiresAt));
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('session_id', this.cookieOptions());
    res.clearCookie(CSRF_COOKIE_NAME, this.csrfCookieOptions());
  }

  @Post('login')
  async login(
    @Body() payload: LoginDto,
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown>> {
    await this.activationService.assertLoginAllowed();

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

    this.setAuthCookies(res, result.sessionId, result.expiresAt);

    await this.auditService.log('تسجيل دخول', `تم تسجيل دخول المستخدم ${result.auth.username}`, result.auth);

    return {
      ok: true,
      ...(await this.sessionService.buildLoginPayload(result.auth)),
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
    this.clearAuthCookies(res);
    await this.auditService.log('تسجيل خروج', `تم تسجيل خروج المستخدم ${req.authContext!.username}`, req.authContext!);
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
    await this.auditService.log('إنهاء جلسة', `تم إنهاء جلسة للمستخدم ${req.authContext!.username}`, req.authContext!);
    return { ok: true, sessions };
  }

  @Post('sessions/revoke-others')
  @UseGuards(SessionAuthGuard)
  async revokeOthers(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!.userId, req.authContext!.sessionId);
    const sessions = await this.sessionService.listSessions(req.authContext!.userId);
    await this.auditService.log('إنهاء الجلسات الأخرى', `تم إنهاء ${removed} جلسة أخرى`, req.authContext!);
    return { ok: true, removed, sessions };
  }

  @Post('change-password')
  @UseGuards(SessionAuthGuard)
  async changePassword(@Body() payload: ChangePasswordDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    await this.sessionService.changePassword(req.authContext!.userId, payload.currentPassword, payload.newPassword);
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!.userId, req.authContext!.sessionId);
    await this.auditService.log('تغيير كلمة المرور', `تم تغيير كلمة المرور وإنهاء ${removed} جلسة`, req.authContext!);
    return { ok: true, removedOtherSessions: removed };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown>> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.setAuthCookies(res, req.authContext!.sessionId, expiresAt);
    return this.sessionService.buildMePayload(req.authContext!);
  }
}
