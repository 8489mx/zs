import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../../../core/auth/services/session.service';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';
import { CSRF_HEADER_NAME, verifyCsrfToken } from '../utils/csrf-token';

function parseCookie(request: RequestWithAuth, name: string): string {
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader !== 'string') {
    return '';
  }

  const parts = cookieHeader.split(';').map((part) => part.trim());
  const pair = parts.find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(`${name}=`.length)) : '';
}

function readSessionId(request: RequestWithAuth, allowHeaderAuth: boolean, cookieName: string): string {
  if (allowHeaderAuth) {
    const headerValue = request.headers['x-session-id'];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }
  }

  return parseCookie(request, cookieName);
}

function readHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0].trim() : '';
  return '';
}

function isUnsafeHttpMethod(method: string | undefined): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

function assertTenantScopeHeadersMatchAuth(request: RequestWithAuth, auth: { tenantId?: string; accountId?: string }): void {
  const headerTenantId = readHeaderValue(request.headers['x-tenant-id']);
  const headerAccountId = readHeaderValue(request.headers['x-account-id']);

  if (headerTenantId && headerTenantId !== String(auth.tenantId || '').trim()) {
    throw new ForbiddenException('Tenant scope mismatch');
  }

  if (headerAccountId && headerAccountId !== String(auth.accountId || '').trim()) {
    throw new ForbiddenException('Account scope mismatch');
  }
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  private allowSessionIdHeaderFallback(): boolean {
    if (this.configService.get<boolean>('ALLOW_SESSION_ID_HEADER') === true) return true;
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const appMode = this.configService.get<string>('app.mode') || this.configService.get<string>('APP_MODE') || '';
    return nodeEnv === 'development' && appMode !== 'CLOUD_SAAS';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const allowHeaderAuth = this.allowSessionIdHeaderFallback();
    const sessionCookieName = this.configService.get<string>('SESSION_COOKIE_NAME')?.trim() || 'session_id';
    const csrfCookieName = this.configService.get<string>('SESSION_CSRF_COOKIE_NAME')?.trim() || 'csrf_token';
    const sessionId = readSessionId(request, allowHeaderAuth, sessionCookieName);

    if (!sessionId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const auth = await this.sessionService.resolveAuthContext(sessionId);
    if (!auth) {
      throw new UnauthorizedException('Unauthorized');
    }

    assertTenantScopeHeadersMatchAuth(request, auth);

    if (isUnsafeHttpMethod(request.method)) {
      const csrfSecret = this.configService.get<string>('SESSION_CSRF_SECRET') || '';
      const csrfCookie = parseCookie(request, csrfCookieName);
      const csrfHeader = readHeaderValue(request.headers[CSRF_HEADER_NAME]);
      const usingHeaderFallback = allowHeaderAuth && readHeaderValue(request.headers['x-session-id']) === sessionId;

      if (!usingHeaderFallback && (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader || !verifyCsrfToken(sessionId, csrfSecret, csrfHeader))) {
        throw new ForbiddenException('CSRF validation failed');
      }
    }

    request.authContext = auth;
    return true;
  }
}
