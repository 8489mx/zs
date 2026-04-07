import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../../../core/auth/services/session.service';
import { RequestWithAuth } from '../../../core/auth/interfaces/request-with-auth.interface';

function readSessionId(request: RequestWithAuth): string {
  const headerValue = request.headers['x-session-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader !== 'string') {
    return '';
  }

  const parts = cookieHeader.split(';').map((part) => part.trim());
  const pair = parts.find((part) => part.startsWith('session_id='));
  return pair ? pair.slice('session_id='.length) : '';
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const sessionId = readSessionId(request);

    if (!sessionId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const auth = await this.sessionService.resolveAuthContext(sessionId);
    if (!auth) {
      throw new UnauthorizedException('Unauthorized');
    }

    request.authContext = auth;
    return true;
  }
}
