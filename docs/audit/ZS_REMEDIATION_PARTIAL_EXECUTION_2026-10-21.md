# ZS ERP audit remediation — execution record (2026-10-21)

Repository: https://github.com/8489mx/zs  
Base commit (main as verified before edits): `241ed337b6ec4e14b64745fc1ad8d9ca602765c3`  
Work branch: `audit/full-remediation-2026-10-21`  
Status: **PARTIAL / NOT MERGE-READY**. This document is not a claim all ZS-001..100 are corrected.

## Actual code changes committed
- ZS-001: harden root administrator bootstrap (ported from previous fix branch).
- ZS-002: data-preserving migration metadata reconciliation (ported; still requires migration list command side-effect review).
- ZS-003 / 004 / 005 (and duplicate 052 / 053 / 054): voucher-backed, positive finite, partner-matched payment allocations.
- ZS-006 / 007 / 008 / 009 / 010 / 011: selected idempotency, user, session and inventory transaction fixes from previous audit branch; stock count creation migrated in isolation to preserve newer main code. Database composite FK migration intentionally NOT copied due to destructive legacy cleanup.
- ZS-014: forbid nonfinite FX closing rates.
- ZS-015 / 072: tenant-key authenticated POS bridge cloud poll/callback, callback tenant/status/authorization checks.
- R-005: forbid production approval via sandbox/mock terminal.
- ZS-022 / 023 / 024 (partial mitigation): update mutation guards, ZIP size/entry/path limits and operator-pinned SHA256; requires deployment and trust-provisioning validation.
- ZS-029 / 030 / 031 / 032: inventory branch scope enforced across critical reads and writes.
- ZS-059 / 073: purchase/GRN/sales-order controllers require module permissions (fine-grained action permissions still to review).
- ZS-061: prevent GRN creation and posting against unapproved/cancelled POs.
- ZS-064 / 065: prohibit unsafe posted purchase mutation; unposted draft cancellation without fictitious stock reversals. Draft editing currently intentionally blocked until safe metadata-only edit flow exists.
- ZS-069: align receipt serial schema keys and status with product_serials.
- ZS-074: location-aware atomic stock reservation for new sales orders; collision-safe order numbering.
- ZS-076: forbid cancelled/draft sales-order confirmation/conversion.
- ZS-079: local POS cancellation no longer declares approved/ambiguous bank charge as cancelled.
- ZS-081 (partial): browser origin allowlists on C# and Node bridge, and block unauthenticated local tenant reconfiguration. Missing-origin native local calls still need trusted-device authorization.
- ZS-082: restore TLS certificate validation in Windows Bridge.
- ZS-083 / 085: cashier opening requires assigned branch for nonadmins and nonnegative opening cash.

## Operational behavior / deployment blockers
- POS backend `POS_BRIDGE_MASTER_SECRET` (min 32 characters) MUST be provisioned privately; derive each tenant bridge key by HMAC-SHA256(master, `zs-pos-bridge:v1:<tenantId>`) and enter only that derived key in trusted Bridge configuration. Rotate credentials safely. Do NOT include the master in source control, logs or frontend.
- Native Bridge only polls HTTPS hosts with valid certificates and a configured 64-hex-character tenant key. Older devices must be upgraded and provisioned before release. Protect `bridge-config.json` using per-user ACLs.
- Manual ZIP updater requires `ZS_TRUSTED_OFFLINE_UPDATE_SHA256` for an operator-approved exact package. Do not deploy without a signed-release/provisioning and rollback plan; a digest pinned in runtime environment does not authenticate the publisher automatically.
- `ZS_BRIDGE_ALLOWED_ORIGINS` is an optional comma-separated allowlist of extra legitimate origins; do not use wildcards.
- C# and Node local bridge routes still need cryptographically authenticated local requests, not just origin restrictions. Cloud bridge job metadata is delivered only to authenticated polling devices; hardening for cross-process replay and durable device enrollment is outstanding.

## Test evidence and remaining defects
- Added source-importing safety tests for allocations, FX rates, POS bridge callback/sandbox/cancel and offline ZIP digest; imported prior core-integrity tests. `backend/package.json` critical script updated.
- **Not executed:** npm build, TypeScript typecheck, PostgreSQL, real device integration, Electron, C# compile, full E2E, GitHub CI. No claims of PASS.
- **Important unclosed:** ZS-012, ZS-013, ZS-017..021, many accounting/FX/fiscal-year/treasury items ZS-033..051, PO financial total ZS-060 and conversion atomicity ZS-062, supplier and returns serial/batch ZS-066..071, sales conversion atomicity ZS-075, loyalty ZS-078, and other registered issues, plus Antigravity proposals 086..100 pending false-positive screening. ZS-086 is contradicted by existing source guards, and ZS-100 already has per-process busy checks; neither is accepted as stated.
- A full ZS issue-by-issue canonical registry, positive/negative tests, branch diff review, migration pre/post reconciliation, security approval and independent follow-up audit are still necessary **before** this branch is merged.
- `main` untouched. `import-sales` was excluded from all changes.

## Merge gate
Do not merge, deploy or run production migrations until a dedicated test database, CI, full tenant/branch isolation tests, provider-backed payment reconciliation, safe schema migration plan and cross-team sign-off succeed.
