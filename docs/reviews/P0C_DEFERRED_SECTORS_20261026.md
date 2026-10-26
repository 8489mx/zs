# P0-C deferred sector blockers — 2026-10-26

> Deliberately postponed to prioritize customers operating clothing shops, markets and restaurants. None of these items are silently closed.

| Sector | Unfinished mandatory financial / stock scope |
| --- | --- |
| Maintenance | Delivered-job credit/reversal, partial settlements, bank refunds, legacy ticket reconciliation |
| Trade-in | New sale exchange netting, bank-account-specific matching, cancellation/return of acquired device, audit and historical recovery |
| Pharmacy | Lot/expiry purchase returns, prescription dispensing COGS/FEFO, insurer receivables and settlement/reversal, legacy batch reconciliation |
| Other sector integrations | Imports, manufacturing, contracting, maritime freight, HR, installments, storefront gateways: 11-sector end-to-end cross-module evidence remains incomplete |
| Shared multi-currency | KWD/OMR FX, wider reports and multi-channel end-to-end ledger consistency not fully certified |
| Core 8 finance cycles | Global completion not certified, regardless of the priority-customer three-sector tests |

Revisit any item immediately if its root cause affects the shared GL, stock or payments path used by the three active sectors. No production data remediation without a reconciled disposable snapshot. Do not treat a successful generic accounting acceptance as covering every item above.

### Priority-customer sector release blockers (also not silently closed)

- Clothing: end-to-end variant-family merge/archive and offline serial/size exchange UI/UAT; physical Electron offline packaging and update recovery not field-tested.
- Market: barcode scanner and weigh-scale hardware over ECR/serial/network, stock-count posting + supplier reconciliation beyond the targeted weighted POS scenario, production cashier hardware/offline pilot.
- Restaurant: prepared-meal refunds now fail safely but do not perform a refund; KDS/recipe BOM/cost centre/waste/table transfer/delivery settlement are not certified with true PostgreSQL source-to-GL scenarios.
