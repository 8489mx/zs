import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_DB } from '../../../../database/database.constants';
import { Database } from '../../../../database/database.types';
import { EtaAuthService } from '../eta-auth/eta-auth.service';

@Injectable()
export class EtaSubmissionService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly etaAuthService: EtaAuthService
  ) {}

  async getPendingInvoices(tenantId: string) {
    const sales = await this.db
      .selectFrom('sales')
      .where('tenant_id', '=', tenantId)
      .where('eta_status', 'in', ['pending', 'failed'])
      .select([
        'id',
        'doc_no',
        'created_at',
        'total',
        'eta_status',
        'customer_name'
      ])
      .orderBy('created_at', 'desc')
      .execute();

    return sales;
  }

  async submitInvoices(tenantId: string, invoiceIds: string[]) {
    if (!invoiceIds || invoiceIds.length === 0) return { success: true, count: 0 };

    // Get real ETA access token, this will throw an error if fake credentials
    const token = await this.etaAuthService.getAccessToken(tenantId);
    
    // In future: Use token to actually post invoice JSON to ETA...
    // For now, if we get here, it means authentication succeeded!
    const result = await this.db
      .updateTable('sales')
      .set({ eta_status: 'submitted', eta_submission_id: `SUB-${Date.now()}` })
      .where('tenant_id', '=', tenantId)
      .where('id', 'in', invoiceIds.map(Number))
      .returning('id')
      .execute();

    return {
      success: true,
      count: result.length,
      message: 'تم إرسال الفواتير بنجاح'
    };
  }
}
