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
  LoanRepaymentDto,
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

function canViewSalary(auth: AuthContext): boolean {
  return auth.role === 'super_admin' || auth.permissions.includes('hrSalaryView') || auth.permissions.includes('hrSalaryManage');
}

function hasHrPermission(auth: AuthContext, permission: string): boolean {
  return auth.role === 'super_admin' || auth.permissions.includes(permission);
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
    const employeeNo = clean(payload.employeeNo);
    const hireDate = normalizeDateOnly(payload.hireDate);
    if (!firstName) throw new AppError('Employee first name is required', 'HR_EMPLOYEE_NAME_REQUIRED', 400);
    if (id) {
      await sql`
        UPDATE hr_employees
        SET employee_no = COALESCE(NULLIF(${employeeNo}, ''), employee_no), user_id = ${toId(payload.userId)}, first_name = ${firstName}, last_name = ${lastName}, display_name = ${displayName},
            status = ${clean(payload.status) || 'active'}, department_id = ${toId(payload.departmentId)}, job_title_id = ${toId(payload.jobTitleId)}, position_id = ${toId(payload.positionId)},
            branch_id = ${toId(payload.branchId)}, location_id = ${toId(payload.locationId)}, hire_date = ${hireDate}, notes = ${clean(payload.notes)},
            updated_by = ${auth.userId}, updated_at = NOW()
        WHERE id = ${id}
      `.execute(this.db);
    } else {
      await this.tx.runInTransaction(this.db, async (trx) => {
        const inserted = await sql<{ id: number }>`
          INSERT INTO hr_employees (employee_no, user_id, first_name, last_name, display_name, status, department_id, job_title_id, position_id, branch_id, location_id, hire_date, notes, created_by, updated_by)
          VALUES (${employeeNo}, ${toId(payload.userId)}, ${firstName}, ${lastName}, ${displayName}, ${clean(payload.status) || 'active'}, ${toId(payload.departmentId)}, ${toId(payload.jobTitleId)}, ${toId(payload.positionId)}, ${toId(payload.branchId)}, ${toId(payload.locationId)}, ${hireDate}, ${clean(payload.notes)}, ${auth.userId}, ${auth.userId})
          RETURNING id
        `.execute(trx);
        const employeeId = Number(inserted.rows[0]?.id || 0);
        if (!employeeNo && employeeId > 0) {
          await sql`
            UPDATE hr_employees
            SET employee_no = ${`EMP-${String(employeeId).padStart(4, '0')}`}, updated_at = NOW()
            WHERE id = ${employeeId}
          `.execute(trx);
        }
      });
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
