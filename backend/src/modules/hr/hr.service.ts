import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AppError } from '../../common/errors/app-error';
import { paginateRows } from '../../common/utils/pagination';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { TransactionHelper } from '../../database/helpers/transaction.helper';
import {
  BulkSaveAttendanceDto,
  CreateLeaveRequestDto,
  CreatePayrollAdjustmentDto,
  CreatePayrollRunDto,
  DecideLeaveRequestDto,
  EmployeeAssetActionDto,
  LoanRepaymentDto,
  UpsertEmployeeAssetDto,
  UpsertLeaveTypeDto,
  UpsertAttendanceRecordDto,
  UpsertPayrollItemDto,
  UpsertCompensationPackageDto,
  UpsertEmployeeContactDto,
  UpsertEmployeeDocumentDto,
  UpsertEmployeeDto,
  UpsertEmployeeLoanDto,
  UpsertEmploymentContractDto,
  UpsertHrMasterDataDto,
} from './dto/hr.dto';
import { HrTreasuryAdapter } from './hr-treasury.adapter';

type MasterKind = 'departments' | 'job-titles' | 'positions';
type MasterConfig = {
  table: 'hr_departments' | 'hr_job_titles' | 'hr_positions';
  auditName: string;
};

const masterConfig: Record<MasterKind, MasterConfig> = {
  departments: { table: 'hr_departments', auditName: 'HR department' },
  'job-titles': { table: 'hr_job_titles', auditName: 'HR job title' },
  positions: { table: 'hr_positions', auditName: 'HR position' },
};

function toId(value: unknown): number | null {
  const id = Number(value || 0);
  return id > 0 ? id : null;
}

function clean(value: unknown): string {
  return String(value || '').trim();
}

function normalizeEmployeeNo(value: unknown): string {
  const raw = clean(value);
  if (!raw) return '';
  const withoutLegacyPrefix = raw.replace(/^EMP-?/i, '');
  if (!/^\d+$/.test(withoutLegacyPrefix)) return '';
  const numeric = Number(withoutLegacyPrefix);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return '';
  return String(numeric).padStart(3, '0');
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; constraint?: unknown; detail?: unknown; message?: unknown };
  return candidate.code === '23505'
    || String(candidate.constraint || '').includes('hr_employees_employee_no')
    || String(candidate.detail || '').includes('employee_no')
    || String(candidate.message || '').includes('idx_hr_employees_employee_no_unique');
}

