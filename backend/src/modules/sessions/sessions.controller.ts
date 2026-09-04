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
import { createCsrfToken } from '../../core/auth/utils/csrf-token';
import { ActivationService } from '../activation/activation.service';
import { clearKnownAuthCookies } from '../../core/auth/utils/auth-cookie-cleanup';

@Controller('api/auth')
export class SessionsController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly activationService: ActivationService,
  ) {}

  private sharedCookieDomain(req?: RequestWithAuth): string | undefined {
    if (req) {
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
      if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)) {
        return undefined;
      }
    }
    const domain = this.configService.get<string>('SESSION_COOKIE_DOMAIN')?.trim();
    return domain || undefined;
  }

  private cookieOptions(expiresAt?: Date, req?: RequestWithAuth) {
    const host = String(req?.headers['x-forwarded-host'] || req?.headers?.host || '').split(':')[0].toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host);
    const domain = isLoopback ? undefined : this.sharedCookieDomain(req);
    const secure = isLoopback ? false : this.configService.get<boolean>('SESSION_COOKIE_SECURE') === true;

    return {
      httpOnly: true,
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('SESSION_COOKIE_SAME_SITE') ?? 'lax',
      secure,
      expires: expiresAt,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private csrfCookieOptions(expiresAt?: Date, req?: RequestWithAuth) {
    const host = String(req?.headers['x-forwarded-host'] || req?.headers?.host || '').split(':')[0].toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host);
    const domain = isLoopback ? undefined : this.sharedCookieDomain(req);
    const secure = isLoopback ? false : this.configService.get<boolean>('SESSION_COOKIE_SECURE') === true;

    return {
      httpOnly: false,
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('SESSION_COOKIE_SAME_SITE') ?? 'lax',
      secure,
      expires: expiresAt,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private getSessionCookieName(): string {
    return this.configService.get<string>('SESSION_COOKIE_NAME')?.trim() || 'session_id';
  }

  private getCsrfCookieName(): string {
    return this.configService.get<string>('SESSION_CSRF_COOKIE_NAME')?.trim() || 'csrf_token';
  }

  private allowLocalSessionHeaderFallback(): boolean {
    if (String(this.configService.get('ALLOW_SESSION_ID_HEADER')).toLowerCase() === 'false') return false;
    return true;
  }

  private setAuthCookies(res: Response, sessionId: string, expiresAt: Date, req?: RequestWithAuth): void {
    const csrfSecret = this.configService.get<string>('SESSION_CSRF_SECRET') || '';
    const csrfToken = createCsrfToken(sessionId, csrfSecret);
    res.cookie(this.getSessionCookieName(), sessionId, this.cookieOptions(expiresAt, req));
    res.cookie(this.getCsrfCookieName(), csrfToken, this.csrfCookieOptions(expiresAt, req));
  }

  private clearAuthCookies(res: Response): void {
    clearKnownAuthCookies(res, {
      sessionCookieName: this.getSessionCookieName(),
      csrfCookieName: this.getCsrfCookieName(),
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('SESSION_COOKIE_SAME_SITE') ?? 'lax',
      secure: this.configService.get<boolean>('SESSION_COOKIE_SECURE') === true,
      domain: this.sharedCookieDomain(),
    });
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

    this.setAuthCookies(res, result.sessionId, result.expiresAt, req);

    await this.auditService.log('تسجيل دخول', `تم تسجيل دخول المستخدم ${result.auth.username}`, result.auth);

    return {
      ok: true,
      ...(await this.sessionService.buildLoginPayload(result.auth)),
      sessionId: result.sessionId,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  @Post('logout')
  async logout(
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Record<string, unknown>> {
    const cookieHeader = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
    const sessionCookieName = this.getSessionCookieName();
    const sessionFromCookie = cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${sessionCookieName}=`))
      ?.slice(sessionCookieName.length + 1)
      .trim();
    const sessionFromHeader = typeof req.headers['x-session-id'] === 'string' ? req.headers['x-session-id'].trim() : '';
    const sessionId = String(req.authContext?.sessionId || sessionFromCookie || sessionFromHeader || '').trim();

    if (sessionId) {
      await this.sessionService.logout(sessionId, req.authContext);
    }

    this.clearAuthCookies(res);

    if (req.authContext) {
      await this.auditService.log('تسجيل خروج', `تم تسجيل خروج المستخدم ${req.authContext.username}`, req.authContext);
    }

    return { ok: true };
  }

  @Get('sessions')
  @UseGuards(SessionAuthGuard)
  async list(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const sessions = await this.sessionService.listSessions(req.authContext!);
    return { sessions };
  }

  @Delete('sessions/:id')
  @UseGuards(SessionAuthGuard)
  async revoke(@Param('id') sessionId: string, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const removed = await this.sessionService.revokeSessionForUser(sessionId, req.authContext!);
    if (!removed) {
      throw new NotFoundException('Session not found');
    }

    const sessions = await this.sessionService.listSessions(req.authContext!);
    await this.auditService.log('إنهاء جلسة', `تم إنهاء جلسة للمستخدم ${req.authContext!.username}`, req.authContext!);
    return { ok: true, sessions };
  }

  @Post('sessions/revoke-others')
  @UseGuards(SessionAuthGuard)
  async revokeOthers(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!, req.authContext!.sessionId);
    const sessions = await this.sessionService.listSessions(req.authContext!);
    await this.auditService.log('إنهاء الجلسات الأخرى', `تم إنهاء ${removed} جلسة أخرى`, req.authContext!);
    return { ok: true, removed, sessions };
  }

  @Post('change-password')
  @UseGuards(SessionAuthGuard)
  async changePassword(@Body() payload: ChangePasswordDto, @Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    await this.sessionService.changePassword(req.authContext!, payload.currentPassword, payload.newPassword);
    const removed = await this.sessionService.revokeOtherSessions(req.authContext!, req.authContext!.sessionId);
    await this.auditService.log('تغيير كلمة المرور', `تم تغيير كلمة المرور وإنهاء ${removed} جلسة`, req.authContext!);
    return { ok: true, removedOtherSessions: removed };
  }

  @Post('dismiss-password-change')
  @UseGuards(SessionAuthGuard)
  async dismissPasswordChange(@Req() req: RequestWithAuth): Promise<Record<string, unknown>> {
    if (req.authContext) {
      await this.sessionService.dismissPasswordChange(req.authContext);
      await this.auditService.log('تخطي تغيير كلمة المرور', `المستخدم ${req.authContext.username} اختار المتابعة بكلمة المرور الحالية`, req.authContext);
    }
    return { ok: true };
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
