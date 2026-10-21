# ZS ERP — Remediation state / merge gate (2026-10-21)

Repository: `8489mx/zs`  
Base `main`: `241ed337b6ec4e14b64745fc1ad8d9ca602765c3`  
Branch: `audit/full-remediation-2026-10-21`  
Draft PR: https://github.com/8489mx/zs/pull/81

## Scope and guarantees

- **PARTIAL, NOT MERGE READY.** This does NOT certify all ZS-001..100 are fixed.
- No changes to `main`, deployments, production migrations, or `backend/src/modules/import-sales` and import-sales-only workflows.
- Financial entries must remain immutable; `applyStockDelta`, per-tenant boundaries and authenticated terminal payment state must be preserved.
- This branch includes the initial 67 fixes/commits before this remediation continuation and further commits listed by Git history. See `docs/audit/ZS_REMEDIATION_PARTIAL_EXECUTION_2026-10-21.md` for earlier coverage and warnings.

## Additional source modifications in this remediation continuation

| Issue | Code correction | Regression coverage |
| --- | --- | --- |
| ZS-037/040/041 | Tenant-owned cost centers, atomic allocation create/update, cents residual allocation | cost-center-allocation-safety.spec.ts |
| ZS-042/043 | No deletion of posted fiscal closing entries; preserve manual lock on reopening | **Fail-closed pending reversal workflow** |
| ZS-044/045/050 | Unified P&L account classification, per-account closing check, chosen retained-earnings equity account | fiscal-close-integrity.spec.ts |
| ZS-046 | Bank fee journal and statement reconciliation inside one transaction | bank-fee-atomicity.spec.ts |
| ZS-060 | Server recomputation of PO line/tax/discount totals and approval amount | purchase-order-totals.spec.ts |
| ZS-063 | Exact-cent landed cost allocation across items | landed-cost-allocation.spec.ts |
| ZS-066/067 | Purchased serials leave inventory on supplier return, drug batch stock decremented atomically and explicit lot selection when ambiguous | purchase-return-traceability.spec.ts |
| ZS-017 | Mandatory platform MFA now fails closed for unenrolled privileged accounts | platform-mfa-enrolment.spec.ts |

Additional fixes from earlier this turn in git: ZS-016 (reset-host poisoning), ZS-021 (frontend-error flood), ZS-049/051 (bank statement atomicity/account type), ZS-057 (withholding tax remittance immutability), ZS-068 (maritime job payment customer ownership), ZS-071 (supplier payment schedule double counting), R-005 (no production POS mock success). All have source changes and most have newly written tests.

## CI evidence

- Earlier PR CI [39645491675](https://github.com/8489mx/zs/actions/runs/39645491675): frontend **PASS**, backend build/typecheck **PASS**, test:infra **FAIL** due a test fixture without `transaction()`. Fixed in source branch by `d3bfdc14`.
- Current CI should be checked for latest branch HEAD: https://github.com/8489mx/zs/actions . **No declaration of complete test success until workflow finishes successfully.**
- Test files are added to `backend/package.json` `test:critical`; passing unit mocks does not replace PostgreSQL integration.
- No live payment terminal, Electron/Bridge binary, production dataset or migration rehearsal has been tested by this assistant.

## Remaining high-risk work blocking merge

- ZS-047/048: PDC cheque return/cancellation/bounce restoration must use proper append-only reversing journals (not status-only).
- ZS-042: posted fiscal close reversal still **not implemented** — reopening with posted closing entry now deliberately returns error instead of corrupting the ledger.
- ZS-055/056: fixed asset depreciation direct posted ledger and scheduler partial failure.
- ZS-062: PO to bill conversion transaction/idempotent linkage.
- ZS-075: sales order to invoice conversion atomicity/idempotency.
- ZS-070/078: loyalty point reversals and repeated partial returns.
- ZS-081: local native Hardware Bridge client authentication remains incomplete; CORS mitigation is not cryptographic authentication.
- ZS-038/039 and other FX/reconciliation issues require PostgreSQL monetary tests.
- ZS-018/019/020, other audit/MFA issues and unverified Antigravity proposals remain to investigate. ZS-086 is contradicted by existing same-location checks, ZS-100 is only a possible multi-process race (per-process guard exists).
- Generated / modified amount and tax rules for PO must be integration-tested against existing frontend and purchasing invoicing workflows.
- Existing supplier returns of serial/drug items with historical incomplete traceability may be deliberately refused; migration/reconciliation plan needed.

## Mandatory merge gates

1. Latest CI complete green: backend build, critical tests, PostgreSQL E2E, frontend all green.
2. Independent reviewer audits every patch against original ZS IDs; no silent test weakening.
3. Financial reconciliation on test tenant for GL, supplier/customer subledgers, serialized products, pharmacy batches, FX and fiscal locks.
4. Provider-backed payment capture/void/refund, Bridge authentication and configuration/secret provisioning.
5. No merge/deploy or production schema migration before all blocking findings resolved and manual approval.

**Bottom line: branch pushed, Draft PR open, not yet safe to merge.**
