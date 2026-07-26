const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:5433/zs_dev' });
pool.query("SELECT id, loan_no, repayment_mode, status, principal_amount, remaining_amount, to_char(first_due_date, 'YYYY-MM-DD') as first_due, to_char(salary_due_date, 'YYYY-MM-DD') as salary_due FROM hr_employee_loans ORDER BY id DESC LIMIT 10").then(res => {
  console.table(res.rows);
  return pool.query("SELECT id, loan_id, amount, paid_amount, status, to_char(due_date, 'YYYY-MM-DD') as i_due_date FROM hr_employee_loan_installments ORDER BY id DESC LIMIT 10");
}).then(res => {
  console.table(res.rows);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
