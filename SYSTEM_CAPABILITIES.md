# ZS ERP Capabilities — HR snapshot (24 October 2026)

This checkpoint summarizes verified code paths, NOT completed compliance or release testing.

| Area | Code capability | Release caveat |
|---|---|---|
| Employees, contracts, documents | Exists | Integration validation pending |
| Recruitment ATS | Candidate pipeline and atomic employee + active salary contract | QA pending |
| Attendance | Daily attendance, imports, mobile punch and exception decisions | Shift/overnight QA pending |
| Leave | Types, requests, approvals, basic balances | Annual accrual and rollover missing |
| Loans | Disbursement, payroll deduction and financial ledger | Reconciliation QA pending |
| Payroll | Weekly/monthly/etc, deduction engine, approvals and accounting postings | Tax and insurance compliance not validated |
| Bank transfer export | Approved payroll review CSV, no placeholder identities | Certified WPS/SIF disabled |
| End-of-service | Manual unpaid-wage reconciliation, capped loan offsets, posting and termination | Automated Egyptian statutory calculation blocked |

Target countries: Egypt, Saudi Arabia, Kuwait, Qatar, Oman. Per-country statutory calculation rules and certified bank exports remain priority release blockers.
See ARCHITECTURE_INVARIANTS.md HR stabilization checkpoint.
