import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Kysely, sql } from '../../database/kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AppError } from '../../common/errors/app-error';

export interface PortalEmployeeUser {
  employeeId: number;
  employeeNo: string;
  name: string;
  phone: string;
  branchId: number | null;
  branchName: string;
  departmentName: string;
  positionName: string;
  hireDate: string | null;
  status: string;
  tenantId: string;
  accountId: string;
}

@Injectable()
export class EmployeePortalService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private get anyDb(): any {
    return this.db as any;
  }

  private getSecret(): string {
    return process.env.SESSION_SECRET || 'zs-attendance-mobile-punch-secret-2026';
  }

  /**
   * Generates a tamper-proof session token for the employee portal
   */
  generateToken(user: PortalEmployeeUser): string {
    const payload = {
      employeeId: user.employeeId,
      employeeNo: user.employeeNo,
      name: user.name,
      tenantId: user.tenantId,
      accountId: user.accountId,
      branchId: user.branchId,
      role: 'employee',
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.getSecret()).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  /**
   * Verifies employee portal token from Authorization header
   */
  verifyToken(authHeader?: string): PortalEmployeeUser {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('يرجى تسجيل الدخول إلى بوابة الموظف', 'UNAUTHORIZED', 401);
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      throw new AppError('رمز الجلسة غير صالح', 'INVALID_TOKEN', 401);
    }

    const expected = createHmac('sha256', this.getSecret()).update(encoded).digest('base64url');
    if (signature !== expected) {
      throw new AppError('رمز الجلسة غير صالح أو تم التلاعب به', 'INVALID_SIGNATURE', 401);
    }

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() > payload.exp) {
        throw new AppError('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول', 'TOKEN_EXPIRED', 401);
      }
      return payload;
    } catch {
      throw new AppError('فشل فك تشفير رمز الجلسة', 'INVALID_TOKEN_PAYLOAD', 401);
    }
  }

  /**
   * Employee Login using phone / employeeNo / nationalId + 4-digit PIN
   */
  async login(payload: { identifier: string; pinCode: string; companyCode?: string; tenantId?: string }): Promise<{
    token: string;
    employee: PortalEmployeeUser;
  }> {
    const rawIdentifier = String(payload?.identifier || '').trim();
    const rawPin = String(payload?.pinCode || '').trim();

    if (!rawIdentifier || !rawPin) {
      throw new AppError('يرجى إدخال رقم الهاتف المحمول ورمز الدخول السري (PIN)', 'INVALID_CREDENTIALS', 400);
    }

    const cleanDigits = rawIdentifier.replace(/\D/g, '');
    const cleanNoCountry = cleanDigits.startsWith('20')
      ? cleanDigits.slice(2)
      : cleanDigits.startsWith('0')
      ? cleanDigits.slice(1)
      : cleanDigits;

    const companyScope = payload?.companyCode || payload?.tenantId;
    let resolvedTenantId = companyScope ? String(companyScope).trim() : undefined;
    if (resolvedTenantId) {
      try {
        const tenantRow = await this.anyDb
          .selectFrom('tenants')
          .select(['id', 'slug'])
          .where((eb: any) => eb.or([eb('id', '=', resolvedTenantId), eb('slug', '=', resolvedTenantId)]))
          .executeTakeFirst();
        if (tenantRow?.id) {
          resolvedTenantId = tenantRow.id;
        }
      } catch {
        // fallback
      }
    }

    // Search active employees
    let employeesQuery = this.anyDb
      .selectFrom('hr_employees as e')
      .leftJoin('branches as b', 'b.id', 'e.branch_id')
      .leftJoin('hr_departments as d', 'd.id', 'e.department_id')
      .leftJoin('hr_positions as pos', 'pos.id', 'e.position_id')
      .select([
        'e.id as employee_id',
        'e.employee_no',
        'e.display_name',
        'e.first_name',
        'e.last_name',
        'e.pin_code',
        'e.hire_date',
        'e.status',
        'e.tenant_id',
        'e.account_id',
        'e.branch_id',
        'b.name as branch_name',
        'd.name as department_name',
        'pos.name as position_name',
      ])
      .where('e.status', '=', 'active');

    if (resolvedTenantId) {
      employeesQuery = employeesQuery.where('e.tenant_id', '=', resolvedTenantId);
    }

    const employees = await employeesQuery.execute();

    if (!employees || employees.length === 0) {
      throw new AppError('لم يتم العثور على أي موظف نشط في النظام', 'NO_ACTIVE_EMPLOYEES', 404);
    }

    // Fetch phone contacts
    const employeeIds = employees.map((e: any) => e.employee_id);
    const contacts = await this.anyDb
      .selectFrom('hr_employee_contacts')
      .select(['employee_id', 'value', 'contact_type'])
      .where('employee_id', 'in', employeeIds)
      .execute();

    // Match employee
    const matchedEmployees = employees.filter((e: any) => {
      // Check employee_no
      if (e.employee_no && e.employee_no.trim().toLowerCase() === rawIdentifier.toLowerCase()) {
        return true;
      }

      // Check phone contacts
      const empContacts = contacts.filter((c: any) => String(c.employee_id) === String(e.employee_id));
      return empContacts.some((c: any) => {
        const p = String(c.value || '').trim();
        const pDigits = p.replace(/\D/g, '');
        const pNoCountry = pDigits.startsWith('20')
          ? pDigits.slice(2)
          : pDigits.startsWith('0')
          ? pDigits.slice(1)
          : pDigits;
        return cleanDigits.length >= 8 && (pDigits === cleanDigits || pNoCountry === cleanNoCountry);
      });
    });

    if (!matchedEmployees || matchedEmployees.length === 0) {
      throw new AppError('بيانات الدخول غير صحيحة، يرجى التأكد من رقم الهاتف المحمول ورمز الدخول السري', 'EMPLOYEE_NOT_FOUND', 401);
    }

    let matched: any = null;

    if (matchedEmployees.length === 1) {
      matched = matchedEmployees[0];
      const storedPin = String(matched.pin_code || '').trim();
      if (!storedPin) {
        if (rawPin !== '1234' && rawPin !== cleanDigits.slice(-4)) {
          throw new AppError('لم يتم تعيين رمز PIN بعد للموظف. استخدم الرمز الافتراضي 1234 أو راجع إدارة الموارد البشرية', 'DEFAULT_PIN_REQUIRED', 401);
        }
      } else if (storedPin !== rawPin) {
        throw new AppError('رمز الدخول السري (PIN) غير صحيح', 'INVALID_PIN', 401);
      }
    } else {
      // Multiple matches across tenants (e.g. employee code 001 exists in both Ragab and Mahmoud)
      const validPinMatches = matchedEmployees.filter((emp: any) => {
        const storedPin = String(emp.pin_code || '').trim();
        if (!storedPin) {
          return rawPin === '1234' || (cleanDigits.length >= 4 && rawPin === cleanDigits.slice(-4));
        }
        return storedPin === rawPin;
      });

      if (validPinMatches.length === 1) {
        matched = validPinMatches[0];
      } else if (validPinMatches.length > 1) {
        const candidateTenantIds = Array.from(
          new Set(validPinMatches.map((e: any) => String(e.tenant_id).trim())),
        ).filter(Boolean);

        let tenantRows: any[] = [];
        try {
          tenantRows = await this.anyDb
            .selectFrom('tenants')
            .select(['id', 'slug', 'business_name'])
            .where('id', 'in', candidateTenantIds)
            .execute();
        } catch {
          tenantRows = [];
        }

        const tenantMap = new Map((tenantRows || []).map((t: any) => [t.id, t]));
        const tenantOptions = candidateTenantIds.map((tId) => {
          const t = tenantMap.get(tId);
          return {
            id: tId,
            name: t?.business_name || t?.slug || tId,
            slug: t?.slug || tId,
          };
        });

        throw new AppError(
          'بيانات الدخول مسجلة لدى أكثر من منشأة. يرجى اختيار المنشأة لمتابعة العمل.',
          'MULTIPLE_TENANTS',
          401,
          { tenants: tenantOptions },
        );
      } else {
        throw new AppError('رمز الدخول السري (PIN) غير صحيح', 'INVALID_PIN', 401);
      }
    }

    const employeeUser: PortalEmployeeUser = {
      employeeId: Number(matched.employee_id),
      employeeNo: matched.employee_no || `EMP-${matched.employee_id}`,
      name: matched.display_name || `${matched.first_name} ${matched.last_name}`.trim(),
      phone: rawIdentifier,
      branchId: matched.branch_id ? Number(matched.branch_id) : null,
      branchName: matched.branch_name || 'الفرع الرئيسي',
      departmentName: matched.department_name || 'الإدارة العامة',
      positionName: matched.position_name || 'موظف',
      hireDate: matched.hire_date ? String(matched.hire_date).slice(0, 10) : null,
      status: matched.status,
      tenantId: matched.tenant_id,
      accountId: matched.account_id,
    };

    const token = this.generateToken(employeeUser);
    return { token, employee: employeeUser };
  }

  /**
   * Get employee dashboard overview
   */
  async getDashboard(employeeId: number, tenantId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // 1. Employee Profile
    const employee = await this.anyDb
      .selectFrom('hr_employees as e')
      .leftJoin('branches as b', 'b.id', 'e.branch_id')
      .leftJoin('hr_departments as d', 'd.id', 'e.department_id')
      .leftJoin('hr_positions as pos', 'pos.id', 'e.position_id')
      .select([
        'e.id',
        'e.employee_no',
        'e.display_name',
        'e.first_name',
        'e.last_name',
        'e.hire_date',
        'e.status',
        'b.name as branch_name',
        'd.name as department_name',
        'pos.name as position_name',
      ])
      .where('e.id', '=', employeeId)
      .executeTakeFirst();

    // 2. Active contract
    const contract = await this.anyDb
      .selectFrom('hr_employment_contracts')
      .selectAll()
      .where('employee_id', '=', employeeId)
      .where('status', '=', 'active')
      .executeTakeFirst();

    // 3. Today's attendance
    const todayAttendance = await this.anyDb
      .selectFrom('hr_attendance_records')
      .selectAll()
      .where('employee_id', '=', employeeId)
      .where('work_date', '=', today)
      .executeTakeFirst();

    // 4. Month attendance counts
    const monthRecords = await this.anyDb
      .selectFrom('hr_attendance_records')
      .selectAll()
      .where('employee_id', '=', employeeId)
      .where(sql`work_date::text`, 'like', `${currentMonth}%`)
      .execute();

    const daysPresent = monthRecords.filter((r: any) => r.status === 'present' || r.check_in_at).length;
    let totalWorkHours = 0;
    let totalLateMinutes = 0;
    for (const r of monthRecords) {
      totalWorkHours += Number(r.work_hours || 0);
      totalLateMinutes += Number(r.late_minutes || 0);
    }

    // 5. Leave balances
    const leaveBalances = await this.anyDb
      .selectFrom('hr_leave_balances as b')
      .leftJoin('hr_leave_types as t', 't.id', 'b.leave_type_id')
      .select([
        'b.leave_type_id',
        't.name as leave_type_name',
        'b.total_days',
        'b.used_days',
        'b.remaining_days',
      ])
      .where('b.employee_id', '=', employeeId)
      .execute();

    // 6. Latest payslip
    const latestPayslip = await this.anyDb
      .selectFrom('hr_payroll_run_items as item')
      .leftJoin('hr_payroll_runs as run', 'run.id', 'item.run_id')
      .select([
        'item.id',
        'item.run_id',
        'run.period_month',
        'item.base_salary',
        'item.allowance_amount',
        'item.deduction_amount',
        'item.loan_deduction_amount',
        'item.gross_pay',
        'item.net_pay',
        'item.status',
        'run.created_at',
      ])
      .where('item.employee_id', '=', employeeId)
      .where('item.status', 'in', ['approved', 'paid', 'reviewed'])
      .orderBy('run.period_month', 'desc')
      .executeTakeFirst();

    // 7. Active loans remaining
    const loans = await this.anyDb
      .selectFrom('hr_employee_loans')
      .selectAll()
      .where('employee_id', '=', employeeId)
      .where('status', 'in', ['approved', 'paid', 'partially_repaid'])
      .execute();

    let totalLoansRemaining = 0;
    for (const l of loans) {
      totalLoansRemaining += Number(l.remaining_amount || 0);
    }

    return {
      profile: {
        id: employee?.id,
        employeeNo: employee?.employee_no,
        name: employee?.display_name || `${employee?.first_name} ${employee?.last_name}`.trim(),
        branchName: employee?.branch_name || 'الفرع الرئيسي',
        departmentName: employee?.department_name || 'الإدارة العامة',
        positionName: employee?.position_name || 'موظف',
        hireDate: employee?.hire_date ? String(employee.hire_date).slice(0, 10) : null,
        status: employee?.status,
        baseSalary: contract?.base_salary ? Number(contract.base_salary) : 0,
        housingAllowance: contract?.housing_allowance ? Number(contract.housing_allowance) : 0,
        transportAllowance: contract?.transport_allowance ? Number(contract.transport_allowance) : 0,
      },
      todayAttendance: {
        hasCheckedIn: Boolean(todayAttendance?.check_in_at),
        hasCheckedOut: Boolean(todayAttendance?.check_out_at),
        checkInTime: todayAttendance?.check_in_at ? new Date(todayAttendance.check_in_at).toLocaleTimeString('ar-EG') : null,
        checkOutTime: todayAttendance?.check_out_at ? new Date(todayAttendance.check_out_at).toLocaleTimeString('ar-EG') : null,
        workHours: Number(todayAttendance?.work_hours || 0),
        status: todayAttendance?.status || 'لم يبصم بعد',
      },
      monthSummary: {
        month: currentMonth,
        daysPresent,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalLateMinutes,
      },
      leaveBalances: leaveBalances.map((b: any) => ({
        leaveTypeId: b.leave_type_id,
        name: b.leave_type_name || 'إجازة سنوية',
        totalDays: Number(b.total_days || 21),
        usedDays: Number(b.used_days || 0),
        remainingDays: Number(b.remaining_days || 21),
      })),
      latestPayslip: latestPayslip ? {
        period: latestPayslip.period_month,
        baseSalary: Number(latestPayslip.base_salary || 0),
        allowanceAmount: Number(latestPayslip.allowance_amount || 0),
        deductionAmount: Number(latestPayslip.deduction_amount || 0),
        loanDeduction: Number(latestPayslip.loan_deduction_amount || 0),
        netPay: Number(latestPayslip.net_pay || 0),
        status: latestPayslip.status,
      } : null,
      totalLoansRemaining,
    };
  }

  /**
   * Get attendance log for month
   */
  async getAttendance(employeeId: number, month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const records = await this.anyDb
      .selectFrom('hr_attendance_records')
      .selectAll()
      .where('employee_id', '=', employeeId)
      .where(sql`work_date::text`, 'like', `${targetMonth}%`)
      .orderBy('work_date', 'desc')
      .execute();

    return records.map((r: any) => ({
      id: r.id,
      date: String(r.work_date).slice(0, 10),
      checkInTime: r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString('ar-EG') : '-',
      checkOutTime: r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString('ar-EG') : '-',
      workHours: Number(r.work_hours || 0),
      overtimeHours: Number(r.overtime_hours || 0),
      lateMinutes: Number(r.late_minutes || 0),
      status: r.status,
      source: r.source || 'device',
      notes: r.notes || '',
    }));
  }

  /**
   * Get employee payslips
   */
  async getPayslips(employeeId: number) {
    const items = await this.anyDb
      .selectFrom('hr_payroll_run_items as item')
      .leftJoin('hr_payroll_runs as run', 'run.id', 'item.run_id')
      .select([
        'item.id',
        'item.run_id',
        'run.period_month',
        'item.base_salary',
        'item.allowance_amount',
        'item.deduction_amount',
        'item.loan_deduction_amount',
        'item.gross_pay',
        'item.net_pay',
        'item.status',
        'item.notes',
        'run.created_at',
      ])
      .where('item.employee_id', '=', employeeId)
      .orderBy('run.period_month', 'desc')
      .execute();

    // Adjustments
    const itemIds = items.map((i: any) => i.id);
    let adjustments: any[] = [];
    if (itemIds.length > 0) {
      adjustments = await this.anyDb
        .selectFrom('hr_payroll_item_adjustments')
        .selectAll()
        .where('payroll_item_id', 'in', itemIds)
        .execute();
    }

    return items.map((i: any) => {
      const itemAdjustments = adjustments.filter((a: any) => String(a.payroll_item_id) === String(i.id));
      return {
        id: i.id,
        period: i.period_month,
        baseSalary: Number(i.base_salary || 0),
        allowances: Number(i.allowance_amount || 0),
        deductions: Number(i.deduction_amount || 0),
        loanDeductions: Number(i.loan_deduction_amount || 0),
        grossPay: Number(i.gross_pay || 0),
        netPay: Number(i.net_pay || 0),
        status: i.status,
        notes: i.notes || '',
        createdAt: i.created_at,
        adjustments: itemAdjustments.map((a: any) => ({
          type: a.adjustment_type,
          label: a.label,
          amount: Number(a.amount || 0),
        })),
      };
    });
  }

  /**
   * Get employee leave balance and requests
   */
  async getLeaves(employeeId: number) {
    const types = await this.anyDb
      .selectFrom('hr_leave_types')
      .selectAll()
      .where('is_active', '=', true)
      .execute();

    const balances = await this.anyDb
      .selectFrom('hr_leave_balances as b')
      .leftJoin('hr_leave_types as t', 't.id', 'b.leave_type_id')
      .select([
        'b.leave_type_id',
        't.name as leave_type_name',
        'b.total_days',
        'b.used_days',
        'b.remaining_days',
      ])
      .where('b.employee_id', '=', employeeId)
      .execute();

    const requests = await this.anyDb
      .selectFrom('hr_leave_requests as req')
      .leftJoin('hr_leave_types as t', 't.id', 'req.leave_type_id')
      .select([
        'req.id',
        'req.leave_type_id',
        't.name as leave_type_name',
        'req.start_date',
        'req.end_date',
        'req.days_count',
        'req.status',
        'req.reason',
        'req.decision_notes',
        'req.created_at',
      ])
      .where('req.employee_id', '=', employeeId)
      .orderBy('req.created_at', 'desc')
      .execute();

    return {
      leaveTypes: types.map((t: any) => ({ id: t.id, name: t.name, isPaid: t.is_paid })),
      balances: balances.map((b: any) => ({
        leaveTypeId: b.leave_type_id,
        name: b.leave_type_name,
        totalDays: Number(b.total_days || 21),
        usedDays: Number(b.used_days || 0),
        remainingDays: Number(b.remaining_days || 21),
      })),
      requests: requests.map((r: any) => ({
        id: r.id,
        leaveTypeId: r.leave_type_id,
        leaveTypeName: r.leave_type_name || 'إجازة سنوية',
        startDate: String(r.start_date).slice(0, 10),
        endDate: String(r.end_date).slice(0, 10),
        daysCount: Number(r.days_count || 1),
        status: r.status,
        reason: r.reason || '',
        decisionNotes: r.decision_notes || '',
        createdAt: r.created_at,
      })),
    };
  }

  /**
   * Submit a new leave request
   */
  async requestLeave(
    employeeId: number,
    tenantId: string,
    body: { leaveTypeId: number; startDate: string; endDate: string; reason?: string },
  ) {
    if (!body.startDate || !body.endDate) {
      throw new AppError('تاريخ بداية ونهاية الإجازة مطلوبان', 'INVALID_DATES', 400);
    }

    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (end < start) {
      throw new AppError('تاريخ نهاية الإجازة يجب أن يكون بعد أو مساوياً لتاريخ البداية', 'INVALID_RANGE', 400);
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const inserted = await this.anyDb
      .insertInto('hr_leave_requests')
      .values({
        employee_id: employeeId,
        leave_type_id: body.leaveTypeId || 1,
        start_date: body.startDate,
        end_date: body.endDate,
        days_count: daysCount,
        status: 'pending',
        reason: body.reason || '',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();

    return {
      success: true,
      message: 'تم إرسال طلب الإجازة بنجاح وسيتم إشعاركم بالقرار فور مراجعته من الإدارة',
      request: inserted,
    };
  }

  /**
   * Get employee loans, advances and custody assets
   */
  async getLoansAndCustody(employeeId: number) {
    const loans = await this.anyDb
      .selectFrom('hr_employee_loans')
      .selectAll()
      .where('employee_id', '=', employeeId)
      .orderBy('created_at', 'desc')
      .execute();

    const assets = await this.anyDb
      .selectFrom('hr_employee_assets')
      .selectAll()
      .where('employee_id', '=', employeeId)
      .orderBy('assigned_at', 'desc')
      .execute();

    return {
      loans: loans.map((l: any) => ({
        id: l.id,
        loanNo: l.loan_no || `ADV-${l.id}`,
        loanType: l.loan_type === 'loan' ? 'قرض' : 'سلفة نقدية',
        principalAmount: Number(l.principal_amount || 0),
        paidAmount: Number(l.paid_amount || 0),
        remainingAmount: Number(l.remaining_amount || 0),
        installmentCount: Number(l.installment_count || 1),
        installmentAmount: Number(l.installment_amount || 0),
        status: l.status,
        issueDate: String(l.issue_date || '').slice(0, 10),
        notes: l.notes || '',
      })),
      assets: assets.map((a: any) => ({
        id: a.id,
        assetType: a.asset_type,
        assetName: a.asset_name,
        assetCode: a.asset_code || '-',
        serialNo: a.serial_no || '-',
        assignedAt: String(a.assigned_at || '').slice(0, 10),
        status: a.status === 'assigned' ? 'بعهدة الموظف' : a.status === 'returned' ? 'تم الاسترجاع' : a.status,
        notes: a.notes || '',
      })),
    };
  }

  /**
   * Submit an advance request
   */
  async requestAdvance(
    employeeId: number,
    tenantId: string,
    body: { amount: number; reason: string; repaymentMonths?: number },
  ) {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      throw new AppError('قيمة السلفة المطلوبة يجب أن تكون أكبر من الصفر', 'INVALID_AMOUNT', 400);
    }

    const months = Math.max(1, Number(body.repaymentMonths || 1));
    const installmentAmount = Math.round((amount / months) * 100) / 100;
    const today = new Date().toISOString().slice(0, 10);

    const inserted = await this.anyDb
      .insertInto('hr_employee_loans')
      .values({
        employee_id: employeeId,
        loan_no: `ADV-REQ-${Date.now().toString().slice(-6)}`,
        loan_type: 'advance',
        principal_amount: amount,
        paid_amount: 0,
        remaining_amount: amount,
        installment_count: months,
        installment_amount: installmentAmount,
        status: 'draft',
        issue_date: today,
        notes: `طلب سلفة من الموظف: ${body.reason || 'بدون تفاصيل'} (سداد على ${months} شهر)`,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();

    return {
      success: true,
      message: 'تم تسجيل طلب السلفة بنجاح وهو قيد المراجعة والاعتماد من الحسابات والإدارة',
      advance: inserted,
    };
  }
}
