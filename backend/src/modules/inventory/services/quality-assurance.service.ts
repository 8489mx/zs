import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { formatDailyDocumentNumber } from '../../../common/utils/document-number.util';
import {
  CreateQCPointDto,
  CreateQCInspectionDto,
  CreateNCRDto,
  UpdateNCRStatusDto,
} from '../dto/quality-assurance.dto';
import {
  calculateQualityAcceptanceRate,
  evaluateInspectionResult,
  shouldTriggerNCR,
  suggestNCRSeverity,
} from '../engines/quality-control.engine';

@Injectable()
export class QualityAssuranceService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private assertAccess(auth: AuthContext): void {
    if (
      auth.role === 'super_admin' ||
      auth.role === 'admin' ||
      auth.permissions.includes('inventory') ||
      auth.permissions.includes('manufacturing') ||
      auth.permissions.includes('purchases')
    ) {
      return;
    }
    throw new ForbiddenException('Missing required quality control permissions');
  }

  /**
   * 1. Quality Control Points Management
   */
  async createQCPoint(auth: AuthContext, dto: CreateQCPointDto): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const id = `qcp_${randomUUID()}`;

    await (this.db as any)
      .insertInto('quality_control_points')
      .values({
        id,
        tenant_id: tenantId,
        name: dto.name,
        product_id: dto.productId || null,
        trigger_stage: dto.triggerStage,
        test_type: dto.testType,
        norm_measure_min: dto.normMeasureMin !== undefined ? dto.normMeasureMin : null,
        norm_measure_max: dto.normMeasureMax !== undefined ? dto.normMeasureMax : null,
        measure_unit: dto.measureUnit || null,
        instructions: dto.instructions || null,
        is_mandatory: dto.isMandatory !== false,
        created_at: new Date(),
      })
      .execute();

    return { success: true, id };
  }

  async getQCPoints(
    auth: AuthContext,
    params?: { triggerStage?: string; productId?: number },
  ): Promise<any[]> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    let query = (this.db as any)
      .selectFrom('quality_control_points as qcp')
      .leftJoin('products as p', 'p.id', 'qcp.product_id')
      .select([
        'qcp.id',
        'qcp.name',
        'qcp.product_id',
        'p.name as product_name',
        'qcp.trigger_stage',
        'qcp.test_type',
        'qcp.norm_measure_min',
        'qcp.norm_measure_max',
        'qcp.measure_unit',
        'qcp.instructions',
        'qcp.is_mandatory',
        'qcp.created_at',
      ])
      .where('qcp.tenant_id', '=', tenantId);

    if (params?.triggerStage && params.triggerStage !== 'all') {
      query = query.where('qcp.trigger_stage', '=', params.triggerStage);
    }
    if (params?.productId) {
      query = query.where((eb: any) =>
        eb.or([eb('qcp.product_id', '=', params.productId), eb('qcp.product_id', 'is', null)]),
      );
    }

    return query.orderBy('qcp.created_at', 'desc').execute();
  }

  /**
   * 2. Quality Inspections & Checks Execution
   */
  async recordInspection(auth: AuthContext, dto: CreateQCInspectionDto): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    // Fetch QC Point if provided to evaluate against criteria
    let criteria = {
      testType: 'pass_fail' as any,
      normMeasureMin: null,
      normMeasureMax: null,
    };

    if (dto.pointId) {
      const point = await (this.db as any)
        .selectFrom('quality_control_points')
        .selectAll()
        .where('id', '=', dto.pointId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (point) {
        criteria = {
          testType: point.test_type,
          normMeasureMin: point.norm_measure_min,
          normMeasureMax: point.norm_measure_max,
        };
      }
    }

    const evalResult = evaluateInspectionResult(criteria, {
      testType: criteria.testType,
      passed: dto.passed,
      measuredValue: dto.measuredValue,
      inspectedQty: dto.inspectedQty,
      acceptedQty: dto.acceptedQty,
      rejectedQty: dto.rejectedQty,
    });

    const inspectionId = `qci_${randomUUID()}`;
    let autoNcrNumber: string | null = null;

    await (this.db as any).transaction().execute(async (trx: any) => {
      await trx
        .insertInto('quality_inspections')
        .values({
          id: inspectionId,
          tenant_id: tenantId,
          point_id: dto.pointId || null,
          reference_doc_type: dto.referenceDocType,
          reference_doc_id: dto.referenceDocId,
          product_id: dto.productId,
          inspected_qty: dto.inspectedQty,
          accepted_qty: dto.acceptedQty,
          rejected_qty: dto.rejectedQty,
          measured_value: dto.measuredValue || null,
          status: evalResult.status,
          inspector_id: String(auth.userId),
          notes: dto.notes ? `${dto.notes} | ${evalResult.reason || ''}` : evalResult.reason || null,
          created_at: new Date(),
        })
        .execute();

      // Trigger NCR if inspection failed or rejected > 0
      if (shouldTriggerNCR(evalResult.status, dto.rejectedQty) && dto.autoCreateNcrOnFail !== false) {
        const countRes = await trx
          .selectFrom('quality_non_conformance_reports')
          .select(sql<number>`COUNT(*)`.as('count'))
          .where('tenant_id', '=', tenantId)
          .executeTakeFirst();

        const seq = Number(countRes?.count || 0) + 1;
        autoNcrNumber = formatDailyDocumentNumber('NCR', seq);

        const severity = suggestNCRSeverity(dto.rejectedQty, dto.inspectedQty);

        await trx
          .insertInto('quality_non_conformance_reports')
          .values({
            id: `ncr_${randomUUID()}`,
            tenant_id: tenantId,
            ncr_number: autoNcrNumber,
            inspection_id: inspectionId,
            product_id: dto.productId,
            defect_description: evalResult.reason || 'فشل فحص الجودة وتجاوز معايير التسامح',
            severity,
            disposition_action: 'quarantine_scrap',
            status: 'open',
            assigned_to: String(auth.userId),
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
      }
    });

    return {
      success: true,
      inspectionId,
      status: evalResult.status,
      reason: evalResult.reason,
      autoNcrNumber,
    };
  }

  async getInspections(
    auth: AuthContext,
    params?: { status?: string; docType?: string },
  ): Promise<any[]> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    let query = (this.db as any)
      .selectFrom('quality_inspections as qi')
      .innerJoin('products as p', 'p.id', 'qi.product_id')
      .leftJoin('quality_control_points as qcp', 'qcp.id', 'qi.point_id')
      .select([
        'qi.id',
        'qi.point_id',
        'qcp.name as point_name',
        'qi.reference_doc_type',
        'qi.reference_doc_id',
        'qi.product_id',
        'p.name as product_name',
        'p.code as product_code',
        'qi.inspected_qty',
        'qi.accepted_qty',
        'qi.rejected_qty',
        'qi.measured_value',
        'qi.status',
        'qi.notes',
        'qi.created_at',
      ])
      .where('qi.tenant_id', '=', tenantId);

    if (params?.status && params.status !== 'all') {
      query = query.where('qi.status', '=', params.status);
    }
    if (params?.docType && params.docType !== 'all') {
      query = query.where('qi.reference_doc_type', '=', params.docType);
    }

    return query.orderBy('qi.created_at', 'desc').execute();
  }

  /**
   * 3. Non-Conformance Reports (NCR) Management
   */
  async createNCR(auth: AuthContext, dto: CreateNCRDto): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const countRes = await (this.db as any)
      .selectFrom('quality_non_conformance_reports')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const seq = Number(countRes?.count || 0) + 1;
    const ncrNumber = formatDailyDocumentNumber('NCR', seq);
    const id = `ncr_${randomUUID()}`;

    await (this.db as any)
      .insertInto('quality_non_conformance_reports')
      .values({
        id,
        tenant_id: tenantId,
        ncr_number: ncrNumber,
        inspection_id: dto.inspectionId || null,
        product_id: dto.productId,
        defect_description: dto.defectDescription,
        severity: dto.severity,
        root_cause: dto.rootCause || null,
        disposition_action: dto.dispositionAction,
        status: 'open',
        assigned_to: dto.assignedTo || String(auth.userId),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    return { success: true, id, ncrNumber };
  }

  async getNCRs(
    auth: AuthContext,
    params?: { status?: string; severity?: string },
  ): Promise<any[]> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    let query = (this.db as any)
      .selectFrom('quality_non_conformance_reports as ncr')
      .innerJoin('products as p', 'p.id', 'ncr.product_id')
      .select([
        'ncr.id',
        'ncr.ncr_number',
        'ncr.inspection_id',
        'ncr.product_id',
        'p.name as product_name',
        'p.code as product_code',
        'ncr.defect_description',
        'ncr.severity',
        'ncr.root_cause',
        'ncr.disposition_action',
        'ncr.status',
        'ncr.resolution_notes',
        'ncr.assigned_to',
        'ncr.closed_at',
        'ncr.created_at',
      ])
      .where('ncr.tenant_id', '=', tenantId);

    if (params?.status && params.status !== 'all') {
      query = query.where('ncr.status', '=', params.status);
    }
    if (params?.severity && params.severity !== 'all') {
      query = query.where('ncr.severity', '=', params.severity);
    }

    return query.orderBy('ncr.created_at', 'desc').execute();
  }

  async updateNCRStatus(
    auth: AuthContext,
    id: string,
    dto: UpdateNCRStatusDto,
  ): Promise<{ success: boolean }> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);

    const updates: any = {
      status: dto.status,
      updated_at: new Date(),
    };
    if (dto.resolutionNotes) {
      updates.resolution_notes = dto.resolutionNotes;
    }
    if (dto.status === 'closed' || dto.status === 'resolved') {
      updates.closed_at = new Date();
    }

    await (this.db as any)
      .updateTable('quality_non_conformance_reports')
      .set(updates)
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { success: true };
  }

  /**
   * 4. Overall Quality Summary & KPIs
   */
  async getQualitySummary(auth: AuthContext): Promise<any> {
    this.assertAccess(auth);
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    const inspections = await (this.db as any)
      .selectFrom('quality_inspections')
      .select(['inspected_qty', 'accepted_qty', 'rejected_qty', 'status'])
      .where('tenant_id', '=', tenantId)
      .execute();

    const rates = calculateQualityAcceptanceRate(inspections);

    const ncrs = await (this.db as any)
      .selectFrom('quality_non_conformance_reports')
      .select(['id', 'status', 'severity'])
      .where('tenant_id', '=', tenantId)
      .execute();

    const openNCRs = ncrs.filter((n: any) => n.status === 'open' || n.status === 'investigating').length;
    const criticalDefects = ncrs.filter((n: any) => n.severity === 'critical').length;

    return {
      rates,
      totalInspections: inspections.length,
      openNCRs,
      criticalDefects,
    };
  }
}
