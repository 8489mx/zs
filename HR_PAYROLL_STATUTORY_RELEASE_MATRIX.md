# HR Payroll — Legal and bank release gates (24 October 2026)

This file is an **unverified implementation checklist**. It is NOT an approved tax, social-insurance, gratuity, payroll, or bank/WPS compliance matrix. No country rates are automatically populated by this document. Each employee's citizenship, employment category, residency, applicable scheme, exemptions, period basis and official effective dates must be verified by local payroll/legal specialists. **Do not unblock unverified cases.**

## Egypt (EGP / EG)
- National Social Insurance Authority: updated salary contribution floor/ceiling effective 1 January 2026, https://www.nosi.gov.eg/ar/News/Pages/2025-11-30.aspx . This announcement alone does not specify the full insurance calculation for every employment category.
- Egyptian Tax Authority: official 2026 private/public monthly payroll forms, https://www.eta.gov.eg/ar/payroll-forms and payroll wage explanation, https://portal.eta.gov.eg/ar/node/1382 . Full annual reconciliation, exemptions and partial employment scenarios are NOT validated against those calculation forms.
- Before release: match official calculation examples and special cases with the production engine; confirm exemption logic, insured salary base and annual settlement; confirm employer filings.

## Saudi Arabia (SAR / SA)
- GOSI new coverage applicability (post-3-July-2024 entrants) differs from legacy members, https://awareness.gosi.gov.sa/businessJourney.html ; see also https://www.gosi.gov.sa/GOSIOnline/FAQ_Contributor?locale=ar_SA .
- Ministry of Human Resources WPS is filed through Mudad with compliance review, https://www.hrsd.gov.sa/ministry-services/services/%D8%B1%D9%81%D8%B9-%D9%85%D9%84%D9%81-%D8%AD%D9%85%D8%A7%D9%8A%D8%A9-%D8%A7%D9%84%D8%A3%D8%AC%D9%88%D8%B1 .
- Before release: identify nationality and scheme start date per employee, validate GOSI branches and ceilings, leave/EOS and bank/Mudad format. Generic CSV is NOT WPS.

## Kuwait (KWD / KW)
- PIFSS official FAQ lists distinct basic, supplementary, unemployment and other components and ceilings, https://pifss.gov.kw/sites/Ar/Pages/PensionSocialSecuritySector/FAQ.aspx?PID=YYH9cYwZKl8mrS+LNcoYzQ%3D%3D .
- Before release: validate Kuwaiti/non-Kuwaiti/GCC affiliation and contribution categories, plus **3-decimal** salary, allocation, GL and bank/WPS integration. **KWD payroll is currently blocked by the runtime** to prevent incorrect two-decimal money.

## Qatar (QAR / QA)
- Determine coverage under the applicable Qatari social insurance law, including Qataris, GCC nationals and other expatriates; verify actual effective-dated rates and WPS bank formats against the competent authorities before enabling automatic withholding or certified files.
- No rates are pre-filled. Employee-specific legal coverage and bank acceptance remain open.

## Sultanate of Oman (OMR / OM)
- Oman Social Protection Fund's published contribution branches and effective dates vary by program, https://www.spf.gov.om/faq/%D9%85%D8%A7-%D9%87%D9%8A-%D9%86%D8%B3%D8%A8-%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%D8%A7%D8%AA-%D8%A7%D9%84%D8%AA%D9%8A-%D8%B3%D9%8A%D8%B3%D8%AF%D8%AF%D9%87%D8%A7-%D8%A7%D9%84%D8%B9%D8%A7/ ; resident/nonresident scope also needs explicit verification.
- Before release: confirm employee program and branch categories, service dates and **3-decimal** salary, GL and banking. **OMR payroll is currently blocked**.

## Additional deduction safety gate
- Approval blocks when a non-loan operational deduction has been deferred by a payroll cap. The current `carried_forward_deduction` is informational; automatic legally compliant recovery is not implemented and must NOT be represented as a posted debt. Staff must resolve it and re-review the payroll or implement a documented carry-forward ledger, accounting mapping and next-period deduction policy.

## Remaining product-wide gates
1. Persist and review **per-employee** nationality/residency/social-insurance scheme, with effective dates and official decision evidence; existing two boolean employee tax/insurance flags are insufficient for certified multi-country compliance.
2. Implement officially verified weekly/biweekly/partial-period tax and social insurance proration; existing engine safely refuses statutory withholding for non-monthly period runs.
3. Add fiscal-year/cumulative tax reconciliation and employee-specific statutory exemptions and income components.
4. Extend HR numeric columns, pure engines, GL journal lines, loan allocations and exports for KWD/OMR 3-decimal units **in one coordinated migration**; no partial enablement.
5. Implement country + bank specific accepted WPS file formats and employer identities; review CSV only at present.
6. Audit EOS, holiday/leave accrual, overtime/attendance schedules against official country-specific law.
7. Run all authored critical numerical tests and then API/database concurrency and tenant isolation suites, Typecheck/Build/Guards and real UAT **only after user explicitly authorizes them**.
8. Perform official payroll-specialist sign-off before representing any country's output as statutory certified.

Current review status: code-only changes were pushed on fix/hr-stabilization-multicountry-20261024. No tests/Build/Typecheck/Guards were executed. No main merge or deployment.
