# UI layout priority pass v18

## What changed
- Returns now opens with the returns register and selected return details before the creation form, so review starts from the existing document history first.
- Inventory transfers now open with the transfer monitor before the composer, so the operator sees pending and in-flight documents before creating a new transfer.
- Inventory counts now open with active count sessions before the composer, so posting and review start from the current audit state first.

## Intent
Show the current operational register first on inner workflow tabs, then keep creation tools immediately after it for fast execution.
