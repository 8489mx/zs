# Project Instructions for Claude (Z-Systems)

> 🔴 **CRITICAL SYSTEM NOTICE FOR CLAUDE:**
> Before modifying or writing ANY code in this repository, you MUST read and strictly adhere to:
> 1. `SAAS_ELECTRON_ISOLATION_CONSTITUTION.md` (Architectural Safety Constitution)
> 2. `GEMINI.md` (Project Guidelines & Arabic UI Constitution)
> 3. `SYSTEM_CAPABILITIES.md` (Feature Inventory & Capabilities Registry)
> 4. `ARCHITECTURE_INVARIANTS.md` (**Architecture Invariants & Audit Ledger** — forbidden patterns,
>    single-source-of-truth engines, enforced invariants, migration ledger, audit phase status).
>    **Read §2 and §3 of that file before writing any financial, stock, or accounting code.**

---

## 0. Documentation Duty (إلزامي بعد كل إصلاح)
After completing ANY phase of the audit, or any structural fix, you MUST — before reporting done:
1. Update `ARCHITECTURE_INVARIANTS.md`: new invariants, newly forbidden patterns, migration ledger,
   phase status table, and the open-items list.
2. Update `SYSTEM_CAPABILITIES.md` for any capability whose behaviour or status changed.
This is what lets the next session (Claude, another AI, or a human) resume without re-deriving context.

---

## 1. Architectural Boundary & Core Safety (SaaS vs Desktop)
- **Cloud SaaS Mode (`APP_MODE=CLOUD_SAAS` on Oracle Cloud VPS):**
  - Multi-tenant architecture isolated strictly by `tenant_id`.
  - **NEVER** write code that ignores, excludes, or hardcodes away the platform central tenant `zs` (Super Admin).
  - **NEVER** mix desktop/offline logic into cloud authentication (`session.service.ts`) or production routes.
- **Desktop/Electron Mode (`APP_MODE=SELF_CONTAINED` / `IS_ELECTRON=true`):**
  - Operates locally on port 5444 / SQLite / Local Postgres. Must stay isolated in its own desktop boundary.
- **Core Invariants:**
  - Double-entry accounting ledgers are immutable.
  - Zero plaintext passwords (always bcrypt with salt).
  - Multi-tenant isolation (`tenant_id`) must be strictly maintained in all database queries.

## 2. Strict Build & Push Policy
- **NEVER** run `npm run build` or any production bundle build command automatically.
- **NEVER** run `git push` automatically.
- Only run them when the user explicitly commands it (e.g. "اعمل بيلد وبوش", "run build").

## 3. Arabic & RTL UI Constitution
- Arabic interface by default (`dir="rtl"`).
- All chat responses MUST be wrapped in `<div dir="rtl">...</div>`.
- Strict No-Emoji policy across all UI elements (use `@/shared/components/icons/AppIcons`).
- Use standard unified dialogs (`DialogShell` / `StandardDialog`) and comboboxes (`CustomSelect`).
- Strict typography hierarchy (`base.css` variables).
