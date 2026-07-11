import { Controller, Get, Param, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequestWithAuth } from '../auth/interfaces/request-with-auth.interface';
import { Kysely } from 'kysely';
import { Database } from '../../database/database.types';
import { KYSELY_DB } from '../../database/database.constants';
import { Inject } from '@nestjs/common';

@Controller('api/operations')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class IdempotencyController {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  @Get(':operationType/:idempotencyKey/status')
  async getOperationStatus(
    @Param('operationType') operationType: string,
    @Param('idempotencyKey') idempotencyKey: string,
    @Req() req: RequestWithAuth
  ) {
    const { tenantId, accountId } = req.authContext!;
    if (!tenantId || !accountId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const execution = await this.db
      .selectFrom('operation_executions')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('account_id', '=', accountId)
      .where('idempotency_key', '=', idempotencyKey)
      .where('operation_type', '=', operationType)
      .executeTakeFirst();

    if (!execution) {
      return { status: 'not_found' };
    }

    const response = {
      status: execution.status,
      operationType: execution.operation_type,
      documentId: execution.document_id,
      response: execution.response_payload ? JSON.parse(execution.response_payload) : undefined,
    };

    if (execution.status === 'processing') {
      const ageMs = Date.now() - new Date(execution.updated_at).getTime();
      if (ageMs > 60000) {
        response.status = 'recovery_required';
      } else {
        (response as any).retryAfterMs = 2000; // Suggest retry in 2 seconds
      }
    }

    return response;
  }
}