function normalizeDateOnly(value: unknown): string | null {
  const text = clean(value);
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${usMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
}

function nextMonthDate(value?: string | null): string {
  const normalized = normalizeDateOnly(value);
  if (normalized) return addMonths(normalized, 1);
  const now = new Date();
  return addMonths(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`, 1);
}

function addMonths(value: string, months: number): string {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return nextMonthDate();
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

function normalizePayrollMonth(value: unknown): string {
  const text = clean(value);
  return /^\d{4}-\d{2}$/.test(text) ? text : '';
}

function monthRange(periodMonth: string): { from: string; to: string } {
  const [year, month] = periodMonth.split('-').map(Number);
  return {
    from: `${periodMonth}-01`,
    to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function money(value: unknown): number {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number(amount.toFixed(2));
}

function combineNotes(...notes: Array<string | null | undefined>): string {
  const unique: string[] = [];
  for (const note of notes) {
    for (const part of clean(note).split('|')) {
      const value = part.trim();
      if (value && !unique.includes(value)) unique.push(value);
    }
  }
  return unique.join(' | ');
}

function canViewSalary(auth: AuthContext): boolean {
  return auth.role === 'super_admin' || auth.permissions.includes('hrSalaryView') || auth.permissions.includes('hrSalaryManage');
}

function hasHrPermission(auth: AuthContext, permission: string): boolean {
  return auth.role === 'super_admin' || auth.permissions.includes(permission);
}

const attendanceStatuses = ['present', 'absent', 'late', 'half_day', 'leave', 'excused', 'early_leave'] as const;
type AttendanceStatus = (typeof attendanceStatuses)[number];
type PayrollOperationalReview = {
  attendanceAbsentDays: number;
  attendanceLateDays: number;
  attendanceHalfDays: number;
  attendanceEarlyLeaveDays: number;
  approvedLeaveDays: number;
  unpaidLeaveDays: number;
  suggestedAttendanceDeductionAmount: number;
  suggestedLeaveDeductionAmount: number;
  payrollReviewNotes: string;
};

function normalizeAttendanceStatus(value: unknown): AttendanceStatus | 'unmarked' {
  const status = clean(value);
  if (!status) return 'unmarked';
  return attendanceStatuses.includes(status as AttendanceStatus) ? (status as AttendanceStatus) : 'unmarked';
}

function normalizeAttendanceSource(value: unknown): 'manual' | 'import' {
  return clean(value) === 'import' ? 'import' : 'manual';
}

function todayUtcDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function inclusiveDaysBetween(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

@Injectable()
export class HrService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly treasury: HrTreasuryAdapter,
  ) {}

  private maskSalary<T extends Record<string, unknown>>(row: T, auth: AuthContext): T {
    if (canViewSalary(auth)) return row;
    const masked = { ...row };
    delete masked.baseSalary;
    delete masked.allowanceAmount;
    delete masked.deductionAmount;
    return masked;
  }

  private async generateNumber(db: Kysely<Database>, table: string, prefix: string): Promise<string> {
    const result = await sql<{ next_no: string }>`
      SELECT ${sql.lit(prefix)} || '-' || LPAD((COALESCE(MAX(id), 0) + 1)::TEXT, 4, '0') AS next_no
      FROM ${sql.table(table)}
    `.execute(db);
    return result.rows[0]?.next_no || `${prefix}-0001`;
  }

  private async nextAvailableEmployeeNo(db: Kysely<Database>): Promise<string> {
    const result = await sql<{ employee_no: string }>`
      SELECT employee_no
      FROM hr_employees
      WHERE employee_no ~ '^[0-9]+$'
      ORDER BY LENGTH(employee_no), employee_no
    `.execute(db);
    const used = new Set<number>();
    for (const row of result.rows) {
      const numeric = Number(row.employee_no);
      if (Number.isSafeInteger(numeric) && numeric > 0) used.add(numeric);
    }
    let next = 1;
    while (used.has(next)) next += 1;
    return String(next).padStart(3, '0');
  }

  private async ensureEmployeeNoAvailable(db: Kysely<Database>, employeeNo: string, excludeEmployeeId: number | null): Promise<void> {
    if (!employeeNo) return;
    const duplicate = await sql<{ id: number }>`
      SELECT id
      FROM hr_employees
      WHERE employee_no = ${employeeNo}
        AND (${excludeEmployeeId}::BIGINT IS NULL OR id <> ${excludeEmployeeId})
      LIMIT 1
    `.execute(db);
    if (duplicate.rows.length > 0) {
      throw new AppError('رقم الموظف مستخدم بالفعل', 'HR_EMPLOYEE_NO_EXISTS', 409);
    }
  }

  private normalizeRepaymentPlan(payload: UpsertEmployeeLoanDto, amount: number): {
    repaymentMode: string;
    installmentCount: number;
    installmentAmount: number;
    monthlyInstallmentAmount: number | null;
    firstDueDate: string | null;
    salaryDueDate: string | null;
  } {
    const repaymentMode = ['deduct_next_salary', 'monthly_salary_installment', 'manual_cash'].includes(clean(payload.repaymentMode))
      ? clean(payload.repaymentMode)
      : 'manual_cash';
    const issueDate = normalizeDateOnly(payload.issueDate);
    const salaryDueDate = normalizeDateOnly(payload.salaryDueDate);
    const firstDueDate = normalizeDateOnly(payload.firstDueDate) || salaryDueDate || (repaymentMode === 'manual_cash' ? issueDate : nextMonthDate(issueDate));
    const monthlyAmount = Number(payload.monthlyInstallmentAmount || 0);
    if (repaymentMode === 'deduct_next_salary') {
      return {
        repaymentMode,
        installmentCount: 1,
        installmentAmount: amount,
        monthlyInstallmentAmount: null,
        firstDueDate,
        salaryDueDate,
      };
    }
    if (repaymentMode === 'monthly_salary_installment' && monthlyAmount > 0) {
      const installmentAmount = Math.min(monthlyAmount, amount);
      return {
        repaymentMode,
        installmentCount: Math.max(1, Math.ceil(amount / installmentAmount)),
        installmentAmount,
        monthlyInstallmentAmount: installmentAmount,
        firstDueDate,
        salaryDueDate,
      };
    }
    const installmentCount = Math.max(1, Math.floor(Number(payload.installmentCount || 1)));
    const installmentAmount = Math.min(amount, Number((amount / installmentCount).toFixed(2)));
    return {
      repaymentMode,
      installmentCount,
      installmentAmount,
      monthlyInstallmentAmount: null,
      firstDueDate,
      salaryDueDate,
    };
  }

  async listMasterData(kind: MasterKind, query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const config = masterConfig[kind];
    const result = kind === 'positions'
      ? await sql<Record<string, unknown>>`
          SELECT m.*, d.name AS department_name, j.name AS job_title_name, b.name AS branch_name, l.name AS location_name
          FROM hr_positions m
          LEFT JOIN hr_departments d ON d.id = m.department_id
          LEFT JOIN hr_job_titles j ON j.id = m.job_title_id
          LEFT JOIN branches b ON b.id = m.branch_id
          LEFT JOIN stock_locations l ON l.id = m.location_id
          ORDER BY m.id DESC
        `.execute(this.db)
      : await sql<Record<string, unknown>>`
          SELECT m.*
          FROM ${sql.table(config.table)} m
          ORDER BY m.id DESC
        `.execute(this.db);
    const search = clean(query.search).toLowerCase();
    let rows = result.rows.map((row) => ({
      id: String(row.id),
      loanId: row.reference_id ? String(row.reference_id) : '',
      referenceId: row.reference_id ? String(row.reference_id) : '',
      name: clean(row.name),
      code: clean(row.code),
      description: clean(row.description),
      departmentId: row.department_id ? String(row.department_id) : '',
      departmentName: clean(row.department_name),
      jobTitleId: row.job_title_id ? String(row.job_title_id) : '',
      jobTitleName: clean(row.job_title_name),
      branchId: row.branch_id ? String(row.branch_id) : '',
      branchName: clean(row.branch_name),
      locationId: row.location_id ? String(row.location_id) : '',
      locationName: clean(row.location_name),
      isActive: row.is_active !== false,
    }));
    if (search) {
      rows = rows.filter((row) => [row.name, row.code, row.description, row.departmentName, row.jobTitleName].some((value) => value.toLowerCase().includes(search)));
    }
    const paged = paginateRows(rows, query, { defaultSize: 50 });
    return { rows: paged.rows, pagination: paged.pagination, summary: { totalItems: rows.length } };
  }

  async upsertMasterData(kind: MasterKind, id: number | null, payload: UpsertHrMasterDataDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const config = masterConfig[kind];
    await this.tx.runInTransaction(this.db, async (trx) => {
      if (kind === 'positions') {
        if (id) {
          await sql`
            UPDATE hr_positions
            SET name = ${clean(payload.name)}, code = ${clean(payload.code)}, description = ${clean(payload.description)},
                department_id = ${toId(payload.departmentId)}, job_title_id = ${toId(payload.jobTitleId)},
                branch_id = ${toId(payload.branchId)}, location_id = ${toId(payload.locationId)},
                is_active = ${payload.isActive !== false}, updated_by = ${auth.userId}, updated_at = NOW()
            WHERE id = ${id}
          `.execute(trx);
        } else {
          await sql`
            INSERT INTO hr_positions (name, code, description, department_id, job_title_id, branch_id, location_id, is_active, created_by, updated_by)
            VALUES (${clean(payload.name)}, ${clean(payload.code)}, ${clean(payload.description)}, ${toId(payload.departmentId)}, ${toId(payload.jobTitleId)}, ${toId(payload.branchId)}, ${toId(payload.locationId)}, ${payload.isActive !== false}, ${auth.userId}, ${auth.userId})
          `.execute(trx);
        }
      } else {
        const table = sql.table(config.table);
        if (id) {
          await sql`
            UPDATE ${table}
            SET name = ${clean(payload.name)}, code = ${clean(payload.code)}, description = ${clean(payload.description)},
                is_active = ${payload.isActive !== false}, updated_by = ${auth.userId}, updated_at = NOW()
            WHERE id = ${id}
          `.execute(trx);
        } else {
          await sql`
            INSERT INTO ${table} (name, code, description, is_active, created_by, updated_by)
            VALUES (${clean(payload.name)}, ${clean(payload.code)}, ${clean(payload.description)}, ${payload.isActive !== false}, ${auth.userId}, ${auth.userId})
          `.execute(trx);
        }
      }
    });
    await this.audit.log(`${id ? 'Update' : 'Create'} ${config.auditName}`, `${config.auditName} saved by ${auth.username}`, auth);
    return { ok: true, ...(await this.listMasterData(kind, {}, auth)) };
  }

  async deactivateMasterData(kind: MasterKind, id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const config = masterConfig[kind];
    await sql`UPDATE ${sql.table(config.table)} SET is_active = FALSE, updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id}`.execute(this.db);
    await this.audit.log(`Deactivate ${config.auditName}`, `${config.auditName} deactivated by ${auth.username}`, auth);
    return { ok: true, ...(await this.listMasterData(kind, {}, auth)) };
  }

  async listEmployees(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const result = await sql<Record<string, unknown>>`
      SELECT e.*, d.name AS department_name, j.name AS job_title_name, p.name AS position_name, b.name AS branch_name, l.name AS location_name, u.username AS username
      , to_char(e.hire_date, 'YYYY-MM-DD') AS hire_date_text
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_job_titles j ON j.id = e.job_title_id
      LEFT JOIN hr_positions p ON p.id = e.position_id
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN stock_locations l ON l.id = e.location_id
      LEFT JOIN users u ON u.id = e.user_id
      ORDER BY e.id DESC
    `.execute(this.db);
    const search = clean(query.search).toLowerCase();
    let rows = result.rows.map((row) => ({
      id: String(row.id),
      employeeNo: clean(row.employee_no),
      nationalId: clean(row.national_id),
      firstName: clean(row.first_name),
      lastName: clean(row.last_name),
      displayName: clean(row.display_name) || `${clean(row.first_name)} ${clean(row.last_name)}`.trim(),
      status: clean(row.status) || 'active',
      userId: row.user_id ? String(row.user_id) : '',
      username: clean(row.username),
      departmentId: row.department_id ? String(row.department_id) : '',
      departmentName: clean(row.department_name),
      jobTitleId: row.job_title_id ? String(row.job_title_id) : '',
      jobTitleName: clean(row.job_title_name),
      positionId: row.position_id ? String(row.position_id) : '',
      positionName: clean(row.position_name),
      branchId: row.branch_id ? String(row.branch_id) : '',
      branchName: clean(row.branch_name),
      locationId: row.location_id ? String(row.location_id) : '',
      locationName: clean(row.location_name),
      hireDate: clean(row.hire_date_text),
      notes: clean(row.notes),
    }));
    if (search) {
      rows = rows.filter((row) => [row.employeeNo, row.displayName, row.username, row.departmentName, row.jobTitleName].some((value) => value.toLowerCase().includes(search)));
    }
    const paged = paginateRows(rows, query, { defaultSize: 25 });
    return { employees: paged.rows, pagination: paged.pagination, summary: { totalItems: rows.length, activeCount: rows.filter((row) => row.status === 'active').length } };
  }

  async getEmployeeProfile(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const employees = await this.listEmployees({ pageSize: 1000 }, auth);
    const employee = ((employees.employees as Record<string, unknown>[]) || []).find((row) => String(row.id) === String(id));
    if (!employee) throw new AppError('Employee not found', 'HR_EMPLOYEE_NOT_FOUND', 404);

    const [contacts, documents] = await Promise.all([
      this.listContacts(id, auth),
      this.listDocuments(id, auth),
    ]);

    const response: Record<string, unknown> = {
      employee,
      contacts: contacts.rows,
      documents: documents.rows,
    };

    if (hasHrPermission(auth, 'hrContracts')) {
      const [contracts, compensation] = await Promise.all([
        this.listContracts(id, auth),
        this.listCompensation(id, auth),
      ]);
      response.contracts = contracts.rows;
      response.compensation = compensation.rows;
    }

    if (hasHrPermission(auth, 'hrLoans')) {
      const [loans, ledger] = await Promise.all([
        this.listLoans({ employeeId: id }, auth),
        this.listLedger(id, auth),
      ]);
      response.loans = loans.loans;
      response.ledger = ledger.rows;
    }

    return response;
  }

  async upsertEmployee(id: number | null, payload: UpsertEmployeeDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const firstName = clean(payload.firstName);
    const lastName = clean(payload.lastName);
    const displayName = `${firstName} ${lastName}`.trim();
    const rawEmployeeNo = clean(payload.employeeNo);
    const employeeNo = normalizeEmployeeNo(payload.employeeNo);
    const nationalId = clean(payload.nationalId);
    const hireDate = normalizeDateOnly(payload.hireDate);

    if (!firstName) throw new AppError('اسم الموظف مطلوب', 'HR_EMPLOYEE_NAME_REQUIRED', 400);
    if (rawEmployeeNo && !employeeNo) {
      throw new AppError('رقم الموظف يجب أن يكون أرقامًا فقط مثل 001', 'HR_EMPLOYEE_NO_INVALID', 400);
    }
    if (nationalId && !/^\d{14}$/.test(nationalId)) {
      throw new AppError('الرقم القومي يجب أن يكون 14 رقمًا.', 'HR_EMPLOYEE_NATIONAL_ID_INVALID', 400);
    }

    try {
      if (id) {
        if (employeeNo) {
          await this.ensureEmployeeNoAvailable(this.db, employeeNo, id);
        }
        await sql`
          UPDATE hr_employees
          SET employee_no = COALESCE(NULLIF(${employeeNo}, ''), employee_no), user_id = ${toId(payload.userId)}, first_name = ${firstName}, last_name = ${lastName}, display_name = ${displayName},
              national_id = ${nationalId || null},
              status = ${clean(payload.status) || 'active'}, department_id = ${toId(payload.departmentId)}, job_title_id = ${toId(payload.jobTitleId)}, position_id = ${toId(payload.positionId)},
              branch_id = ${toId(payload.branchId)}, location_id = ${toId(payload.locationId)}, hire_date = ${hireDate}, notes = ${clean(payload.notes)},
              updated_by = ${auth.userId}, updated_at = NOW()
          WHERE id = ${id}
        `.execute(this.db);
      } else {
        await this.tx.runInTransaction(this.db, async (trx) => {
          const nextEmployeeNo = employeeNo || await this.nextAvailableEmployeeNo(trx);
          await this.ensureEmployeeNoAvailable(trx, nextEmployeeNo, null);
          await sql<{ id: number }>`
            INSERT INTO hr_employees (employee_no, national_id, user_id, first_name, last_name, display_name, status, department_id, job_title_id, position_id, branch_id, location_id, hire_date, notes, created_by, updated_by)
            VALUES (${nextEmployeeNo}, ${nationalId || null}, ${toId(payload.userId)}, ${firstName}, ${lastName}, ${displayName}, ${clean(payload.status) || 'active'}, ${toId(payload.departmentId)}, ${toId(payload.jobTitleId)}, ${toId(payload.positionId)}, ${toId(payload.branchId)}, ${toId(payload.locationId)}, ${hireDate}, ${clean(payload.notes)}, ${auth.userId}, ${auth.userId})
            RETURNING id
          `.execute(trx);
        });
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError('رقم الموظف مستخدم بالفعل', 'HR_EMPLOYEE_NO_EXISTS', 409);
      }
      throw error;
    }

    await this.audit.log(`${id ? 'Update' : 'Create'} HR employee`, `Employee ${displayName} saved by ${auth.username}`, auth);
    return { ok: true, ...(await this.listEmployees({}, auth)) };
  }

  async deactivateEmployee(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await sql`UPDATE hr_employees SET status = 'deactivated', updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id}`.execute(this.db);
    await this.audit.log('Deactivate HR employee', `Employee #${id} deactivated by ${auth.username}`, auth);
    return { ok: true, ...(await this.listEmployees({}, auth)) };
  }

  async listContacts(employeeId: number, _auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await sql<Record<string, unknown>>`SELECT * FROM hr_employee_contacts WHERE employee_id = ${employeeId} ORDER BY is_primary DESC, id DESC`.execute(this.db);
    return { rows: result.rows.map((row) => ({ id: String(row.id), employeeId: String(row.employee_id), contactType: clean(row.contact_type), value: clean(row.value), label: clean(row.label), isPrimary: row.is_primary === true, notes: clean(row.notes) })) };
  }

  async upsertContact(employeeId: number, id: number | null, payload: UpsertEmployeeContactDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (id) {
      await sql`UPDATE hr_employee_contacts SET contact_type = ${clean(payload.contactType) || 'phone'}, value = ${clean(payload.value)}, label = ${clean(payload.label)}, is_primary = ${payload.isPrimary === true}, notes = ${clean(payload.notes)}, updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id} AND employee_id = ${employeeId}`.execute(this.db);
    } else {
      await sql`INSERT INTO hr_employee_contacts (employee_id, contact_type, value, label, is_primary, notes, created_by, updated_by) VALUES (${employeeId}, ${clean(payload.contactType) || 'phone'}, ${clean(payload.value)}, ${clean(payload.label)}, ${payload.isPrimary === true}, ${clean(payload.notes)}, ${auth.userId}, ${auth.userId})`.execute(this.db);
    }
    await this.audit.log(`${id ? 'Update' : 'Create'} HR employee contact`, `Employee #${employeeId} contact metadata saved by ${auth.username}`, auth);
    return this.listContacts(employeeId, auth);
  }

  async listDocuments(employeeId: number, _auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await sql<Record<string, unknown>>`SELECT d.*, u.username AS uploaded_by_name FROM hr_employee_documents d LEFT JOIN users u ON u.id = d.uploaded_by WHERE d.employee_id = ${employeeId} ORDER BY d.id DESC`.execute(this.db);
    return { rows: result.rows.map((row) => ({ id: String(row.id), employeeId: String(row.employee_id), title: clean(row.title), documentType: clean(row.document_type), fileUrl: clean(row.file_url), expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : '', notes: clean(row.notes), uploadedByName: clean(row.uploaded_by_name) })) };
  }

  async upsertDocument(employeeId: number, id: number | null, payload: UpsertEmployeeDocumentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (id) {
      await sql`UPDATE hr_employee_documents SET title = ${clean(payload.title)}, document_type = ${clean(payload.documentType)}, file_url = ${clean(payload.fileUrl)}, expiry_date = ${payload.expiryDate || null}, notes = ${clean(payload.notes)}, updated_at = NOW() WHERE id = ${id} AND employee_id = ${employeeId}`.execute(this.db);
    } else {
      await sql`INSERT INTO hr_employee_documents (employee_id, title, document_type, file_url, expiry_date, notes, uploaded_by) VALUES (${employeeId}, ${clean(payload.title)}, ${clean(payload.documentType)}, ${clean(payload.fileUrl)}, ${payload.expiryDate || null}, ${clean(payload.notes)}, ${auth.userId})`.execute(this.db);
    }
    await this.audit.log(`${id ? 'Update' : 'Create'} HR employee document metadata`, `Employee #${employeeId} document metadata saved by ${auth.username}`, auth);
    return this.listDocuments(employeeId, auth);
  }

  async listContracts(employeeId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await sql<Record<string, unknown>>`SELECT * FROM hr_employment_contracts WHERE employee_id = ${employeeId} ORDER BY id DESC`.execute(this.db);
    return { rows: result.rows.map((row) => this.maskSalary({ id: String(row.id), employeeId: String(row.employee_id), contractNo: clean(row.contract_no), contractType: clean(row.contract_type), status: clean(row.status), startDate: String(row.start_date).slice(0, 10), endDate: row.end_date ? String(row.end_date).slice(0, 10) : '', baseSalary: Number(row.base_salary || 0), currency: clean(row.currency), notes: clean(row.notes) }, auth)) };
  }

  async upsertContract(employeeId: number, id: number | null, payload: UpsertEmploymentContractDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const contractNo = clean(payload.contractNo) || (!id ? await this.generateNumber(this.db, 'hr_employment_contracts', 'CON') : '');
    if (id) {
      await sql`UPDATE hr_employment_contracts SET contract_no = ${clean(payload.contractNo)}, contract_type = ${clean(payload.contractType) || 'standard'}, status = ${clean(payload.status) || 'draft'}, start_date = ${payload.startDate}, end_date = ${payload.endDate || null}, base_salary = ${Number(payload.baseSalary || 0)}, currency = ${clean(payload.currency) || 'EGP'}, notes = ${clean(payload.notes)}, updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id} AND employee_id = ${employeeId}`.execute(this.db);
    } else {
      await sql`INSERT INTO hr_employment_contracts (employee_id, contract_no, contract_type, status, start_date, end_date, base_salary, currency, notes, created_by, updated_by) VALUES (${employeeId}, ${contractNo}, ${clean(payload.contractType) || 'standard'}, ${clean(payload.status) || 'draft'}, ${payload.startDate}, ${payload.endDate || null}, ${Number(payload.baseSalary || 0)}, ${clean(payload.currency) || 'EGP'}, ${clean(payload.notes)}, ${auth.userId}, ${auth.userId})`.execute(this.db);
    }
    await this.audit.log(`${id ? 'Update' : 'Create'} HR employment contract`, `Employee #${employeeId} contract saved by ${auth.username}`, auth);
    return this.listContracts(employeeId, auth);
  }

  async listCompensation(employeeId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await sql<Record<string, unknown>>`SELECT * FROM hr_compensation_packages WHERE employee_id = ${employeeId} ORDER BY id DESC`.execute(this.db);
    return { rows: result.rows.map((row) => this.maskSalary({ id: String(row.id), employeeId: String(row.employee_id), contractId: row.contract_id ? String(row.contract_id) : '', packageName: clean(row.package_name), allowanceAmount: Number(row.allowance_amount || 0), deductionAmount: Number(row.deduction_amount || 0), effectiveFrom: row.effective_from ? String(row.effective_from).slice(0, 10) : '', effectiveTo: row.effective_to ? String(row.effective_to).slice(0, 10) : '', notes: clean(row.notes) }, auth)) };
  }

  async upsertCompensation(employeeId: number, id: number | null, payload: UpsertCompensationPackageDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (id) {
      await sql`UPDATE hr_compensation_packages SET contract_id = ${toId(payload.contractId)}, package_name = ${clean(payload.packageName)}, allowance_amount = ${Number(payload.allowanceAmount || 0)}, deduction_amount = ${Number(payload.deductionAmount || 0)}, effective_from = ${payload.effectiveFrom || null}, effective_to = ${payload.effectiveTo || null}, notes = ${clean(payload.notes)}, updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id} AND employee_id = ${employeeId}`.execute(this.db);
    } else {
      await sql`INSERT INTO hr_compensation_packages (employee_id, contract_id, package_name, allowance_amount, deduction_amount, effective_from, effective_to, notes, created_by, updated_by) VALUES (${employeeId}, ${toId(payload.contractId)}, ${clean(payload.packageName)}, ${Number(payload.allowanceAmount || 0)}, ${Number(payload.deductionAmount || 0)}, ${payload.effectiveFrom || null}, ${payload.effectiveTo || null}, ${clean(payload.notes)}, ${auth.userId}, ${auth.userId})`.execute(this.db);
    }
    await this.audit.log(`${id ? 'Update' : 'Create'} HR compensation`, `Employee #${employeeId} compensation saved by ${auth.username}`, auth);
    return this.listCompensation(employeeId, auth);
  }

  async listLoans(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const employeeId = toId(query.employeeId);
    const result = await sql<Record<string, unknown>>`
      SELECT
        l.*,
        e.display_name AS employee_name,
        latest_paid.latest_paid_at,
        to_char(l.issue_date, 'YYYY-MM-DD') AS issue_date_text,
        to_char(l.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text,
        to_char(l.updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at_text,
        to_char(l.approved_at, 'YYYY-MM-DD HH24:MI') AS approved_at_text,
        to_char(l.disbursed_at, 'YYYY-MM-DD HH24:MI') AS disbursed_at_text,
        to_char(latest_paid.latest_paid_at, 'YYYY-MM-DD HH24:MI') AS paid_at_text
      FROM hr_employee_loans l
      JOIN hr_employees e ON e.id = l.employee_id
      LEFT JOIN (
        SELECT loan_id, MAX(paid_at) AS latest_paid_at
        FROM hr_employee_loan_installments
        WHERE paid_at IS NOT NULL
        GROUP BY loan_id
      ) latest_paid ON latest_paid.loan_id = l.id
      WHERE (${employeeId}::BIGINT IS NULL OR l.employee_id = ${employeeId})
      ORDER BY l.id DESC
    `.execute(this.db);
    const rows = result.rows.map((row) => ({
      id: String(row.id),
      employeeId: String(row.employee_id),
      employeeName: clean(row.employee_name),
      loanNo: clean(row.loan_no),
      loanType: clean(row.loan_type),
      principalAmount: Number(row.principal_amount || 0),
      paidAmount: Number(row.paid_amount || 0),
      remainingAmount: Number(row.remaining_amount || 0),
      installmentCount: Number(row.installment_count || 1),
      installmentAmount: Number(row.installment_amount || 0),
      repaymentMode: clean(row.repayment_mode) || 'manual_cash',
      monthlyInstallmentAmount: row.monthly_installment_amount ? Number(row.monthly_installment_amount) : null,
      status: clean(row.status),
      issueDate: clean(row.issue_date_text) || String(row.issue_date).slice(0, 10),
      firstDueDate: row.first_due_date ? String(row.first_due_date).slice(0, 10) : '',
      salaryDueDate: row.salary_due_date ? String(row.salary_due_date).slice(0, 10) : '',
      createdAt: clean(row.created_at_text),
      updatedAt: clean(row.updated_at_text),
      approvedAt: clean(row.approved_at_text),
      disbursedAt: clean(row.disbursed_at_text),
      paidAt: clean(row.paid_at_text),
      branchId: row.branch_id ? String(row.branch_id) : '',
      locationId: row.location_id ? String(row.location_id) : '',
      notes: clean(row.notes),
    }));
    const paged = paginateRows(rows, query, { defaultSize: 25 });
    return { loans: paged.rows, pagination: paged.pagination, summary: { totalItems: rows.length, outstandingAmount: Number(rows.reduce((sum, row) => sum + row.remainingAmount, 0).toFixed(2)) } };
  }

  async createLoan(payload: UpsertEmployeeLoanDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const employeeId = toId(payload.employeeId);
    const amount = Number(payload.principalAmount || 0);
    const issueDate = normalizeDateOnly(payload.issueDate);
    const repaymentMode = clean(payload.repaymentMode) || 'manual_cash';
    if (!employeeId) throw new AppError('Employee is required', 'HR_LOAN_EMPLOYEE_REQUIRED', 400);
    if (!(amount > 0)) throw new AppError('Loan amount must be greater than zero', 'HR_LOAN_AMOUNT_INVALID', 400);
    if (!issueDate) throw new AppError('Loan issue date is required', 'HR_LOAN_ISSUE_DATE_REQUIRED', 400);
    if (!['deduct_next_salary', 'monthly_salary_installment', 'manual_cash'].includes(repaymentMode)) {
      throw new AppError('Loan repayment mode is invalid', 'HR_LOAN_REPAYMENT_MODE_INVALID', 400);
    }
    if (repaymentMode === 'monthly_salary_installment' && !(Number(payload.monthlyInstallmentAmount || 0) > 0) && !(Number(payload.installmentCount || 0) > 0)) {
      throw new AppError('Monthly installment amount or installment count is required', 'HR_LOAN_INSTALLMENT_REQUIRED', 400);
    }

    await this.tx.runInTransaction(this.db, async (trx) => {
      const plan = this.normalizeRepaymentPlan({ ...payload, employeeId, principalAmount: amount, issueDate, repaymentMode }, amount);
      const loanNo = clean(payload.loanNo) || await this.generateNumber(trx, 'hr_employee_loans', 'LOAN');
      const insert = await sql<{ id: number }>`
        INSERT INTO hr_employee_loans (employee_id, loan_no, loan_type, principal_amount, paid_amount, remaining_amount, installment_count, installment_amount, repayment_mode, monthly_installment_amount, status, issue_date, first_due_date, salary_due_date, branch_id, location_id, notes, created_by, updated_by)
        VALUES (${employeeId}, ${loanNo}, ${clean(payload.loanType) || 'advance'}, ${amount}, 0, ${amount}, ${plan.installmentCount}, ${plan.installmentAmount}, ${plan.repaymentMode}, ${plan.monthlyInstallmentAmount}, 'draft', ${issueDate}, ${plan.firstDueDate}, ${plan.salaryDueDate}, ${toId(payload.branchId)}, ${toId(payload.locationId)}, ${clean(payload.notes)}, ${auth.userId}, ${auth.userId})
        RETURNING id
      `.execute(trx);
      const loanId = Number(insert.rows[0]?.id || 0);
      for (let i = 1; i <= plan.installmentCount; i += 1) {
        const dueDate = plan.firstDueDate ? addMonths(plan.firstDueDate, i - 1) : null;
        const installmentValue = i === plan.installmentCount
          ? Math.max(0, Number((amount - plan.installmentAmount * (plan.installmentCount - 1)).toFixed(2)))
          : plan.installmentAmount;
        await sql`INSERT INTO hr_employee_loan_installments (loan_id, installment_no, due_date, amount) VALUES (${loanId}, ${i}, ${dueDate}, ${installmentValue})`.execute(trx);
      }
    });
    await this.audit.log('Create HR employee loan', `Employee loan created by ${auth.username}`, auth);
    return { ok: true, ...(await this.listLoans({}, auth)) };
  }

  async updateLoan(id: number, payload: UpsertEmployeeLoanDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const existing = await sql<{ status: string }>`SELECT status FROM hr_employee_loans WHERE id = ${id}`.execute(this.db);
    if (!existing.rows.length) throw new AppError('Loan not found', 'HR_LOAN_NOT_FOUND', 404);
    if (existing.rows[0].status !== 'draft') throw new AppError('Only draft loans can be edited', 'HR_LOAN_EDIT_LOCKED', 400);

    const amount = Number(payload.principalAmount || 0);
    const issueDate = normalizeDateOnly(payload.issueDate);
    if (!issueDate) throw new AppError('Loan issue date is required', 'HR_LOAN_ISSUE_DATE_REQUIRED', 400);
    const plan = this.normalizeRepaymentPlan({ ...payload, issueDate }, amount);

    await this.tx.runInTransaction(this.db, async (trx) => {
      await sql`
        UPDATE hr_employee_loans
        SET loan_no = ${clean(payload.loanNo)}, loan_type = ${clean(payload.loanType) || 'advance'}, principal_amount = ${amount},
            remaining_amount = ${amount}, installment_count = ${plan.installmentCount}, installment_amount = ${plan.installmentAmount},
            repayment_mode = ${plan.repaymentMode}, monthly_installment_amount = ${plan.monthlyInstallmentAmount},
            issue_date = ${issueDate}, first_due_date = ${plan.firstDueDate}, salary_due_date = ${plan.salaryDueDate}, branch_id = ${toId(payload.branchId)}, location_id = ${toId(payload.locationId)},
            notes = ${clean(payload.notes)}, updated_by = ${auth.userId}, updated_at = NOW()
        WHERE id = ${id}
      `.execute(trx);

      await sql`DELETE FROM hr_employee_loan_installments WHERE loan_id = ${id}`.execute(trx);
      for (let i = 1; i <= plan.installmentCount; i += 1) {
        const installmentValue = i === plan.installmentCount
          ? Math.max(0, Number((amount - plan.installmentAmount * (plan.installmentCount - 1)).toFixed(2)))
          : plan.installmentAmount;
        const dueDate = plan.firstDueDate ? addMonths(plan.firstDueDate, i - 1) : null;
        await sql`
          INSERT INTO hr_employee_loan_installments (loan_id, installment_no, due_date, amount)
          VALUES (${id}, ${i}, ${dueDate}, ${installmentValue})
        `.execute(trx);
      }
    });

    await this.audit.log('Update HR employee loan', `Employee loan #${id} updated by ${auth.username}`, auth);
    return { ok: true, ...(await this.listLoans({}, auth)) };
  }

  async approveLoan(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await sql`UPDATE hr_employee_loans SET status = 'approved', approved_by = ${auth.userId}, approved_at = NOW(), updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id} AND status = 'draft'`.execute(this.db);
    await this.audit.log('Approve HR employee loan', `Employee loan #${id} approved by ${auth.username}`, auth);
    return { ok: true, ...(await this.listLoans({}, auth)) };
  }

  async disburseLoan(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await sql<Record<string, unknown>>`
        SELECT l.*, e.display_name AS employee_name FROM hr_employee_loans l JOIN hr_employees e ON e.id = l.employee_id WHERE l.id = ${id} LIMIT 1
      `.execute(trx);
      const loan = result.rows[0];
      if (!loan) throw new AppError('Loan not found', 'HR_LOAN_NOT_FOUND', 404);
      if (clean(loan.status) !== 'approved') throw new AppError('Loan must be approved before disbursement', 'HR_LOAN_APPROVAL_REQUIRED', 400);
      await sql`UPDATE hr_employee_loans SET status = 'paid', disbursed_by = ${auth.userId}, disbursed_at = NOW(), updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id}`.execute(trx);
      const ledger = await sql<{ id: number }>`
        INSERT INTO hr_employee_ledger (employee_id, entry_type, amount, balance_after, note, reference_type, reference_id, branch_id, location_id, created_by)
        VALUES (${loan.employee_id}, 'loan_disbursement', ${Number(loan.principal_amount || 0)}, ${Number(loan.remaining_amount || 0)}, 'Employee advance/loan disbursed', 'hr_employee_loan', ${id}, ${toId(loan.branch_id)}, ${toId(loan.location_id)}, ${auth.userId})
        RETURNING id
      `.execute(trx);
      void ledger;
      await this.treasury.recordLoanDisbursement(trx, { id, amount: Number(loan.principal_amount || 0), employeeName: clean(loan.employee_name), branchId: toId(loan.branch_id), locationId: toId(loan.location_id) }, auth);
    });
    await this.audit.log('Pay HR employee loan', `Employee loan #${id} disbursed by ${auth.username}`, auth);
    return { ok: true, ...(await this.listLoans({}, auth)) };
  }

  async repayLoan(id: number, payload: LoanRepaymentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await sql<Record<string, unknown>>`
        SELECT l.*, e.display_name AS employee_name FROM hr_employee_loans l JOIN hr_employees e ON e.id = l.employee_id WHERE l.id = ${id} LIMIT 1
      `.execute(trx);
      const loan = result.rows[0];
      if (!loan) throw new AppError('Loan not found', 'HR_LOAN_NOT_FOUND', 404);
      if (!['paid', 'partially_repaid'].includes(clean(loan.status))) throw new AppError('Loan must be disbursed before repayment', 'HR_LOAN_REPAYMENT_STATUS_INVALID', 400);
      const amount = Math.min(Number(payload.amount || 0), Number(loan.remaining_amount || 0));
      const repaymentMethod = clean(payload.repaymentMethod) === 'salary_deduction' ? 'salary_deduction' : 'manual_cash';
      if (!(amount > 0)) throw new AppError('Loan has no remaining balance', 'HR_LOAN_NO_BALANCE', 400);
      const paid = Number(loan.paid_amount || 0) + amount;
      const remaining = Math.max(0, Number(loan.remaining_amount || 0) - amount);
      await sql`UPDATE hr_employee_loans SET paid_amount = ${paid}, remaining_amount = ${remaining}, status = ${remaining > 0 ? 'partially_repaid' : 'repaid'}, updated_by = ${auth.userId}, updated_at = NOW() WHERE id = ${id}`.execute(trx);
      let remainingRepayment = amount;
      const installments = await sql<Record<string, unknown>>`
        SELECT id, amount, paid_amount
        FROM hr_employee_loan_installments
        WHERE loan_id = ${id} AND status <> 'paid'
        ORDER BY installment_no ASC
      `.execute(trx);
      for (const installment of installments.rows) {
        if (remainingRepayment <= 0) break;
        const installmentId = Number(installment.id || 0);
        const installmentAmount = Number(installment.amount || 0);
        const alreadyPaid = Number(installment.paid_amount || 0);
        const due = Math.max(0, installmentAmount - alreadyPaid);
        if (!(installmentId > 0) || !(due > 0)) continue;
        const applied = Math.min(due, remainingRepayment);
        const newPaid = Number((alreadyPaid + applied).toFixed(2));
        const status = newPaid + 0.005 >= installmentAmount ? 'paid' : 'partial';
        await sql`
          UPDATE hr_employee_loan_installments
          SET paid_amount = ${newPaid}, status = ${status}, paid_at = CASE WHEN ${status} = 'paid' THEN NOW() ELSE paid_at END, updated_at = NOW()
          WHERE id = ${installmentId}
        `.execute(trx);
        remainingRepayment = Number((remainingRepayment - applied).toFixed(2));
      }
      const ledger = await sql<{ id: number }>`
        INSERT INTO hr_employee_ledger (employee_id, entry_type, amount, balance_after, note, repayment_method, reference_type, reference_id, branch_id, location_id, created_by)
        VALUES (${loan.employee_id}, 'loan_repayment', ${-amount}, ${remaining}, ${clean(payload.note) || 'Employee loan repayment'}, ${repaymentMethod}, 'hr_employee_loan', ${id}, ${toId(loan.branch_id)}, ${toId(loan.location_id)}, ${auth.userId})
        RETURNING id
      `.execute(trx);
      const ledgerId = Number(ledger.rows[0]?.id || 0);
      if (repaymentMethod === 'manual_cash') {
        await this.treasury.recordLoanRepayment(trx, { ledgerId, loanId: id, amount, employeeName: clean(loan.employee_name), branchId: toId(loan.branch_id), locationId: toId(loan.location_id) }, auth);
      }
    });
    await this.audit.log('Repay HR employee loan', `Employee loan #${id} repayment recorded by ${auth.username}`, auth);
    return { ok: true, ...(await this.listLoans({}, auth)) };
  }

  async listLedger(employeeId: number, _auth: AuthContext): Promise<Record<string, unknown>> {
    const result = await sql<Record<string, unknown>>`SELECT * FROM hr_employee_ledger WHERE employee_id = ${employeeId} ORDER BY id DESC`.execute(this.db);
    return { rows: result.rows.map((row) => ({ id: String(row.id), employeeId: String(row.employee_id), entryType: clean(row.entry_type), amount: Number(row.amount || 0), balanceAfter: Number(row.balance_after || 0), note: clean(row.note), repaymentMethod: clean(row.repayment_method), referenceType: clean(row.reference_type), referenceId: row.reference_id ? String(row.reference_id) : '', createdAt: String(row.created_at) })) };
  }

  private mapPayrollRun(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: String(row.id),
      periodMonth: clean(row.period_month),
      status: clean(row.status) || 'draft',
      notes: clean(row.notes),
      createdBy: row.created_by ? String(row.created_by) : '',
      reviewedBy: row.reviewed_by ? String(row.reviewed_by) : '',
      approvedBy: row.approved_by ? String(row.approved_by) : '',
      createdAt: clean(row.created_at_text),
      reviewedAt: clean(row.reviewed_at_text),
      approvedAt: clean(row.approved_at_text),
      updatedAt: clean(row.updated_at_text),
      itemCount: Number(row.item_count || 0),
      totalBaseSalary: Number(row.total_base_salary || 0),
      totalAllowanceAmount: Number(row.total_allowance_amount || 0),
      totalDeductionAmount: Number(row.total_deduction_amount || 0),
      totalLoanDeductionAmount: Number(row.total_loan_deduction_amount || 0),
      totalGrossPay: Number(row.total_gross_pay || 0),
      totalNetPay: Number(row.total_net_pay || 0),
    };
  }

  private mapPayrollItem(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: String(row.id),
      runId: String(row.run_id),
      employeeId: String(row.employee_id),
      employeeName: clean(row.employee_name),
      employeeNo: clean(row.employee_no),
      contractId: row.contract_id ? String(row.contract_id) : '',
      baseSalary: Number(row.base_salary || 0),
      allowanceAmount: Number(row.allowance_amount || 0),
      deductionAmount: Number(row.deduction_amount || 0),
      loanDeductionAmount: Number(row.loan_deduction_amount || 0),
      grossPay: Number(row.gross_pay || 0),
      netPay: Number(row.net_pay || 0),
      status: clean(row.status) || 'draft',
      notes: clean(row.notes),
      createdAt: clean(row.created_at_text),
      updatedAt: clean(row.updated_at_text),
    };
  }

  private mapPayrollAdjustment(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: String(row.id),
      payrollItemId: String(row.payroll_item_id),
      adjustmentType: clean(row.adjustment_type),
      label: clean(row.label),
      amount: Number(row.amount || 0),
      notes: clean(row.notes),
      createdAt: clean(row.created_at_text),
    };
  }

  private async getPayrollRunStatus(db: Kysely<Database>, runId: number): Promise<string> {
    const result = await sql<{ status: string }>`SELECT status FROM hr_payroll_runs WHERE id = ${runId} LIMIT 1`.execute(db);
    const status = clean(result.rows[0]?.status);
    if (!status) throw new AppError('Payroll run not found', 'HR_PAYROLL_RUN_NOT_FOUND', 404);
    return status;
  }

  private async getPayrollItemRun(db: Kysely<Database>, itemId: number): Promise<{ runId: number; runStatus: string; itemStatus: string }> {
    const result = await sql<{ run_id: number; run_status: string; item_status: string }>`
      SELECT i.run_id, r.status AS run_status, i.status AS item_status
      FROM hr_payroll_run_items i
      JOIN hr_payroll_runs r ON r.id = i.run_id
      WHERE i.id = ${itemId}
      LIMIT 1
    `.execute(db);
    const row = result.rows[0];
    if (!row) throw new AppError('Payroll item not found', 'HR_PAYROLL_ITEM_NOT_FOUND', 404);
    return { runId: Number(row.run_id), runStatus: clean(row.run_status), itemStatus: clean(row.item_status) };
  }

  private async calculateLoanDeduction(db: Kysely<Database>, employeeId: number): Promise<{ amount: number; notes: string[] }> {
    const result = await sql<Record<string, unknown>>`
      SELECT id, repayment_mode, remaining_amount, principal_amount, installment_count, monthly_installment_amount
      FROM hr_employee_loans
      WHERE employee_id = ${employeeId}
        AND repayment_mode IN ('deduct_next_salary', 'monthly_salary_installment')
        AND status IN ('paid', 'partially_repaid', 'disbursed')
        AND remaining_amount > 0
      ORDER BY id ASC
    `.execute(db);
    let total = 0;
    const notes: string[] = [];
    for (const loan of result.rows) {
      const remaining = money(loan.remaining_amount);
      if (!(remaining > 0)) continue;
      const mode = clean(loan.repayment_mode);
      let deduction = 0;
      if (mode === 'deduct_next_salary') {
        deduction = remaining;
      } else if (mode === 'monthly_salary_installment') {
        const monthly = money(loan.monthly_installment_amount);
        const installmentCount = Number(loan.installment_count || 0);
        const principal = money(loan.principal_amount);
        if (monthly > 0) {
          deduction = monthly;
        } else if (principal > 0 && installmentCount > 0) {
          deduction = Number((principal / installmentCount).toFixed(2));
        } else {
          notes.push(`Loan #${loan.id} has no monthly installment amount`);
        }
      }
      const capped = Math.min(remaining, money(deduction));
      if (capped > 0) total = Number((total + capped).toFixed(2));
    }
    return { amount: total, notes };
  }

  private async adjustmentTotals(db: Kysely<Database>, itemId: number): Promise<{ allowance: number; deduction: number }> {
    const result = await sql<{ allowance: string; deduction: string }>`
      SELECT
        COALESCE(SUM(CASE WHEN adjustment_type = 'allowance' THEN amount ELSE 0 END), 0) AS allowance,
        COALESCE(SUM(CASE WHEN adjustment_type = 'deduction' THEN amount ELSE 0 END), 0) AS deduction
      FROM hr_payroll_item_adjustments
      WHERE payroll_item_id = ${itemId}
    `.execute(db);
    return {
      allowance: money(result.rows[0]?.allowance),
      deduction: money(result.rows[0]?.deduction),
    };
  }

  private async recalculatePayrollItemTotals(db: Kysely<Database>, itemId: number): Promise<void> {
    const result = await sql<Record<string, unknown>>`
      SELECT i.*, c.allowance_amount AS compensation_allowance, c.deduction_amount AS compensation_deduction
      FROM hr_payroll_run_items i
      LEFT JOIN LATERAL (
        SELECT cp.allowance_amount, cp.deduction_amount
        FROM hr_compensation_packages cp
        WHERE cp.employee_id = i.employee_id
          AND (i.contract_id IS NULL OR cp.contract_id IS NULL OR cp.contract_id = i.contract_id)
        ORDER BY cp.effective_from DESC NULLS LAST, cp.id DESC
        LIMIT 1
      ) c ON TRUE
      WHERE i.id = ${itemId}
      LIMIT 1
    `.execute(db);
    const item = result.rows[0];
    if (!item) throw new AppError('Payroll item not found', 'HR_PAYROLL_ITEM_NOT_FOUND', 404);
    const adjustments = await this.adjustmentTotals(db, itemId);
    const baseSalary = money(item.base_salary);
    const allowanceAmount = Number((money(item.compensation_allowance) + adjustments.allowance).toFixed(2));
    const deductionAmount = Number((money(item.compensation_deduction) + adjustments.deduction).toFixed(2));
    const loanDeductionAmount = money(item.loan_deduction_amount);
    const grossPay = Number((baseSalary + allowanceAmount).toFixed(2));
    const rawNetPay = Number((grossPay - deductionAmount - loanDeductionAmount).toFixed(2));
    const capped = rawNetPay < 0;
    const netPay = Math.max(0, rawNetPay);
    const notes = capped && !clean(item.notes).includes('Net pay capped at zero')
      ? combineNotes(clean(item.notes), 'Net pay capped at zero')
      : clean(item.notes);
    await sql`
      UPDATE hr_payroll_run_items
      SET allowance_amount = ${allowanceAmount}, deduction_amount = ${deductionAmount}, gross_pay = ${grossPay},
          net_pay = ${netPay}, notes = ${notes}, updated_at = NOW()
      WHERE id = ${itemId}
    `.execute(db);
  }

  private async rebuildPayrollRunItems(db: Kysely<Database>, runId: number, runStatus: string): Promise<void> {
    const runResult = await sql<{ period_month: string }>`SELECT period_month FROM hr_payroll_runs WHERE id = ${runId} LIMIT 1`.execute(db);
    const periodMonth = normalizePayrollMonth(runResult.rows[0]?.period_month);
    if (!periodMonth) throw new AppError('Payroll month is invalid', 'HR_PAYROLL_MONTH_INVALID', 400);
    const range = monthRange(periodMonth);
    const itemStatus = runStatus === 'reviewed' ? 'reviewed' : 'draft';
    const employees = await sql<Record<string, unknown>>`
      SELECT
        e.id AS employee_id,
        e.display_name,
        c.id AS contract_id,
        c.base_salary,
        cp.allowance_amount,
        cp.deduction_amount
      FROM hr_employees e
      LEFT JOIN LATERAL (
        SELECT *
        FROM hr_employment_contracts c
        WHERE c.employee_id = e.id
          AND c.status <> 'cancelled'
        ORDER BY CASE WHEN c.status = 'active' THEN 0 WHEN c.status = 'draft' THEN 1 ELSE 2 END,
                 c.start_date DESC NULLS LAST,
                 c.id DESC
        LIMIT 1
      ) c ON TRUE
      LEFT JOIN LATERAL (
        SELECT *
        FROM hr_compensation_packages cp
        WHERE cp.employee_id = e.id
          AND (cp.effective_from IS NULL OR cp.effective_from <= ${range.to})
          AND (cp.effective_to IS NULL OR cp.effective_to >= ${range.from})
        ORDER BY cp.effective_from DESC NULLS LAST, cp.id DESC
        LIMIT 1
      ) cp ON TRUE
      WHERE e.status = 'active'
      ORDER BY e.id ASC
    `.execute(db);

    for (const employee of employees.rows) {
      const employeeId = Number(employee.employee_id || 0);
      if (!(employeeId > 0)) continue;
      const existing = await sql<Record<string, unknown>>`
        SELECT id, status, notes
        FROM hr_payroll_run_items
        WHERE run_id = ${runId} AND employee_id = ${employeeId}
        LIMIT 1
      `.execute(db);
      const existingItem = existing.rows[0];
      if (clean(existingItem?.status) === 'excluded' || clean(existingItem?.status) === 'approved') continue;
      const itemId = Number(existingItem?.id || 0);
      const adjustments = itemId > 0 ? await this.adjustmentTotals(db, itemId) : { allowance: 0, deduction: 0 };
      const baseSalary = money(employee.base_salary);
      const compensationAllowance = money(employee.allowance_amount);
      const compensationDeduction = money(employee.deduction_amount);
      const loanDeduction = await this.calculateLoanDeduction(db, employeeId);
      const allowanceAmount = Number((compensationAllowance + adjustments.allowance).toFixed(2));
      const deductionAmount = Number((compensationDeduction + adjustments.deduction).toFixed(2));
      const grossPay = Number((baseSalary + allowanceAmount).toFixed(2));
      const rawNetPay = Number((grossPay - deductionAmount - loanDeduction.amount).toFixed(2));
      const netPay = Math.max(0, rawNetPay);
      const generatedNotes = [
        baseSalary > 0 ? '' : 'Missing salary data',
        ...loanDeduction.notes,
        rawNetPay < 0 ? 'Net pay capped at zero' : '',
      ].filter(Boolean);
      const notes = combineNotes(clean(existingItem?.notes), ...generatedNotes);
      if (itemId > 0) {
        await sql`
          UPDATE hr_payroll_run_items
          SET contract_id = ${toId(employee.contract_id)}, base_salary = ${baseSalary}, allowance_amount = ${allowanceAmount},
              deduction_amount = ${deductionAmount}, loan_deduction_amount = ${loanDeduction.amount}, gross_pay = ${grossPay},
              net_pay = ${netPay}, status = ${itemStatus}, notes = ${notes}, updated_at = NOW()
          WHERE id = ${itemId}
        `.execute(db);
      } else {
        await sql`
          INSERT INTO hr_payroll_run_items (
            run_id, employee_id, contract_id, base_salary, allowance_amount, deduction_amount,
            loan_deduction_amount, gross_pay, net_pay, status, notes
          )
          VALUES (
            ${runId}, ${employeeId}, ${toId(employee.contract_id)}, ${baseSalary}, ${allowanceAmount}, ${deductionAmount},
            ${loanDeduction.amount}, ${grossPay}, ${netPay}, ${itemStatus}, ${notes}
          )
        `.execute(db);
      }
    }
    await sql`UPDATE hr_payroll_runs SET updated_at = NOW() WHERE id = ${runId}`.execute(db);
  }

  private async calculatePayrollOperationalReview(
    db: Kysely<Database>,
    periodMonth: string,
    employeeIds: number[],
    baseSalaryByEmployeeId: Map<number, number>,
  ): Promise<Map<number, PayrollOperationalReview>> {
    const reviewByEmployeeId = new Map<number, PayrollOperationalReview>();
    if (!employeeIds.length) return reviewByEmployeeId;
    const range = monthRange(periodMonth);

    const attendanceResult = await sql<Record<string, unknown>>`
      SELECT
        employee_id,
        COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0) AS absent_days,
        COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0) AS late_days,
        COALESCE(SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END), 0) AS half_days,
        COALESCE(SUM(CASE WHEN status = 'early_leave' THEN 1 ELSE 0 END), 0) AS early_leave_days
      FROM hr_attendance_records
      WHERE employee_id IN (${sql.join(employeeIds)})
        AND work_date >= ${range.from}::date
        AND work_date <= ${range.to}::date
      GROUP BY employee_id
    `.execute(db);

    const leaveResult = await sql<Record<string, unknown>>`
      SELECT
        lr.employee_id,
        COALESCE(SUM(lr.days_count), 0) AS approved_leave_days,
        COALESCE(SUM(CASE WHEN COALESCE(lt.is_paid, TRUE) = FALSE OR LOWER(COALESCE(lt.code, '')) = 'unpaid' OR LOWER(COALESCE(lr.leave_type, '')) = 'unpaid' THEN lr.days_count ELSE 0 END), 0) AS unpaid_leave_days
      FROM hr_leave_requests lr
      LEFT JOIN hr_leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.employee_id IN (${sql.join(employeeIds)})
        AND lr.status = 'approved'
        AND lr.start_date <= ${range.to}::date
        AND lr.end_date >= ${range.from}::date
      GROUP BY lr.employee_id
    `.execute(db);

    const attendanceByEmployee = new Map<number, Record<string, unknown>>();
    for (const row of attendanceResult.rows) {
      attendanceByEmployee.set(Number(row.employee_id || 0), row);
    }

    const leaveByEmployee = new Map<number, Record<string, unknown>>();
    for (const row of leaveResult.rows) {
      leaveByEmployee.set(Number(row.employee_id || 0), row);
    }

    for (const employeeId of employeeIds) {
      const attendance = attendanceByEmployee.get(employeeId) || {};
      const leave = leaveByEmployee.get(employeeId) || {};
      const attendanceAbsentDays = Number(attendance.absent_days || 0);
      const attendanceLateDays = Number(attendance.late_days || 0);
      const attendanceHalfDays = Number(attendance.half_days || 0);
      const attendanceEarlyLeaveDays = Number(attendance.early_leave_days || 0);
      const approvedLeaveDays = Number(leave.approved_leave_days || 0);
      const unpaidLeaveDays = Number(leave.unpaid_leave_days || 0);
      const baseSalary = Number(baseSalaryByEmployeeId.get(employeeId) || 0);
      const dailyRate = baseSalary > 0 ? Number((baseSalary / 30).toFixed(2)) : 0;
      const suggestedAttendanceDeductionAmount = Number(((dailyRate * attendanceAbsentDays) + (dailyRate * 0.5 * attendanceHalfDays)).toFixed(2));
      const suggestedLeaveDeductionAmount = Number((dailyRate * unpaidLeaveDays).toFixed(2));
      const payrollReviewNotes = `مراجعة مقترحة: غياب ${attendanceAbsentDays} يوم، إجازة بدون مرتب ${unpaidLeaveDays} يوم.`;
      reviewByEmployeeId.set(employeeId, {
        attendanceAbsentDays,
        attendanceLateDays,
        attendanceHalfDays,
        attendanceEarlyLeaveDays,
        approvedLeaveDays,
        unpaidLeaveDays,
        suggestedAttendanceDeductionAmount,
        suggestedLeaveDeductionAmount,
        payrollReviewNotes,
      });
    }

    return reviewByEmployeeId;
  }

  async listPayrollRuns(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const month = normalizePayrollMonth(query.month);
    const result = await sql<Record<string, unknown>>`
      SELECT
        r.*,
        to_char(r.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text,
        to_char(r.reviewed_at, 'YYYY-MM-DD HH24:MI') AS reviewed_at_text,
        to_char(r.approved_at, 'YYYY-MM-DD HH24:MI') AS approved_at_text,
        to_char(r.updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at_text,
        COUNT(i.id) AS item_count,
        COALESCE(SUM(i.base_salary), 0) AS total_base_salary,
        COALESCE(SUM(i.allowance_amount), 0) AS total_allowance_amount,
        COALESCE(SUM(i.deduction_amount), 0) AS total_deduction_amount,
        COALESCE(SUM(i.loan_deduction_amount), 0) AS total_loan_deduction_amount,
        COALESCE(SUM(i.gross_pay), 0) AS total_gross_pay,
        COALESCE(SUM(i.net_pay), 0) AS total_net_pay
      FROM hr_payroll_runs r
      LEFT JOIN hr_payroll_run_items i ON i.run_id = r.id AND i.status <> 'excluded'
      WHERE (${month} = '' OR r.period_month = ${month})
      GROUP BY r.id
      ORDER BY r.period_month DESC, r.id DESC
    `.execute(this.db);
    const runs = result.rows.map((row) => this.mapPayrollRun(row));
    const paged = paginateRows(runs, query, { defaultSize: 25 });
    return { runs: paged.rows, pagination: paged.pagination, summary: { totalItems: runs.length } };
  }

  async getPayrollRun(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const runResult = await sql<Record<string, unknown>>`
      SELECT
        r.*,
        to_char(r.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text,
        to_char(r.reviewed_at, 'YYYY-MM-DD HH24:MI') AS reviewed_at_text,
        to_char(r.approved_at, 'YYYY-MM-DD HH24:MI') AS approved_at_text,
        to_char(r.updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at_text,
        COUNT(i.id) AS item_count,
        COALESCE(SUM(i.base_salary), 0) AS total_base_salary,
        COALESCE(SUM(i.allowance_amount), 0) AS total_allowance_amount,
        COALESCE(SUM(i.deduction_amount), 0) AS total_deduction_amount,
        COALESCE(SUM(i.loan_deduction_amount), 0) AS total_loan_deduction_amount,
        COALESCE(SUM(i.gross_pay), 0) AS total_gross_pay,
        COALESCE(SUM(i.net_pay), 0) AS total_net_pay
      FROM hr_payroll_runs r
      LEFT JOIN hr_payroll_run_items i ON i.run_id = r.id AND i.status <> 'excluded'
      WHERE r.id = ${id}
      GROUP BY r.id
      LIMIT 1
    `.execute(this.db);
    const run = runResult.rows[0];
    if (!run) throw new AppError('Payroll run not found', 'HR_PAYROLL_RUN_NOT_FOUND', 404);
    const itemResult = await sql<Record<string, unknown>>`
      SELECT
        i.*,
        e.display_name AS employee_name,
        e.employee_no,
        to_char(i.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text,
        to_char(i.updated_at, 'YYYY-MM-DD HH24:MI') AS updated_at_text
      FROM hr_payroll_run_items i
      JOIN hr_employees e ON e.id = i.employee_id
      WHERE i.run_id = ${id}
      ORDER BY e.display_name ASC, i.id ASC
    `.execute(this.db);
    const periodMonth = clean(run.period_month);
    const employeeIds = itemResult.rows.map((row) => Number(row.employee_id || 0)).filter((value) => value > 0);
    const baseSalaryByEmployeeId = new Map<number, number>();
    for (const row of itemResult.rows) {
      const employeeId = Number(row.employee_id || 0);
      if (!(employeeId > 0)) continue;
      baseSalaryByEmployeeId.set(employeeId, Number(row.base_salary || 0));
    }
    const reviewByEmployeeId = await this.calculatePayrollOperationalReview(this.db, periodMonth, employeeIds, baseSalaryByEmployeeId);
    const itemIds = itemResult.rows.map((row) => Number(row.id || 0)).filter((itemId) => itemId > 0);
    const adjustmentResult = itemIds.length
      ? await sql<Record<string, unknown>>`
          SELECT a.*, to_char(a.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text
          FROM hr_payroll_item_adjustments a
          WHERE a.payroll_item_id IN (${sql.join(itemIds)})
          ORDER BY a.id ASC
        `.execute(this.db)
      : { rows: [] };
    const adjustmentsByItem = new Map<string, Record<string, unknown>[]>();
    for (const adjustment of adjustmentResult.rows) {
      const key = String(adjustment.payroll_item_id);
      adjustmentsByItem.set(key, [...(adjustmentsByItem.get(key) || []), this.mapPayrollAdjustment(adjustment)]);
    }
    const items = itemResult.rows.map((row) => {
      const employeeId = Number(row.employee_id || 0);
      const review = reviewByEmployeeId.get(employeeId);
      return {
        ...this.mapPayrollItem(row),
        attendanceAbsentDays: review?.attendanceAbsentDays ?? 0,
        attendanceLateDays: review?.attendanceLateDays ?? 0,
        attendanceHalfDays: review?.attendanceHalfDays ?? 0,
        attendanceEarlyLeaveDays: review?.attendanceEarlyLeaveDays ?? 0,
        approvedLeaveDays: review?.approvedLeaveDays ?? 0,
        unpaidLeaveDays: review?.unpaidLeaveDays ?? 0,
        suggestedAttendanceDeductionAmount: review?.suggestedAttendanceDeductionAmount ?? 0,
        suggestedLeaveDeductionAmount: review?.suggestedLeaveDeductionAmount ?? 0,
        payrollReviewNotes: review?.payrollReviewNotes || '',
        adjustments: adjustmentsByItem.get(String(row.id)) || [],
      };
    });
    return { run: { ...this.mapPayrollRun(run), items } };
  }

  async createPayrollRun(payload: CreatePayrollRunDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const periodMonth = normalizePayrollMonth(payload.periodMonth);
    if (!periodMonth) throw new AppError('Payroll month must use YYYY-MM format', 'HR_PAYROLL_MONTH_INVALID', 400);
    let runId = 0;
    await this.tx.runInTransaction(this.db, async (trx) => {
      const existing = await sql<{ id: number }>`SELECT id FROM hr_payroll_runs WHERE period_month = ${periodMonth} AND status <> 'cancelled' ORDER BY id DESC LIMIT 1`.execute(trx);
      runId = Number(existing.rows[0]?.id || 0);
      if (!runId) {
        const inserted = await sql<{ id: number }>`
          INSERT INTO hr_payroll_runs (period_month, status, notes, created_by)
          VALUES (${periodMonth}, 'draft', ${clean(payload.notes)}, ${auth.userId})
          RETURNING id
        `.execute(trx);
        runId = Number(inserted.rows[0]?.id || 0);
        await this.rebuildPayrollRunItems(trx, runId, 'draft');
      }
    });
    await this.audit.log('Create HR payroll run', `Payroll run ${periodMonth} prepared by ${auth.username}`, auth);
    return this.getPayrollRun(runId, auth);
  }

  async recalculatePayrollRun(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const status = await this.getPayrollRunStatus(trx, id);
      if (!['draft', 'reviewed'].includes(status)) throw new AppError('Only draft or reviewed payroll runs can be recalculated', 'HR_PAYROLL_RECALCULATE_LOCKED', 400);
      await this.rebuildPayrollRunItems(trx, id, status);
    });
    await this.audit.log('Recalculate HR payroll run', `Payroll run #${id} recalculated by ${auth.username}`, auth);
    return this.getPayrollRun(id, auth);
  }

  async reviewPayrollRun(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const status = await this.getPayrollRunStatus(trx, id);
      if (status !== 'draft') throw new AppError('Only draft payroll runs can be reviewed', 'HR_PAYROLL_REVIEW_LOCKED', 400);
      await sql`UPDATE hr_payroll_run_items SET status = 'reviewed', updated_at = NOW() WHERE run_id = ${id} AND status = 'draft'`.execute(trx);
      await sql`UPDATE hr_payroll_runs SET status = 'reviewed', reviewed_by = ${auth.userId}, reviewed_at = NOW(), updated_at = NOW() WHERE id = ${id}`.execute(trx);
    });
    await this.audit.log('Review HR payroll run', `Payroll run #${id} reviewed by ${auth.username}`, auth);
    return this.getPayrollRun(id, auth);
  }

  async approvePayrollRun(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const status = await this.getPayrollRunStatus(trx, id);
      if (status !== 'reviewed') throw new AppError('Only reviewed payroll runs can be approved', 'HR_PAYROLL_APPROVE_LOCKED', 400);
      await sql`UPDATE hr_payroll_run_items SET status = 'approved', updated_at = NOW() WHERE run_id = ${id} AND status = 'reviewed'`.execute(trx);
      await sql`UPDATE hr_payroll_runs SET status = 'approved', approved_by = ${auth.userId}, approved_at = NOW(), updated_at = NOW() WHERE id = ${id}`.execute(trx);
    });
    await this.audit.log('Approve HR payroll run', `Payroll run #${id} approved by ${auth.username}`, auth);
    return this.getPayrollRun(id, auth);
  }

  async cancelPayrollRun(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const status = await this.getPayrollRunStatus(this.db, id);
    if (status === 'approved') throw new AppError('Approved payroll runs cannot be cancelled in Phase 2A', 'HR_PAYROLL_CANCEL_LOCKED', 400);
    await sql`UPDATE hr_payroll_runs SET status = 'cancelled', updated_at = NOW() WHERE id = ${id} AND status <> 'approved'`.execute(this.db);
    await this.audit.log('Cancel HR payroll run', `Payroll run #${id} cancelled by ${auth.username}`, auth);
    return this.getPayrollRun(id, auth);
  }

  async updatePayrollRunItem(id: number, payload: UpsertPayrollItemDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const item = await this.getPayrollItemRun(this.db, id);
    if (item.runStatus !== 'draft') throw new AppError('Payroll items can only be edited while the run is draft', 'HR_PAYROLL_ITEM_EDIT_LOCKED', 400);
    const status = clean(payload.status);
    if (status && !['draft', 'excluded'].includes(status)) throw new AppError('Payroll item status is invalid', 'HR_PAYROLL_ITEM_STATUS_INVALID', 400);
    await sql`
      UPDATE hr_payroll_run_items
      SET status = ${status || item.itemStatus || 'draft'}, notes = ${clean(payload.notes)}, updated_at = NOW()
      WHERE id = ${id}
    `.execute(this.db);
    await this.audit.log('Update HR payroll item', `Payroll item #${id} updated by ${auth.username}`, auth);
    return this.getPayrollRun(item.runId, auth);
  }

  async createPayrollAdjustment(id: number, payload: CreatePayrollAdjustmentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const item = await this.getPayrollItemRun(this.db, id);
    if (item.runStatus !== 'draft') throw new AppError('Payroll adjustments can only be edited while the run is draft', 'HR_PAYROLL_ADJUSTMENT_LOCKED', 400);
    await this.tx.runInTransaction(this.db, async (trx) => {
      await sql`
        INSERT INTO hr_payroll_item_adjustments (payroll_item_id, adjustment_type, label, amount, notes)
        VALUES (${id}, ${clean(payload.adjustmentType)}, ${clean(payload.label)}, ${money(payload.amount)}, ${clean(payload.notes)})
      `.execute(trx);
      await this.recalculatePayrollItemTotals(trx, id);
      await sql`UPDATE hr_payroll_runs SET updated_at = NOW() WHERE id = ${item.runId}`.execute(trx);
    });
    await this.audit.log('Create HR payroll adjustment', `Payroll item #${id} adjustment added by ${auth.username}`, auth);
    return this.getPayrollRun(item.runId, auth);
  }

  async deletePayrollAdjustment(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    let runId = 0;
    let itemId = 0;
    await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await sql<{ payroll_item_id: number; run_id: number; run_status: string }>`
        SELECT a.payroll_item_id, i.run_id, r.status AS run_status
        FROM hr_payroll_item_adjustments a
        JOIN hr_payroll_run_items i ON i.id = a.payroll_item_id
        JOIN hr_payroll_runs r ON r.id = i.run_id
        WHERE a.id = ${id}
        LIMIT 1
      `.execute(trx);
      const row = result.rows[0];
      if (!row) throw new AppError('Payroll adjustment not found', 'HR_PAYROLL_ADJUSTMENT_NOT_FOUND', 404);
      if (clean(row.run_status) !== 'draft') throw new AppError('Payroll adjustments can only be edited while the run is draft', 'HR_PAYROLL_ADJUSTMENT_LOCKED', 400);
      runId = Number(row.run_id || 0);
      itemId = Number(row.payroll_item_id || 0);
      await sql`DELETE FROM hr_payroll_item_adjustments WHERE id = ${id}`.execute(trx);
      await this.recalculatePayrollItemTotals(trx, itemId);
      await sql`UPDATE hr_payroll_runs SET updated_at = NOW() WHERE id = ${runId}`.execute(trx);
    });
    await this.audit.log('Delete HR payroll adjustment', `Payroll adjustment #${id} deleted by ${auth.username}`, auth);
    return this.getPayrollRun(runId, auth);
  }

  async listAttendance(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const workDate = normalizeDateOnly(query.date) || normalizeDateOnly(query.workDate) || todayUtcDate();
    if (!workDate) throw new AppError('Attendance date is required', 'HR_ATTENDANCE_DATE_REQUIRED', 400);
    const search = clean(query.search).toLowerCase();

    const result = await sql<Record<string, unknown>>`
      SELECT
        e.id AS employee_id,
        e.employee_no,
        e.display_name AS employee_name,
        d.name AS department_name,
        j.name AS job_title_name,
        a.id AS attendance_id,
        to_char(a.work_date, 'YYYY-MM-DD') AS work_date_text,
        a.status,
        to_char(a.check_in_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS check_in_at_text,
        to_char(a.check_out_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS check_out_at_text,
        a.source,
        a.notes
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_job_titles j ON j.id = e.job_title_id
      LEFT JOIN hr_attendance_records a ON a.employee_id = e.id AND a.work_date = ${workDate}::date
      WHERE e.status IN ('active', 'inactive')
      ORDER BY e.display_name ASC, e.id ASC
    `.execute(this.db);

    let rows = result.rows.map((row) => {
      const status = normalizeAttendanceStatus(row.status);
      return {
        id: row.attendance_id ? String(row.attendance_id) : '',
        employeeId: String(row.employee_id),
        employeeNo: clean(row.employee_no),
        employeeName: clean(row.employee_name),
        departmentName: clean(row.department_name),
        jobTitleName: clean(row.job_title_name),
        workDate,
        status: status === 'unmarked' ? '' : status,
        checkInAt: clean(row.check_in_at_text),
        checkOutAt: clean(row.check_out_at_text),
        source: normalizeAttendanceSource(row.source),
        notes: clean(row.notes),
      };
    });

    if (search) {
      rows = rows.filter((row) => [row.employeeNo, row.employeeName, row.departmentName, row.jobTitleName].some((value) => value.toLowerCase().includes(search)));
    }

    const summary = rows.reduce(
      (acc, row) => {
        const status = normalizeAttendanceStatus(row.status);
        acc.totalItems += 1;
        if (status === 'present') acc.presentCount += 1;
        else if (status === 'absent') acc.absentCount += 1;
        else if (status === 'late') acc.lateCount += 1;
        else if (status === 'leave') acc.leaveCount += 1;
        else if (status === 'unmarked') acc.unmarkedCount += 1;
        return acc;
      },
      { totalItems: 0, presentCount: 0, absentCount: 0, lateCount: 0, leaveCount: 0, unmarkedCount: 0 },
    );

    const paged = paginateRows(rows, query, { defaultSize: 50 });
    return { rows: paged.rows, pagination: paged.pagination, summary };
  }

  async bulkSaveAttendance(payload: BulkSaveAttendanceDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const workDate = normalizeDateOnly(payload.workDate);
    if (!workDate) throw new AppError('Attendance date is required', 'HR_ATTENDANCE_DATE_REQUIRED', 400);
    if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
      throw new AppError('Attendance rows are required', 'HR_ATTENDANCE_ROWS_REQUIRED', 400);
    }

    await this.tx.runInTransaction(this.db, async (trx) => {
      for (const row of payload.rows) {
        const employeeId = toId(row.employeeId);
        if (!employeeId) throw new AppError('Employee is required', 'HR_ATTENDANCE_EMPLOYEE_REQUIRED', 400);
        const status = normalizeAttendanceStatus(row.status);
        if (status === 'unmarked') throw new AppError('Attendance status is invalid', 'HR_ATTENDANCE_STATUS_INVALID', 400);
        const checkInAt = row.checkInAt ? new Date(row.checkInAt) : null;
        const checkOutAt = row.checkOutAt ? new Date(row.checkOutAt) : null;
        if ((checkInAt && Number.isNaN(checkInAt.getTime())) || (checkOutAt && Number.isNaN(checkOutAt.getTime()))) {
          throw new AppError('Attendance check-in/out time is invalid', 'HR_ATTENDANCE_TIME_INVALID', 400);
        }
        await sql`
          INSERT INTO hr_attendance_records (employee_id, work_date, status, check_in_at, check_out_at, source, notes, created_by, updated_by, created_at, updated_at)
          VALUES (
            ${employeeId},
            ${workDate}::date,
            ${status},
            ${checkInAt ? checkInAt.toISOString() : null},
            ${checkOutAt ? checkOutAt.toISOString() : null},
            ${normalizeAttendanceSource(row.source)},
            ${clean(row.notes) || null},
            ${auth.userId},
            ${auth.userId},
            NOW(),
            NOW()
          )
          ON CONFLICT (employee_id, work_date) DO UPDATE
          SET
            status = EXCLUDED.status,
            check_in_at = EXCLUDED.check_in_at,
            check_out_at = EXCLUDED.check_out_at,
            source = EXCLUDED.source,
            notes = EXCLUDED.notes,
            updated_by = ${auth.userId},
            updated_at = NOW()
        `.execute(trx);
      }
    });

    await this.audit.log('Save HR attendance day', `Attendance saved for ${workDate} by ${auth.username}`, auth);
    return this.listAttendance({ date: workDate }, auth);
  }

  async upsertAttendanceRecord(payload: UpsertAttendanceRecordDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const workDate = normalizeDateOnly(payload.workDate);
    if (!workDate) throw new AppError('Attendance date is required', 'HR_ATTENDANCE_DATE_REQUIRED', 400);
    const employeeId = toId(payload.employeeId);
    if (!employeeId) throw new AppError('Employee is required', 'HR_ATTENDANCE_EMPLOYEE_REQUIRED', 400);
    const status = normalizeAttendanceStatus(payload.status);
    if (status === 'unmarked') throw new AppError('Attendance status is invalid', 'HR_ATTENDANCE_STATUS_INVALID', 400);
    const checkInAt = payload.checkInAt ? new Date(payload.checkInAt) : null;
    const checkOutAt = payload.checkOutAt ? new Date(payload.checkOutAt) : null;
    if ((checkInAt && Number.isNaN(checkInAt.getTime())) || (checkOutAt && Number.isNaN(checkOutAt.getTime()))) {
      throw new AppError('Attendance check-in/out time is invalid', 'HR_ATTENDANCE_TIME_INVALID', 400);
    }

    await sql`
      INSERT INTO hr_attendance_records (employee_id, work_date, status, check_in_at, check_out_at, source, notes, created_by, updated_by, created_at, updated_at)
      VALUES (
        ${employeeId},
        ${workDate}::date,
        ${status},
        ${checkInAt ? checkInAt.toISOString() : null},
        ${checkOutAt ? checkOutAt.toISOString() : null},
        ${normalizeAttendanceSource(payload.source)},
        ${clean(payload.notes) || null},
        ${auth.userId},
        ${auth.userId},
        NOW(),
        NOW()
      )
      ON CONFLICT (employee_id, work_date) DO UPDATE
      SET
        status = EXCLUDED.status,
        check_in_at = EXCLUDED.check_in_at,
        check_out_at = EXCLUDED.check_out_at,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        updated_by = ${auth.userId},
        updated_at = NOW()
    `.execute(this.db);

    await this.audit.log('Upsert HR attendance record', `Attendance record saved for employee #${employeeId} on ${workDate} by ${auth.username}`, auth);
    return this.listAttendance({ date: workDate }, auth);
  }

  async listLeaveTypes(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const result = await sql<Record<string, unknown>>`
      SELECT *
      FROM hr_leave_types
      ORDER BY is_active DESC, name ASC, id ASC
    `.execute(this.db);
    const search = clean(query.search).toLowerCase();
    let rows = result.rows.map((row) => ({
      id: String(row.id),
      name: clean(row.name),
      code: clean(row.code),
      description: clean(row.description),
      isPaid: row.is_paid !== false,
      isActive: row.is_active !== false,
    }));
    if (search) {
      rows = rows.filter((row) => [row.name, row.code, row.description].some((value) => value.toLowerCase().includes(search)));
    }
    const paged = paginateRows(rows, query, { defaultSize: 50 });
    return {
      rows: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        activeCount: rows.filter((row) => row.isActive).length,
      },
    };
  }

  async upsertLeaveType(id: number | null, payload: UpsertLeaveTypeDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const name = clean(payload.name);
    if (!name) throw new AppError('Leave type name is required', 'HR_LEAVE_TYPE_NAME_REQUIRED', 400);
    const code = clean(payload.code).toLowerCase();
    const description = clean(payload.description);
    const isPaid = payload.isPaid !== false;
    const isActive = payload.isActive !== false;
    if (id) {
      await sql`
        UPDATE hr_leave_types
        SET name = ${name}, code = ${code || null}, description = ${description || null}, is_paid = ${isPaid}, is_active = ${isActive}, updated_by = ${auth.userId}, updated_at = NOW()
        WHERE id = ${id}
      `.execute(this.db);
    } else {
      await sql`
        INSERT INTO hr_leave_types (name, code, description, is_paid, is_active, created_by, updated_by, created_at, updated_at)
        VALUES (${name}, ${code || null}, ${description || null}, ${isPaid}, ${isActive}, ${auth.userId}, ${auth.userId}, NOW(), NOW())
      `.execute(this.db);
    }
    await this.audit.log(`${id ? 'Update' : 'Create'} HR leave type`, `Leave type ${name} saved by ${auth.username}`, auth);
    return this.listLeaveTypes({}, auth);
  }

  async listLeaveRequests(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const search = clean(query.search).toLowerCase();
    const status = clean(query.status).toLowerCase();
    const employeeId = toId(query.employeeId);
    const from = normalizeDateOnly(query.from);
    const to = normalizeDateOnly(query.to);
    const result = await sql<Record<string, unknown>>`
      SELECT
        r.*,
        e.employee_no,
        e.display_name AS employee_name,
        d.name AS department_name,
        j.name AS job_title_name,
        t.name AS leave_type_name,
        to_char(r.start_date, 'YYYY-MM-DD') AS start_date_text,
        to_char(r.end_date, 'YYYY-MM-DD') AS end_date_text,
        to_char(r.decided_at, 'YYYY-MM-DD HH24:MI') AS decided_at_text,
        to_char(r.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text
      FROM hr_leave_requests r
      JOIN hr_employees e ON e.id = r.employee_id
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_job_titles j ON j.id = e.job_title_id
      LEFT JOIN hr_leave_types t ON t.id = r.leave_type_id
      ORDER BY r.created_at DESC, r.id DESC
    `.execute(this.db);

    let rows = result.rows.map((row) => ({
      id: String(row.id),
      employeeId: String(row.employee_id),
      employeeNo: clean(row.employee_no),
      employeeName: clean(row.employee_name),
      departmentName: clean(row.department_name),
      jobTitleName: clean(row.job_title_name),
      leaveTypeId: row.leave_type_id ? String(row.leave_type_id) : '',
      leaveTypeName: clean(row.leave_type_name),
      leaveType: clean(row.leave_type),
      startDate: clean(row.start_date_text),
      endDate: clean(row.end_date_text),
      daysCount: Number(row.days_count || 0),
      status: clean(row.status),
      reason: clean(row.reason),
      notes: clean(row.notes),
      decisionNotes: clean(row.decision_notes),
      decidedBy: row.decided_by ? String(row.decided_by) : '',
      decidedAt: clean(row.decided_at_text),
      createdAt: clean(row.created_at_text),
    }));

    if (employeeId) rows = rows.filter((row) => row.employeeId === String(employeeId));
    if (status) rows = rows.filter((row) => row.status === status);
    if (from) rows = rows.filter((row) => row.endDate >= from);
    if (to) rows = rows.filter((row) => row.startDate <= to);
    if (search) {
      rows = rows.filter((row) => [row.employeeNo, row.employeeName, row.departmentName, row.jobTitleName, row.leaveTypeName, row.leaveType].some((value) => value.toLowerCase().includes(search)));
    }

    const summary = rows.reduce((acc, row) => {
      acc.totalItems += 1;
      if (row.status === 'pending') acc.pendingCount += 1;
      if (row.status === 'approved') acc.approvedCount += 1;
      if (row.status === 'rejected') acc.rejectedCount += 1;
      if (row.status === 'cancelled') acc.cancelledCount += 1;
      return acc;
    }, { totalItems: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0, cancelledCount: 0 });

    const paged = paginateRows(rows, query, { defaultSize: 25 });
    return { requests: paged.rows, pagination: paged.pagination, summary };
  }

  async createLeaveRequest(payload: CreateLeaveRequestDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const employeeId = toId(payload.employeeId);
    if (!employeeId) throw new AppError('Employee is required', 'HR_LEAVE_EMPLOYEE_REQUIRED', 400);
    const startDate = normalizeDateOnly(payload.startDate);
    if (!startDate) throw new AppError('Leave start date is required', 'HR_LEAVE_START_DATE_REQUIRED', 400);
    const endDate = normalizeDateOnly(payload.endDate);
    if (!endDate) throw new AppError('Leave end date is required', 'HR_LEAVE_END_DATE_REQUIRED', 400);
    if (endDate < startDate) throw new AppError('Leave end date must be after start date', 'HR_LEAVE_DATE_RANGE_INVALID', 400);
    const leaveTypeId = toId(payload.leaveTypeId);
    const leaveType = clean(payload.leaveType);
    const computedDays = inclusiveDaysBetween(startDate, endDate);
    const daysCount = Number(payload.daysCount || computedDays);
    if (!Number.isFinite(daysCount) || daysCount <= 0) throw new AppError('Leave days count is invalid', 'HR_LEAVE_DAYS_COUNT_INVALID', 400);

    await sql`
      INSERT INTO hr_leave_requests (employee_id, leave_type_id, leave_type, start_date, end_date, days_count, status, reason, notes, created_by, updated_by, created_at, updated_at)
      VALUES (${employeeId}, ${leaveTypeId}, ${leaveType || null}, ${startDate}::date, ${endDate}::date, ${Number(daysCount.toFixed(2))}, 'pending', ${clean(payload.reason) || null}, ${clean(payload.notes) || null}, ${auth.userId}, ${auth.userId}, NOW(), NOW())
    `.execute(this.db);

    await this.audit.log('Create HR leave request', `Leave request created for employee #${employeeId} by ${auth.username}`, auth);
    return this.listLeaveRequests({}, auth);
  }

  async approveLeaveRequest(id: number, payload: DecideLeaveRequestDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const current = await sql<{ status: string }>`SELECT status FROM hr_leave_requests WHERE id = ${id} LIMIT 1`.execute(this.db);
    const status = clean(current.rows[0]?.status);
    if (!status) throw new AppError('Leave request not found', 'HR_LEAVE_REQUEST_NOT_FOUND', 404);
    if (['cancelled', 'rejected'].includes(status)) throw new AppError('Cannot approve this leave request', 'HR_LEAVE_APPROVE_LOCKED', 400);
    await sql`
      UPDATE hr_leave_requests
      SET status = 'approved',
          decision_notes = ${clean(payload.decisionNotes) || null},
          notes = ${clean(payload.notes) || null},
          decided_by = ${auth.userId},
          decided_at = NOW(),
          updated_by = ${auth.userId},
          updated_at = NOW()
      WHERE id = ${id}
    `.execute(this.db);
    await this.audit.log('Approve HR leave request', `Leave request #${id} approved by ${auth.username}`, auth);
    return this.listLeaveRequests({}, auth);
  }

  async rejectLeaveRequest(id: number, payload: DecideLeaveRequestDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const current = await sql<{ status: string }>`SELECT status FROM hr_leave_requests WHERE id = ${id} LIMIT 1`.execute(this.db);
    const status = clean(current.rows[0]?.status);
    if (!status) throw new AppError('Leave request not found', 'HR_LEAVE_REQUEST_NOT_FOUND', 404);
    if (['cancelled', 'approved'].includes(status)) throw new AppError('Cannot reject this leave request', 'HR_LEAVE_REJECT_LOCKED', 400);
    await sql`
      UPDATE hr_leave_requests
      SET status = 'rejected',
          decision_notes = ${clean(payload.decisionNotes) || null},
          notes = ${clean(payload.notes) || null},
          decided_by = ${auth.userId},
          decided_at = NOW(),
          updated_by = ${auth.userId},
          updated_at = NOW()
      WHERE id = ${id}
    `.execute(this.db);
    await this.audit.log('Reject HR leave request', `Leave request #${id} rejected by ${auth.username}`, auth);
    return this.listLeaveRequests({}, auth);
  }

  async cancelLeaveRequest(id: number, payload: DecideLeaveRequestDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const current = await sql<{ status: string }>`SELECT status FROM hr_leave_requests WHERE id = ${id} LIMIT 1`.execute(this.db);
    const status = clean(current.rows[0]?.status);
    if (!status) throw new AppError('Leave request not found', 'HR_LEAVE_REQUEST_NOT_FOUND', 404);
    if (status === 'cancelled') return this.listLeaveRequests({}, auth);
    await sql`
      UPDATE hr_leave_requests
      SET status = 'cancelled',
          decision_notes = ${clean(payload.decisionNotes) || null},
          notes = ${clean(payload.notes) || null},
          decided_by = ${auth.userId},
          decided_at = NOW(),
          updated_by = ${auth.userId},
          updated_at = NOW()
      WHERE id = ${id}
    `.execute(this.db);
    await this.audit.log('Cancel HR leave request', `Leave request #${id} cancelled by ${auth.username}`, auth);
    return this.listLeaveRequests({}, auth);
  }

  async listEmployeeAssets(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const search = clean(query.search).toLowerCase();
    const employeeId = toId(query.employeeId);
    const status = clean(query.status).toLowerCase();
    const result = await sql<Record<string, unknown>>`
      SELECT
        a.*,
        e.employee_no,
        e.display_name AS employee_name,
        d.name AS department_name,
        j.name AS job_title_name,
        to_char(a.assigned_at, 'YYYY-MM-DD') AS assigned_at_text,
        to_char(a.returned_at, 'YYYY-MM-DD') AS returned_at_text,
        to_char(a.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text
      FROM hr_employee_assets a
      JOIN hr_employees e ON e.id = a.employee_id
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_job_titles j ON j.id = e.job_title_id
      ORDER BY a.created_at DESC, a.id DESC
    `.execute(this.db);

    let rows = result.rows.map((row) => ({
      id: String(row.id),
      employeeId: String(row.employee_id),
      employeeNo: clean(row.employee_no),
      employeeName: clean(row.employee_name),
      departmentName: clean(row.department_name),
      jobTitleName: clean(row.job_title_name),
      assetType: clean(row.asset_type),
      assetName: clean(row.asset_name),
      assetCode: clean(row.asset_code),
      serialNo: clean(row.serial_no),
      assignedAt: clean(row.assigned_at_text),
      returnedAt: clean(row.returned_at_text),
      status: clean(row.status),
      notes: clean(row.notes),
      returnNotes: clean(row.return_notes),
      createdAt: clean(row.created_at_text),
    }));

    if (employeeId) rows = rows.filter((row) => row.employeeId === String(employeeId));
    if (status) rows = rows.filter((row) => row.status === status);
    if (search) {
      rows = rows.filter((row) => [row.employeeNo, row.employeeName, row.departmentName, row.jobTitleName, row.assetType, row.assetName, row.assetCode, row.serialNo].some((value) => value.toLowerCase().includes(search)));
    }

    const summary = rows.reduce((acc, row) => {
      acc.totalItems += 1;
      if (row.status === 'assigned') acc.assignedCount += 1;
      if (row.status === 'returned') acc.returnedCount += 1;
      if (row.status === 'lost') acc.lostCount += 1;
      if (row.status === 'damaged') acc.damagedCount += 1;
      return acc;
    }, { totalItems: 0, assignedCount: 0, returnedCount: 0, lostCount: 0, damagedCount: 0 });

    const paged = paginateRows(rows, query, { defaultSize: 25 });
    return { assets: paged.rows, pagination: paged.pagination, summary };
  }

  async upsertEmployeeAsset(id: number | null, payload: UpsertEmployeeAssetDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const employeeId = toId(payload.employeeId);
    if (!employeeId) throw new AppError('Employee is required', 'HR_ASSET_EMPLOYEE_REQUIRED', 400);
    const assetType = clean(payload.assetType);
    if (!assetType) throw new AppError('Asset type is required', 'HR_ASSET_TYPE_REQUIRED', 400);
    const assetName = clean(payload.assetName);
    if (!assetName) throw new AppError('Asset name is required', 'HR_ASSET_NAME_REQUIRED', 400);
    const assignedAt = normalizeDateOnly(payload.assignedAt) || todayUtcDate();

    if (id) {
      await sql`
        UPDATE hr_employee_assets
        SET employee_id = ${employeeId},
            asset_type = ${assetType},
            asset_name = ${assetName},
            asset_code = ${clean(payload.assetCode) || null},
            serial_no = ${clean(payload.serialNo) || null},
            assigned_at = ${assignedAt}::date,
            notes = ${clean(payload.notes) || null},
            updated_by = ${auth.userId},
            updated_at = NOW()
        WHERE id = ${id}
      `.execute(this.db);
    } else {
      await sql`
        INSERT INTO hr_employee_assets (employee_id, asset_type, asset_name, asset_code, serial_no, assigned_at, status, notes, created_by, updated_by, created_at, updated_at)
        VALUES (${employeeId}, ${assetType}, ${assetName}, ${clean(payload.assetCode) || null}, ${clean(payload.serialNo) || null}, ${assignedAt}::date, 'assigned', ${clean(payload.notes) || null}, ${auth.userId}, ${auth.userId}, NOW(), NOW())
      `.execute(this.db);
    }

    await this.audit.log(`${id ? 'Update' : 'Create'} HR employee asset`, `Asset custody ${id ? 'updated' : 'created'} by ${auth.username}`, auth);
    return this.listEmployeeAssets({}, auth);
  }

  private async setEmployeeAssetStatus(id: number, status: 'returned' | 'lost' | 'damaged' | 'cancelled', payload: EmployeeAssetActionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const current = await sql<{ status: string }>`SELECT status FROM hr_employee_assets WHERE id = ${id} LIMIT 1`.execute(this.db);
    if (!clean(current.rows[0]?.status)) throw new AppError('Employee asset not found', 'HR_ASSET_NOT_FOUND', 404);
    const returnedAt = status === 'returned' ? (normalizeDateOnly(payload.returnedAt) || todayUtcDate()) : null;
    await sql`
      UPDATE hr_employee_assets
      SET status = ${status},
          returned_at = CASE WHEN ${returnedAt}::text IS NULL THEN returned_at ELSE ${returnedAt}::date END,
          notes = ${clean(payload.notes) || null},
          return_notes = ${clean(payload.returnNotes) || null},
          updated_by = ${auth.userId},
          updated_at = NOW()
      WHERE id = ${id}
    `.execute(this.db);
    await this.audit.log(`Mark HR employee asset ${status}`, `Asset #${id} marked as ${status} by ${auth.username}`, auth);
    return this.listEmployeeAssets({}, auth);
  }

  async returnEmployeeAsset(id: number, payload: EmployeeAssetActionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.setEmployeeAssetStatus(id, 'returned', payload, auth);
  }

  async markEmployeeAssetLost(id: number, payload: EmployeeAssetActionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.setEmployeeAssetStatus(id, 'lost', payload, auth);
  }

  async markEmployeeAssetDamaged(id: number, payload: EmployeeAssetActionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.setEmployeeAssetStatus(id, 'damaged', payload, auth);
  }

  async cancelEmployeeAsset(id: number, payload: EmployeeAssetActionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.setEmployeeAssetStatus(id, 'cancelled', payload, auth);
  }

  async withdrawals(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const employeeId = toId(query.employeeId);
    if (!employeeId) throw new AppError('Employee is required', 'HR_WITHDRAWALS_EMPLOYEE_REQUIRED', 400);

    const period = clean(query.period) || 'current_month';
    const requestedMonth = clean(query.month);
    const customFrom = normalizeDateOnly(query.from);
    const customTo = normalizeDateOnly(query.to);

    const employeeResult = await sql<{ hire_date_text: string | null; display_name: string }>`
      SELECT to_char(hire_date, 'YYYY-MM-DD') AS hire_date_text, display_name
      FROM hr_employees
      WHERE id = ${employeeId}
      LIMIT 1
    `.execute(this.db);
    const employee = employeeResult.rows[0];
    if (!employee) throw new AppError('Employee not found', 'HR_EMPLOYEE_NOT_FOUND', 404);

    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthValue = /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : currentMonth;
    const [yearValue, monthValueNumber] = monthValue.split('-').map(Number);
    const monthFrom = `${monthValue}-01`;
    const monthTo = new Date(Date.UTC(yearValue, monthValueNumber, 0)).toISOString().slice(0, 10);

    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    const hireDate = clean(employee.hire_date_text) || '1900-01-01';
    const fromDate = period === 'custom'
      ? customFrom || monthFrom
      : period === 'since_hire'
        ? hireDate
        : period === 'all'
          ? ''
          : monthFrom;
    const toDate = period === 'custom'
      ? customTo || monthTo
      : period === 'since_hire'
        ? today
        : period === 'all'
          ? ''
          : monthTo;

    const loanResult = await sql<Record<string, unknown>>`
      SELECT
        l.*,
        e.display_name AS employee_name,
        latest_paid.latest_paid_at,
        to_char(l.issue_date, 'YYYY-MM-DD') AS issue_date_text,
        to_char(l.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_text,
        to_char(l.disbursed_at, 'YYYY-MM-DD HH24:MI') AS disbursed_at_text,
        to_char(latest_paid.latest_paid_at, 'YYYY-MM-DD HH24:MI') AS paid_at_text
      FROM hr_employee_loans l
      JOIN hr_employees e ON e.id = l.employee_id
      LEFT JOIN (
        SELECT loan_id, MAX(paid_at) AS latest_paid_at
        FROM hr_employee_loan_installments
        WHERE paid_at IS NOT NULL
        GROUP BY loan_id
      ) latest_paid ON latest_paid.loan_id = l.id
      WHERE l.employee_id = ${employeeId}
      ORDER BY l.id DESC
    `.execute(this.db);

    const ledgerResult = await sql<Record<string, unknown>>`
      SELECT
        le.*,
        e.display_name AS employee_name,
        to_char(le.created_at, 'YYYY-MM-DD HH24:MI') AS movement_at_text
      FROM hr_employee_ledger le
      JOIN hr_employees e ON e.id = le.employee_id
      WHERE le.employee_id = ${employeeId}
        AND le.entry_type = 'loan_repayment'
      ORDER BY le.id DESC
    `.execute(this.db);

    const movementDateForLoan = (row: Record<string, unknown>): string => {
      const status = clean(row.status);
      const issueDate = clean(row.issue_date_text) || (row.issue_date ? String(row.issue_date).slice(0, 10) : '');
      const issueDateTime = issueDate ? `${issueDate} 00:00` : '';
      const createdAt = clean(row.created_at_text) || (row.created_at ? String(row.created_at).replace('T', ' ').slice(0, 16) : '');
      const disbursedAt = clean(row.disbursed_at_text) || (row.disbursed_at ? String(row.disbursed_at).replace('T', ' ').slice(0, 16) : '');
      const paidAt = clean(row.paid_at_text) || (row.paid_at ? String(row.paid_at).replace('T', ' ').slice(0, 16) : '') || (row.latest_paid_at ? String(row.latest_paid_at).replace('T', ' ').slice(0, 16) : '');

      if (['paid', 'disbursed', 'partially_repaid', 'repaid'].includes(status)) {
        return paidAt || disbursedAt || issueDateTime || createdAt;
      }

      return issueDateTime || createdAt;
    };

    const isInsideRequestedPeriod = (movementAt: string): boolean => {
      if (!movementAt) return false;
      if (!fromDate && !toDate) return true;
      const datePart = movementAt.slice(0, 10);
      if (fromDate && datePart < fromDate) return false;
      if (toDate && datePart > toDate) return false;
      return true;
    };

    const allLoanRows = loanResult.rows.map((row) => {
      const movementAt = movementDateForLoan(row);
      return {
        id: `loan-${String(row.id)}`,
        loanId: String(row.id),
        referenceId: String(row.id),
        employeeId: String(row.employee_id),
        employeeName: clean(row.employee_name),
        movementAt,
        date: movementAt,
        type: clean(row.loan_type) === 'loan' ? 'loan' : 'advance',
        amount: Number(row.principal_amount || 0),
        repaymentMode: clean(row.repayment_mode) || 'manual_cash',
        repaymentMethod: '',
        status: clean(row.status) || 'draft',
        remainingAmount: Number(row.remaining_amount || 0),
        note: clean(row.notes),
      };
    });

    const repaymentRows = ledgerResult.rows.map((row) => {
      const movementAt = clean(row.movement_at_text) || (row.created_at ? String(row.created_at).replace('T', ' ').slice(0, 16) : '');
      const repaymentMethod = clean(row.repayment_method) || 'manual_cash';
      return {
        id: `ledger-${String(row.id)}`,
        loanId: row.reference_id ? String(row.reference_id) : '',
        referenceId: row.reference_id ? String(row.reference_id) : '',
        employeeId: String(row.employee_id),
        employeeName: clean(row.employee_name),
        movementAt,
        date: movementAt,
        type: 'repayment',
        amount: Math.abs(Number(row.amount || 0)),
        repaymentMode: repaymentMethod,
        repaymentMethod,
        status: 'recorded',
        remainingAmount: Number(row.balance_after || 0),
        note: clean(row.note),
      };
    });

    const rows = [...allLoanRows, ...repaymentRows]
      .filter((row) => isInsideRequestedPeriod(row.movementAt))
      .sort((a, b) => {
        const byDate = String(b.movementAt || '').localeCompare(String(a.movementAt || ''));
        if (byDate !== 0) return byDate;
        return String(b.id).localeCompare(String(a.id));
      });

    const totalWithdrawals = Number(rows
      .filter((row) => row.type !== 'repayment')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
      .toFixed(2));
    const totalRepayments = Number(rows
      .filter((row) => row.type === 'repayment')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
      .toFixed(2));
    const totalManualCashRepayments = Number(rows
      .filter((row) => row.type === 'repayment' && row.repaymentMethod === 'manual_cash')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
      .toFixed(2));
    const totalSalaryDeductionRepayments = Number(rows
      .filter((row) => row.type === 'repayment' && row.repaymentMethod === 'salary_deduction')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
      .toFixed(2));
    const totalRemaining = Number(allLoanRows
      .reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0)
      .toFixed(2));
    const totalSalaryDeductionDue = Number(allLoanRows
      .filter((row) => row.repaymentMode !== 'manual_cash')
      .reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0)
      .toFixed(2));
    const openLoanCount = allLoanRows.filter((row) => ['paid', 'disbursed', 'partially_repaid'].includes(String(row.status || '')) && Number(row.remainingAmount || 0) > 0).length;

    const paged = paginateRows(rows, query, { defaultSize: 50 });

    return {
      rows: paged.rows,
      pagination: paged.pagination,
      summary: {
        employeeId: String(employeeId),
        employeeName: clean(employee.display_name),
        from: fromDate || '',
        to: toDate || '',
        totalWithdrawals,
        withdrawalsAmount: totalWithdrawals,
        withdrawnAmount: totalWithdrawals,
        totalRepayments,
        repaymentsAmount: totalRepayments,
        repaidAmount: totalRepayments,
        totalManualCashRepayments,
        manualCashRepaymentsTotal: totalManualCashRepayments,
        totalSalaryDeductionRepayments,
        salaryDeductionRepaymentsTotal: totalSalaryDeductionRepayments,
        totalSalaryDeductionDue,
        totalRemaining,
        remainingAmount: totalRemaining,
        outstandingAmount: totalRemaining,
        openLoanCount,
        openLoans: openLoanCount,
      },
    };
  }

  async summary(auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const result = await sql<{ employee_count: string; active_count: string; open_loans: string; outstanding_amount: string }>`
      SELECT
        (SELECT COUNT(*) FROM hr_employees) AS employee_count,
        (SELECT COUNT(*) FROM hr_employees WHERE status = 'active') AS active_count,
        (SELECT COUNT(*) FROM hr_employee_loans WHERE status IN ('paid','partially_repaid')) AS open_loans,
        (SELECT COALESCE(SUM(remaining_amount), 0) FROM hr_employee_loans WHERE status IN ('paid','partially_repaid')) AS outstanding_amount
    `.execute(this.db);
    const row = result.rows[0];
    const canSeeLoans = hasHrPermission(auth, 'hrLoans');
    return {
      summary: {
        employeeCount: Number(row?.employee_count || 0),
        activeCount: Number(row?.active_count || 0),
        openLoans: canSeeLoans ? Number(row?.open_loans || 0) : 0,
        outstandingAmount: canSeeLoans ? Number(row?.outstanding_amount || 0) : 0,
      },
    };
  }
}
