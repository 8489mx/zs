import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AccountingService } from '../../accounting/accounting.service';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { KYSELY_DB } from '../../../database/database.constants';
import { formatDailyDocumentNumber, getDailyDocumentPrefix } from '../../../common/utils/document-number.util';

export interface SettlementCalculateInput {
  employeeId: number;
  terminationDate: string;
  terminationReason: string;
  contractType?: string;
  lawType?: 'saudi' | 'egyptian' | 'custom';
  customGratuityDaysPerYear?: number;
  customEntitlements?: number;
  noticePeriodAmount?: number;
  assetsDeduction?: number;
  otherDeductions?: number;
}

export interface CreateSettlementDto extends SettlementCalculateInput {
  settlementDate?: string;
  custodyCleared?: boolean;
  clearanceChecklist?: any[];
  clearanceNotes?: string;
  notes?: string;
  confirmTermination?: boolean;
}

@Injectable()
export class EndOfServiceService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly accountingService: AccountingService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  /**
   * Preview & calculate end-of-service breakdown according to labor laws
   */
  async calculateSettlementPreview(input: SettlementCalculateInput, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);

    const employee = await this.db
      .selectFrom('hr_employees')
      .selectAll()
      .where('id', '=', input.employeeId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!employee) {
      throw new NotFoundException('الموظف غير موجود أو لا ينتمي لهذه المنشأة');
    }

    const hireDate = new Date(employee.hire_date || new Date());
    const terminationDate = new Date(input.terminationDate || new Date());

    if (terminationDate < hireDate) {
      throw new BadRequestException('تاريخ إنهاء الخدمة لا يمكن أن يكون قبل تاريخ التعيين');
    }

    // Calculate duration
    const diffTime = Math.max(0, terminationDate.getTime() - hireDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const serviceYearsDecimal = Number((diffDays / 365.25).toFixed(2));
    const serviceYears = Math.floor(diffDays / 365.25);
    const serviceMonths = Math.floor((diffDays % 365.25) / 30.4375);
    const serviceDays = Math.floor((diffDays % 365.25) % 30.4375);

    // Latest contract salary
    const latestContract = await (this.db as any)
      .selectFrom('hr_employment_contracts')
      .selectAll()
      .where('employee_id', '=', input.employeeId)
      .where('tenant_id', '=', tenantId)
      .orderBy('id', 'desc')
      .executeTakeFirst();

    let basicSalary = 0;
    let totalSalary = 0;

    if (latestContract) {
      basicSalary = Number(latestContract.base_salary || 0);
      const housing = Number(latestContract.housing_allowance || 0);
      const transport = Number(latestContract.transport_allowance || 0);
      const other = Number(latestContract.other_allowances || 0);
      totalSalary = Number(latestContract.gross_salary || (basicSalary + housing + transport + other));
    } else {
      const empAny = employee as any;
      basicSalary = Number(empAny.base_salary || empAny.basic_salary || 0);
      totalSalary = basicSalary;
    }

    const dailyWage = totalSalary > 0 ? totalSalary / 30 : basicSalary / 30;

    // Determine law & rules
    const lawType = input.lawType || 'saudi';
    const reason = input.terminationReason || 'resignation';
    let gratuityPercentage = 100;
    let baseGratuity = 0;

    if (lawType === 'saudi') {
      // Saudi Labor Law: Art. 84 (Half month for first 5 years, full month for rest)
      const first5Years = Math.min(serviceYearsDecimal, 5);
      const subsequentYears = Math.max(0, serviceYearsDecimal - 5);
      baseGratuity = (first5Years * 0.5 * totalSalary) + (subsequentYears * 1.0 * totalSalary);

      // Saudi Art. 85 (Resignation scale)
      if (reason === 'resignation') {
        if (serviceYearsDecimal < 2) {
          gratuityPercentage = 0;
        } else if (serviceYearsDecimal >= 2 && serviceYearsDecimal < 5) {
          gratuityPercentage = 33.333; // ثلث المكافأة
        } else if (serviceYearsDecimal >= 5 && serviceYearsDecimal < 10) {
          gratuityPercentage = 66.667; // ثلثي المكافأة
        } else {
          gratuityPercentage = 100; // المكافأة كاملة
        }
      } else if (reason === 'termination_article_80') {
        gratuityPercentage = 0; // فصل بموجب المادة 80 لا يستحق مكافأة
      } else {
        gratuityPercentage = 100; // إنهاء من صاحب العمل أو انتهاء العقد أو تقاعد
      }
    } else if (lawType === 'egyptian') {
      // Egyptian Labor Law: Art. 125
      const first5Years = Math.min(serviceYearsDecimal, 5);
      const subsequentYears = Math.max(0, serviceYearsDecimal - 5);
      baseGratuity = (first5Years * 0.5 * totalSalary) + (subsequentYears * 1.0 * totalSalary);
      gratuityPercentage = 100;
    } else {
      // Custom
      const daysPerYear = input.customGratuityDaysPerYear || 15;
      baseGratuity = (daysPerYear * dailyWage) * serviceYearsDecimal;
      gratuityPercentage = 100;
    }

    let gratuityAmount = 0;
    if (lawType === 'saudi' && reason === 'resignation') {
      if (serviceYearsDecimal >= 2 && serviceYearsDecimal < 5) {
        gratuityAmount = Number((baseGratuity / 3).toFixed(2));
      } else if (serviceYearsDecimal >= 5 && serviceYearsDecimal < 10) {
        gratuityAmount = Number(((baseGratuity * 2) / 3).toFixed(2));
      } else if (serviceYearsDecimal >= 10) {
        gratuityAmount = Number(baseGratuity.toFixed(2));
      } else {
        gratuityAmount = 0;
      }
    } else {
      gratuityAmount = Number(((baseGratuity * gratuityPercentage) / 100).toFixed(2));
    }

    // Leave Encashment
    const empAny = employee as any;
    const annualBalance = Number(empAny.annual_leave_balance || 21);
    const usedLeaves = Number(empAny.used_annual_leaves || 0);
    const remainingLeaveDays = Math.max(0, annualBalance - usedLeaves);
    const leaveEncashmentAmount = Number((remainingLeaveDays * dailyWage).toFixed(2));

    // Current month salary (days until termination in month)
    const termDay = terminationDate.getDate();
    const pendingSalaryAmount = Number((Math.min(termDay, 30) * dailyWage).toFixed(2));

    // Unpaid loans
    const loansRes = await sql<Record<string, unknown>>`
      SELECT COALESCE(SUM(remaining_amount), 0) as total_unpaid 
      FROM hr_employee_loans 
      WHERE employee_id = ${input.employeeId} 
        AND tenant_id = ${tenantId} 
        AND status IN ('approved', 'disbursed', 'partially_repaid')
    `.execute(this.db);
    const unpaidLoansDeduction = Number(loansRes.rows[0]?.total_unpaid || 0);

    // Active unreturned assets / custody
    const assetsRes = await (this.db as any)
      .selectFrom('hr_employee_assets')
      .selectAll()
      .where('employee_id', '=', input.employeeId)
      .where('status', 'not in', ['returned', 'lost', 'cancelled'])
      .execute();

    const noticePeriodAmount = Number(input.noticePeriodAmount || 0);
    const customEntitlements = Number(input.customEntitlements || 0);
    const assetsDeduction = Number(input.assetsDeduction || 0);
    const otherDeductions = Number(input.otherDeductions || 0);

    const totalEntitlements = gratuityAmount + leaveEncashmentAmount + pendingSalaryAmount + noticePeriodAmount + customEntitlements;
    const totalDeductions = unpaidLoansDeduction + assetsDeduction + otherDeductions;
    const netSettlementAmount = Number(Math.max(0, totalEntitlements - totalDeductions).toFixed(2));

    return {
      employee: {
        id: employee.id,
        employeeNo: employee.employee_no,
        name: employee.display_name || `${employee.first_name} ${employee.last_name}`.trim(),
        hireDate: employee.hire_date,
        departmentId: employee.department_id,
        currentStatus: employee.status,
      },
      servicePeriod: {
        years: serviceYears,
        months: serviceMonths,
        days: serviceDays,
        totalYearsDecimal: serviceYearsDecimal,
        totalDays: diffDays,
      },
      salaries: {
        basicSalary,
        totalSalary,
        dailyWage: Number(dailyWage.toFixed(2)),
      },
      gratuity: {
        lawType,
        reason,
        baseGratuity: Number(baseGratuity.toFixed(2)),
        gratuityPercentage,
        gratuityAmount,
      },
      leaveEncashment: {
        remainingLeaveDays,
        leaveEncashmentAmount,
      },
      pendingSalaryAmount,
      noticePeriodAmount,
      customEntitlements,
      unpaidLoansDeduction,
      assetsDeduction,
      otherDeductions,
      totalEntitlements: Number(totalEntitlements.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      netSettlementAmount,
      unreturnedAssets: assetsRes.map((a: any) => ({
        id: a.id,
        assetType: a.asset_type,
        assetName: a.asset_name,
        assetCode: a.asset_code,
        serialNo: a.serial_no,
        assignedAt: a.assigned_at,
      })),
    };
  }

  /**
   * Create & save official End of Service Settlement
   */
  async createSettlement(dto: CreateSettlementDto, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);

    // Calculate full breakdown
    const calc = await this.calculateSettlementPreview(dto, auth);

    return await this.db.transaction().execute(async (trx) => {
      // Temporary settlement number for collision-proof generation
      const tempNo = `EOS-TMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      // Insert record
      const [inserted] = await (trx as any)
        .insertInto('hr_end_of_service_settlements')
        .values({
          tenant_id: tenantId,
          settlement_no: tempNo,
          employee_id: dto.employeeId,
          settlement_date: dto.settlementDate || new Date().toISOString().slice(0, 10),
          hire_date: calc.employee.hireDate,
          termination_date: dto.terminationDate,
          contract_type: dto.contractType || 'unspecified',
          termination_reason: dto.terminationReason,
          law_type: dto.lawType || 'saudi',
          service_years: calc.servicePeriod.totalYearsDecimal,
          service_months: calc.servicePeriod.months,
          service_days: calc.servicePeriod.days,
          last_basic_salary: calc.salaries.basicSalary,
          last_total_salary: calc.salaries.totalSalary,
          gratuity_percentage: calc.gratuity.gratuityPercentage,
          gratuity_amount: calc.gratuity.gratuityAmount,
          remaining_leave_days: calc.leaveEncashment.remainingLeaveDays,
          leave_encashment_amount: calc.leaveEncashment.leaveEncashmentAmount,
          pending_salary_amount: calc.pendingSalaryAmount,
          notice_period_amount: calc.noticePeriodAmount,
          other_entitlements_amount: calc.customEntitlements,
          unpaid_loans_deduction: calc.unpaidLoansDeduction,
          assets_deduction: calc.assetsDeduction,
          other_deductions: calc.otherDeductions,
          net_settlement_amount: calc.netSettlementAmount,
          custody_cleared: dto.custodyCleared ?? false,
          clearance_checklist: JSON.stringify(dto.clearanceChecklist || []),
          clearance_notes: dto.clearanceNotes || null,
          status: 'draft',
          notes: dto.notes || null,
          created_by: auth.userId ? Number(auth.userId) : null,
        })
        .returningAll()
        .execute();

      // Canonical collision-proof document numbering based on unique returned ID
      const settlementNo = formatDailyDocumentNumber('EOS', Number(inserted.id));
      await (trx as any)
        .updateTable('hr_end_of_service_settlements')
        .set({ settlement_no: settlementNo })
        .where('id', '=', inserted.id)
        .execute();
      inserted.settlement_no = settlementNo;

      // If confirmed termination requested, terminate employee and end contract
      if (dto.confirmTermination) {
        await trx
          .updateTable('hr_employees')
          .set({
            status: 'terminated',
            end_of_service_date: dto.terminationDate as any,
            end_of_service_reason: dto.terminationReason,
            updated_by: auth.userId ? Number(auth.userId) : null,
            updated_at: new Date() as any,
          })
          .where('id', '=', dto.employeeId)
          .where('tenant_id', '=', tenantId)
          .execute();

        await sql`
          UPDATE hr_employment_contracts
          SET status = 'ended',
              end_date = ${dto.terminationDate},
              updated_by = ${auth.userId ? Number(auth.userId) : null},
              updated_at = NOW()
          WHERE employee_id = ${dto.employeeId} AND status = 'active' AND tenant_id = ${tenantId}
        `.execute(trx);
      }

      return {
        ok: true,
        settlement: inserted,
      };
    });
  }

  /**
   * List all settlements
   */
  async listSettlements(auth: AuthContext, query?: { status?: string; employeeId?: number }) {
    const { tenantId } = requireTenantScope(auth);

    let q = (this.db as any)
      .selectFrom('hr_end_of_service_settlements as s')
      .leftJoin('hr_employees as e', 'e.id', 's.employee_id')
      .leftJoin('hr_departments as d', 'd.id', 'e.department_id')
      .leftJoin('journal_entries as j', 'j.id', 's.journal_entry_id')
      .select([
        's.id',
        's.settlement_no as settlementNo',
        's.employee_id as employeeId',
        's.settlement_date as settlementDate',
        's.hire_date as hireDate',
        's.termination_date as terminationDate',
        's.contract_type as contractType',
        's.termination_reason as terminationReason',
        's.law_type as lawType',
        's.service_years as serviceYears',
        's.gratuity_amount as gratuityAmount',
        's.leave_encashment_amount as leaveEncashmentAmount',
        's.pending_salary_amount as pendingSalaryAmount',
        's.net_settlement_amount as netSettlementAmount',
        's.custody_cleared as custodyCleared',
        's.status',
        's.journal_entry_id as journalEntryId',
        'j.entry_no as journalEntryNo',
        's.created_at as createdAt',
        'e.employee_no as employeeNo',
        'e.display_name as employeeName',
        'e.first_name as firstName',
        'e.last_name as lastName',
        'd.name as departmentName',
      ])
      .where('s.tenant_id', '=', tenantId);

    if (query?.status) {
      q = q.where('s.status', '=', query.status);
    }
    if (query?.employeeId) {
      q = q.where('s.employee_id', '=', query.employeeId);
    }

    const rows = await q.orderBy('s.id', 'desc').execute();

    return {
      settlements: rows.map((r: any) => ({
        ...r,
        employeeName: r.employeeName || `${r.firstName || ''} ${r.lastName || ''}`.trim(),
        netSettlementAmount: Number(r.netSettlementAmount || 0),
        gratuityAmount: Number(r.gratuityAmount || 0),
      })),
    };
  }

  /**
   * Get single settlement detail
   */
  async getSettlement(id: number, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);

    const row = await (this.db as any)
      .selectFrom('hr_end_of_service_settlements as s')
      .leftJoin('hr_employees as e', 'e.id', 's.employee_id')
      .leftJoin('hr_departments as d', 'd.id', 'e.department_id')
      .leftJoin('journal_entries as j', 'j.id', 's.journal_entry_id')
      .selectAll('s')
      .select([
        'e.employee_no as employeeNo',
        'e.display_name as employeeName',
        'e.first_name as firstName',
        'e.last_name as lastName',
        'e.national_id as nationalId',
        'd.name as departmentName',
        'j.entry_no as journalEntryNo',
      ])
      .where('s.id', '=', id)
      .where('s.tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException('مخالصة نهاية الخدمة غير موجودة');
    }

    return {
      settlement: {
        ...row,
        employeeName: row.employeeName || `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        netSettlementAmount: Number(row.net_settlement_amount || 0),
        gratuityAmount: Number(row.gratuity_amount || 0),
        leaveEncashmentAmount: Number(row.leave_encashment_amount || 0),
        pendingSalaryAmount: Number(row.pending_salary_amount || 0),
        noticePeriodAmount: Number(row.notice_period_amount || 0),
        otherEntitlementsAmount: Number(row.other_entitlements_amount || 0),
        unpaidLoansDeduction: Number(row.unpaid_loans_deduction || 0),
        assetsDeduction: Number(row.assets_deduction || 0),
        otherDeductions: Number(row.other_deductions || 0),
        clearanceChecklist: typeof row.clearance_checklist === 'string'
          ? JSON.parse(row.clearance_checklist)
          : (row.clearance_checklist || []),
      },
    };
  }

  /**
   * Post 1-Click Accounting Journal Entry for the settlement
   */
  async postAccountingEntry(id: number, payload: { treasuryAccountId?: number; notes?: string }, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);

    return await this.db.transaction().execute(async (trx) => {
      const settlement = await (trx as any)
        .selectFrom('hr_end_of_service_settlements')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirst();

      if (!settlement) {
        throw new NotFoundException('المخالصة غير موجودة');
      }

      if (settlement.journal_entry_id || settlement.status === 'posted') {
        throw new BadRequestException('تم ترحيل قيد هذه المخالصة مسبقاً برقم قيد مرتبط');
      }

      // Custody clearance gate: If employee has unreturned assets, custody must be cleared or deducted
      const unreturnedAssets = await (trx as any)
        .selectFrom('hr_employee_assets')
        .selectAll()
        .where('employee_id', '=', settlement.employee_id)
        .where('tenant_id', '=', tenantId)
        .where('status', 'not in', ['returned', 'lost', 'damaged', 'cancelled'])
        .execute();

      if (unreturnedAssets.length > 0 && !settlement.custody_cleared && !(Number(settlement.assets_deduction || 0) > 0)) {
        throw new BadRequestException('لا يمكن ترحيل مخالصة موظف لديه عهد غير مستردة دون إخلاء طرف للعهدة أو استقطاع قيمتها');
      }

      // Post 1-Click Accounting Journal Entry via AccountingPostingService
      const postingRes = await this.accountingPosting.postEndOfServiceSettlement(
        trx,
        id,
        payload.treasuryAccountId || null,
        auth,
      );

      const entryId = postingRes.journalEntryId;

      // Update employee loans in hr_employee_loans if loan deductions are present
      const loansDeduction = Number(settlement.unpaid_loans_deduction || 0);
      if (loansDeduction > 0) {
        let remainingLoanDeduction = loansDeduction;
        const activeLoans = await sql<Record<string, unknown>>`
          SELECT * FROM hr_employee_loans
          WHERE employee_id = ${settlement.employee_id}
            AND tenant_id = ${tenantId}
            AND status IN ('approved', 'disbursed', 'paid', 'partially_repaid')
            AND remaining_amount > 0
          ORDER BY id ASC
          FOR UPDATE
        `.execute(trx);

        for (const loan of activeLoans.rows) {
          if (remainingLoanDeduction <= 0) break;
          const loanId = Number(loan.id);
          const remainingBalance = Number(loan.remaining_amount || 0);
          const toDeduct = Math.min(remainingBalance, remainingLoanDeduction);
          const newPaid = Number((Number(loan.paid_amount || 0) + toDeduct).toFixed(2));
          const newRemaining = Number((remainingBalance - toDeduct).toFixed(2));
          const newStatus = newRemaining <= 0 ? 'repaid' : 'partially_repaid';

          await sql`
            UPDATE hr_employee_loans
            SET paid_amount = ${newPaid},
                remaining_amount = ${newRemaining},
                status = ${newStatus},
                updated_by = ${auth.userId ? Number(auth.userId) : null},
                updated_at = NOW()
            WHERE id = ${loanId} AND tenant_id = ${tenantId}
          `.execute(trx);

          // Deduct from loan installments
          let remainingInstallmentDeduction = toDeduct;
          const installments = await sql<Record<string, unknown>>`
            SELECT id, amount, paid_amount
            FROM hr_employee_loan_installments
            WHERE loan_id = ${loanId} AND status <> 'paid'
            ORDER BY installment_no ASC
          `.execute(trx);

          for (const inst of installments.rows) {
            if (remainingInstallmentDeduction <= 0) break;
            const instId = Number(inst.id);
            const instAmount = Number(inst.amount || 0);
            const alreadyPaid = Number(inst.paid_amount || 0);
            const due = Math.max(0, instAmount - alreadyPaid);
            if (due <= 0) continue;
            const applied = Math.min(due, remainingInstallmentDeduction);
            const updatedPaid = Number((alreadyPaid + applied).toFixed(2));
            const instStatus = updatedPaid + 0.005 >= instAmount ? 'paid' : 'partial';

            await sql`
              UPDATE hr_employee_loan_installments
              SET paid_amount = ${updatedPaid},
                  status = ${instStatus},
                  paid_at = CASE WHEN ${instStatus} = 'paid' THEN NOW() ELSE paid_at END,
                  updated_at = NOW()
              WHERE id = ${instId}
            `.execute(trx);

            remainingInstallmentDeduction = Number((remainingInstallmentDeduction - applied).toFixed(2));
          }

          // Record in hr_employee_ledger
          await sql`
            INSERT INTO hr_employee_ledger (
              employee_id, entry_type, amount, balance_after, note, repayment_method,
              reference_type, reference_id, created_by, tenant_id
            ) VALUES (
              ${settlement.employee_id}, 'loan_repayment', ${-toDeduct}, ${newRemaining},
              ${'تسوية سلف بمخالصة نهاية الخدمة #' + settlement.settlement_no},
              'salary_deduction', 'hr_end_of_service_settlement', ${id},
              ${auth.userId ? Number(auth.userId) : null}, ${tenantId}
            )
          `.execute(trx);

          remainingLoanDeduction = Number((remainingLoanDeduction - toDeduct).toFixed(2));
        }
      }

      // Update settlement record
      await (trx as any)
        .updateTable('hr_end_of_service_settlements')
        .set({
          journal_entry_id: entryId,
          status: 'posted',
          treasury_or_bank_account_id: payload.treasuryAccountId || null,
          updated_by: auth.userId ? Number(auth.userId) : null,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .execute();

      return {
        ok: true,
        journalEntryId: entryId,
      };
    });
  }

  /**
   * Delete draft settlement
   */
  async deleteSettlement(id: number, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);

    return await this.db.transaction().execute(async (trx) => {
      const row = await (trx as any)
        .selectFrom('hr_end_of_service_settlements')
        .select(['id', 'status', 'journal_entry_id'])
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirst();

      if (!row) {
        throw new NotFoundException('المخالصة غير موجودة');
      }

      if (row.journal_entry_id || row.status === 'posted') {
        throw new BadRequestException('لا يمكن حذف مخالصة تم ترحيل قيدها المحاسبي');
      }

      await (trx as any)
        .deleteFrom('hr_end_of_service_settlements')
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .execute();

      return { ok: true };
    });
  }
}
