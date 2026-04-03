import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { RequestWithAuth } from '../interfaces/request-with-auth.interface';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const sessionId = request.headers['x-session-id'];

    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new UnauthorizedException('Missing session');
    }

    const session = await this.sessionService.findValidSession(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    request.authContext = {
      userId: session.userId,
      sessionId: session.sessionId,
      permissions: [],
    };

    return true;
  }
}
