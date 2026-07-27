const fs = require('fs');
let c = fs.readFileSync('c:/zn/backend/src/modules/hr/hr.service.ts', 'utf8');

const endOfServicePreviewCode = `
  async getEndOfServicePreview(id: number, dateStr: string | undefined, auth: AuthContext): Promise<Record<string, unknown>> {
    requireTenantScope(auth);
    const employeeRes = await this.getEmployee(id, auth);
    const e = employeeRes.employee as any;
    if (!e || e.status === 'terminated') {
      throw new AppError('Employee not found or already terminated', 'HR_EMPLOYEE_INVALID', 400);
    }
    
    // Calculate dates
    const hireDate = new Date(e.hireDate || new Date());
    const endDate = dateStr ? new Date(dateStr) : new Date();
    
    const diffTime = Math.max(0, endDate.getTime() - hireDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const yearsWorked = diffDays / 365.25;

    // Get Base Salary from latest contract
    const contractsResult = await sql<Record<string, unknown>>\`
      SELECT base_salary FROM hr_employment_contracts 
      WHERE employee_id = \${id} AND tenant_id = \${auth.tenantId} 
      ORDER BY id DESC LIMIT 1
    \`.execute(this.db);
    
    let baseSalary = 0;
    if (e.compensationType === 'hourly') {
      baseSalary = Number(e.hourlyRate || 0) * Number(e.expectedDailyHours || 8) * 30;
    } else {
      baseSalary = contractsResult.rows[0] ? Number(contractsResult.rows[0].base_salary) : 0;
    }

    const dailyRate = baseSalary / 30;

    // 1. Severance Pay Calculation (Egyptian Law roughly: 0.5 month for first 5 years, 1 month after)
    let severancePay = 0;
    if (yearsWorked <= 5) {
      severancePay = yearsWorked * 15 * dailyRate;
    } else {
      severancePay = (5 * 15 * dailyRate) + ((yearsWorked - 5) * 30 * dailyRate);
    }

    // 2. Unused Leave Encashment
    const balance = Number(e.annualLeaveBalance || 21);
    const used = Number(e.usedAnnualLeaves || 0);
    
    // Prorate balance based on months worked this year (assuming starting Jan 1st for simplicity in this MVP)
    const currentMonth = endDate.getMonth() + 1;
    const proratedBalance = (balance / 12) * currentMonth;
    const remainingLeaves = Math.max(0, proratedBalance - used);
    
    const leaveEncashment = remainingLeaves * dailyRate;

    // 3. Unpaid Loans Deduction
    const loansResult = await sql<Record<string, unknown>>\`
      SELECT COALESCE(SUM(remaining_amount), 0) as total_unpaid_loans 
      FROM hr_employee_loans 
      WHERE employee_id = \${id} AND tenant_id = \${auth.tenantId} AND status IN ('approved', 'disbursed')
    \`.execute(this.db);
    const unpaidLoans = Number(loansResult.rows[0]?.total_unpaid_loans || 0);

    const finalSettlementAmount = severancePay + leaveEncashment - unpaidLoans;

    return {
      preview: {
        hireDate: e.hireDate,
        endDate: endDate.toISOString().slice(0, 10),
        yearsWorked: Number(yearsWorked.toFixed(2)),
        baseSalary: Number(baseSalary.toFixed(2)),
        dailyRate: Number(dailyRate.toFixed(2)),
        severancePay: Number(severancePay.toFixed(2)),
        remainingLeaves: Number(remainingLeaves.toFixed(2)),
        leaveEncashment: Number(leaveEncashment.toFixed(2)),
        unpaidLoans: Number(unpaidLoans.toFixed(2)),
        finalSettlementAmount: Number(finalSettlementAmount.toFixed(2))
      }
    };
  }
`;

const insertIndex = c.indexOf('async endOfService(id: number');
if (insertIndex > -1) {
  c = c.substring(0, insertIndex) + endOfServicePreviewCode + '\n  ' + c.substring(insertIndex);
  fs.writeFileSync('c:/zn/backend/src/modules/hr/hr.service.ts', c);
  console.log("Added getEndOfServicePreview");
} else {
  console.log("Could not find endOfService");
}
