# ZS ERP — Customer release P0/P1 gate report — 2026-10-26

## Provenance, permissions and safety

- Repository: `8489mx/zs`
- Base branch: `fix/erp-final-system-validation`, HEAD observed immediately before branching: `ed04ad645fb626840d437ea44fd58cfaab2c0fa8`
- Isolated branch: `fix/erp-customer-release-gates`
- Change scope: **verified source-confirmed P0/P1 release blockers only**, no generic re-audit, no P2 enhancement, no new production feature.
- **No main merge, deploy, cloud production DB access, live customer files, or destructive restoration.**
- Prior full CI, real PostgreSQL acceptance and cross-module foundation verification are *historical* evidence, not an automatic certificate for this new branch.

## P0/P1 corrections delivered on the new branch

### Restaurant: refund of a prepared composite menu dish (financial / stock integrity)

Prior code intentionally rejected the refund when a sold line consumed separate ingredient product IDs: ordinary retail restoration and COGS reversal would have fabricated physical stock for already consumed ingredients. `ReturnsService.createSaleReturn` now identifies the recorded composite allocation and handles it as a financial-only **prepared-food return**. Cash/card/customer-ledger return and revenue/tax reduction stay inside the existing transaction. **Neither meal nor ingredient stock is re-credited**; the return line stores **zero restocked cost**, so `AccountingPostingService.postSalesReturn` retains historic prepared-food COGS. Serialized composite inventory remains fail-closed for specialist reconciliation. Standard clothing and market returns still restore original warehouse stock and reverse original COGS normally.

- Source: `backend/src/modules/returns/returns.service.ts`, commit `10623e51e82bb6a26ec13afd7c13c507231793d9`.
- Real PostgreSQL acceptance regression updated: `backend/test/acceptance/priority-sectors.postgres.spec.ts`, commit `e91c7d4105011d4feb1af4e3a8eb6164e0390102`.
- Asserts: consumed component quantity stays unchanged; product WAC and GL inventory match; historic COGS stays expensed; refund offsets recorded cash; repeated refund fails and does not pay twice. Existing assertions cover stock shortage transaction rollback and prevention of non-stock modifier spoofing.
- **Limit**: applies to recorded stock-bearing modifiers, not unverified BOM/preparation or third-party delivery paths. Successful CI and observed restaurant UAT remain required.

### Electron: local settings survive failed writes

`RuntimeConfig._saveConfig` previously wrote directly to the active JSON file and silently swallowed errors. On a full/locked disk or interruption it could leave unreadable settings or report an unsaved standalone/LAN switch as saved. It now writes to a sibling temp file, renames in place, cleans the temporary file after error and propagates errors, keeping both persisted and in-memory last-good settings.

- Source: `frontend/electron/runtime-config.cjs`, commit `ca4ed1b2c30212aec3bed8055f91e70107d4b7f4`.
- Node filesystem regressions: `scripts/test-electron-customer-config.cjs`, commit `bb44d0285a0ae5e07d9ee23b2b8bf9dd773265af`.
- **Limit**: this tests config-file recovery, not an actual PostgreSQL customer database or installer update.

### Automation: run on this branch, plus Windows

- `.github/workflows/ci.yml` and `.github/workflows/accounting-acceptance.yml` are subscribed to `fix/erp-customer-release-gates`.
- Existing backend full CI includes real ephemeral PostgreSQL, backend E2E, return-cost and frontend gates; accounting acceptance covers accounting PostgreSQL, three customer sectors, migrations/upgrade-order rehearsal and Nest startup.
- Additional Windows runner builds desktop-mode renderer; checks updater SHA256/shutdown/rollback contracts; executes real temporary-filesystem settings regressions.
- **Packaging prerequisite known missing from source checkout:** `portable/runtime/postgres/bin/{postgres,pg_ctl,initdb,psql,pg_dump}.exe`. The Windows workflow reports that it cannot certify a complete EXE if external bundled runtime is absent; it only attempts packaging if runtime has been staged. This intentionally does **not** certify a Windows application start or PostgreSQL service boot.
- Workflow links: [Full CI](https://github.com/8489mx/zs/actions/workflows/ci.yml) and [PostgreSQL acceptance](https://github.com/8489mx/zs/actions/workflows/accounting-acceptance.yml).
- **Verification evidence status at report creation:** full CI / PostgreSQL jobs were triggered; **no success claim until final-head jobs have a completed, successful conclusion**. Branch pushes may cancel superseded runs, which do not count as pass/fail proof.

## Release decisions by sector AND deployment mode

A `BLOCKED` below means customer-delivery sign-off is withheld, not that every function is known to be defective. No `READY` declaration is justified by source review, mock simulation, or pending CI alone.

| Sector | Cloud SaaS | Electron Offline | Blocker or unverified required evidence |
|---|---|---|---|
| **Clothing** | **BLOCKED** | **BLOCKED** | Verify final-head CI and a real cashier barcode/size-color sale, partial return, size exchange, shift settlement and GL against a disposable store. Offline additionally needs complete Windows EXE with local PostgreSQL, reboot, update and rollback |
| **Market** | **BLOCKED** | **BLOCKED** | Existing PostgreSQL acceptance models fractional-weight POS and verifies purchase/cash/COGS/GL; does **not** prove a real scale, barcode scanner, physical stock-count workflow, receipt/printer, supplier settlement or physical terminal. Offline also needs EXE and update/recovery drill |
| **Restaurant** | **BLOCKED** | **BLOCKED** | Prepared-food composite-refund regression added but must pass live PostgreSQL. Real recipe/BOM, multi-station KDS/printer, courier/delivery settlement, kitchen cancellation and refund policies must be confirmed. Offline additionally needs packaged executable, local data and recovery proof |

### Field UAT — concise repeatable scripts

1. **Clothing on customer-like Windows POS:** on a **disposable** store, receive distinct red/M and blue/L barcode SKUs; disconnect internet; sell a red/M, return only part, then exchange a different size; close/reopen the same shift. Reboot; assert invoice count, unique idempotency keys, quantity by color/size, drawer cash, COGS and journal balances match. Update to a test release and intentionally fail an update to confirm *database plus credentials* restoration.
2. **Market on actual devices:** capture 10 known weighted readings and independent manual weights through the real scale (note model/protocol/port), scan manufacturer and variable-weight barcodes, then purchase from a supplier, sell fractions, receive a return, post a physical count variance, settle a cash shift and supplier payment. Compare product-location WAC/COGS, treasury, AP and GL. Distinguish in report **real device** from injected/mock data; repeat after unplug/reconnect.
3. **Restaurant on staged kitchen equipment:** dine-in and delivery/takeaway orders with multiple kitchen stations and printer disconnect/reprint; sell a composite meal with measured ingredient draw, refund a consumed meal, cancel a pre-preparation order and settle delivery cash/card separately. Confirm KOT once-only, ingredient physical stock, consumption cost, no false restock, cash and journal balance.
4. **Historical upgrade and restore:** use a consented anonymized **representative historical** database outside production, record per-table row counts and financial checksums, take a full backup including local credentials, run the update then rollback under failure, reopen with the same offline cashier, compare both counts and accounting/stock balances. **No such historical customer snapshot was accessible for this run**. CI migration-order tests use synthetic disposable databases and cannot replace this scenario.

## Go/no-go rule

Change a cell to `READY` only after final-head Full CI and PostgreSQL acceptance are **green**, the relevant mode's real acceptance test is **documented with device/build/date and proof**, and P0/P1 blockers are absent. Do not transfer success from cloud to offline or from simulator to hardware. Stop here: no P2 or broad re-audit.
