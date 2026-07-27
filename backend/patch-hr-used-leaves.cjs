const fs = require('fs');
let c = fs.readFileSync('c:/zn/backend/src/modules/hr/hr.service.ts', 'utf8');

const getEmployeeSql = `SELECT e.*, d.name AS department_name, j.name AS job_title_name, p.name AS position_name, b.name AS branch_name, l.name AS location_name, u.username AS username
      , to_char(e.hire_date, 'YYYY-MM-DD') AS hire_date_text`;

const replacementSql = `SELECT e.*, d.name AS department_name, j.name AS job_title_name, p.name AS position_name, b.name AS branch_name, l.name AS location_name, u.username AS username
      , to_char(e.hire_date, 'YYYY-MM-DD') AS hire_date_text,
      (SELECT COALESCE(SUM(lr.duration_days), 0) FROM hr_leave_requests lr 
       JOIN hr_leave_types lt ON lr.type_id = lt.id 
       WHERE lr.employee_id = e.id AND lr.status = 'approved' 
         AND lt.deducts_from_balance = true 
         AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)) AS used_annual_leaves`;

c = c.replaceAll(getEmployeeSql, replacementSql);

const usedLeavesExtract = `      annualLeaveBalance: row.annual_leave_balance == null ? 21 : Number(row.annual_leave_balance),`;
const replacementExtract = `      annualLeaveBalance: row.annual_leave_balance == null ? 21 : Number(row.annual_leave_balance),
      usedAnnualLeaves: row.used_annual_leaves == null ? 0 : Number(row.used_annual_leaves),`;

c = c.replaceAll(usedLeavesExtract, replacementExtract);

fs.writeFileSync('c:/zn/backend/src/modules/hr/hr.service.ts', c);
