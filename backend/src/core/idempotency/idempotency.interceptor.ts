import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { idempotencyStorage } from './idempotency.context';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    // Only apply if key is provided and user is authenticated
    if (!idempotencyKey || !request.authContext) {
      return next.handle();
    }

    const { tenantId, accountId } = request.authContext;
    const operationType = `${request.method}:${request.route.path}`;
    const requestHash = this.idempotencyService.generateRequestHash(request.body);

    const reservation = {
      tenantId: tenantId || '',
      accountId: accountId || '',
      idempotencyKey,
      operationType,
      requestHash,
    };

    return from(this.idempotencyService.reserveOperation(reservation)).pipe(
      switchMap((existingResult) => {
        if (existingResult) {
          if (existingResult.status === 'committed') {
            return of(existingResult.responsePayload);
          } else if (existingResult.status === 'failed') {
            // Return stored failure
            return throwError(() => new HttpException(
              existingResult.responsePayload || existingResult.errorCode || 'Operation previously failed',
              HttpStatus.BAD_REQUEST
            ));
          } else if (existingResult.status === 'processing') {
            return throwError(() => new ConflictException('Operation is currently processing'));
          } else if (existingResult.status === 'recovery_required') {
            return throwError(() => new HttpException('Operation requires manual recovery', HttpStatus.UNPROCESSABLE_ENTITY));
          }
        }

        // Proceed to handler if reserved, wrapping in AsyncLocalStorage context
        return new Observable<any>((subscriber) => {
          idempotencyStorage.run(
            { idempotencyKey, operationType },
            () => {
              next.handle().pipe(
                catchError((err) => {
                  if (err instanceof HttpException || err.status || err.name === 'AppError') {
                    return from(
                      this.idempotencyService.recordFailure(
                        reservation,
                        err.name || 'UNKNOWN_ERROR',
                        err.getResponse ? err.getResponse() : { message: err.message }
                      )
                    ).pipe(
                      switchMap(() => throwError(() => err)),
                      catchError(() => throwError(() => err))
                    );
                  }
                  return throwError(() => err);
                })
              ).subscribe(subscriber);
            }
          );
        });
      })
    );
  }
}
