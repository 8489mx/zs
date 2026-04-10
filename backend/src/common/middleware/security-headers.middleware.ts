import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const forwardedProtoHeader = request.headers['x-forwarded-proto'];
    const forwardedProto = typeof forwardedProtoHeader === 'string'
      ? forwardedProtoHeader.split(',')[0]?.trim().toLowerCase()
      : '';
    const isSecureRequest = request.secure || forwardedProto === 'https';

    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    response.setHeader('Origin-Agent-Cluster', '?1');

    if (isSecureRequest) {
      response.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }

    response.removeHeader('X-Powered-By');
    next();
  }
}
