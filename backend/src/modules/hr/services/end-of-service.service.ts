import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AccountingService } from '../../accounting/accounting.service';
import { KYSELY_DB } from '../../../database/database.constants';

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

    const gratuityAmount = Number(((baseGratuity * gratuityPercentage) / 100).toFixed(2));

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

    // Generate settlement number: EOS-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countRes = await (this.db as any)
      .selectFrom('hr_end_of_service_settlements')
      .select(sql<number>`COUNT(*)::int`.as('count'))
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const seq = ((countRes?.count || 0) + 1).toString().padStart(4, '0');
    const settlementNo = `EOS-${currentYear}-${seq}`;

    // Insert record
    const [inserted] = await (this.db as any)
      .insertInto('hr_end_of_service_settlements')
      .values({
        tenant_id: tenantId,
        settlement_no: settlementNo,
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

    // If confirmed termination requested, terminate employee and end contract
    if (dto.confirmTermination) {
      await this.db
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
      `.execute(this.db);
    }

    return {
      ok: true,
      settlement: inserted,
    };
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

    const settlement = await (this.db as any)
      .selectFrom('hr_end_of_service_settlements')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!settlement) {
      throw new NotFoundException('المخالصة غير موجودة');
    }

    if (settlement.journal_entry_id) {
      throw new BadRequestException('تم ترحيل قيد هذه المخالصة مسبقاً برقم قيد مرتبط');
    }

    // Lookup standard accounting accounts
    // 1. Indemnity / Salaries Expense (Debit)
    const expenseAccount = await (this.db as any)
      .selectFrom('accounting_accounts')
      .select(['id', 'code', 'name_ar'])
      .where('tenant_id', '=', tenantId)
      .where((eb: any) => eb.or([
        eb('code', '=', '5110'),
        eb('code', '=', '5150'),
        eb('code', 'like', '51%'),
      ]))
      .orderBy('id', 'asc')
      .executeTakeFirst();

    // 2. Loans Receivable (Credit if loan deduction > 0)
    const loanAccount = await (this.db as any)
      .selectFrom('accounting_accounts')
      .select(['id', 'code', 'name_ar'])
      .where('tenant_id', '=', tenantId)
      .where((eb: any) => eb.or([
        eb('code', '=', '1140'),
        eb('name_ar', 'like', '%سلف%'),
      ]))
      .executeTakeFirst();

    // 3. Cash / Bank or Salaries Payable (Credit)
    let paymentAccount = null;
    if (payload.treasuryAccountId) {
      paymentAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select(['id', 'code', 'name_ar'])
        .where('id', '=', payload.treasuryAccountId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
    }

    if (!paymentAccount) {
      paymentAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .select(['id', 'code', 'name_ar'])
        .where('tenant_id', '=', tenantId)
        .where((eb: any) => eb.or([
          eb('code', '=', '2140'), // رواتب مستحقة
          eb('code', '=', '1110'), // خزينة
          eb('is_cash_bank', '=', true),
        ]))
        .orderBy('id', 'asc')
        .executeTakeFirst();
    }

    if (!expenseAccount || !paymentAccount) {
      throw new BadRequestException('تعذر العثور على حسابات الرواتب أو الخزينة الافتراضية في شجرة الحسابات');
    }

    const netAmount = Number(settlement.net_settlement_amount || 0);
    const gratuity = Number(settlement.gratuity_amount || 0);
    const leavePay = Number(settlement.leave_encashment_amount || 0);
    const pendingSalary = Number(settlement.pending_salary_amount || 0);
    const loansDeduction = Number(settlement.unpaid_loans_deduction || 0);

    const totalDebit = gratuity + leavePay + pendingSalary;

    const lines: any[] = [];

    // Debit: Total Entitlements
    lines.push({
      accountId: expenseAccount.id,
      description: `استحقاق مخالصة ومكافأة نهاية خدمة #${settlement.settlement_no}`,
      debit: totalDebit,
      credit: 0,
      partnerType: 'none',
      partnerId: null,
    });

    // Credit: Loan deduction (if any)
    if (loansDeduction > 0 && loanAccount) {
      lines.push({
        accountId: loanAccount.id,
        description: `تسوية سلف مستحقة للموظف بمخالصة #${settlement.settlement_no}`,
        debit: 0,
        credit: loansDeduction,
        partnerType: 'none',
        partnerId: null,
      });
    }

    // Credit: Net payable amount
    const creditPayment = loansDeduction > 0 && loanAccount ? netAmount : totalDebit;
    lines.push({
      accountId: paymentAccount.id,
      description: `صرف مستحقات مخالصة نهاية الخدمة #${settlement.settlement_no}`,
      debit: 0,
      credit: creditPayment,
      partnerType: 'none',
      partnerId: null,
    });

    // Post Journal Entry through Accounting Service
    const entryRes = await this.accountingService.createManualJournalEntry(
      {
        entryDate: String(settlement.settlement_date).slice(0, 10),
        description: `قيد تصفية ومخالصة نهاية خدمة #${settlement.settlement_no}`,
        reference: settlement.settlement_no,
        lines,
      },
      auth
    );

    const entryId = Number((entryRes as any)?.entry?.id || (entryRes as any)?.id);

    // Update settlement record
    await (this.db as any)
      .updateTable('hr_end_of_service_settlements')
      .set({
        journal_entry_id: entryId,
        status: 'posted',
        treasury_or_bank_account_id: paymentAccount.id,
        updated_by: auth.userId ? Number(auth.userId) : null,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    return {
      ok: true,
      journalEntryId: entryId,
      entryNo: (entryRes as any)?.entry?.entryNo,
    };
  }

  /**
   * Delete draft settlement
   */
  async deleteSettlement(id: number, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);

    const row = await (this.db as any)
      .selectFrom('hr_end_of_service_settlements')
      .select(['id', 'status', 'journal_entry_id'])
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException('المخالصة غير موجودة');
    }

    if (row.journal_entry_id || row.status === 'posted') {
      throw new BadRequestException('لا يمكن حذف مخالصة تم ترحيل قيدها المحاسبي');
    }

    await (this.db as any)
      .deleteFrom('hr_end_of_service_settlements')
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true };
  }
}
