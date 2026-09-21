import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class ResponseMetadataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // `no-store` stays the default for every API response (authenticated data must never be cached).
    // A handler that explicitly declares its own policy with @Header('Cache-Control', ...) — the public
    // storefront catalog/info and social previews — keeps it; otherwise this blanket header silently
    // overrode them (SF-9: the catalog's short public cache never reached browsers).
    const declared: Array<{ name?: string }> = Reflect.getMetadata(HEADERS_METADATA, context.getHandler()) || [];
    const hasOwnCachePolicy = declared.some((h) => String(h?.name || '').toLowerCase() === 'cache-control');
    if (!hasOwnCachePolicy) {
      response.setHeader('Cache-Control', 'no-store');
    }
    response.setHeader('X-Request-Path', request.url);

    return next.handle();
  }
}
